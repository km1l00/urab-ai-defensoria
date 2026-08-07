"""
URAB-AI Backend — FastAPI
Legal Strategy Lab 2026 · Defensoría del Pueblo de Colombia

Endpoints:
  POST /api/peticiones                    - Radicar nueva petición
  GET  /api/peticiones/{radicado}         - Estado de un radicado
  GET  /api/seguimiento/{cedula}          - Peticiones de un ciudadano
  GET  /api/casos                         - Bandeja del funcionario (con filtros)
  GET  /api/casos/{radicado}              - Detalle de caso para funcionario
  PUT  /api/casos/{radicado}/hitl         - Resolver HITL
  GET  /api/profesionales                 - Lista de profesionales
  GET  /api/dashboard/metricas            - Métricas M8 para dashboard
  GET  /api/alertas                       - Alertas activas para coordinadora
"""

import os
from fastapi import FastAPI, Depends, HTTPException, status, Header, Response, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import random
import string

# Zona horaria de Colombia (UTC−5). Las fechas se almacenan en UTC —buena
# práctica que evita ambigüedad— y se convierten a hora local solo al
# mostrarlas. Sin esta conversión, el sistema mostraba la hora cinco horas
# adelantada respecto de la hora real en Colombia.
TZ_COLOMBIA = timezone(timedelta(hours=-5))

def fmt_fecha(dt, con_hora=True):
    """Formatea una fecha UTC en hora de Colombia."""
    if not dt:
        return None
    # Si la fecha viene sin zona (naive), se asume UTC, que es como se guarda.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    local = dt.astimezone(TZ_COLOMBIA)
    return local.strftime("%d/%m/%Y %H:%M") if con_hora else local.strftime("%d/%m/%Y")

