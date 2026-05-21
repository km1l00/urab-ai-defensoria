"""
PIPELINE M1 + M2 — Procesamiento por lotes
Defensoría del Pueblo · URAB · LSL 2026

Ejecuta los agentes M1 y M2 secuencialmente sobre el CSV de peticiones
y genera un CSV enriquecido con todos los campos de clasificación y triage.

Uso:
    export ANTHROPIC_API_KEY="sk-ant-..."
    python pipeline_m1_m2.py --csv datos_peticiones_urab_con_hechos.csv --n 30 --col hechos

    # Solo M2 (más rápido para demo):
    python pipeline_m1_m2.py --csv datos_peticiones_urab_con_hechos.csv --n 30 --solo-m2
"""

import argparse
import json
import sys
import time
import csv
from pathlib import Path
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "agentes"))
from agentes.agente_m1 import procesar_m1
from agentes.agente_m2 import clasificar_m2
from config import DELAY_ENTRE_FILAS as _D, MAX_REINTENTOS as _MR, DELAY_REINTENTO as _DR

# ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
DELAY_ENTRE_FILAS = _D
MAX_REINTENTOS    = _MR
DELAY_REINTENTO   = _DR

# ── COLORES TERMINAL ─────────────────────────────────────────────────────────
ROJO    = "\033[91m"
VERDE   = "\033[92m"
AMARILLO= "\033[93m"
CIAN    = "\033[96m"
RESET   = "\033[0m"
NEGRITA = "\033[1m"

COLOR_URGENCIA = {
    "CRÍTICO": ROJO,
    "ALTO":    AMARILLO,
    "MEDIO":   CIAN,
    "BAJO":    VERDE,
}

# ── FUNCIÓN DE PROCESAMIENTO POR FILA ────────────────────────────────────────
def procesar_fila(row: dict, col_texto: str, solo_m2: bool, idx: int) -> dict:
    """Procesa una fila con M1 y/o M2, con reintentos."""
    texto = row.get(col_texto, "")
    radicado = row.get("radicado", f"FILA-{idx}")

    resultado_m1 = None
    resultado_m2 = None

    for intento in range(MAX_REINTENTOS):
        try:
            if not solo_m2:
                resultado_m1 = procesar_m1(texto, radicado)
                time.sleep(DELAY_ENTRE_FILAS)

            resultado_m2 = clasificar_m2(
                texto,
                contexto_m1=resultado_m1,
                radicado=radicado
            )
            break

        except Exception as e:
            msg = str(e)
            if intento < MAX_REINTENTOS - 1:
                print(f"  {AMARILLO}⚠ Intento {intento+1}/{MAX_REINTENTOS} fallido: {msg[:80]}. Reintentando...{RESET}")
                time.sleep(DELAY_REINTENTO * (intento + 1))
            else:
                print(f"  {ROJO}✗ Error definitivo: {msg[:100]}{RESET}")
                return {"radicado": radicado, "error": msg[:200]}

    return _aplanar_resultados(row, resultado_m1, resultado_m2)


