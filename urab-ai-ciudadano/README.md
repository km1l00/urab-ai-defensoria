# URAB-AI · Portal Ciudadano

**Frontend independiente — canal de radicación y seguimiento de peticiones**

> Legal Strategy Lab 2026 · Universidad Externado de Colombia  
> Defensoría del Pueblo de Colombia — Unidad de Recepción y Análisis de Bogotá (URAB)

---

## Qué es este repo

Portal web para que los ciudadanos radiquen peticiones ante la Defensoría del Pueblo, hagan seguimiento de sus casos y reciban notificaciones. Es un frontend completamente independiente — no depende del repo `urab-ai-funcionario`. Ambos consumen el mismo API (`urab-ai-api`), pero pueden desplegarse, caerse y actualizarse por separado.

**URL de producción:** `urab-ciudadano.vercel.app`  
**URL del panel del funcionario:** `urab-funcionario.vercel.app` _(repo separado)_

---

## Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| Formulario multi-paso (5 pasos) | Datos personales, documentos, situación, confirmación, radicado |
| Caracterización diferencial | Grupo etario (niño/niña/adolescente/adulto/adulto mayor), pertenencia étnica, discapacidad, víctima del conflicto, grupos de especial protección |
| Detección de urgencia en tiempo real | Banner automático si el texto o la caracterización indican riesgo (NNA, VBG, palabras críticas) |
| Modo asistido con voz | Preguntas secuenciales, texto grande, dictado por voz — accesibilidad WCAG 2.1 |
| Consulta de radicado | Seguimiento por número de radicado o login por cédula |
| Pantalla de confirmación | Radicado + aviso Ley 1581/2012 + Art. 29 CP + canal de urgencias |
| Modo offline | Formulario guarda localmente, sincroniza al reconectar (firma SHA-256) |

---

## Stack

```
React 18 + Vite          Frontend
React Router v6          Rutas
Tailwind CSS             Estilos
Workbox (PWA)            Modo offline / service worker
├── src/
│   ├── components/      Componentes reutilizables
│   ├── pages/           Vistas principales
│   │   ├── PortalInicio.jsx
│   │   ├── NuevaPeticion.jsx   ← formulario 5 pasos
│   │   ├── ModoAsistido.jsx
│   │   └── SeguimientoRadicado.jsx
│   ├── lib/
│   │   ├── api.js        Llamadas al backend (urab-ai-api)
│   │   ├── offline.js    Cola local + sync SHA-256
│   │   └── urgencia.js   Detección de palabras críticas
│   └── App.jsx
├── public/
│   └── manifest.json    PWA manifest
├── .env.example
├── vercel.json
└── package.json
```

---

## Setup local

```bash
git clone https://github.com/MireyaCamacho/urab-ai-ciudadano
cd urab-ai-ciudadano
npm install
cp .env.example .env.local
# Editar .env.local con la URL del API
npm run dev
```

### Variables de entorno

```env
# .env.example
VITE_API_URL=https://urab-ai-api.railway.app
VITE_ENV=development
```

---

## Deploy en Vercel

```bash
# Primera vez
npm i -g vercel
vercel

# Deploys siguientes (desde main)
git push origin main   # Vercel despliega automáticamente
```

**Configuración en Vercel dashboard:**
- Framework: Vite
- Build command: `npm run build`
- Output dir: `dist`
- Variables de entorno: `VITE_API_URL` apuntando al backend desplegado

---

## Modo offline

El portal funciona sin conexión gracias al service worker (Workbox). Cuando el ciudadano llena el formulario sin internet:

1. Los datos se guardan en IndexedDB con un hash SHA-256 del paquete.
2. Al reconectar, `offline.js` detecta la conexión y sincroniza automáticamente.
3. El servidor verifica la firma antes de aceptar el paquete — si fue alterado, lo rechaza.
4. Los campos de datos sensibles (NNA, VBG) se guardan como IDs temporales, no en texto plano.

---

## Normativa incorporada en el diseño

| Norma | Implementación |
|-------|----------------|
| Ley 1581/2012 | Aviso de tratamiento de datos en paso 4 y pantalla de confirmación |
| Art. 29 CP | Información sobre impugnación de clasificación automática |
| §5.2 RFP (enfoque diferencial) | Caracterización completa: etario, étnico, discapacidad, conflicto, grupos especiales |
| Directiva 007/2025 | Aviso de que el sistema IA puede priorizar el caso, con derecho a impugnar |
| WCAG 2.1 | Modo asistido con voz, letra grande, navegación por teclado |

---

## Conexión con el backend

El portal consume estos endpoints del `urab-ai-api`:

```
POST /peticiones/nueva          Radicación
GET  /peticiones/{radicado}     Seguimiento
POST /peticiones/sync-offline   Sync desde cola local
POST /auth/ciudadano            Login por cédula
```

---

## Relación con los otros repos

```
urab-ai-ciudadano/   ← este repo (ciudadano)
urab-ai-funcionario/ ← panel funcionario + M8 (independiente)
urab-ai-api/         ← backend compartido (Python/FastAPI)
```

Los tres repos son independientes. El ciudadano y el funcionario no se comunican entre sí — todo pasa por el API.

---

*LSL2026 · Universidad Externado de Colombia · Facultad de Derecho*
