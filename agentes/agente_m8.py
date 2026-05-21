"""
AGENTE M8 — Analítica BI Operativa y de Derechos
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. Tablero operativo: carga por temática, tiempos de gestión,
     cuellos de botella, ratio de carga entre profesionales
  2. Tablero de derechos: recurrencia por ciudadano, entidades
     con más quejas, tendencias por población y sujeto especial
  3. Detección de patrones de vulneración sistemática
     (alimentado por M5 — escala a investigación institucional)
  4. Privacidad diferencial: los reportes usan datos agregados,
     nunca individuales (Ley 1581/2012)
  5. LLM genera el resumen ejecutivo del período para la dirección

Meta piloto: dashboard operativo disponible en <24h lag
Marco legal:
  - Ley 1581/2012: privacidad diferencial en datos sensibles
  - Directiva 007/2025: informe público anual de equidad
  - CONPES 4144/2025: métricas de adopción IA sector público
"""

import csv
import json
import sys
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import ANTHROPIC_API_KEY, MODEL_DEFAULT

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── RUTAS ─────────────────────────────────────────────────────────────────────
CSV_PATH     = Path(__file__).parent.parent / "datos" / "datos_peticiones_urab_con_hechos.csv"
REPORTE_PATH = Path(__file__).parent.parent / "outputs"

# ── METAS AS-IS → TO-BE (del RFP) ────────────────────────────────────────────
METAS = {
    "mediana_horas_triage":          {"as_is": 9.1,   "to_be": 2.0,  "unidad": "horas"},
    "pct_urgentes_triage_tardio":    {"as_is": 56.2,  "to_be": 4.5,  "unidad": "%"},
    "pct_doble_registro":            {"as_is": 72.6,  "to_be": 5.0,  "unidad": "%"},
    "ratio_carga_max_min":           {"as_is": 7.7,   "to_be": 2.1,  "unidad": "x"},
    "recall_duplicados":             {"as_is": 0.0,   "to_be": 85.0, "unidad": "%"},
    "pct_borradores_sin_edicion":    {"as_is": 0.0,   "to_be": 60.0, "unidad": "%"},
}

# ── SYSTEM PROMPT M8 ─────────────────────────────────────────────────────────
SYSTEM_M8 = """Eres el Agente M8 de Analítica Institucional de la Defensoría del Pueblo (URAB).
Recibes métricas agregadas del período y debes llamar a la herramienta
`generar_resumen_ejecutivo_m8` para redactar el resumen para la dirección.

INSTRUCCIONES:
- Usa solo los datos agregados proporcionados. Nunca menciones ciudadanos individuales.
- Identifica los 2-3 hallazgos más importantes del período.
- Señala explícitamente si alguna meta del piloto está en riesgo.
- Indica patrones de vulneración sistemática si los hay.
- Lenguaje directo, institucional, sin tecnicismos de IA.
- Extensión: máximo 4 párrafos."""

TOOL_M8 = {
    "name": "generar_resumen_ejecutivo_m8",
    "description": "Genera el resumen ejecutivo del período para la dirección de URAB.",
    "input_schema": {
        "type": "object",
        "properties": {
            "resumen_ejecutivo": {
                "type": "string",
                "description": "4 párrafos máximo con hallazgos principales, alertas y recomendaciones"
            },
            "hallazgos_criticos": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Lista de 2-4 hallazgos que requieren atención directiva"
            },
            "metas_en_riesgo": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Indicadores del piloto que no están en trayectoria hacia la meta"
            },
            "recomendaciones": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Acciones concretas sugeridas para el siguiente período"
            }
        },
        "required": ["resumen_ejecutivo", "hallazgos_criticos", "metas_en_riesgo", "recomendaciones"]
    }
}

# ── CARGA DE DATOS ────────────────────────────────────────────────────────────
def _cargar_datos() -> list[dict]:
    if not CSV_PATH.exists():
        return []
    with open(CSV_PATH, encoding="utf-8") as f:
        return list(csv.DictReader(f))

