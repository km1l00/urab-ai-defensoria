// ── Tokens de diseño institucional ────────────────────────────────────────
// Roles de color fijos: cada color tiene un único trabajo y no se intercambia.
// Los valores viven como variables CSS (ver index.css) para que el tema claro /
// oscuro se aplique a toda la interfaz sin tocar los componentes.
export const COLORS = {
  navy: "var(--c-navy)",              // identidad / headers / branding
  accion: "var(--c-accion)",          // único color de botón primario / links / CTA
  verde: "var(--c-verde)",            // exclusivo de login / cuenta / confirmación positiva
  rojo: "var(--c-rojo)",              // exclusivo de error / alerta / emergencia
  amarillo: "var(--c-amarillo)",      // exclusivo de franjas de acento (3-8px), nunca fondo
  fondo: "var(--c-fondo)",            // fondo general de la página
  panel: "var(--c-panel)",            // superficie de cards / paneles
  borde: "var(--c-borde)",            // borde estándar
  bordeFuerte: "var(--c-bordeFuerte)",// borde fuerte (inputs, selección)
  texto: "var(--c-texto)",            // texto principal
  textoSec: "var(--c-textoSec)",      // texto secundario / muted
  govco: "var(--c-govco)",            // exclusivo de la barra GOV.CO superior
};

export const RADIUS = {
  md: 6,   // botones, cards, inputs principales (4-6px)
  sm: 2,   // chips, badges pequeños, cajas de icono
  full: "50%", // solo indicadores/avatares circulares
};

export const SHADOW = "0 2px 8px rgba(15,23,42,0.08)";

export const FONT_SANS = "'Geist Sans', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'Geist Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";

// Botones y labels de sección: mayúsculas + letter-spacing + peso 700.
export const LABEL_STYLE = {
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  fontWeight: 700,
};
