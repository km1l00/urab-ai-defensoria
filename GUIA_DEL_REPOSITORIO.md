# Guía del repositorio — qué es cada cosa

Esta guía recorre **carpeta por carpeta y archivo por archivo**, en lenguaje llano, para que cualquiera entienda qué hace cada parte. Es el complemento del [README principal](README.md).

Si nunca has visto un repositorio de código: piensa en él como un archivador. Cada carpeta es una gaveta con un propósito; cada archivo es un documento dentro de ella. Abajo se explica gaveta por gaveta.

---

## En la raíz (lo primero que ves al entrar)

| Archivo | Qué es |
|---------|--------|
| `README.md` | La portada del proyecto. Explica qué es todo esto. Empieza por aquí. |
| `GUIA_DEL_REPOSITORIO.md` | Este documento. |
| `CLAUDE.md` | Notas internas de contexto para el asistente de IA que ayuda a mantener el código. |
| `config.py` | Ajustes centrales del sistema: las categorías de peticiones, los umbrales de urgencia y las metas del piloto. Si algo hay que "calibrar", suele estar aquí. |
| `benchmark_urab.py` | Un experimento que compara varios modelos de IA (costo y precisión) sobre unas peticiones de prueba. |
| `requirements.txt` | La lista de librerías de Python que el proyecto necesita para funcionar. |

---

## `urab-ai-api/` — el servidor (el cerebro)

Es la pieza más importante. Recibe cada petición, ejecuta los módulos M1 a M8 y guarda todo. Está hecho en Python.

| Archivo | Qué hace |
|---------|----------|
| `main.py` | El corazón del servidor. Define todas las "puertas de entrada" (los endpoints) que usan los portales: radicar, consultar, clasificar, gestionar, cerrar. |
| `models.py` | Describe cómo se guardan los datos (la petición, el profesional, las gestiones). |
| `database.py` | Prepara y mantiene la base de datos. |
| `auth.py` | Controla el acceso: quién puede entrar y como qué rol (funcionario, coordinación). |
| `agentes/orquestador.py` | La "cadena de montaje" de los módulos: coordina M1 a M7 en orden. Es la versión que corre en producción. |
| `adaptador_orquestador.py` | El puente que decide si se usa el clasificador local (gratis) o el orquestador con IA. |
| `anonimizacion.py` | Reemplaza los datos personales por códigos antes de hablar con la IA, y los restaura en la respuesta. |
| `ia.py` | El único punto por donde el sistema le habla al modelo de IA (Claude). Tener un solo punto facilita auditarlo. |
| `modulos_ia.py` | Las funciones de IA bajo demanda: redactar el borrador (M6), historial 360 (M5), verificar duplicados (M4), analítica (M8). |
| `ocr.py` | Lee documentos e imágenes con Claude Vision y extrae los campos (parte de M1). |
| `pdf_respuesta.py` | Arma la respuesta final al ciudadano como una carta oficial en PDF. |
| `alertas_correo.py` | Envía el correo de alertas diarias. |
| `simulador_legacy.py` | Un "doble de prueba" que imita a IRIS y VisionWeb (los sistemas reales de la Defensoría), porque no tenemos acceso a ellos (M7). |
| `seed_data.py` | Carga los casos de demostración en la base de datos. |
| `test_sesgo.py` | La prueba que verifica que el clasificador no discrimina. Se puede correr sin costo. |
| `informe_sesgo.json` | El resultado de esa prueba. |
| `Dockerfile`, `docker-compose.yml`, `fly.toml` | Instrucciones para empaquetar y desplegar el servidor en la nube (Fly.io). |
| `requirements.txt` | Librerías de Python del servidor. |
| `urab_ai.db` | La base de datos de la demostración (con casos sintéticos). |

---

## `urab-ai-ciudadano/` — portal del ciudadano

La página web donde un ciudadano radica su petición y le hace seguimiento. Hecha en React.

| Elemento | Qué es |
|----------|--------|
| `src/App.jsx` | Toda la interfaz del portal, en un solo archivo. |
| `src/index.css`, `src/theme.js` | Los colores y estilos (incluye modo claro y oscuro). |
| `index.html`, `vite.config.js`, `package.json` | Configuración para construir y correr la página. |
| `vercel.json` | Configuración de despliegue en Vercel. |

Los otros dos portales (`urab-ai-funcionario/` y `urab-ai-coordinador/`) tienen la misma estructura.

