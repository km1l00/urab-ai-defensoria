# URAB-AI · Backend API

**Orquestador agéntico + API REST compartida entre los dos frontends**

> Legal Strategy Lab 2026 · Universidad Externado de Colombia  
> Defensoría del Pueblo de Colombia — Unidad de Recepción y Análisis de Bogotá (URAB)

---

## Qué es este repo

Backend central de URAB-AI. Expone un API REST que consumen el portal ciudadano y el panel del funcionario de forma independiente. Contiene el orquestador Python con los módulos M1–M8 (LangGraph + CrewAI), la integración con Claude API (Anthropic), PostgreSQL + pgvector, y la cola offline con Redis.

```
urab-ai-ciudadano/   → consume este API
urab-ai-funcionario/ → consume este API
urab-ai-api/         ← este repo
```

---

## Arquitectura

```
FastAPI (API Gateway)
├── Auth JWT por roles (ciudadano, profesional, coordinador, auditor, admin)
├── Rate limiting por IP y por token
├── Logs de auditoría inmutables (append-only)
│
Orquestador Python (LangGraph + CrewAI)
├── M1  Recepción inteligente (NLP/NER + OCR + cadena de custodia SHA-256)
├── M2  Clasificación y triage (Claude Sonnet 4.6 + reglas hard-coded)
├── M3  Reparto tri-dimensional (especialidad → carga → continuidad)
├── M4  Anti-duplicidad vectorial (pgvector, umbral configurable)
├── M5  Historial unificado por cédula
├── M6  IA generativa + RAG + HITL (sello IA + bitácora de ediciones)
├── M7  Interoperabilidad IRIS/VisionWeb (API + RPA fallback) + M7-C cierre
└── M8  Analítica BI + monitor de deriva (drift)
│
Datos
├── PostgreSQL + pgvector  (radicados, embeddings, logs, bitácoras)
├── Redis                  (cola offline, sesiones, rate limiting)
└── S3-compatible          (PDF/A escaneados, anexos)
```

---

## Stack

```
Python 3.12
FastAPI 0.111
LangGraph 0.2
CrewAI 0.4
Anthropic SDK (Claude Sonnet 4.6)
PostgreSQL 16 + pgvector
Redis 7
SQLAlchemy + Alembic (migraciones)
Pydantic v2
pytest
```

---

## Estructura del repo

```
urab-ai-api/
├── agentes/
│   ├── orquestador.py          Pipeline principal M1–M8
│   ├── m1_recepcion.py         Módulo M1 (NLP, OCR, custodia)
│   ├── m2_triage.py            Módulo M2 (clasificador + reglas)
│   ├── m3_reparto.py           Módulo M3 (tri-dimensional)
│   ├── m4_duplicados.py        Módulo M4 (vectorial pgvector)
│   ├── m5_historial.py         Módulo M5 (vista 360°)
│   ├── m6_generativo.py        Módulo M6 (RAG + HITL + sello)
│   ├── m7_interop.py           Módulo M7 (IRIS/VisionWeb + M7-C cierre)
│   └── m8_analitica.py         Módulo M8 (métricas + monitor drift)
│
├── api/
│   ├── main.py                 FastAPI app + lifespan
│   ├── auth.py                 JWT + roles
│   ├── routes/
│   │   ├── peticiones.py       POST /peticiones/nueva, GET /peticiones/{id}
│   │   ├── casos.py            GET /casos, POST /casos/{id}/aprobar
│   │   ├── dashboard.py        GET /dashboard/metricas, /drift
│   │   ├── offline.py          POST /peticiones/sync-offline
│   │   └── admin.py            Gestión usuarios y perfiles
│   └── middleware.py           Rate limiting, CORS, logs
│
├── db/
│   ├── models.py               SQLAlchemy models
│   ├── migrations/             Alembic migrations
│   └── seed_sintetico.py       Corpus sintético N=20,417 (LSL2026)
│
├── gobernanza/
│   ├── verificador_nist_iso.py NIST AI RMF + ISO/IEC 42001 verifier
│   ├── drift_monitor.py        Monitor de deriva (3 umbrales)
│   ├── inventario_algoritmos/
│   │   ├── M2_clasificador.json   Ficha SDA Directiva 007/2025
│   │   └── M4_duplicados.json     Ficha SDA Directiva 007/2025
│   └── principios_gobernanza.md
│
├── scripts/
│   └── ocr_m1.py              OCR semántico + hash PDF/A
│
├── tests/
│   ├── test_m2_triage.py       HITL recall como métrica no negociable
│   ├── test_m4_duplicados.py   Recall ≥85%, FP ≤8%
│   └── test_drift.py           Umbrales amarillo/naranja/rojo
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md                   ← este archivo
```

