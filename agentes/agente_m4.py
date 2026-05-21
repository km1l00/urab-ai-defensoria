"""
AGENTE M4 — Anti-duplicidad
Defensoría del Pueblo · URAB · LSL 2026

Responsabilidades:
  1. Detecta peticiones duplicadas del mismo ciudadano aunque
     estén escritas con palabras completamente distintas
  2. Calcula similitud en dos etapas:
     - Etapa 1 (rápida): TF-IDF + cosine similarity — filtra candidatos
     - Etapa 2 (semántica): LLM verifica si los candidatos son realmente
       la misma petición (mismo hecho, misma pretensión)
  3. Sugiere acumulación de expedientes con justificación XAI
     (la decisión final siempre es del profesional — HITL)
  4. Meta piloto: Recall ≥85%, Falsos positivos ≤8%

Marco legal:
  - Directiva 007/2025: M4 es SDA — XAI obligatorio, canal de impugnación
  - Art. 29 CP: trazabilidad de toda decisión automatizada

Arquitectura producción: pgvector + embeddings multilingual
Arquitectura MVP: TF-IDF + LLM para verificación semántica
"""

import json
import math
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Optional
from collections import Counter

sys.path.insert(0, str(Path(__file__).parent.parent))
import anthropic
from config import ANTHROPIC_API_KEY, MODEL_DEFAULT, MAX_TOKENS_M2

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY or None)
MODEL  = MODEL_DEFAULT

# ── UMBRALES CONFIGURABLES (config.py en producción) ─────────────────────────
UMBRAL_TFIDF    = 0.35   # similitud mínima TF-IDF para pasar a etapa LLM
UMBRAL_SEMANTICO = 0.75  # similitud semántica mínima para sugerir acumulación
UMBRAL_ALERTA   = 0.90   # similitud muy alta → alerta de duplicado casi seguro

# ── STOPWORDS ESPAÑOL (básicas) ───────────────────────────────────────────────
STOPWORDS_ES = {
    "de","la","el","en","y","a","los","del","se","las","un","por","con","una",
    "para","es","al","lo","como","más","o","pero","sus","le","ya","o","fue",
    "este","ha","me","si","sin","sobre","ser","tiene","mi","muy","señores",
    "buenos","buenas","días","tardes","quiero","necesito","hola","favor",
    "gracias","usted","que","no","su","les","nos","porque","cuando","donde",
    "también","he","era","hay","han","son","está","estoy","tengo","debo",
    "puede","hacer","tiene","todo","esto","eso","así","bien","entre","desde",
}

# ── TF-IDF SIMPLE ────────────────────────────────────────────────────────────
def _tokenizar(texto: str) -> list[str]:
    texto = texto.lower()
    texto = re.sub(r'[^a-záéíóúüñ\s]', ' ', texto)
    tokens = [t for t in texto.split() if len(t) > 2 and t not in STOPWORDS_ES]
    return tokens

def _tf(tokens: list[str]) -> dict[str, float]:
    c = Counter(tokens)
    total = len(tokens) or 1
    return {t: n/total for t, n in c.items()}

def _idf(corpus_tokens: list[list[str]]) -> dict[str, float]:
    N = len(corpus_tokens)
    df: dict[str, int] = {}
    for tokens in corpus_tokens:
        for t in set(tokens):
            df[t] = df.get(t, 0) + 1
    return {t: math.log((N + 1) / (d + 1)) + 1 for t, d in df.items()}

def _tfidf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    tf_vals = _tf(tokens)
    return {t: tf_vals[t] * idf.get(t, 1.0) for t in tf_vals}

def _cosine(v1: dict, v2: dict) -> float:
    keys = set(v1) & set(v2)
    if not keys:
        return 0.0
    dot   = sum(v1[k] * v2[k] for k in keys)
    norm1 = math.sqrt(sum(v ** 2 for v in v1.values()))
    norm2 = math.sqrt(sum(v ** 2 for v in v2.values()))
    return dot / (norm1 * norm2) if norm1 * norm2 else 0.0

# ── SYSTEM PROMPT M4 ─────────────────────────────────────────────────────────
SYSTEM_M4 = """Eres el Agente M4 de Anti-duplicidad de la Defensoría del Pueblo (URAB).
Recibes dos peticiones ciudadanas que el sistema detectó como posiblemente duplicadas.
Debes llamar a la herramienta `verificar_duplicado` para determinar si son el mismo caso.

CRITERIOS DE DUPLICADO (deben cumplirse al menos 2 de 3):
1. MISMO HECHO: los hechos descritos refieren al mismo evento o situación.
2. MISMA PRETENSIÓN: el ciudadano pide básicamente lo mismo en ambas.
3. MISMA ENTIDAD REFERIDA: se menciona la misma entidad o actor responsable.

IMPORTANTE:
- Una petición de seguimiento sobre un caso anterior NO es duplicado — es continuación.
- Dos quejas sobre la misma entidad por hechos DISTINTOS NO son duplicados.
- Si hay duda (confianza < 0.75), marca como "posible" para revisión humana.
- La decisión final de acumulación SIEMPRE la toma el profesional (HITL)."""

