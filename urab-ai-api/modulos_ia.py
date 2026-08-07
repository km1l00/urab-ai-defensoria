"""
Agentes M1–M8 conectados al backend de producción
=================================================
Adapta el pipeline agéntico del proyecto inicial a esta versión: cada función
opera sobre el modelo ORM `Peticion` y la BD real, y llama al modelo a través
del punto de choque `ia.py` (que seudonimiza todo antes de enviarlo).

Activación por puertas (presupuesto cero): estas funciones GASTAN tokens solo
cuando se invocan explícitamente (M6 al aprobar HITL, M5/M8 bajo demanda, M4
solo si el prefiltro barato marcó candidato). Ninguna corre en cada radicación.
"""

import hashlib
from collections import Counter
from datetime import datetime

import ia
from anonimizacion import rehidratar


def _rehidratar_dict(d: dict, mapa: dict) -> dict:
    """Restaura valores reales en los campos de texto de una salida tool_use."""
    if not mapa:
        return d
    out = {}
    for k, v in d.items():
        if isinstance(v, str):
            out[k] = rehidratar(v, mapa)
        elif isinstance(v, list):
            out[k] = [rehidratar(x, mapa) if isinstance(x, str) else x for x in v]
        else:
            out[k] = v
    return out

SELLO_IA = (
    "⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL "
    "PROFESIONAL RESPONSABLE ANTES DE ENVIARSE AL CIUDADANO"
)


def _sha256(texto: str) -> str:
    return hashlib.sha256((texto or "").encode("utf-8")).hexdigest()


def _pii_de(p) -> list:
    """Identificadores del titular a seudonimizar antes de ir al modelo."""
    return [getattr(p, "ciudadano", ""), getattr(p, "cedula", ""),
            getattr(p, "contacto_valor", "")]


# ══════════════════════════════════════════════════════════════════════════════
# M6 — IA GENERATIVA (copilot jurídico): borrador de respuesta para revisión HITL
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_M6 = """Eres el asistente jurídico M6 de URAB-AI, Defensoría del Pueblo de Colombia.
Tu única función es generar un BORRADOR de respuesta para que el profesional humano lo
revise, edite y firme. NO emites la respuesta final. NO decides.

REGLAS ABSOLUTAS:
- Nunca inventes normas, sentencias ni resoluciones. Si citas, que sea verificable.
- Lenguaje jurídico colombiano claro y respetuoso, comprensible para el ciudadano.
- Máximo 300 palabras.
- El borrador debe: (1) acusar recibo y confirmar el radicado, (2) reconocer los
  hechos y el derecho involucrado, (3) explicar las gestiones que hará la Defensoría,
  (4) indicar tiempos según normativa y el canal de seguimiento.
- Si el caso es de urgencia crítica/alta o involucra NNA o VBG, redacta con el debido
  cuidado y deja claro que requiere revisión humana prioritaria.

Devuelve solo el texto del borrador, sin encabezados de sistema ni comillas."""


