# -*- coding: utf-8 -*-
"""
Benchmark reproducible del clasificador de urgencia (M2)
========================================================
Compara tres configuraciones sobre el mismo conjunto etiquetado a mano:
  - Clasificador local determinista (reglas, sin costo ni red).
  - Orquestador agéntico con Haiku 4.5 (el desplegado por defecto).
  - Orquestador agéntico con Sonnet 5.

Mide exactitud (match exacto de urgencia sobre 4 clases) y recall en las
críticas (riesgo vital detectado + revisión humana activada). Sostiene las
cifras del anexo técnico. Resultado guardado en benchmark_resultado.json.

USO
---
    export ANTHROPIC_API_KEY="sk-ant-..."
    python gobernanza/benchmark_modelos.py

Solo las dos configuraciones con modelo gastan tokens (~40 llamadas). El
clasificador local es gratuito y determinista.
"""
import os
import sys
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "urab-ai-api"
sys.path.insert(0, str(API))

KEY = os.getenv("ANTHROPIC_API_KEY")
if not KEY:
    print("Falta ANTHROPIC_API_KEY en el entorno. Exporte la clave y reintente.")
    sys.exit(1)

import anthropic
import agentes.orquestador as orq
from main import clasificar_urgencia  # clasificador local determinista (mismo código que corre en producción)

HAIKU = "claude-haiku-4-5-20251001"
SONNET = "claude-sonnet-5"


# Extracción de texto robusta: Sonnet devuelve bloques de "thinking"; se toman
# solo los bloques de texto. Sin esto, leer content[0].text falla con Sonnet.
def _llamar_robusto(system, user, max_tokens=1000, pii=()):
    user_seguro, mapa = orq.seudonimizar(user, pii or ())
    resp = orq.client.messages.create(
        model=orq.MODEL_DEFAULT, max_tokens=max(max_tokens, 2000),
        system=system, messages=[{"role": "user", "content": user_seguro}])
    txt = "".join(getattr(b, "text", "") for b in resp.content if getattr(b, "type", None) == "text")
    return orq.rehidratar(txt, mapa)


orq.llamar_claude = _llamar_robusto

# ── Conjunto etiquetado (gravedad conocida, criterio del equipo) ───────────
CASOS = [
    ("Mi expareja me amenaza con matarme, ayer llego armado a mi casa.", "critica"),
    ("Mi hija de 15 anos desaparecio hace dos dias y no contesta.", "critica"),
    ("Un hombre me secuestro y me tiene retenida contra mi voluntad.", "critica"),
    ("Fui victima de violencia sexual anoche y necesito ayuda urgente.", "critica"),
    ("Me estan torturando en el sitio donde estoy detenido.", "critica"),
    ("Estoy privado de libertad, hay hacinamiento y llevamos un mes sin atencion medica.", "alta"),
    ("Nos van a desalojar manana sin orden judicial y tengo tres hijos menores.", "alta"),
    ("La EPS me nego la quimioterapia y mi cancer esta avanzando.", "alta"),
    ("Soy migrante, no tengo donde dormir ni comida y estoy enfermo.", "alta"),
    ("Mi papa adulto mayor lleva dias sin atencion medica y se esta deteriorando.", "alta"),
    ("La EPS me nego un medicamento para la hipertension, llevo dos semanas sin el.", "media"),
    ("Solicite una cita con el especialista hace un mes y no me la asignan.", "media"),
    ("Colpensiones no ha resuelto mi solicitud de pension hace cuatro meses.", "media"),
    ("La constructora incumplio el contrato de mi vivienda y no responde.", "media"),
    ("No me han pagado las cesantias y la empresa no da respuesta.", "media"),
    ("Quiero saber cuales son los requisitos para presentar una tutela.", "baja"),
    ("Necesito informacion sobre el horario de atencion de la Defensoria.", "baja"),
    ("Como puedo consultar el estado de una peticion que radique?", "baja"),
    ("Quisiera orientacion general sobre mis derechos como consumidor.", "baja"),
    ("Donde puedo obtener una copia de mi documento de identidad?", "baja"),
]
CLASES = ["critica", "alta", "media", "baja"]


def eval_local():
    return [(clasificar_urgencia(t)["urgencia"], bool(clasificar_urgencia(t).get("requiere_hitl")))
            for t, _ in CASOS]


def eval_modelo(model_id):
    orq.MODEL_DEFAULT = model_id
    orq.client = anthropic.Anthropic(api_key=KEY)
    pred = []
    for texto, _ in CASOS:
        p = orq.Peticion(radicado="BM", texto_narrativo=texto, canal="web")
        try:
            p = orq.modulo_m2_triage(p)
            u = p.urgencia.value if hasattr(p.urgencia, "value") else str(p.urgencia)
            pred.append((u, bool(p.hitl_requerido)))
        except Exception as e:
            pred.append(("error", False)); print("  err:", str(e)[:70])
        time.sleep(0.3)
    return pred


def metricas(pred):
    n = len(CASOS)
    exact = sum(1 for (u, _), (t, exp) in zip(pred, CASOS) if u == exp)
    crit = [i for i, (t, exp) in enumerate(CASOS) if exp == "critica"]
    crit_ok = sum(1 for i in crit if pred[i][0] == "critica" and pred[i][1])
    return {"exactitud_pct": round(exact / n * 100, 1), "aciertos": exact, "n": n,
            "recall_criticas_pct": round(crit_ok / len(crit) * 100, 1),
            "criticas_ok": crit_ok, "criticas_n": len(crit)}


def main():
    print(">>> Local"); pl = eval_local(); ml = metricas(pl)
    print(">>> Haiku 4.5"); ph = eval_modelo(HAIKU); mh = metricas(ph)
    print(">>> Sonnet 5"); ps = eval_modelo(SONNET); ms = metricas(ps)
    print("\n" + "=" * 64)
    print(f"{'Configuracion':<30}{'Exactitud':>12}{'Recall crit.':>14}")
    print("-" * 64)
    for name, m in [("Clasificador local", ml), ("Haiku 4.5 (desplegado)", mh), ("Sonnet 5", ms)]:
        print(f"{name:<30}{str(m['exactitud_pct'])+'%':>12}{str(m['recall_criticas_pct'])+'%':>14}")
    print("=" * 64)
    print(f"N={ml['n']} casos ({ml['criticas_n']} criticas) - 4 clases - match exacto")
    out = {"n": len(CASOS), "clases": CLASES, "local": ml, "haiku_4_5": mh, "sonnet_5": ms,
           "detalle": [{"texto": t, "esperado": e, "local": pl[i][0], "haiku": ph[i][0], "sonnet": ps[i][0]}
                       for i, (t, e) in enumerate(CASOS)]}
    dest = Path(__file__).parent / "benchmark_resultado.json"
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("guardado", dest.name)


if __name__ == "__main__":
    main()