TOOL_M4 = {
    "name": "verificar_duplicado",
    "description": "Determina si dos peticiones son duplicadas y genera la justificación XAI.",
    "input_schema": {
        "type": "object",
        "properties": {
            "es_duplicado": {
                "type": "string",
                "description": "Resultado de la verificación semántica",
                "enum": ["duplicado", "posible", "no_duplicado"]
            },
            "criterios_cumplidos": {
                "type": "array",
                "items": {"type": "string", "enum": ["mismo_hecho", "misma_pretension", "misma_entidad"]},
                "description": "Lista de criterios de duplicado que se cumplen"
            },
            "similitud_semantica": {
                "type": "number",
                "description": "Similitud semántica estimada por el modelo (0.0 - 1.0)"
            },
            "justificacion_xai": {
                "type": "string",
                "description": "Explicación en lenguaje institucional de por qué son o no duplicados"
            },
            "recomendacion": {
                "type": "string",
                "description": "Acción sugerida al profesional",
                "enum": [
                    "Acumular expedientes",
                    "Revisar antes de acumular",
                    "Mantener como expedientes independientes"
                ]
            },
            "radicado_principal": {
                "type": ["string", "null"],
                "description": "Radicado más antiguo o más completo que debería ser el principal. null si no aplica."
            }
        },
        "required": [
            "es_duplicado", "criterios_cumplidos", "similitud_semantica",
            "justificacion_xai", "recomendacion", "radicado_principal"
        ]
    }
}

# ── FUNCIÓN PRINCIPAL: verificar par ─────────────────────────────────────────
def verificar_par_m4(
    radicado_a: str,
    texto_a: str,
    radicado_b: str,
    texto_b: str,
    similitud_tfidf: float = 0.0,
) -> dict:
    """
    Verifica semánticamente si dos peticiones son duplicadas.

    Args:
        radicado_a/b:    IDs de los casos a comparar.
        texto_a/b:       Textos de las peticiones.
        similitud_tfidf: Similitud TF-IDF previa (para contexto).

    Returns:
        dict con resultado de verificación + XAI.
    """
    prompt = f"""Petición A (radicado {radicado_a}):
{texto_a[:600]}

---

Petición B (radicado {radicado_b}):
{texto_b[:600]}

---
Similitud textual preliminar (TF-IDF): {similitud_tfidf:.0%}
"""

    respuesta = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=SYSTEM_M4,
        tools=[TOOL_M4],
        tool_choice={"type": "tool", "name": "verificar_duplicado"},
        messages=[{"role": "user", "content": prompt}]
    )

    resultado = {}
    for bloque in respuesta.content:
        if bloque.type == "tool_use":
            resultado = bloque.input
            break

    return {
        "radicado_a":         radicado_a,
        "radicado_b":         radicado_b,
        "similitud_tfidf":    round(similitud_tfidf, 3),
        "similitud_semantica": resultado.get("similitud_semantica"),
        "es_duplicado":       resultado.get("es_duplicado"),
        "criterios_cumplidos": resultado.get("criterios_cumplidos", []),
        "recomendacion":      resultado.get("recomendacion"),
        "radicado_principal": resultado.get("radicado_principal"),
        "justificacion_xai":  resultado.get("justificacion_xai"),
        "requiere_hitl":      resultado.get("es_duplicado") in ["duplicado", "posible"],
        "timestamp":          datetime.now().isoformat(),
        "m4_tokens":          respuesta.usage.input_tokens + respuesta.usage.output_tokens,
    }