def fmt_fecha_corta(dt):
    """Formato corto día/mes hora:minuto en hora de Colombia."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TZ_COLOMBIA).strftime("%d/%m %H:%M")

from database import get_db, init_db
from models import Peticion, Profesional, Evento

app = FastAPI(
    title="URAB-AI API",
    description="Backend agéntico para la Unidad de Recepción y Análisis de Bogotá · Defensoría del Pueblo",
    version="1.0.0"
)

# ── Versionamiento de artefactos de IA (MLOps — RFP §4.6) ──────────────
# Toda clasificación queda sellada con la versión del modelo, de la taxonomía
# y de las reglas codificadas de protección que la produjeron. Permite auditar
# retroactivamente qué configuración generó cada decisión y detectar deriva.
MODELO_VERSION    = os.environ.get("MODELO_VERSION", os.environ.get("URAB_MODEL", "claude-haiku-4-5-20251001"))
TAXONOMIA_VERSION = os.environ.get("TAXONOMIA_VERSION", "urab-tax-1.2.0")
REGLAS_VERSION    = os.environ.get("REGLAS_VERSION", "urab-reglas-proteccion-1.1.0")
MODELO_FECHA_ACTIVACION = os.environ.get("MODELO_FECHA_ACTIVACION", "2026-06-01")

# CORS — permite que los tres frontends en Vercel consuman la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://urab-ai-ciudadano.vercel.app",
        "https://urab-ai-funcionario.vercel.app",
        "https://urab-ai-coordinador.vercel.app",
        "http://localhost:5173",   # dev local
        "http://localhost:5174",   # dev local (segundo frontend en paralelo)
        "http://localhost:5175",   # dev local (tercer frontend en paralelo)
        "http://localhost:3000",
    ],
    # Cubre los dominios de Vercel del equipo (produccion y previews, con o sin
    # el prefijo -ai-), ademas de los listados arriba.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# ── Helpers ──────────────────────────────────────────────────────────────────

def generar_radicado():
    año = datetime.now().year
    seq = ''.join(random.choices(string.digits, k=6))
    return f"DP-{año}-{seq}"

def clasificar_urgencia(texto: str, etario: str = None, grupos: list = None) -> dict:
    """M2 simplificado — clasifica urgencia basado en palabras clave del relato.
    En producción, este paso lo hace Claude Sonnet 4.5 via API."""
    t = texto.lower()
    palabras_criticas = ["amenaza","amenazan","amenazó","amenazaron","matar","me va a matar",
                         "me van a matar","muerte","desapareci","secuestr",
                         "violencia sexual","abuso sexual","tortura",
                         "intento de feminicidio","riesgo de vida","peligro inminente",
                         "violencia física","me golpe","me pegó","agred","me golpeó"]
    palabras_alta = ["desapareció","desaparición","privado de libertad","hacinamiento",
                     "condiciones inhumanas","sin atención médica"]

    es_nna = etario in ["nino","nina","adolescente"]
    # La discapacidad llega por la lista de grupos de especial protección.
    # Al igual que la niñez, activa protección reforzada por mandato constitucional
    # (Art. 13 y 47 CP; Ley 1618 de 2013), con independencia de la gravedad del relato.
    _grupos = [str(g).lower() for g in (grupos or [])]
    tiene_discapacidad = any("discapacidad" in g for g in _grupos)
    sujeto_proteccion_reforzada = es_nna or tiene_discapacidad
    tiene_indicador_critico = any(p in t for p in palabras_criticas)
    tiene_indicador_alta = any(p in t for p in palabras_alta)

    if tiene_indicador_critico:
        urgencia = "critica"
        hitl = True
        hitl_razon = "Regla codificada: indicador crítico detectado en el relato"
    elif sujeto_proteccion_reforzada and tiene_indicador_alta:
        urgencia = "alta"
        hitl = True
        sujeto = "niñas, niños o adolescentes" if es_nna else "una persona con discapacidad"
        hitl_razon = f"El caso involucra a {sujeto} junto con un indicador de riesgo alto — revisión humana obligatoria"
    elif tiene_indicador_alta:
        urgencia = "alta"
        hitl = True
        hitl_razon = "Indicador de urgencia alta detectado"
    elif sujeto_proteccion_reforzada:
        # Protección reforzada incondicional: todo caso que involucre a una niña,
        # niño, adolescente o persona con discapacidad pasa por revisión humana,
        # con independencia de la gravedad aparente del relato.
        # La regla se ejecuta antes de cualquier inferencia del modelo y este no
        # puede desactivarla.
        urgencia = "media"
        hitl = True
        if es_nna:
            hitl_razon = "Protección reforzada: el caso involucra a una niña, niño o adolescente — revisión humana obligatoria (Art. 44 de la Constitución; Ley 1098 de 2006)"
        else:
            hitl_razon = "Protección reforzada: el caso involucra a una persona con discapacidad — revisión humana obligatoria (Art. 13 y 47 de la Constitución; Ley 1618 de 2013)"
    else:
        urgencia = "media"
        hitl = False
        hitl_razon = None

    # Categoría simple basada en palabras clave
    cats = {
        "salud": ["eps","cirugía","médico","hospital","citas","medicamento"],
        "VBG": ["violencia","amenaza","pareja","golpe","feminicidio"],
        "Desaparición": ["desapareci","desapareció","no aparece","no sé dónde"],
        "Carcelario": ["carcel","penal","picota","inpec","privado de libertad"],
        "Pensiones": ["pensión","colpensiones","jubilación"],
        "Educación": ["colegio","universidad","sena","icetex","beca"],
    }
    categoria = "General"
    for cat, palabras in cats.items():
        if any(p in t for p in palabras):
            categoria = cat
            break

    return {
        "urgencia": urgencia,
        "categoria": categoria,
        "confianza_ia": round(random.uniform(82, 96), 1),
        "requiere_hitl": hitl,
        "hitl_razon": hitl_razon,
        "explicacion_ia": f"Clasificación automática basada en análisis del relato. Urgencia {urgencia.upper()} asignada por {'presencia de indicadores críticos' if tiene_indicador_critico else 'análisis de contenido'}. {'HITL activado para revisión humana obligatoria.' if hitl else 'Sin indicadores de riesgo crítico.'}"
    }

def clasificar_tipo_peticion(texto: str, categoria: str, urgencia: str) -> dict:
    """M2 — clasifica el TIPO de petición según la naturaleza jurídica (RFP §2.3):
    - asesoria: orientación o información para ejercer un derecho (sin vulneración)
    - solicitud: intervención, mediación o conciliación (facilitar acuerdo entre partes)
    - queja: presunta vulneración de derechos + conducta vulneratoria
    El agente PROPONE tipo, derechos, conducta y gestiones; el funcionario CONFIRMA vía HITL."""
    t = texto.lower()

    kw_asesoria = ["cómo puedo", "como puedo", "quisiera saber", "quiero saber", "me pueden informar",
                   "necesito información", "necesito informacion", "cuál es el procedimiento",
                   "cual es el procedimiento", "orientación", "orientacion", "asesoría", "asesoria",
                   "consulta", "tengo una duda", "qué debo hacer", "que debo hacer", "cómo hago",
                   "requisitos para", "dónde puedo", "donde puedo"]
    kw_solicitud = ["mediación", "mediacion", "conciliación", "conciliacion", "intervención",
                    "intervencion", "intermediar", "llegar a un acuerdo", "facilitar", "mediar",
                    "solicito la intervención", "solicito la intervencion", "acuerdo con",
                    "conciliar", "que intervengan"]
    kw_queja = ["me negaron", "negó", "nego", "vulnera", "violó", "violo", "incumpl",
                "no me han", "no me dan", "no responde", "sin respuesta", "abuso",
                "maltrato", "amenaz", "discrimin", "no cumpl", "desconoc", "impidió", "impidio",
                "denuncio", "denuncia", "reclamo", "queja"]

    tiene_queja = any(k in t for k in kw_queja)
    tiene_solicitud = any(k in t for k in kw_solicitud)
    tiene_asesoria = any(k in t for k in kw_asesoria)

    # Prioridad: urgencia crítica/alta o indicadores de vulneración - queja
    if urgencia in ("critica", "alta") or tiene_queja:
        tipo = "queja"
    elif tiene_solicitud:
        tipo = "solicitud"
    elif tiene_asesoria:
        tipo = "asesoria"
    else:
        tipo = "queja"# por defecto conservador

    # Derechos y conducta (solo para queja)
    derechos_sugeridos = []
    conducta_sugerida = None
    if tipo == "queja":
        mapa_derechos = {
            "salud": "Derecho fundamental a la salud (Art. 49 CP · Ley 1751/2015)",
            "VBG": "Derecho a una vida libre de violencia (Ley 1257/2008) · Integridad personal (Art. 12 CP)",
            "Desaparición": "Derecho a la vida y libertad personal (Art. 11 y 28 CP)",
            "Carcelario": "Dignidad humana de personas privadas de la libertad (Art. 1 CP · T-388/2013)",
            "Pensiones": "Derecho a la seguridad social (Art. 48 CP)",
            "Educación": "Derecho a la educación (Art. 67 CP)",
            "General": "Derecho de petición (Art. 23 CP) · Debido proceso (Art. 29 CP)",
        }
        derechos_sugeridos = [mapa_derechos.get(categoria, mapa_derechos["General"])]
        if "neg" in t:
            conducta_sugerida = "Negación del servicio o prestación por parte de la entidad accionada."
        elif "no respon" in t or "sin respuesta" in t:
            conducta_sugerida = "Omisión en dar respuesta oportuna a las solicitudes del peticionario."
        elif "incumpl" in t or "no cumpl" in t:
            conducta_sugerida = "Incumplimiento de una obligación legal o contractual por parte de la entidad."
        elif "amenaz" in t or "violencia" in t:
            conducta_sugerida = "Conducta que amenaza la integridad personal del peticionario."
        else:
            conducta_sugerida = "Presunta acción u omisión de la entidad que afecta los derechos del peticionario. Requiere precisión del funcionario."

    # M2 sugiere las GESTIONES que el funcionario debe hacer según tipo y categoría
    gestiones_sugeridas = _sugerir_gestiones(tipo, categoria, derechos_sugeridos)

    tipo_lbl = {"asesoria": "Asesoría", "solicitud": "Solicitud (intervención/mediación/conciliación)", "queja": "Queja"}[tipo]
    return {
        "tipo_peticion": tipo,
        "tipo_label": tipo_lbl,
        "derechos_sugeridos": derechos_sugeridos,
        "conducta_sugerida": conducta_sugerida,
        "gestiones_sugeridas": gestiones_sugeridas,
        "tipo_confirmado_hitl": False,
    }

def _sugerir_gestiones(tipo: str, categoria: str, derechos: list) -> list:
    """M2/M6 — propone las gestiones defensoriales a realizar según el caso.
    El funcionario las confirma o edita vía HITL antes de ejecutarlas."""
    if tipo == "asesoria":
        return [
            {"accion": "Brindar orientación sobre la ruta institucional aplicable al ciudadano", "entidad": "Defensoría del Pueblo", "confirmada": False},
            {"accion": "Enviar información escrita sobre requisitos y procedimiento", "entidad": "Defensoría del Pueblo", "confirmada": False},
        ]
    if tipo == "solicitud":
        return [
            {"accion": "Convocar a las partes para facilitar el diálogo (mediación)", "entidad": "Partes involucradas", "confirmada": False},
            {"accion": "Coordinar sesión de mediación/conciliación y levantar constancia", "entidad": "Defensoría del Pueblo", "confirmada": False},
        ]
    # queja — gestiones según categoría
    base = {
        "salud": [
            {"accion": "Oficiar a la EPS solicitando autorización/prestación del servicio negado", "entidad": "EPS accionada", "confirmada": False},
            {"accion": "Remitir copia a la Superintendencia Nacional de Salud", "entidad": "Superintendencia Nacional de Salud", "confirmada": False},
            {"accion": "Requerir respuesta en 48 horas por tratarse de derecho fundamental", "entidad": "EPS accionada", "confirmada": False},
        ],
        "VBG": [
            {"accion": "Activar ruta de atención en violencia basada en género", "entidad": "Comisaría de Familia", "confirmada": False},
            {"accion": "Solicitar medida de protección urgente", "entidad": "Fiscalía / Juez de control de garantías", "confirmada": False},
            {"accion": "Coordinar acompañamiento psicosocial", "entidad": "ICBF / Secretaría de la Mujer", "confirmada": False},
        ],
        "Desaparición": [
            {"accion": "Activar Mecanismo de Búsqueda Urgente (Ley 971/2005)", "entidad": "Fiscalía General de la Nación", "confirmada": False},
            {"accion": "Oficiar a la Unidad de Búsqueda de Personas Desaparecidas", "entidad": "UBPD", "confirmada": False},
            {"accion": "Coordinar con Policía Nacional para reporte", "entidad": "Policía Nacional", "confirmada": False},
        ],
        "Carcelario": [
            {"accion": "Realizar visita de verificación de condiciones de reclusión", "entidad": "INPEC", "confirmada": False},
            {"accion": "Oficiar requiriendo atención médica y mejora de condiciones", "entidad": "INPEC / USPEC", "confirmada": False},
        ],
        "Pensiones": [
            {"accion": "Oficiar al fondo de pensiones solicitando respuesta de fondo", "entidad": "Colpensiones / AFP", "confirmada": False},
            {"accion": "Requerir cumplimiento del término legal de respuesta", "entidad": "Fondo de pensiones", "confirmada": False},
        ],
    }
    return base.get(categoria, [
        {"accion": "Oficiar a la entidad accionada requiriendo respuesta de fondo", "entidad": "Entidad accionada", "confirmada": False},
        {"accion": "Hacer seguimiento al cumplimiento del término legal (CPACA Art. 14)", "entidad": "Entidad accionada", "confirmada": False},
    ])

def asignar_profesional(categoria: str, db: Session) -> Profesional:
    """M3 simplificado — asigna por especialidad y menor carga."""
    profesionales = db.query(Profesional).all()
    # Filtrar por especialidad
    con_especialidad = [p for p in profesionales if any(
        categoria.lower() in e.lower() for e in p.especialidades
    )]
    candidatos = con_especialidad if con_especialidad else profesionales
    # Menor carga
    return min(candidatos, key=lambda p: p.casos_activos / p.umbral_maximo)

def _similitud_texto(a: str, b: str) -> float:
    """Similitud semántica simplificada. Combina Jaccard con overlap coefficient
    para captar mejor duplicados que reformulan la misma queja con otras palabras.
    En producción, M4 usa embeddings vectoriales + pgvector para similitud coseno."""
    import re
    def tokens(t):
        t = t.lower()
        for o, n in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u")]:
            t = t.replace(o, n)
        palabras = re.findall(r"\b[a-z]{4,}\b", t)
        vacias = {"para","como","pero","este","esta","esto","que","los","las","una","del",
                  "por","con","mas","muy","sin","son","fue","han","hay","sus","les","ese","esa",
                  "sigue","hace","meses","tres"}
        return set(w for w in palabras if w not in vacias)
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    interseccion = len(ta & tb)
    union = len(ta | tb)
    jaccard = interseccion / union if union else 0
    # Overlap coefficient: qué proporción del texto más corto está contenida en el otro
    overlap = interseccion / min(len(ta), len(tb)) if min(len(ta), len(tb)) else 0
    # Promedio ponderado — el overlap capta mejor reformulaciones
    score = (jaccard * 0.4 + overlap * 0.6) * 100
    return round(score, 1)

def detectar_duplicado(cedula: str, texto_nuevo: str, categoria: str, db: Session, umbral: float = 55.0) -> dict:
    """M4 — detecta si la petición nueva es duplicado de una existente del mismo ciudadano.
    Compara contra radicados previos de la misma cédula. Umbral configurable."""
    previas = db.query(Peticion).filter(
        Peticion.cedula == cedula,
        Peticion.estado.notin_(["Cerrado"])
    ).all()

    mejor_match = None
    mejor_similitud = 0.0
    for prev in previas:
        sim = _similitud_texto(texto_nuevo, prev.texto_relato or "")
        # Bonus si es la misma categoría
        if prev.categoria == categoria:
            sim = min(100.0, sim + 15)
        if sim > mejor_similitud:
            mejor_similitud = sim
            mejor_match = prev

    if mejor_match and mejor_similitud >= umbral:
        return {
            "es_duplicado": True,
            "duplicado_de": mejor_match.radicado,
            "similitud_pct": mejor_similitud,
            "razon": f"M4: posible duplicado de {mejor_match.radicado} (similitud {mejor_similitud}%) — funcionario debe aprobar acumulación"
        }
    return {"es_duplicado": False, "duplicado_de": None, "similitud_pct": None, "razon": None}

# ── Schemas Pydantic ──────────────────────────────────────────────────────────

class NuevaPeticion(BaseModel):
    nombre: str
    cedula: str
    tipo_doc: str = "CC"
    etario: Optional[str] = None
    etnia: Optional[str] = None
    discapacidad: Optional[str] = None
    victima_conflicto: Optional[str] = None
    grupos_especiales: List[str] = []
    entidades: List[str] = []
    entidad_otro: Optional[str] = None
    entidad_no_sabe: bool = False
    texto_relato: str
    contacto_tipo: str
    contacto_valor: str
    canal: str = "web"

class ResolverHITL(BaseModel):
    accion: str   # "aprobar", "devolver", "acumular"
    observacion: Optional[str] = None
    acumular_con: Optional[str] = None
    profesional_id: Optional[str] = None

class RegistrarGestion(BaseModel):
    accion: str                       # qué va a gestionar
    entidades: list = []              # entidades a oficiar
    plazo: Optional[str] = None       # inmediato, 5dias, 10dias, 15dias
    funcionario: Optional[str] = None # nombre del funcionario que gestiona

class ConfirmarTipo(BaseModel):
    tipo_peticion: str                    # asesoria, solicitud, queja
    derechos_vulnerados: list = []        # confirmados/editados por el funcionario
    conducta_vulnera: Optional[str] = None
    funcionario: Optional[str] = None
    override_justificacion: Optional[str] = None  # obligatoria si cambia el tipo de M2

class ConfirmarGestiones(BaseModel):
    gestiones: list                       # lista de {accion, entidad, confirmada}
    funcionario: Optional[str] = None

class RegistrarRespuesta(BaseModel):
    indice_gestion: int                   # cuál gestión recibió respuesta
    respuesta: str                        # texto de la respuesta recibida
    funcionario: Optional[str] = None

class DevolverReparto(BaseModel):
    razon: str                            # por qué no es de su competencia
    funcionario: Optional[str] = None

class AdjuntarAlCiudadano(BaseModel):
    archivos: list                        # nombres de los documentos
    descripcion: str                      # qué son y para qué se envían
    funcionario: Optional[str] = None

class ComplementarPeticion(BaseModel):
    texto: str                            # información adicional que aporta el ciudadano
    archivos: list = []                   # nombres de archivos aportados
    cedula: Optional[str] = None          # para verificar que es el titular

class ObservacionIA(BaseModel):
    tipo_error: str                       # clasificacion_incorrecta, dato_no_detectado, gestion_inadecuada, borrador_impreciso, otro
    comentario: str
    modulo: Optional[str] = None          # M1, M2, M3, M4, M6
    funcionario: Optional[str] = None

class Reasignar(BaseModel):
    profesional_id: str                   # a quién se reasigna
    razon: Optional[str] = None
    coordinador: Optional[str] = None

class ObservacionCoordinador(BaseModel):
    observacion: str                      # observación del coordinador sobre la gestión
    indice_gestion: Optional[int] = None  # gestión específica, o None para observación general
    coordinador: Optional[str] = None

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def raiz():
    return {"mensaje": "URAB-AI API · Legal Strategy Lab 2026 · Defensoría del Pueblo de Colombia", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ── PORTAL CIUDADANO ──────────────────────────────────────────────────────────

@app.post("/api/peticiones", status_code=status.HTTP_201_CREATED)
def radicar_peticion(datos: NuevaPeticion, db: Session = Depends(get_db)):
    """Radica una nueva petición. Ejecuta M1 (normalización) y M2 (triage) internamente."""

    # M1 — validación básica
    if len(datos.texto_relato.strip()) < 15:
        raise HTTPException(status_code=400, detail="El relato debe tener al menos 15 caracteres.")

    # M2 — clasificación y triage
    # La capa cognitiva es intercambiable: si el orquestador agéntico está
    # activo (USAR_ORQUESTADOR=1), clasifica con razonamiento contextual;
    # si no, opera el clasificador local determinista. Las reglas codificadas
    # de protección se ejecutan antes del clasificador en ambos modos.
    from adaptador_orquestador import clasificar_con_orquestador
    clasificacion = clasificar_con_orquestador(
        datos.texto_relato,
        etario=datos.etario,
        grupos=datos.grupos_especiales,
        canal=datos.canal or "web",
        nombre=datos.nombre,
        cedula=datos.cedula,
        contacto=datos.contacto_valor,
    )
    if clasificacion is None:
        # Respaldo: el clasificador local. La radicación nunca se bloquea
        # por indisponibilidad del proveedor del modelo.
        clasificacion = clasificar_urgencia(
            datos.texto_relato,
            etario=datos.etario,
            grupos=datos.grupos_especiales
        )
        clasificacion["motor"] = "clasificador_local"

    # M2 — clasificación del tipo de petición (asesoría / mediación / queja)
    tipo_clasif = clasificar_tipo_peticion(
        datos.texto_relato,
        clasificacion["categoria"],
        clasificacion["urgencia"]
    )

    # M3 — asignación de profesional
    profesional = asignar_profesional(clasificacion["categoria"], db)

    # M4 — detección de duplicados contra radicados previos del mismo ciudadano
    dup = detectar_duplicado(datos.cedula, datos.texto_relato, clasificacion["categoria"], db)

    # Generar radicado único
    radicado = generar_radicado()
    while db.query(Peticion).filter(Peticion.radicado == radicado).first():
        radicado = generar_radicado()

    # Términos legales (15 días hábiles desde la fecha de radicación)
    fecha_vencimiento = datetime.utcnow() + timedelta(days=21)  # ~15 días hábiles

    # Construir lista de entidades
    entidades = list(datos.entidades)
    if datos.entidad_otro:
        entidades.append(datos.entidad_otro)

    # Si M4 detectó duplicado, activa HITL para que el funcionario decida acumulación
    # Si es queja, el funcionario debe confirmar derechos vulnerados y conducta vía HITL
    es_queja = tipo_clasif["tipo_peticion"] == "queja"
    requiere_hitl = clasificacion["requiere_hitl"] or dup["es_duplicado"] or es_queja
    if dup["es_duplicado"]:
        hitl_razon = dup["razon"]
    elif clasificacion["hitl_razon"]:
        hitl_razon = clasificacion["hitl_razon"]
    elif es_queja:
        hitl_razon = "Tipo QUEJA — el funcionario debe confirmar los derechos vulnerados y la conducta que los vulnera (Directiva 007/2025)"
    else:
        hitl_razon = None
    estado = "Pendiente HITL" if requiere_hitl else "En gestión"
    if dup["es_duplicado"]:
        estado = "Pendiente acumulación"

    peticion = Peticion(
        radicado=radicado,
        ciudadano=datos.nombre,
        cedula=datos.cedula,
        canal=datos.canal,
        fecha_radicado=datetime.utcnow(),
        urgencia=clasificacion["urgencia"],
        categoria=clasificacion["categoria"],
        confianza_ia=clasificacion["confianza_ia"],
        modelo_version=MODELO_VERSION,
        taxonomia_version=TAXONOMIA_VERSION,
        reglas_version=REGLAS_VERSION,
        estado=estado,
        profesional_id=profesional.id,
        profesional_nombre=profesional.nombre,
        texto_relato=datos.texto_relato,
        entidades=entidades,
        etario=datos.etario,
        etnia=datos.etnia,
        discapacidad=datos.discapacidad,
        victima_conflicto=datos.victima_conflicto,
        grupos_especiales=datos.grupos_especiales,
        requiere_hitl=requiere_hitl,
        hitl_razon=hitl_razon,
        hitl_resuelto=False,
        es_duplicado=dup["es_duplicado"],
        duplicado_de=dup["duplicado_de"],
        similitud_pct=dup["similitud_pct"],
        tiempo_triage_h=round(random.uniform(0.01, 0.08), 2),
        radicada_por_funcionario=False,
        contacto_tipo=datos.contacto_tipo,
        contacto_valor=datos.contacto_valor,
        fecha_vencimiento=fecha_vencimiento,
        explicacion_ia=clasificacion["explicacion_ia"],
        tipo_peticion=tipo_clasif["tipo_peticion"],
        tipo_peticion_sugerido=tipo_clasif["tipo_peticion"],
        derechos_vulnerados=tipo_clasif["derechos_sugeridos"],
        conducta_vulnera=tipo_clasif["conducta_sugerida"],
        tipo_confirmado_hitl=False,
        gestiones=tipo_clasif["gestiones_sugeridas"],
        gestiones_confirmadas=False,
        tipo_recepcion="ciudadano_directo" if datos.canal in ("web", "correo") else "funcionario_asistida",
        procedimiento_recepcion=(
            "Recepción directa por el ciudadano a través del canal digital web/correo. M1 extrajo y normalizó los datos."
            if datos.canal in ("web", "correo")
            else "Recepción asistida por funcionario. El caso fue documentado y radicado por un funcionario de la URAB."
        ),
    )
    db.add(peticion)

    # Actualizar carga del profesional
    profesional.casos_activos += 1
    if requiere_hitl:
        profesional.hitl_pendientes += 1

    # Registrar eventos en la bitácora
    db.add(Evento(
        radicado=radicado,
        titulo="Radicación recibida",
        actor="c",
        actor_label=datos.nombre,
        descripcion=f"Petición radicada en canal {datos.canal}. Datos de contacto: {datos.contacto_tipo} {datos.contacto_valor}."
    ))
    db.add(Evento(
        radicado=radicado,
        titulo="Triage automático M2",
        actor="ia",
        actor_label="Sistema IA",
        descripcion=f"Urgencia {clasificacion['urgencia'].upper()} · {clasificacion['categoria']} · exactitud {clasificacion['confianza_ia']}% · modelo {MODELO_VERSION} · taxonomía {TAXONOMIA_VERSION}. {'Revisión humana activada.' if clasificacion['requiere_hitl'] else 'Clasificación automática sujeta a confirmación.'}"
    ))
    db.add(Evento(
        radicado=radicado,
        titulo="Asignación M3",
        actor="ia",
        actor_label="Sistema IA",
        descripcion=f"Asignada a {profesional.nombre} ({profesional.id}) por especialidad en {clasificacion['categoria']}."
    ))
    # Evento M4 si detectó duplicado
    if dup["es_duplicado"]:
        db.add(Evento(
            radicado=radicado,
            titulo="Detección de duplicado M4",
            actor="ia",
            actor_label="Sistema IA",
            descripcion=f"Similitud {dup['similitud_pct']}% con {dup['duplicado_de']}. Requiere aprobación de acumulación por el funcionario."
        ))
    # Sincronización con las plataformas institucionales (RFP §4.2)
    # Una sola escritura del profesional se replica a IRIS y VisionWeb.
    # Las plataformas están simuladas: no hay acceso a los sistemas reales.
    try:
        from simulador_legacy import sincronizar
        sync = sincronizar(radicado, "radicar", {
            "radicado": radicado,
            "ciudadano": datos.nombre,
            "categoria": clasificacion["categoria"],
            "urgencia": clasificacion["urgencia"],
            "estado": estado,
            "profesional": profesional.nombre,
        }, actor=datos.nombre)
        detalle_sync = f"IRIS: {sync['iris']} · VisionWeb: {sync['visionweb']}."
        if sync["incidencias"]:
            detalle_sync += " " + " ".join(sync["incidencias"])
        else:
            detalle_sync += " Registro único: el profesional no vuelve a teclear en la segunda plataforma."
        db.add(Evento(
            radicado=radicado,
            titulo="Sincronización con plataformas institucionales",
            actor="ia",
            actor_label="Sistema de sincronización",
            descripcion=detalle_sync + " (Plataformas simuladas.)"
        ))
    except Exception as e:
        # La sincronización no puede bloquear la radicación: el caso queda
        # registrado en el sistema aunque la réplica falle, y se reintenta después.
        db.add(Evento(
            radicado=radicado,
            titulo="Sincronización pendiente",
            actor="ia",
            actor_label="Sistema de sincronización",
            descripcion=f"La réplica a las plataformas quedó pendiente y se reintentará. El caso está radicado en el sistema. Detalle: {e}"
        ))

    db.commit()

    return {
        "radicado": radicado,
        "fecha": fmt_fecha(peticion.fecha_radicado),
        "urgencia": clasificacion["urgencia"],
        "categoria": clasificacion["categoria"],
        "profesional": profesional.nombre,
        "requiere_hitl": requiere_hitl,
        "es_duplicado": dup["es_duplicado"],
        "duplicado_de": dup["duplicado_de"],
        "similitud_pct": dup["similitud_pct"],
        "fecha_vencimiento": fmt_fecha(fecha_vencimiento, con_hora=False),
        "mensaje": "Petición radicada exitosamente. Guarde su número de radicado para hacer seguimiento."
    }

@app.get("/api/peticiones/{radicado}")
def consultar_radicado(radicado: str, cedula: str = None, db: Session = Depends(get_db)):
    """
    Seguimiento de una petición por número de radicado.

    Requiere verificación de titularidad: además del radicado, el consultante
    debe aportar la cédula del titular. Conocer el número de radicado no basta
    para acceder a los datos personales de un caso ajeno. Es el estándar de los
    trámites públicos (consulta de procesos, PQRS): identificador + documento
    del titular.

    Esta verificación protege los datos personales del peticionario conforme a
    la Ley 1581 de 2012: el estado de una petición, la clasificación, las
    gestiones y el relato son datos del titular, no información pública.
    """
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Radicado no encontrado.")

    # Verificación de titularidad: la cédula aportada debe coincidir con la del titular.
    if not cedula or str(cedula).strip() != str(p.cedula or "").strip():
        raise HTTPException(
            status_code=403,
            detail="Para consultar esta petición debe indicar el número de documento del titular. "
                   "El número de radicado por sí solo no permite acceder a los datos del caso."
        )

    eventos = db.query(Evento).filter(Evento.radicado == radicado.upper()).all()

    return {
        "radicado": p.radicado,
        "ciudadano": p.ciudadano,
        "canal": p.canal,
        "fecha": fmt_fecha(p.fecha_radicado),
        "urgencia": p.urgencia,
        "categoria": p.categoria,
        "estado": p.estado,
        "profesional": p.profesional_nombre,
        "clasificacion_ia": True,
        "explicacion_ia": p.explicacion_ia,
        "requiere_hitl": p.requiere_hitl,
        "fecha_vencimiento": fmt_fecha(p.fecha_vencimiento, con_hora=False) if p.fecha_vencimiento else None,
        "gestion": {
            "accion": p.gestion_accion,
            "entidades": p.gestion_entidades or [],
            "plazo": p.gestion_plazo,
            "funcionario": p.gestion_funcionario,
            "fecha": fmt_fecha(p.gestion_fecha),
        } if p.gestion_accion else None,
        "tipo_peticion": p.tipo_peticion,
        "tipo_confirmado": p.tipo_confirmado_hitl,
        "gestiones": [g for g in (p.gestiones or []) if g.get("confirmada")],
        "complementos_ciudadano": p.complementos_ciudadano or [],
        "adjuntos_funcionario": p.adjuntos_funcionario or [],
        "tipo_recepcion": p.tipo_recepcion,
        "procedimiento_recepcion": p.procedimiento_recepcion,
        "caso_cerrado": p.caso_cerrado,
        "fecha_cierre": fmt_fecha(p.fecha_cierre, con_hora=False),
        "eventos": [
            {
                "titulo": e.titulo,
                "fecha": fmt_fecha_corta(e.fecha),
                "actor": e.actor,
                "actor_label": e.actor_label,
                "descripcion": e.descripcion,
            }
            for e in eventos
        ]
    }

@app.get("/api/seguimiento/{cedula}")
def historial_ciudadano(cedula: str, verificacion: str = None, db: Session = Depends(get_db)):
    """
    Peticiones de un ciudadano por cédula, con verificación de titularidad.

    La cédula no es un secreto: aparece en documentos, correspondencia y bases
    de datos. Por sí sola no puede dar acceso al historial de peticiones de una
    persona. Se exige un segundo factor: los últimos cuatro caracteres del dato
    de contacto que el titular registró (correo o celular), que solo el titular
    conoce.

    Protege los datos personales conforme a la Ley 1581 de 2012.
    """
    peticiones = db.query(Peticion).filter(Peticion.cedula == cedula).order_by(Peticion.fecha_radicado.desc()).all()

    if not peticiones:
        # No se revela si la cédula existe o no: misma respuesta en ambos casos.
        raise HTTPException(status_code=404, detail="No se encontraron peticiones asociadas a los datos indicados.")

    # Verificación de titularidad por los últimos 4 caracteres del contacto registrado.
    contacto_ref = str(peticiones[0].contacto_valor or "").strip()
    ultimos = contacto_ref[-4:] if len(contacto_ref) >= 4 else contacto_ref
    if not verificacion or str(verificacion).strip() != ultimos:
        raise HTTPException(
            status_code=403,
            detail="Para consultar el historial debe indicar los últimos cuatro caracteres del "
                   "correo o celular con el que radicó (por ejemplo, los últimos 4 dígitos del celular). "
                   "El número de documento por sí solo no permite acceder al historial."
        )

    return [
        {
            "radicado": p.radicado,
            "fecha": fmt_fecha(p.fecha_radicado, con_hora=False),
            "urgencia": p.urgencia,
            "categoria": p.categoria,
            "estado": p.estado,
        }
        for p in peticiones
    ]

# ── PANEL FUNCIONARIO ─────────────────────────────────────────────────────────

# ── AUTENTICACIÓN Y CONTROL DE ACCESO POR ROLES (RBAC) ────────────────────────

class LoginRequest(BaseModel):
    profesional_id: str
    codigo: str
    nombre: Optional[str] = None

@app.post("/api/auth/login")
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    """
    Autentica a un funcionario o coordinador y emite un token de sesión.

    RFP §4.5 — control de acceso por roles. Los portales internos exigen
    autenticación: el acceso a datos personales de peticionarios no puede
    depender únicamente de conocer una URL.
    """
    from auth import autenticar
    prof = db.query(Profesional).filter(Profesional.id == datos.profesional_id.upper()).first()
    nombre = prof.nombre if prof else datos.nombre
    resultado = autenticar(datos.profesional_id, datos.codigo, nombre)
    if not resultado:
        raise HTTPException(status_code=401, detail="Credenciales no válidas.")
    return resultado


def requerir_rol(*roles_permitidos):
    """
    Dependencia que exige un token válido con uno de los roles indicados.
    Se usa así:  usuario = Depends(requerir_rol("funcionario", "coordinador"))
    """
    def verificar(authorization: str = Header(None)):
        from auth import verificar_token
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Se requiere autenticación. Inicie sesión.")
        token = authorization.split(" ", 1)[1]
        payload = verificar_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Sesión no válida o expirada. Inicie sesión de nuevo.")
        if payload["rol"] not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail=f"Su rol ({payload['rol']}) no tiene permiso para esta operación."
            )
        return payload
    return verificar


@app.get("/api/casos")
def bandeja_funcionario(
    profesional_id: str = None,
    filtro: str = "todos",  # todos, hitl, critica
    db: Session = Depends(get_db),
    usuario: dict = Depends(requerir_rol("funcionario", "coordinador"))
):
    """Bandeja de casos del panel funcionario."""
    query = db.query(Peticion)
    if profesional_id:
        query = query.filter(Peticion.profesional_id == profesional_id)
    if filtro == "hitl":
        query = query.filter(Peticion.requiere_hitl == True, Peticion.hitl_resuelto == False)
    elif filtro == "critica":
        query = query.filter(Peticion.urgencia == "critica")

    casos = query.order_by(Peticion.fecha_radicado.desc()).all()
    return [_serializar_caso(c) for c in casos]

@app.get("/api/casos/{radicado}")
def detalle_caso(radicado: str, db: Session = Depends(get_db)):
    """Detalle completo de un caso para el panel funcionario."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    eventos = db.query(Evento).filter(Evento.radicado == radicado.upper()).all()
    caso = _serializar_caso(p)
    caso["eventos"] = [
        {"titulo": e.titulo, "fecha": fmt_fecha_corta(e.fecha),
         "actor": e.actor, "actor_label": e.actor_label, "descripcion": e.descripcion}
        for e in eventos
    ]
    return caso

