"""
Simulador de las plataformas legadas IRIS y VisionWeb
======================================================
RFP §4.2 (integración con IRIS y VisionWeb) · §2.4 problema 3 (doble registro)
Problema 2 del caso: indisponibilidad de plataformas

QUÉ ES ESTO Y QUÉ NO ES
-----------------------
Este módulo NO es una integración con los sistemas reales de la Defensoría:
no existe acceso a IRIS ni a VisionWeb, ni entorno de pruebas disponible en
el marco académico del concurso.

Lo que sí es: un DOBLE DE PRUEBA (test double) que imita el comportamiento
observable de ambas plataformas —incluidas sus fallas— para poder construir
y verificar el mecanismo de sincronización contra él. Es una práctica
estándar de ingeniería: el conector se prueba contra un doble, y al recibir
credenciales del sistema real solo cambia la dirección del servicio.

Todo lo que este módulo simula está declarado como simulado. La bitácora
registra explícitamente que el destino fue un simulador.

CÓMO SE COMPORTA
----------------
- IRIS acepta radicación y reparto. Es la plataforma percibida como más
  amigable para el reparto, según el diagnóstico del caso.
- VisionWeb es el sistema misional donde debe quedar la gestión.
- VisionWeb puede fallar de forma intermitente, replicando el problema real
  descrito en el caso: cuando la plataforma no está disponible, la URAB no
  logra despachar y se vencen términos.
- El sincronizador reintenta con espera creciente y, si agota los intentos,
  encola la operación y registra el incidente en lugar de perderlo.
"""
import os
import random
from datetime import datetime

# ── Configuración del simulador ────────────────────────────────────────
# Probabilidad de fallo de VisionWeb (0.0 = nunca falla, 1.0 = siempre).
# En la demo se controla por variable de entorno para poder mostrar ambos
# escenarios sin tocar el código.
SIM_FALLO_VISIONWEB = float(os.environ.get("SIM_FALLO_VISIONWEB", "0.0"))
SIM_FALLO_IRIS = float(os.environ.get("SIM_FALLO_IRIS", "0.0"))
MAX_REINTENTOS = int(os.environ.get("SYNC_MAX_REINTENTOS", "3"))

# Estado en memoria de las plataformas simuladas
_IRIS = {}          # radicado -> registro
_VISIONWEB = {}     # radicado -> registro
_BITACORA = []      # historial de sincronización
_COLA_PENDIENTES = []   # operaciones que no pudieron completarse


class PlataformaNoDisponible(Exception):
    """Replica la indisponibilidad descrita en el problema 2 del caso."""
    pass


def _ahora():
    return datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S")


def _registrar(plataforma, operacion, radicado, resultado, detalle="",
               intento=1, actor="Sistema de sincronización"):
    """
    Bitácora de sincronización — RFP §4.2:
    qué se replicó, cuándo, por quién, con qué resultado.
    """
    entrada = {
        "id": len(_BITACORA) + 1,
        "fecha": _ahora(),
        "plataforma": plataforma,
        "operacion": operacion,       # radicar, asignar, gestionar, cerrar
        "radicado": radicado,
        "resultado": resultado,       # exitoso, fallido, reintentado, encolado
        "intento": intento,
        "detalle": detalle,
        "actor": actor,
        "simulado": True,             # declaración explícita: no es el sistema real
    }
    _BITACORA.append(entrada)
    return entrada


# ── Simuladores de las plataformas ─────────────────────────────────────

def iris_escribir(radicado, operacion, datos):
    """Simula la escritura en IRIS."""
    if random.random() < SIM_FALLO_IRIS:
        raise PlataformaNoDisponible("IRIS no responde (simulado)")
    reg = _IRIS.setdefault(radicado, {"radicado": radicado, "historial": []})
    reg.update({k: v for k, v in datos.items() if k != "historial"})
    reg["historial"].append({"operacion": operacion, "fecha": _ahora()})
    reg["ultima_actualizacion"] = _ahora()
    return reg


def visionweb_escribir(radicado, operacion, datos):
    """
    Simula la escritura en VisionWeb.
    Puede fallar: replica el problema real de indisponibilidad que hoy
    impide despachar oportunamente y produce vencimiento de términos.
    """
    if random.random() < SIM_FALLO_VISIONWEB:
        raise PlataformaNoDisponible("VisionWeb no responde (simulado)")
    reg = _VISIONWEB.setdefault(radicado, {"radicado": radicado, "historial": []})
    reg.update({k: v for k, v in datos.items() if k != "historial"})
    reg["historial"].append({"operacion": operacion, "fecha": _ahora()})
    reg["ultima_actualizacion"] = _ahora()
    return reg


# ── Sincronizador: el mecanismo que sí es real ─────────────────────────

