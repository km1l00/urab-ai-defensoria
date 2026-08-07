"""
Capa de seudonimización on-premise (privacidad por diseño)
==========================================================
Ley 1581/2012 · GDPR (Reg. UE 2016/679) Art. 4(5) seudonimización ·
ISO/IEC 27001/42001 · Directiva 007/2025

QUÉ RESUELVE
------------
Ningún dato personal identificable (cédula, nombre, dirección, teléfono,
correo) debe salir del backend hacia la API del modelo de lenguaje en claro.
Este módulo reemplaza esos identificadores por marcadores estables
(`[CEDULA_1]`, `[NOMBRE_1]`, …) ANTES de construir el prompt que se envía a
Claude, y permite REHIDRATAR (restaurar los valores reales) en las salidas
que verá un humano —por ejemplo el borrador de M6— sin que el modelo haya
llegado a ver nunca el dato real.

Es la tercera capa del esquema de mitigación (anonimización técnica previa al
envío). Es independiente del DPA: opera aunque no exista contrato de zero
data retention, y reduce el dato que se expone incluso si el contrato existe.

ESTRATEGIA (de mayor a menor precisión)
---------------------------------------
1. Términos CONOCIDOS del expediente (nombre del titular, cédula, dato de
   contacto): se reemplazan por coincidencia exacta — es la vía más fiable.
2. Patrones REGEX sobre el texto libre: correos, teléfonos, cédulas embebidas,
   direcciones. Captura identificadores que el ciudadano escribió en el relato.

LÍMITE CONOCIDO (riesgo residual — ver registro de riesgos ISO §6.1)
--------------------------------------------------------------------
Nombres de terceros escritos en el relato que no coinciden con el titular
registrado no se detectan por regex (harían falta NER, que a su vez usaría el
modelo). Se documenta como riesgo residual con monitoreo semestral. La
transcripción de documentos por Vision (imagen → texto) es el otro punto donde
el dato viaja en claro y no puede seudonimizarse antes: se aplica el acuerdo de
retención y se documenta.
"""

import re
from typing import Iterable

# ── PATRONES ──────────────────────────────────────────────────────────────────
# Correo electrónico.
_RE_CORREO = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# Teléfono móvil colombiano: opcional +57 / 57, luego un 3 y 9 dígitos más.
# Acepta separadores por espacio o guion (300 123 4567, 300-123-4567).
_RE_CELULAR = re.compile(r"(?:\+?57[\s\-]?)?3\d{2}[\s\-]?\d{3}[\s\-]?\d{4}\b")

# Fijo (7 dígitos) o indicativo + fijo — se aplica después del celular.
_RE_FIJO = re.compile(r"\b(?:\+?57[\s\-]?)?(?:60[1-8][\s\-]?)?\d{3}[\s\-]?\d{4}\b")

# Cédula: 6 a 10 dígitos, con o sin separadores de miles por punto.
# (52.847.193  |  52847193  |  1.234.567)
_RE_CEDULA = re.compile(r"\b\d{1,3}(?:\.\d{3}){1,3}\b|\b\d{6,10}\b")

# Dirección urbana colombiana (best-effort).
_RE_DIRECCION = re.compile(
    r"\b(?:calle|cll?|carrera|cra|kr|avenida|av|autopista|diagonal|diag|dg|"
    r"transversal|tv|tr|manzana|mz)\.?\s*\d+[A-Za-z]?"
    r"(?:\s*(?:#|no\.?|n°|nro\.?)?\s*\d+[A-Za-z]?(?:\s*-\s*\d+)?)?",
    re.IGNORECASE,
)

# El radicado (DP-2026-004821) NO es dato personal y debe preservarse: se
# protege enmascarándolo temporalmente antes de correr los patrones numéricos.
_RE_RADICADO = re.compile(r"\bDP-\d{4}-\d{4,6}\b", re.IGNORECASE)


def _norm(s: str) -> str:
    return (s or "").strip()