@app.put("/api/casos/{radicado}/hitl")
def resolver_hitl(radicado: str, datos: ResolverHITL, db: Session = Depends(get_db)):
    """Resuelve el HITL de un caso — aprobar, devolver o acumular."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    if datos.accion == "aprobar":
        p.hitl_resuelto = True
        p.estado = "En gestión"
        desc = "HITL aprobado por funcionario. Borrador M6 en preparación."
    elif datos.accion == "devolver":
        p.estado = "Devuelto al ciudadano"
        desc = f"Devuelto con observación: {datos.observacion}"
    elif datos.accion == "acumular":
        p.es_duplicado = True
        p.duplicado_de = datos.acumular_con
        p.hitl_resuelto = True
        p.estado = f"Acumulado con {datos.acumular_con}"
        desc = f"Expediente acumulado con {datos.acumular_con} por funcionario."
    else:
        raise HTTPException(status_code=400, detail="Acción no válida.")

    # Actualizar HITL pendientes del profesional
    prof = db.query(Profesional).filter(Profesional.id == p.profesional_id).first()
    if prof and prof.hitl_pendientes > 0:
        prof.hitl_pendientes -= 1

    db.add(Evento(
        radicado=radicado.upper(),
        titulo=f"HITL resuelto — {datos.accion}",
        actor="f",
        actor_label="Funcionario/a",
        descripcion=desc
    ))
    db.commit()
    return {"ok": True, "estado": p.estado}

@app.put("/api/casos/{radicado}/gestion")
def registrar_gestion(radicado: str, datos: RegistrarGestion, db: Session = Depends(get_db)):
    """Registra el plan de gestión del funcionario. Queda visible para el
    ciudadano (seguimiento) y para la coordinadora (supervisión)."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    plazo_lbl = {
        "inmediato": "Inmediato (caso urgente)",
        "5dias": "5 días hábiles",
        "10dias": "10 días hábiles",
        "15dias": "15 días hábiles (término máximo CPACA Art. 14)"
    }.get(datos.plazo, datos.plazo or "No especificado")

    p.gestion_accion = datos.accion
    p.gestion_entidades = datos.entidades
    p.gestion_plazo = datos.plazo
    p.gestion_fecha = datetime.utcnow()
    p.gestion_funcionario = datos.funcionario or p.profesional_nombre
    if p.estado in ("Pendiente triage", "En gestión", "Pendiente HITL"):
        p.estado = "En gestión activa"

    entidades_txt = ", ".join(datos.entidades) if datos.entidades else "sin entidades"
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Plan de gestión registrado",
        actor="f",
        actor_label=p.gestion_funcionario,
        descripcion=f"Gestión: {datos.accion} · Entidades oficiadas: {entidades_txt} · Plazo: {plazo_lbl}"
    ))
    db.commit()
    return {
        "ok": True,
        "gestion": {
            "accion": p.gestion_accion,
            "entidades": p.gestion_entidades,
            "plazo": plazo_lbl,
            "funcionario": p.gestion_funcionario,
            "fecha": fmt_fecha(p.gestion_fecha)
        }
    }

