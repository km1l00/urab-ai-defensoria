# URAB-AI — Sistema de apoyo con inteligencia artificial para la Defensoría del Pueblo

> Propuesta del **Legal Strategy Lab 2026** · Universidad Externado de Colombia
> Para la **Unidad de Recepción y Análisis de Bogotá (URAB)** de la Defensoría del Pueblo de Colombia

Este documento está escrito para que **cualquier persona**, tenga o no formación técnica, entienda qué hay en este repositorio y qué hace cada parte. Si buscas el detalle técnico, cada carpeta tiene su propio README y al final hay una [guía completa del repositorio](GUIA_DEL_REPOSITORIO.md).

---

## ¿Qué es esto en una frase?

Un sistema que **ayuda a los funcionarios de la Defensoría a atender más rápido y con más criterio las peticiones ciudadanas**, sin quitarles la decisión: la máquina propone, una persona decide.

## ¿Qué problema resuelve?

La URAB recibe alrededor de **300 peticiones al día** con un equipo pequeño. Hoy ese trabajo es manual: leer cada petición, clasificarla, ver su urgencia, repartirla al profesional adecuado, revisar si está repetida y redactar la respuesta. Eso genera demoras, y las demoras en casos urgentes (una amenaza, una desaparición, un caso de niñez o violencia) pueden costar derechos.

URAB-AI toma las tareas repetitivas de ese flujo y las asiste con inteligencia artificial, **dejando siempre la decisión final en manos de un servidor público**.

---

## ¿Cómo se ve funcionando?

El sistema tiene una página de entrada y tres portales, más un servidor que hace el trabajo por detrás:

| Enlace | Para quién | Qué hace |
|--------|-----------|----------|
| **Página de entrada** — `urab-ai-hub.vercel.app` | Cualquiera | Elige a qué portal entrar |
| **Portal ciudadano** — `urab-ai-ciudadano.vercel.app` | Ciudadanos | Radicar una petición y hacerle seguimiento |
| **Panel del funcionario** — `urab-ai-funcionario.vercel.app` | Profesionales de la URAB | Bandeja de casos, borradores de respuesta, gestión |
| **Panel de coordinación** — `urab-ai-coordinador.vercel.app` | Coordinación | Reparto, analítica y alertas |
| **Servidor (API)** — `urab-ai-api-lsl2026.fly.dev` | (interno) | Procesa todo lo anterior |

> **Todos los datos son sintéticos** (inventados para la demostración). El sistema **no contiene información real de ciudadanos** ni de la Defensoría.

---

## Los ocho módulos (M1 a M8) en lenguaje llano

El sistema divide el trabajo en ocho piezas. Cada una hace una cosa concreta:

| Módulo | En una frase |
|--------|--------------|
| **M1 · Recepción** | Lee la petición y los documentos adjuntos, y saca los datos clave (quién, qué pide, contra quién). |
| **M2 · Triage** | Decide de qué tipo es la petición y qué tan urgente es, y explica por qué. |
| **M3 · Reparto** | Sugiere a qué profesional asignarla, según especialidad y carga de trabajo. |
| **M4 · Anti-duplicados** | Detecta si esa petición ya se había radicado antes, para no procesarla dos veces. |
| **M5 · Historial** | Reúne todos los casos anteriores de la misma persona en una sola vista. |
| **M6 · Redacción asistida** | Escribe un borrador de respuesta que el profesional revisa, corrige y aprueba. |
| **M7 · Interoperabilidad** | Sincroniza el caso con los sistemas existentes de la Defensoría (IRIS y VisionWeb). |
| **M8 · Analítica** | Muestra tableros con tiempos, cargas y alertas de posibles vulneraciones. |

**Regla de oro del sistema:** en los casos delicados (riesgo vital, niñez, discapacidad) siempre revisa una persona. Eso no depende de la inteligencia artificial: unas reglas fijas marcan esos casos **antes** de que el modelo intervenga.

---

## ¿Cómo está organizado el repositorio?

Cada carpeta tiene su propio README con la explicación detallada. Este es el mapa general:

