"""
PIPELINE ORQUESTADOR M1 → M8
Defensoría del Pueblo · URAB · LSL 2026

Orquesta los 8 agentes en secuencia para cada petición del CSV:

  M1 → Recepción inteligente (NER + faltantes)
  M2 → Clasificación y triage (urgencia + XAI)
  M3 → Reparto inteligente (profesional + carga)
  M4 → Anti-duplicidad (similitud semántica)
  M5 → Historial 360° del ciudadano
  M6 → Borrador de respuesta (RAG + HITL)
  M7 → Sincronización IRIS / VisionWeb
  M8 → Dashboard analítico del batch

Uso:
  export ANTHROPIC_API_KEY="sk-ant-..."

  # Demo rápida — 10 filas, solo M1+M2+M3+M7+M8
  python pipeline/orquestador.py --csv datos/datos_peticiones_urab_con_hechos.csv --n 10 --modo rapido

  # Completo — 30 filas, todos los módulos
  python pipeline/orquestador.py --csv datos/datos_peticiones_urab_con_hechos.csv --n 30 --modo completo

  # Solo analítica (sin LLM por fila) — procesa todo el CSV
  python pipeline/orquestador.py --csv datos/datos_peticiones_urab_con_hechos.csv --modo analitica
"""

import argparse
import csv
import json
import sys
import time
from datetime import datetime
from pathlib import Path

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).parent.parent
sys.path.insert(0, str(BASE))
sys.path.insert(0, str(BASE / "agentes"))

from agentes.agente_m1 import procesar_m1
from agentes.agente_m2 import clasificar_m2
from agentes.agente_m3 import asignar_m3, resetear_estado
from agentes.agente_m4 import escanear_duplicados_m4
from agentes.agente_m5 import consultar_m5
from agentes.agente_m6 import generar_borrador_m6
from agentes.agente_m7 import sincronizar_registro_m7, actualizar_estado_m7, metricas_sincronizacion_m7
from agentes.agente_m8 import generar_dashboard_m8
from config import DELAY_ENTRE_FILAS, MAX_REINTENTOS, DELAY_REINTENTO

# ── COLORES ───────────────────────────────────────────────────────────────────
R = "\033[91m"; Y = "\033[93m"; G = "\033[92m"; C = "\033[96m"
M = "\033[95m"; B = "\033[94m"; N = "\033[0m";  K = "\033[1m"

COLOR_URG = {"CRÍTICO": R, "ALTO": Y, "MEDIO": C, "BAJO": G}

MODOS = {
    "rapido":    ["M1", "M2", "M3", "M7"],           # sin M4/M5/M6 por fila
    "completo":  ["M1", "M2", "M3", "M4", "M5", "M6", "M7"],
    "analitica": [],                                   # solo M8 sobre todo el CSV
}

