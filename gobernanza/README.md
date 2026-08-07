# `gobernanza/` — Pruebas de calidad y cumplimiento

Aquí se verifica que el sistema **funcione bien** y **cumpla estándares**. Es la carpeta que respalda las afirmaciones de calidad del proyecto con experimentos que se pueden volver a correr.

## Qué hay aquí

| Archivo | Qué hace |
|---------|----------|
| `benchmark_modelos.py` | Compara tres configuraciones del clasificador (local, Claude Haiku 4.5, Claude Sonnet) sobre **20 casos etiquetados a mano**. Es el experimento reproducible que sostiene las cifras del anexo técnico. |
| `benchmark_resultado.json` | El resultado de esa comparación. |
| `comparador_modelos.py` | Compara enfoques de clasificación (reglas simples, estadística clásica, un modelo en español y la IA). |
| `verificador_nist_iso.py` | Revisa el sistema contra los marcos internacionales **NIST AI RMF** e **ISO/IEC 42001**. |
| `demo_pipeline_beto.py` | Demostración con un modelo en español (BETO). |

## Correr la comparación de modelos

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # solo las configuraciones con IA gastan; la local es gratis
python gobernanza/benchmark_modelos.py
```

> Para la prueba de que el clasificador **no discrimina** (sin costo, no usa IA), ver [`urab-ai-api/test_sesgo.py`](../urab-ai-api/test_sesgo.py).
