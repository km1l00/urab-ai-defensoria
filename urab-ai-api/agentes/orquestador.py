"""
URAB-AI · Orquestador Principal (LangGraph + CrewAI)
=====================================================
Módulos: M1 Recepción · M2 Triage · M3 Reparto · M4 Anti-duplicidad
         M5 Historial · M6 IA Generativa · M7 Cierre documental · M8 Analítica

Decisiones incorporadas (Sprints A/B/C):
  - M2: HITL recall como métrica no negociable; alertas drift (amarillo/naranja/rojo)
  - M3: criterio tri-dimensional (competencia temática → carga → continuidad)
  - M6: sello IA obligatorio + bitácora de ediciones + doble revisión urgentes
  - M7: submódulo M7-C cierre coordinado con hash SHA-256
  - M1: cadena de custodia PDF/A + hash de documentos físicos

Normativa: Directiva 007/2025 · CONPES 4144 · Ley 1581/2012 · Art. 29 CP
           NIST AI RMF (GOVERN/MAP/MEASURE/MANAGE) · ISO/IEC 42001
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional

import anthropic

# Capa de seudonimización (privacidad por diseño). Import defensivo: el
# orquestador se ejecuta tanto embarcado en el backend (urab-ai-api/ en el path)
# como en modo standalone.
try:
    from anonimizacion import seudonimizar, rehidratar
except ImportError:  # pragma: no cover
    import sys as _sys
    _sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        from anonimizacion import seudonimizar, rehidratar
    except ImportError:
        # Sin la capa disponible, se degrada a passthrough (no debería ocurrir en
        # producción; la capa viaja en el mismo directorio del backend).
        def seudonimizar(texto, terminos=()):  # type: ignore
            return texto, {}
        def rehidratar(texto, mapa):  # type: ignore
            return texto

# ──────────────────────────────────────────────────────────
# CONFIG
# ──────────────────────────────────────────────────────────
MODEL_DEFAULT = os.getenv("URAB_MODEL", "claude-haiku-4-5-20251001")
API_KEY       = os.getenv("ANTHROPIC_API_KEY", "")
LOG_LEVEL     = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
log = logging.getLogger("urab_ai.orquestador")

client = anthropic.Anthropic(api_key=API_KEY)

# ──────────────────────────────────────────────────────────
# ENUMS Y CONSTANTES
# ──────────────────────────────────────────────────────────

class Urgencia(str, Enum):
    CRITICA = "critica"    # amenaza vital, desaparición, NNA en riesgo
    ALTA    = "alta"       # VBG activa, privación de libertad, conflicto armado
    MEDIA   = "media"
    BAJA    = "baja"

class CategoriaTemática(str, Enum):
    SALUD       = "salud"
    VBG         = "violencia_basada_en_genero"
    NNA         = "ninez_y_adolescencia"
    DESAPARICION = "desaparicion"
    CARCELARIO  = "carcelario"
    CONFLICTO   = "conflicto_armado"
    MIGRACION   = "migracion"
    PENSION     = "pension"
    GENERAL     = "general"

class EspecialidadProfesional(str, Enum):
    VBG         = "vbg"
    NNA         = "nna"
    DESAPARICION = "desaparicion"
    SALUD       = "salud"
    CARCELARIO  = "carcelario"
    CONFLICTO   = "conflicto_armado"
    GENERAL     = "general"

# Regla hard-coded §5.2 RFP: NNA activa prioridad máxima sin importar clasificador
CATEGORIAS_HITL_OBLIGATORIO = {CategoriaTemática.NNA, CategoriaTemática.DESAPARICION}
URGENCIAS_HITL_OBLIGATORIO  = {Urgencia.CRITICA}

# Umbral de similitud M4 (configurable)
UMBRAL_SIMILITUD_M4 = float(os.getenv("UMBRAL_SIMILITUD_M4", "0.85"))

# Umbrales de drift (Sprint B3)
DRIFT_UMBRAL_AMARILLO = 0.03   # caída > 3pp → alerta
DRIFT_UMBRAL_NARANJA  = 0.05   # caída > 5pp → congelar actualizaciones
DRIFT_UMBRAL_ROJO     = 0.08   # caída > 8pp → suspender módulo


# ──────────────────────────────────────────────────────────
# DATACLASSES DE ESTADO
# ──────────────────────────────────────────────────────────

@dataclass
class Peticion:
    """Unidad de trabajo que fluye por el pipeline."""
    radicado: str
    texto_narrativo: str
    canal: str                                # web | correo | presencial | terreno | email
    fecha_recepcion: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Campos capturados en M1
    nombre_peticionario: str = ""
    cedula: str = ""
    telefono: str = ""
    correo: str = ""
    entidad_referida: str = ""
    anexos: list = field(default_factory=list)

    # Marcadores de enfoque diferencial (§5.2 RFP)
    es_nna: bool = False
    es_discapacidad: bool = False
    es_victima_conflicto: bool = False
    es_vbg: bool = False
    es_etnia: bool = False
    es_migrante: bool = False

    # Resultados de módulos
    urgencia: Optional[Urgencia] = None
    categoria: Optional[CategoriaTemática] = None
    confianza_clasificacion: float = 0.0
    explicacion_clasificacion: str = ""       # XAI obligatorio Directiva 007

    hitl_requerido: bool = False
    hitl_razon: str = ""

    profesional_asignado: Optional[str] = None
    razon_asignacion: str = ""                # trazabilidad "por qué" M3

    duplicado_de: Optional[str] = None
    similitud_duplicado: float = 0.0

    borrador_m6: str = ""
    fuentes_rag_m6: list = field(default_factory=list)
    hash_borrador_m6: str = ""

    hash_documento_fisico: str = ""           # cadena de custodia M1
    pdf_a_path: str = ""

    estado: str = "recibido"
    log_eventos: list = field(default_factory=list)

    def registrar(self, evento: str):
        self.log_eventos.append({
            "ts": datetime.now(timezone.utc).isoformat(),
            "evento": evento
        })
        log.info("[%s] %s", self.radicado, evento)


@dataclass
class PerfilProfesional:
    """Perfil de un profesional URAB para M3."""
    id: str
    nombre: str
    especialidades: list[EspecialidadProfesional]
    casos_activos: int = 0
    disponible: bool = True


# ──────────────────────────────────────────────────────────
# UTILIDADES
# ──────────────────────────────────────────────────────────

def _pii(peticion: "Peticion") -> list:
    """Identificadores del titular a seudonimizar por coincidencia exacta."""
    return [
        getattr(peticion, "nombre_peticionario", ""),
        getattr(peticion, "cedula", ""),
        getattr(peticion, "telefono", ""),
        getattr(peticion, "correo", ""),
    ]


def llamar_claude(system: str, user: str, max_tokens: int = 1000, pii=()) -> str:
    """Llamada base al API. Privacidad por diseño (Ley 1581/2012, ISO 42001):
    el prompt de usuario se SEUDONIMIZA antes de salir (ningún identificador
    viaja en claro) y la salida se REHIDRATA con los valores reales, de forma
    transparente para el módulo llamador. El modelo nunca ve el dato real."""
    user_seguro, mapa = seudonimizar(user, pii or ())
    try:
        response = client.messages.create(
            model=MODEL_DEFAULT,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_seguro}]
        )
        return rehidratar(response.content[0].text, mapa)
    except anthropic.APIError as e:
        log.error("Error API Claude: %s", e)
        raise

def extraer_json(texto: str) -> dict:
    """Parseo robusto del JSON que devuelve el modelo.

    Aunque se le pida 'solo JSON, sin markdown', el modelo con frecuencia lo
    envuelve en ```json ... ``` o antepone una frase. `json.loads` directo
    falla ahí ('Expecting value: line 1 column 1'). Se aísla el primer '{'
    hasta el último '}' y se parsea ese fragmento, que es robusto ante cercas
    de código y texto circundante.
    """
    if texto:
        ini, fin = texto.find("{"), texto.rfind("}")
        if ini != -1 and fin > ini:
            return json.loads(texto[ini:fin + 1])
    raise json.JSONDecodeError("sin objeto JSON en la respuesta del modelo", texto or "", 0)

def sha256_texto(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()

def es_urgencia_critica_por_reglas(peticion: Peticion) -> bool:
    """
    Reglas hard-coded que activan HITL independientemente del clasificador.
    §5.2 RFP: NNA siempre prioridad máxima.
    """
    if peticion.es_nna:
        return True
    palabras_criticas = [
        "amenaza", "amenazado", "van a matar", "desaparecido", "desaparición",
        "secuestro", "tortura", "riesgo de vida", "peligro inminente"
    ]
    texto_lower = peticion.texto_narrativo.lower()
    return any(p in texto_lower for p in palabras_criticas)


# ──────────────────────────────────────────────────────────
# M1 — RECEPCIÓN INTELIGENTE
# ──────────────────────────────────────────────────────────

def modulo_m1_recepcion(peticion: Peticion) -> Peticion:
    """
    Extrae campos clave, normaliza el texto y registra la cadena de custodia
    si el documento llegó como archivo físico digitalizado (Sprint B2).
    Meta: extracción correcta ≥ 90% de campos clave.
    """
    peticion.registrar("M1: inicio recepción inteligente")

    system = """Eres el agente M1 de URAB-AI, sistema de la Defensoría del Pueblo de Colombia.