# ── PROCESAMIENTO POR FILA ────────────────────────────────────────────────────
def procesar_fila(row: dict, col: str, modulos: list[str], idx: int) -> dict:
    radicado = row.get("radicado", f"FILA-{idx}")
    texto    = row.get(col, "")
    salida   = dict(row)
    errores  = []

    for intento in range(MAX_REINTENTOS):
        try:
            # ── M1 ────────────────────────────────────────────────────────
            r_m1 = None
            if "M1" in modulos:
                r_m1 = procesar_m1(texto, radicado)
                c1   = r_m1.get("m1_campos", {})
                salida.update({
                    "m1_categoria_inferida":    c1.get("categoria_inferida"),
                    "m1_entidad_referida":      c1.get("entidad_referida"),
                    "m1_pretension":            c1.get("pretension"),
                    "m1_sujeto_especial":       c1.get("sujeto_especial"),
                    "m1_completitud":           c1.get("completitud_score"),
                    "m1_campos_faltantes":      "|".join(c1.get("campos_faltantes", [])),
                    "m1_tokens":                r_m1.get("m1_tokens_input", 0) + r_m1.get("m1_tokens_output", 0),
                })
                time.sleep(DELAY_ENTRE_FILAS)

            # ── M2 ────────────────────────────────────────────────────────
            r_m2 = None
            if "M2" in modulos:
                r_m2 = clasificar_m2(texto, contexto_m1=r_m1, radicado=radicado)
                c2   = r_m2.get("m2_clasificacion", {})
                salida.update({
                    "m2_categoria":         c2.get("categoria"),
                    "m2_tematica":          c2.get("tematica"),
                    "m2_urgencia":          c2.get("urgencia"),
                    "m2_tiempo_respuesta":  c2.get("tiempo_respuesta_sugerido"),
                    "m2_sujeto_especial":   c2.get("sujeto_especial_confirmado"),
                    "m2_requiere_hitl":     c2.get("requiere_hitl"),
                    "m2_confianza":         c2.get("confianza"),
                    "m2_resumen":           c2.get("resumen_ejecutivo"),
                    "m2_xai_urgencia":      c2.get("razonamiento_urgencia"),
                    "m2_tokens":            r_m2.get("m2_tokens_input", 0) + r_m2.get("m2_tokens_output", 0),
                })
                time.sleep(DELAY_ENTRE_FILAS)

            # ── M3 ────────────────────────────────────────────────────────
            r_m3 = None
            if "M3" in modulos and r_m2:
                c2 = r_m2.get("m2_clasificacion", {})
                r_m3 = asignar_m3(
                    radicado=radicado,
                    tematica=c2.get("tematica", "otras"),
                    urgencia=c2.get("urgencia", "BAJO"),
                    categoria=c2.get("categoria", "Asesoría"),
                    sujeto_especial=c2.get("sujeto_especial_confirmado"),
                    resumen_caso=c2.get("resumen_ejecutivo", ""),
                    tiempo_respuesta=c2.get("tiempo_respuesta_sugerido", "5días"),
                )
                salida.update({
                    "m3_profesional_id":      r_m3.get("profesional_id"),
                    "m3_profesional_nombre":  r_m3.get("profesional_nombre"),
                    "m3_regla_reparto":       r_m3.get("regla_aplicada"),
                    "m3_justificacion_xai":   r_m3.get("justificacion_xai"),
                    "m3_ratio_carga":         r_m3.get("metricas_carga", {}).get("ratio_max_min"),
                    "m3_tokens":              r_m3.get("m3_tokens", 0),
                })
                time.sleep(DELAY_ENTRE_FILAS)

            # ── M5 ────────────────────────────────────────────────────────
            if "M5" in modulos and r_m3:
                prof_id = r_m3.get("profesional_id", "1")
                r_m5    = consultar_m5(
                    identificador=prof_id.replace("P", ""),
                    campo_busqueda="profesional_id",
                    radicado_actual=radicado,
                )
                an5 = r_m5.get("analisis") or {}
                salida.update({
                    "m5_historial_total":    r_m5.get("total_historial", 0),
                    "m5_primera_vez":        r_m5.get("es_primera_vez"),
                    "m5_patron":             an5.get("patron_recurrencia"),
                    "m5_alerta_sistematica": an5.get("alerta_vulneracion_sistematica"),
                    "m5_tiempo_consulta_s":  r_m5.get("tiempo_consulta_seg"),
                    "m5_tokens":             r_m5.get("m5_tokens", 0),
                })
                time.sleep(DELAY_ENTRE_FILAS)

            # ── M6 ────────────────────────────────────────────────────────
            if "M6" in modulos and r_m2 and r_m3:
                c2   = r_m2.get("m2_clasificacion", {})
                r_m6 = generar_borrador_m6(
                    radicado=radicado,
                    texto_peticion=texto,
                    contexto_m2=c2,
                    profesional_nombre=r_m3.get("profesional_nombre", ""),
                    tiempo_respuesta=c2.get("tiempo_respuesta_sugerido", "5días"),
                )
                salida.update({
                    "m6_tipo_respuesta":   r_m6.get("tipo_respuesta"),
                    "m6_requiere_hitl":    r_m6.get("requiere_hitl"),
                    "m6_auto_enviable":    r_m6.get("auto_enviable"),
                    "m6_alerta_riesgo":    r_m6.get("alerta_riesgo"),
                    "m6_confianza":        r_m6.get("confianza_borrador"),
                    "m6_tokens":           r_m6.get("m6_tokens", 0),
                })
                time.sleep(DELAY_ENTRE_FILAS)

            # ── M7 ────────────────────────────────────────────────────────
            if "M7" in modulos and r_m2 and r_m3:
                c2   = r_m2.get("m2_clasificacion", {})
                r_m7 = sincronizar_registro_m7(
                    radicado=radicado,
                    estado="asignado",
                    profesional_id=r_m3.get("profesional_id", "P01"),
                    tematica=c2.get("tematica", "otras"),
                    categoria=c2.get("categoria", "Asesoría"),
                    urgencia=c2.get("urgencia", "BAJO"),
                    fecha_ingreso=row.get("fecha_ingreso", datetime.now().strftime("%Y-%m-%d")),
                )
                salida.update({
                    "m7_sincronizado":  r_m7.get("sincronizado"),
                    "m7_iris_ok":       r_m7.get("iris", {}).get("ok"),
                    "m7_vw_ok":         r_m7.get("visionweb", {}).get("ok"),
                    "m7_metodo_iris":   r_m7.get("iris", {}).get("metodo"),
                    "m7_metodo_vw":     r_m7.get("visionweb", {}).get("metodo"),
                    "m7_doble_reg_evitado": r_m7.get("doble_registro_evitado"),
                })

            salida["pipeline_ok"]        = True
            salida["pipeline_timestamp"] = datetime.now().isoformat()
            salida["pipeline_errores"]   = ""
            break

        except Exception as e:
            msg = str(e)[:120]
            if intento < MAX_REINTENTOS - 1:
                time.sleep(DELAY_REINTENTO * (intento + 1))
            else:
                salida["pipeline_ok"]      = False
                salida["pipeline_errores"] = msg
                errores.append(msg)

    return salida


