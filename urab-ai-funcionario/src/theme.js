// ── Tokens de diseño institucional ────────────────────────────────────────
// Roles de color fijos: cada color tiene un único trabajo y no se intercambia.
export const COLORS = {
  navy: "#1C3F6E",          // identidad / headers / branding
  accion: "#274C86",        // único color de botón primario / links / CTA
  verde: "#1A5C3A",         // exclusivo de login / cuenta / confirmación positiva
  rojo: "#B42318",          // exclusivo de error / alerta / emergencia
  amarillo: "#FCD116",      // exclusivo de franjas de acento (3-8px), nunca fondo
  fondo: "#F8F9FA",         // fondo general de la página
  panel: "#FFFFFF",         // superficie de cards / paneles
  borde: "#D7DEE8",         // borde estándar
  bordeFuerte: "#B8C2D0",   // borde fuerte (inputs, selección)
  texto: "#1F2937",         // texto principal
  textoSec: "#555F6D",      // texto secundario / muted
  govco: "#004884",         // exclusivo de la barra GOV.CO superior
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