def seudonimizar(texto: str, terminos_conocidos: Iterable[str] = ()) -> tuple[str, dict]:
    """
    Reemplaza identificadores por marcadores estables.

    Args:
        texto: texto que se enviaría al modelo.
        terminos_conocidos: valores del expediente (nombre, cédula, contacto)
            que deben seudonimizarse por coincidencia exacta, además del regex.

    Returns:
        (texto_seudonimizado, mapa) donde mapa = {marcador: valor_real}, apto
        para rehidratar la salida del modelo.
    """
    if not texto:
        return texto or "", {}

    mapa: dict[str, str] = {}
    inverso: dict[str, str] = {}   # valor_real → marcador (para estabilidad)
    contadores: dict[str, int] = {}

    def marcar(valor: str, tipo: str) -> str:
        valor = valor.strip()
        if not valor:
            return valor
        if valor in inverso:
            return inverso[valor]
        contadores[tipo] = contadores.get(tipo, 0) + 1
        marcador = f"[{tipo}_{contadores[tipo]}]"
        mapa[marcador] = valor
        inverso[valor] = marcador
        return marcador

    # 0. Proteger radicados: no son PII y no deben tocarse por los patrones de dígitos.
    radicados: dict[str, str] = {}
    def _guardar_radicado(m):
        tok = f"\x00RAD{len(radicados)}\x00"
        radicados[tok] = m.group(0)
        return tok
    texto = _RE_RADICADO.sub(_guardar_radicado, texto)

    # 1. Términos conocidos del expediente (máxima precisión).
    #    Nombre completo primero, luego cada componente de >2 caracteres.
    conocidos: list[tuple[str, str]] = []
    for termino in terminos_conocidos:
        t = _norm(str(termino))
        if not t:
            continue
        tipo = _clasificar_termino(t)
        conocidos.append((t, tipo))
        # Componentes de un nombre (para captar menciones parciales del titular).
        if tipo == "NOMBRE":
            for parte in t.split():
                if len(parte) > 2:
                    conocidos.append((parte, "NOMBRE"))
    # Reemplazar los más largos primero para no partir cadenas.
    for valor, tipo in sorted(conocidos, key=lambda x: -len(x[0])):
        if not valor:
            continue
        patron = re.compile(re.escape(valor), re.IGNORECASE)
        texto = patron.sub(lambda _m, v=valor, t=tipo: marcar(v, t), texto)

    # 2. Patrones sobre el texto libre. Orden: correo → celular → fijo → cédula → dirección.
    texto = _RE_CORREO.sub(lambda m: marcar(m.group(0), "CORREO"), texto)
    texto = _RE_CELULAR.sub(lambda m: marcar(m.group(0), "TELEFONO"), texto)
    texto = _RE_FIJO.sub(lambda m: marcar(m.group(0), "TELEFONO"), texto)
    texto = _RE_CEDULA.sub(lambda m: marcar(m.group(0), "CEDULA"), texto)
    texto = _RE_DIRECCION.sub(lambda m: marcar(m.group(0), "DIRECCION"), texto)

    # Restaurar radicados.
    for tok, rad in radicados.items():
        texto = texto.replace(tok, rad)

    return texto, mapa


def _clasificar_termino(t: str) -> str:
    """Clasifica un término conocido del expediente para elegir el marcador."""
    if "@" in t:
        return "CORREO"
    solo_digitos = re.sub(r"[.\s\-]", "", t)
    if solo_digitos.isdigit():
        # Celular colombiano = 10 dígitos que empiezan por 3.
        if len(solo_digitos) == 10 and solo_digitos.startswith("3"):
            return "TELEFONO"
        return "CEDULA"
    return "NOMBRE"


def rehidratar(texto: str, mapa: dict) -> str:
    """Restaura los valores reales en una salida del modelo. Los marcadores más
    largos primero, para evitar solapes ([NOMBRE_1] vs [NOMBRE_10])."""
    if not texto or not mapa:
        return texto or ""
    for marcador in sorted(mapa, key=len, reverse=True):
        texto = texto.replace(marcador, mapa[marcador])
    return texto


def contiene_pii(texto: str) -> bool:
    """True si el texto AÚN contiene un identificador detectable. Se usa para
    verificar (defensa en profundidad) que nada en claro salió a la API."""
    if not texto:
        return False
    sin_rad = _RE_RADICADO.sub(" ", texto)
    return bool(
        _RE_CORREO.search(sin_rad)
        or _RE_CELULAR.search(sin_rad)
        or _RE_CEDULA.search(sin_rad)
    )


# ── AUTO-TEST (offline, sin API) ──────────────────────────────────────────────
if __name__ == "__main__":
    relato = (
        "Mi nombre es María García López, cédula 52.847.193. Vivo en la Calle 45 #12-34. "
        "Mi esposo me amenazó; pueden llamarme al 300 123 4567 o escribir a maria@correo.com. "
        "Ya radiqué la petición DP-2026-004821 y sigue sin respuesta."
    )
    conocidos = ["María García López", "52847193", "3001234567", "maria@correo.com"]

    seguro, mapa = seudonimizar(relato, conocidos)
    print("=== SEUDONIMIZADO (lo que vería el modelo) ===")
    print(seguro)
    print("\n=== MAPA ===")
    for k, v in mapa.items():
        print(f"  {k} -> {v}")

    # Verificaciones
    assert "María" not in seguro and "García" not in seguro, "nombre filtrado"
    assert "52.847.193" not in seguro and "52847193" not in seguro, "cédula filtrada"
    assert "maria@correo.com" not in seguro, "correo filtrado"
    assert "3001234567" not in seguro and "300 123 4567" not in seguro, "teléfono filtrado"
    assert "DP-2026-004821" in seguro, "el radicado NO es PII y debe preservarse"
    assert not contiene_pii(seguro), "no debe quedar PII detectable"

    # Rehidratación de una supuesta salida del modelo.
    salida_modelo = "Estimada [NOMBRE_1], su petición DP-2026-004821 está en trámite. La contactaremos al [TELEFONO_1]."
    print("\n=== SALIDA REHIDRATADA (lo que ve el humano) ===")
    print(rehidratar(salida_modelo, mapa))

    print("\n[OK] Todas las verificaciones pasaron.")
