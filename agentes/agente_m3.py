"""
AGENTE M3 — Reparto Inteligente
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. Asigna cada caso al profesional óptimo considerando:
     - Carga actual (casos activos en bandeja)
     - Especialización temática por profesional
     - Nivel de urgencia del caso (output M2)
     - Bloqueos: sujeto especial, HITL pendiente
  2. Genera trazabilidad XAI del criterio de reparto (Art. 29 CP)
  3. Actualiza el estado de carga en memoria (JSON persistente)
  4. Meta piloto: ratio carga máx/mín 7.7x → ≤2.1x

El módulo es determinista en la asignación (reglas) y usa LLM
solo para generar la justificación legible del criterio.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import (
    ANTHROPIC_API_KEY, MODEL_DEFAULT, MAX_TOKENS_M2,
    TEMATICAS, NIVELES_URGENCIA,
)

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── ESTADO DE CARGA (persiste entre ejecuciones) ─────────────────────────────
ESTADO_PATH = Path(__file__).parent.parent / "datos" / "estado_carga_m3.json"

# Catálogo de profesionales con especialización temática
# En producción vendría de IRIS/VisionWeb
PROFESIONALES = {
    "P01":  {"nombre": "Prof. 01", "especialidades": ["salud", "discapacidad"],          "carga": 0},
    "P02":  {"nombre": "Prof. 02", "especialidades": ["pensiones_seguridad_social"],      "carga": 0},
    "P03":  {"nombre": "Prof. 03", "especialidades": ["violencia_basada_en_genero"],      "carga": 0},
    "P04":  {"nombre": "Prof. 04", "especialidades": ["infancia_adolescencia", "violencia_basada_en_genero"], "carga": 0},
    "P05":  {"nombre": "Prof. 05", "especialidades": ["carcelario"],                      "carga": 0},
    "P06":  {"nombre": "Prof. 06", "especialidades": ["migracion"],                       "carga": 0},
    "P07":  {"nombre": "Prof. 07", "especialidades": ["vivienda", "otras"],               "carga": 0},
    "P08":  {"nombre": "Prof. 08", "especialidades": ["salud"],                           "carga": 0},
    "P09":  {"nombre": "Prof. 09", "especialidades": ["pensiones_seguridad_social", "discapacidad"], "carga": 0},
    "P10":  {"nombre": "Prof. 10", "especialidades": ["infancia_adolescencia"],           "carga": 0},
    "P11":  {"nombre": "Prof. 11", "especialidades": ["carcelario", "migracion"],        "carga": 0},
    "P12":  {"nombre": "Prof. 12", "especialidades": ["salud", "pensiones_seguridad_social"], "carga": 0},
    "P13":  {"nombre": "Prof. 13", "especialidades": ["violencia_basada_en_genero", "infancia_adolescencia"], "carga": 0},
    "P14":  {"nombre": "Prof. 14", "especialidades": ["vivienda"],                        "carga": 0},
    "P15":  {"nombre": "Prof. 15", "especialidades": ["otras", "migracion"],              "carga": 0},
    "P16":  {"nombre": "Prof. 16", "especialidades": ["discapacidad", "salud"],           "carga": 0},
    "P17":  {"nombre": "Prof. 17", "especialidades": ["carcelario", "vivienda"],          "carga": 0},
}

# ── SYSTEM PROMPT M3 (solo para generar justificación XAI) ───────────────────
SYSTEM_M3 = """Eres el Agente M3 de Reparto Inteligente de la Defensoría del Pueblo (URAB).
Recibirás una asignación ya calculada algorítmicamente y debes llamar a la herramienta
`generar_justificacion_reparto` para redactar la justificación XAI en lenguaje claro
que quedará en el expediente (requerido por Art. 29 CP — trazabilidad de decisión automatizada).

La justificación debe explicar en 2-3 oraciones:
1. Por qué fue asignado a ESE profesional (especialidad + carga)
2. Por qué con ESA prioridad de atención
3. Si aplica: por qué se activó alguna regla especial (urgencia, sujeto especial)