| Carpeta | Qué contiene |
|---------|--------------|
| [`urab-ai-api/`](urab-ai-api/) | **El servidor.** El cerebro del sistema: recibe las peticiones, corre los módulos y guarda todo. (Python) |
| [`urab-ai-ciudadano/`](urab-ai-ciudadano/) | **Portal del ciudadano.** La página web donde se radica una petición. (React) |
| [`urab-ai-funcionario/`](urab-ai-funcionario/) | **Panel del funcionario.** La bandeja de casos del profesional. (React) |
| [`urab-ai-coordinador/`](urab-ai-coordinador/) | **Panel de coordinación.** Reparto y analítica. (React) |
| [`urab-ai-hub/`](urab-ai-hub/) | **Página de entrada** que enlaza a los tres portales. |
| [`agentes/`](agentes/) | Versión de laboratorio de los ocho módulos, para experimentar por fuera del servidor. |
| [`pipeline/`](pipeline/) | Herramienta para correr los módulos en lote sobre muchos casos a la vez. |
| [`gobernanza/`](gobernanza/) | Pruebas de calidad: comparación de modelos y verificación contra estándares (NIST, ISO). |
| [`datos/`](datos/) | Datos de ejemplo y bitácora de la sincronización. |
| [`docs/`](docs/) | Los documentos escritos del proyecto (informe, deck, costos, privacidad). |
| [`tests/`](tests/) | Espacio para pruebas automáticas. |
| `config.py` | Ajustes centrales: categorías, umbrales y metas del piloto. |
| `benchmark_urab.py` | Experimento que compara el costo y la precisión de distintos modelos de IA. |
| `requirements.txt` | Lista de librerías de Python que el proyecto necesita. |

Para el detalle archivo por archivo, ve a la **[Guía del repositorio](GUIA_DEL_REPOSITORIO.md)**.

---

## ¿Con qué está construido?

- **El servidor** está hecho en **Python** con FastAPI, guarda los datos en una base de datos **SQLite** y usa **Claude (de Anthropic)** como motor de inteligencia artificial. Se despliega en **Fly.io**.
- **Los tres portales** están hechos en **React** (con Vite) y se despliegan en **Vercel**.
- El motor de IA es **Claude Haiku 4.5** en la demostración (para que salga casi gratis) y **Claude Sonnet** en la versión de producción (más preciso).

---

## Una nota honesta sobre las cifras

Algunas cifras que aparecen en los documentos (por ejemplo, reducciones de tiempo o número de casos) son **proyecciones de una simulación** calibrada a los parámetros del caso, **no mediciones reales** del sistema en operación. Lo que **sí** es reproducible ejecutando el código son las pruebas de calidad de la carpeta [`gobernanza/`](gobernanza/) y la prueba de sesgo del clasificador. La distinción está explicada en [`docs/`](docs/).

---

## Para desarrolladores: cómo correrlo

**El servidor (backend):**
```bash
cd urab-ai-api
pip install -r requirements.txt
export ANTHROPIC_API_KEY="sk-ant-..."   # opcional: sin key, corre en modo local sin costo
uvicorn main:app --reload
```

**Un portal (por ejemplo el ciudadano):**
```bash
cd urab-ai-ciudadano
npm install
npm run dev
```

Cada carpeta explica sus propias variables de entorno y su despliegue.

---

## Privacidad y seguridad

El diseño de protección de datos, los riesgos y las salvaguardas están documentados en [`docs/PRIVACIDAD_Y_RIESGOS.md`](docs/PRIVACIDAD_Y_RIESGOS.md). En resumen: los datos personales se seudonimizan antes de salir hacia el modelo de IA, el tráfico va cifrado y la bitácora se sella para detectar alteraciones.

---

## Glosario rápido (para no técnicos)

- **Triage:** clasificar y priorizar según urgencia, como en una sala de emergencias.
- **HITL (human-in-the-loop):** "una persona en el circuito". Puntos donde siempre decide un humano.
- **Seudonimización:** reemplazar los datos que identifican a una persona (nombre, cédula) por códigos, antes de enviarlos a la IA.
- **Modelo / LLM:** el programa de inteligencia artificial que lee texto y responde (aquí, Claude).
- **Clasificador:** la parte que decide el tipo y la urgencia de una petición.
- **Recall (exhaustividad):** de todos los casos urgentes, cuántos detecta el sistema. La meta es no dejar pasar ninguno.
- **Deriva (drift):** cuando el modelo empieza a comportarse distinto con el tiempo y hay que revisarlo.
- **API:** la forma en que los portales le hablan al servidor.

---

*Legal Strategy Lab 2026 · Universidad Externado de Colombia · Facultad de Derecho. Materiales académicos; datos sintéticos de libre uso para investigación con atribución.*