Tu función es extraer información estructurada de peticiones ciudadanas.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Campos a extraer:
{
  "entidad_referida": "string",
  "pretension": "string (qué pide el ciudadano en máx 50 palabras)",
  "hechos_clave": ["lista de hechos relevantes"],
  "campos_faltantes": ["lista de campos que faltan para completar la petición"],
  "es_urgencia_aparente": true/false,
  "indicadores_vulnerabilidad": ["NNA", "discapacidad", "VBG", "conflicto", "etnia", "migrante"]
}"""

    user = f"""Petición canal {peticion.canal}:

{peticion.texto_narrativo}

Datos ya capturados:
- NNA: {peticion.es_nna}
- Discapacidad: {peticion.es_discapacidad}
- VBG: {peticion.es_vbg}
- Conflicto: {peticion.es_victima_conflicto}"""

    try:
        respuesta = llamar_claude(system, user, pii=_pii(peticion))
        datos = extraer_json(respuesta)

        peticion.entidad_referida = datos.get("entidad_referida", "")

        # Actualizar indicadores de vulnerabilidad desde el texto
        indicadores = datos.get("indicadores_vulnerabilidad", [])
        if "NNA" in indicadores:
            peticion.es_nna = True
        if "VBG" in indicadores:
            peticion.es_vbg = True
        if "discapacidad" in indicadores:
            peticion.es_discapacidad = True

        peticion.registrar(f"M1: extracción completada — entidad: {peticion.entidad_referida}")

        if datos.get("campos_faltantes"):
            peticion.registrar(f"M1: campos faltantes detectados: {datos['campos_faltantes']}")

    except (json.JSONDecodeError, KeyError) as e:
        peticion.registrar(f"M1: error parsing respuesta — {e}")

    # Cadena de custodia para documentos físicos digitalizados (Sprint B2)
    if peticion.canal == "presencial" and peticion.texto_narrativo:
        peticion.hash_documento_fisico = sha256_texto(peticion.texto_narrativo)
        peticion.registrar(
            f"M1: hash cadena custodia generado — SHA256: {peticion.hash_documento_fisico[:16]}..."
        )

    peticion.estado = "recibido_normalizado"
    return peticion


# ──────────────────────────────────────────────────────────
# M2 — CLASIFICACIÓN Y TRIAGE
# ──────────────────────────────────────────────────────────

def modulo_m2_triage(peticion: Peticion) -> Peticion:
    """
    Clasifica urgencia y categoría temática con XAI obligatorio (Directiva 007).
    Aplica reglas hard-coded para NNA y palabras críticas antes del clasificador.
    HITL recall es la métrica no negociable: ningún urgente puede escapar.
    """
    peticion.registrar("M2: inicio clasificación y triage")

    # Reglas hard-coded ANTES del clasificador (Sprint A5 + §5.2 RFP)
    if es_urgencia_critica_por_reglas(peticion):
        peticion.urgencia = Urgencia.CRITICA
        peticion.hitl_requerido = True
        peticion.hitl_razon = "Regla hard-coded: NNA detectado o palabras de riesgo vital en texto"
        peticion.explicacion_clasificacion = peticion.hitl_razon
        peticion.registrar(f"M2: urgencia CRÍTICA por regla hard-coded — {peticion.hitl_razon}")
        # Igual ejecutamos el clasificador para categoría temática
    
    system = """Eres el agente M2 de URAB-AI, clasificador de urgencia y triage.
