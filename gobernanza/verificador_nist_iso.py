"""
VERIFICADOR DE CUMPLIMIENTO — NIST AI RMF + ISO/IEC 42001
agentes-defensoria-lsl2026 · Defensoría del Pueblo · URAB · LSL 2026

Evalúa el cumplimiento del sistema IA contra:
  - NIST AI Risk Management Framework 1.0 (GOVERN / MAP / MEASURE / MANAGE)
  - ISO/IEC 42001:2023 — AI Management System

Cada cláusula está mapeada al módulo específico del proyecto
y a la evidencia concreta de cumplimiento.

Uso:
    python gobernanza/verificador_nist_iso.py
    python gobernanza/verificador_nist_iso.py --formato markdown
    python gobernanza/verificador_nist_iso.py --formato json
    python gobernanza/verificador_nist_iso.py --solo-brechas
"""

import json
import argparse
from datetime import datetime
from pathlib import Path

# ── CATÁLOGO NIST AI RMF 1.0 ─────────────────────────────────────────────────
# Funciones: GOVERN (GV) | MAP (MP) | MEASURE (MS) | MANAGE (MG)
# Estados: conforme | parcial | no_conforme | no_aplica

NIST_CLAUSULAS = [

    # ══ GOVERN ══════════════════════════════════════════════════════════════
    {
        "id": "GV-1.1", "funcion": "GOVERN",
        "nombre": "Políticas y procedimientos de IA documentados",
        "status": "conforme",
        "modulos": ["Todos"],
        "evidencia": (
            "Marco normativo primario adoptado: CONPES 4144/2025, Directiva 007/2025 "
            "y Ley 1581/2012. Documentados en config.py y README como restricciones "
            "de diseño no negociables."
        ),
        "brecha": None,
    },
    {
        "id": "GV-1.2", "funcion": "GOVERN",
        "nombre": "Rendición de cuentas y responsabilidades definidas",
        "status": "conforme",
        "modulos": ["M2", "M3", "M6", "M7"],
        "evidencia": (
            "Matriz RACI definida: propietario del sistema (dirección URAB), "
            "dueños de datos (DTI), responsables misionales (profesionales), "
            "auditoría interna. HITL con responsable nominado en M2, M4 y M6."
        ),
        "brecha": None,
    },
    {
        "id": "GV-1.3", "funcion": "GOVERN",
        "nombre": "Equipos interdisciplinarios en diseño de IA",
        "status": "parcial",
        "modulos": ["Todos"],
        "evidencia": (
            "Equipo técnico (ciencia de datos) + jurídico (derecho constitucional) "
            "integrado en el diseño. Canvas IA Responsable del Ministerio Público adoptado."
        ),
        "brecha": "Representación formal de la sociedad civil en Comité IA aún no formalizada. Pendiente para Fase 4.",
    },
    {
        "id": "GV-2.2", "funcion": "GOVERN",
        "nombre": "Consideraciones de derechos humanos en el ciclo de vida",
        "status": "conforme",
        "modulos": ["M2", "M3", "M5", "M6", "M8"],
        "evidencia": (
            "Enfoque diferencial obligatorio: género (VBG), discapacidad (WCAG 2.1), "
            "niñez (NNA — regla hard-coded), étnico-regional (fine-tuning corpus). "
            "Art. 29 CP garantiza trazabilidad de toda decisión automatizada."
        ),
        "brecha": None,
    },
    {
        "id": "GV-3.2", "funcion": "GOVERN",
        "nombre": "Uso ético de IA y políticas de uso aceptable",
        "status": "conforme",
        "modulos": ["M6"],
        "evidencia": (
            "M6 opera con whitelist explícita de consultas automatizables. "
            "Toda respuesta de fondo requiere aprobación humana (HITL). "
            "Bitácora inmutable JSONL de toda acción automatizada (Directiva 007/2025)."
        ),
        "brecha": None,
    },
    {
        "id": "GV-4.1", "funcion": "GOVERN",
        "nombre": "Tolerancia al riesgo organizacional definida",
        "status": "conforme",
        "modulos": ["M2", "M6"],
        "evidencia": (
            "Riesgo inaceptable definido: triage tardío en urgencias, alucinaciones jurídicas M6, "
            "fallos en detección VBG. Protocolo hard-coded: alerta forzada en <4h para amenazas vitales "
            "independiente del clasificador ML."
        ),
        "brecha": None,
    },
    {
        "id": "GV-5.1", "funcion": "GOVERN",
        "nombre": "Supervisión y mejora continua del sistema IA",
        "status": "parcial",
        "modulos": ["M8"],
        "evidencia": (
            "M8 genera dashboard operativo y de derechos con lag <24h. "
            "Auditoría algorítmica semestral externa planificada en Fase 4."
        ),
        "brecha": "Mecanismo formal de canal de impugnación ciudadana pendiente de implementación (Directiva 007/2025).",
    },
    {
        "id": "GV-5.2", "funcion": "GOVERN",
        "nombre": "Riesgo de cadena de suministro de IA",
        "status": "parcial",
        "modulos": ["M7"],
        "evidencia": (
            "IRIS y VisionWeb identificados como dependencias críticas. "
            "RPA como fallback operativo en M7. Cola offline para resiliencia ante caídas."
        ),
        "brecha": "SLA formal con proveedores de sistemas legacy (IRIS/VisionWeb) pendiente de negociación con DTI.",
    },
    {
        "id": "GV-6.1", "funcion": "GOVERN",
        "nombre": "Gestión de incidentes de IA",
        "status": "parcial",
        "modulos": ["M2", "M6", "M7"],
        "evidencia": (
            "Protocolo de incidentes definido: fallo M2 en amenaza vital → alerta <4h, "
            "responsable designado, log en bitácora M7. Cola offline M7 para fallos de integración."
        ),
        "brecha": "Mesa de ayuda formal y protocolo de escalación a autoridades no documentado aún.",
    },

    # ══ MAP ═════════════════════════════════════════════════════════════════
    {
        "id": "MP-1.1", "funcion": "MAP",
        "nombre": "Contexto y categorización del sistema IA",
        "status": "conforme",
        "modulos": ["Todos"],
        "evidencia": (
            "Sistema IA en derechos humanos, alto impacto, categoría A según Directiva 007/2025. "
            "Clasificado como SDA (Sistema de Decisión Automatizada) en M2 y M4. "
            "Documentado en arquitectura APA y propuesta técnica."
        ),
        "brecha": None,
    },
    {
        "id": "MP-1.5", "funcion": "MAP",
        "nombre": "Identificación de riesgos del sistema IA",
        "status": "conforme",
        "modulos": ["M2", "M4", "M6", "M8"],
        "evidencia": (
            "Matriz de riesgos cubre: urgencias no detectadas (M2), falsos negativos en duplicados (M4), "
            "alucinaciones jurídicas (M6), sesgos poblacionales (M2/M8), "
            "dependencia tecnológica (M7), incentivo a automatizar de más."
        ),
        "brecha": None,
    },
    {
        "id": "MP-2.1", "funcion": "MAP",
        "nombre": "Identificación de partes interesadas y poblaciones afectadas",
        "status": "conforme",
        "modulos": ["M2", "M3", "M5"],
        "evidencia": (
            "Partes identificadas: ciudadanos peticionarios, profesionales URAB, dirección Defensoría, "
            "entidades accionadas, sociedad civil. Poblaciones vulnerables con enfoque diferencial: "
            "NNA, adultos mayores, personas con discapacidad, comunidades étnicas, víctimas de conflicto."
        ),
        "brecha": None,
    },
    {
        "id": "MP-2.3", "funcion": "MAP",
        "nombre": "Análisis científico del sistema IA",
        "status": "conforme",
        "modulos": ["M1", "M2", "M4"],
        "evidencia": (
            "Benchmark: literatura académica sobre recall de similitud vectorial (pgvector). "
            "Benchmarks APA sector público (Ministerio de Justicia de España -85% tiempo). "
            "Dataset sintético calibrado a parámetros RFP: N=20,417, 300 peticiones/día."
        ),
        "brecha": None,
    },
    {
        "id": "MP-3.5", "funcion": "MAP",
        "nombre": "Clasificación del riesgo de impacto negativo",
        "status": "conforme",
        "modulos": ["M2", "M6"],
        "evidencia": (
            "Falso negativo en amenaza vital = riesgo inaceptable (lesión a integridad, "
            "vencimiento de término, daño antijurídico). Hard-coded: alerta forzada "
            "independiente del ML para riesgo vital, NNA y VBG inminente."
        ),
        "brecha": None,
    },
    {
        "id": "MP-4.1", "funcion": "MAP",
        "nombre": "Evaluación de impacto sobre los derechos",
        "status": "parcial",
        "modulos": ["M2", "M8"],
        "evidencia": (
            "Evaluación de Impacto Algorítmico (AIA) del Canvas IA Responsable adoptada como metodología. "
            "M8 genera métricas de derechos con privacidad diferencial."
        ),
        "brecha": "AIA formal documentada pendiente de publicación antes del go-live (Directiva 007/2025).",
    },
    {
        "id": "MP-5.1", "funcion": "MAP",
        "nombre": "Métricas de desempeño de IA establecidas",
        "status": "conforme",
        "modulos": ["M2", "M3", "M4", "M7", "M8"],
        "evidencia": (
            "Metas verificables por módulo: M2 (triage tardío 56.2%→≤4.5%), M3 (ratio 7.7x→≤2.1x), "
            "M4 (recall ≥85%, FP ≤8%), M7 (doble registro 72.6%→≤5%), "
            "M6 (borradores sin edición ≥60%). Todas con baseline cuantitativo y método de verificación."
        ),
        "brecha": None,
    },

    # ══ MEASURE ═════════════════════════════════════════════════════════════
    {
        "id": "MS-1.1", "funcion": "MEASURE",
        "nombre": "Métricas de desempeño técnico y de impacto social",
        "status": "conforme",
        "modulos": ["M8"],
        "evidencia": (
            "M8 calcula métricas operativas (tiempos, carga, urgencias) y de derechos "
            "(sujetos especiales, recurrencia, entidades con mayor retraso). "
            "Informe público anual de equidad planificado (Fase 4)."
        ),
        "brecha": None,
    },
    {
        "id": "MS-2.1", "funcion": "MEASURE",
        "nombre": "Pruebas de sesgo y equidad",
        "status": "parcial",
        "modulos": ["M2", "M8"],
        "evidencia": (
            "Auditoría de recall diferenciado por región y grupo poblacional planificada. "
            "Escalación humana si confianza <70% (proxy de sesgo). "
            "Hard-coded: NNA activa prioridad máxima independiente del clasificador."
        ),
        "brecha": "Fine-tuning con corpus regional afro/indígena pendiente para Fase 2. Auditoría de paridad demográfica no ejecutada aún.",
    },
    {
        "id": "MS-2.5", "funcion": "MEASURE",
        "nombre": "Explicabilidad e interpretabilidad",
        "status": "conforme",
        "modulos": ["M2", "M3", "M4", "M6"],
        "evidencia": (
            "XAI obligatorio en M2 (razonamiento_categoria, razonamiento_urgencia, razonamiento_tematica), "
            "M3 (justificacion_xai), M4 (criterios_cumplidos + justificacion_xai), "
            "M6 (fuentes_rag). Directiva 007/2025: prohibición de caja negra."
        ),
        "brecha": None,
    },
    {
        "id": "MS-2.6", "funcion": "MEASURE",
        "nombre": "Monitoreo y detección de deriva del modelo",
        "status": "parcial",
        "modulos": ["M8"],
        "evidencia": (
            "M8 calcula métricas por período para detectar degradación. "
            "Auditoría algorítmica semestral externa planificada en Fase 4."
        ),
        "brecha": "MLOps formal con versionamiento de modelos y alertas de drift automático no implementado en MVP.",
    },
    {
        "id": "MS-3.3", "funcion": "MEASURE",
        "nombre": "Trazabilidad y registros de auditoría",
        "status": "conforme",
        "modulos": ["M3", "M6", "M7"],
        "evidencia": (
            "Bitácora JSONL append-only en M6 (toda acción automatizada) y M7 "
            "(toda sincronización IRIS/VisionWeb). Estado de carga M3 persiste en JSON. "
            "Trazabilidad del 'a quién' y 'por qué' en todo reparto (Art. 29 CP)."
        ),
        "brecha": None,
    },
    {
        "id": "MS-4.1", "funcion": "MEASURE",
        "nombre": "Identificación de riesgos residuales",
        "status": "parcial",
        "modulos": ["M2", "M4"],
        "evidencia": (
            "Riesgos residuales documentados: falso negativo en urgencias (<5% según meta), "
            "FP en deduplicación (≤8%), borradores M6 con errores jurídicos menores."
        ),
        "brecha": "Cuantificación formal de riesgos residuales post-piloto pendiente. Línea base real disponible solo en Fase 0.",
    },

    # ══ MANAGE ══════════════════════════════════════════════════════════════
    {
        "id": "MG-1.3", "funcion": "MANAGE",
        "nombre": "Respuesta y recuperación ante incidentes de IA",
        "status": "parcial",
        "modulos": ["M6", "M7"],
        "evidencia": (
            "Cola offline M7 para resiliencia ante caídas. Alerta forzada M6 para riesgo vital. "
            "Protocolo de incidentes: responsable designado, log en bitácora, escalación <4h."
        ),
        "brecha": "Protocolo formal de recuperación ante desastre (DR) y mesa de ayuda institucional no documentados.",
    },
    {
        "id": "MG-2.2", "funcion": "MANAGE",
        "nombre": "Supervisión humana efectiva en puntos de decisión",
        "status": "conforme",
        "modulos": ["M2", "M4", "M6"],
        "evidencia": (
            "Lista cerrada HITL: amenaza vital, desaparición, NNA en riesgo, "
            "discapacidad, respuesta de fondo al ciudadano, acumulación de expedientes. "
            "El profesional aprueba — el sistema nunca decide solo en estos puntos."
        ),
        "brecha": None,
    },
    {
        "id": "MG-3.1", "funcion": "MANAGE",
        "nombre": "Gestión de riesgos de terceros y sistemas integrados",
        "status": "parcial",
        "modulos": ["M7"],
        "evidencia": (
            "Dependencias identificadas: IRIS, VisionWeb, API Anthropic. "
            "RPA como fallback para IRIS/VisionWeb. "
            "Neutralidad de proveedor de IA documentada (§7.1 RFP)."
        ),
        "brecha": "Contrato formal de niveles de servicio (SLA) con Anthropic y DTI pendiente.",
    },
    {
        "id": "MG-4.1", "funcion": "MANAGE",
        "nombre": "Aprendizaje y mejora continua del sistema IA",
        "status": "parcial",
        "modulos": ["M8"],
        "evidencia": (
            "M8 genera dashboard con métricas para retroalimentación. "
            "Canal de corrección humana en M6 (profesional edita borradores). "
            "Auditoría algorítmica semestral externa en Fase 4."
        ),
        "brecha": "Canal formal de retroalimentación ciudadana sobre clasificaciones erróneas no implementado.",
    },
]