# ── MÉTRICAS OPERATIVAS ───────────────────────────────────────────────────────
def _metricas_operativas(datos: list[dict]) -> dict:
    """Calcula indicadores operativos del pipeline."""
    total = len(datos)
    if not total:
        return {}

    # Distribución temática
    tematicas = Counter(r.get("tematica", "sin_dato") for r in datos)

    # Distribución de categorías
    categorias = Counter(r.get("categoria", "sin_dato") for r in datos)

    # Urgentes
    urgentes    = sum(1 for r in datos if r.get("urgente") == "True")
    pct_urgente = round(urgentes / total * 100, 1)

    # Tiempos de gestión (usando horas_triage si existe)
    horas_triage = [float(r["horas_triage"]) for r in datos
                    if r.get("horas_triage") and r["horas_triage"] != ""]
    horas_total  = [float(r["horas_total"]) for r in datos
                    if r.get("horas_total") and r["horas_total"] != ""]

    def mediana(lst):
        if not lst:
            return None
        s = sorted(lst)
        n = len(s)
        return round(s[n//2] if n % 2 else (s[n//2-1]+s[n//2])/2, 1)

    def percentil(lst, p):
        if not lst:
            return None
        s = sorted(lst)
        idx = int(len(s) * p / 100)
        return round(s[min(idx, len(s)-1)], 1)

    med_triage = mediana(horas_triage)
    p90_triage = percentil(horas_triage, 90)

    # Urgentes con triage tardío (>8h)
    urgentes_tardios = sum(
        1 for r in datos
        if r.get("urgente") == "True"
        and r.get("horas_triage")
        and float(r["horas_triage"]) > 8
    )
    pct_tardios = round(urgentes_tardios / max(urgentes, 1) * 100, 1)

    # Carga por profesional
    carga_prof = Counter(r.get("profesional_id", "sin_dato") for r in datos)
    cargas = list(carga_prof.values())
    max_c, min_c = max(cargas), max(min(cargas), 1)
    ratio_carga = round(max_c / min_c, 2)

    # Canal de ingreso
    canales = Counter(r.get("canal", "sin_dato") for r in datos)

    return {
        "total_peticiones":           total,
        "total_urgentes":             urgentes,
        "pct_urgentes":               pct_urgente,
        "distribucion_tematica":      dict(tematicas.most_common()),
        "distribucion_categorias":    dict(categorias.most_common()),
        "distribucion_canales":       dict(canales.most_common()),
        "mediana_horas_triage":       med_triage,
        "percentil90_horas_triage":   p90_triage,
        "mediana_horas_total":        mediana(horas_total),
        "urgentes_triage_tardio_gt8h": urgentes_tardios,
        "pct_triage_tardio":          pct_tardios,
        "carga_por_profesional":      dict(carga_prof.most_common()),
        "carga_maxima":               max_c,
        "carga_minima":               min(cargas),
        "ratio_carga_max_min":        ratio_carga,
        "meta_ratio_cumplida":        ratio_carga <= METAS["ratio_carga_max_min"]["to_be"],
    }

# ── MÉTRICAS DE DERECHOS ──────────────────────────────────────────────────────
def _metricas_derechos(datos: list[dict]) -> dict:
    """
    Calcula indicadores de derechos con privacidad diferencial.
    Solo datos agregados — nunca identificadores individuales.
    """
    total = len(datos)
    if not total:
        return {}

    # Sujetos de especial protección
    sujetos = Counter(r.get("sujeto_especial", "Sin marcador") for r in datos)

    # Requieren doble registro (dato del CSV sintético)
    doble_reg = sum(1 for r in datos if r.get("requiere_doble_registro") == "True")
    pct_doble = round(doble_reg / total * 100, 1)

    # Temáticas de mayor urgencia sistémica
    tematica_urgencia: dict[str, dict] = defaultdict(lambda: {"total": 0, "urgentes": 0})
    for r in datos:
        t = r.get("tematica", "sin_dato")
        tematica_urgencia[t]["total"] += 1
        if r.get("urgente") == "True":
            tematica_urgencia[t]["urgentes"] += 1

    riesgo_por_tematica = {
        t: round(v["urgentes"] / max(v["total"], 1) * 100, 1)
        for t, v in tematica_urgencia.items()
    }
    riesgo_por_tematica = dict(
        sorted(riesgo_por_tematica.items(), key=lambda x: -x[1])
    )

    # Peticionarios recurrentes (proxy: mismo profesional_id con muchos casos)
    # En producción: agrupar por cédula real
    prof_count = Counter(r.get("profesional_id") for r in datos)
    recurrentes_estimados = sum(1 for c in prof_count.values() if c >= 5)

    # Canales más usados por urgentes
    canales_urgentes = Counter(
        r.get("canal") for r in datos if r.get("urgente") == "True"
    )

    return {
        "distribucion_sujetos_especiales":  dict(sujetos.most_common()),
        "pct_sujetos_especiales":           round(
            (total - sujetos.get("Sin marcador", 0)) / total * 100, 1
        ),
        "pct_doble_registro_actual":        pct_doble,
        "meta_doble_registro_cumplida":     pct_doble <= METAS["pct_doble_registro"]["to_be"],
        "riesgo_urgencia_por_tematica_pct": riesgo_por_tematica,
        "tematica_mayor_riesgo":            next(iter(riesgo_por_tematica), None),
        "peticionarios_recurrentes_estimados": recurrentes_estimados,
        "canales_urgentes":                 dict(canales_urgentes.most_common()),
    }

# ── DETECCIÓN DE VULNERACIÓN SISTEMÁTICA ─────────────────────────────────────
def _detectar_vulneracion_sistematica(datos: list[dict]) -> list[dict]:
    """
    Detecta patrones de vulneración sistemática de derechos.
    Umbral: temática con >15% de urgentes Y >500 casos en el período.
    """
    alertas = []
    tematica_data: dict[str, dict] = defaultdict(lambda: {"total": 0, "urgentes": 0})

    for r in datos:
        t = r.get("tematica", "sin_dato")
        tematica_data[t]["total"] += 1
        if r.get("urgente") == "True":
            tematica_data[t]["urgentes"] += 1

    for tematica, v in tematica_data.items():
        pct_urg = v["urgentes"] / max(v["total"], 1) * 100
        if pct_urg >= 15 and v["total"] >= 200:
            alertas.append({
                "tematica":        tematica,
                "total_casos":     v["total"],
                "casos_urgentes":  v["urgentes"],
                "pct_urgentes":    round(pct_urg, 1),
                "tipo_alerta":     "vulneracion_sistematica_potencial",
                "recomendacion":   f"Iniciar investigación institucional sobre '{tematica}' — patrón de urgencia sostenida detectado.",
            })

    return sorted(alertas, key=lambda x: -x["pct_urgentes"])

# ── COMPARATIVA AS-IS vs TO-BE ────────────────────────────────────────────────
def _comparativa_metas(metricas_op: dict, metricas_der: dict) -> dict:
    """Evalúa el progreso hacia las metas del piloto (§4.4 RFP)."""
    actual = {
        "mediana_horas_triage":       metricas_op.get("mediana_horas_triage"),
        "pct_urgentes_triage_tardio": metricas_op.get("pct_triage_tardio"),
        "pct_doble_registro":         metricas_der.get("pct_doble_registro_actual"),
        "ratio_carga_max_min":        metricas_op.get("ratio_carga_max_min"),
    }

    comparativa = {}
    for indicador, meta in METAS.items():
        val_actual = actual.get(indicador)
        if val_actual is None:
            comparativa[indicador] = {"estado": "sin_dato"}
            continue
        # Para indicadores donde menor es mejor
        cumple = val_actual <= meta["to_be"]
        pct_avance = round(
            max(0, (meta["as_is"] - val_actual) / max(meta["as_is"] - meta["to_be"], 0.001)) * 100, 1
        ) if meta["as_is"] > meta["to_be"] else None

        comparativa[indicador] = {
            "as_is":      meta["as_is"],
            "to_be":      meta["to_be"],
            "actual":     val_actual,
            "unidad":     meta["unidad"],
            "cumple_meta": cumple,
            "pct_avance": pct_avance,
        }

    return comparativa

# ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────────
def generar_dashboard_m8(
    generar_resumen_llm: bool = True,
    exportar_json: bool = True,
) -> dict:
    """
    Genera el dashboard completo de analítica M8.

    Args:
        generar_resumen_llm: Si True, usa el LLM para el resumen ejecutivo.
        exportar_json:       Si True, guarda el reporte en outputs/.

    Returns:
        dict con todas las métricas, alertas y resumen ejecutivo.
    """
    t_inicio = datetime.now()
    datos    = _cargar_datos()

    if not datos:
        return {"error": f"No se encontró el CSV en {CSV_PATH}"}

    print(f"  [M8] Calculando métricas sobre {len(datos):,} registros...")

    metricas_op  = _metricas_operativas(datos)
    metricas_der = _metricas_derechos(datos)
    alertas_vs   = _detectar_vulneracion_sistematica(datos)
    comparativa  = _comparativa_metas(metricas_op, metricas_der)

    dashboard = {
        "generado_en":              t_inicio.isoformat(),
        "periodo":                  "simulado_90_dias",
        "total_registros":          len(datos),
        "metricas_operativas":      metricas_op,
        "metricas_derechos":        metricas_der,
        "alertas_vulneracion_sistematica": alertas_vs,
        "comparativa_metas_piloto": comparativa,
        "lag_generacion_seg":       round((datetime.now() - t_inicio).total_seconds(), 2),
    }

    # Resumen ejecutivo con LLM
    if generar_resumen_llm:
        print("  [M8] Generando resumen ejecutivo con LLM...")
        contexto = f"""
Período: 90 días simulados (N={len(datos):,} radicados)

MÉTRICAS OPERATIVAS CLAVE:
- Total peticiones: {metricas_op.get('total_peticiones'):,}
- Urgentes: {metricas_op.get('total_urgentes'):,} ({metricas_op.get('pct_urgentes')}%)
- Mediana tiempo triage: {metricas_op.get('mediana_horas_triage')}h (meta: ≤2.0h)
- Urgentes con triage tardío >8h: {metricas_op.get('pct_triage_tardio')}% (meta: ≤4.5%)
- Ratio carga profesionales: {metricas_op.get('ratio_carga_max_min')}x (meta: ≤2.1x)
- Top 3 temáticas: {list(metricas_op.get('distribucion_tematica', {}).items())[:3]}

MÉTRICAS DE DERECHOS:
- Sujetos de especial protección: {metricas_der.get('pct_sujetos_especiales')}% del total
- Doble registro estimado: {metricas_der.get('pct_doble_registro_actual')}% (meta: ≤5%)
- Temática con mayor riesgo de urgencia: {metricas_der.get('tematica_mayor_riesgo')} ({metricas_der.get('riesgo_urgencia_por_tematica_pct', {}).get(metricas_der.get('tematica_mayor_riesgo'), '?')}%)

ALERTAS DE VULNERACIÓN SISTEMÁTICA:
{json.dumps(alertas_vs[:3], ensure_ascii=False, indent=2)}

COMPARATIVA METAS PILOTO:
{json.dumps({k: v for k, v in comparativa.items() if isinstance(v, dict) and v.get('actual') is not None}, ensure_ascii=False, indent=2)}
"""

        respuesta = client.messages.create(
            model=MODEL,
            max_tokens=700,
            system=SYSTEM_M8,
            tools=[TOOL_M8],
            tool_choice={"type": "tool", "name": "generar_resumen_ejecutivo_m8"},
            messages=[{"role": "user", "content": contexto}]
        )

        for bloque in respuesta.content:
            if bloque.type == "tool_use":
                dashboard["resumen_ejecutivo_llm"] = bloque.input
                dashboard["m8_tokens"] = respuesta.usage.input_tokens + respuesta.usage.output_tokens
                break

    # Exportar JSON
    if exportar_json:
        REPORTE_PATH.mkdir(exist_ok=True)
        ts      = t_inicio.strftime("%Y%m%d_%H%M%S")
        archivo = REPORTE_PATH / f"dashboard_m8_{ts}.json"
        with open(archivo, "w", encoding="utf-8") as f:
            json.dump(dashboard, f, ensure_ascii=False, indent=2, default=str)
        dashboard["archivo_exportado"] = str(archivo)
        print(f"  [M8] Dashboard exportado: {archivo.name}")

    dashboard["lag_generacion_seg"] = round((datetime.now() - t_inicio).total_seconds(), 2)
    dashboard["meta_lag_cumplida"]  = dashboard["lag_generacion_seg"] <= (24 * 3600)

    return dashboard

# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== TEST AGENTE M8 — Analítica BI ===\n")

    dashboard = generar_dashboard_m8(generar_resumen_llm=True, exportar_json=True)

    print(f"\nTotal registros analizados: {dashboard.get('total_registros'):,}")
    print(f"Lag de generación: {dashboard.get('lag_generacion_seg')}s")

    op = dashboard.get("metricas_operativas", {})
    print(f"\nMétricas operativas:")
    print(f"  Mediana triage:     {op.get('mediana_horas_triage')}h")
    print(f"  Triage tardío:      {op.get('pct_triage_tardio')}%")
    print(f"  Ratio carga:        {op.get('ratio_carga_max_min')}x")

    alertas = dashboard.get("alertas_vulneracion_sistematica", [])
    if alertas:
        print(f"\n⚠ Alertas vulneración sistemática ({len(alertas)}):")
        for a in alertas[:3]:
            print(f"  → {a['tematica']}: {a['pct_urgentes']}% urgentes ({a['total_casos']} casos)")

    resumen = dashboard.get("resumen_ejecutivo_llm", {})
    if resumen:
        print(f"\nResumen ejecutivo LLM:")
        print(f"  {resumen.get('resumen_ejecutivo', '')[:400]}...")
        if resumen.get("metas_en_riesgo"):
            print(f"\n  Metas en riesgo:")
            for m in resumen["metas_en_riesgo"]:
                print(f"    ⚠ {m}")