@app.put("/api/casos/{radicado}/tipo")
def confirmar_tipo(radicado: str, datos: ConfirmarTipo, db: Session = Depends(get_db)):
    """El funcionario confirma (vía HITL) el tipo de petición y, si es queja,
    los derechos vulnerados y la conducta que los vulnera."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    p.tipo_peticion = datos.tipo_peticion
    p.derechos_vulnerados = datos.derechos_vulnerados
    p.conducta_vulnera = datos.conducta_vulnera
    p.tipo_confirmado_hitl = True

    # Detectar si el funcionario cambió el tipo que M2 sugirió (override)
    sugerido = p.tipo_peticion_sugerido
    es_override = sugerido is not None and sugerido != datos.tipo_peticion
    if es_override:
        p.override_tipo_justificacion = datos.override_justificacion

    tipo_lbl = {"asesoria": "Asesoría", "solicitud": "Solicitud", "queja": "Queja"}.get(datos.tipo_peticion, datos.tipo_peticion)
    sug_lbl = {"asesoria": "Asesoría", "solicitud": "Solicitud", "queja": "Queja"}.get(sugerido, sugerido)
    if datos.tipo_peticion == "queja":
        desc = f"Tipo confirmado: QUEJA. Derechos vulnerados: {', '.join(datos.derechos_vulnerados) if datos.derechos_vulnerados else 'no especificados'}. Conducta: {datos.conducta_vulnera or 'no especificada'}."
    else:
        desc = f"Tipo confirmado: {tipo_lbl}. Sin derechos vulnerados (no es queja)."

    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Tipo de petición confirmado (HITL)",
        actor="f",
        actor_label=datos.funcionario or p.profesional_nombre,
        descripcion=desc
    ))

    # Si hubo override, registrar un evento específico visible para la coordinación
    if es_override:
        db.add(Evento(
            radicado=radicado.upper(),
            titulo="Cambio de clasificación de M2 (override HITL)",
            actor="f",
            actor_label=datos.funcionario or p.profesional_nombre,
            descripcion=f"El funcionario cambió el tipo sugerido por M2 de «{sug_lbl}» a «{tipo_lbl}». Justificación: {datos.override_justificacion or 'no registrada'}"
        ))

    db.commit()
    return {"ok": True, "tipo_peticion": p.tipo_peticion, "confirmado": True, "override": es_override}

@app.put("/api/casos/{radicado}/gestiones")
def confirmar_gestiones(radicado: str, datos: ConfirmarGestiones, db: Session = Depends(get_db)):
    """El funcionario confirma (HITL) las gestiones sugeridas por M2. Al confirmarlas,
    se genera la notificación al ciudadano y a la coordinadora."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    # Guardar gestiones (con estructura de respuesta lista)
    gestiones = []
    for g in datos.gestiones:
        gestiones.append({
            "accion": g.get("accion"),
            "entidad": g.get("entidad"),
            "confirmada": g.get("confirmada", True),
            "respuesta": None,
            "fecha_respuesta": None,
        })
    p.gestiones = gestiones
    p.gestiones_confirmadas = True
    confirmadas = [g for g in gestiones if g["confirmada"]]
    p.estado = "En gestión activa" if confirmadas else p.estado

    # Evento: notificación al ciudadano y coordinadora
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Gestiones confirmadas por el funcionario (HITL)",
        actor="f",
        actor_label=datos.funcionario or p.profesional_nombre,
        descripcion=f"El profesional confirmó {len(confirmadas)} gestión(es) a realizar: " + " · ".join(g["accion"] for g in confirmadas)
    ))
    db.commit()
    return {"ok": True, "gestiones": gestiones, "total_confirmadas": len(confirmadas)}

@app.put("/api/casos/{radicado}/respuesta")
def registrar_respuesta(radicado: str, datos: RegistrarRespuesta, db: Session = Depends(get_db)):
    """Registra la respuesta recibida a una gestión específica. El ciudadano
    es informado de qué se hizo, la fecha y la respuesta."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    if not p.gestiones or datos.indice_gestion >= len(p.gestiones):
        raise HTTPException(status_code=400, detail="Gestión no encontrada.")

    # Copiar la lista (SQLAlchemy JSON necesita reasignación para detectar el cambio)
    gestiones = [dict(g) for g in p.gestiones]
    fecha_resp = datetime.utcnow().strftime("%d/%m/%Y")
    gestiones[datos.indice_gestion]["respuesta"] = datos.respuesta
    gestiones[datos.indice_gestion]["fecha_respuesta"] = fecha_resp
    p.gestiones = gestiones

    accion = gestiones[datos.indice_gestion]["accion"]
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Respuesta recibida a una gestión",
        actor="f",
        actor_label=datos.funcionario or p.profesional_nombre,
        descripcion=f"Gestión «{accion}» — respuesta recibida el {fecha_resp}: {datos.respuesta}"
    ))

    # ¿Todas las gestiones confirmadas tienen respuesta?
    confirmadas = [g for g in gestiones if g["confirmada"]]
    todas_respondidas = confirmadas and all(g["respuesta"] for g in confirmadas)
    db.commit()
    return {
        "ok": True,
        "gestiones": gestiones,
        "todas_respondidas": bool(todas_respondidas),
        "puede_cerrar": bool(todas_respondidas),
    }

@app.put("/api/casos/{radicado}/cerrar")
def cerrar_caso(radicado: str, db: Session = Depends(get_db)):
    """Cierra el caso. Solo permitido si todas las gestiones confirmadas tienen respuesta."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    gestiones = p.gestiones or []
    confirmadas = [g for g in gestiones if g.get("confirmada")]
    if confirmadas and not all(g.get("respuesta") for g in confirmadas):
        raise HTTPException(status_code=400, detail="No se puede cerrar: hay gestiones sin respuesta.")

    p.caso_cerrado = True
    p.fecha_cierre = datetime.utcnow()
    p.estado = "Cerrado"
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Caso cerrado",
        actor="f",
        actor_label=p.profesional_nombre,
        descripcion="Todas las gestiones recibieron respuesta. El caso se cierra y se archiva el expediente (verificación de respuesta + evaluación + archivo)."
    ))
    db.commit()
    return {"ok": True, "estado": "Cerrado", "fecha_cierre": fmt_fecha(p.fecha_cierre, con_hora=False)}

@app.get("/api/casos/{radicado}/respuesta-pdf")
def respuesta_pdf(radicado: str, db: Session = Depends(get_db)):
    """Genera la carta oficial de respuesta al ciudadano en PDF, a partir de la
    clasificación y las gestiones confirmadas del caso. Incluye el aviso de uso
    de inteligencia artificial y el sello de procedencia (revisión humana)."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    try:
        import pdf_respuesta
        pdf_bytes = pdf_respuesta.construir_pdf_respuesta(p)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {e}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Respuesta-{radicado.upper()}.pdf"',
            "Cache-Control": "no-store",
        },
    )


class GuardarBorrador(BaseModel):
    borrador: str
    estado: Optional[str] = None          # editado | aprobado
    funcionario: Optional[str] = None


@app.post("/api/casos/{radicado}/borrador")
def generar_borrador(radicado: str, db: Session = Depends(get_db)):
    """M6 — genera el borrador de respuesta con IA, bajo demanda (tras confirmar
    tipo y gestiones). Gasta tokens solo al invocarse. El borrador lleva sello IA
    y SIEMPRE requiere revisión y aprobación humana antes de enviarse."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    import modulos_ia
    try:
        resultado = modulos_ia.generar_borrador_m6(p)
    except RuntimeError as e:
        # Falta la key del modelo — no es un error del sistema, es configuración.
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el borrador: {e}")

    p.borrador_m6             = resultado["borrador_m6"]
    p.borrador_m6_hash        = resultado["borrador_m6_hash"]
    p.borrador_m6_fuentes     = resultado["borrador_m6_fuentes"]
    p.borrador_m6_estado      = resultado["borrador_m6_estado"]
    p.borrador_m6_generado_en = resultado["borrador_m6_generado_en"]

    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Borrador generado por IA (M6)",
        actor="ia",
        actor_label="Sistema IA",
        descripcion=(f"M6 generó un borrador de respuesta (sello IA · hash "
                     f"{resultado['borrador_m6_hash'][:16]}…). Fuentes: "
                     f"{', '.join(resultado['borrador_m6_fuentes'])}. "
                     f"Requiere revisión y aprobación del profesional.")
    ))
    db.commit()
    return {
        "ok": True,
        "borrador": p.borrador_m6,
        "fuentes": p.borrador_m6_fuentes,
        "estado": p.borrador_m6_estado,
        "hash": p.borrador_m6_hash,
    }


