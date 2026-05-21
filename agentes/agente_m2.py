"""
AGENTE M2 — Clasificación, Triage y Priorización con XAI
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. Clasificación multiclase: Asesoría / Queja / Mediación / Conciliación
  2. Subclasificación temática granular (9 categorías)
  3. Motor de priorización con 4 niveles de urgencia (CRÍTICO→BAJO)
  4. Detección de sujetos de especial protección constitucional
  5. XAI obligatorio: justificación explícita de cada decisión
     (cumple Directiva Conjunta 007/2025 — prohibición de caja negra)
  6. Señal HITL: indica si el caso debe pasar a revisión humana inmediata

Recibe el output del Agente M1 o texto directo.
"""

import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import (
    ANTHROPIC_API_KEY, MODEL_DEFAULT, MAX_TOKENS_M2,
    UMBRAL_CONFIANZA_HITL,
)

# ── CLIENTE ──────────────────────────────────────────────────────────────────
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── REGLAS DE PRIORIZACIÓN (explícitas para XAI y auditoría) ─────────────────
REGLAS_URGENCIA = {
    "CRÍTICO": [
        "Amenaza o riesgo inminente para la vida",
        "Desaparición forzada o retención ilegal",
        "Menor de edad (NNA) en situación de peligro o abuso",
        "Violencia física activa o amenaza de muerte",
        "Privación ilegal de la libertad sin proceso",
        "Negación de atención médica de emergencia",
    ],
    "ALTO": [
        "Sujeto de especial protección: adulto mayor, persona con discapacidad, víctima de conflicto, comunidad étnica",
        "Negación de medicamento o tratamiento oncológico/crónico vital",
        "Persona privada de la libertad sin acceso a atención básica",
        "Desalojo sin proceso legal con familia y menores",
        "Migrante en situación de vulnerabilidad extrema",
        "Urgencias no atendidas con deterioro documentado de salud",
    ],
    "MEDIO": [
        "Vulneración de derechos laborales o económicos",
        "Demora en procesos pensionales o de seguridad social",
        "Conflictos de vivienda sin desalojo inminente",
        "Discriminación en trámites institucionales",
        "Incumplimiento de términos legales sin riesgo vital",
    ],
    "BAJO": [
        "Solicitud de información o asesoría general",
        "Consulta sobre estado de trámite",
        "Orientación sobre rutas institucionales",
        "Conflictos entre particulares sin riesgo vital",
    ],
}

# ── CONDICIONES HITL (siempre decide un humano) ───────────────────────────────
CONDICIONES_HITL = [
    "urgencia == CRÍTICO",
    "sujeto_especial IN [NNA, Persona con discapacidad]",
    "tematica IN [Violencia basada en género] AND urgencia IN [CRÍTICO, ALTO]",
    "indicadores de amenaza vital en el texto",
    "caso carcelario con riesgo físico reportado",
]

# ── SYSTEM PROMPT M2 ─────────────────────────────────────────────────────────
SYSTEM_M2 = f"""Eres el Agente M2 de Clasificación y Triage de la Defensoría del Pueblo de Colombia (URAB).

Recibes una petición ciudadana (o el output estructurado del Agente M1) y debes llamar a la
herramienta `clasificar_y_priorizar`. DEBES justificar cada decisión (XAI obligatorio por
Directiva Conjunta 007/2025 — prohibición de caja negra algorítmica).

TAXONOMÍA DE CATEGORÍAS DE TRÁMITE:
- Asesoría: ciudadano solicita orientación, información o guía para ejercer un derecho.
- Queja: denuncia, reclamación o reporte de vulneración de derechos ya ocurrida.
- Solicitud de mediación: pide a la Defensoría facilitar diálogo voluntario entre partes.
- Solicitud de conciliación: pide activar mecanismo formal con efectos jurídicos.

TEMÁTICAS (elige la principal):
salud | pensiones_seguridad_social | carcelario | vivienda |
violencia_basada_en_genero | infancia_adolescencia | migracion |
discapacidad | otras

NIVELES DE URGENCIA Y REGLAS:
{json.dumps(REGLAS_URGENCIA, ensure_ascii=False, indent=2)}

CONDICIONES HITL (revisión humana obligatoria):
{json.dumps(CONDICIONES_HITL, ensure_ascii=False, indent=2)}

INSTRUCCIONES XAI:
- `razonamiento_categoria`: cita la frase exacta del texto que determinó la categoría.
- `razonamiento_urgencia`: cita la regla de urgencia que aplica + frase del texto.
- `razonamiento_tematica`: explica por qué es esa temática y no otra.
- `regla_hitl_activada`: si aplica HITL, indica cuál condición se cumplió.
- `confianza`: valor entre 0.0 y 1.0 — baja confianza (<0.7) también activa revisión humana."""