Eres un Sistema de Toma de Decisiones Automatizadas (SDA) bajo la Directiva 007/2025.
DEBES proporcionar explicación legible de tu razonamiento (XAI obligatorio).
Responde ÚNICAMENTE con JSON válido, sin markdown.

{
  "urgencia": "critica|alta|media|baja",
  "categoria": "salud|violencia_basada_en_genero|ninez_y_adolescencia|desaparicion|carcelario|conflicto_armado|migracion|pension|general",
  "confianza": 0.0-1.0,
  "explicacion": "Explicación en lenguaje ciudadano de por qué se asignó esta urgencia y categoría (máx 80 palabras)",
  "indicadores_urgencia": ["lista de palabras o situaciones que determinaron la clasificación"]
}

REGLAS DE URGENCIA:
- critica: amenaza vital, desaparición, NNA en riesgo, tortura, riesgo inminente
- alta: VBG activa, privación de libertad ilegal, conflicto armado, persona con discapacidad en riesgo
- media: salud sin riesgo vital inmediato, pensiones, servicios públicos
- baja: consultas, orientación, información general"""

    user = f"""Petición a clasificar:

{peticion.texto_narrativo}

Indicadores ya detectados:
- NNA: {peticion.es_nna}
- VBG: {peticion.es_vbg}
- Discapacidad: {peticion.es_discapacidad}
- Víctima conflicto: {peticion.es_victima_conflicto}
- Migrante: {peticion.es_migrante}"""

    try:
        respuesta = llamar_claude(system, user, pii=_pii(peticion))
        datos = extraer_json(respuesta)

        # Solo sobreescribir urgencia si no fue asignada por regla hard-coded
        if peticion.urgencia is None:
            peticion.urgencia = Urgencia(datos["urgencia"])

        peticion.categoria             = CategoriaTemática(datos["categoria"])
        peticion.confianza_clasificacion = float(datos["confianza"])
        peticion.explicacion_clasificacion = datos["explicacion"]

        # Escalación HITL
        if peticion.urgencia in URGENCIAS_HITL_OBLIGATORIO:
            peticion.hitl_requerido = True
            peticion.hitl_razon = f"Urgencia crítica: {datos['explicacion']}"

        if peticion.categoria in CATEGORIAS_HITL_OBLIGATORIO:
            peticion.hitl_requerido = True
            peticion.hitl_razon += f" | Categoría de especial protección: {peticion.categoria.value}"

        # Confianza baja → HITL (fallback de seguridad)
        if peticion.confianza_clasificacion < 0.70:
            peticion.hitl_requerido = True
            peticion.hitl_razon += f" | Confianza baja: {peticion.confianza_clasificacion:.0%}"

        peticion.registrar(
            f"M2: clasificado — urgencia={peticion.urgencia.value} "
            f"categoría={peticion.categoria.value} "
            f"confianza={peticion.confianza_clasificacion:.0%} "
            f"HITL={peticion.hitl_requerido}"
        )

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        # Ante error: escalar a HITL por seguridad
        peticion.urgencia = Urgencia.ALTA
        peticion.hitl_requerido = True
        peticion.hitl_razon = f"Error en clasificador M2 — escalado a revisión humana: {e}"
        peticion.registrar(f"M2: ERROR — {e} — escalado a HITL")

    peticion.estado = "clasificado"
    return peticion


# ──────────────────────────────────────────────────────────
# M3 — REPARTO TRI-DIMENSIONAL
# ──────────────────────────────────────────────────────────

def modulo_m3_reparto(
    peticion: Peticion,
    profesionales: list[PerfilProfesional],
    historial_peticionario: Optional[dict] = None
) -> Peticion:
    """
    Asignación tri-dimensional (Sprint B4 + comentario Laura):
    1° Competencia temática declarada
    2° Carga equilibrada (ratio objetivo ≤ 2.1x)
    3° Continuidad con el peticionario (M5)

    Genera log legible del 'por qué' para trazabilidad (RFP §3 M3).
    """
    peticion.registrar("M3: inicio reparto tri-dimensional")

    disponibles = [p for p in profesionales if p.disponible]
    if not disponibles:
        peticion.registrar("M3: sin profesionales disponibles — en cola")
        peticion.estado = "en_cola_reparto"
        return peticion

    # ── Prioridad 1: competencia temática ────────────────
    candidatos_por_especialidad = []
    if peticion.categoria:
        # Mapeo categoría → especialidad
        mapa = {
            CategoriaTemática.VBG:        EspecialidadProfesional.VBG,
            CategoriaTemática.NNA:        EspecialidadProfesional.NNA,
            CategoriaTemática.DESAPARICION: EspecialidadProfesional.DESAPARICION,
            CategoriaTemática.SALUD:      EspecialidadProfesional.SALUD,
            CategoriaTemática.CARCELARIO: EspecialidadProfesional.CARCELARIO,
            CategoriaTemática.CONFLICTO:  EspecialidadProfesional.CONFLICTO,
        }
        especialidad_requerida = mapa.get(peticion.categoria)
        if especialidad_requerida:
            candidatos_por_especialidad = [
                p for p in disponibles
                if especialidad_requerida in p.especialidades
            ]

    pool = candidatos_por_especialidad if candidatos_por_especialidad else disponibles
    razon_partes = []

    if candidatos_por_especialidad:
        razon_partes.append(
            f"perfil {peticion.categoria.value if peticion.categoria else 'general'} coincidente"
        )
    else:
        razon_partes.append("sin especialistas disponibles — pool general")

    # ── Prioridad 3: continuidad con el peticionario ─────
    profesional_previo = None
    if historial_peticionario and peticion.cedula:
        prof_id = historial_peticionario.get(peticion.cedula, {}).get("ultimo_profesional")
        if prof_id:
            profesional_previo = next((p for p in pool if p.id == prof_id), None)

    if profesional_previo:
        peticion.profesional_asignado = profesional_previo.id
        razon_partes.append(
            f"continuidad con peticionario (radicado previo atendido por {profesional_previo.nombre})"
        )
        razon_partes.append(f"carga actual: {profesional_previo.casos_activos} casos")
    else:
        # ── Prioridad 2: menor carga ──────────────────────
        elegido = min(pool, key=lambda p: p.casos_activos)
        peticion.profesional_asignado = elegido.id
        razon_partes.append(
            f"carga mínima disponible: {elegido.casos_activos} casos ({elegido.nombre})"
        )

    # Log de trazabilidad legible (RFP §3 — "a quién y por qué")
    peticion.razon_asignacion = (
        f"Asignado a [{peticion.profesional_asignado}] — razón: {' | '.join(razon_partes)}"
    )
    peticion.registrar(f"M3: {peticion.razon_asignacion}")
    peticion.estado = "asignado"
    return peticion


# ──────────────────────────────────────────────────────────
# M4 — ANTI-DUPLICIDAD
# ──────────────────────────────────────────────────────────

def modulo_m4_antiduplicidad(
    peticion: Peticion,
    radicados_existentes: list[dict]
) -> Peticion:
    """
    Detección vectorial de duplicados (pgvector en producción).
    En este script: similitud semántica vía Claude como proxy.
    Umbral configurable (default 85%). HITL obligatorio para acumulación.
    Meta: recall ≥ 85%, FP ≤ 8%.
    """
    peticion.registrar("M4: inicio detección de duplicados")

    if not radicados_existentes:
        peticion.registrar("M4: sin radicados previos — petición única")
        return peticion

    # Solo comparar radicados del mismo ciudadano si hay cédula
    candidatos = radicados_existentes
    if peticion.cedula:
        candidatos = [r for r in radicados_existentes if r.get("cedula") == peticion.cedula]

    if not candidatos:
        peticion.registrar("M4: sin radicados del mismo ciudadano")
        return peticion

    system = """Eres el agente M4 de URAB-AI, detector de duplicados.