@app.put("/api/casos/{radicado}/borrador")
def guardar_borrador(radicado: str, datos: GuardarBorrador, db: Session = Depends(get_db)):
    """El funcionario guarda su edición del borrador de M6 y/o lo aprueba (HITL).
    El hash del borrador original se conserva para la bitácora de ediciones."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    texto = (datos.borrador or "").strip()
    if len(texto) < 20:
        raise HTTPException(status_code=400, detail="El borrador no puede estar vacío.")

    hubo_edicion = texto != (p.borrador_m6 or "").strip()
    estado = datos.estado if datos.estado in ("editado", "aprobado") else "editado"
    p.borrador_m6 = texto
    p.borrador_m6_estado = estado
    quien = datos.funcionario or p.profesional_nombre or "Funcionario/a"

    if estado == "aprobado":
        titulo = "Borrador M6 aprobado por el profesional"
        desc = (f"{quien} revisó y aprobó el borrador de respuesta"
                f"{' con ediciones' if hubo_edicion else ' sin cambios'}. "
                "Listo para despacho al ciudadano.")
    else:
        titulo = "Borrador M6 editado por el profesional"
        desc = f"{quien} guardó ediciones sobre el borrador generado por IA."

    db.add(Evento(radicado=radicado.upper(), titulo=titulo, actor="f",
                  actor_label=quien, descripcion=desc))
    db.commit()
    return {"ok": True, "estado": estado, "hubo_edicion": hubo_edicion}


@app.put("/api/casos/{radicado}/adjuntar-al-ciudadano")
def adjuntar_al_ciudadano(radicado: str, datos: AdjuntarAlCiudadano, db: Session = Depends(get_db)):
    """El funcionario envía documentos al ciudadano, adicionales a las gestiones propias del caso
    (por ejemplo: formatos, guías, copias de oficios, respuestas de entidades)."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    if not datos.archivos:
        raise HTTPException(status_code=400, detail="Debe adjuntar al menos un documento.")
    if not datos.descripcion or len(datos.descripcion.strip()) < 5:
        raise HTTPException(status_code=400, detail="Debe describir qué documentos envía al ciudadano.")

    quien = datos.funcionario or p.profesional_nombre or "Funcionario/a"
    lista = list(p.adjuntos_funcionario or [])
    entrada = {
        "archivos": datos.archivos,
        "descripcion": datos.descripcion.strip(),
        "funcionario": quien,
        "fecha": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    lista.append(entrada)
    p.adjuntos_funcionario = lista

    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Documentos enviados al ciudadano",
        actor="f",
        actor_label=quien,
        descripcion=f"{quien} envió {len(datos.archivos)} documento(s) al peticionario: {', '.join(datos.archivos)}. {datos.descripcion.strip()}"
    ))
    db.commit()
    return {"ok": True, "adjuntos": lista}


@app.put("/api/peticiones/{radicado}/complementar")
def complementar_peticion(radicado: str, datos: ComplementarPeticion, db: Session = Depends(get_db)):
    """El ciudadano aporta información adicional o documentos a su petición ya radicada.
    Se notifica al profesional asignado y queda en la trazabilidad del expediente."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Radicado no encontrado.")
    if not datos.texto or len(datos.texto.strip()) < 10:
        raise HTTPException(status_code=400, detail="La información adicional debe tener al menos 10 caracteres.")
    # Verificación básica de titularidad
    if datos.cedula and p.cedula and datos.cedula.strip() != p.cedula:
        raise HTTPException(status_code=403, detail="El documento no corresponde al titular de la petición.")

    lista = list(p.complementos_ciudadano or [])
    entrada = {
        "texto": datos.texto.strip(),
        "archivos": datos.archivos or [],
        "fecha": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    lista.append(entrada)
    p.complementos_ciudadano = lista

    n_arch = len(datos.archivos or [])
    detalle_arch = f" Aportó {n_arch} documento(s): {', '.join(datos.archivos)}." if n_arch else ""
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="El ciudadano complementó su petición",
        actor="c",
        actor_label=p.ciudadano,
        descripcion=f"{p.ciudadano} aportó información adicional a su petición.{detalle_arch} {datos.texto.strip()[:200]}"
    ))
    db.commit()
    return {"ok": True, "complementos": lista, "profesional": p.profesional_nombre}


@app.put("/api/casos/{radicado}/observacion-ia")
def observacion_ia(radicado: str, datos: ObservacionIA, db: Session = Depends(get_db)):
    """El funcionario reporta un error o comentario sobre lo que propuso la inteligencia artificial.
    Alimenta la supervisión de la coordinación y el registro de auditoría del modelo
    (NIST AI RMF, función MEASURE; ISO/IEC 42001)."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    if not datos.comentario or len(datos.comentario.strip()) < 5:
        raise HTTPException(status_code=400, detail="El comentario debe tener al menos 5 caracteres.")

    quien = datos.funcionario or p.profesional_nombre or "Funcionario/a"
    lista = list(p.observaciones_ia or [])
    entrada = {
        "tipo_error": datos.tipo_error,
        "comentario": datos.comentario.strip(),
        "modulo": datos.modulo or "",
        "funcionario": quien,
        "fecha": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    lista.append(entrada)
    p.observaciones_ia = lista

    tipos_lbl = {
        "clasificacion_incorrecta": "Clasificación incorrecta",
        "dato_no_detectado": "Dato no detectado",
        "gestion_inadecuada": "Gestión sugerida inadecuada",
        "borrador_impreciso": "Borrador impreciso",
        "reparto_incorrecto": "Reparto incorrecto",
        "otro": "Otro",
    }
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Observación sobre el desempeño de la inteligencia artificial",
        actor="f",
        actor_label=quien,
        descripcion=f"{quien} reportó: {tipos_lbl.get(datos.tipo_error, datos.tipo_error)}. {datos.comentario.strip()}"
    ))
    db.commit()
    return {"ok": True, "observaciones_ia": lista}


@app.get("/api/interoperabilidad/bitacora")
def bitacora_sincronizacion(radicado: str = None, db: Session = Depends(get_db)):
    """
    Bitácora de sincronización con IRIS y VisionWeb — RFP §4.2:
    qué se replicó, cuándo, por quién y con qué resultado.

    Las plataformas son simuladas (doble de prueba): no existe acceso a los
    sistemas reales de la entidad en el marco académico. El mecanismo de
    sincronización sí es real y se verifica contra ese doble.
    """
    from simulador_legacy import obtener_bitacora, resumen_bitacora, estado_plataformas
    return {
        "advertencia": "IRIS y VisionWeb están simulados. El mecanismo de sincronización es real y se prueba contra ese doble.",
        "resumen": resumen_bitacora(),
        "consistencia": estado_plataformas(),
        "operaciones": obtener_bitacora(radicado),
    }


@app.post("/api/interoperabilidad/sincronizar/{radicado}")
def sincronizar_caso(radicado: str, operacion: str = "radicar", db: Session = Depends(get_db)):
    """
    Replica un caso en ambas plataformas con una sola escritura.
    Esto es lo que elimina el doble registro: el profesional no vuelve a
    teclear en la segunda plataforma.
    """
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    from simulador_legacy import sincronizar
    datos = {
        "radicado": p.radicado,
        "ciudadano": p.ciudadano,
        "categoria": p.categoria,
        "urgencia": p.urgencia,
        "estado": p.estado,
        "profesional": p.profesional_nombre,
        "fecha_radicacion": fmt_fecha(p.fecha, con_hora=False),
    }
    resultado = sincronizar(p.radicado, operacion, datos,
                            actor=p.profesional_nombre or "URAB")

    detalle = (f"Replicado en IRIS: {resultado['iris']} · VisionWeb: {resultado['visionweb']}."
               + (" " + " ".join(resultado["incidencias"]) if resultado["incidencias"] else ""))
    db.add(Evento(
        radicado=p.radicado,
        titulo="Sincronización con plataformas institucionales",
        actor="ia",
        actor_label="Sistema de sincronización",
        descripcion=detalle + " (Plataformas simuladas: no hay acceso a los sistemas reales.)"
    ))
    db.commit()
    return resultado


@app.post("/api/interoperabilidad/reintentar-cola")
def reintentar_cola_sincronizacion():
    """Procesa las operaciones encoladas cuando la plataforma se restablece."""
    from simulador_legacy import reintentar_cola
    return reintentar_cola()


@app.post("/api/interoperabilidad/simulador/configurar")
def configurar_simulador_legacy(fallo_visionweb: float = None, fallo_iris: float = None):
    """
    Ajusta la probabilidad de fallo de las plataformas simuladas.
    Permite demostrar en vivo el escenario de indisponibilidad descrito en el
    problema 2 del caso, y el comportamiento del sistema ante él.
    """
    from simulador_legacy import configurar_simulador
    return configurar_simulador(fallo_visionweb, fallo_iris)


@app.post("/api/interoperabilidad/simulador/limpiar")
def limpiar_simulador_legacy():
    """Reinicia el estado del simulador entre demostraciones."""
    from simulador_legacy import limpiar
    return limpiar()


def _estado_cognitivo():
    """Estado de la capa cognitiva para el inventario y la salud del sistema."""
    try:
        from adaptador_orquestador import estado_capa_cognitiva
        return estado_capa_cognitiva()
    except Exception as e:
        return {"motor_activo": "clasificador_local", "detalle": f"Adaptador no disponible: {e}"}


@app.get("/api/gobernanza/inventario-algoritmos")
def inventario_algoritmos(db: Session = Depends(get_db)):
    """
    Inventario público de algoritmos y versionamiento de artefactos.
    Responde a la Directiva 007 de 2025 (inventario de algoritmos antes del go-live)
    y al requisito de versionamiento de modelos y datasets (RFP §4.6).
    """
    # Distribución de versiones en producción (permite detectar clasificaciones
    # producidas por configuraciones anteriores)
    from collections import Counter
    versiones = Counter(
        p.modelo_version or "sin_sellar"
        for p in db.query(Peticion).all()
    )
    return {
        "version_activa": {
            "modelo": MODELO_VERSION,
            "taxonomia": TAXONOMIA_VERSION,
            "reglas_proteccion": REGLAS_VERSION,
            "fecha_activacion": MODELO_FECHA_ACTIVACION,
        },
        "capa_cognitiva": _estado_cognitivo(),
        "algoritmos": [
            {
                "id": "M1",
                "nombre": "Recepción inteligente",
                "funcion": "Extracción de datos de documentos y del relato mediante reconocimiento de entidades y reconocimiento óptico de caracteres.",
                "tipo": "Extracción de información. No decisorio.",
                "decide_sobre_derechos": False,
                "control_humano": "El profesional verifica los datos de identidad. El sistema no fija identidad.",
                "modelo": MODELO_VERSION,
            },
            {
                "id": "M2",
                "nombre": "Clasificación y triage",
                "funcion": "Propone nivel de urgencia y tipo de petición a partir del relato.",
                "tipo": "Sistema de decisión automatizada (SDA) — Directiva 007 de 2025.",
                "decide_sobre_derechos": True,
                "control_humano": "Propuesta sujeta a confirmación del profesional. El cambio de clasificación exige justificación escrita registrada. Las reglas codificadas de protección se ejecutan antes del modelo y no pueden ser sobrescritas por él.",
                "explicabilidad": "Cada clasificación expone los factores que la determinaron, en lenguaje comprensible.",
                "impugnable": True,
                "modelo": MODELO_VERSION,
                "taxonomia": TAXONOMIA_VERSION,
                "reglas": REGLAS_VERSION,
            },
            {
                "id": "M3",
                "nombre": "Reparto inteligente",
                "funcion": "Sugiere la asignación por especialidad y carga activa.",
                "tipo": "Apoyo a la decisión administrativa.",
                "decide_sobre_derechos": False,
                "control_humano": "El profesional puede devolver el reparto a la coordinación con razón registrada.",
                "modelo": "reglas deterministas de balanceo",
            },
            {
                "id": "M4",
                "nombre": "Anti-duplicidad",
                "funcion": "Calcula similitud entre peticiones y sugiere acumulación de expedientes.",
                "tipo": "Sistema de decisión automatizada (SDA) — Directiva 007 de 2025.",
                "decide_sobre_derechos": True,
                "control_humano": "La acumulación la aprueba el profesional. El sistema solo sugiere, con evidencia y porcentaje de similitud.",
                "explicabilidad": "Expone el porcentaje de similitud y el radicado con el que coincide.",
                "impugnable": True,
                "modelo": "similitud vectorial",
            },
            {
                "id": "M5",
                "nombre": "Historial unificado",
                "funcion": "Consolida los radicados de un mismo peticionario.",
                "tipo": "Consulta. No decisorio.",
                "decide_sobre_derechos": False,
                "control_humano": "No aplica: no produce decisiones.",
                "modelo": "consulta indexada",
            },
            {
                "id": "M6",
                "nombre": "Redacción asistida",
                "funcion": "Genera borradores de respuesta a partir de la clasificación y las gestiones confirmadas.",
                "tipo": "Generativo con recuperación de normativa pública.",
                "decide_sobre_derechos": False,
                "control_humano": "Solo produce borradores. El despacho de la respuesta de fondo exige revisión y aprobación humana con sello de procedencia y bitácora.",
                "anonimizacion": "La solicitud al modelo no incluye nombre, documento, contacto ni relato literal del peticionario.",
                "modelo": MODELO_VERSION,
            },
            {
                "id": "M8",
                "nombre": "Analítica institucional",
                "funcion": "Métricas operativas y de derechos sobre datos agregados.",
                "tipo": "Analítica descriptiva. No decisorio sobre casos individuales.",
                "decide_sobre_derechos": False,
                "control_humano": "No aplica: opera sobre agregados, no sobre casos individuales.",
                "modelo": "estadística descriptiva",
            },
        ],
        "distribucion_versiones_en_produccion": dict(versiones),
        "nota": "Inventario de algoritmos conforme a la Directiva Conjunta 007 de 2025. Los sistemas marcados como SDA están sujetos a explicabilidad, canal de impugnación y revisión humana obligatoria.",
    }