def _aplanar_resultados(row: dict, m1: dict | None, m2: dict | None) -> dict:
    """Aplana los outputs de M1 y M2 en una fila CSV."""
    salida = dict(row)  # mantiene todas las columnas originales

    if m1:
        c = m1.get("m1_campos", {})
        salida.update({
            "m1_canal_detectado":          c.get("canal_detectado"),
            "m1_categoria_inferida":       c.get("categoria_inferida"),
            "m1_entidad_referida":         c.get("entidad_referida"),
            "m1_pretension":               c.get("pretension"),
            "m1_sujeto_especial":          c.get("sujeto_especial"),
            "m1_indicadores_urgencia":     "|".join(c.get("indicadores_urgencia_texto", [])),
            "m1_hechos_normalizados":      c.get("hechos_normalizados"),
            "m1_campos_faltantes":         "|".join(c.get("campos_faltantes", [])),
            "m1_completitud_score":        c.get("completitud_score"),
            "m1_solicitud_complemento":    c.get("solicitud_complemento"),
            "m1_tokens":                   (m1.get("m1_tokens_input", 0) + m1.get("m1_tokens_output", 0)),
        })

    if m2:
        cl = m2.get("m2_clasificacion", {})
        salida.update({
            "m2_categoria":                cl.get("categoria"),
            "m2_tematica":                 cl.get("tematica"),
            "m2_subtematica":              cl.get("subtematica"),
            "m2_urgencia":                 cl.get("urgencia"),
            "m2_tiempo_respuesta":         cl.get("tiempo_respuesta_sugerido"),
            "m2_sujeto_especial":          cl.get("sujeto_especial_confirmado"),
            "m2_alertas_proteccion":       "|".join(cl.get("alertas_proteccion", [])),
            "m2_requiere_hitl":            cl.get("requiere_hitl"),
            "m2_regla_hitl":               cl.get("regla_hitl_activada"),
            "m2_confianza":                cl.get("confianza"),
            "m2_resumen_ejecutivo":        cl.get("resumen_ejecutivo"),
            "m2_palabras_clave":           "|".join(cl.get("palabras_clave_urgencia", [])),
            "m2_xai_categoria":            cl.get("razonamiento_categoria"),
            "m2_xai_urgencia":             cl.get("razonamiento_urgencia"),
            "m2_xai_tematica":             cl.get("razonamiento_tematica"),
            "m2_tokens":                   (m2.get("m2_tokens_input", 0) + m2.get("m2_tokens_output", 0)),
        })

    salida["pipeline_timestamp"] = datetime.now().isoformat()
    return salida


