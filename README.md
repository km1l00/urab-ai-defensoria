# agentes-defensoria-lsl2026

**Propuesta LSL 2026 · Defensoría del Pueblo de Colombia — URAB**  
Pipeline de IA agéntica para recepción inteligente y triage de peticiones ciudadanas.

---

## Estructura del proyecto

```
agentes-defensoria-lsl2026/
├── agentes/                  # Agentes M1 y M2
│   ├── agente_m1.py          # Recepción inteligente — NER + extracción + faltantes
│   └── agente_m2.py          # Clasificación + triage + priorización + XAI + HITL
├── pipeline/
│   └── pipeline_m1_m2.py     # Orquestador batch — procesa el CSV y exporta resultados
├── datos/                    # CSVs de entrada (no versionados — ver .gitignore)
├── outputs/                  # Resultados generados (no versionados)
├── tests/                    # Pruebas unitarias
├── docs/                     # Documentación técnica y legal
├── config.py                 # Configuración centralizada y taxonomías
├── requirements.txt
├── .env.example              # Plantilla de variables de entorno
└── .gitignore
```

---

## Módulos implementados

| Módulo | Archivo | Función | Meta piloto |
|--------|---------|---------|-------------|
| **M1** | `agentes/agente_m1.py` | NER + extracción de campos + detección de faltantes | Extracción correcta ≥90% campos |
| **M2** | `agentes/agente_m2.py` | Clasificación multiclase + triage + XAI + HITL | Urgentes tardíos: 56.2% → ≤4.5% |

---

## Instalación

```bash
git clone https://github.com/tu-usuario/agentes-defensoria-lsl2026.git
cd agentes-defensoria-lsl2026

pip install -r requirements.txt

cp .env.example .env
# Editá .env y pegá tu API key de Anthropic
```

---

## Uso rápido

```bash
# Solo M2 — 20 filas (demo rápida)
python pipeline/pipeline_m1_m2.py \
  --csv datos/datos_peticiones_urab_con_hechos.csv \
  --col hechos --n 20 --solo-m2

# M1 + M2 completo — 50 filas
python pipeline/pipeline_m1_m2.py \
  --csv datos/datos_peticiones_urab_con_hechos.csv \
  --col hechos --n 50
```

---

## Marco legal

- **CONPES 4144/2025** — adopción IA en sector público (Eje 6)
- **Directiva Conjunta 007/2025** — M2 es SDA: XAI obligatorio, canal de impugnación
- **Ley 1581/2012** — privacy-by-design, datos sensibles cifrados en reposo
- **Art. 29 CP** — trazabilidad de toda decisión automatizada
