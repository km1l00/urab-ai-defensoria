# `urab-ai-ciudadano/` — Portal del ciudadano

La página web donde un ciudadano **radica una petición** ante la Defensoría y le **hace seguimiento**. Es uno de los tres portales del sistema; funciona por separado de los otros y le habla al servidor (`urab-ai-api/`).

**En producción:** `urab-ai-ciudadano.vercel.app`

## Qué puede hacer el ciudadano aquí

- Radicar una petición paso a paso, escribiendo el relato o **subiendo un documento** que el sistema lee y con el que autocompleta los datos.
- Un **modo asistido por voz** para quien no puede diligenciar un formulario.
- Consultar el estado de un radicado.

## ¿Con qué está hecho? (lo real)

- **React** con **Vite**. Toda la interfaz vive en un solo archivo, `src/App.jsx`.
- Los estilos y el tema claro/oscuro están en `src/index.css` y `src/theme.js`.
- Se despliega en **Vercel**. La dirección del servidor se configura con la variable `VITE_API_URL`.

## Archivos

| Archivo | Qué es |
|---------|--------|
| `src/App.jsx` | Toda la interfaz del portal. |
| `src/index.css`, `src/theme.js` | Estilos, colores y tema claro/oscuro. |
| `src/main.jsx` | Punto de arranque de la aplicación. |
| `index.html`, `vite.config.js`, `package.json` | Configuración para construir y correr. |
| `vercel.json` | Configuración del despliegue en Vercel. |

## Correrlo en tu máquina

```bash
cd urab-ai-ciudadano
npm install
npm run dev
```

Por defecto apunta al servidor de producción. Para usar un servidor local, define `VITE_API_URL` (por ejemplo, `http://localhost:8000`).

---

*Los tres portales (ciudadano, funcionario, coordinación) son independientes y no se comunican entre sí: todo pasa por el servidor `urab-ai-api/`.*
