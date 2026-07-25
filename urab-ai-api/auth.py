"""
Autenticación y control de acceso basado en roles (RBAC)
=========================================================
RFP §4.5 (control de acceso por roles) · Ley 1581 de 2012 (protección de datos)

MODELO DE ACCESO
----------------
Tres roles, con acceso estrictamente separado:

  - ciudadano   : consulta solo sus propias peticiones, con verificación de
                  titularidad (radicado + documento, o cédula + segundo factor).
                  No requiere cuenta: el acceso se verifica caso por caso.

  - funcionario : accede a la bandeja de los casos que le fueron repartidos.
                  Requiere autenticación.

  - coordinador : supervisa la operación, reasigna, audita. Requiere
                  autenticación con rol de coordinación.

MECANISMO
---------
Login con credencial → token de sesión firmado (HMAC-SHA256) que contiene el
rol, el identificador del profesional y una expiración. El token se verifica
en cada petición a un endpoint protegido. No se almacena estado de sesión en
el servidor: el token es autocontenido y verificable, y no puede falsificarse
sin la clave del servidor.

Este mecanismo es intencionalmente simple y explicable: un jurado de abogados
debe poder entender qué protege y cómo. No pretende ser un sistema de identidad
corporativo —eso correspondería a la integración con el directorio de la
entidad en producción—, sino demostrar que el control de acceso por roles está
diseñado y operativo, no ausente.

EN PRODUCCIÓN
-------------
El login se integraría con el directorio institucional de la Defensoría
(inicio de sesión único), y las credenciales de demostración se retirarían.
El mecanismo de token y la verificación de rol permanecen.
"""
import os
import hmac
import json
import time
import base64
import hashlib

# Clave de firma. En producción proviene del entorno; el valor por defecto
# solo sirve para la demostración.
SECRET = os.environ.get("URAB_AUTH_SECRET", "urab-lsl-2026-demo-secret").encode()
TOKEN_VIGENCIA_SEGUNDOS = int(os.environ.get("URAB_TOKEN_HORAS", "8")) * 3600


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def emitir_token(rol: str, profesional_id: str, nombre: str) -> str:
    """Genera un token de sesión firmado."""
    payload = {
        "rol": rol,
        "pid": profesional_id,
        "nombre": nombre,
        "exp": int(time.time()) + TOKEN_VIGENCIA_SEGUNDOS,
    }
    cuerpo = _b64(json.dumps(payload, separators=(",", ":")).encode())
    firma = _b64(hmac.new(SECRET, cuerpo.encode(), hashlib.sha256).digest())
    return f"{cuerpo}.{firma}"


def verificar_token(token: str) -> dict:
    """
    Verifica la firma y la vigencia del token.
    Devuelve el payload si es válido, o None si no lo es.
    """
    if not token or "." not in token:
        return None
    try:
        cuerpo, firma = token.rsplit(".", 1)
        esperada = _b64(hmac.new(SECRET, cuerpo.encode(), hashlib.sha256).digest())
        # Comparación en tiempo constante para no filtrar información por temporización.
        if not hmac.compare_digest(firma, esperada):
            return None
        payload = json.loads(_b64d(cuerpo))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


# ── Credenciales de demostración ───────────────────────────────────────
# En producción esto lo reemplaza el directorio institucional. El código de
# acceso se deriva del identificador del profesional; en un sistema real sería
# una contraseña gestionada por la entidad.
def codigo_demo(profesional_id: str) -> str:
    """Código de acceso de demostración, derivado del identificador."""
    return "urab-" + profesional_id.lower()


CREDENCIALES_DEMO = {
    # profesional_id : rol
    "P01": "funcionario",
    "P02": "funcionario",
    "P03": "funcionario",
    "P04": "funcionario",
    "P05": "funcionario",
    "COORD": "coordinador",
}


def autenticar(profesional_id: str, codigo: str, nombre: str = "") -> dict:
    """
    Valida credenciales de demostración y emite un token.
    Devuelve {token, rol, ...} o None si las credenciales no son válidas.
    """
    pid = (profesional_id or "").upper()
    rol = CREDENCIALES_DEMO.get(pid)
    if not rol:
        return None
    if codigo != codigo_demo(pid):
        return None
    token = emitir_token(rol, pid, nombre or pid)
    return {"token": token, "rol": rol, "profesional_id": pid, "nombre": nombre or pid,
            "vigencia_horas": TOKEN_VIGENCIA_SEGUNDOS // 3600}