# ── CATÁLOGO ISO/IEC 42001:2023 ───────────────────────────────────────────────
ISO_CLAUSULAS = [

    # ── 4. Contexto ──────────────────────────────────────────────────────────
    {
        "id": "4.1", "seccion": "Contexto",
        "nombre": "Comprensión del contexto organizacional",
        "status": "conforme",
        "modulos": ["Todos"],
        "evidencia": (
            "Diagnóstico cuantitativo AS-IS completado: 20,417 radicados simulados, "
            "5 problemas estructurales identificados (cuellos de botella, doble registro, "
            "desbalance de carga, duplicados, falta de historial unificado)."
        ),
        "brecha": None,
    },
    {
        "id": "4.2", "seccion": "Contexto",
        "nombre": "Partes interesadas y sus necesidades",
        "status": "conforme",
        "modulos": ["M2", "M3", "M5", "M8"],
        "evidencia": (
            "Partes interesadas documentadas: ciudadanos (peticionarios), "
            "17 profesionales URAB, dirección Defensoría, DTI, sociedad civil, "
            "entidades accionadas. Necesidades mapeadas a módulos específicos."
        ),
        "brecha": None,
    },
    {
        "id": "4.3", "seccion": "Contexto",
        "nombre": "Alcance del sistema de gestión de IA",
        "status": "conforme",
        "modulos": ["Todos"],
        "evidencia": (
            "Alcance definido: pipeline M1–M8 para URAB Bogotá. Piloto 90 días. "
            "Integración IRIS/VisionWeb. Exclusiones documentadas: no cubre despachos regionales en Fase piloto."
        ),
        "brecha": None,
    },
    {
        "id": "4.4", "seccion": "Contexto",
        "nombre": "Sistema de gestión de IA (SGSIA)",
        "status": "parcial",
        "modulos": ["Todos"],
        "evidencia": "Arquitectura modular M1–M8 con config.py centralizado. README como documentación del sistema.",
        "brecha": "SGSIA formal con procesos, procedimientos y controles documentados en manual de calidad pendiente.",
    },

    # ── 5. Liderazgo ─────────────────────────────────────────────────────────
    {
        "id": "5.1", "seccion": "Liderazgo",
        "nombre": "Liderazgo y compromiso de la alta dirección",
        "status": "parcial",
        "modulos": ["Todos"],
        "evidencia": (
            "Comité de IA con representación directiva planificado (Fase 4). "
            "Propuesta requiere endorsement explícito de la Defensora del Pueblo."
        ),
        "brecha": "Acta de compromiso formal de la alta dirección pendiente de firma antes del go-live.",
    },
    {
        "id": "5.2", "seccion": "Liderazgo",
        "nombre": "Política del sistema de gestión de IA",
        "status": "conforme",
        "modulos": ["M2", "M6"],
        "evidencia": (
            "Política IA documentada: HITL en 4 puntos críticos, XAI obligatorio, "
            "privacidad-by-design, prohibición de caja negra, canal de impugnación. "
            "Alineada con CONPES 4144/2025 y Directiva 007/2025."
        ),
        "brecha": None,
    },
    {
        "id": "5.3", "seccion": "Liderazgo",
        "nombre": "Roles, responsabilidades y autoridades",
        "status": "conforme",
        "modulos": ["M3", "M6"],
        "evidencia": (
            "Roles definidos: propietario del sistema (dirección URAB), dueño de datos (DTI), "
            "responsable misional (profesional), auditor interno, DPO (Ley 1581/2012). "
            "Trazabilidad del 'a quién' y 'por qué' en cada reparto M3."
        ),
        "brecha": None,
    },

    # ── 6. Planificación ─────────────────────────────────────────────────────
    {
        "id": "6.1", "seccion": "Planificación",
        "nombre": "Acciones para abordar riesgos y oportunidades",
        "status": "conforme",
        "modulos": ["M2", "M4", "M7"],
        "evidencia": (
            "Matriz de riesgos de daño antijurídico: fallas técnicas, operativas y jurídicas "
            "con probabilidad, impacto y mitigación. RPA como fallback. Cola offline M7."
        ),
        "brecha": None,
    },
    {
        "id": "6.1.2", "seccion": "Planificación",
        "nombre": "Evaluación de impacto en sistemas de IA",
        "status": "parcial",
        "modulos": ["M2", "M4"],
        "evidencia": (
            "Evaluación de Impacto Algorítmico (AIA) adoptada como metodología. "
            "Canvas IA Responsable del Ministerio Público como marco de evaluación."
        ),
        "brecha": "Evaluación de impacto formal publicada en inventario de algoritmos pendiente (antes del go-live).",
    },
    {
        "id": "6.2", "seccion": "Planificación",
        "nombre": "Objetivos del sistema de gestión de IA",
        "status": "conforme",
        "modulos": ["M2", "M3", "M4", "M7", "M8"],
        "evidencia": (
            "Objetivos con baseline cuantitativo: triage tardío 56.2%→≤4.5%, "
            "ratio carga 7.7x→≤2.1x, recall duplicados ≥85%, doble registro 72.6%→≤5%. "
            "Método de verificación definido para cada meta (§4.4 RFP)."
        ),
        "brecha": None,
    },

    # ── 7. Soporte ───────────────────────────────────────────────────────────
    {
        "id": "7.1", "seccion": "Soporte",
        "nombre": "Recursos para el sistema de gestión de IA",
        "status": "parcial",
        "modulos": ["Todos"],
        "evidencia": "Modelo de costos a 3 años con 6 categorías. Anthropic API como recurso de cómputo.",
        "brecha": "Presupuesto formal aprobado y cronograma de adquisición de infraestructura pendiente.",
    },
    {
        "id": "7.2", "seccion": "Soporte",
        "nombre": "Competencias del equipo de IA",
        "status": "conforme",
        "modulos": ["Todos"],
        "evidencia": (
            "Plan de capacitación para ≥20 profesionales URAB (Fase 3). "
            "Equipo: ciencia de datos + derecho constitucional + gestión de derechos humanos."
        ),
        "brecha": None,
    },
    {
        "id": "7.4", "seccion": "Soporte",
        "nombre": "Comunicación sobre el sistema de IA",
        "status": "parcial",
        "modulos": ["M6", "M7"],
        "evidencia": (
            "Notificación explícita al ciudadano en cada acuse de recibo (M6). "
            "Bitácora de sincronización M7 para comunicación interna."
        ),
        "brecha": "Comunicación pública proactiva sobre uso de IA en URAB (informe de transparencia) pendiente.",
    },
    {
        "id": "7.5", "seccion": "Soporte",
        "nombre": "Información documentada",
        "status": "conforme",
        "modulos": ["M3", "M6", "M7"],
        "evidencia": (
            "Bitácoras JSONL append-only en M6 y M7. Estado de carga M3 en JSON persistente. "
            "README como documentación del sistema. config.py como fuente única de verdad para parámetros."
        ),
        "brecha": None,
    },

    # ── 8. Operación ─────────────────────────────────────────────────────────
    {
        "id": "8.1", "seccion": "Operación",
        "nombre": "Planificación y control operacional",
        "status": "conforme",
        "modulos": ["M1", "M2", "M3", "M7"],
        "evidencia": (
            "Pipeline orquestado M1→M8 con control de estados. "
            "Cola offline M7 para continuidad operacional. "
            "Modo rapido/completo/analitica para diferentes contextos operativos."
        ),
        "brecha": None,
    },
    {
        "id": "8.4", "seccion": "Operación",
        "nombre": "Gestión del ciclo de vida del sistema de IA",
        "status": "parcial",
        "modulos": ["Todos"],
        "evidencia": (
            "Fases 0→4 definidas con entregables verificables. "
            "Versionamiento de código en GitHub. config.py centraliza parámetros."
        ),
        "brecha": "MLOps formal: versionamiento de modelos, pipeline de reentrenamiento y monitoreo de drift no implementados.",
    },
    {
        "id": "8.5", "seccion": "Operación",
        "nombre": "Datos para sistemas de IA",
        "status": "conforme",
        "modulos": ["M1", "M4", "M8"],
        "evidencia": (
            "Dataset sintético N=20,417 declarado como tal. Plan de perfilamiento de datos reales en Fase 0. "
            "Privacidad diferencial en M8: solo datos agregados. .gitignore excluye CSVs del repo."
        ),
        "brecha": None,
    },

    # ── 9. Evaluación del desempeño ──────────────────────────────────────────
    {
        "id": "9.1", "seccion": "Evaluación",
        "nombre": "Seguimiento, medición, análisis y evaluación",
        "status": "conforme",
        "modulos": ["M8"],
        "evidencia": (
            "M8 calcula métricas operativas y de derechos con lag <24h. "
            "Comparativa AS-IS vs TO-BE automatizada contra las metas del piloto (§4.4 RFP)."
        ),
        "brecha": None,
    },
    {
        "id": "9.2", "seccion": "Evaluación",
        "nombre": "Auditoría interna del sistema de gestión de IA",
        "status": "parcial",
        "modulos": ["M8"],
        "evidencia": "Auditoría algorítmica semestral externa planificada en Fase 4.",
        "brecha": "Programa formal de auditoría interna con calendario y criterios no documentado.",
    },
    {
        "id": "9.3", "seccion": "Evaluación",
        "nombre": "Revisión por la dirección",
        "status": "parcial",
        "modulos": ["M8"],
        "evidencia": "Dashboard M8 como insumo para revisión directiva. Informes periódicos planificados.",
        "brecha": "Calendario formal de revisión por la dirección no establecido.",
    },

    # ── 10. Mejora ───────────────────────────────────────────────────────────
    {
        "id": "10.1", "seccion": "Mejora",
        "nombre": "No conformidades y acciones correctivas",
        "status": "parcial",
        "modulos": ["M6", "M8"],
        "evidencia": (
            "Protocolo de incidentes con log de errores y escalación. "
            "Canal de corrección humana en M6 (profesional edita borradores)."
        ),
        "brecha": "Registro formal de no conformidades y seguimiento de acciones correctivas no implementado.",
    },
    {
        "id": "10.2", "seccion": "Mejora",
        "nombre": "Mejora continua del sistema de gestión de IA",
        "status": "parcial",
        "modulos": ["M8"],
        "evidencia": (
            "M8 detecta vulneraciones sistemáticas para retroalimentación institucional. "
            "Fases 3 y 4 incluyen mejora continua y gobernanza."
        ),
        "brecha": "Proceso formal de mejora continua con ciclos PDCA no documentado.",
    },

    # ── Anexo A (controles específicos de IA) ────────────────────────────────
    {
        "id": "A.2.2", "seccion": "Anexo A",
        "nombre": "Política de uso responsable de IA",
        "status": "conforme",
        "modulos": ["M2", "M6"],
        "evidencia": (
            "HITL en 4 puntos críticos. Whitelist explícita de consultas automatizables. "
            "Prohibición de respuesta de fondo sin aprobación humana. Bitácora de toda acción."
        ),
        "brecha": None,
    },
    {
        "id": "A.3.3", "seccion": "Anexo A",
        "nombre": "Evaluación de impacto en privacidad",
        "status": "parcial",
        "modulos": ["M5", "M8"],
        "evidencia": (
            "Privacidad diferencial en M8: solo datos agregados. .gitignore excluye datos del repo. "
            "Ley 1581/2012 adoptada como marco. DPO designado en roles."
        ),
        "brecha": "Evaluación de Impacto en Privacidad (PIA) formal no ejecutada.",
    },
    {
        "id": "A.4.2", "seccion": "Anexo A",
        "nombre": "Documentación del sistema de IA",
        "status": "conforme",
        "modulos": ["Todos"],
        "evidencia": (
            "README documenta arquitectura, módulos, metas y marco legal. "
            "config.py como fuente única de parámetros. "
            "Docstrings en todos los agentes con responsabilidades, metas y marco legal."
        ),
        "brecha": None,
    },
    {
        "id": "A.6.1", "seccion": "Anexo A",
        "nombre": "Gestión de datos para sistemas de IA",
        "status": "conforme",
        "modulos": ["M1", "M4", "M5", "M8"],
        "evidencia": (
            "Dataset declarado como sintético. Plan de perfilamiento real en Fase 0. "
            "Normalización de taxonomías en config.py. .gitignore protege datos sensibles."
        ),
        "brecha": None,
    },
    {
        "id": "A.8.4", "seccion": "Anexo A",
        "nombre": "Pruebas del sistema de IA",
        "status": "parcial",
        "modulos": ["M2", "M4"],
        "evidencia": (
            "Test set definido para M4: 200 pares conocidos. "
            "Exactitud M2 calculada contra etiquetas del dataset (columna 'urgente')."
        ),
        "brecha": "Plan formal de pruebas técnicas, sesgos y usabilidad pendiente para Fase 2.",
    },
]

