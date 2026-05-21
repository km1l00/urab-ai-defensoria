"""
Configuración centralizada — agentes-defensoria-lsl2026
Defensoría del Pueblo · URAB · LSL 2026

Todos los parámetros ajustables del sistema en un solo lugar.
Los valores sensibles (API keys) se leen del entorno o del archivo .env
"""

import os
from pathlib import Path

# ── RUTAS ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
DATOS_DIR   = BASE_DIR / "datos"
OUTPUTS_DIR = BASE_DIR / "outputs"
DOCS_DIR    = BASE_DIR / "docs"

# ── API ───────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Modelo por defecto — Haiku 3.5 es el más disponible y económico
MODEL_DEFAULT = "claude-haiku-4-5-20251001"

# Modelos alternativos en orden de preferencia
MODELS_FALLBACK = [
    "claude-haiku-4-5-20251001",
    "claude-3-haiku-20240307",
    "claude-haiku-4-5-20251001",
]

# ── PIPELINE ──────────────────────────────────────────────────────────────────
DELAY_ENTRE_FILAS = 0.5    # segundos entre llamadas a la API (evitar rate limit)
MAX_REINTENTOS    = 3      # intentos por fila antes de marcar como error
DELAY_REINTENTO   = 5.0   # segundos entre reintentos (se multiplica por intento)
MAX_TOKENS_M1     = 1024
MAX_TOKENS_M2     = 1024

# ── UMBRALES DE DECISIÓN ─────────────────────────────────────────────────────
# Confianza mínima para aceptar clasificación sin revisión humana
UMBRAL_CONFIANZA_HITL = 0.70

# Urgencias que siempre activan HITL (independiente de confianza)
URGENCIAS_HITL_AUTOMATICO = {"CRÍTICO"}

# Sujetos de especial protección que activan HITL en urgencia ALTO o superior
SUJETOS_HITL = {
    "NNA (niño, niña, adolescente)",
    "Persona con discapacidad",
}

# ── TAXONOMÍAS (fuente de verdad para M1 y M2) ────────────────────────────────
CATEGORIAS_TRAMITE = [
    "Asesoría",
    "Queja",
    "Solicitud de mediación",
    "Solicitud de conciliación",
]

TEMATICAS = [
    "salud",
    "pensiones_seguridad_social",
    "carcelario",
    "vivienda",
    "violencia_basada_en_genero",
    "infancia_adolescencia",
    "migracion",
    "discapacidad",
    "otras",
]

NIVELES_URGENCIA = ["CRÍTICO", "ALTO", "MEDIO", "BAJO"]

TIEMPOS_RESPUESTA = {
    "CRÍTICO": "inmediato",
    "ALTO":    "24h",
    "MEDIO":   "5días",
    "BAJO":    "15días",
}

SUJETOS_ESPECIALES = [
    "Adulto mayor",
    "NNA (niño, niña, adolescente)",
    "Persona con discapacidad",
    "Víctima de conflicto",
    "Comunidad étnica",
]

# ── METAS DEL PILOTO (RFP §4.4) ──────────────────────────────────────────────
META_EXTRACCION_M1    = 0.90   # ≥90% campos extraídos correctamente
META_TRIAGE_TARDIO_M2 = 0.045  # urgentes con triage >8h: 56.2% → ≤4.5%
META_DOBLE_REGISTRO   = 0.050  # doble registro IRIS/VisionWeb: 72.6% → ≤5%

# ── M3 — REPARTO ─────────────────────────────────────────────────────────────
N_PROFESIONALES   = 17
RATIO_CARGA_META  = 2.1   # ratio máx/mín objetivo (AS-IS: 7.7x)

# ── M4 — ANTI-DUPLICIDAD ─────────────────────────────────────────────────────
UMBRAL_TFIDF_M4       = 0.35   # similitud mínima TF-IDF para candidatos
UMBRAL_SEMANTICO_M4   = 0.75   # similitud semántica para sugerir acumulación
MAX_PARES_LLM_M4      = 20     # máximo pares verificados con LLM por batch
META_RECALL_M4        = 0.85   # recall objetivo ≥85%
META_FP_M4            = 0.08   # falsos positivos objetivo ≤8%
