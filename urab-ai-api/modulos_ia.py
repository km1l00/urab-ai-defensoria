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
from datetime import datetime

import ia

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