---

## Setup local

### Con Docker (recomendado)

```bash
git clone https://github.com/MireyaCamacho/urab-ai-api
cd urab-ai-api
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY
docker-compose up --build
# API disponible en http://localhost:8000
# Docs interactivas en http://localhost:8000/docs
```

### Manual

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Base de datos (requiere PostgreSQL + pgvector instalado)
alembic upgrade head
python db/seed_sintetico.py        # carga corpus sintético LSL2026

# Redis
redis-server &

uvicorn api.main:app --reload
```

### Variables de entorno

```env
# .env.example

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
URAB_MODEL=claude-sonnet-4-6

# Base de datos
DATABASE_URL=postgresql://urab:password@localhost:5432/urab_ai
PGVECTOR_ENABLED=true

# Redis (cola offline)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=cambiar-en-produccion
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

# Módulo M4
UMBRAL_SIMILITUD_M4=0.85

# Módulo M2 — drift
DRIFT_PRECISION_BASELINE=0.88
DRIFT_RECALL_BASELINE=1.0

# Storage (PDF/A escaneados)
S3_BUCKET=urab-ai-documentos
S3_ENDPOINT=https://...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# IRIS / VisionWeb (producción)
IRIS_API_URL=
VISIONWEB_API_URL=
RPA_FALLBACK_ENABLED=true

# Entorno
ENV=development
LOG_LEVEL=INFO
```

---

## Endpoints principales

### Ciudadano
```
POST /peticiones/nueva              Radicar petición
GET  /peticiones/{radicado}         Consultar estado
POST /peticiones/sync-offline       Sincronizar cola offline
POST /auth/ciudadano/login          Login por cédula
```

### Funcionario
```
GET  /casos                         Bandeja (filtros: urgencia, hitl, profesional)
GET  /casos/{radicado}              Detalle + trazabilidad completa
POST /casos/{radicado}/aprobar      Aprobar borrador M6 (registra en bitácora)
POST /casos/{radicado}/acumular     Aprobar acumulación M4
POST /casos/{radicado}/cerrar       Cierre M7-C (hash SHA-256 + sync IRIS/VisionWeb)
POST /auth/funcionario/login        Login por credenciales institucionales
```

### Dashboard M8
```
GET  /dashboard/metricas            AS-IS vs TO-BE + ROI
GET  /dashboard/drift               Estado del monitor de deriva actual
GET  /dashboard/carga               Distribución de carga por profesional
GET  /dashboard/equidad             Métricas de enfoque diferencial
```

### Admin
```
GET  /admin/profesionales           Lista con perfiles de especialidad
PUT  /admin/profesionales/{id}      Actualizar especialidades y carga máxima
GET  /admin/inventario-algoritmos   Fichas M2 y M4 (Directiva 007/2025)
POST /admin/drift/evaluar           Evaluación manual de deriva
```

---

## Tests

```bash
pytest tests/ -v

# Test clave: HITL recall no negociable
pytest tests/test_m2_triage.py::test_hitl_recall_urgentes -v
# Este test DEBE pasar al 100% — un fallo hace inelegible el modelo

