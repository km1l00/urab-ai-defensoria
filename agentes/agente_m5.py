"""
AGENTE M5 — Historial Unificado por Ciudadano (Vista 360°)
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. Consulta el historial completo de un ciudadano por cédula
     u otro identificador (radicado, nombre parcial)
  2. Construye la vista 360°: radicados históricos, estados,
     profesionales asignados, temáticas, respuestas previas
  3. Detecta patrones de recurrencia y vulneración sistemática
  4. Genera resumen ejecutivo del historial para el profesional
  5. Sugiere línea de respuesta consistente con decisiones anteriores

Meta piloto: consulta completa < 30 segundos
Marco legal: Ley 1581/2012 — acceso solo por roles autorizados

Arquitectura producción: integración IRIS + VisionWeb vía API/RPA
Arquitectura MVP: CSV simulado como base de datos de historial
"""

import csv
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
from collections import Counter

sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import ANTHROPIC_API_KEY, MODEL_DEFAULT, MAX_TOKENS_M2

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── RUTA AL CSV (base de datos simulada) ─────────────────────────────────────
CSV_PATH = Path(__file__).parent.parent / "datos" / "datos_peticiones_urab_con_hechos.csv"

# ── SYSTEM PROMPT M5 ─────────────────────────────────────────────────────────
SYSTEM_M5 = """Eres el Agente M5 de Historial Unificado de la Defensoría del Pueblo (URAB).
Recibes el historial completo de un ciudadano y debes llamar a la herramienta
`analizar_historial_ciudadano` para generar la vista 360° que usará el profesional.

Tu análisis debe:
1. PATRÓN DE RECURRENCIA: ¿el ciudadano presenta múltiples peticiones sobre el mismo
   asunto? ¿cuántas veces? ¿en qué período?
2. EVOLUCIÓN DEL CASO: ¿hay progreso, escalada o estancamiento?
3. CONSISTENCIA INSTITUCIONAL: ¿las respuestas previas fueron coherentes entre sí?
4. ALERTA DE VULNERACIÓN SISTEMÁTICA: si hay 3+ peticiones sobre el mismo derecho
   sin resolución, señalarlo explícitamente para investigación institucional (M8).
5. SUGERENCIA DE RESPUESTA: línea de acción recomendada coherente con el historial.

Usa lenguaje institucional. Nunca menciones datos personales sensibles en el resumen."""

TOOL_M5 = {
    "name": "analizar_historial_ciudadano",
    "description": "Genera el análisis de historial 360° del ciudadano para el profesional.",
    "input_schema": {
        "type": "object",
        "properties": {
            "resumen_ejecutivo": {
                "type": "string",
                "description": "Resumen de 3-4 oraciones del historial del ciudadano para el profesional asignado"
            },
            "patron_recurrencia": {
                "type": "string",
                "description": "Descripción del patrón de peticiones: frecuencia, temáticas, evolución",
                "enum": [
                    "primera_vez",
                    "seguimiento_caso_activo",
                    "recurrente_mismo_asunto",
                    "recurrente_multiples_asuntos",
                    "escalada_urgencia"
                ]
            },
            "alerta_vulneracion_sistematica": {
                "type": "boolean",
                "description": "True si hay 3+ peticiones sobre el mismo derecho sin resolución visible"
            },
            "descripcion_alerta": {
                "type": ["string", "null"],
                "description": "Descripción de la vulneración sistemática detectada. null si no aplica."
            },
            "tematica_principal_historial": {
                "type": "string",
                "description": "Temática que más se repite en el historial del ciudadano"
            },
            "sugerencia_linea_respuesta": {
                "type": "string",
                "description": "Línea de acción sugerida para el profesional, coherente con respuestas previas"
            },
            "requiere_coordinacion_interna": {
                "type": "boolean",
                "description": "True si el caso requiere coordinación con otro profesional que manejó casos anteriores"
            },
            "profesionales_previos": {
                "type": "array",
                "items": {"type": "string"},
                "description": "IDs de profesionales que han atendido al ciudadano anteriormente"
            }
        },
        "required": [
            "resumen_ejecutivo", "patron_recurrencia",
            "alerta_vulneracion_sistematica", "descripcion_alerta",
            "tematica_principal_historial", "sugerencia_linea_respuesta",
            "requiere_coordinacion_interna", "profesionales_previos"
        ]
    }
}