# ── MOTOR DE ANÁLISIS ─────────────────────────────────────────────────────────
def analizar_cumplimiento(clausulas: list[dict]) -> dict:
    total     = len(clausulas)
    conformes = [c for c in clausulas if c["status"] == "conforme"]
    parciales = [c for c in clausulas if c["status"] == "parcial"]
    no_conf   = [c for c in clausulas if c["status"] == "no_conforme"]
    na        = [c for c in clausulas if c["status"] == "no_aplica"]

    score = round((len(conformes) + len(parciales) * 0.5) / max(total - len(na), 1) * 100, 1)
    brechas = [c for c in clausulas if c.get("brecha")]

    return {
        "total":       total,
        "conformes":   len(conformes),
        "parciales":   len(parciales),
        "no_conformes": len(no_conf),
        "no_aplica":   len(na),
        "score_pct":   score,
        "brechas":     brechas,
    }

# ── REPORTE MARKDOWN ──────────────────────────────────────────────────────────
def generar_markdown(nist: dict, iso: dict) -> str:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    md = f"""# Reporte de Cumplimiento NIST AI RMF + ISO/IEC 42001
**agentes-defensoria-lsl2026 · Defensoría del Pueblo · URAB · LSL 2026**
Generado: {ts}

---

## Resumen Ejecutivo

| Marco | Conformes | Parciales | No conformes | Score |
|---|---|---|---|---|
| **NIST AI RMF 1.0** | {nist['conformes']} | {nist['parciales']} | {nist['no_conformes']} | **{nist['score_pct']}%** |
| **ISO/IEC 42001:2023** | {iso['conformes']} | {iso['parciales']} | {iso['no_conformes']} | **{iso['score_pct']}%** |

> Score = (conformes + parciales×0.5) / total evaluado

---

## NIST AI Risk Management Framework 1.0

"""
    for fn in ["GOVERN", "MAP", "MEASURE", "MANAGE"]:
        items = [c for c in NIST_CLAUSULAS if c["funcion"] == fn]
        md += f"### {fn}\n\n"
        for c in items:
            emoji = {"conforme": "✅", "parcial": "⚠️", "no_conforme": "❌", "no_aplica": "➖"}.get(c["status"], "❓")
            md += f"**{emoji} {c['id']} — {c['nombre']}**  \n"
            md += f"Módulos: `{'`, `'.join(c['modulos'])}`  \n"
            md += f"Evidencia: {c['evidencia']}  \n"
            if c.get("brecha"):
                md += f"⚠ Brecha: {c['brecha']}  \n"
            md += "\n"

    md += "\n---\n\n## ISO/IEC 42001:2023\n\n"
    for sec in ["Contexto", "Liderazgo", "Planificación", "Soporte", "Operación", "Evaluación", "Mejora", "Anexo A"]:
        items = [c for c in ISO_CLAUSULAS if c["seccion"] == sec]
        if not items:
            continue
        md += f"### {sec}\n\n"
        for c in items:
            emoji = {"conforme": "✅", "parcial": "⚠️", "no_conforme": "❌", "no_aplica": "➖"}.get(c["status"], "❓")
            md += f"**{emoji} {c['id']} — {c['nombre']}**  \n"
            md += f"Módulos: `{'`, `'.join(c['modulos'])}`  \n"
            md += f"Evidencia: {c['evidencia']}  \n"
            if c.get("brecha"):
                md += f"⚠ Brecha: {c['brecha']}  \n"
            md += "\n"

    # Brechas consolidadas
    todas_brechas = nist["brechas"] + iso["brechas"]
    if todas_brechas:
        md += "\n---\n\n## Plan de Cierre de Brechas\n\n"
        for b in todas_brechas:
            fase = "Fase 0" if "Fase 0" in b.get("brecha","") else \
                   "Fase 2" if "Fase 2" in b.get("brecha","") else "Fase 4"
            md += f"- **[{b['id']}]** {b['brecha']} → _{fase}_\n"

    return md

# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Verificador NIST AI RMF + ISO 42001")
    parser.add_argument("--formato",     default="terminal", choices=["terminal", "markdown", "json"])
    parser.add_argument("--solo-brechas", action="store_true", help="Mostrar solo cláusulas con brechas")
    args = parser.parse_args()

    nist_r = analizar_cumplimiento(NIST_CLAUSULAS)
    iso_r  = analizar_cumplimiento(ISO_CLAUSULAS)

    if args.formato == "json":
        print(json.dumps({
            "generado_en": datetime.now().isoformat(),
            "nist": {**nist_r, "clausulas": NIST_CLAUSULAS},
            "iso":  {**iso_r,  "clausulas": ISO_CLAUSULAS},
        }, ensure_ascii=False, indent=2))
        return

    if args.formato == "markdown":
        md = generar_markdown(nist_r, iso_r)
        out = Path(__file__).parent.parent / "outputs" / "cumplimiento_nist_iso.md"
        out.parent.mkdir(exist_ok=True)
        out.write_text(md, encoding="utf-8")
        print(md)
        print(f"\n✓ Guardado en: {out}")
        return

    # Terminal
    print(f"\n{'═'*64}")
    print(f"  VERIFICADOR NIST AI RMF + ISO 42001")
    print(f"  agentes-defensoria-lsl2026 · URAB · LSL 2026")
    print(f"{'═'*64}")
    print(f"\n  {'Marco':<25} {'✅ Conf':>8} {'⚠ Parc':>8} {'❌ No':>6} {'Score':>8}")
    print(f"  {'─'*55}")
    print(f"  {'NIST AI RMF 1.0':<25} {nist_r['conformes']:>8} {nist_r['parciales']:>8} {nist_r['no_conformes']:>6} {nist_r['score_pct']:>7}%")
    print(f"  {'ISO/IEC 42001:2023':<25} {iso_r['conformes']:>8} {iso_r['parciales']:>8} {iso_r['no_conformes']:>6} {iso_r['score_pct']:>7}%")

    todas_brechas = nist_r["brechas"] + iso_r["brechas"]
    print(f"\n  Brechas identificadas: {len(todas_brechas)}")
    if todas_brechas and (args.solo_brechas or True):
        print(f"\n  {'ID':<8} {'Nombre':<40} {'Brecha (resumen)'}")
        print(f"  {'─'*90}")
        for b in todas_brechas:
            nombre = b['nombre'][:38]
            brecha = b['brecha'][:60] if b.get('brecha') else ''
            print(f"  {b['id']:<8} {nombre:<40} {brecha}")

    print(f"\n  Para reporte completo: python gobernanza/verificador_nist_iso.py --formato markdown")
    print(f"{'═'*64}\n")


if __name__ == "__main__":
    main()
