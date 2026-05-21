"""
AGENTE M1 — Recepción Inteligente
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. NER: extrae campos clave del texto libre del ciudadano
  2. Auditoría de completitud: detecta faltantes por tipo de trámite
  3. Genera solicitud de complemento cuando faltan datos críticos
  4. Normaliza la entrada para que M2 pueda clasificar con precisión

Output estructurado que alimenta directamente al Agente M2.
"""

import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import ANTHROPIC_API_KEY, MODEL_DEFAULT, MAX_TOKENS_M1

# ── CLIENTE ──────────────────────────────────────────────────────────────────
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── SYSTEM PROMPT M1 ─────────────────────────────────────────────────────────
SYSTEM_M1 = """Eres el Agente M1 de Recepción Inteligente de la Defensoría del Pueblo de Colombia (URAB).

Tu única función es extraer información estructurada del texto libre de una petición ciudadana.
Debes llamar a la herramienta `extraer_campos_peticion` con los datos que encuentres.

REGLAS DE EXTRACCIÓN:
- Si un campo no aparece en el texto, usa null (no inventes datos).
- Para `sujeto_especial`: busca indicadores de menor de edad, adulto mayor (>60 años),
  discapacidad, comunidad étnica, víctima de conflicto. Si no hay indicadores, null.
- Para `entidad_referida`: extrae el nombre de la EPS, alcaldía, ICBF, banco, constructora,
  INPEC, Fiscalía, etc. que mencione el ciudadano como responsable del problema.
- Para `pretension`: resume en 1 oración qué pide el ciudadano (qué quiere que pase).
- Para `hechos_normalizados`: reescribe el relato de forma ordenada y sin datos personales
  sensibles — apto para análisis interno.
- Para `campos_faltantes`: lista solo los campos CRÍTICOS ausentes según la categoria inferida.
  Campos siempre requeridos: contacto o canal de respuesta, descripción del hecho, pretensión.
  Campos adicionales para Queja: entidad referida, fecha aproximada del hecho.
  Campos adicionales para Conciliación/Mediación: partes involucradas, tipo de acuerdo buscado.
- Para `solicitud_complemento`: si hay faltantes críticos, redacta el mensaje que se enviaría
  al ciudadano pidiendo la información. Usa lenguaje sencillo y empático. null si no faltan datos.

NUNCA incluyas datos personales reales (cédula, nombre completo, teléfono) en el output JSON."""

# ── HERRAMIENTA M1 ────────────────────────────────────────────────────────────
TOOL_M1 = {
    "name": "extraer_campos_peticion",
    "description": "Extrae y estructura los campos clave de una petición ciudadana para su procesamiento.",
    "input_schema": {
        "type": "object",
        "properties": {
            "canal_detectado": {
                "type": ["string", "null"],
                "description": "Canal de ingreso inferido del texto: web|correo|presencial|correspondencia|terreno",
                "enum": ["web", "correo", "presencial", "correspondencia", "terreno", None]
            },
            "categoria_inferida": {
                "type": ["string", "null"],
                "description": "Categoría preliminar: Asesoría|Queja|Solicitud de mediación|Solicitud de conciliación",
                "enum": ["Asesoría", "Queja", "Solicitud de mediación", "Solicitud de conciliación", None]
            },
            "entidad_referida": {
                "type": ["string", "null"],
                "description": "Nombre de la entidad pública o privada responsable del problema"
            },
            "pretension": {
                "type": ["string", "null"],
                "description": "Qué pide el ciudadano — resumen en 1 oración"
            },
            "sujeto_especial": {
                "type": ["string", "null"],
                "description": "Indicador de sujeto de especial protección constitucional detectado",
                "enum": [
                    "Adulto mayor", "NNA (niño, niña, adolescente)",
                    "Persona con discapacidad", "Víctima de conflicto",
                    "Comunidad étnica", None
                ]
            },
            "indicadores_urgencia_texto": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista de palabras o frases del texto que señalan urgencia o riesgo vital"
            },
            "hechos_normalizados": {
                "type": ["string", "null"],
                "description": "Relato reescrito de forma ordenada, sin datos personales sensibles"
            },
            "campos_faltantes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista de campos críticos ausentes en la petición"
            },
            "solicitud_complemento": {
                "type": ["string", "null"],
                "description": "Mensaje empático al ciudadano pidiendo datos faltantes. null si la petición está completa."
            },
            "completitud_score": {
                "type": "number",
                "description": "Porcentaje de completitud de la petición (0.0 a 1.0)"
            }
        },
        "required": [
            "canal_detectado", "categoria_inferida", "entidad_referida",
            "pretension", "sujeto_especial", "indicadores_urgencia_texto",
            "hechos_normalizados", "campos_faltantes",
            "solicitud_complemento", "completitud_score"
        ]
    }
}

# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def procesar_m1(texto_peticion: str, radicado: str = "SIN-RAD") -> dict:
    """
    Procesa una petición ciudadana con el Agente M1.

    Args:
        texto_peticion: Texto libre del ciudadano.
        radicado: Identificador del caso (para trazabilidad).

    Returns:
        dict con todos los campos extraídos + metadatos de trazabilidad.
    """
    respuesta = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS_M1,
        system=SYSTEM_M1,
        tools=[TOOL_M1],
        tool_choice={"type": "tool", "name": "extraer_campos_peticion"},
        messages=[
            {
                "role": "user",
                "content": f"Procesa esta petición ciudadana:\n\n{texto_peticion}"
            }
        ]
    )

    # Extraer resultado del tool_use
    campos = {}
    for bloque in respuesta.content:
        if bloque.type == "tool_use" and bloque.name == "extraer_campos_peticion":
            campos = bloque.input
            break

    return {
        "radicado": radicado,
        "m1_campos": campos,
        "m1_tokens_input":  respuesta.usage.input_tokens,
        "m1_tokens_output": respuesta.usage.output_tokens,
        "m1_modelo": MODEL,
    }


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    texto_prueba = (
        "Señores necesito ayuda urgente. Mi pareja me ha agredido varias veces "
        "y fui a poner la denuncia en la Fiscalía pero me dijeron que volviera "
        "después porque no había personal. Tengo miedo y no sé qué hacer. "
        "Tengo dos hijos pequeños y no tenemos a dónde ir. URGENTE."
    )

    print("=== TEST AGENTE M1 ===\n")
    resultado = procesar_m1(texto_prueba, radicado="TEST-001")
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
