"""
Adaptador entre el orquestador agéntico y el backend de producción
==================================================================

PROBLEMA QUE RESUELVE
---------------------
El repositorio contiene dos implementaciones del pipeline M1-M8:

  1. agentes/orquestador.py — orquestación agéntica con estado tipado,
     bitácora de eventos por transición y llamadas reales al modelo de
     lenguaje. Reglas deterministas de protección antes del clasificador.

  2. main.py — backend de producción con clasificación local por reglas
     léxicas, persistencia y los tres portales.

Ambas son legítimas y responden a necesidades distintas: el orquestador
razona sobre el caso; el backend responde en milisegundos, sin costo por
petición y sin dependencia de red. Este módulo las conecta para que la
capa cognitiva sea intercambiable, y no dos sistemas paralelos.

CÓMO SE ACTIVA
--------------
Variable de entorno USAR_ORQUESTADOR:

    USAR_ORQUESTADOR=0  (por defecto)
        Clasificación local por reglas. Determinista, instantánea, sin
        costo. Es el modo de la demostración y el de los tests: la prueba
        de sesgo exige que el clasificador sea inspeccionable y no
        dependa de una llamada externa.

    USAR_ORQUESTADOR=1
        Clasificación con el orquestador agéntico. Requiere
        ANTHROPIC_API_KEY. Mayor exactitud a costa de latencia y costo
        por petición.

POR QUÉ ES OPCIONAL Y NO OBLIGATORIO
------------------------------------
Tres razones, todas de diseño y no de conveniencia:

  1. Continuidad. Si el proveedor del modelo falla, la radicación no
     puede bloquearse. El modo local es el plan de contingencia, no un
     atajo.

  2. Verificabilidad. La prueba de sesgo se ejecuta sobre el clasificador
     local porque debe ser reproducible y determinista. Un test que
     depende de una API no prueba nada: prueba la disponibilidad de la
     red.

  3. Soberanía. La entidad decide dónde corre la capa cognitiva. Que sea
     un parámetro y no una dependencia estructural es lo que hace real
     esa decisión.

LO QUE NO CAMBIA EN NINGÚN MODO
-------------------------------
Las reglas codificadas de protección —riesgo vital, niñez, discapacidad—
se ejecutan antes del clasificador en ambos modos y ninguno puede
desactivarlas. La revisión humana obligatoria opera igual. El modo solo
altera quién propone la clasificación, nunca quién decide.
"""
import os
import logging

log = logging.getLogger("urab.adaptador")

USAR_ORQUESTADOR = os.environ.get("USAR_ORQUESTADOR", "0") == "1"

# Mapeo entre la taxonomía del orquestador y la del backend.
# El orquestador usa nombres extensos y legibles; el backend usa las
# etiquetas cortas que ya existen en la base de datos y en los portales.
CATEGORIA_ORQ_A_BACKEND = {
    "salud": "Salud",
    "violencia_basada_en_genero": "VBG",
    "ninez_y_adolescencia": "NNA",
    "desaparicion": "Desaparición",
    "carcelario": "Carcelario",
    "conflicto_armado": "Conflicto",
    "migracion": "Migración",
    "pension": "Pensiones",
    "general": "General",
}


def orquestador_disponible() -> tuple:
    """
    Verifica si el orquestador puede ejecutarse.
    Devuelve (disponible, razón). No lanza excepción: la indisponibilidad
    del orquestador nunca puede impedir que una petición se radique.
    """
    if not USAR_ORQUESTADOR:
        return False, "Modo local activo (USAR_ORQUESTADOR=0)."
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return False, "Falta ANTHROPIC_API_KEY en el entorno."
    try:
        from agentes.orquestador import modulo_m2_triage  # noqa: F401
        return True, "Orquestador agéntico disponible."
    except Exception as e:
        return False, f"El orquestador no pudo cargarse: {e}"


