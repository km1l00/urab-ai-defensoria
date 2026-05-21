"""
AGENTE M6 — IA Generativa de Soporte (Copilot Jurídico)
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. Genera borradores de respuesta jurídica usando RAG sobre:
     - Historial del ciudadano (output M5)
     - Clasificación del caso (output M2)
     - Plantillas institucionales de la Defensoría
  2. Auto-responde SOLO consultas simples no controversiales
     (estado del trámite, profesional asignado, reenvío de constancia)
     con reglas explícitas y bitácora
  3. Activa alertas de riesgo inminente para escalación inmediata
  4. NUNCA envía respuestas de fondo sin aprobación humana (HITL)

Meta piloto: borradores aprobados sin edición ≥ 60%
Marco legal:
  - HITL obligatorio en Art. 29 CP (trazabilidad de decisión)
  - RAG obligatorio para evitar alucinaciones jurídicas
  - Bitácora de toda respuesta automatizada (Directiva 007/2025)
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import ANTHROPIC_API_KEY, MODEL_DEFAULT

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── PLANTILLAS INSTITUCIONALES (RAG base) ────────────────────────────────────
# En producción: recuperadas de base vectorial sobre corpus institucional real
PLANTILLAS = {
    "acuse_recibo": """Estimado/a ciudadano/a:

La Defensoría del Pueblo — Unidad de Recepción y Análisis de Bogotá ha recibido
su petición con número de radicado {radicado}, relacionada con {tematica_desc}.
El caso ha sido asignado al profesional {profesional} quien dará trámite dentro
de los términos legales establecidos. Puede hacer seguimiento en nuestra plataforma
con el número de radicado indicado.

Atentamente,
Unidad de Recepción y Análisis de Bogotá — URAB
Defensoría del Pueblo""",

    "solicitud_complemento": """Estimado/a ciudadano/a:

En relación con su petición radicada con número {radicado}, le informamos que
para continuar con el trámite requerimos la siguiente información adicional:

{campos_faltantes}

Le solicitamos respetuosamente remitir esta información dentro de los 10 días
hábiles siguientes a la recepción de este mensaje. De lo contrario, el expediente
podrá ser archivado por falta de información.

Atentamente,
URAB — Defensoría del Pueblo""",

    "respuesta_asesoria_general": """Estimado/a ciudadano/a:

En atención a su solicitud de asesoría radicada con número {radicado}, le
informamos que {orientacion_juridica}

Para mayor información o si requiere acompañamiento en el proceso, puede
contactar directamente a {profesional} o acercarse a nuestras instalaciones.

Atentamente,
URAB — Defensoría del Pueblo""",

    "traslado_competencia": """Estimado/a ciudadano/a:

La Defensoría del Pueblo ha revisado su petición con radicado {radicado} y ha
determinado que el asunto planteado es competencia de {entidad_competente}.
Le recomendamos dirigirse a dicha entidad con los documentos que adjuntó a
esta petición.

La Defensoría del Pueblo continúa a su disposición para orientación adicional.

Atentamente,
URAB — Defensoría del Pueblo""",

    "alerta_urgencia": """⚠️ ALERTA DE PRIORIDAD MÁXIMA — REQUIERE ATENCIÓN INMEDIATA

Radicado: {radicado}
Motivo: {motivo_alerta}
Profesional asignado: {profesional}
Acción requerida: Contacto con el ciudadano en las próximas {tiempo_respuesta}

Este caso ha sido marcado como urgente por el sistema de triage (M2).
La respuesta automatizada no es aplicable. Requiere intervención humana inmediata.""",
}

# ── CONSULTAS SIMPLES AUTOMATIZABLES (whitelist explícita) ────────────────────
CONSULTAS_SIMPLES = {
    "estado_tramite": {
        "descripcion": "Ciudadano pregunta por el estado de su radicado",
        "respuesta_plantilla": "Su petición con radicado {radicado} se encuentra actualmente en estado '{estado}', asignada al profesional {profesional}. El tiempo estimado de respuesta es de {tiempo_respuesta}.",
        "requiere_hitl": False,
    },
    "profesional_asignado": {
        "descripcion": "Ciudadano pregunta quién maneja su caso",
        "respuesta_plantilla": "Su caso con radicado {radicado} está siendo gestionado por {profesional}. Puede comunicarse a través de los canales oficiales de la Defensoría.",
        "requiere_hitl": False,
    },
    "reenvio_constancia": {
        "descripcion": "Ciudadano pide reenvío del acuse de recibo",
        "respuesta_plantilla": "Le reenviamos la constancia de radicación de su petición {radicado} fechada el {fecha_ingreso}. Conserve este número para futuras consultas.",
        "requiere_hitl": False,
    },
}

# ── PALABRAS CLAVE DE ALERTA FORZADA ─────────────────────────────────────────
# Estas palabras activan alerta independientemente del clasificador
PALABRAS_ALERTA = {
    "riesgo_vital": [
        "me van a matar", "amenaza de muerte", "van a matarme", "riesgo de vida",
        "me están amenazando", "atentado", "sicario", "masacre", "desaparición forzada",
    ],
    "nna_peligro": [
        "menor desaparecido", "niño desaparecido", "abuso sexual menor",
        "niña abusada", "menor en peligro", "están maltratando al niño",
    ],
    "vbg_inminente": [
        "me va a matar mi pareja", "mi esposo me amenazó con un arma",
        "violencia física ahora", "me está golpeando",
    ],
}

# ── SYSTEM PROMPT M6 ─────────────────────────────────────────────────────────
SYSTEM_M6 = """Eres el Agente M6, copilot jurídico de la Defensoría del Pueblo (URAB).
Tu función es generar borradores de respuesta para que el profesional los revise y apruebe.

