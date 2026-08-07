# `agentes/` — Los módulos "de laboratorio"

Una versión de los ocho módulos del sistema (M1 a M8) pensada para **experimentar por separado**, fuera del servidor. Sirve para probar cada módulo de forma aislada.

> **Importante:** esta **no** es la versión que corre en producción. La que se despliega en el servidor está en [`urab-ai-api/agentes/orquestador.py`](../urab-ai-api/agentes/orquestador.py). Estas dos implementaciones conviven a propósito: esta es para pruebas de laboratorio; la del servidor es la operativa.

## Qué hay aquí

| Archivo | Módulo |
|---------|--------|
| `agente_m1.py` | M1 · Recepción (lee la petición y extrae los datos) |
| `agente_m2.py` | M2 · Triage (tipo y urgencia) |
| `agente_m3.py` | M3 · Reparto |
| `agente_m4.py` | M4 · Anti-duplicados |
| `agente_m5.py` | M5 · Historial |
| `agente_m6.py` | M6 · Redacción asistida |
| `agente_m7.py` | M7 · Interoperabilidad |
| `agente_m8.py` | M8 · Analítica |
| `ocr_m1.py` | Lectura de documentos para M1 |

Para correr los módulos sobre muchos casos a la vez, ver la carpeta [`pipeline/`](../pipeline/).
