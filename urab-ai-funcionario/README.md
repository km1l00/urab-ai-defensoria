# `urab-ai-funcionario/` — Panel del funcionario

La interfaz interna donde el **profesional de la URAB** trabaja sus casos: ve la bandeja, revisa la clasificación y la urgencia, gestiona el trámite y **revisa, corrige y aprueba** el borrador de respuesta que sugiere la IA (M6). Uno de los tres portales del sistema.

**En producción:** `urab-ai-funcionario.vercel.app`
**Acceso:** con código de profesional (ver los códigos de demostración en el `CLAUDE.md` de la raíz).

## Qué puede hacer el funcionario aquí

- Ver la **bandeja de casos** con su urgencia y su estado.
- Abrir un caso y ver el **Historial 360** de la persona (M5).
- Generar y aprobar un **borrador de respuesta con IA** (M6), con sello de procedencia y registro de las ediciones.
- Cuando el borrador se aprueba, el sistema puede generar la **carta oficial en PDF**.

## ¿Con qué está hecho? (lo real)

- **React** con **Vite**. Toda la interfaz vive en un solo archivo, `src/App.jsx`.
- Las gráficas usan **Recharts**. Estilos y tema en `src/index.css` y `src/theme.js`.
- Se despliega en **Vercel**; la dirección del servidor se configura con `VITE_API_URL`.

## Archivos

| Archivo | Qué es |
|---------|--------|
| `src/App.jsx` | Toda la interfaz del panel. |
| `src/index.css`, `src/theme.js` | Estilos, colores y tema claro/oscuro. |
| `src/main.jsx` | Punto de arranque. |
| `index.html`, `vite.config.js`, `package.json` | Configuración para construir y correr. |
| `vercel.json` | Configuración del despliegue en Vercel. |

## Correrlo en tu máquina

```bash
cd urab-ai-funcionario
npm install
npm run dev
```

---

*Los tres portales son independientes: todo pasa por el servidor `urab-ai-api/`.*
