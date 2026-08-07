# `pipeline/` — Procesamiento en lote

Herramienta para correr los módulos (M1 a M8) sobre **muchas peticiones a la vez**, por ejemplo un archivo con cientos de casos, en lugar de una por una. Útil para pruebas y para procesar datos históricos.

## Qué hay aquí

| Archivo | Qué hace |
|---------|----------|
| `orquestador.py` | Corre la cadena completa M1 a M8 sobre un lote de casos. |
| `pipeline_m1_m2.py` | Una versión más corta que solo corre recepción (M1) y triage (M2). |

Usa los módulos de la carpeta [`agentes/`](../agentes/). No confundir con el orquestador de producción, que está en [`urab-ai-api/agentes/`](../urab-ai-api/agentes/).