REGLAS ABSOLUTAS:
1. NUNCA generes una respuesta de fondo definitiva — siempre es un BORRADOR para revisión humana.
2. NUNCA inventes normas, sentencias o resoluciones. Si citas algo, que sea real y verificable.
3. Si el caso involucra riesgo vital, NNA en peligro o VBG inminente, NO generes borrador —
   genera una ALERTA DE ESCALACIÓN INMEDIATA.
4. Los borradores deben citar la fuente del RAG que los respalda (plantilla o historial).

INSTRUCCIONES DE REDACCIÓN:
- Lenguaje formal pero comprensible para el ciudadano.
- Sin jerga técnica innecesaria.
- Incluir número de radicado, profesional responsable y próximos pasos.
- Extensión máxima: 300 palabras para borradores de asesoría.

Debes llamar a la herramienta `generar_borrador_respuesta`."""

TOOL_M6 = {
    "name": "generar_borrador_respuesta",
    "description": "Genera el borrador de respuesta para revisión del profesional.",
    "input_schema": {
        "type": "object",
        "properties": {
            "tipo_respuesta": {
                "type": "string",
                "description": "Tipo de respuesta generada",
                "enum": [
                    "borrador_asesoria",
                    "borrador_queja",
                    "borrador_traslado_competencia",
                    "alerta_escalacion",
                    "no_aplica_consulta_simple"
                ]
            },
            "borrador_texto": {
                "type": "string",
                "description": "Texto del borrador listo para edición del profesional"
            },
            "fuentes_rag": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Plantillas o fragmentos del historial usados para generar el borrador"
            },
            "requiere_hitl": {
                "type": "boolean",
                "description": "Siempre True para borradores de fondo. False solo para consultas simples automatizables."
            },
            "instrucciones_al_profesional": {
                "type": "string",
                "description": "Indicaciones específicas para que el profesional edite o valide el borrador"
            },
            "alerta_riesgo": {
                "type": ["string", "null"],
                "description": "Descripción del riesgo inminente si el caso requiere escalación. null si no aplica."
            },
            "confianza_borrador": {
                "type": "number",
                "description": "Confianza del modelo en la calidad del borrador (0.0-1.0). <0.7 se señala al profesional."
            }
        },
        "required": [
            "tipo_respuesta", "borrador_texto", "fuentes_rag",
            "requiere_hitl", "instrucciones_al_profesional",
            "alerta_riesgo", "confianza_borrador"
        ]
    }
}

# ── DETECCIÓN DE ALERTA FORZADA ───────────────────────────────────────────────
def _detectar_alerta_forzada(texto: str) -> Optional[str]:
    """Escanea el texto en busca de palabras clave de riesgo inminente."""
    texto_lower = texto.lower()
    for tipo, palabras in PALABRAS_ALERTA.items():
        for palabra in palabras:
            if palabra in texto_lower:
                return tipo
    return None

# ── RESPUESTA AUTOMATIZABLE (consulta simple) ─────────────────────────────────
def _resolver_consulta_simple(
    tipo_consulta: str,
    contexto: dict
) -> Optional[dict]:
    """Genera respuesta automática para consultas de la whitelist."""
    if tipo_consulta not in CONSULTAS_SIMPLES:
        return None

    config = CONSULTAS_SIMPLES[tipo_consulta]
    texto = config["respuesta_plantilla"].format(
        radicado=contexto.get("radicado", "—"),
        estado=contexto.get("estado", "en gestión"),
        profesional=contexto.get("profesional_nombre", "profesional asignado"),
        tiempo_respuesta=contexto.get("tiempo_respuesta", "los términos legales"),
        fecha_ingreso=contexto.get("fecha_ingreso", "—"),
    )

    return {
        "tipo_respuesta":            "no_aplica_consulta_simple",
        "borrador_texto":            texto,
        "fuentes_rag":               [f"plantilla:{tipo_consulta}"],
        "requiere_hitl":             False,
        "instrucciones_al_profesional": "Respuesta automatizada. Verificar que los datos sean correctos antes de enviar.",
        "alerta_riesgo":             None,
        "confianza_borrador":        0.95,
        "auto_enviable":             True,
    }

# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def generar_borrador_m6(
    radicado: str,
    texto_peticion: str,
    contexto_m2: Optional[dict] = None,
    contexto_m5: Optional[dict] = None,
    tipo_consulta_simple: Optional[str] = None,
    profesional_nombre: str = "profesional asignado",
    tiempo_respuesta: str = "5días",
) -> dict:
    """
    Genera el borrador de respuesta para revisión del profesional.

    Args:
        radicado:              ID del caso.
        texto_peticion:        Texto original del ciudadano.
        contexto_m2:           Clasificación y triage de M2.
        contexto_m5:           Historial 360° de M5.
        tipo_consulta_simple:  Si es consulta simple de la whitelist, indica cuál.
        profesional_nombre:    Nombre del profesional asignado (output M3).
        tiempo_respuesta:      Tiempo de respuesta sugerido (output M2).

    Returns:
        dict con borrador, fuentes RAG, señal HITL y bitácora.
    """
    timestamp = datetime.now().isoformat()

    # 1. Detección de alerta forzada (hard-coded, no depende del LLM)
    alerta_tipo = _detectar_alerta_forzada(texto_peticion)
    if alerta_tipo:
        motivos = {
            "riesgo_vital":    "Riesgo vital inminente detectado en el texto de la petición",
            "nna_peligro":     "NNA (menor de edad) en situación de peligro detectada",
            "vbg_inminente":   "Violencia basada en género activa o inminente detectada",
        }
        texto_alerta = PLANTILLAS["alerta_urgencia"].format(
            radicado=radicado,
            motivo_alerta=motivos.get(alerta_tipo, "Riesgo inminente"),
            profesional=profesional_nombre,
            tiempo_respuesta="2 horas" if alerta_tipo in ["riesgo_vital", "nna_peligro"] else "4 horas",
        )
        return {
            "radicado":           radicado,
            "tipo_respuesta":     "alerta_escalacion",
            "borrador_texto":     texto_alerta,
            "requiere_hitl":      True,
            "alerta_forzada":     alerta_tipo,
            "auto_enviable":      False,
            "fuentes_rag":        ["regla_alerta_forzada"],
            "instrucciones":      "⚠️ ACCIÓN INMEDIATA REQUERIDA. No usar borrador — contactar al ciudadano de inmediato.",
            "timestamp":          timestamp,
        }

    # 2. Consulta simple (whitelist — automatizable)
    if tipo_consulta_simple:
        contexto_simple = {
            "radicado":         radicado,
            "profesional_nombre": profesional_nombre,
            "tiempo_respuesta": tiempo_respuesta,
            "estado":           "en gestión",
        }
        resultado_simple = _resolver_consulta_simple(tipo_consulta_simple, contexto_simple)
        if resultado_simple:
            resultado_simple["radicado"]   = radicado
            resultado_simple["timestamp"]  = timestamp
            resultado_simple["m6_tokens"]  = 0
            _registrar_bitacora(radicado, tipo_consulta_simple, "automatizado", timestamp)
            return resultado_simple

    # 3. Borrador con RAG (caso general)
    cl2 = contexto_m2 or {}
    cl5 = contexto_m5 or {}
    analisis5 = cl5.get("analisis") or {}

    # Seleccionar plantilla base según categoría
    categoria = cl2.get("categoria", "")
    if "asesoría" in categoria.lower():
        plantilla_base = PLANTILLAS["respuesta_asesoria_general"]
        tipo_base = "borrador_asesoria"
    elif "mediación" in categoria.lower() or "conciliación" in categoria.lower():
        plantilla_base = PLANTILLAS["acuse_recibo"]
        tipo_base = "borrador_queja"
    else:
        plantilla_base = PLANTILLAS["acuse_recibo"]
        tipo_base = "borrador_queja"

    contexto_llm = f"""