---

## `urab-ai-funcionario/` y `urab-ai-coordinador/` — paneles internos

- **Funcionario:** la bandeja donde el profesional ve sus casos, revisa el borrador de respuesta (M6) y gestiona el trámite.
- **Coordinación:** el panel donde se ve el reparto, la analítica (M8) y las alertas de posibles vulneraciones.

Misma tecnología que el portal ciudadano (React, un solo `App.jsx`).

---

## `urab-ai-hub/` — página de entrada

| Archivo | Qué es |
|---------|--------|
| `index.html` | Una página simple que enlaza a los tres portales. Es lo primero que ve alguien que llega al sistema. |

---

## `agentes/` — los módulos "de laboratorio"

Una versión de los ocho módulos (M1 a M8) pensada para experimentar por separado, fuera del servidor. Útil para pruebas; **no es la que corre en producción** (esa está en `urab-ai-api/agentes/`).

| Archivo | Qué es |
|---------|--------|
| `agente_m1.py` … `agente_m8.py` | Un archivo por módulo. |
| `ocr_m1.py` | Lectura de documentos para el módulo M1. |

---

## `pipeline/` — procesamiento en lote

Herramienta para correr los módulos sobre **muchas** peticiones a la vez (por ejemplo, un archivo con cientos de casos), en lugar de una por una.

| Archivo | Qué es |
|---------|--------|
| `orquestador.py` | Corre la cadena M1 a M8 sobre un lote de casos. |
| `pipeline_m1_m2.py` | Una versión más corta que solo corre recepción y triage. |

---

## `gobernanza/` — pruebas de calidad y cumplimiento

Aquí se verifica que el sistema funcione bien y cumpla estándares.

| Archivo | Qué hace |
|---------|----------|
| `benchmark_modelos.py` | Compara la precisión de tres configuraciones del clasificador sobre 20 casos etiquetados a mano. Es el experimento reproducible que respalda las cifras del anexo técnico. |
| `benchmark_resultado.json` | El resultado de esa comparación. |
| `comparador_modelos.py` | Compara distintos enfoques de clasificación (reglas simples, estadística, IA). |
| `verificador_nist_iso.py` | Revisa el sistema contra los marcos internacionales NIST y ISO/IEC 42001. |
| `demo_pipeline_beto.py` | Una demostración con un modelo en español (BETO). |

---

## `datos/` — datos de ejemplo

| Archivo | Qué es |
|---------|--------|
| `bitacora_m7.jsonl` | El registro de la sincronización con los sistemas legados (M7): qué se replicó, cuándo y con qué resultado. |

---

## `docs/` — los documentos del proyecto

Los entregables escritos, no código.

| Archivo | Qué es |
|---------|--------|
| `Informe_Tecnico_LSL2026_URAB.docx` | El informe técnico general. |
| `Costos_RFP_72_FINAL_LSL2026.docx` | El modelo de costos. |
| `Gobernanza_CambioSociotecnico_Riesgos_LSL2026.docx` | Gobernanza, cambio sociotécnico y riesgos. |
| `RedTeaming_v3_LSL2026.docx` | Las pruebas de "equipo rojo" (buscar fallas a propósito). |
| `PRIVACIDAD_Y_RIESGOS.md` | Cómo se protegen los datos y qué riesgos quedan. |
| `Deck_SharkTank_LSL2026_URAB.pptx` | La presentación del proyecto. |
| `demo_pipeline_anthropic.html` | Una demostración visual del flujo. |
| `sprints/` | Notas de las etapas de desarrollo. |

---

## `tests/` — pruebas automáticas

Espacio reservado para pruebas automáticas del código. Las pruebas principales que hoy funcionan están en `urab-ai-api/test_sesgo.py` (prueba de sesgo) y en `gobernanza/` (comparación de modelos).

---

## ¿Por dónde empiezo según lo que quiera hacer?

- **Solo entender el proyecto:** el [README principal](README.md).
- **Ver el detalle de una parte:** el README dentro de esa carpeta.
- **Correr el sistema:** la sección "Para desarrolladores" del README principal y el README de `urab-ai-api/`.
- **Revisar la calidad o el sesgo:** la carpeta `gobernanza/` y `urab-ai-api/test_sesgo.py`.
- **Leer la propuesta escrita:** la carpeta `docs/`.