# Test de umbrales de drift
pytest tests/test_drift.py -v
```

---

## Deploy en Railway (recomendado para el API)

```bash
npm install -g @railway/cli
railway login
railway init
railway up

# Variables de entorno: configurar en Railway dashboard
# Base de datos: Railway PostgreSQL + plugin pgvector
# Redis: Railway Redis plugin
```

---

## Modo offline y resiliencia

### Cola offline ciudadano
1. El portal ciudadano envía paquetes firmados (SHA-256) al endpoint `/peticiones/sync-offline`
2. El API verifica la firma antes de procesar — paquetes alterados son rechazados
3. Los paquetes se encolan en Redis y el orquestador los procesa secuencialmente

### Modo manual URAB (alerta roja de drift)
Si `m8_analitica.py` detecta drift nivel ROJO:
1. M2 se suspende — todas las peticiones nuevas van a bandeja sin clasificar
2. M6 sigue generando borradores pero el HITL se activa para el 100% de casos
3. El dashboard M8 entra en modo lectura con banner de alerta visible
4. El coordinador recibe notificación por correo y en el panel

### Fallback IRIS/VisionWeb
Si la API de IRIS o VisionWeb no responde:
1. El RPA bot toma el control (M7 detecta el fallo por timeout)
2. Las actualizaciones se encolan en Redis con reintentos cada 5 minutos
3. El log de M7 registra cada intento con timestamp y código de error

---

## Normativa y gobernanza

| Norma | Implementación en este repo |
|-------|----------------------------|
| Directiva 007/2025 | `gobernanza/inventario_algoritmos/` — fichas M2 y M4 para publicación |
| CONPES 4144/2025 | `gobernanza/verificador_nist_iso.py` — mapa Eje 6 |
| Ley 1581/2012 | DPA Anthropic (zero data retention) · pseudonimización pre-API · cifrado en reposo |
| Art. 29 CP | Trazabilidad inmutable en cada decisión automatizada · canal de impugnación |
| NIST AI RMF | GOVERN/MAP/MEASURE/MANAGE mapeados en verificador |
| ISO/IEC 42001 | Política de actualización controlada · registro de cambios |

---

## Métricas objetivo (piloto URAB 90 días)

| Indicador | Baseline AS-IS | Meta TO-BE | Verificación |
|-----------|---------------|------------|--------------|
| Tiempo mediano triage | 9.1 h | ≤ 2.0 h | Log timestamps |
| Urgentes con triage tardío >8h | 56.2% | ≤ 4.5% | Dashboard M8 |
| HITL recall urgentes | — | **100%** | `test_m2_triage.py` |
| Precisión M2 | — | ≥ 88% | Muestra 500 casos |
| Recall duplicados M4 | 0% | ≥ 85% | Test set 200 pares |
| Doble registro IRIS/VisionWeb | 72.6% | ≤ 5% | Conteo radicados |
| Ratio carga máx/mín | 7.7x | ≤ 2.1x | Dashboard M8 |

> **Nota sobre datos:** el corpus de desarrollo usa datos sintéticos (N=20,417 radicados simulados, 90 días, calibrados al RFP LSL2026). Declarar siempre como sintéticos. La Fase 0 real incluye perfilamiento con datos reales de la URAB bajo protocolo de datos de la Defensoría.

---

## Contribuir (equipo LSL2026)

```bash
# Flujo de trabajo
git checkout -b feature/nombre-modulo
# ... cambios ...
git push origin feature/nombre-modulo
# Abrir PR hacia main — requiere revisión de al menos 1 miembro del equipo
```

**Equipo:** Mireya Camacho · Daniel · Tomás

---

*LSL2026 · Universidad Externado de Colombia · Facultad de Derecho*  
*Directiva 007/2025 · CONPES 4144 · Ley 1581/2012 · NIST AI RMF · ISO/IEC 42001*
