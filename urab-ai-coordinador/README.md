# `urab-ai-coordinador/` — Panel de coordinación

La interfaz para la **coordinación de la URAB**. Sirve para ver cómo se está repartiendo el trabajo, la analítica de la operación (M8) y las **alertas de posibles vulneraciones sistemáticas**. Uno de los tres portales del sistema.

**En producción:** `urab-ai-coordinador.vercel.app`
**Acceso:** con código de coordinación (ver `CLAUDE.md` en la raíz).

## Qué puede hacer la coordinación aquí

- Ver el **reparto** de casos entre profesionales y el equilibrio de carga.
- Consultar la **analítica (M8)**: tiempos, medianas, ratios de carga.
- Recibir **alertas** cuando el sistema detecta un patrón de vulneración sistemática.

## ¿Con qué está hecho? (lo real)

- **React** con **Vite**. Toda la interfaz vive en un solo archivo, `src/App.jsx`.
- Estilos y tema claro/oscuro en `src/index.css` y `src/theme.js`.
- Se despliega en **Vercel**; la dirección del servidor se configura con `VITE_API_URL`.

## Correrlo en tu máquina

```bash
cd urab-ai-coordinador
npm install
npm run dev
```

---

*Los tres portales son independientes: todo pasa por el servidor `urab-ai-api/`.*