# ── IMPRIMIR PROGRESO ─────────────────────────────────────────────────────────
def _print_fila(salida: dict, idx: int, total: int):
    radicado = salida.get("radicado", f"FILA-{idx}")
    ok       = salida.get("pipeline_ok", False)
    urg      = salida.get("m2_urgencia", "?")
    hitl     = salida.get("m2_requiere_hitl") in [True, "True"]
    sinc     = salida.get("m7_sincronizado") in [True, "True"]
    color    = COLOR_URG.get(urg, N)

    hitl_str = f" {R}🔴HITL{N}" if hitl else ""
    sinc_str = f" {G}↕SYNC{N}" if sinc else f" {Y}⚠SYNC{N}"
    prof     = salida.get("m3_profesional_id", "—")

    print(f"[{idx:>3}/{total}] {C}{radicado}{N} → "
          f"{color}{urg:8}{N} {prof:4}{hitl_str}{sinc_str} "
          f"{'✓' if ok else f'{R}✗{N}'}")


# ── MÉTRICAS FINALES ──────────────────────────────────────────────────────────
def _imprimir_metricas(resultados: list[dict], modulos: list[str], t_total: float):
    ok  = [r for r in resultados if r.get("pipeline_ok")]
    err = len(resultados) - len(ok)

    print(f"\n{'═'*62}")
    print(f"{K}  MÉTRICAS FINALES DEL PIPELINE{N}")
    print(f"{'═'*62}")
    print(f"  Procesadas:  {G}{len(ok)}{N}  |  Errores: {R if err else G}{err}{N}  |  Tiempo: {t_total:.1f}s")

    if not ok:
        return

    from collections import Counter
    urg_dist = Counter(r.get("m2_urgencia") for r in ok)
    print(f"\n  {K}Urgencia M2:{N}")
    for u in ["CRÍTICO", "ALTO", "MEDIO", "BAJO"]:
        n = urg_dist.get(u, 0)
        pct = 100 * n / len(ok)
        barra = "█" * int(pct / 3)
        print(f"    {COLOR_URG.get(u,N)}{u:10}{N} {barra:20} {n:3} ({pct:4.1f}%)")

    if "M3" in modulos:
        ratios = [float(r["m3_ratio_carga"]) for r in ok if r.get("m3_ratio_carga")]
        if ratios:
            ratio_final = ratios[-1]
            color = G if ratio_final <= 2.1 else Y
            print(f"\n  {K}Ratio carga M3:{N} {color}{ratio_final}x{N} (meta ≤2.1x) {'✓' if ratio_final <= 2.1 else '⚠'}")

    hitl_n = sum(1 for r in ok if r.get("m2_requiere_hitl") in [True, "True"])
    print(f"  {K}Casos HITL:{N}  {R}{hitl_n}{N} ({100*hitl_n/len(ok):.1f}%)")

    if "M7" in modulos:
        sinc_ok = sum(1 for r in ok if r.get("m7_sincronizado") in [True, "True"])
        print(f"  {K}Sync M7:{N}     {G}{sinc_ok}{N}/{len(ok)} exitosas")

    # Exactitud vs dataset
    con_etq = [r for r in ok if r.get("urgente") is not None]
    if con_etq:
        correcto = sum(
            1 for r in con_etq
            if (r.get("urgente") in ["True", True]) == (r.get("m2_urgencia") in ["CRÍTICO", "ALTO"])
        )
        acc = 100 * correcto / len(con_etq)
        print(f"  {K}Exactitud M2:{N} {G if acc >= 80 else Y}{acc:.1f}%{N} vs etiquetas dataset")

    tok = sum((r.get("m1_tokens") or 0) + (r.get("m2_tokens") or 0) +
              (r.get("m3_tokens") or 0) + (r.get("m5_tokens") or 0) +
              (r.get("m6_tokens") or 0) for r in ok)
    costo = tok * 0.0000008
    print(f"  {K}Tokens totales:{N} {tok:,}  |  Costo estimado: ~${costo:.4f} USD")
    print(f"{'═'*62}\n")


