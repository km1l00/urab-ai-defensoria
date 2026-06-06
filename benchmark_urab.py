"""
Benchmark URAB — Sonnet 4.6 vs Opus 4.6
Completa el experimento iniciado con Haiku 4.5 (MVP LSL2026)

Instalación:  pip install anthropic
Uso:          python benchmark_urab.py
Costo:        ~$0.09 USD (24 llamadas API)
"""

import anthropic
import json
import time

# ── Pon tu API key aquí ──────────────────────────────────────────
API_KEY = "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"   # reemplaza con tu key real
# ────────────────────────────────────────────────────────────────

MODELS = [
    {"id": "claude-sonnet-4-6",           "name": "Sonnet 4.6", "price_in": 3.0,  "price_out": 15.0},
    {"id": "claude-opus-4-6",             "name": "Opus 4.6",   "price_in": 5.0,  "price_out": 25.0},
]

SYSTEM_PROMPT = """Eres el motor de clasificación y triage de peticiones ciudadanas de la Defensoría del Pueblo de Colombia (URAB). Devuelve ÚNICAMENTE JSON válido sin texto adicional:
{"categoria":"vida_integridad|salud|educacion|vivienda|trabajo|pensiones|servicios_publicos|discapacidad|nna|desaparicion|discriminacion","urgencia":"alta|media|baja","requiere_hitl":true,"justificacion":"max 2 oraciones","confianza":0}
Reglas: urgencia=alta → requiere_hitl=true siempre. Menor de edad → requiere_hitl=true. Amenaza vital → urgencia=alta. nna cuando menor es sujeto principal."""

PETITIONS = [
    {"id": 0,  "label": "Amenaza directa (coloquial)",       "texto": "Buenos días, mi vecino me tiene amenazado de muerte. Me dijo que si no le pago lo que le debo me va a matar a mí y a mi familia. Ya puse denuncia en la policía pero no hicieron nada. Tengo miedo de salir de mi casa.",         "gt": {"categoria": "vida_integridad", "urgencia": "alta",  "requiere_hitl": True}},
    {"id": 1,  "label": "Maltrato adulto mayor (implícito)", "texto": "Mi suegro de 78 años vive con mi cuñado. Tiene muchos moretones y lo tienen encerrado y flaco. El señor llora y quiere venirse con nosotros pero no lo dejan.",                                                                           "gt": {"categoria": "vida_integridad", "urgencia": "alta",  "requiere_hitl": True}},
    {"id": 2,  "label": "Desaparición menor con autismo",    "texto": "Mi hija de 15 años desapareció el martes pasado. Salió para el colegio y no llegó. Ella tiene autismo grado 2 y no puede comunicarse sola.",                                                                                              "gt": {"categoria": "nna",             "urgencia": "alta",  "requiere_hitl": True}},
    {"id": 3,  "label": "Pensión vejez negada (formal)",     "texto": "Tengo 65 años y cumplí las 1350 semanas cotizadas pero Colpensiones negó mi pensión alegando periodos sin aportes. Tengo las colillas de pago.",                                                                                           "gt": {"categoria": "pensiones",       "urgencia": "media", "requiere_hitl": False}},
    {"id": 4,  "label": "EPS niega medicamento",             "texto": "Mi mamá tiene diabetes tipo 2. El médico le formuló insulina glargina pero la EPS Sanitas dice que no está en el POS. Llevamos 3 meses peleando y el médico dice que se puede complicar.",                                                  "gt": {"categoria": "salud",           "urgencia": "media", "requiere_hitl": False}},
    {"id": 5,  "label": "Seguimiento de caso (duplicado)",   "texto": "Quiero saber si ya revisaron mi caso de pensión que mandé la semana pasada. Radicado DP-2026-04-1234. Sigo esperando respuesta de Colpensiones.",                                                                                         "gt": {"categoria": "pensiones",       "urgencia": "baja",  "requiere_hitl": False}},
    {"id": 6,  "label": "Caso mixto — tres problemas",       "texto": "Tengo varios problemas: el acueducto me cortó el agua aunque pagué, la EPS no me da cita médica, y en mi conjunto me discriminan por ser madre soltera.",                                                                                   "gt": {"categoria": "servicios_publicos", "urgencia": "media", "requiere_hitl": False}},
    {"id": 7,  "label": "Urgente camuflado como consulta",   "texto": "Quiero consultar sobre una medida de protección contra mi ex. Desde la semana pasada lo he visto cerca de mi casa varias veces y el otro día vi que tenía una pistola.",                                                                    "gt": {"categoria": "vida_integridad", "urgencia": "alta",  "requiere_hitl": True}},
    {"id": 8,  "label": "Discapacidad + hijos menores",      "texto": "Soy persona con discapacidad física. La alcaldía me aprobó subsidio de vivienda hace 8 meses pero no lo han desembolsado. Tengo dos hijos menores y ya no puedo pagar el arriendo.",                                                      "gt": {"categoria": "discapacidad",    "urgencia": "media", "requiere_hitl": True}},
    {"id": 9,  "label": "Lenguaje coloquial (SISBEN)",       "texto": "Parcero, estos manes del SISBEN me tienen re loco. Fui a actualizar mi encuesta y me mandaron de oficina en oficina, siempre con el sistema caído. Llevo 3 meses sin poder acceder a salud.",                                             "gt": {"categoria": "salud",           "urgencia": "baja",  "requiere_hitl": False}},
    {"id": 10, "label": "Desaparición forzada (conflicto)",  "texto": "El 15 de mayo mi hermano de 34 años fue llevado por hombres armados en camioneta al salir de su trabajo en zona rural. La Fiscalía dice que no tiene competencia. Tememos por su vida.",                                                   "gt": {"categoria": "desaparicion",    "urgencia": "alta",  "requiere_hitl": True}},
    {"id": 11, "label": "NNA + violencia doméstica",         "texto": "Soy docente. Un estudiante de 11 años lleva 3 semanas sin venir al colegio. Fui a su casa y vi moretones, la mamá asustada. El papá agresivo no me dejó hablar con el niño.",                                                             "gt": {"categoria": "nna",             "urgencia": "alta",  "requiere_hitl": True}},
]