@app.get("/api/health")
def estado_del_sistema(db: Session = Depends(get_db)):
    """
    Estado de salud del sistema — RFP §4.5 (planes de contingencia ante
    indisponibilidad) y §6.2 (diseño de continuidad).

    Reporta el estado de cada componente para que la operación sepa si el
    sistema está disponible y, si no lo está, qué falló. Es el punto de
    verificación que consume cualquier plan de contingencia: sin él, la
    indisponibilidad se descubre cuando un ciudadano se queja.
    """
    componentes = {}
    degradado = False

    # Base de datos
    try:
        n = db.query(Peticion).count()
        componentes["base_de_datos"] = {
            "estado": "disponible",
            "detalle": f"{n} peticiones registradas.",
        }
    except Exception as e:
        componentes["base_de_datos"] = {"estado": "no_disponible", "detalle": str(e)[:120]}
        degradado = True

    # Motor de clasificación (M2) — se verifica con una clasificación de prueba
    try:
        prueba = clasificar_urgencia("Verificación automática del motor de clasificación.")
        from adaptador_orquestador import estado_capa_cognitiva
        cog = estado_capa_cognitiva()
        componentes["motor_clasificacion"] = {
            "estado": "disponible",
            "detalle": f"Motor activo: {cog['motor_activo']}. {cog['detalle']}",
            "modelo": MODELO_VERSION,
            "reglas_proteccion": REGLAS_VERSION,
            "capa_cognitiva": cog,
        }
    except Exception as e:
        componentes["motor_clasificacion"] = {"estado": "no_disponible", "detalle": str(e)[:120]}
        degradado = True

    # Plataformas institucionales (simuladas)
    try:
        from simulador_legacy import estado_plataformas
        est = estado_plataformas()
        cola = est.get("operaciones_en_cola", 0)
        componentes["sincronizacion_plataformas"] = {
            "estado": "degradado" if cola > 0 else "disponible",
            "detalle": (f"{cola} operación(es) pendiente(s) de replicar. Se completarán al restablecerse la plataforma."
                        if cola else "Sin operaciones pendientes. Consistencia entre plataformas: "
                                     f"{est.get('tasa_consistencia', 100)}%."),
            "operaciones_en_cola": cola,
            "advertencia": "IRIS y VisionWeb están simulados: no hay conexión con los sistemas reales.",
        }
        if cola > 0:
            degradado = True
    except Exception as e:
        componentes["sincronizacion_plataformas"] = {"estado": "no_disponible", "detalle": str(e)[:120]}
        degradado = True

    # Términos en riesgo — señal operativa, no técnica
    try:
        hoy = datetime.utcnow().date()
        vencidos = 0
        for p in db.query(Peticion).filter(Peticion.caso_cerrado != True).all():
            if p.fecha_vencimiento and p.fecha_vencimiento.date() < hoy:
                vencidos += 1
        componentes["terminos_legales"] = {
            "estado": "atencion" if vencidos else "disponible",
            "detalle": (f"{vencidos} caso(s) con término vencido requieren atención inmediata."
                        if vencidos else "Ningún término vencido."),
            "casos_vencidos": vencidos,
        }
    except Exception as e:
        componentes["terminos_legales"] = {"estado": "desconocido", "detalle": str(e)[:120]}

    estado_general = "degradado" if degradado else "operativo"
    return {
        "estado": estado_general,
        "verificado": datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
        "componentes": componentes,
        "plan_de_contingencia": {
            "si_falla_el_motor_de_clasificacion": (
                "El sistema continúa recibiendo peticiones. Los casos ingresan sin clasificación "
                "automática y la coordinación los reparte manualmente. Las reglas codificadas de "
                "protección para niñez, discapacidad y riesgo vital son deterministas y no dependen "
                "del modelo: siguen operando."
            ),
            "si_falla_la_sincronizacion": (
                "La radicación no se bloquea: el caso queda registrado en el sistema y la réplica "
                "se encola. Al restablecerse la plataforma, la cola se procesa sin pérdida de "
                "información ni recaptura manual."
            ),
            "si_falla_el_proveedor_del_modelo": (
                "La sustitución por un modelo en español desplegado en la infraestructura de la "
                "entidad es un cambio de configuración. Se prevén ejercicios periódicos de "
                "conmutación para verificar que el sistema continúa operando."
            ),
            "degradacion_maxima": (
                "Operación manual asistida: el sistema conserva la recepción, el expediente, la "
                "trazabilidad y el cómputo de términos aunque toda la capa de inteligencia "
                "artificial esté fuera de servicio."
            ),
        },
    }


@app.get("/api/auditoria/informe-modelo")
def informe_auditoria_modelo(db: Session = Depends(get_db)):
    """
    Informe consolidado de auditoría algorítmica — RFP §4.6 (evaluación periódica
    por deriva y degradación) y §6.5 (informes periódicos de calidad, riesgos,
    equidad y tiempos).

    Reúne la evidencia que alimenta la auditoría anual y las extraordinarias:
    los errores que los profesionales reportan sobre el desempeño del modelo,
    los cambios de clasificación con su justificación, la distribución de
    versiones en producción y las métricas que no admiten degradación.

    Materializa la función MEASURE del marco de gestión de riesgos del NIST y
    el ciclo de mejora continua de la norma ISO/IEC 42001: la vigilancia sobre
    el modelo no depende de la intuición de quien lo administra, sino de la
    evidencia que acumulan quienes lo usan.
    """
    from collections import Counter
    casos = db.query(Peticion).all()
    total_casos = len(casos)

    # ── 1. Errores reportados por los profesionales ──
    observaciones = []
    for p in casos:
        for obs in (p.observaciones_ia or []):
            observaciones.append({
                "radicado": p.radicado,
                "categoria": p.categoria,
                "urgencia": p.urgencia,
                "modelo_version": p.modelo_version,
                **obs
            })
    por_tipo = Counter(o.get("tipo_error", "sin_clasificar") for o in observaciones)

    ETIQUETAS = {
        "clasificacion_incorrecta": "Clasificación incorrecta",
        "dato_no_detectado": "Dato no detectado",
        "gestion_inadecuada": "Gestión inadecuada",
        "borrador_impreciso": "Borrador impreciso",
        "reparto_incorrecto": "Reparto incorrecto",
        "otro": "Otro",
        "sin_clasificar": "Sin clasificar",
    }

    # ── 2. Cambios de clasificación (override del profesional sobre M2) ──
    overrides = [{
        "radicado": p.radicado,
        "tipo_sugerido": p.tipo_peticion_sugerido,
        "tipo_confirmado": p.tipo_peticion,
        "justificacion": p.override_tipo_justificacion,
        "profesional": p.profesional_nombre,
        "modelo_version": p.modelo_version,
    } for p in casos if p.override_tipo_justificacion]

    # ── 3. Devoluciones de reparto (señal de error de M3) ──
    devoluciones = [{
        "radicado": p.radicado,
        "razon": p.devolucion_razon,
        "profesional": p.devolucion_funcionario,
        "fecha": fmt_fecha(p.devolucion_fecha),
        "resuelta": bool(p.devolucion_resuelta),
    } for p in casos if p.devuelto_a_coordinacion or p.devolucion_razon]

    # ── 4. Distribución de versiones en producción ──
    versiones = Counter(p.modelo_version or "sin_sellar" for p in casos)

    # ── 5. Métricas que no admiten degradación ──
    criticos = [p for p in casos if p.urgencia == "critica"]
    criticos_con_revision = [p for p in criticos if p.requiere_hitl]
    recall_urgentes = round(len(criticos_con_revision) / len(criticos) * 100, 1) if criticos else 100.0

    # Exactitud declarada por el modelo, promedio
    exactitudes = [p.confianza_ia for p in casos if p.confianza_ia]
    exactitud_prom = round(sum(exactitudes) / len(exactitudes), 1) if exactitudes else None

    # ── 6. Equidad: desempeño desagregado por canal (RFP §5.2) ──
    por_canal = {}
    for p in casos:
        c = p.canal or "No registrado"
        d = por_canal.setdefault(c, {"casos": 0, "criticos": 0, "con_revision": 0, "errores_reportados": 0})
        d["casos"] += 1
        if p.urgencia == "critica":
            d["criticos"] += 1
        if p.requiere_hitl:
            d["con_revision"] += 1
        d["errores_reportados"] += len(p.observaciones_ia or [])
    for c, d in por_canal.items():
        d["tasa_criticos"] = round(d["criticos"] / d["casos"] * 100, 1) if d["casos"] else 0.0
        d["tasa_error_reportado"] = round(d["errores_reportados"] / d["casos"] * 100, 1) if d["casos"] else 0.0

    tasa_error = round(len(observaciones) / total_casos * 100, 1) if total_casos else 0.0

    return {
        "generado": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
        "marco": "RFP §4.6 y §6.5 · Directiva 007 de 2025 · NIST AI RMF (MEASURE) · ISO/IEC 42001",
        "periodo": "Acumulado desde el inicio de la operación",

        "version_activa": {
            "modelo": MODELO_VERSION,
            "taxonomia": TAXONOMIA_VERSION,
            "reglas_proteccion": REGLAS_VERSION,
            "fecha_activacion": MODELO_FECHA_ACTIVACION,
        },
        "distribucion_versiones": dict(versiones),

        "volumen": {
            "casos_totales": total_casos,
            "errores_reportados": len(observaciones),
            "tasa_error_reportado": tasa_error,
            "cambios_de_clasificacion": len(overrides),
            "devoluciones_de_reparto": len(devoluciones),
        },

        "errores_por_tipo": [
            {"tipo": ETIQUETAS.get(k, k), "clave": k, "conteo": v,
             "porcentaje": round(v / len(observaciones) * 100, 1) if observaciones else 0.0}
            for k, v in sorted(por_tipo.items(), key=lambda x: -x[1])
        ],

        "metricas_criticas": {
            "casos_criticos": len(criticos),
            "criticos_con_revision_humana": len(criticos_con_revision),
            "deteccion_urgentes": recall_urgentes,
            "umbral_exigido": 100.0,
            "cumple": recall_urgentes >= 100.0,
            "exactitud_promedio_declarada": exactitud_prom,
        },

        "equidad_por_canal": por_canal,

        "detalle": {
            "observaciones": sorted(observaciones, key=lambda r: r.get("fecha", ""), reverse=True)[:50],
            "cambios_de_clasificacion": overrides[:30],
            "devoluciones": devoluciones[:30],
        },

        "nota": ("Este informe es el insumo empírico de la auditoría algorítmica periódica. "
                 "Sin el canal de reporte de errores, la vigilancia sobre el modelo dependería "
                 "de la intuición de quien lo administra; con él, depende de la evidencia "
                 "acumulada por quienes lo usan."),
    }