# ── FUNCIÓN BATCH: escanear corpus ───────────────────────────────────────────
def escanear_duplicados_m4(
    peticiones: list[dict],
    col_texto: str = "hechos",
    col_id: str = "radicado",
    col_cedula: Optional[str] = None,
    max_pares_llm: int = 20,
) -> dict:
    """
    Escanea un lote de peticiones y detecta posibles duplicados.

    Estrategia:
      1. Calcula TF-IDF para todo el corpus
      2. Compara todos los pares (n²/2) con cosine similarity
      3. Los pares con similitud ≥ UMBRAL_TFIDF pasan a verificación LLM
      4. Limita las llamadas LLM a max_pares_llm (más costoso)

    Args:
        peticiones:    Lista de dicts con los datos del CSV.
        col_texto:     Nombre de la columna de texto.
        col_id:        Nombre de la columna de radicado/ID.
        col_cedula:    Columna de cédula (si existe — prioriza comparación mismo ciudadano).
        max_pares_llm: Máximo de pares que pasan a verificación LLM.

    Returns:
        dict con pares verificados y métricas de recall/precisión estimadas.
    """
    n = len(peticiones)
    print(f"  [M4] Calculando TF-IDF para {n} peticiones...")

    # Construir corpus tokenizado
    corpus = []
    ids    = []
    for p in peticiones:
        texto = p.get(col_texto, "") or ""
        corpus.append(_tokenizar(texto))
        ids.append(p.get(col_id, f"IDX-{len(ids)}"))

    idf = _idf(corpus)
    vectores = [_tfidf_vector(tok, idf) for tok in corpus]

    # Encontrar pares candidatos con TF-IDF
    candidatos = []
    for i in range(n):
        for j in range(i + 1, n):
            sim = _cosine(vectores[i], vectores[j])
            if sim >= UMBRAL_TFIDF:
                # Priorizar si mismo ciudadano (si hay cédula)
                mismo_ciudadano = False
                if col_cedula:
                    ced_i = peticiones[i].get(col_cedula, "")
                    ced_j = peticiones[j].get(col_cedula, "")
                    mismo_ciudadano = bool(ced_i and ced_i == ced_j)
                candidatos.append({
                    "i": i, "j": j,
                    "sim_tfidf": sim,
                    "mismo_ciudadano": mismo_ciudadano,
                })

    # Ordenar: mismo ciudadano primero, luego por similitud desc
    candidatos.sort(key=lambda x: (-int(x["mismo_ciudadano"]), -x["sim_tfidf"]))

    total_candidatos = len(candidatos)
    candidatos_llm   = candidatos[:max_pares_llm]

    print(f"  [M4] {total_candidatos} pares candidatos (TF-IDF ≥{UMBRAL_TFIDF:.0%})")
    print(f"  [M4] Verificando {len(candidatos_llm)} pares con LLM...")

    # Verificación semántica LLM
    resultados = []
    for k, par in enumerate(candidatos_llm, 1):
        i, j = par["i"], par["j"]
        texto_a = peticiones[i].get(col_texto, "")
        texto_b = peticiones[j].get(col_texto, "")
        print(f"       Par {k}/{len(candidatos_llm)}: {ids[i]} ↔ {ids[j]} (TF-IDF {par['sim_tfidf']:.0%})")

        verificacion = verificar_par_m4(
            radicado_a=ids[i],
            texto_a=texto_a,
            radicado_b=ids[j],
            texto_b=texto_b,
            similitud_tfidf=par["sim_tfidf"],
        )
        verificacion["mismo_ciudadano"] = par["mismo_ciudadano"]
        resultados.append(verificacion)

    # Métricas del batch
    duplicados_confirmados = [r for r in resultados if r["es_duplicado"] == "duplicado"]
    posibles               = [r for r in resultados if r["es_duplicado"] == "posible"]
    no_duplicados          = [r for r in resultados if r["es_duplicado"] == "no_duplicado"]

    metricas = {
        "total_peticiones":        n,
        "pares_candidatos_tfidf":  total_candidatos,
        "pares_verificados_llm":   len(candidatos_llm),
        "duplicados_confirmados":  len(duplicados_confirmados),
        "posibles_duplicados":     len(posibles),
        "no_duplicados":           len(no_duplicados),
        "tasa_duplicados_dataset": round(len(duplicados_confirmados) / n * 100, 1),
        "pares_no_verificados":    total_candidatos - len(candidatos_llm),
    }

    return {
        "pares_verificados": resultados,
        "metricas":          metricas,
        "timestamp":         datetime.now().isoformat(),
    }


# ── TEST RÁPIDO ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== TEST AGENTE M4 — verificación de par ===\n")

    texto_a = (
        "Señores necesito ayuda urgente. Mi pareja me ha agredido varias veces "
        "y fui a poner la denuncia en la Fiscalía pero me dijeron que volviera "
        "después porque no había personal. Tengo dos hijos pequeños."
    )
    texto_b = (
        "Buenas tardes. Ya puse una queja hace unos días por lo mismo pero nadie "
        "me ha contactado. La Fiscalía no me quiso tomar la denuncia por violencia "
        "doméstica. Mis hijos y yo estamos en peligro y necesito que me ayuden."
    )
    texto_c = (
        "Quiero quejarme porque la EPS Sura no me ha autorizado el medicamento "
        "que necesito para mi tratamiento de hipertensión. Llevo 3 meses esperando."
    )

    print("PAR 1 (probable duplicado — misma petición reescrita):")
    r1 = verificar_par_m4("TEST-001", texto_a, "TEST-002", texto_b)
    print(f"  Resultado: {r1['es_duplicado']} | Semántica: {r1['similitud_semantica']:.0%}")
    print(f"  Recomendación: {r1['recomendacion']}")
    print(f"  XAI: {r1['justificacion_xai']}\n")

    print("PAR 2 (no duplicado — temáticas distintas):")
    r2 = verificar_par_m4("TEST-001", texto_a, "TEST-003", texto_c)
    print(f"  Resultado: {r2['es_duplicado']} | Semántica: {r2['similitud_semantica']:.0%}")
    print(f"  Recomendación: {r2['recomendacion']}")
    print(f"  XAI: {r2['justificacion_xai']}\n")