Usa lenguaje institucional, no técnico. Nunca menciones "IA" o "algoritmo" — di "el sistema de reparto"."""

TOOL_M3 = {
    "name": "generar_justificacion_reparto",
    "description": "Genera la justificación XAI del criterio de reparto para el expediente.",
    "input_schema": {
        "type": "object",
        "properties": {
            "justificacion_xai": {
                "type": "string",
                "description": "Justificación en 2-3 oraciones del criterio de asignación. Lenguaje institucional."
            },
            "criterio_principal": {
                "type": "string",
                "description": "Criterio determinante: especialidad|carga|urgencia|sujeto_especial|combinado",
                "enum": ["especialidad", "carga", "urgencia", "sujeto_especial", "combinado"]
            }
        },
        "required": ["justificacion_xai", "criterio_principal"]
    }
}

# ── CARGA DE ESTADO ───────────────────────────────────────────────────────────
def cargar_estado() -> dict:
    """Carga el estado de carga de profesionales desde el JSON persistente."""
    if ESTADO_PATH.exists():
        with open(ESTADO_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {pid: dict(p) for pid, p in PROFESIONALES.items()}

def guardar_estado(estado: dict):
    """Persiste el estado actualizado."""
    ESTADO_PATH.parent.mkdir(exist_ok=True)
    with open(ESTADO_PATH, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)

def resetear_estado():
    """Reinicia el estado de carga a los valores base del catálogo."""
    guardar_estado({pid: dict(p) for pid, p in PROFESIONALES.items()})

# ── MOTOR DE ASIGNACIÓN (determinista) ───────────────────────────────────────
def _seleccionar_profesional(
    tematica: str,
    urgencia: str,
    sujeto_especial: Optional[str],
    estado: dict
) -> tuple[str, dict, str]:
    """
    Aplica las reglas de reparto y retorna (profesional_id, datos_prof, motivo_regla).

    Reglas en orden de prioridad:
    1. CRÍTICO → profesional especialista con MENOR carga (sin importar la carga media)
    2. Sujeto especial + ALTO → especialista con menor carga en la temática
    3. Especialista disponible con carga < promedio
    4. Cualquier especialista (menor carga entre ellos)
    5. Fallback: profesional con menor carga global
    """
    cargas = {pid: p["carga"] for pid, p in estado.items()}
    promedio = sum(cargas.values()) / len(cargas)

    # Candidatos especialistas en la temática
    especialistas = [
        pid for pid, p in estado.items()
        if tematica in p.get("especialidades", [])
    ]
    no_especialistas = [pid for pid in estado if pid not in especialistas]

    def menor_carga(lista):
        return min(lista, key=lambda pid: estado[pid]["carga"])

    # Regla 1: CRÍTICO → especialista con menor carga absoluta
    if urgencia == "CRÍTICO":
        candidatos = especialistas if especialistas else list(estado.keys())
        pid = menor_carga(candidatos)
        return pid, estado[pid], "urgencia_critica"

    # Regla 2: sujeto especial + ALTO → especialista con menor carga
    if sujeto_especial and urgencia == "ALTO" and especialistas:
        pid = menor_carga(especialistas)
        return pid, estado[pid], "sujeto_especial_alto"

    # Regla 3: especialista con carga < promedio
    disponibles = [pid for pid in especialistas if estado[pid]["carga"] < promedio]
    if disponibles:
        pid = menor_carga(disponibles)
        return pid, estado[pid], "especialista_disponible"

    # Regla 4: cualquier especialista (menor carga entre ellos)
    if especialistas:
        pid = menor_carga(especialistas)
        return pid, estado[pid], "especialista_sobrecargado"

    # Regla 5: fallback — menor carga global
    pid = menor_carga(list(estado.keys()))
    return pid, estado[pid], "fallback_menor_carga"


def _calcular_metricas_carga(estado: dict) -> dict:
    """Calcula el ratio máx/mín y otras métricas de balance."""
    cargas = [p["carga"] for p in estado.values()]
    max_c, min_c = max(cargas), max(min(cargas), 1)
    return {
        "carga_maxima":  max(cargas),
        "carga_minima":  min(cargas),
        "carga_promedio": round(sum(cargas) / len(cargas), 1),
        "ratio_max_min": round(max_c / min_c, 2),
        "meta_ratio":    2.1,
        "meta_cumplida": (max_c / min_c) <= 2.1,
    }

# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def asignar_m3(
    radicado: str,
    tematica: str,
    urgencia: str,
    categoria: str,
    sujeto_especial: Optional[str] = None,
    resumen_caso: str = "",
    tiempo_respuesta: str = "5días",
) -> dict:
    """
    Asigna un caso al profesional óptimo y genera la trazabilidad XAI.

    Args:
        radicado:         ID del caso.
        tematica:         Output M2 (salud, carcelario, etc.)
        urgencia:         Output M2 (CRÍTICO, ALTO, MEDIO, BAJO)
        categoria:        Output M2 (Asesoría, Queja, etc.)
        sujeto_especial:  Output M1/M2 (puede ser None)
        resumen_caso:     Resumen ejecutivo de M2 para contexto XAI
        tiempo_respuesta: Tiempo sugerido por M2

    Returns:
        dict con asignación, justificación XAI y métricas de carga.
    """
    estado = cargar_estado()

    # 1. Selección algorítmica
    prof_id, prof_datos, regla_aplicada = _seleccionar_profesional(
        tematica, urgencia, sujeto_especial, estado
    )

    # 2. Actualizar carga
    estado[prof_id]["carga"] += 1
    guardar_estado(estado)

    # 3. Generar justificación XAI con LLM
    contexto_llm = f"""