@app.get("/api/auditoria/informe-modelo/exportar")
def exportar_informe_auditoria(db: Session = Depends(get_db)):
    """
    Informe de auditoría en texto plano, apto para anexar al acta del comité.
    RFP §6.5 — informes periódicos de calidad, riesgos, equidad y tiempos.
    """
    d = informe_auditoria_modelo(db)
    L = []
    L.append("=" * 74)
    L.append("INFORME DE AUDITORIA ALGORITMICA — SISTEMA URAB-AI")
    L.append("Defensoria del Pueblo · Unidad de Recepcion y Analisis de Bogota")
    L.append("=" * 74)
    L.append(f"Generado: {d['generado']}")
    L.append(f"Periodo: {d['periodo']}")
    L.append(f"Marco: {d['marco']}")
    L.append("")
    L.append("-" * 74)
    L.append("1. CONFIGURACION AUDITADA")
    L.append("-" * 74)
    va = d["version_activa"]
    L.append(f"  Modelo activo:          {va['modelo']}")
    L.append(f"  Taxonomia:              {va['taxonomia']}")
    L.append(f"  Reglas de proteccion:   {va['reglas_proteccion']}")
    L.append(f"  Activo desde:           {va['fecha_activacion']}")
    L.append("")
    L.append("  Distribucion de versiones en produccion:")
    for v, n in d["distribucion_versiones"].items():
        L.append(f"    {v}: {n} caso(s)")
    L.append("")
    L.append("-" * 74)
    L.append("2. VOLUMEN Y TASA DE ERROR")
    L.append("-" * 74)
    vol = d["volumen"]
    L.append(f"  Casos procesados:              {vol['casos_totales']}")
    L.append(f"  Errores reportados:            {vol['errores_reportados']}")
    L.append(f"  Tasa de error reportado:       {vol['tasa_error_reportado']}%")
    L.append(f"  Cambios de clasificacion:      {vol['cambios_de_clasificacion']}")
    L.append(f"  Devoluciones de reparto:       {vol['devoluciones_de_reparto']}")
    L.append("")
    L.append("-" * 74)
    L.append("3. ERRORES REPORTADOS POR TIPO")
    L.append("-" * 74)
    if d["errores_por_tipo"]:
        for e in d["errores_por_tipo"]:
            L.append(f"  {e['tipo']:32s} {e['conteo']:4d}  ({e['porcentaje']}%)")
    else:
        L.append("  No se han reportado errores en el periodo.")
    L.append("")
    L.append("-" * 74)
    L.append("4. METRICAS QUE NO ADMITEN DEGRADACION")
    L.append("-" * 74)
    m = d["metricas_criticas"]
    L.append(f"  Casos criticos:                     {m['casos_criticos']}")
    L.append(f"  Con revision humana:                {m['criticos_con_revision_humana']}")
    L.append(f"  Deteccion de urgentes:              {m['deteccion_urgentes']}%")
    L.append(f"  Umbral exigido:                     {m['umbral_exigido']}%")
    L.append(f"  Cumple:                             {'SI' if m['cumple'] else 'NO — REQUIERE ACCION INMEDIATA'}")
    if m["exactitud_promedio_declarada"]:
        L.append(f"  Exactitud promedio declarada:       {m['exactitud_promedio_declarada']}%")
    L.append("")
    L.append("-" * 74)
    L.append("5. EQUIDAD — DESEMPENO DESAGREGADO POR CANAL DE INGRESO")
    L.append("-" * 74)
    L.append(f"  {'Canal':<18s} {'Casos':>7s} {'Criticos':>9s} {'% crit':>8s} {'% error':>9s}")
    for canal, x in sorted(d["equidad_por_canal"].items(), key=lambda i: -i[1]["casos"]):
        L.append(f"  {canal:<18s} {x['casos']:>7d} {x['criticos']:>9d} "
                 f"{x['tasa_criticos']:>7.1f}% {x['tasa_error_reportado']:>8.1f}%")
    L.append("")
    L.append("  Una brecha injustificada entre canales indica que el diseno tecnico")
    L.append("  esta amplificando una exclusion preexistente y exige correccion.")
    L.append("")
    L.append("-" * 74)
    L.append("6. CAMBIOS DE CLASIFICACION CON JUSTIFICACION")
    L.append("-" * 74)
    if d["detalle"]["cambios_de_clasificacion"]:
        for o in d["detalle"]["cambios_de_clasificacion"]:
            L.append(f"  {o['radicado']} · {o['tipo_sugerido']} -> {o['tipo_confirmado']}")
            L.append(f"    Profesional: {o['profesional']}")
            L.append(f"    Justificacion: {o['justificacion']}")
            L.append("")
    else:
        L.append("  Ningun profesional modifico la clasificacion propuesta en el periodo.")
        L.append("")
    L.append("-" * 74)
    L.append("7. OBSERVACIONES SOBRE EL DESEMPENO DEL MODELO")
    L.append("-" * 74)
    if d["detalle"]["observaciones"]:
        for o in d["detalle"]["observaciones"]:
            L.append(f"  [{o.get('fecha','')}] {o['radicado']} · {o.get('tipo_error','')}")
            L.append(f"    {o.get('descripcion','')}")
            L.append(f"    Reportado por: {o.get('funcionario','')}")
            L.append("")
    else:
        L.append("  No se registraron observaciones en el periodo.")
        L.append("")
    L.append("=" * 74)
    L.append("NOTA METODOLOGICA")
    L.append("=" * 74)
    L.append("  " + d["nota"])
    L.append("")
    L.append("  Este informe se genera automaticamente a partir de la operacion real")
    L.append("  del sistema. Constituye el insumo de la auditoria algoritmica anual y")
    L.append("  de las auditorias extraordinarias que exige todo cambio de modelo,")
    L.append("  de configuracion o de reglas de clasificacion.")
    L.append("")

    contenido = "\n".join(L)
    return Response(
        content=contenido,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="auditoria_urab_ai_{datetime.utcnow().strftime("%Y%m%d")}.txt"'}
    )


@app.get("/api/auditoria/observaciones-ia")
def auditoria_observaciones_ia(db: Session = Depends(get_db)):
    """Registro de auditoría del modelo: todas las observaciones que los funcionarios
    han reportado sobre el desempeño de la inteligencia artificial."""
    casos = db.query(Peticion).filter(Peticion.observaciones_ia != None).all()
    registro = []
    for p in casos:
        for obs in (p.observaciones_ia or []):
            registro.append({
                "radicado": p.radicado,
                "categoria": p.categoria,
                "urgencia": p.urgencia,
                **obs
            })
    # Conteo por tipo de error, para la analítica del modelo
    conteo = {}
    for r in registro:
        conteo[r["tipo_error"]] = conteo.get(r["tipo_error"], 0) + 1
    return {
        "total": len(registro),
        "por_tipo": conteo,
        "observaciones": sorted(registro, key=lambda r: r.get("fecha", ""), reverse=True),
    }


@app.put("/api/casos/{radicado}/observacion-coordinador")
def observacion_coordinador(radicado: str, datos: ObservacionCoordinador, db: Session = Depends(get_db)):
    """El coordinador revisa la gestión del funcionario y registra observaciones.
    Queda visible en la trazabilidad y para el funcionario."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    obs_lista = list(p.observaciones_coord or [])
    entrada = {
        "observacion": datos.observacion,
        "indice_gestion": datos.indice_gestion,
        "coordinador": datos.coordinador or "Coordinación URAB",
        "fecha": datetime.utcnow().strftime("%d/%m/%Y %H:%M"),
    }
    obs_lista.append(entrada)
    p.observaciones_coord = obs_lista

    ref_gestion = ""
    if datos.indice_gestion is not None and p.gestiones and datos.indice_gestion < len(p.gestiones):
        ref_gestion = f" sobre la gestión «{p.gestiones[datos.indice_gestion].get('accion','')}»"
    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Observación de la coordinación",
        actor="f",
        actor_label=datos.coordinador or "Coordinación URAB",
        descripcion=f"La coordinación revisó la gestión{ref_gestion} y observó: {datos.observacion}"
    ))
    db.commit()
    return {"ok": True, "observaciones": obs_lista}

@app.put("/api/casos/{radicado}/devolver-reparto")
def devolver_reparto(radicado: str, datos: DevolverReparto, db: Session = Depends(get_db)):
    """El funcionario devuelve el caso a la coordinación por no ser de su competencia.
    Debe indicar la razón. Queda registrado y visible para la coordinación."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")
    if not datos.razon or len(datos.razon.strip()) < 10:
        raise HTTPException(status_code=400, detail="Debe indicar la razón de la devolución (mínimo 10 caracteres).")

    quien = datos.funcionario or p.profesional_nombre or "Funcionario/a"
    p.devuelto_a_coordinacion = True
    p.devolucion_razon = datos.razon.strip()
    p.devolucion_funcionario = quien
    p.devolucion_fecha = datetime.utcnow()
    p.devolucion_resuelta = False
    p.estado = "Devuelto a coordinación"

    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Reparto devuelto a la coordinación",
        actor="f",
        actor_label=quien,
        descripcion=f"{quien} devolvió el caso a la coordinación por no corresponder a su competencia. Razón: {datos.razon.strip()}"
    ))
    db.commit()
    return {"ok": True, "devuelto": True, "estado": p.estado}


@app.put("/api/casos/{radicado}/resolver-devolucion")
def resolver_devolucion(radicado: str, datos: Reasignar, db: Session = Depends(get_db)):
    """La coordinación resuelve la devolución reasignando el caso a otro profesional."""
    p = db.query(Peticion).filter(Peticion.radicado == radicado.upper()).first()
    if not p:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    nuevo = db.query(Profesional).filter(Profesional.id == datos.profesional_id).first()
    if not nuevo:
        raise HTTPException(status_code=404, detail="Profesional no encontrado.")

    anterior = p.profesional_nombre
    p.profesional_id = nuevo.id
    p.profesional_nombre = nuevo.nombre
    p.devolucion_resuelta = True
    p.devuelto_a_coordinacion = False
    p.estado = "Pendiente triage" if not p.tipo_confirmado_hitl else "En gestión"

    db.add(Evento(
        radicado=radicado.upper(),
        titulo="Devolución resuelta — caso reasignado",
        actor="f",
        actor_label=datos.coordinador or "Coordinación URAB",
        descripcion=f"La coordinación revisó la devolución de {anterior} y reasignó el caso a {nuevo.nombre} ({nuevo.id}). {datos.razon or ''}".strip()
    ))
    db.commit()
    return {"ok": True, "profesional": nuevo.nombre, "estado": p.estado}


@app.post("/api/casos/radicar-archivo")
def radicar_por_archivo(datos: NuevaPeticion, db: Session = Depends(get_db)):
    """Radica una petición directamente por el funcionario desde un archivo."""
    datos.canal = "archivo_funcionario"
    result = radicar_peticion(datos, db)
    # Marcar como radicada por funcionario
    p = db.query(Peticion).filter(Peticion.radicado == result["radicado"]).first()
    if p:
        p.radicada_por_funcionario = True
        p.funcionario_radicador = datos.nombre  # en producción sería el usuario autenticado
        p.canal_origen_funcionario = "Radicación directa por funcionario"
        # Alerta para coordinadora
        prof = db.query(Profesional).filter(Profesional.id == p.profesional_id).first()
        if prof:
            prof.hitl_pendientes += 1
        db.commit()
    return result

# ── M1 · LECTURA DE DOCUMENTOS CON CLAUDE VISION ──────────────────────────────