# Haiku 4.5 — resultados del MVP (ya corrido)
HAIKU_RESULTS = [
    {"categoria": "vida_integridad",    "urgencia": "alta",  "requiere_hitl": True,  "in_tok": 350, "out_tok": 110},
    {"categoria": "vida_integridad",    "urgencia": "alta",  "requiere_hitl": True,  "in_tok": 348, "out_tok": 108},
    {"categoria": "nna",                "urgencia": "alta",  "requiere_hitl": True,  "in_tok": 352, "out_tok": 112},
    {"categoria": "pensiones",          "urgencia": "media", "requiere_hitl": False, "in_tok": 345, "out_tok": 105},
    {"categoria": "salud",              "urgencia": "media", "requiere_hitl": False, "in_tok": 350, "out_tok": 110},
    {"categoria": "pensiones",          "urgencia": "baja",  "requiere_hitl": False, "in_tok": 340, "out_tok": 100},
    {"categoria": "servicios_publicos", "urgencia": "media", "requiere_hitl": False, "in_tok": 355, "out_tok": 115},
    {"categoria": "vida_integridad",    "urgencia": "media", "requiere_hitl": False, "in_tok": 350, "out_tok": 110},  # ← error esperado
    {"categoria": "discapacidad",       "urgencia": "media", "requiere_hitl": False, "in_tok": 348, "out_tok": 108},  # ← HITL miss
    {"categoria": "salud",              "urgencia": "baja",  "requiere_hitl": False, "in_tok": 342, "out_tok": 102},
    {"categoria": "desaparicion",       "urgencia": "alta",  "requiere_hitl": True,  "in_tok": 352, "out_tok": 112},
    {"categoria": "nna",                "urgencia": "alta",  "requiere_hitl": True,  "in_tok": 350, "out_tok": 110},
]


def call_model(client, model_id, texto):
    msg = client.messages.create(
        model=model_id,
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": texto}]
    )
    raw = msg.content[0].text.strip()
    # limpiar posible markdown
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"categoria": "parse_error", "urgencia": "baja", "requiere_hitl": False,
                  "justificacion": f"Error parseo: {raw[:80]}", "confianza": 0}
    return {
        **parsed,
        "in_tok":  msg.usage.input_tokens,
        "out_tok": msg.usage.output_tokens,
    }


def calc_metrics(results, model):
    n = len(results)
    cat = urg = hitl_caught = hitl_req = in_t = out_t = 0
    for i, r in enumerate(results):
        gt = PETITIONS[i]["gt"]
        if r.get("categoria") == gt["categoria"]: cat += 1
        if r.get("urgencia")  == gt["urgencia"]:  urg += 1
        in_t  += r.get("in_tok",  0)
        out_t += r.get("out_tok", 0)
        if gt["requiere_hitl"]:
            hitl_req += 1
            if r.get("requiere_hitl"): hitl_caught += 1

    ai, ao = in_t / n, out_t / n
    sys_tok = 260
    cpp      = (ai / 1e6) * model["price_in"]  + (ao / 1e6) * model["price_out"]
    cpp_cach = (((ai - sys_tok) / 1e6) * model["price_in"] +
                (sys_tok / 1e6) * model["price_in"] * 0.1 +
                (ao / 1e6) * model["price_out"])
    return {
        "cat_acc":      round(cat / n * 100),
        "urg_acc":      round(urg / n * 100),
        "hitl_recall":  round(hitl_caught / hitl_req * 100) if hitl_req else 0,
        "hitl_caught":  hitl_caught,
        "hitl_req":     hitl_req,
        "avg_in":       round(ai),
        "avg_out":      round(ao),
        "cpp":          round(cpp, 6),
        "cpp_cached":   round(cpp_cach, 6),
        "annual":       round(cpp * 300 * 365),
        "annual_cached":round(cpp_cach * 300 * 365),
    }


