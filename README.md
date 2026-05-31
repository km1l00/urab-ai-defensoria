# 🏛️ URAB-AI — Sistema de Automatización Agéntica para la Defensoría del Pueblo

> **Legal Strategy Lab 2026 — Universidad Externado de Colombia**  
> Propuesta para la Unidad de Recepción y Análisis de Bogotá (URAB) de la Defensoría del Pueblo

---

## 📋 Descripción del Proyecto

URAB-AI es una propuesta de sistema integral de inteligencia artificial para automatizar el macroproceso de **ingesta, clasificación, triage y gestión de peticiones ciudadanas** de la URAB. El sistema procesa ~300 peticiones diarias con un equipo reducido de 17 profesionales, apuntando a reducir el tiempo de triage de 9.1h a ≤2h y garantizar que los casos urgentes sean atendidos a tiempo.

La arquitectura se basa en el paradigma de **Automatización Agéntica de Procesos (APA)**: una capa cognitiva orquestada con LangGraph + CrewAI, más una capa de ejecución RPA para interoperabilidad con los sistemas legacy IRIS y VisionWeb.

---

## 🚨 El Problema

| Indicador | AS-IS | TO-BE | Mejora |
|-----------|-------|-------|--------|
| Mediana tiempo de triage | 9.1 h | ≤ 2.0 h | **−85%** |
| Urgentes con triage tardío (>8h) | 56.2% | ≤ 4.5% | **−92%** |
| Doble registro IRIS/VisionWeb | 72.6% | ≤ 5% | **−93%** |
| Horas/año perdidas en doble registro | ~14,400 h | ~1,080 h | **−93%** |
| Detección de duplicados | 0% | ≥ 85% recall | — |
| Ratio carga máx/mín entre profesionales | 7.7x | ≤ 2.1x | **−73%** |

**ROI central:** 13,320 horas liberadas/año = **6.4 FTE** redirigibles a gestión misional + **+7,600 urgentes adicionales atendidos a tiempo por año**.

---

## 🏗️ Arquitectura — Módulos M1–M8

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA AGÉNTICA (LangGraph + CrewAI)            │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │  M1  │→ │  M2  │→ │  M3  │  │  M4  │  │  M5  │  │  M6  │  │
│  │Recep.│  │Class.│  │Reprt.│  │Dedup │  │Histor│  │GenIA │  │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
└─────────────────────────────────────────────────────────────────┘
         ↕ RPA (fallback si no hay API)        ↕ M7 Interop
┌─────────────────────────────────────────────────────────────────┐
│               SISTEMAS LEGACY — IRIS + VisionWeb                │
└─────────────────────────────────────────────────────────────────┘
                          ↕ M8 Analytics