# ── HERRAMIENTA M2 ────────────────────────────────────────────────────────────
TOOL_M2 = {
    "name": "clasificar_y_priorizar",
    "description": "Clasifica la petición, determina urgencia y genera trazabilidad XAI.",
    "input_schema": {
        "type": "object",
        "properties": {
            # ── Clasificación principal
            "categoria": {
                "type": "string",
                "description": "Categoría de trámite asignada",
                "enum": ["Asesoría", "Queja", "Solicitud de mediación", "Solicitud de conciliación"]
            },
            "tematica": {
                "type": "string",
                "description": "Temática principal detectada",
                "enum": [
                    "salud", "pensiones_seguridad_social", "carcelario", "vivienda",
                    "violencia_basada_en_genero", "infancia_adolescencia",
                    "migracion", "discapacidad", "otras"
                ]
            },
            "subtematica": {
                "type": ["string", "null"],
                "description": "Especificación dentro de la temática (ej: 'negación de medicamento', 'custodia de menores')"
            },
            # ── Priorización
            "urgencia": {
                "type": "string",
                "description": "Nivel de urgencia asignado por el motor de priorización",
                "enum": ["CRÍTICO", "ALTO", "MEDIO", "BAJO"]
            },
            "tiempo_respuesta_sugerido": {
                "type": "string",
                "description": "Tiempo máximo de respuesta recomendado",
                "enum": ["inmediato", "24h", "5días", "15días"]
            },
            # ── Sujetos de protección
            "sujeto_especial_confirmado": {
                "type": ["string", "null"],
                "description": "Sujeto de especial protección constitucional confirmado por M2",
                "enum": [
                    "Adulto mayor", "NNA (niño, niña, adolescente)",
                    "Persona con discapacidad", "Víctima de conflicto",
                    "Comunidad étnica", None
                ]
            },
            "alertas_proteccion": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista de alertas de protección especial detectadas"
            },
            # ── XAI — Explicabilidad obligatoria
            "razonamiento_categoria": {
                "type": "string",
                "description": "Justificación de la categoría asignada, con cita del texto"
            },
            "razonamiento_urgencia": {
                "type": "string",
                "description": "Regla de urgencia aplicada + evidencia textual"
            },
            "razonamiento_tematica": {
                "type": "string",
                "description": "Por qué esta temática y no otra"
            },
            # ── HITL
            "requiere_hitl": {
                "type": "boolean",
                "description": "True si el caso debe pasar a revisión humana inmediata"
            },
            "regla_hitl_activada": {
                "type": ["string", "null"],
                "description": "Condición HITL que se cumplió. null si no aplica."
            },
            # ── Calidad
            "confianza": {
                "type": "number",
                "description": "Confianza del modelo en la clasificación (0.0 - 1.0). <0.7 activa HITL."
            },
            "resumen_ejecutivo": {
                "type": "string",
                "description": "Resumen de 2 oraciones para el profesional asignado"
            },
            "palabras_clave_urgencia": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Términos del texto que activaron la priorización de urgencia"
            }
        },
        "required": [
            "categoria", "tematica", "urgencia", "tiempo_respuesta_sugerido",
            "sujeto_especial_confirmado", "alertas_proteccion",
            "razonamiento_categoria", "razonamiento_urgencia", "razonamiento_tematica",
            "requiere_hitl", "regla_hitl_activada",
            "confianza", "resumen_ejecutivo", "palabras_clave_urgencia"
        ]
    }
}

# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def clasificar_m2(
    texto_peticion: str,
    contexto_m1: dict | None = None,
    radicado: str = "SIN-RAD"
) -> dict:
    """
    Clasifica y prioriza una petición con el Agente M2.

    Args:
        texto_peticion:  Texto original del ciudadano.
        contexto_m1:     Output del Agente M1 (opcional pero mejora precisión).
        radicado:        ID del caso para trazabilidad.

    Returns:
        dict con clasificación completa + XAI + señal HITL.
    """
    # Construir el prompt de usuario enriquecido con contexto M1 si está disponible
    if contexto_m1:
        campos = contexto_m1.get("m1_campos", {})
        contexto_str = f"""
CONTEXTO EXTRAÍDO POR AGENTE M1:
- Categoría preliminar M1: {campos.get('categoria_inferida', 'no disponible')}
- Entidad referida: {campos.get('entidad_referida', 'no detectada')}
- Pretensión: {campos.get('pretension', 'no detectada')}
- Sujeto especial M1: {campos.get('sujeto_especial', 'ninguno')}
- Indicadores de urgencia en texto: {campos.get('indicadores_urgencia_texto', [])}
- Completitud M1: {campos.get('completitud_score', 0):.0%}
- Hechos normalizados: {campos.get('hechos_normalizados', '')}

TEXTO ORIGINAL:
"""
    else:
        contexto_str = "TEXTO DE LA PETICIÓN:\n"

    mensaje_usuario = contexto_str + texto_peticion

    respuesta = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS_M2,
        system=SYSTEM_M2,
        tools=[TOOL_M2],
        tool_choice={"type": "tool", "name": "clasificar_y_priorizar"},
        messages=[
            {"role": "user", "content": mensaje_usuario}
        ]
    )

    clasificacion = {}
    for bloque in respuesta.content:
        if bloque.type == "tool_use" and bloque.name == "clasificar_y_priorizar":
            clasificacion = bloque.input
            break

    # Aplicar regla HITL por confianza baja (post-proceso determinista)
    if clasificacion.get("confianza", 1.0) < 0.70 and not clasificacion.get("requiere_hitl"):
        clasificacion["requiere_hitl"] = True
        clasificacion["regla_hitl_activada"] = (
            f"Confianza baja del modelo ({clasificacion['confianza']:.0%}) "
            "— revisión humana obligatoria"
        )

    return {
        "radicado": radicado,
        "m2_clasificacion": clasificacion,
        "m2_tokens_input":  respuesta.usage.input_tokens,
        "m2_tokens_output": respuesta.usage.output_tokens,
        "m2_modelo": MODEL,
    }


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    texto_prueba = (
        "Señores necesito ayuda urgente. Mi pareja me ha agredido varias veces "
        "y fui a poner la denuncia en la Fiscalía pero me dijeron que volviera "
        "después porque no había personal. Tengo miedo y no sé qué hacer. "
        "Tengo dos hijos pequeños y no tenemos a dónde ir. URGENTE."
    )

    print("=== TEST AGENTE M2 (sin contexto M1) ===\n")
    resultado = clasificar_m2(texto_prueba, radicado="TEST-001")
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