# ── MÉTRICAS FINALES ─────────────────────────────────────────────────────────
def imprimir_metricas(resultados: list[dict]):
    """Imprime métricas de desempeño del batch en terminal."""
    procesados = [r for r in resultados if "error" not in r]
    errores    = len(resultados) - len(procesados)

    print(f"\n{'═'*60}")
    print(f"{NEGRITA}MÉTRICAS DEL PIPELINE M1+M2{RESET}")
    print(f"{'═'*60}")
    print(f"  Total procesadas:  {VERDE}{len(procesados)}{RESET}")
    print(f"  Errores:           {ROJO if errores else VERDE}{errores}{RESET}")

    if not procesados:
        return

    # Distribución de urgencia
    from collections import Counter
    urg_dist = Counter(r.get("m2_urgencia") for r in procesados)
    print(f"\n  {NEGRITA}Distribución de urgencia (M2):{RESET}")
    for nivel in ["CRÍTICO", "ALTO", "MEDIO", "BAJO"]:
        n   = urg_dist.get(nivel, 0)
        pct = 100 * n / len(procesados)
        color = COLOR_URGENCIA.get(nivel, RESET)
        barra = "█" * int(pct / 3)
        print(f"    {color}{nivel:10}{RESET} {barra:20} {n:4} ({pct:5.1f}%)")

    # HITL
    hitl = sum(1 for r in procesados if r.get("m2_requiere_hitl") in [True, "True"])
    print(f"\n  {NEGRITA}Casos HITL (revisión humana):  {ROJO}{hitl} ({100*hitl/len(procesados):.1f}%){RESET}")

    # Exactitud vs dataset (si hay columna "urgente")
    con_etiqueta = [r for r in procesados if r.get("urgente") is not None]
    if con_etiqueta:
        correctos = sum(
            1 for r in con_etiqueta
            if (r.get("urgente") in ["True", True]) == (r.get("m2_urgencia") in ["CRÍTICO", "ALTO"])
        )
        acc = 100 * correctos / len(con_etiqueta)
        print(f"  {NEGRITA}Exactitud M2 vs etiquetas:     {VERDE if acc >= 80 else AMARILLO}{acc:.1f}%{RESET}")

    # Confianza promedio
    confs = [float(r["m2_confianza"]) for r in procesados if r.get("m2_confianza") is not None]
    if confs:
        avg_conf = sum(confs) / len(confs)
        print(f"  {NEGRITA}Confianza promedio M2:         {CIAN}{avg_conf:.0%}{RESET}")

    # Tokens totales
    tok_m1 = sum(r.get("m1_tokens", 0) or 0 for r in procesados)
    tok_m2 = sum(r.get("m2_tokens", 0) or 0 for r in procesados)
    tok_total = tok_m1 + tok_m2
    costo_aprox = tok_total * 0.0000008  # Haiku 3.5 ≈ $0.80/1M tokens promedio
    print(f"\n  {NEGRITA}Tokens usados:{RESET}  M1={tok_m1:,}  M2={tok_m2:,}  Total={tok_total:,}")
    print(f"  {NEGRITA}Costo estimado:{RESET}  ~${costo_aprox:.4f} USD")
    print(f"{'═'*60}\n")


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Pipeline M1+M2 — Defensoría URAB")
    parser.add_argument("--csv",      required=True, help="Ruta al CSV de peticiones")
    parser.add_argument("--col",      default="hechos", help="Columna de texto (default: hechos)")
    parser.add_argument("--n",        type=int, default=20, help="Número de filas a procesar (default: 20)")
    parser.add_argument("--offset",   type=int, default=0,  help="Fila de inicio (default: 0)")
    parser.add_argument("--solo-m2",  action="store_true",  help="Saltar M1, solo clasificar con M2")
    parser.add_argument("--output",   default=None, help="Ruta CSV de salida (default: auto)")
    args = parser.parse_args()

    # Leer CSV
    ruta_csv = Path(args.csv)
    if not ruta_csv.exists():
        print(f"{ROJO}Error: no se encuentra el archivo {ruta_csv}{RESET}")
        sys.exit(1)

    with open(ruta_csv, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        todas = list(reader)

    filas = todas[args.offset : args.offset + args.n]
    if not filas:
        print(f"{ROJO}Error: no hay filas en el rango solicitado.{RESET}")
        sys.exit(1)

    if args.col not in (filas[0].keys()):
        cols_disponibles = list(filas[0].keys())
        print(f"{ROJO}Error: columna '{args.col}' no encontrada.{RESET}")
        print(f"Columnas disponibles: {cols_disponibles}")
        sys.exit(1)

    modo = f"{'solo M2' if args.solo_m2 else 'M1+M2'}"
    print(f"\n{NEGRITA}{'═'*60}{RESET}")
    print(f"{NEGRITA}  PIPELINE {modo} — Defensoría del Pueblo · URAB{RESET}")
    print(f"{'═'*60}")
    print(f"  Archivo:   {ruta_csv.name}")
    print(f"  Filas:     {len(filas)} (offset {args.offset})")
    print(f"  Columna:   {args.col}")
    print(f"  Modelo:    claude-3-5-haiku-20241022")
    print(f"{'═'*60}\n")

    # Procesar
    resultados = []
    for i, row in enumerate(filas, 1):
        radicado = row.get("radicado", f"FILA-{i}")
        print(f"[{i:>3}/{len(filas)}] {CIAN}{radicado}{RESET}", end=" → ")
        sys.stdout.flush()

        resultado = procesar_fila(row, args.col, args.solo_m2, i)

        if "error" in resultado:
            print(f"{ROJO}ERROR{RESET}")
        else:
            urg = resultado.get("m2_urgencia", "?")
            hitl = resultado.get("m2_requiere_hitl")
            color = COLOR_URGENCIA.get(urg, RESET)
            hitl_str = f" {ROJO}🔴 HITL{RESET}" if hitl in [True, "True"] else ""
            conf = resultado.get("m2_confianza")
            conf_str = f" ({float(conf):.0%})" if conf is not None else ""
            print(f"{color}{urg}{RESET}{conf_str}{hitl_str}")

        resultados.append(resultado)
        time.sleep(DELAY_ENTRE_FILAS)

    # Guardar CSV
    if not resultados:
        print(f"{ROJO}Sin resultados para guardar.{RESET}")
        sys.exit(1)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    ruta_out = Path(args.output) if args.output else ruta_csv.parent / f"resultados_m1m2_{ts}.csv"

    todos_campos = list(resultados[0].keys())
    for r in resultados[1:]:
        for k in r.keys():
            if k not in todos_campos:
                todos_campos.append(k)

    with open(ruta_out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=todos_campos, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(resultados)

    print(f"\n{VERDE}✓ Resultados guardados en: {ruta_out}{RESET}")

    # Métricas
    imprimir_metricas(resultados)


if __name__ == "__main__":
    main()