# ── EXPORTAR CSV ──────────────────────────────────────────────────────────────
def _exportar_csv(resultados: list[dict], ruta_out: Path):
    if not resultados:
        return
    campos = list(resultados[0].keys())
    for r in resultados[1:]:
        for k in r:
            if k not in campos:
                campos.append(k)
    with open(ruta_out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(resultados)


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Orquestador M1-M8 — Defensoría URAB")
    parser.add_argument("--csv",    required=True,        help="Ruta al CSV de peticiones")
    parser.add_argument("--col",    default="hechos",     help="Columna de texto (default: hechos)")
    parser.add_argument("--n",      type=int, default=10, help="Filas a procesar (default: 10)")
    parser.add_argument("--offset", type=int, default=0,  help="Fila de inicio (default: 0)")
    parser.add_argument("--modo",   default="rapido",     choices=["rapido", "completo", "analitica"],
                        help="rapido=M1-3+M7 | completo=M1-7 | analitica=solo M8")
    parser.add_argument("--output", default=None,         help="Ruta CSV de salida (default: auto)")
    parser.add_argument("--reset-carga", action="store_true", help="Resetear estado de carga M3")
    args = parser.parse_args()

    # Leer CSV
    ruta = Path(args.csv)
    if not ruta.exists():
        print(f"{R}Error: no se encuentra {ruta}{N}"); sys.exit(1)

    with open(ruta, encoding="utf-8") as f:
        todas = list(csv.DictReader(f))

    modulos = MODOS[args.modo]

    print(f"\n{K}{'═'*62}{N}")
    print(f"{K}  ORQUESTADOR M1–M8 · Defensoría del Pueblo · URAB{N}")
    print(f"{'═'*62}")
    print(f"  CSV:     {ruta.name}  ({len(todas):,} filas totales)")
    print(f"  Modo:    {args.modo} → módulos: {', '.join(modulos) if modulos else 'solo M8'}")
    print(f"  Muestra: {args.n} filas desde offset {args.offset}")
    print(f"{'═'*62}\n")

    # Modo solo analítica
    if args.modo == "analitica":
        print(f"  {C}Generando dashboard M8 sobre todo el CSV...{N}\n")
        dash = generar_dashboard_m8(generar_resumen_llm=True, exportar_json=True)
        op   = dash.get("metricas_operativas", {})
        print(f"\n  Registros analizados: {dash.get('total_registros'):,}")
        print(f"  Mediana triage:       {op.get('mediana_horas_triage')}h")
        print(f"  Triage tardío >8h:    {op.get('pct_triage_tardio')}%")
        print(f"  Ratio carga:          {op.get('ratio_carga_max_min')}x")
        alertas = dash.get("alertas_vulneracion_sistematica", [])
        if alertas:
            print(f"\n  {R}⚠ Alertas vulneración sistemática:{N}")
            for a in alertas:
                print(f"    → {a['tematica']}: {a['pct_urgentes']}% urgentes")
        res = dash.get("resumen_ejecutivo_llm", {})
        if res:
            print(f"\n  {K}Resumen ejecutivo:{N}")
            for line in (res.get("resumen_ejecutivo","")[:600]).split("\n"):
                print(f"    {line}")
        return

    # Reset carga M3 si se pide
    if args.reset_carga:
        resetear_estado()
        print(f"  {Y}Estado de carga M3 reiniciado.{N}\n")

    filas = todas[args.offset: args.offset + args.n]
    if not filas:
        print(f"{R}Error: rango vacío.{N}"); sys.exit(1)

    if args.col not in filas[0]:
        print(f"{R}Error: columna '{args.col}' no encontrada.{N}")
        print(f"Columnas disponibles: {list(filas[0].keys())}"); sys.exit(1)

    # Procesamiento por fila (M1→M7)
    t0 = datetime.now()
    resultados = []

    for i, row in enumerate(filas, 1):
        salida = procesar_fila(row, args.col, modulos, i)
        _print_fila(salida, i, len(filas))
        resultados.append(salida)
        time.sleep(0.1)

    t_total = (datetime.now() - t0).total_seconds()

    # M4 — batch sobre todas las filas procesadas
    if "M4" in modulos and len(resultados) >= 2:
        print(f"\n  {M}[M4] Escaneando duplicados en el batch...{N}")
        r_m4 = escanear_duplicados_m4(
            peticiones=filas,
            col_texto=args.col,
            col_id="radicado",
            max_pares_llm=min(10, len(resultados) // 2),
        )
        m4_m = r_m4.get("metricas", {})
        print(f"  [M4] Candidatos TF-IDF: {m4_m.get('pares_candidatos_tfidf')} | "
              f"Duplicados confirmados: {m4_m.get('duplicados_confirmados')} | "
              f"Posibles: {m4_m.get('posibles_duplicados')}")

    # M8 — dashboard del batch
    if len(resultados) >= 5:
        print(f"\n  {B}[M8] Generando dashboard analítico...{N}")
        dash = generar_dashboard_m8(generar_resumen_llm=False, exportar_json=True)
        print(f"  [M8] Dashboard exportado ✓")

    # Métricas en terminal
    _imprimir_metricas(resultados, modulos, t_total)

    # Exportar CSV enriquecido
    ts      = datetime.now().strftime("%Y%m%d_%H%M%S")
    ruta_out = Path(args.output) if args.output else ruta.parent.parent / "outputs" / f"pipeline_{args.modo}_{ts}.csv"
    _exportar_csv(resultados, ruta_out)
    print(f"{G}✓ Resultados exportados: {ruta_out.name}{N}")


if __name__ == "__main__":
    main()