CASO A RESPONDER:
- Radicado: {radicado}
- Categoría: {cl2.get('categoria', 'no especificada')}
- Temática: {cl2.get('tematica', 'no especificada')}
- Urgencia: {cl2.get('urgencia', 'no especificada')}
- Resumen del caso (M2): {cl2.get('resumen_ejecutivo', 'no disponible')}
- Profesional asignado: {profesional_nombre}
- Tiempo de respuesta: {tiempo_respuesta}

TEXTO ORIGINAL DEL CIUDADANO:
{texto_peticion[:500]}

HISTORIAL DEL CIUDADANO (M5):
- Total radicados previos: {cl5.get('total_historial', 0)}
- Patrón de recurrencia: {analisis5.get('patron_recurrencia', 'primera_vez')}
- Alerta vulneración sistemática: {analisis5.get('alerta_vulneracion_sistematica', False)}
- Sugerencia previa M5: {analisis5.get('sugerencia_linea_respuesta', 'no disponible')}

PLANTILLA BASE DISPONIBLE (RAG):
{plantilla_base[:600]}

Genera un borrador apropiado para esta categoría y contexto.
"""

    respuesta = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=SYSTEM_M6,
        tools=[TOOL_M6],
        tool_choice={"type": "tool", "name": "generar_borrador_respuesta"},
        messages=[{"role": "user", "content": contexto_llm}]
    )

    borrador = {}
    for bloque in respuesta.content:
        if bloque.type == "tool_use":
            borrador = bloque.input
            break

    # Asegurar HITL siempre en borradores de fondo
    borrador["requiere_hitl"] = True
    borrador["auto_enviable"] = False

    _registrar_bitacora(radicado, tipo_base, "borrador_pendiente_hitl", timestamp)

    return {
        "radicado":                  radicado,
        "tipo_respuesta":            borrador.get("tipo_respuesta", tipo_base),
        "borrador_texto":            borrador.get("borrador_texto"),
        "fuentes_rag":               borrador.get("fuentes_rag", []),
        "requiere_hitl":             True,
        "auto_enviable":             False,
        "alerta_riesgo":             borrador.get("alerta_riesgo"),
        "confianza_borrador":        borrador.get("confianza_borrador", 0.0),
        "instrucciones_profesional": borrador.get("instrucciones_al_profesional"),
        "timestamp":                 timestamp,
        "m6_tokens":                 respuesta.usage.input_tokens + respuesta.usage.output_tokens,
    }


# ── BITÁCORA (Directiva 007/2025) ────────────────────────────────────────────
BITACORA_PATH = Path(__file__).parent.parent / "datos" / "bitacora_m6.jsonl"

def _registrar_bitacora(radicado: str, tipo: str, estado: str, timestamp: str):
    """Registra toda acción de M6 en bitácora JSONL (append-only)."""
    BITACORA_PATH.parent.mkdir(exist_ok=True)
    entrada = {"radicado": radicado, "tipo": tipo, "estado": estado, "timestamp": timestamp}
    with open(BITACORA_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entrada, ensure_ascii=False) + "\n")


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== TEST AGENTE M6 — Copilot Jurídico ===\n")

    # Caso 1: borrador de asesoría
    print("CASO 1 — Asesoría pensional:")
    r1 = generar_borrador_m6(
        radicado="TEST-001",
        texto_peticion="Buenos días, quisiera saber qué debo hacer para solicitar mi pensión. Tengo 62 años y no sé cuántas semanas tengo cotizadas en Colpensiones.",
        contexto_m2={
            "categoria": "Asesoría",
            "tematica": "pensiones_seguridad_social",
            "urgencia": "BAJO",
            "resumen_ejecutivo": "Ciudadano solicita orientación para iniciar trámite pensional en Colpensiones.",
        },
        profesional_nombre="Prof. 02",
        tiempo_respuesta="15días",
    )
    print(f"  Tipo: {r1['tipo_respuesta']} | HITL: {r1['requiere_hitl']} | Confianza: {r1.get('confianza_borrador', 0):.0%}")
    print(f"  Borrador:\n{r1['borrador_texto'][:300]}...\n")

    # Caso 2: alerta forzada
    print("CASO 2 — Alerta forzada (riesgo vital):")
    r2 = generar_borrador_m6(
        radicado="TEST-002",
        texto_peticion="Me van a matar, mi pareja me amenazó con un arma y no tengo a dónde ir con mis hijos.",
        profesional_nombre="Prof. 03",
        tiempo_respuesta="inmediato",
    )
    print(f"  Tipo: {r2['tipo_respuesta']} | Alerta: {r2.get('alerta_forzada')}")
    print(f"  {r2['borrador_texto'][:200]}\n")

    # Caso 3: consulta simple automatizable
    print("CASO 3 — Consulta simple (estado del trámite):")
    r3 = generar_borrador_m6(
        radicado="TEST-003",
        texto_peticion="¿En qué estado está mi petición?",
        tipo_consulta_simple="estado_tramite",
        profesional_nombre="Prof. 05",
        tiempo_respuesta="5días",
    )
    print(f"  Tipo: {r3['tipo_respuesta']} | Auto-enviable: {r3.get('auto_enviable')} | HITL: {r3['requiere_hitl']}")
    print(f"  {r3['borrador_texto']}")
