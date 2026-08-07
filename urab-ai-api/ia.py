"""
Punto de choque único con el modelo de lenguaje
================================================
TODA llamada a la API de Anthropic pasa por aquí. Antes de enviar el prompt,
el texto se seudonimiza (anonimizacion.seudonimizar); las salidas destinadas a
un humano pueden rehidratarse. Así ningún identificador viaja en claro y hay un
solo lugar donde auditar el tratamiento de datos (Ley 1581/2012, ISO 42001).

Uso:
    from ia import completar_texto, completar_tool, disponible

    texto = completar_texto(system, user, pii=[nombre, cedula, contacto])
    datos = completar_tool(system, user, TOOL, pii=[...])   # salida estructurada
"""

import os
import logging

from anonimizacion import seudonimizar, rehidratar, contiene_pii

log = logging.getLogger("urab.ia")

MODEL = os.getenv("URAB_MODEL", "claude-haiku-4-5-20251001")
_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

try:
    import anthropic
    _client = anthropic.Anthropic(api_key=_API_KEY or None)
except Exception:  # pragma: no cover - anthropic siempre está en requirements
    anthropic = None
    _client = None


def disponible() -> bool:
    """True si hay key y cliente — permite que los módulos degraden a modo local."""
    return bool(_API_KEY) and _client is not None


def _preparar(user: str, pii) -> tuple[str, dict]:
    """Seudonimiza el prompt de usuario y verifica (defensa en profundidad)."""
    seguro, mapa = seudonimizar(user, pii or ())
    if contiene_pii(seguro):
        # No abortamos la operación, pero lo dejamos en el log de auditoría:
        # indica un identificador con un formato que el patrón no cubrió.
        log.warning("Posible PII residual en prompt tras seudonimización.")
    return seguro, mapa


def completar_texto(
    system: str,
    user: str,
    pii=(),
    max_tokens: int = 1000,
    rehidratar_salida: bool = False,
) -> str:
    """
    Llamada de texto libre. Seudonimiza `user` antes de enviarlo.

    Args:
        pii: valores del expediente a seudonimizar por coincidencia exacta
             (nombre, cédula, contacto), además del regex.
        rehidratar_salida: si True, restaura los valores reales en la respuesta
             (para salidas que verá un humano, p. ej. el borrador de M6).
    """
    if not disponible():
        raise RuntimeError("Modelo no disponible: falta ANTHROPIC_API_KEY.")
    user_seguro, mapa = _preparar(user, pii)
    resp = _client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_seguro}],
    )
    salida = resp.content[0].text if resp.content else ""
    return rehidratar(salida, mapa) if rehidratar_salida else salida


def completar_tool(
    system: str,
    user: str,
    tool: dict,
    pii=(),
    max_tokens: int = 1000,
) -> dict:
    """
    Llamada con salida estructurada (tool_use forzado). Seudonimiza `user` antes
    de enviarlo. Devuelve el dict `input` de la herramienta (los marcadores
    permanecen en los campos de texto; el llamador rehidrata si lo mostrará).
    """
    if not disponible():
        raise RuntimeError("Modelo no disponible: falta ANTHROPIC_API_KEY.")
    user_seguro, mapa = _preparar(user, pii)
    resp = _client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        tools=[tool],
        tool_choice={"type": "tool", "name": tool["name"]},
        messages=[{"role": "user", "content": user_seguro}],
    )
    for bloque in resp.content:
        if bloque.type == "tool_use" and bloque.name == tool["name"]:
            return {"_input": dict(bloque.input), "_mapa": mapa}
    return {"_input": {}, "_mapa": mapa}