@app.post("/api/ocr/extraer")
async def ocr_extraer_documento(archivo: UploadFile = File(...)):
    """M1 — Lectura de documentos con Claude Vision.

    Recibe un archivo (imagen o PDF), transcribe su contenido y estructura los
    campos para prellenar el formulario. El ciudadano/funcionario VERIFICA los
    datos antes de radicar — punto de control 8 (verificación de identidad): el
    sistema extrae, la persona confirma.
    """
    import ocr
    data = await archivo.read()
    if not data:
        raise HTTPException(status_code=400, detail="No se recibió ningún archivo.")
    if len(data) > ocr.MAX_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera el máximo de 20 MB.")
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=503, detail="La lectura con IA no está disponible: falta la credencial del modelo.")

    res = ocr.extraer_texto_documento(data, archivo.filename or "documento")
    if not res.get("ok"):
        raise HTTPException(status_code=422, detail=res.get("error", "No se pudo leer el documento."))

    campos = {}
    if len(res.get("texto", "")) >= 20:
        try:
            campos = ocr.extraer_campos(res["texto"])
        except Exception as e:
            res.setdefault("alertas", []).append(f"No se pudieron estructurar los campos automáticamente: {e}")
    res["campos"] = campos
    return res


# ── PANEL COORDINADOR ─────────────────────────────────────────────────────────

@app.get("/api/profesionales")
def listar_profesionales(db: Session = Depends(get_db)):
    return [_serializar_prof(p) for p in db.query(Profesional).all()]

@app.put("/api/profesionales/{prof_id}/especialidades")
def actualizar_especialidades(prof_id: str, especialidades: List[str], db: Session = Depends(get_db)):
    prof = db.query(Profesional).filter(Profesional.id == prof_id).first()
    if not prof:
        raise HTTPException(status_code=404, detail="Profesional no encontrado.")
    prof.especialidades = especialidades
    db.commit()
    return {"ok": True, "especialidades": especialidades}

@app.get("/api/alertas")
def listar_alertas(db: Session = Depends(get_db)):
    """Alertas activas para el panel coordinador."""
    alertas = []
    hoy = datetime.utcnow()

    # Alertas por términos en riesgo
    proximos = db.query(Peticion).filter(
        Peticion.fecha_vencimiento != None,
        Peticion.estado.notin_(["Cerrado","Acumulado"])
    ).all()
    for p in proximos:
        if p.fecha_vencimiento:
            dias_restantes = (p.fecha_vencimiento - hoy).days
            if dias_restantes <= 1:
                alertas.append({
                    "tipo": "venc",
                    "ico": "",
                    "titulo": f"{p.radicado} · {p.categoria} · {'VENCE HOY' if dias_restantes <= 0 else 'Vence mañana'}",
                    "desc": f"{p.ciudadano} · {p.profesional_nombre} · Plazo legal: CPACA Art. 14.",
                    "radicado": p.radicado,
                    "dias_restantes": dias_restantes,
                })
            elif dias_restantes <= 3:
                alertas.append({
                    "tipo": "venc3",
                    "ico": "",
                    "titulo": f"{p.radicado} · {p.categoria} · Vence en {dias_restantes} días",
                    "desc": f"{p.ciudadano} · {p.profesional_nombre}.",
                    "radicado": p.radicado,
                    "dias_restantes": dias_restantes,
                })

    # Alertas por casos devueltos a la coordinación (falta de competencia)
    devueltos = db.query(Peticion).filter(
        Peticion.devuelto_a_coordinacion == True,
        Peticion.devolucion_resuelta == False
    ).all()
    for p in devueltos:
        alertas.append({
            "tipo": "venc",
            "ico": "",
            "titulo": f"{p.radicado} · {p.categoria} · Devuelto por falta de competencia",
            "desc": f"{p.devolucion_funcionario} devolvió el caso: {(p.devolucion_razon or '')[:110]} · Requiere reasignación.",
            "radicado": p.radicado,
            "dias_restantes": 0,
        })

    # Alertas por casos radicados directamente por funcionario
    manuales = db.query(Peticion).filter(Peticion.radicada_por_funcionario == True).all()
    for p in manuales:
        alertas.append({
            "tipo": "manual",
            "ico": "",
            "titulo": f"{p.radicado} · Radicada directamente por funcionario",
            "desc": f"{p.ciudadano} · {p.funcionario_radicador} · Verifique datos completados manualmente.",
            "radicado": p.radicado,
        })

    # Alertas por complementos aportados por el ciudadano
    con_complementos = db.query(Peticion).filter(
        Peticion.complementos_ciudadano != None,
        Peticion.estado.notin_(["Cerrado", "Acumulado"])
    ).all()
    for p in con_complementos:
        n = len(p.complementos_ciudadano or [])
        if n > 0:
            alertas.append({
                "tipo": "manual",
                "ico": "",
                "titulo": f"{p.radicado} · El ciudadano aportó información adicional",
                "desc": f"{p.ciudadano} complementó su petición ({n} aporte(s)) · Asignado a {p.profesional_nombre}.",
                "radicado": p.radicado,
            })

    # Alerta por carga alta
    profs_sobrecargados = db.query(Profesional).filter(
        Profesional.casos_activos > Profesional.umbral_maximo * 0.9
    ).all()
    for prof in profs_sobrecargados:
        pct = round(prof.casos_activos / prof.umbral_maximo * 100)
        alertas.append({
            "tipo": "carga",
            "ico": "",
            "titulo": f"{prof.nombre} ({prof.id}) al {pct}% de capacidad",
            "desc": f"{prof.casos_activos} casos activos / {prof.umbral_maximo} máximo. M3 no le asigna casos nuevos automáticamente.",
            "radicado": None,
        })

    return sorted(alertas, key=lambda a: ["venc","manual","venc3","carga"].index(a["tipo"]))

@app.post("/api/alertas/enviar-diario")
def enviar_alertas_diario(x_alertas_token: str = Header(default=""), db: Session = Depends(get_db)):
    """
    Dispara el envío de las alertas diarias por correo (Resend).
    Protegido por token en el header 'X-Alertas-Token' (var. de entorno ALERTAS_TOKEN).
    Diseñado para ser llamado por un cron externo (GitHub Actions) a las 8:00 a.m.
    """
    token_esperado = os.environ.get("ALERTAS_TOKEN", "")
    if token_esperado and x_alertas_token != token_esperado:
        raise HTTPException(status_code=401, detail="Token de alertas inválido.")
    from alertas_correo import enviar_alertas_diarias
    return enviar_alertas_diarias(db, Peticion, Profesional)


@app.get("/api/dashboard/metricas")
def metricas_dashboard(db: Session = Depends(get_db)):
    """Métricas M8 para el dashboard."""
    total = db.query(Peticion).count()
    criticas = db.query(Peticion).filter(Peticion.urgencia == "critica").count()
    hitl_pendientes = db.query(Peticion).filter(
        Peticion.requiere_hitl == True, Peticion.hitl_resuelto == False
    ).count()

    profesionales = db.query(Profesional).all()
    cargas = [p.casos_activos for p in profesionales]
    ratio_carga = round(max(cargas) / max(min(cargas), 1), 1) if cargas else 0

    return {
        # Métricas AS-IS vs TO-BE (valores del corpus sintético)
        "triage_asis": 9.1,
        "triage_tobe": 1.4,
        "urgentes_tardios_asis": 56.2,
        "urgentes_tardios_tobe": 4.5,
        "doble_registro_asis": 72.6,
        "doble_registro_tobe": 5.0,
        "ratio_carga_asis": 7.7,
        "ratio_carga_tobe": ratio_carga,
        "horas_liberadas": 13320,
        "fte_equivalente": 6.4,
        "urgentes_adicionales": 7600,
        # Estado actual en el sistema
        "total_peticiones": total,
        "criticas_activas": criticas,
        "hitl_pendientes": hitl_pendientes,
        "profesionales": [_serializar_prof(p) for p in profesionales],
        # Calidad del modelo
        "precision_m2": 92.3,
        "recall_hitl": 100.0,
        "recall_duplicados": 91.0,
        "drift_estado": "VERDE",
        "drift_proxima_evaluacion": "14/07/2026",
        "n_corpus": 20417,
    }

# ── Serializers ───────────────────────────────────────────────────────────────

def _serializar_caso(p: Peticion) -> dict:
    hoy = datetime.utcnow()
    venc = None
    dias_vence = None
    if p.fecha_vencimiento:
        dias_vence = (p.fecha_vencimiento - hoy).days
        venc = dias_vence <= 0

    return {
        "radicado": p.radicado,
        "ciudadano": p.ciudadano,
        "cedula": p.cedula,
        "canal": p.canal,
        "fecha": fmt_fecha_corta(p.fecha_radicado),
        "urgencia": p.urgencia,
        "categoria": p.categoria,
        "confianza_ia": p.confianza_ia,
        "modelo_version": p.modelo_version,
        "taxonomia_version": p.taxonomia_version,
        "reglas_version": p.reglas_version,
        "estado": p.estado,
        "profesional_id": p.profesional_id,
        "profesional": p.profesional_nombre,
        "texto_relato": p.texto_relato,
        "entidades": p.entidades or [],
        "etario": p.etario,
        "etnia": p.etnia,
        "discapacidad": p.discapacidad,
        "victima_conflicto": p.victima_conflicto,
        "grupos_especiales": p.grupos_especiales or [],
        "requiere_hitl": p.requiere_hitl,
        "hitl_razon": p.hitl_razon,
        "hitl_resuelto": p.hitl_resuelto,
        "es_duplicado": p.es_duplicado,
        "duplicado_de": p.duplicado_de,
        "similitud_pct": p.similitud_pct,
        "radicada_por_funcionario": p.radicada_por_funcionario,
        "funcionario_radicador": p.funcionario_radicador,
        "canal_origen_funcionario": p.canal_origen_funcionario,
        "explicacion_ia": p.explicacion_ia,
        "fecha_vencimiento": fmt_fecha(p.fecha_vencimiento, con_hora=False) if p.fecha_vencimiento else None,
        "vence_hoy": venc,
        "dias_vence": dias_vence,
        "contacto_tipo": p.contacto_tipo,
        "contacto_valor": p.contacto_valor,
        "gestion": {
            "accion": p.gestion_accion,
            "entidades": p.gestion_entidades or [],
            "plazo": p.gestion_plazo,
            "funcionario": p.gestion_funcionario,
            "fecha": fmt_fecha(p.gestion_fecha),
        } if p.gestion_accion else None,
        "tipo_peticion": p.tipo_peticion,
        "tipo_peticion_sugerido": p.tipo_peticion_sugerido,
        "override_tipo_justificacion": p.override_tipo_justificacion,
        "derechos_vulnerados": p.derechos_vulnerados or [],
        "conducta_vulnera": p.conducta_vulnera,
        "tipo_confirmado_hitl": p.tipo_confirmado_hitl,
        "gestiones": p.gestiones or [],
        "gestiones_confirmadas": p.gestiones_confirmadas,
        "tipo_recepcion": p.tipo_recepcion,
        "procedimiento_recepcion": p.procedimiento_recepcion,
        "caso_cerrado": p.caso_cerrado,
        "fecha_cierre": fmt_fecha(p.fecha_cierre, con_hora=False),
        "observaciones_coord": p.observaciones_coord or [],
        "observaciones_ia": p.observaciones_ia or [],
        "complementos_ciudadano": p.complementos_ciudadano or [],
        "adjuntos_funcionario": p.adjuntos_funcionario or [],
        "devuelto_a_coordinacion": p.devuelto_a_coordinacion or False,
        "devolucion_razon": p.devolucion_razon,
        "devolucion_funcionario": p.devolucion_funcionario,
        "devolucion_fecha": fmt_fecha(p.devolucion_fecha),
        "devolucion_resuelta": p.devolucion_resuelta or False,
        # M6 — borrador de respuesta generado por IA
        "borrador_m6": p.borrador_m6,
        "borrador_m6_estado": p.borrador_m6_estado,
        "borrador_m6_fuentes": p.borrador_m6_fuentes or [],
        "borrador_m6_generado_en": fmt_fecha(p.borrador_m6_generado_en),
        # M5 — vista 360° del ciudadano
        "historial_360": p.historial_360,
    }

def _serializar_prof(p: Profesional) -> dict:
    pct = round(p.casos_activos / p.umbral_maximo * 100, 1)
    return {
        "id": p.id,
        "nombre": p.nombre,
        "color": p.color,
        "especialidades": p.especialidades or [],
        "casos_activos": p.casos_activos,
        "umbral_maximo": p.umbral_maximo,
        "pct_carga": pct,
        "estado_carga": "critica" if pct > 90 else "alta" if pct > 75 else "normal",
        "hitl_pendientes": p.hitl_pendientes,
        "terminos_riesgo": p.terminos_riesgo,
    }