def generar_borrador_m6(p) -> dict:
    """
    Genera el borrador de respuesta del caso `p` (ORM Peticion).
    Requiere modelo disponible; lanza RuntimeError si no hay key (el endpoint lo
    traduce a 503). El borrador se rehidrata con los datos reales del ciudadano
    (el modelo solo vio marcadores).
    """
    if not ia.disponible():
        raise RuntimeError("Modelo no disponible: configure ANTHROPIC_API_KEY.")

    derechos = p.derechos_vulnerados or []
    gestiones = [g for g in (p.gestiones or []) if g.get("confirmada")]
    gestiones_txt = "\n".join(f"  - {g.get('accion')} (entidad: {g.get('entidad')})"
                              for g in gestiones) or "  (aún sin gestiones confirmadas)"

    user = f"""Genera el borrador de respuesta para esta petición:

Radicado: {p.radicado}
Tipo: {p.tipo_peticion or 'no confirmado'}
Categoría: {p.categoria or 'general'}
Urgencia: {p.urgencia or 'no clasificada'}
Entidad(es) referida(s): {', '.join(p.entidades or []) or 'no especificada'}
Derechos involucrados: {', '.join(derechos) or 'por determinar'}
Conducta que se cuestiona: {p.conducta_vulnera or 'no especificada'}
Profesional responsable: {p.profesional_nombre or 'profesional asignado'}

Gestiones confirmadas que la Defensoría realizará:
{gestiones_txt}

Relato del ciudadano:
{(p.texto_relato or '')[:800]}"""

    borrador_crudo = ia.completar_texto(
        SYSTEM_M6, user, pii=_pii_de(p), max_tokens=700, rehidratar_salida=True
    )

    borrador = f"{SELLO_IA}\n\n{'─'*60}\n\n{borrador_crudo.strip()}"
    fuentes = ["Plantillas institucionales URAB"] + list(derechos)

    return {
        "borrador_m6": borrador,
        "borrador_m6_hash": _sha256(borrador_crudo.strip()),
        "borrador_m6_fuentes": fuentes,
        "borrador_m6_estado": "generado",
        "borrador_m6_generado_en": datetime.utcnow(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# M5 — HISTORIAL UNIFICADO (vista 360° del ciudadano)
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_M5 = """Eres el agente M5 de URAB-AI, análisis de historial del ciudadano.
Recibes el historial de peticiones de una persona y llamas a la herramienta
analizar_historial. Detecta patrón de recurrencia, si hay vulneración sistemática
(3+ peticiones del mismo derecho sin resolución) y sugiere una línea de respuesta
coherente. Lenguaje institucional. No menciones datos personales sensibles."""

TOOL_M5 = {
    "name": "analizar_historial",
    "description": "Genera la vista 360° del ciudadano para el profesional.",
    "input_schema": {
        "type": "object",
        "properties": {
            "resumen_ejecutivo": {"type": "string", "description": "3-4 oraciones para el profesional"},
            "patron_recurrencia": {"type": "string", "enum": [
                "primera_vez", "seguimiento_caso_activo", "recurrente_mismo_asunto",
                "recurrente_multiples_asuntos", "escalada_urgencia"]},
            "alerta_vulneracion_sistematica": {"type": "boolean"},
            "descripcion_alerta": {"type": ["string", "null"]},
            "sugerencia_linea_respuesta": {"type": "string"},
        },
        "required": ["resumen_ejecutivo", "patron_recurrencia",
                     "alerta_vulneracion_sistematica", "descripcion_alerta",
                     "sugerencia_linea_respuesta"],
    },
}


def _resumen_historial(previas: list) -> dict:
    """Estadística estructurada del historial (sin LLM, siempre disponible)."""
    tematicas = Counter(r.get("categoria", "") for r in previas)
    urgentes = sum(1 for r in previas if r.get("urgencia") in ("critica", "alta"))
    fechas = sorted(f for f in (r.get("fecha") for r in previas) if f)
    return {
        "total_previas": len(previas),
        "tematicas": dict(tematicas.most_common(5)),
        "urgentes": urgentes,
        "primera": fechas[0] if fechas else None,
        "ultima": fechas[-1] if fechas else None,
        "radicados": [r.get("radicado") for r in previas],
    }


def analizar_historial_360(actual, previas: list) -> dict:
    """
    Vista 360° del ciudadano. Devuelve siempre la parte estructurada (gratis,
    desde la BD); enriquece con análisis del modelo solo si hay key (gated).

    Args:
        actual: ORM Peticion en curso (para PII y contexto).
        previas: lista de dicts {radicado, fecha, categoria, urgencia, estado, texto}.
    """
    resumen = _resumen_historial(previas)
    if not previas:
        return {"total": 0, "es_primera_vez": True,
                "resumen_estructurado": resumen, "analisis_ia": None}

    if not ia.disponible():
        return {"total": len(previas), "es_primera_vez": False,
                "resumen_estructurado": resumen, "analisis_ia": None,
                "nota": "Análisis del modelo no disponible (sin key); se muestra el historial estructurado."}

    muestra = "\n".join(
        f"- {r.get('radicado')} ({r.get('fecha')}): {r.get('categoria')} · "
        f"{r.get('urgencia')} · {r.get('estado')} · {(r.get('texto') or '')[:160]}"
        for r in previas[:8]
    )
    user = f"""Historial del ciudadano (radicado actual: {actual.radicado}):

Estadísticas: {resumen['total_previas']} peticiones previas · {resumen['urgentes']} urgentes ·
temáticas {resumen['tematicas']} · periodo {resumen['primera']} → {resumen['ultima']}

Peticiones previas:
{muestra}

Petición actual: {(actual.texto_relato or '')[:400]}"""

    salida = ia.completar_tool(SYSTEM_M5, user, TOOL_M5,
                               pii=_pii_de(actual), max_tokens=600)
    analisis = _rehidratar_dict(salida["_input"], salida["_mapa"])
    return {"total": len(previas), "es_primera_vez": False,
            "resumen_estructurado": resumen, "analisis_ia": analisis}


# ══════════════════════════════════════════════════════════════════════════════
# M4 — ANTI-DUPLICIDAD (verificación semántica; refina el prefiltro heurístico)
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_M4 = """Eres el agente M4 de URAB-AI, verificación de duplicados.
Recibes dos peticiones que un prefiltro marcó como similares. Llama a la
herramienta verificar_duplicado. Son duplicado si cumplen 2 de 3: mismo hecho,
misma pretensión, misma entidad. Una petición de SEGUIMIENTO no es duplicado.
La decisión final de acumular la toma el profesional (HITL)."""

TOOL_M4 = {
    "name": "verificar_duplicado",
    "input_schema": {
        "type": "object",
        "properties": {
            "es_duplicado": {"type": "string", "enum": ["duplicado", "posible", "no_duplicado"]},
            "similitud": {"type": "number"},
            "justificacion": {"type": "string"},
        },
        "required": ["es_duplicado", "similitud", "justificacion"],
    },
    "description": "Verifica semánticamente si dos peticiones son el mismo caso.",
}


def verificar_duplicado_llm(actual, candidato_texto: str, candidato_radicado: str) -> dict:
    """Confirma semánticamente un candidato a duplicado detectado por el prefiltro
    heurístico. Solo se llama si hay candidato y hay key (gated)."""
    if not ia.disponible():
        return {}
    user = f"""PETICIÓN NUEVA ({actual.radicado}):
{(actual.texto_relato or '')[:500]}

PETICIÓN EXISTENTE ({candidato_radicado}):
{(candidato_texto or '')[:500]}

¿Se refieren a los mismos hechos?"""
    salida = ia.completar_tool(SYSTEM_M4, user, TOOL_M4,
                               pii=_pii_de(actual), max_tokens=400)
    return _rehidratar_dict(salida["_input"], salida["_mapa"])


# ══════════════════════════════════════════════════════════════════════════════
# M8 — ANALÍTICA (vulneración sistemática + resumen ejecutivo)
# ══════════════════════════════════════════════════════════════════════════════

def detectar_vulneracion_sistematica(rows: list) -> list:
    """Sin LLM: temáticas con alta proporción de urgentes y volumen suficiente.
    rows: lista de dicts {categoria, urgencia}."""
    data: dict = {}
    for r in rows:
        t = r.get("categoria") or "General"
        d = data.setdefault(t, {"total": 0, "urgentes": 0})
        d["total"] += 1
        if r.get("urgencia") in ("critica", "alta"):
            d["urgentes"] += 1
    alertas = []
    for t, d in data.items():
        pct = d["urgentes"] / max(d["total"], 1) * 100
        # Umbral adaptado al volumen del MVP (corpus de demostración).
        if pct >= 40 and d["total"] >= 3:
            alertas.append({
                "tematica": t, "total_casos": d["total"], "casos_urgentes": d["urgentes"],
                "pct_urgentes": round(pct, 1),
                "recomendacion": f"Revisar patrón de urgencia sostenida en '{t}' — posible vulneración sistemática.",
            })
    return sorted(alertas, key=lambda x: -x["pct_urgentes"])


SYSTEM_M8 = """Eres el agente M8 de analítica institucional de URAB-AI. Recibes
métricas agregadas del período y llamas a resumen_ejecutivo. Usa solo datos
agregados, nunca ciudadanos individuales. Máximo 4 frases. Señala metas en riesgo."""

TOOL_M8 = {
    "name": "resumen_ejecutivo",
    "input_schema": {
        "type": "object",
        "properties": {
            "resumen": {"type": "string"},
            "hallazgos": {"type": "array", "items": {"type": "string"}},
            "metas_en_riesgo": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["resumen", "hallazgos", "metas_en_riesgo"],
    },
    "description": "Resumen ejecutivo del período para la dirección.",
}


def resumen_ejecutivo_m8(metricas: dict) -> dict:
    """Resumen ejecutivo del dashboard (gated). Las métricas ya son agregadas, no
    hay PII, pero igual pasan por el punto de choque."""
    if not ia.disponible():
        return {}
    import json as _json
    user = "Métricas agregadas del período:\n" + _json.dumps(metricas, ensure_ascii=False, indent=2)
    salida = ia.completar_tool(SYSTEM_M8, user, TOOL_M8, max_tokens=500)
    return salida["_input"]


# ══════════════════════════════════════════════════════════════════════════════
# M3 — REPARTO: justificación XAI (una frase legible para el expediente)
# ══════════════════════════════════════════════════════════════════════════════

def justificar_reparto_m3(profesional_nombre: str, especialidades: list,
                          categoria: str, urgencia: str, carga: int) -> str:
    """Justificación del reparto. Determinista por defecto; si hay key, la redacta
    el modelo en lenguaje institucional (no lleva PII, no se seudonimiza)."""
    base = (f"Asignado a {profesional_nombre} por especialidad en {categoria} "
            f"y menor carga relativa ({carga} casos activos); urgencia {urgencia}.")
    if not ia.disponible():
        return base
    try:
        system = ("Redacta en una o dos frases, lenguaje institucional, por qué se "
                  "asignó este caso a este profesional. No menciones 'IA' ni 'algoritmo'; "
                  "di 'el sistema de reparto'.")
        return ia.completar_texto(system, base, max_tokens=150).strip() or base
    except Exception:
        return base