Asignación realizada:
- Radicado: {radicado}
- Profesional asignado: {prof_datos['nombre']} ({prof_id})
- Especialidades del profesional: {', '.join(prof_datos.get('especialidades', []))}
- Carga actual del profesional (post-asignación): {prof_datos['carga']} casos
- Promedio de carga del equipo: {_calcular_metricas_carga(estado)['carga_promedio']} casos
- Temática del caso: {tematica}
- Urgencia: {urgencia}
- Categoría: {categoria}
- Sujeto especial: {sujeto_especial or 'ninguno'}
- Regla aplicada: {regla_aplicada}
- Resumen del caso: {resumen_caso[:200] if resumen_caso else 'no disponible'}
- Tiempo máximo de respuesta: {tiempo_respuesta}
"""

    respuesta = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=SYSTEM_M3,
        tools=[TOOL_M3],
        tool_choice={"type": "tool", "name": "generar_justificacion_reparto"},
        messages=[{"role": "user", "content": contexto_llm}]
    )

    xai = {"justificacion_xai": "Sin justificación generada.", "criterio_principal": "combinado"}
    for bloque in respuesta.content:
        if bloque.type == "tool_use":
            xai = bloque.input
            break

    metricas = _calcular_metricas_carga(estado)

    return {
        "radicado":              radicado,
        "profesional_id":        prof_id,
        "profesional_nombre":    prof_datos["nombre"],
        "regla_aplicada":        regla_aplicada,
        "criterio_principal":    xai.get("criterio_principal"),
        "justificacion_xai":     xai.get("justificacion_xai"),
        "tiempo_respuesta":      tiempo_respuesta,
        "timestamp_asignacion":  datetime.now().isoformat(),
        "metricas_carga":        metricas,
        "m3_tokens":             respuesta.usage.input_tokens + respuesta.usage.output_tokens,
    }


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    resetear_estado()
    print("=== TEST AGENTE M3 — 3 casos ===\n")

    casos = [
        {
            "radicado": "TEST-001",
            "tematica": "violencia_basada_en_genero",
            "urgencia": "CRÍTICO",
            "categoria": "Queja",
            "sujeto_especial": "NNA (niño, niña, adolescente)",
            "resumen_caso": "Madre con hijos menores en situación de violencia doméstica activa.",
            "tiempo_respuesta": "inmediato",
        },
        {
            "radicado": "TEST-002",
            "tematica": "salud",
            "urgencia": "ALTO",
            "categoria": "Queja",
            "sujeto_especial": "Adulto mayor",
            "resumen_caso": "Adulto mayor sin medicamento para tratamiento crónico.",
            "tiempo_respuesta": "24h",
        },
        {
            "radicado": "TEST-003",
            "tematica": "pensiones_seguridad_social",
            "urgencia": "MEDIO",
            "categoria": "Asesoría",
            "sujeto_especial": None,
            "resumen_caso": "Ciudadano solicita información sobre traslado de fondo de pensiones.",
            "tiempo_respuesta": "5días",
        },
    ]

    for caso in casos:
        resultado = asignar_m3(**caso)
        print(f"Radicado: {resultado['radicado']}")
        print(f"  → {resultado['profesional_id']} | Regla: {resultado['regla_aplicada']}")
        print(f"  → {resultado['justificacion_xai']}")
        metricas = resultado["metricas_carga"]
        print(f"  → Ratio carga: {metricas['ratio_max_min']}x (meta ≤2.1x) {'✓' if metricas['meta_cumplida'] else '✗'}")
        print()