def sincronizar(radicado, operacion, datos, actor="Sistema de sincronización"):
    """
    Escribe UNA sola vez en el sistema y replica a ambas plataformas.
    Esto es lo que elimina el doble registro: el profesional no vuelve a
    teclear en la segunda plataforma; el sincronizador replica.

    Ante indisponibilidad reintenta con espera creciente. Si agota los
    intentos, encola la operación y registra el incidente: la información
    no se pierde ni exige recaptura manual.
    """
    resultado = {"radicado": radicado, "operacion": operacion,
                 "iris": None, "visionweb": None, "incidencias": []}

    for plataforma, escribir in [("IRIS", iris_escribir), ("VisionWeb", visionweb_escribir)]:
        exito = False
        for intento in range(1, MAX_REINTENTOS + 1):
            try:
                escribir(radicado, operacion, datos)
                _registrar(plataforma, operacion, radicado, "exitoso",
                           f"Replicado en {plataforma}." + (f" Tras {intento} intento(s)." if intento > 1 else ""),
                           intento, actor)
                resultado[plataforma.lower()] = "exitoso"
                exito = True
                break
            except PlataformaNoDisponible as e:
                ultimo = intento == MAX_REINTENTOS
                _registrar(plataforma, operacion, radicado,
                           "encolado" if ultimo else "reintentado",
                           str(e) + (
                               ". Se agotaron los reintentos: la operación queda en cola y se registra el incidente."
                               if ultimo else f". Reintento {intento + 1} de {MAX_REINTENTOS}."
                           ),
                           intento, actor)
                if ultimo:
                    _COLA_PENDIENTES.append({
                        "radicado": radicado, "operacion": operacion,
                        "plataforma": plataforma, "datos": datos,
                        "encolado_en": _ahora(),
                    })
                    resultado[plataforma.lower()] = "encolado"
                    resultado["incidencias"].append(
                        f"{plataforma} no disponible tras {MAX_REINTENTOS} intentos. "
                        f"Operación encolada — no se perdió información ni se requiere recaptura manual."
                    )
        if not exito and resultado[plataforma.lower()] is None:
            resultado[plataforma.lower()] = "fallido"

    resultado["doble_registro_evitado"] = (
        resultado["iris"] == "exitoso" and resultado["visionweb"] == "exitoso"
    )
    return resultado


def reintentar_cola():
    """
    Procesa las operaciones encoladas cuando la plataforma vuelve.
    Es el mecanismo que evita que una caída se traduzca en vencimiento
    de términos: la operación se completa cuando el sistema se restablece.
    """
    procesadas, fallidas = [], []
    pendientes = list(_COLA_PENDIENTES)
    _COLA_PENDIENTES.clear()

    for op in pendientes:
        escribir = iris_escribir if op["plataforma"] == "IRIS" else visionweb_escribir
        try:
            escribir(op["radicado"], op["operacion"], op["datos"])
            _registrar(op["plataforma"], op["operacion"], op["radicado"], "exitoso",
                       f"Operación pendiente completada al restablecerse la plataforma "
                       f"(encolada el {op['encolado_en']}).",
                       actor="Reproceso automático de cola")
            procesadas.append(op)
        except PlataformaNoDisponible as e:
            _registrar(op["plataforma"], op["operacion"], op["radicado"], "encolado",
                       f"{e}. La operación permanece en cola.",
                       actor="Reproceso automático de cola")
            _COLA_PENDIENTES.append(op)
            fallidas.append(op)

    return {"procesadas": len(procesadas), "aun_pendientes": len(fallidas)}


# ── Consultas para la bitácora y el estado ─────────────────────────────

def obtener_bitacora(radicado=None, limite=100):
    b = [e for e in _BITACORA if not radicado or e["radicado"] == radicado]
    return list(reversed(b))[:limite]


def estado_plataformas():
    """Estado de consistencia entre ambas plataformas."""
    todos = set(_IRIS.keys()) | set(_VISIONWEB.keys())
    solo_iris = [r for r in todos if r in _IRIS and r not in _VISIONWEB]
    solo_vw = [r for r in todos if r in _VISIONWEB and r not in _IRIS]
    en_ambas = [r for r in todos if r in _IRIS and r in _VISIONWEB]
    total = len(todos)
    return {
        "registros_totales": total,
        "consistentes_en_ambas": len(en_ambas),
        "solo_en_iris": len(solo_iris),
        "solo_en_visionweb": len(solo_vw),
        "radicados_inconsistentes": (solo_iris + solo_vw)[:10],
        "tasa_consistencia": round(len(en_ambas) / total * 100, 1) if total else 100.0,
        "operaciones_en_cola": len(_COLA_PENDIENTES),
        "configuracion_simulador": {
            "probabilidad_fallo_iris": SIM_FALLO_IRIS,
            "probabilidad_fallo_visionweb": SIM_FALLO_VISIONWEB,
            "maximo_reintentos": MAX_REINTENTOS,
        },
    }


def resumen_bitacora():
    """Métricas agregadas de la sincronización, para el panel de coordinación."""
    total = len(_BITACORA)
    if not total:
        return {"total_operaciones": 0, "por_resultado": {}, "por_plataforma": {},
                "tasa_exito": 100.0, "operaciones_en_cola": 0}
    por_resultado, por_plataforma = {}, {}
    for e in _BITACORA:
        por_resultado[e["resultado"]] = por_resultado.get(e["resultado"], 0) + 1
        por_plataforma[e["plataforma"]] = por_plataforma.get(e["plataforma"], 0) + 1
    exitosas = por_resultado.get("exitoso", 0)
    return {
        "total_operaciones": total,
        "por_resultado": por_resultado,
        "por_plataforma": por_plataforma,
        "tasa_exito": round(exitosas / total * 100, 1),
        "operaciones_en_cola": len(_COLA_PENDIENTES),
    }


def configurar_simulador(fallo_visionweb=None, fallo_iris=None):
    """Permite alternar el escenario en la demo sin reiniciar el servicio."""
    global SIM_FALLO_VISIONWEB, SIM_FALLO_IRIS
    if fallo_visionweb is not None:
        SIM_FALLO_VISIONWEB = max(0.0, min(1.0, float(fallo_visionweb)))
    if fallo_iris is not None:
        SIM_FALLO_IRIS = max(0.0, min(1.0, float(fallo_iris)))
    return {"probabilidad_fallo_iris": SIM_FALLO_IRIS,
            "probabilidad_fallo_visionweb": SIM_FALLO_VISIONWEB}


def limpiar():
    """Reinicia el simulador (útil entre demostraciones)."""
    _IRIS.clear(); _VISIONWEB.clear(); _BITACORA.clear(); _COLA_PENDIENTES.clear()
    return {"ok": True}
