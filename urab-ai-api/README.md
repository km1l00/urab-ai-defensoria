# `urab-ai-api/` — El servidor (backend)

Es el cerebro del sistema. Recibe cada petición que llega desde los portales, ejecuta los módulos M1 a M8 y guarda todo. Los tres portales (ciudadano, funcionario y coordinación) le hablan a este servidor; entre ellos no se comunican directamente.

## ¿Con qué está hecho? (lo real)

- **Lenguaje:** Python, con el framework **FastAPI**.
- **Base de datos:** **SQLite** sobre un volumen persistente (se puede migrar a PostgreSQL sin cambiar la lógica).
- **Motor de IA:** **Claude (de Anthropic)** — Haiku 4.5 por defecto en la demostración, Claude Sonnet en producción.
- **Orquestación:** código propio (no depende de marcos externos de terceros).
- **Despliegue:** **Fly.io** — `urab-ai-api-lsl2026.fly.dev`.

Sin credencial de IA (`ANTHROPIC_API_KEY`), el servidor funciona igual usando un **clasificador local determinista**, sin costo. La IA solo se usa si la credencial está configurada.

## ¿Qué hay en cada archivo?

| Archivo | Qué hace |
|---------|----------|
| `main.py` | Define todas las puertas de entrada (endpoints) del sistema, bajo la ruta `/api/...`. |
| `models.py` | Estructura de los datos (petición, profesional, gestiones, sellos de versión). |
| `database.py` | Inicializa y mantiene la base de datos, incluida la migración de columnas. |
| `auth.py` | Acceso por código de profesional (funcionario) y de coordinación. |
| `agentes/orquestador.py` | La cadena de módulos M1 a M7 que corre en producción. |
| `adaptador_orquestador.py` | Decide entre clasificador local (gratis) y orquestador con IA (`USAR_ORQUESTADOR=1`). |
| `anonimizacion.py` | Seudonimiza cédula, nombre, dirección, teléfono y correo antes de llamar a la IA, y rehidrata la salida. |
| `ia.py` | Único punto de contacto con el modelo de IA. Aquí se fija el modelo por defecto. |
| `modulos_ia.py` | Funciones de IA bajo demanda: borrador M6, historial 360 (M5), verificación de duplicados (M4), analítica (M8), justificación de reparto (M3). |
| `ocr.py` | Lee documentos e imágenes con Claude Vision (parte de M1). |
| `pdf_respuesta.py` | Genera la respuesta al ciudadano como carta oficial en PDF. |
| `alertas_correo.py` | Correo de alertas diarias. |
| `simulador_legacy.py` | Doble de prueba que imita IRIS y VisionWeb (M7). |
| `seed_data.py` | Carga los casos de demostración. |
| `test_sesgo.py` | Prueba de que el clasificador no discrimina (se corre sin costo). |
| `informe_sesgo.json` | Resultado de la prueba de sesgo. |
| `Dockerfile`, `docker-compose.yml`, `fly.toml` | Empaquetado y despliegue en la nube. |
| `urab_ai.db` | Base de datos de la demostración (datos sintéticos). |

## Correrlo en tu máquina

```bash
cd urab-ai-api
pip install -r requirements.txt
# Opcional (habilita la IA); sin esto corre en modo local sin costo:
export ANTHROPIC_API_KEY="sk-ant-..."
uvicorn main:app --reload
```

Queda disponible en `http://localhost:8000`. La documentación interactiva de los endpoints aparece en `http://localhost:8000/docs`.

## Probar el sesgo del clasificador (sin costo)

```bash
cd urab-ai-api
python test_sesgo.py
```

---

*Los datos de este servidor son sintéticos. En producción, el tratamiento de datos personales sigue la Ley 1581 de 2012; ver `docs/PRIVACIDAD_Y_RIESGOS.md`.*