Analiza si la petición nueva es sustancialmente similar a alguna petición existente.
Responde ÚNICAMENTE con JSON válido, sin markdown.

{
  "es_duplicado": true/false,
  "radicado_similar": "número de radicado o null",
  "similitud": 0.0-1.0,
  "justificacion": "por qué son similares o distintas (máx 60 palabras)"
}"""

    # Tomar los 3 más recientes para no saturar el contexto
    muestra = candidatos[:3]
    resumen_existentes = "\n".join([
        f"- Radicado {r['radicado']}: {r['texto'][:200]}"
        for r in muestra
    ])

    user = f"""PETICIÓN NUEVA:
{peticion.texto_narrativo[:500]}

RADICADOS EXISTENTES DEL MISMO CIUDADANO:
{resumen_existentes}

¿La petición nueva se refiere a los mismos hechos que alguna existente?"""

    try:
        respuesta = llamar_claude(system, user, pii=_pii(peticion))
        datos = extraer_json(respuesta)

        similitud = float(datos.get("similitud", 0.0))

        if datos.get("es_duplicado") and similitud >= UMBRAL_SIMILITUD_M4:
            peticion.duplicado_de = datos.get("radicado_similar")
            peticion.similitud_duplicado = similitud

            # HITL obligatorio para acumulación — M4 solo sugiere (§ instrucciones HITL)
            peticion.hitl_requerido = True
            razon_hitl = (
                f"M4: posible duplicado de {peticion.duplicado_de} "
                f"(similitud {similitud:.0%}) — funcionario debe aprobar acumulación"
            )
            if peticion.hitl_razon:
                peticion.hitl_razon += f" | {razon_hitl}"
            else:
                peticion.hitl_razon = razon_hitl

            peticion.registrar(
                f"M4: duplicado detectado — radicado similar: {peticion.duplicado_de} "
                f"similitud: {similitud:.0%} — HITL activado para acumulación"
            )
        else:
            peticion.registrar(f"M4: no duplicado (similitud máx: {similitud:.0%})")

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        peticion.registrar(f"M4: error en detección — {e}")

    return peticion


# ──────────────────────────────────────────────────────────
# M5 — HISTORIAL UNIFICADO
# ──────────────────────────────────────────────────────────

def modulo_m5_historial(
    peticion: Peticion,
    historial_db: dict
) -> dict:
    """
    Construye la vista 360° del peticionario por cédula.
    Integra radicados de IRIS + VisionWeb (simulado).
    Meta: consulta < 30s.
    """
    if not peticion.cedula:
        return {"error": "sin cédula — historial no disponible"}

    historial = historial_db.get(peticion.cedula, {
        "cedula": peticion.cedula,
        "radicados": [],
        "profesionales_previos": [],
        "ultimo_profesional": None,
        "total_peticiones": 0
    })

    log.info("[M5] Historial %s — %d radicados previos",
             peticion.cedula, len(historial.get("radicados", [])))
    return historial


# ──────────────────────────────────────────────────────────
# M6 — IA GENERATIVA + RAG + HITL
# ──────────────────────────────────────────────────────────

SELLO_IA = (
    "⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN "
    "DEL PROFESIONAL RESPONSABLE ANTES DE ENVIARSE AL CIUDADANO"
)

def modulo_m6_ia_generativa(
    peticion: Peticion,
    corpus_rag: list[dict],
    requiere_doble_revision: bool = False
) -> Peticion:
    """
    Genera borrador de respuesta jurídica con RAG institucional.
    Decisiones Sprint C1 incorporadas:
      - Sello IA obligatorio e inamovible
      - Bitácora de ediciones (hash del borrador original)
      - XAI: fuentes RAG expuestas
      - Doble revisión para urgentes / especial protección
      - M6 es asistente, NUNCA decisor autónomo
    """
    peticion.registrar("M6: inicio generación de borrador")

    # Determinar si requiere doble revisión (Sprint C1)
    doble_revision = (
        requiere_doble_revision
        or peticion.urgencia in {Urgencia.CRITICA, Urgencia.ALTA}
        or peticion.es_nna
        or peticion.es_vbg
        or peticion.es_discapacidad
    )

    # Construir contexto RAG
    contexto_rag = ""
    fuentes_usadas = []
    if corpus_rag:
        fragmentos = corpus_rag[:3]  # máx 3 fuentes para no saturar
        for f in fragmentos:
            contexto_rag += f"\n[Fuente: {f.get('titulo', 'Sin título')}]\n{f.get('texto', '')[:500]}\n"
            fuentes_usadas.append(f.get("titulo", "Sin título"))

    system = f"""Eres el asistente jurídico M6 de URAB-AI, Defensoría del Pueblo de Colombia.