# ── CARGA DEL CSV ─────────────────────────────────────────────────────────────
_cache_csv: Optional[list[dict]] = None

def _cargar_csv() -> list[dict]:
    global _cache_csv
    if _cache_csv is not None:
        return _cache_csv
    if not CSV_PATH.exists():
        return []
    with open(CSV_PATH, encoding="utf-8") as f:
        _cache_csv = list(csv.DictReader(f))
    return _cache_csv

# ── BÚSQUEDA DE HISTORIAL ─────────────────────────────────────────────────────
def _buscar_historial(
    identificador: str,
    campo_busqueda: str = "profesional_id"
) -> list[dict]:
    """
    Busca los radicados asociados a un ciudadano en el CSV simulado.

    En producción esta función consultaría IRIS + VisionWeb vía API.
    En MVP, usa el campo profesional_id como proxy del ciudadano
    (simula que todos los casos de un profesional son del mismo ciudadano).

    Para demostración real, se puede pasar campo_busqueda="radicado"
    con un prefijo para filtrar una familia de radicados.
    """
    datos = _cargar_csv()
    if not datos:
        return []

    identificador_lower = identificador.lower().strip()
    resultados = []

    for fila in datos:
        valor = str(fila.get(campo_busqueda, "")).lower().strip()
        if valor == identificador_lower or identificador_lower in valor:
            resultados.append(fila)

    # Ordenar por fecha de ingreso
    resultados.sort(key=lambda x: x.get("fecha_ingreso", ""), reverse=False)
    return resultados

def _construir_resumen_estructurado(radicados: list[dict]) -> dict:
    """Construye estadísticas del historial para pasarle al LLM."""
    if not radicados:
        return {}

    tematicas   = Counter(r.get("tematica", "")   for r in radicados)
    categorias  = Counter(r.get("categoria", "")  for r in radicados)
    urgentes    = sum(1 for r in radicados if r.get("urgente") == "True")
    profesionales = list({r.get("profesional_id", "") for r in radicados})
    fechas      = sorted(r.get("fecha_ingreso", "") for r in radicados if r.get("fecha_ingreso"))

    return {
        "total_radicados":     len(radicados),
        "fechas":              {"primera": fechas[0] if fechas else None,
                                "ultima":  fechas[-1] if fechas else None},
        "tematicas":           dict(tematicas.most_common(3)),
        "categorias":          dict(categorias.most_common()),
        "urgentes":            urgentes,
        "profesionales_ids":   profesionales,
        "muestra_radicados":   [
            {
                "radicado":   r.get("radicado"),
                "fecha":      r.get("fecha_ingreso"),
                "tematica":   r.get("tematica"),
                "categoria":  r.get("categoria"),
                "urgente":    r.get("urgente"),
                "extracto":   (r.get("hechos", "") or "")[:200],
            }
            for r in radicados[:8]  # máximo 8 para el contexto LLM
        ]
    }

# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def consultar_m5(
    identificador: str,
    campo_busqueda: str = "profesional_id",
    radicado_actual: Optional[str] = None,
) -> dict:
    """
    Construye la vista 360° del ciudadano.

    Args:
        identificador:   Cédula, ID del profesional o prefijo de radicado.
        campo_busqueda:  Campo del CSV a usar como identificador del ciudadano.
        radicado_actual: Radicado del caso en curso (para excluirlo del historial).

    Returns:
        dict con historial estructurado + análisis LLM + alertas.
    """
    t_inicio = datetime.now()

    # 1. Recuperar historial
    radicados = _buscar_historial(identificador, campo_busqueda)

    # Excluir el radicado actual del historial (es el caso que se está procesando)
    if radicado_actual:
        radicados = [r for r in radicados if r.get("radicado") != radicado_actual]

    if not radicados:
        return {
            "identificador":   identificador,
            "radicado_actual": radicado_actual,
            "total_historial": 0,
            "es_primera_vez":  True,
            "analisis":        None,
            "tiempo_consulta_seg": (datetime.now() - t_inicio).total_seconds(),
            "mensaje":         "Sin historial previo — ciudadano nuevo en el sistema.",
        }

    # 2. Construir resumen estructurado
    resumen = _construir_resumen_estructurado(radicados)

    # 3. Análisis LLM
    contexto_llm = f"""
Historial del ciudadano (identificador: {identificador}):

Estadísticas generales:
- Total de radicados previos: {resumen['total_radicados']}
- Período: {resumen['fechas']['primera']} → {resumen['fechas']['ultima']}
- Casos urgentes: {resumen['urgentes']}
- Temáticas: {json.dumps(resumen['tematicas'], ensure_ascii=False)}
- Categorías: {json.dumps(resumen['categorias'], ensure_ascii=False)}
- Profesionales que lo han atendido: {resumen['profesionales_ids']}

Muestra de radicados (más recientes):
{json.dumps(resumen['muestra_radicados'], ensure_ascii=False, indent=2)}

Radicado actual en proceso: {radicado_actual or 'no especificado'}
"""

    respuesta = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=SYSTEM_M5,
        tools=[TOOL_M5],
        tool_choice={"type": "tool", "name": "analizar_historial_ciudadano"},
        messages=[{"role": "user", "content": contexto_llm}]
    )

    analisis = {}
    for bloque in respuesta.content:
        if bloque.type == "tool_use":
            analisis = bloque.input
            break

    tiempo = (datetime.now() - t_inicio).total_seconds()

    return {
        "identificador":          identificador,
        "radicado_actual":        radicado_actual,
        "total_historial":        resumen["total_radicados"],
        "es_primera_vez":         False,
        "fechas":                 resumen["fechas"],
        "tematicas_historial":    resumen["tematicas"],
        "categorias_historial":   resumen["categorias"],
        "urgentes_historial":     resumen["urgentes"],
        "analisis":               analisis,
        "radicados_muestra":      resumen["muestra_radicados"],
        "tiempo_consulta_seg":    round(tiempo, 2),
        "meta_cumplida_30s":      tiempo <= 30,
        "m5_tokens":              respuesta.usage.input_tokens + respuesta.usage.output_tokens,
    }


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== TEST AGENTE M5 — Vista 360° ===\n")

    # Simular consulta por profesional_id (proxy de ciudadano en el MVP)
    resultado = consultar_m5(
        identificador="3",
        campo_busqueda="profesional_id",
        radicado_actual="URAB-2025-000050"
    )

    print(f"Identificador:     {resultado['identificador']}")
    print(f"Total historial:   {resultado['total_historial']} radicados")
    print(f"Primera vez:       {resultado['es_primera_vez']}")
    print(f"Tiempo consulta:   {resultado['tiempo_consulta_seg']}s (meta <30s: {'✓' if resultado['meta_cumplida_30s'] else '✗'})")

    if resultado.get("analisis"):
        a = resultado["analisis"]
        print(f"\nPatrón:            {a.get('patron_recurrencia')}")
        print(f"Alerta sistémica:  {a.get('alerta_vulneracion_sistematica')}")
        if a.get("descripcion_alerta"):
            print(f"  → {a['descripcion_alerta']}")
        print(f"\nResumen ejecutivo:")
        print(f"  {a.get('resumen_ejecutivo')}")
        print(f"\nSugerencia:")
        print(f"  {a.get('sugerencia_linea_respuesta')}")