def clasificar_con_orquestador(texto: str, etario=None, grupos=None,
                               canal: str = "web", radicado: str = "") -> dict:
    """
    Ejecuta M1 y M2 del orquestador y traduce el resultado al formato que
    el backend ya usa. Devuelve None si el orquestador no está disponible
    o falla: el llamador debe caer al clasificador local.

    Se ejecutan M1 y M2, no el pipeline completo, porque el reparto (M3),
    la deduplicación (M4) y el historial (M5) del backend operan sobre la
    base de datos real y no sobre las estructuras en memoria del
    orquestador. La capa que aporta valor cognitivo es la clasificación.
    """
    disponible, razon = orquestador_disponible()
    if not disponible:
        return None

    try:
        from agentes.orquestador import (
            Peticion as PeticionOrq,
            modulo_m1_recepcion,
            modulo_m2_triage,
        )

        p = PeticionOrq(
            radicado=radicado or "TEMP",
            texto_narrativo=texto,
            canal=canal,
        )
        # Marcadores de enfoque diferencial que el backend ya recogió:
        # el orquestador los usa en sus reglas deterministas de protección.
        _grupos = [str(g).lower() for g in (grupos or [])]
        p.es_nna = etario in ("nino", "nina", "adolescente")
        p.es_discapacidad = any("discapacidad" in g for g in _grupos)
        p.es_victima_conflicto = any("victima" in g for g in _grupos)
        p.es_etnia = any(g in ("indigena", "afrodescendiente", "raizal", "rom") for g in _grupos)
        p.es_migrante = any("migrante" in g for g in _grupos)

        p = modulo_m1_recepcion(p)
        p = modulo_m2_triage(p)

        urgencia = p.urgencia.value if hasattr(p.urgencia, "value") else str(p.urgencia or "media")
        categoria_orq = p.categoria.value if hasattr(p.categoria, "value") else str(p.categoria or "general")

        return {
            "urgencia": urgencia,
            "categoria": CATEGORIA_ORQ_A_BACKEND.get(categoria_orq, "General"),
            "confianza_ia": round(float(p.confianza_clasificacion or 0.0) * 100, 1),
            "requiere_hitl": bool(p.hitl_requerido),
            "hitl_razon": p.hitl_razon or None,
            "explicacion_ia": p.explicacion_clasificacion or "",
            "hash_documento": p.hash_documento_fisico or "",
            "log_eventos": p.log_eventos or [],
            "motor": "orquestador_agentico",
        }

    except Exception as e:
        # La radicación nunca se bloquea por una falla del orquestador.
        log.warning("El orquestador falló, se usa el clasificador local: %s", e)
        return None


def estado_capa_cognitiva() -> dict:
    """
    Reporta qué motor está clasificando y por qué. Se expone en la
    verificación de salud del sistema y en el inventario de algoritmos:
    la entidad debe poder saber, en cualquier momento, qué produjo cada
    decisión.
    """
    disponible, razon = orquestador_disponible()
    return {
        "motor_activo": "orquestador_agentico" if disponible else "clasificador_local",
        "orquestador_solicitado": USAR_ORQUESTADOR,
        "orquestador_disponible": disponible,
        "detalle": razon,
        "reglas_de_proteccion": (
            "Las reglas codificadas de riesgo vital, niñez y discapacidad se ejecutan "
            "antes del clasificador en ambos modos y ninguno puede desactivarlas."
        ),
        "modo_local": (
            "Clasificación determinista por reglas léxicas. Sin costo por petición, "
            "sin latencia de red, sin transferencia de datos. Es el plan de contingencia "
            "ante indisponibilidad del proveedor y el modo sobre el que se ejecuta la "
            "prueba de sesgo, que exige reproducibilidad."
        ),
        "modo_agentico": (
            "Orquestación con estado tipado, bitácora de eventos por transición y "
            "razonamiento contextual sobre el caso con explicación en lenguaje ciudadano. "
            "Mayor exactitud a costa de latencia y costo por petición."
        ),
    }