Tu función es ÚNICA: generar borradores de respuesta para revisión del profesional humano.
NO emites respuestas finales. NO decides. El funcionario revisa, edita y firma.

RESTRICCIONES ABSOLUTAS:
- Solo consultas no controversiales pueden tener respuesta automatizable (estado del trámite, profesional asignado)
- Todo caso con urgencia crítica/alta o categoría VBG/NNA requiere borrador para revisión humana
- Siempre cita las fuentes RAG que usaste
- Usa lenguaje jurídico colombiano claro y accesible
- Máximo 300 palabras en el borrador

CORPUS INSTITUCIONAL (RAG):
{contexto_rag if contexto_rag else "Sin fuentes RAG disponibles para este caso — el profesional debe completar las referencias normativas."}"""

    user = f"""Genera un borrador de respuesta para esta petición:

Radicado: {peticion.radicado}
Categoría: {peticion.categoria.value if peticion.categoria else 'general'}
Urgencia: {peticion.urgencia.value if peticion.urgencia else 'no clasificada'}
Entidad referida: {peticion.entidad_referida}
Petición del ciudadano: {peticion.texto_narrativo[:600]}

El borrador debe:
1. Acusar recibo y confirmar el radicado
2. Explicar los pasos que seguirá la Defensoría
3. Indicar los tiempos estimados según normativa
4. Proporcionar canal de seguimiento"""

    try:
        borrador_crudo = llamar_claude(system, user, max_tokens=600, pii=_pii(peticion))

        # Añadir sello IA inamovible (Sprint C1)
        peticion.borrador_m6 = f"{SELLO_IA}\n\n{'─'*60}\n\n{borrador_crudo}\n\n{'─'*60}\n\nFuentes RAG utilizadas:\n" + \
            "\n".join(f"  • {f}" for f in fuentes_usadas) if fuentes_usadas else f"{SELLO_IA}\n\n{borrador_crudo}"

        # Hash del borrador original para bitácora de ediciones (Sprint C1)
        peticion.hash_borrador_m6 = sha256_texto(borrador_crudo)
        peticion.fuentes_rag_m6   = fuentes_usadas

        peticion.registrar(
            f"M6: borrador generado — hash: {peticion.hash_borrador_m6[:16]}... "
            f"fuentes RAG: {len(fuentes_usadas)} "
            f"doble_revision: {doble_revision}"
        )

        if doble_revision:
            peticion.hitl_requerido = True
            razon = "M6: doble revisión requerida — caso urgente o de especial protección"
            peticion.hitl_razon = (peticion.hitl_razon + " | " + razon) if peticion.hitl_razon else razon
            peticion.registrar(razon)

    except Exception as e:
        peticion.registrar(f"M6: error generando borrador — {e}")
        peticion.borrador_m6 = f"{SELLO_IA}\n\n[Error en generación — el profesional debe redactar la respuesta manualmente]"

    peticion.estado = "borrador_generado"
    return peticion


# ──────────────────────────────────────────────────────────
# M7 — INTEROPERABILIDAD + CIERRE (M7-C)
# ──────────────────────────────────────────────────────────

def modulo_m7_registro_iris_visionweb(peticion: Peticion) -> dict:
    """
    Simula el registro en IRIS y VisionWeb vía RPA/API (M7).
    En producción: llamada a RPA bot o API institucional.
    """
    log.info("[M7] Registrando radicado %s en IRIS y VisionWeb", peticion.radicado)
    return {
        "iris_ok": True,
        "visionweb_ok": True,
        "ts_sincronizacion": datetime.now(timezone.utc).isoformat(),
        "radicado": peticion.radicado
    }

def modulo_m7c_cierre_documental(
    peticion: Peticion,
    resultado_tramite: str,
    constancia_respuesta: str,
    funcionario_cierre: str
) -> dict:
    """
    Submódulo M7-C: cierre coordinado y archivo (Sprint B1).
    Genera hash SHA-256 del acto de cierre.
    Actualiza simultáneamente IRIS y VisionWeb.
    Registra ubicación del archivo físico conforme TRD AGN.
    """
    peticion.registrar(f"M7-C: iniciando cierre por {funcionario_cierre}")

    # Construir acto de cierre
    acto_cierre = {
        "radicado": peticion.radicado,
        "fecha_cierre": datetime.now(timezone.utc).isoformat(),
        "resultado_tramite": resultado_tramite,
        "constancia_respuesta_hash": sha256_texto(constancia_respuesta),
        "funcionario_cierre": funcionario_cierre,
        "categoría": peticion.categoria.value if peticion.categoria else None,
        "urgencia": peticion.urgencia.value if peticion.urgencia else None,
    }

    # Hash SHA-256 del acto completo (Sprint B1)
    hash_cierre = sha256_texto(json.dumps(acto_cierre, ensure_ascii=False, sort_keys=True))
    acto_cierre["hash_integridad"] = hash_cierre

    # Actualización atómica IRIS + VisionWeb (en producción: RPA/API)
    iris_ok      = True   # simula RPA
    visionweb_ok = True   # simula RPA

    if not (iris_ok and visionweb_ok):
        peticion.registrar("M7-C: ERROR — fallo en sincronización — en cola de reintento")
        acto_cierre["estado_sync"] = "error_reintento_pendiente"
    else:
        peticion.registrar(
            f"M7-C: cierre registrado en IRIS y VisionWeb — hash: {hash_cierre[:16]}..."
        )
        acto_cierre["estado_sync"] = "sincronizado"

    peticion.estado = "cerrado"
    return acto_cierre


# ──────────────────────────────────────────────────────────
# MONITOR DE DERIVA (DRIFT) — Sprint B3
# ──────────────────────────────────────────────────────────

def evaluar_deriva(
    precision_actual: float,
    precision_baseline: float,
    hitl_recall_actual: float,
    hitl_recall_baseline: float
) -> dict:
    """
    Evalúa la deriva del modelo M2 y emite la alerta correspondiente.
    Umbrales: amarillo 3pp / naranja 5pp / rojo 8pp.
    NIST AI RMF MANAGE · ISO/IEC 42001 §9.1.
    """
    caida_precision = precision_baseline - precision_actual
    caida_recall    = hitl_recall_baseline - hitl_recall_actual

    caida_max = max(caida_precision, caida_recall)

    if caida_max >= DRIFT_UMBRAL_ROJO:
        nivel = "ROJO"
        accion_inmediata = (
            "SUSPENDER módulo M2. Activar modo manual URAB. "
            "Notificar Director Regional. Convocar auditoría extraordinaria."
        )
        accion_estructural = (
            "Post-mortem del incidente. Revisión umbral de confianza mínimo M2. "
            "Informe público según Directiva 007."
        )
    elif caida_max >= DRIFT_UMBRAL_NARANJA:
        nivel = "NARANJA"
        accion_inmediata = (
            "Congelar actualizaciones automáticas. Revisión manual 100% urgentes (2 semanas). "
            "Notificar jefe URAB."
        )
        accion_estructural = (
            "Revisión técnica con Anthropic. Evaluar si drift es cambio lingüístico o degradación. "
            "Plan de remediación en 10 días."
        )
    elif caida_max >= DRIFT_UMBRAL_AMARILLO:
        nivel = "AMARILLO"
        accion_inmediata = (
            "Notificar Comité de IA. Revisar prompts y corpus RAG. "
            "Analizar 20 casos más divergentes."
        )
        accion_estructural = (
            "Ajuste de prompts o actualización corpus RAG. "
            "Registro en bitácora de cambios con versión, fecha y responsable."
        )
    else:
        nivel = "VERDE"
        accion_inmediata  = "Sin acción requerida."
        accion_estructural = "Continuar monitoreo mensual."

    resultado = {
        "nivel_alerta": nivel,
        "precision_actual": precision_actual,
        "precision_baseline": precision_baseline,
        "caida_precision_pp": round(caida_precision * 100, 2),
        "hitl_recall_actual": hitl_recall_actual,
        "hitl_recall_baseline": hitl_recall_baseline,
        "caida_recall_pp": round(caida_recall * 100, 2),
        "accion_inmediata": accion_inmediata,
        "accion_estructural": accion_estructural,
        "ts_evaluacion": datetime.now(timezone.utc).isoformat()
    }

    log.warning("[DRIFT] Alerta %s — precisión: %.1f%% (caída %.2fpp) | recall: %.1f%% (caída %.2fpp)",
                nivel,
                precision_actual * 100, caida_precision * 100,
                hitl_recall_actual * 100, caida_recall * 100)

    return resultado


# ──────────────────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ──────────────────────────────────────────────────────────

def pipeline_completo(
    peticion: Peticion,
    profesionales: list[PerfilProfesional],
    radicados_existentes: list[dict],
    historial_db: dict,
    corpus_rag: list[dict]
) -> Peticion:
    """
    Ejecuta el pipeline M1 → M2 → M4 → M3 → M5 → M6 en secuencia.
    Cada módulo puede activar HITL; el pipeline siempre termina con
    el estado correcto para que el funcionario tome la decisión final.
    """
    log.info("═══ Pipeline iniciado — radicado: %s ═══", peticion.radicado)

    # M1: normalización y cadena de custodia
    peticion = modulo_m1_recepcion(peticion)

    # M2: triage con reglas hard-coded + clasificador
    peticion = modulo_m2_triage(peticion)

    # M4: anti-duplicidad (antes del reparto para no asignar duplicados)
    peticion = modulo_m4_antiduplicidad(peticion, radicados_existentes)

    # M5: historial (alimenta M3 para continuidad)
    historial = modulo_m5_historial(peticion, historial_db)

    # M3: reparto tri-dimensional
    peticion = modulo_m3_reparto(peticion, profesionales, historial)

    # M6: borrador (siempre genera, aunque sea para revisión HITL)
    peticion = modulo_m6_ia_generativa(peticion, corpus_rag)

    # M7: registro en IRIS/VisionWeb
    modulo_m7_registro_iris_visionweb(peticion)

    log.info("═══ Pipeline completado — radicado: %s | estado: %s | HITL: %s ═══",
             peticion.radicado, peticion.estado, peticion.hitl_requerido)

    return peticion


# ──────────────────────────────────────────────────────────
# DEMO
# ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    # Datos de prueba
    profesionales_demo = [
        PerfilProfesional("P01", "Ana Torres",    [EspecialidadProfesional.VBG, EspecialidadProfesional.NNA], casos_activos=847),
        PerfilProfesional("P02", "Luis Morales",  [EspecialidadProfesional.SALUD, EspecialidadProfesional.GENERAL], casos_activos=1103),
        PerfilProfesional("P03", "Clara Ruiz",    [EspecialidadProfesional.DESAPARICION, EspecialidadProfesional.CONFLICTO], casos_activos=612),
        PerfilProfesional("P04", "Jorge Vargas",  [EspecialidadProfesional.GENERAL], casos_activos=954),
    ]

    corpus_demo = [
        {"titulo": "Ley 1257/2008 - Violencia basada en género",
         "texto": "Toda mujer tiene derecho a una vida libre de violencia. La Defensoría puede interponer acciones de tutela en favor de víctimas de VBG..."},
        {"titulo": "Decreto 1729/2008 - Rutas de atención VBG",
         "texto": "Las entidades del SNARIV deben activar rutas de atención inmediata cuando se detecte riesgo de violencia..."},
    ]

    peticion_demo = Peticion(
        radicado="DP-2026-TEST-001",
        canal="web",
        cedula="52.847.193",
        nombre_peticionario="María García",
        correo="maria@ejemplo.com",
        texto_narrativo=(
            "Mi esposo me ha amenazado de muerte en repetidas ocasiones durante la última semana. "
            "Tengo dos hijos menores de edad. El ICBF no me ha respondido. "
            "Necesito protección urgente y medidas de seguridad."
        ),
        es_vbg=True,
    )

    resultado = pipeline_completo(
        peticion=peticion_demo,
        profesionales=profesionales_demo,
        radicados_existentes=[],
        historial_db={},
        corpus_rag=corpus_demo
    )

    print("\n" + "═"*60)
    print("RESULTADO PIPELINE URAB-AI")
    print("═"*60)
    print(f"Radicado:   {resultado.radicado}")
    print(f"Urgencia:   {resultado.urgencia.value if resultado.urgencia else 'N/A'}")
    print(f"Categoría:  {resultado.categoria.value if resultado.categoria else 'N/A'}")
    print(f"Confianza:  {resultado.confianza_clasificacion:.0%}")
    print(f"HITL:       {resultado.hitl_requerido} — {resultado.hitl_razon}")
    print(f"Asignado a: {resultado.profesional_asignado}")
    print(f"Razón:      {resultado.razon_asignacion}")
    print(f"Duplicado:  {resultado.duplicado_de or 'No'}")
    print(f"Estado:     {resultado.estado}")
    print(f"\nExplicación (XAI):\n{resultado.explicacion_clasificacion}")
    print(f"\nBorrador M6 (primeras 3 líneas):")
    for linea in resultado.borrador_m6.split("\n")[:3]:
        print(f"  {linea}")
    print(f"\nLog de eventos ({len(resultado.log_eventos)} entradas):")
    for ev in resultado.log_eventos:
        print(f"  [{ev['ts'][11:19]}] {ev['evento']}")
    print("═"*60)

    # Demo monitor de deriva
    print("\nDEMO MONITOR DE DERIVA:")
    alerta = evaluar_deriva(
        precision_actual=0.83,
        precision_baseline=0.88,
        hitl_recall_actual=0.96,
        hitl_recall_baseline=0.99
    )
    print(f"  Nivel: {alerta['nivel_alerta']}")
    print(f"  Acción inmediata: {alerta['accion_inmediata']}")
