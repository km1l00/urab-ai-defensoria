# URAB-AI · Panel del Funcionario

**Frontend independiente — bandeja de casos, HITL, borrador M6 y dashboard M8**

> Legal Strategy Lab 2026 · Universidad Externado de Colombia  
> Defensoría del Pueblo de Colombia — Unidad de Recepción y Análisis de Bogotá (URAB)

---

## Qué es este repo

Interfaz interna para los profesionales de la URAB y la administración. Incluye la bandeja de casos con alertas HITL, el visor de borradores M6 con sello IA, la trazabilidad completa por caso y el dashboard M8 de analítica operativa y de derechos.

Es un frontend completamente independiente del portal ciudadano. Si el portal ciudadano cae, la bandeja del funcionario sigue operando. Ambos consumen el mismo API (`urab-ai-api`).

**URL de producción:** `urab-ai-funcionario.vercel.app`  
**Acceso:** solo con JWT emitido por el API (roles: `profesional`, `coordinador`, `auditor`, `admin`)

---

## Funcionalidades

### Bandeja de casos
| Feature | Descripción |
|---------|-------------|
| Lista filtrable | Filtros: todos / HITL pendiente / Críticos / Por profesional |
| Badges de urgencia | Crítica / Alta / Media / Baja — codificados por color |
| Alertas HITL | Banner visible para NNA, VBG, desaparición, amenaza vital, duplicados |
| Caracterización del peticionario | Tags de grupo etario, etnia, discapacidad, víctima del conflicto, grupos especiales |

### Detalle de caso (3 pestañas)
| Pestaña | Contenido |
|---------|-----------|
| Resumen | KV grid, caracterización, XAI de M2 (explicación legible), razón de asignación M3 |
| Borrador M6 | Sello IA inamovible, fuentes RAG, editor, botón de aprobación con certificación de revisión |
| Trazabilidad | Log completo de todos los módulos M1–M8 con timestamps |

### Dashboard M8
- Métricas AS-IS → TO-BE: triage, urgentes tardíos, doble registro, ratio carga
- ROI institucional: horas liberadas, FTE equivalente, urgentes adicionales atendidos
- Calidad del modelo: precisión M2, HITL recall (100% = no negociable), detección duplicados M4
- Monitor de deriva: nivel de alerta verde/amarillo/naranja/rojo

---

## Stack

```
React 18 + Vite          Frontend
React Router v6          Rutas (protegidas por JWT)
Tailwind CSS             Estilos
Recharts                 Gráficas del dashboard M8
├── src/
│   ├── components/
│   │   ├── BandejaCasos.jsx
│   │   ├── DetalleCaso.jsx
│   │   ├── BorradorM6.jsx       ← sello IA + editor + aprobación
│   │   ├── TrazabilidadLog.jsx
│   │   ├── DashboardM8.jsx
│   │   ├── CaracterizacionTags.jsx
│   │   └── HitlBanner.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Bandeja.jsx
│   │   ├── Caso.jsx
│   │   └── Dashboard.jsx
│   ├── lib/
│   │   ├── api.js               Llamadas al backend
│   │   ├── auth.js              JWT + refresh token
│   │   └── roles.js             Guard de rutas por rol
│   └── App.jsx
├── .env.example
├── vercel.json
└── package.json
```

---

## Roles y acceso

| Rol | Acceso |
|-----|--------|
| `profesional` | Su bandeja, detalle de casos asignados, aprobar borradores M6 |
| `coordinador` | Bandeja completa, reasignar casos, ver carga de todos los profesionales |
| `auditor` | Solo lectura — trazabilidad, logs, dashboard M8 |
| `admin` | Todo lo anterior + gestión de usuarios y perfiles de especialidad |

Las rutas están protegidas en el frontend y en el API. El token JWT incluye el rol — el backend rechaza requests con rol insuficiente.

---

## Setup local

```bash
git clone https://github.com/km1l00/urab-ai-defensoria
cd urab-ai-funcionario
npm install
cp .env.example .env.local
npm run dev
```

### Variables de entorno

```env
# .env.example
VITE_API_URL=https://urab-ai-api-lsl2026.fly.dev
VITE_ENV=development
```

---

## Deploy en Vercel

```bash
vercel
# Configurar en dashboard:
# - Framework: Vite
# - Build: npm run build
# - Output: dist
# - Env: VITE_API_URL
```

**Importante:** este repo debe estar en un proyecto Vercel **separado** del portal ciudadano. No compartir proyecto ni dominio.

---

## Decisiones de gobernanza incorporadas (Sprints A/B/C)

### M6 — Responsabilidad disciplinaria (Sprint C1)
El componente `BorradorM6.jsx` implementa:
- Sello IA inamovible en la parte superior del borrador
- Bitácora: al aprobar, el sistema registra el hash SHA-256 del borrador original + las ediciones realizadas
- El botón de aprobación muestra el texto: *"Al aprobar, su firma certifica que realizó revisión independiente del contenido jurídico"*
- Para casos urgentes/NNA/VBG: doble revisión — el coordinador debe co-aprobar antes del envío

### M3 — Trazabilidad del reparto (Sprint B4)
La pestaña Resumen muestra la razón de asignación en lenguaje legible:  
`"Asignado a [P01] — razón: perfil VBG coincidente | carga 847 casos | peticionario recurrente"`

### XAI — Directiva 007/2025
La explicación de M2 se muestra siempre, en lenguaje ciudadano, en la pestaña Resumen.

---

## Endpoints que consume

```
GET  /casos                     Lista de casos (paginada, filtrada)
GET  /casos/{radicado}          Detalle + trazabilidad
POST /casos/{radicado}/aprobar  Aprobar borrador M6 (requiere rol profesional)
POST /casos/{radicado}/acumular Aprobar acumulación M4 (requiere rol profesional)
GET  /dashboard/metricas        Datos del dashboard M8
GET  /dashboard/drift           Estado del monitor de deriva
```

---

## Relación con los otros repos

```
urab-ai-ciudadano/   ← portal ciudadano (independiente)
urab-ai-funcionario/ ← este repo (funcionario + dashboard)
urab-ai-api/         ← backend compartido (Python/FastAPI)
```

---

*LSL2026 · Universidad Externado de Colombia · Facultad de Derecho*