┌─────────────────────────────────────────────────────────────────┐
│           DASHBOARD BI — Operativa + Derechos (M8)              │
└─────────────────────────────────────────────────────────────────┘
```

| Módulo | Función | Tecnología | Meta piloto |
|--------|---------|------------|-------------|
| **M1** | Recepción inteligente — NLP/NER + OCR | BETO / RoBERTa-es | Extracción ≥90% campos |
| **M2** | Clasificación y triage multiclase + urgencia | Fine-tuned transformer | Urgentes tardíos: 56.2% → ≤4.5% |
| **M3** | Reparto inteligente — balanceo de carga | LangGraph routing | Ratio carga: 7.7x → ≤2.1x |
| **M4** | Anti-duplicidad vectorial | pgvector (umbral ≥85%) | Recall ≥85%, FP ≤8% |
| **M5** | Historial unificado por cédula | Vector store + SQL | Consulta <30s |
| **M6** | IA generativa + RAG + HITL | Claude API + RAG corpus | Borradores sin edición ≥60% |
| **M7** | Interoperabilidad IRIS/VisionWeb | RPA fallback | Doble registro: 72.6% → ≤5% |
| **M8** | Analítica BI — operativa + derechos | Dashboard BI | Lag <24h |

---

## 🤖 Stack Tecnológico

### On-Premise (M1–M5, M7)
- **NLP/NER:** BETO / RoBERTa-es (fine-tuned para español jurídico colombiano)
- **Orquestación:** LangGraph + CrewAI
- **Automatización legacy:** RPA (fallback para IRIS/VisionWeb sin API)
- **Deduplicación:** pgvector con similitud vectorial (umbral configurable ≥85%)
- **Base de datos:** PostgreSQL + pgvector

### API / Nube (M6)
- **Generación de borradores:** Claude API (Anthropic) con RAG sobre corpus institucional
- **Patrón:** RAG como firewall de datos — nunca LLM directo sin contexto institucional

### Prototipo / Demo
- **Frontend MVP:** React (JSX) con 5 tabs: ingesta CSV, pipeline IA, métricas, verificadores NIST y ISO
- **Datos:** Simulación probabilística calibrada al RFP (N=20,417 radicados, 90 días)

---

## 🛡️ Human-in-the-Loop (HITL) — Puntos de decisión humana obligatorios

El sistema garantiza intervención humana en **4 puntos no delegables**:

1. **Toda alerta de urgencia inminente** — amenaza vital, desaparición, NNA en riesgo
2. **Casos con menor de edad o persona con discapacidad**
3. **Despacho de respuesta de fondo al ciudadano** — M6 solo elabora borradores; el profesional aprueba y firma
4. **Decisión de acumulación de expedientes** — M4 sugiere, el profesional aprueba

---

## ⚖️ Marco Jurídico y Cumplimiento

| Norma | Aplicación en el sistema |
|-------|--------------------------|
| **CONPES 4144/2025** | Mapeo de módulos al Eje 6 de adopción IA en sector público |
| **Directiva Conjunta 007/2025** | M2 y M4 son SDA: inventario público de algoritmos, XAI obligatorio, canal de impugnación ciudadana, apertura de código fuente |
| **Ley 1581/2012** | Privacy-by-design: cifrado en reposo de datos sensibles, control de acceso por roles, DPO designado |
| **Art. 29 CP** | Trazabilidad de toda decisión automatizada; derecho a recurrir ante funcionario en ≤5 días hábiles |

### Justificación del split on-premise / API
La arquitectura híbrida se sostiene en tres pilares:
1. **Anonimización en el punto de transferencia** — ningún dato identificable llega a la API
2. **RAG como firewall** — el LLM nunca accede directamente a expedientes crudos
3. **HITL reduce el perfil de riesgo de M6** — el borrador generativo no es una decisión, es un insumo

---

## 📁 Estructura del Repositorio

```
urab-ai/
├── docs/
│   ├── arquitectura/          # Diagramas de flujo AS-IS y TO-BE
│   ├── juridico/              # Matrices de cumplimiento normativo
│   └── pitch/                 # Materiales para el Shark Tank LSL 2026
├── mvp/
│   └── src/
│       └── App.jsx            # MVP React — pipeline demo
├── data/
│   └── synthetic/             # Datos sintéticos calibrados al RFP (N=20,417)
├── modules/
│   ├── m1_reception/          # NLP/NER ingesta multicanal
│   ├── m2_classification/     # Clasificación y triage
│   ├── m3_routing/            # Reparto inteligente
│   ├── m4_deduplication/      # Anti-duplicidad vectorial
│   ├── m5_history/            # Historial unificado por cédula
│   ├── m6_generative/         # RAG + Claude API + HITL
│   ├── m7_interop/            # RPA IRIS/VisionWeb
│   └── m8_analytics/          # Dashboard BI
└── README.md
```

---

## 📊 Datos y Metodología

> ⚠️ **Aviso importante:** Todos los datos utilizados en el prototipo son **sintéticos**, generados mediante simulación probabilística calibrada a los parámetros del RFP oficial (300 peticiones/día, 17 profesionales, 90 días de operación). No contienen información real de ciudadanos ni de la Defensoría del Pueblo. El perfilamiento de datos reales está contemplado en la **Fase 0** del plan de implementación.

Los datos sintéticos reflejan las distribuciones documentadas en el RFP §2.3–2.4 y son públicamente reproducibles para fines de evaluación y replicación del estudio.

---

## 🔄 Fases de Implementación

```
Fase 0 ─── Diagnóstico y perfilamiento de datos reales (URAB)
Fase 1 ─── Diseño de arquitectura e integración (IRIS + VisionWeb)
Fase 2 ─── Construcción de módulos IA (piloto URAB)
Fase 3 ─── Implementación, capacitación (≥20 profesionales) y operación inicial
Fase 4 ─── Gobernanza y mejora continua
```

---

## 🌱 Cambio Sociotécnico — Capacidades habilitadas

- **Nuevas capacidades:** triage en tiempo real sin represamiento; vista 360° del historial ciudadano; alertas proactivas de urgencia
- **Nuevas conductas:** detección temprana de patrones de violación sistemática (M8 → investigación institucional); el profesional migra de *data-entry* a analista de casos complejos
- **Salvaguardas ante impactos disruptivos:** Comité de IA con sociedad civil, auditoría algorítmica semestral externa, informe público anual de equidad, notificación explícita al ciudadano en cada acuse de recibo

---

## 👥 Equipo

Proyecto desarrollado en el marco del **Legal Strategy Lab 2026** — Universidad Externado de Colombia, Facultad de Derecho.

---

## 📄 Licencia

Este repositorio contiene materiales académicos desarrollados para el LSL 2026. Los datos sintéticos son de libre uso para fines de investigación y replicación con atribución.

---

*"El objetivo no es automatizar la Defensoría — es garantizar más derechos, más rápido, sin excluir a nadie."*