def print_results(all_results):
    print("\n" + "="*70)
    print("RESULTADOS BENCHMARK URAB — LSL2026")
    print("="*70)

    headers = ["Modelo", "Cat%", "Urg%", "HITL%", "$/pet.", "Anual std", "Anual cached"]
    print(f"\n{'Modelo':<15} {'Cat%':>5} {'Urg%':>5} {'HITL%':>6} {'$/pet.':>9} {'Anual':>10} {'Cached':>10}")
    print("-" * 65)

    for name, m in all_results.items():
        print(f"{name:<15} {m['cat_acc']:>5}% {m['urg_acc']:>5}% {m['hitl_recall']:>5}%  "
              f"${m['cpp']:<8.5f} ${m['annual']:>9,}  ${m['annual_cached']:>9,}")

    print("\n" + "="*70)
    print("DETALLE POR PETICIÓN")
    print("="*70)
    for i, p in enumerate(PETITIONS):
        gt = p["gt"]
        print(f"\n{i+1:2}. {p['label']}")
        print(f"    GT: {gt['categoria']:<25} urgencia={gt['urgencia']:<6} hitl={gt['requiere_hitl']}")
        for name, model_res in all_results.items():
            r = model_res["results"][i]
            cat_ok  = "✓" if r.get("categoria") == gt["categoria"] else "✗"
            urg_ok  = "✓" if r.get("urgencia")  == gt["urgencia"]  else "✗"
            hitl_ok = "✓" if r.get("requiere_hitl") == gt["requiere_hitl"] else "✗"
            print(f"    {name:<12}: {cat_ok} {r.get('categoria','?'):<25} {urg_ok} urgencia={r.get('urgencia','?'):<6} {hitl_ok} hitl={r.get('requiere_hitl','?')}")

    print("\n" + "="*70)
    print("JSON PARA PEGAR EN CLAUDE (copia todo esto)")
    print("="*70)
    output = {}
    for name, m in all_results.items():
        output[name] = {
            "cat_acc": m["cat_acc"], "urg_acc": m["urg_acc"],
            "hitl_recall": m["hitl_recall"], "hitl_caught": m["hitl_caught"],
            "hitl_req": m["hitl_req"], "avg_in": m["avg_in"], "avg_out": m["avg_out"],
            "cpp": m["cpp"], "cpp_cached": m["cpp_cached"],
            "annual": m["annual"], "annual_cached": m["annual_cached"],
            "results": [{"categoria": r.get("categoria"), "urgencia": r.get("urgencia"),
                         "requiere_hitl": r.get("requiere_hitl"), "confianza": r.get("confianza"),
                         "justificacion": r.get("justificacion","")[:120]} for r in m["results"]]
        }
    print(json.dumps(output, ensure_ascii=False, indent=2))


def main():
    client = anthropic.Anthropic(api_key=API_KEY)

    # Haiku ya corrido
    haiku_model = {"name": "Haiku 4.5", "price_in": 1.0, "price_out": 5.0}
    haiku_metrics = calc_metrics(HAIKU_RESULTS, haiku_model)
    haiku_metrics["results"] = HAIKU_RESULTS

    all_results = {"Haiku 4.5 (MVP)": haiku_metrics}

    total_cost = 0.0
    for model in MODELS:
        print(f"\n{'─'*50}")
        print(f"Corriendo {model['name']} ({model['id']})")
        print(f"{'─'*50}")
        results = []
        for i, p in enumerate(PETITIONS):
            print(f"  Petición {i+1:2}/12 — {p['label'][:45]}...", end=" ", flush=True)
            r = call_model(client, model["id"], p["texto"])
            results.append(r)
            gt = p["gt"]
            cat_ok  = "✓" if r.get("categoria") == gt["categoria"] else "✗"
            urg_ok  = "✓" if r.get("urgencia")  == gt["urgencia"]  else "✗"
            cost = (r["in_tok"] / 1e6) * model["price_in"] + (r["out_tok"] / 1e6) * model["price_out"]
            total_cost += cost
            print(f"cat{cat_ok} urg{urg_ok}  ${cost:.5f}  ({r['in_tok']}in/{r['out_tok']}out tok)")
            if i < len(PETITIONS) - 1:
                time.sleep(0.8)

        metrics = calc_metrics(results, model)
        metrics["results"] = results
        all_results[model["name"]] = metrics
        print(f"\n  → Resumen {model['name']}: cat={metrics['cat_acc']}% urg={metrics['urg_acc']}% HITL={metrics['hitl_recall']}%")

        if model != MODELS[-1]:
            time.sleep(1.5)

    print(f"\nCosto total experimento (Sonnet + Opus): ${total_cost:.4f} USD")
    print_results(all_results)


if __name__ == "__main__":
    main()
