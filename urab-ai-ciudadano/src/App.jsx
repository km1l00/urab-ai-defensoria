import { useState, useEffect, useRef } from "react";
import { COLORS, RADIUS, SHADOW, FONT_SANS, FONT_MONO, LABEL_STYLE } from "./theme.js";

// ── Iconos SVG en línea (reemplazan glifos/emoji) ───────────────────────
const IconMic = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const IconSpeaker = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
);
const IconChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);
const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
// Nota: el glifo "→" de la especificación de iconos no aparece renderizado en
// este archivo (solo existe dentro de un comentario de código, no en la UI);
// no hay ningún botón con esa flecha visible que reemplazar aquí.

// ── Backend API ──────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "https://urab-ai-api-lsl2026.fly.dev";

// ── Barra de accesibilidad ─────────────────────────────────────────────
const SIZES_ACC   = ["14px","17px","20px","24px"];

function useAccesibilidad() {
  const [oscuro, setOscuro] = useState(() => {
    const g = localStorage.getItem("urab_theme");
    if (g) return g === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
    localStorage.setItem("urab_theme", oscuro ? "dark" : "light");
  }, [oscuro]);
  return { oscuro, setOscuro };
}

function AccesibilidadBar() {
  const { oscuro, setOscuro } = useAccesibilidad();
  return (
    <div style={{ background:COLORS.navy, padding:"5px 18px", display:"flex", alignItems:"center", justifyContent:"flex-end", flexWrap:"wrap", gap:6 }}>
      <button onClick={()=>setOscuro(o=>!o)} style={{ height:26, padding:"0 10px", borderRadius:RADIUS.sm, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500, display:"inline-flex", alignItems:"center", gap:5 }}>
         <span aria-hidden="true">{oscuro?"☀":"☾"}</span>{oscuro?"Modo claro":"Modo oscuro"}
      </button>
    </div>
  );
}

// ── Datos ──────────────────────────────────────────────────────────────
const PASOS = ["Datos personales", "Sobre usted", "Entidad", "Contacto", "Adjuntos", "Confirmar", "Radicado"];

const ENTIDADES = {
  "Salud — EPS": ["EPS Sanitas","EPS Sura","Nueva EPS","EPS Famisanar","Compensar EPS","Salud Total","Coosalud","Mutual SER","Salud Mía","Asmet Salud","Emssanar","Capital Salud","Savia Salud","SOS Servicio Occidental de Salud"],
  "Salud — Regímenes especiales": ["Sanidad Militar","Sanidad Policía Nacional","Fondo de Pasivo Social de Ferrocarriles","Fondo Nacional de Prestaciones del Magisterio (FOMAG)","Universidad Nacional — régimen de excepción","Ecopetrol — salud"],
  "Pensiones": ["Colpensiones","Porvenir","Protección","Colfondos","Skandia","FONPRECON","CASUR (Policía)","CREMIL (Fuerzas Militares)","FOMAG (Magisterio)","UGPP"],
  "Educación": ["Secretaría de Educación de Bogotá","Ministerio de Educación","ICFES","ICETEX","SENA","Universidad Nacional","Universidad Distrital","Colegios oficiales de Bogotá"],
  "Justicia y organismos de control": ["Fiscalía General de la Nación","Rama Judicial","INPEC","Procuraduría General","Contraloría General","Personería de Bogotá","Medicina Legal","Comisarías de Familia","Casas de Justicia"],
  "Fuerza pública y regímenes especiales": ["Policía Nacional","Ejército Nacional","Armada Nacional","Fuerza Aérea","Migración Colombia","Dirección de Sanidad Militar","CASUR","CREMIL"],
  "Servicios públicos — energía y gas": ["Enel Colombia (Codensa)","EPM","Air-e","Afinia","Vanti","Gases de Occidente","Surtigas","Ecopetrol"],
  "Servicios públicos — agua y aseo": ["Acueducto de Bogotá (EAAB)","Aguas de Bogotá","Empresas Públicas de Cundinamarca","Triple A","Veolia","Promoambiental","Bogotá Limpia"],
  "Servicios públicos — telecomunicaciones": ["Claro","Movistar","Tigo","ETB","WOM","DirecTV"],
  "Entidades financieras — bancos": ["Bancolombia","Banco de Bogotá","Davivienda","BBVA Colombia","Banco Popular","Banco de Occidente","Banco Caja Social","Scotiabank Colpatria","Banco Agrario","Bancoomeva","Banco Falabella","Banco Pichincha"],
  "Entidades financieras — otras": ["Nequi","Daviplata","Nu Colombia","Lulo Bank","RappiPay","Cooperativas financieras","Fondos de empleados","Compañías de financiamiento"],
  "Vivienda y territorio": ["Curaduría Urbana","Catastro Distrital","Fondo Nacional del Ahorro","Cajas de compensación (vivienda)","Secretaría del Hábitat","Empresa de Renovación Urbana"],
  "Protección social": ["ICBF","Prosperidad Social","Colombia Mayor","Unidad para las Víctimas","Familias en Acción","Cajas de compensación familiar"],
  "Migración y exterior": ["Migración Colombia","Cancillería","Registraduría Nacional"],
  "Transporte y movilidad": ["Secretaría de Movilidad de Bogotá","TransMilenio","Agencia Nacional de Seguridad Vial","Ministerio de Transporte","RUNT"],
};

// Niveles de urgencia — critica/alta comparten la familia "rojo" (alerta),
// media es informativa (navy) y baja se lee como conforme (verde).
const URG = {
  critica: { lbl: "CRÍTICA", color: COLORS.rojo,  bg: "rgba(180,35,24,0.10)",  border: COLORS.rojo },
  alta:    { lbl: "ALTA",    color: COLORS.rojo,  bg: "rgba(180,35,24,0.06)",  border: COLORS.rojo },
  media:   { lbl: "MEDIA",   color: COLORS.navy,  bg: "rgba(28,63,110,0.06)",  border: COLORS.navy },
  baja:    { lbl: "BAJA",    color: COLORS.verde, bg: "rgba(26,92,58,0.06)",   border: COLORS.verde },
};
// Identidad visual por actor: ciudadano = navy, funcionario = verde. El actor
// "ia" (sistema) no tiene rol de color propio en esta paleta (el morado queda
// fuera de la paleta institucional) — se trata como neutro/gris.
const ACTOR_COLOR = { c: COLORS.navy, f: COLORS.verde, ia: COLORS.textoSec };
const ACTOR_BG    = { c: "rgba(28,63,110,0.08)", f: "rgba(26,92,58,0.08)", ia: COLORS.fondo };
const ACTOR_LBL   = { c: "Usted", f: "Funcionario/a", ia: "Sistema IA" };

// Aviso de uso de inteligencia artificial — se muestra en toda decisión o texto asistido por IA
function AvisoIA({ texto, compacto }) {
  return (
    <div style={{
      background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderTop: `1px solid ${COLORS.borde}`, borderRight: `1px solid ${COLORS.borde}`, borderBottom: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md,
      padding: compacto ? "8px 11px" : "10px 13px", marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start"
    }}>
      <div style={{
        flexShrink: 0, width: 18, height: 18, borderRadius: RADIUS.full, background: COLORS.navy,
        color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center",
        justifyContent: "center", marginTop: 1
      }}>i</div>
      <p style={{ fontSize: compacto ? 10 : 11, color: COLORS.texto, margin: 0, lineHeight: 1.55 }}>
        {texto || "Este resultado fue apoyado por un sistema de inteligencia artificial. La decisión final sobre su caso la toma siempre una persona: un profesional de la Defensoría del Pueblo revisa y aprueba antes de cualquier respuesta."}
      </p>
    </div>
  );
}

// ── Logo Defensoría ────────────────────────────────────────────────────
// Caja cuadrada con las iniciales "DP" — reemplaza la marca ilustrada por un
// bloque institucional sobrio, consistente con el resto de la paleta.
const LogoDefensoria = () => (
  <div style={{
    width: 42, height: 42, flexShrink: 0, borderRadius: RADIUS.sm,
    border: `1.5px solid ${COLORS.navy}`, background: COLORS.panel,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: COLORS.navy }} aria-hidden="true">
      <circle cx="12" cy="3.9" r="1.15" />
      <path d="M12 5 V19" />
      <path d="M8.3 19 H15.7" />
      <path d="M6 8 H18" />
      <path d="M6 8 L4 11 M6 8 L8 11 M4 11 A2 2 0 0 0 8 11" />
      <path d="M18 8 L16 11 M18 8 L20 11 M16 11 A2 2 0 0 0 20 11" />
    </svg>
  </div>
);

// ── Estilos base ───────────────────────────────────────────────────────
const s = {
  wrap:    { fontFamily: FONT_SANS, background: COLORS.fondo, minHeight: "100vh" },
  hdr:     { background: COLORS.panel, borderBottom: `3px solid ${COLORS.amarillo}`, marginBottom: 0, overflow: "hidden" },
  hdrTop:  { padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoWrap:{ display: "flex", alignItems: "center", gap: 12 },
  gov:     { fontSize: 11, color: COLORS.textoSec, letterSpacing: "0.08em", textTransform: "uppercase" },
  h1:      { fontSize: 14, fontWeight: 600, color: COLORS.texto, margin: "2px 0 1px" },
  slogan:  { fontSize: 10, color: COLORS.textoSec, fontStyle: "italic" },
  card:    { background: COLORS.panel, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, boxShadow: SHADOW, padding: "28px 32px" },
  tabs:    { display: "flex", borderBottom: `1px solid ${COLORS.borde}`, marginBottom: 22 },
  tab:     (a) => ({ padding: "9px 16px", fontSize: 12, border: "none", borderBottom: a ? `2px solid ${COLORS.navy}` : "2px solid transparent", marginBottom: -1, background: "none", cursor: "pointer", color: a ? COLORS.navy : COLORS.textoSec, fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  flabel:  { display: "block", fontSize: 11, color: COLORS.textoSec, marginBottom: 4, fontWeight: 500 },
  input:   { width: "100%", padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: COLORS.panel, color: COLORS.texto },
  grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  optBtn:  (sel) => ({ padding: "6px 12px", borderRadius: RADIUS.sm, border: sel ? `1.5px solid ${COLORS.accion}` : `1.5px solid ${COLORS.borde}`, background: sel ? "rgba(28,63,110,0.06)" : COLORS.panel, fontSize: 12, cursor: "pointer", color: sel ? COLORS.navy : COLORS.texto, fontWeight: sel ? 600 : 400, fontFamily: "inherit" }),
  subcampo:{ background: COLORS.fondo, borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.sm, padding: "10px 12px", marginTop: 8 },
  infoLegal:{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "11px 13px", marginBottom: 12 },
  resumen: { background: COLORS.fondo, borderRadius: RADIUS.md, padding: 14, marginBottom: 14 },
  resRow:  { display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" },
  resLbl:  { fontSize: 11, color: COLORS.textoSec, minWidth: 130, flexShrink: 0 },
  resVal:  { fontSize: 11, fontWeight: 600, color: COLORS.texto, lineHeight: 1.5 },
  tag:     { display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: RADIUS.sm, background: COLORS.panel, color: COLORS.texto, border: `1px solid ${COLORS.bordeFuerte}`, margin: "2px 2px 2px 0", fontWeight: 500 },
  radBox:  { background: "rgba(28,63,110,0.06)", border: `2px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "10px 22px", display: "inline-block", margin: "12px auto" },
  nav:     { display: "flex", justifyContent: "space-between", marginTop: 18 },
  btnP:    { ...LABEL_STYLE, padding: "9px 20px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.accion}`, background: COLORS.accion, color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnG:    { ...LABEL_STYLE, padding: "9px 16px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.borde}`, background: COLORS.panel, color: COLORS.texto, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnSm:   { ...LABEL_STYLE, padding: "7px 14px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, background: COLORS.panel, color: COLORS.texto, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  groupTitle:{ ...LABEL_STYLE, fontSize: 11, color: COLORS.navy, marginBottom: 10, paddingBottom: 5, borderBottom: `1px solid ${COLORS.borde}` },
  groupBlock:{ marginBottom: 20 },
};

// ── Header ─────────────────────────────────────────────────────────────
function FranjaBandera() {
  return (
    <div style={{ display: "flex", height: 8 }}>
      <div style={{ flex: 2, background: COLORS.amarillo }} />
      <div style={{ flex: 1, background: COLORS.accion }} />
      <div style={{ flex: 1, background: COLORS.rojo }} />
    </div>
  );
}

function BarraGovCo() {
  return (
    <div style={{ background: COLORS.govco, padding: "4px 18px", textAlign: "center" }}>
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>GOV.CO</span>
      <span style={{ color: "#BFDBFE", fontSize: 11, marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>· República de Colombia</span>
    </div>
  );
}

function Header() {
  return (
    <div style={s.hdr}>
      <div className="urab-contain">
        <div style={s.hdrTop}>
          <div style={s.logoWrap}>
            <LogoDefensoria />
            <div>
              <div style={s.h1}>Defensoría del Pueblo · URAB-AI</div>
              <div style={s.slogan}>Nos unen tus derechos · Portal de atención ciudadana</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ marginTop: 24, background: COLORS.navy, borderTop: `3px solid ${COLORS.amarillo}` }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 13, ...LABEL_STYLE, marginBottom: 8 }}>Institución</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Defensoría del Pueblo de Colombia</div>
          <div style={{ color: "#BFDBFE", fontSize: 12, marginTop: 4 }}>Nos unen tus derechos</div>
          <div style={{ color: "#BFDBFE", fontSize: 12, marginTop: 2 }}>URAB-AI · Unidad de Recepción y Análisis de Bogotá</div>
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 13, ...LABEL_STYLE, marginBottom: 8 }}>Canales de atención</div>
          <div style={{ color: "#BFDBFE", fontSize: 12 }}>Emergencias: <span style={{ fontFamily: FONT_MONO, color: "#fff" }}>123</span></div>
          <div style={{ color: "#BFDBFE", fontSize: 12, marginTop: 4 }}>Línea gratuita: <span style={{ fontFamily: FONT_MONO, color: "#fff" }}>01 8000 914 814</span></div>
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 13, ...LABEL_STYLE, marginBottom: 8 }}>Horario y sede</div>
          <div style={{ color: "#BFDBFE", fontSize: 12 }}>Bogotá D.C.</div>
          <div style={{ color: "#BFDBFE", fontSize: 12, marginTop: 4 }}>Lunes a viernes · 8:00 a.m. – 5:00 p.m.</div>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 20px 18px", borderTop: "1px solid rgba(255,255,255,.16)" }}>
        <p style={{ textAlign: "center", fontSize: 10, color: "#BFDBFE", lineHeight: 1.7, margin: 0 }}>
          © 2026 Defensoría del Pueblo · Nos unen tus derechos · Ley 1581 de 2012 · Constitución Política, artículo 29 · Directiva Conjunta 007 de 2025
        </p>
        <p style={{ textAlign: "center", fontSize: 9, color: "#93C5FD", lineHeight: 1.6, marginTop: 6 }}>
          En caso de emergencia o peligro inmediato, comuníquese al 123 o a la línea gratuita 01 8000 914 814
        </p>
        <p style={{ textAlign: "center", fontSize: 9, color: "#93C5FD", lineHeight: 1.6, marginTop: 10 }}>
          Prototipo académico · Legal Strategy Lab 2026 — Universidad Externado de Colombia. Los datos son sintéticos, calibrados a los parámetros del RFP oficial. No contienen información real de ciudadanos ni de la Defensoría del Pueblo. El perfilamiento de datos reales está contemplado en la Fase 0.
        </p>
      </div>
    </footer>
  );
}

// ── Stepper ────────────────────────────────────────────────────────────
function Stepper({ paso }) {
  return (
    <div style={{ display: "flex", marginBottom: 20, overflowX: "auto", gap: 2 }}>
      {PASOS.map((l, i) => {
        const n = i + 1;
        const st = n < paso ? "done" : n === paso ? "active" : "future";
        return (
          <div key={n} style={{ flex: 1, textAlign: "center", minWidth: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: RADIUS.full, margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: st === "done" ? COLORS.verde : st === "active" ? COLORS.navy : COLORS.borde, color: st === "future" ? COLORS.textoSec : "#fff" }}>
              {n < paso ? "" : n}
            </div>
            <div style={{ fontSize: 8, color: n === paso ? COLORS.navy : COLORS.textoSec, fontWeight: n === paso ? 600 : 400 }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Barra de hitos (seguimiento) ───────────────────────────────────────
function BarraHitos({ hitos }) {
  const done = hitos.filter(h => h.done).length;
  const pct = Math.round((done / hitos.length) * 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(28,63,110,0.16)}60%{box-shadow:0 0 0 8px rgba(28,63,110,0.05)}}`}</style>
      <div style={{ position: "relative", padding: "4px 0 0" }}>
        <div style={{ position: "absolute", top: 13, left: 13, right: 13, height: 2.5, background: COLORS.borde, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 13, left: 13, height: 2.5, borderRadius: 2, background: COLORS.navy, width: `calc(${pct}% - 13px)`, transition: "width .4s" }} />
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          {hitos.map((h, i) => {
            const dotBg = h.done ? (h.now ? COLORS.navy : ACTOR_COLOR[h.actor]) : COLORS.fondo;
            const dotColor = h.done ? "#fff" : COLORS.textoSec;
            const dotBorder = h.done ? "none" : `2px solid ${COLORS.bordeFuerte}`;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: RADIUS.full, background: dotBg, color: dotColor, border: dotBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginBottom: 6, animation: h.now ? "pulse 1.8s infinite" : "none" }}>
                  {h.done && !h.now ? "" : h.now ? "●" : ""}
                </div>
                <div style={{ fontSize: 9, textAlign: "center", lineHeight: 1.4, maxWidth: 56, color: h.done ? (h.now ? COLORS.navy : COLORS.textoSec) : COLORS.textoSec, fontWeight: h.now ? 700 : h.done ? 500 : 400 }}>{h.lbl}</div>
                <div style={{ fontSize: 8, color: COLORS.textoSec, textAlign: "center", marginTop: 2 }}>{h.fecha}</div>
                <div style={{ fontSize: 8, textAlign: "center", marginTop: 3, padding: "1px 5px", borderRadius: RADIUS.sm, background: ACTOR_BG[h.actor], color: ACTOR_COLOR[h.actor] }}>{h.actorLbl}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── OBSERVACIÓN 1: Campo de caracterización con Otro + No decir ─────────
function CampoCaracterizacion({ titulo, icono, opciones, valor, onChange, otroVal, onOtroChange, placeholderOtro }) {
  return (
    <div style={s.groupBlock}>
      <div style={s.groupTitle}>{icono} {titulo}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6 }}>
        {opciones.map(([v, l]) => (
          <button key={v} style={s.optBtn(valor === v)} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
      {valor === "otro" && (
        <div style={s.subcampo}>
          <label style={s.flabel}>¿Cuál? *</label>
          <input style={s.input} value={otroVal} onChange={e => onOtroChange(e.target.value)} placeholder={placeholderOtro} autoFocus />
        </div>
      )}
    </div>
  );
}

// ── OBSERVACIÓN 2: Combobox de entidades con búsqueda + grupos + Otro ──
function ComboEntidades({ seleccionadas, onToggle, otroVal, onOtroChange }) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase();
  const grupos = Object.entries(ENTIDADES).map(([grupo, items]) => [grupo, items.filter(i => i.toLowerCase().includes(q))]).filter(([_, items]) => items.length > 0);

  return (
    <div>
      <p style={s.flabel}>Busque y seleccione la entidad. Puede elegir más de una.</p>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <input
          style={s.input}
          placeholder="Buscar entidad — ej: Sanitas, Fiscalía, EPM..."
          value={query}
          onChange={e => { setQuery(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
        />
        {abierto && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: COLORS.panel, border: `1px solid ${COLORS.bordeFuerte}`, borderRadius: RADIUS.md, marginTop: 4, maxHeight: 260, overflowY: "auto", zIndex: 50, boxShadow: SHADOW }}>
            {grupos.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 12, color: COLORS.textoSec }}>Sin resultados — use el campo "Otro" abajo</div>
            )}
            {grupos.map(([grupo, items]) => (
              <div key={grupo}>
                <div style={{ padding: "6px 10px 3px", fontSize: 9, fontWeight: 700, color: COLORS.textoSec, textTransform: "uppercase", letterSpacing: ".05em", background: COLORS.fondo, position: "sticky", top: 0 }}>{grupo}</div>
                {items.map(item => {
                  const sel = seleccionadas.has(item);
                  return (
                    <div key={item} onClick={() => onToggle(item)}
                      style={{ padding: "8px 12px", fontSize: 12, color: sel ? COLORS.navy : COLORS.texto, fontWeight: sel ? 600 : 400, cursor: "pointer", background: sel ? "rgba(28,63,110,0.06)" : "transparent" }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = COLORS.fondo; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                      {sel ? " " : ""}{item}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        {[...seleccionadas].map(e => (
          <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.panel, color: COLORS.texto, border: `1px solid ${COLORS.bordeFuerte}`, borderRadius: RADIUS.sm, padding: "5px 10px 5px 12px", fontSize: 12, fontWeight: 500, margin: "3px 4px 3px 0" }}>
            {e} <button onClick={() => onToggle(e)} style={{ background: "none", border: "none", color: COLORS.textoSec, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
      </div>

      <div style={s.subcampo}>
        <label style={s.flabel}>¿La entidad no aparece en la lista? Escríbala aquí</label>
        <input style={s.input} value={otroVal} onChange={e => onOtroChange(e.target.value)} placeholder="Nombre de la entidad o persona" />
      </div>
    </div>
  );
}

// ── Modo asistido por voz — dictado (SpeechRecognition) + lectura (SpeechSynthesis) ──
// Accesibilidad: permite que la persona relate su caso hablando y escuche las
// instrucciones en voz alta. Pensado para quien tiene dificultad para escribir
// o leer (informe técnico §10, enfoque diferencial · personas con discapacidad).
function useVoz() {
  const Recog = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const recRef = useRef(null);
  const [escuchando, setEscuchando] = useState(false);

  const escuchar = (onTexto) => {
    if (!Recog) return;
    const rec = new Recog();
    rec.lang = "es-CO"; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      if (t.trim()) onTexto(t.trim());
    };
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    recRef.current = rec; setEscuchando(true);
    try { rec.start(); } catch { setEscuchando(false); }
  };
  const detener = () => { try { recRef.current?.stop(); } catch {} setEscuchando(false); };
  const leer = (texto) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-CO"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };
  return { soportado: !!Recog, escuchando, escuchar, detener, leer };
}

function AsistenteVoz({ onDictado, textoAyuda }) {
  const { soportado, escuchando, escuchar, detener, leer } = useVoz();
  if (!soportado) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => (escuchando ? detener() : escuchar(onDictado))}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: RADIUS.md, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit", background: escuchando ? COLORS.rojo : COLORS.accion, color: "#fff" }}>
        {escuchando ? "● Grabando… toque para detener" : <><IconMic /> Dictar por voz</>}
      </button>
      {textoAyuda && (
        <button type="button" onClick={() => leer(textoAyuda)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: RADIUS.md, fontSize: 12, cursor: "pointer", border: `1px solid ${COLORS.bordeFuerte}`, background: COLORS.panel, color: COLORS.texto, fontFamily: "inherit" }}>
          <IconSpeaker /> Escuchar instrucciones
        </button>
      )}
    </div>
  );
}

// ── OBSERVACIÓN 4: Dropzone con lectura real de documentos (Claude Vision) ────
function DropzoneAdjuntos({ archivos, onAdd, onRemove, relato }) {
  const inputRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [textoDoc, setTextoDoc] = useState("");
  const [archivoPendiente, setArchivoPendiente] = useState(null);

  // Analiza el relato escrito para detectar datos — no inventa información
  const extraerDelRelato = (texto) => {
    const t = texto.toLowerCase();
    const campos = [];

    // Nombre del peticionario — detectar patrones "Yo, Nombre Apellido" o "mi nombre es..."
    let nombreDetectado = null;
    const patronesNombre = [
      /yo,?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /mi nombre es\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /identificad[oa]\s+(?:con\s+)?(?:c[eé]dula\s+)?(?:como\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/,
    ];
    for (const p of patronesNombre) {
      const m = texto.match(p);
      if (m && m[1]) { nombreDetectado = m[1].trim(); break; }
    }

    // Cédula — detectar número de 6-10 dígitos cerca de "cédula/cc/identificación"
    let cedulaDetectada = null;
    const mCed = texto.match(/(?:c[eé]dula|c\.?c\.?|identificaci[oó]n|documento)\D{0,15}(\d[\d.\s]{5,13}\d)/i);
    if (mCed && mCed[1]) cedulaDetectada = mCed[1].replace(/[.\s]/g, "");

    // Entidad referida
    const entidadesMap = { "eps":"EPS", "sanitas":"EPS Sanitas", "nueva eps":"Nueva EPS", "sura":"EPS Sura", "icbf":"ICBF", "sena":"SENA", "colpensiones":"Colpensiones", "inpec":"INPEC", "fiscalía":"Fiscalía General", "fiscalia":"Fiscalía General", "policía":"Policía Nacional", "policia":"Policía Nacional", "acueducto":"Acueducto", "codensa":"Codensa", "migración":"Migración Colombia", "comisaría":"Comisaría de Familia" };
    let entidadDetectada = null;
    for (const k of Object.keys(entidadesMap)) { if (t.includes(k)) { entidadDetectada = entidadesMap[k]; break; } }

    // Tipo de petición
    const esQueja = ["negar","negaron","negó","nego","no me","incumpl","vulner","sin respuesta","no responde","abuso","maltrato","discrimin"].some(p => t.includes(p));
    const esMediacion = ["mediación","mediacion","conciliación","conciliacion","intervención","intervencion","acuerdo","mediar"].some(p => t.includes(p));
    const esAsesoria = ["información","informacion","cómo puedo","como puedo","orientación","orientacion","requisitos","procedimiento","quisiera saber"].some(p => t.includes(p));
    const tipoDetectado = esQueja ? "Queja" : esMediacion ? "Solicitud (mediación/conciliación)" : esAsesoria ? "Asesoría" : null;

    // Categoría
    const catMap = { "salud":"Salud", "eps":"Salud", "cirugía":"Salud", "medicamento":"Salud", "pensión":"Pensiones", "colpensiones":"Pensiones", "desapar":"Desaparición", "cárcel":"Carcelario", "recluso":"Carcelario", "inpec":"Carcelario", "violencia":"VBG", "género":"VBG", "educación":"Educación" };
    let catDetectada = null;
    for (const k of Object.keys(catMap)) { if (t.includes(k)) { catDetectada = catMap[k]; break; } }

    // Urgencia
    const palabrasUrg = ["amenaza","matar","muerte","desapareci","violencia","tortura","riesgo","peligro","secuestr","agred","urgente","vital"];
    const esUrgente = palabrasUrg.some(p => t.includes(p));

    const vacio = texto.trim().length < 15;

    campos.push({ campo: "Nombre del peticionario", valor: nombreDetectado, fuente: nombreDetectado ? "Detectado en el texto (confirmar)" : (vacio ? "Sin texto para analizar" : "No detectado — completar manualmente") });
    campos.push({ campo: "Número de cédula", valor: cedulaDetectada, fuente: cedulaDetectada ? "Detectada en el texto (confirmar)" : (vacio ? "Sin texto para analizar" : "No detectada — completar manualmente") });
    campos.push({ campo: "Tipo de petición", valor: tipoDetectado, fuente: tipoDetectado ? "Inferido del contenido" : (vacio ? "Sin texto para analizar" : "No determinado") });
    campos.push({ campo: "Categoría", valor: catDetectada, fuente: catDetectada ? "Inferida del contenido" : null });
    campos.push({ campo: "Entidad referida", valor: entidadDetectada, fuente: entidadDetectada ? "Mencionada en el texto" : null });
    campos.push({ campo: "Indicador de urgencia", valor: esUrgente ? "Sí — términos de riesgo detectados" : (vacio ? "Sin texto para analizar" : "No detectado"), fuente: "Análisis del contenido", ok: true });

    return campos;
  };

  // Mapea los campos leídos por Claude Vision al formato de la UI. Si el backend
  // no devolvió campos (sin conexión o sin credencial), cae al análisis del relato.
  const mapearCampos = (campos, textoRelato) => {
    if (campos && Object.keys(campos).length) {
      const v = (x) => (x && String(x).trim() ? String(x).trim() : null);
      return [
        { campo: "Nombre del peticionario", valor: v(campos.nombre), fuente: v(campos.nombre) ? "Leído del documento (confirmar)" : "No detectado — completar manualmente" },
        { campo: "Número de cédula", valor: v(campos.cedula), fuente: v(campos.cedula) ? "Leída del documento (confirmar)" : "No detectada — completar manualmente" },
        { campo: "Tipo de petición", valor: v(campos.tipo_peticion), fuente: v(campos.tipo_peticion) ? "Inferido del documento" : "No determinado" },
        { campo: "Categoría", valor: v(campos.categoria), fuente: v(campos.categoria) ? "Inferida del documento" : null },
        { campo: "Entidad referida", valor: v(campos.entidad_referida), fuente: v(campos.entidad_referida) ? "Mencionada en el documento" : null },
        { campo: "Indicador de urgencia", valor: campos.indicador_urgencia ? "Sí — términos de riesgo detectados" : "No detectado", fuente: "Análisis del contenido", ok: true },
      ];
    }
    return extraerDelRelato(textoRelato || "");
  };

  // Sube el archivo al backend para lectura REAL con Claude Vision (M1). El
  // documento se transcribe en el servidor y los campos se muestran para que el
  // ciudadano los confirme. Si el backend no responde, se degrada al análisis
  // del relato ya escrito, sin bloquear la radicación.
  const procesarArchivo = async (file) => {
    const nombre = file.name;
    const tipo = nombre.match(/\.pdf$/i) ? "PDF" : nombre.match(/\.(jpg|jpeg|png)$/i) ? "IMG" : "DOC";
    const id = Date.now() + Math.random();
    setProcesando(true);
    onAdd({ id, nombre, tipo, estado: "Leyendo el documento con IA…", extraido: false });

    let campos = null;
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const resp = await fetch(`${API_URL}/api/ocr/extraer`, { method: "POST", body: fd });
      if (resp.ok) {
        const data = await resp.json();
        campos = data.campos && Object.keys(data.campos).length ? data.campos : null;
      }
    } catch { /* sin conexión → degradación al relato */ }

    const camposUI = mapearCampos(campos, [textoDoc, relato].filter(Boolean).join(" "));
    onAdd({
      id, nombre, tipo,
      estado: campos ? "Documento leído con IA — verifique los datos" : "Documento adjunto — el profesional lo revisará",
      extraido: true, campos: camposUI, _update: true,
    });
    setProcesando(false);
  };

  const handleFiles = (files) => {
    if (files[0]) procesarArchivo(files[0]);
  };

  const confirmarAnalisis = () => {
    if (archivoPendiente) {
      agregarArchivo(archivoPendiente.nombre);
      setArchivoPendiente(null);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${COLORS.bordeFuerte}`, borderRadius: RADIUS.md, padding: "16px 14px", textAlign: "center", cursor: "pointer" }}
      >
        <div style={{ fontSize: 26, marginBottom: 6 }}></div>
        <p style={{ fontSize: 12, fontWeight: 500, color: COLORS.texto, marginBottom: 3 }}>Arrastre su archivo aquí o haga clic para seleccionar</p>
        <p style={{ fontSize: 10, color: COLORS.textoSec }}>Puede adjuntar varios archivos de cualquier tipo: documentos, imágenes, audio, video u hojas de cálculo · Máximo 10 MB por archivo</p>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {archivoPendiente && (
        <div style={{ marginTop: 10, background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 4px" }}>Documento cargado: {archivoPendiente.nombre}</p>
          <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>Su documento quedará adjunto a la petición. Un profesional de la Defensoría lo revisará y completará la información que haga falta. No es necesario que transcriba su contenido.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={confirmarAnalisis} style={{ ...LABEL_STYLE, padding: "7px 14px", borderRadius: RADIUS.md, fontSize: 12, cursor: "pointer", border: "none", background: COLORS.accion, color: "#fff", fontFamily: "inherit" }}>Adjuntar documento</button>
            <button onClick={() => { setArchivoPendiente(null); setTextoDoc(""); }} style={{ ...LABEL_STYLE, padding: "7px 14px", borderRadius: RADIUS.md, fontSize: 12, cursor: "pointer", border: `1px solid ${COLORS.bordeFuerte}`, background: COLORS.panel, color: COLORS.texto, fontFamily: "inherit" }}>Cancelar</button>
          </div>
        </div>
      )}
      {archivos.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {archivos.map(f => (
            <div key={f.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.fondo, borderRadius: RADIUS.md, padding: "8px 11px", marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: RADIUS.sm, background: COLORS.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{f.tipo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.texto, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nombre}</div>
                  <div style={{ fontSize: 10, color: f.extraido ? COLORS.verde : COLORS.navy }}>{f.extraido ? " " : " "}{f.estado}</div>
                </div>
                <button onClick={() => onRemove(f.id)} style={{ background: "none", border: "none", color: COLORS.textoSec, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
              </div>
              {f.extraido && f.campos && f.campos.some(c => c.valor) && (
                <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "8px 11px", margin: "0 0 6px" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.texto, margin: "0 0 5px" }}>Datos leídos del documento — verifíquelos</p>
                  {f.campos.filter(c => c.valor).map((c, i) => (
                    <div key={i} style={{ fontSize: 10, color: COLORS.texto, marginBottom: 2 }}>
                      <strong>{c.campo}:</strong> {c.valor}{c.fuente ? <span style={{ color: COLORS.textoSec }}> · {c.fuente}</span> : null}
                    </div>
                  ))}
                  <p style={{ fontSize: 9.5, color: COLORS.textoSec, margin: "6px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>Un sistema de inteligencia artificial leyó estos datos del documento que adjuntó. Revíselos y corrija lo que no corresponda: usted confirma la información.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Seguimiento de radicado ────────────────────────────────────────────
function Seguimiento() {
  const [vista, setVista] = useState("buscar");
  const [query, setQuery] = useState("");
  const [verificacion, setVerificacion] = useState("");
  const [histCedula, setHistCedula] = useState("");
  const [histVerif, setHistVerif] = useState("");
  const [histLista, setHistLista] = useState(null);
  const [histError, setHistError] = useState("");
  const [histCargando, setHistCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // Consulta rápida (M6 — respuestas automatizadas a consultas simples)
  const [consultaRapida, setConsultaRapida] = useState(null);
  const [crCargando, setCrCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivoImpugna, setMotivoImpugna] = useState("");
  const [impugEnviada, setImpugEnviada] = useState(false);
  // Complementar la petición con información o documentos adicionales
  const [compAbierto, setCompAbierto] = useState(false);
  const [compTexto, setCompTexto] = useState("");
  const [compArchivos, setCompArchivos] = useState([]);
  const [compEnviado, setCompEnviado] = useState(false);
  const [compEnviando, setCompEnviando] = useState(false);
  const compFileRef = useRef(null);

  // Mapea la respuesta de la API al formato que espera el render de hitos/eventos
  const mapearResultado = (data) => {
    const actorLbl = { c: "Usted", ia: "Sistema IA", f: "Profesional" };
    return {
      radicado: data.radicado,
      ciudadano: data.ciudadano,
      canal: data.canal,
      fecha: data.fecha,
      urgencia: data.urgencia,
      categoria: data.categoria,
      profesional: data.profesional,
      especialidad: data.categoria,
      estado_actual: data.estado,
      clasificacion_ia: data.clasificacion_ia,
      explicacion_ia: data.explicacion_ia,
      gestion: data.gestion || null,
      gestiones: data.gestiones || [],
      complementos_ciudadano: data.complementos_ciudadano || [],
      adjuntos_funcionario: data.adjuntos_funcionario || [],
      cedula: data.cedula,
      tipo_peticion: data.tipo_peticion,
      tipo_recepcion: data.tipo_recepcion,
      procedimiento_recepcion: data.procedimiento_recepcion,
      caso_cerrado: data.caso_cerrado,
      fecha_cierre: data.fecha_cierre,
      // Construir hitos desde el estado
      hitos: [
        { lbl: "Recibida", fecha: data.fecha, actor: "c", actorLbl: "Usted", desc: "Su petición fue radicada exitosamente.", done: true },
        { lbl: "Priorizada", fecha: data.fecha, actor: "ia", actorLbl: "Sistema IA", desc: `Clasificada como ${(data.urgencia||"").toUpperCase()}.`, done: true },
        { lbl: "Asignada", fecha: data.fecha, actor: "ia", actorLbl: "Sistema IA", desc: `Asignada a ${data.profesional}.`, done: true },
        { lbl: "En revisión", fecha: "En curso", actor: "f", actorLbl: "Profesional", desc: `${data.profesional} está revisando su caso.`, done: data.estado !== "Pendiente triage", now: data.estado && data.estado.includes("gestión") || data.estado && data.estado.includes("revisión humana") },
        { lbl: "Respuesta", fecha: "Pendiente", actor: "f", actorLbl: "Profesional", desc: "Recibirá respuesta por su medio de contacto.", done: false },
        { lbl: "Cerrada", fecha: "—", actor: "f", actorLbl: "Profesional", desc: "El caso será cerrado una vez resuelto.", done: false },
      ],
      eventos: (data.eventos || []).map(e => ({
        titulo: e.titulo, fecha: e.fecha, actor: e.actor, desc: e.descripcion,
      })),
    };
  };

  const consultarHistorial = async () => {
    const doc = histCedula.trim().replace(/\s/g, "");
    const ver = histVerif.trim();
    if (!doc) { setHistError("Ingrese su número de documento."); return; }
    if (!ver) { setHistError("Ingrese su correo o celular para verificar."); return; }
    setHistCargando(true); setHistError(""); setHistLista(null);
    try {
      const resp = await fetch(`${API_URL}/api/seguimiento/${encodeURIComponent(doc)}?verificacion=${encodeURIComponent(ver)}`);
      if (resp.status === 403) {
        setHistError("Los datos de verificación no coinciden. Por su seguridad, solo el titular puede ver el historial.");
        setHistCargando(false); return;
      }
      if (resp.status === 404) {
        setHistLista([]); setHistCargando(false); return;
      }
      if (!resp.ok) {
        setHistError("No fue posible consultar el historial. Intente de nuevo.");
        setHistCargando(false); return;
      }
      setHistLista(await resp.json());
    } catch (e) {
      setHistError(e.message.includes("Failed to fetch")
        ? "El servidor está iniciando (puede tardar hasta 50 segundos). Intente de nuevo."
        : "Ocurrió un error al consultar.");
    } finally {
      setHistCargando(false);
    }
  };

  const buscar = async () => {
    const v = query.trim().toUpperCase().replace(/\s/g, "");
    const doc = (verificacion || "").trim().replace(/\s/g, "");
    if (!v) { setError("Ingrese su número de radicado."); return; }
    if (!doc) { setError("Ingrese su número de documento para verificar que la petición es suya."); return; }
    setCargando(true); setError(""); setResultado(null);
    try {
      // Consulta por radicado, verificando titularidad con el documento del titular.
      const resp = await fetch(`${API_URL}/api/peticiones/${encodeURIComponent(v)}?cedula=${encodeURIComponent(doc)}`);
      if (resp.status === 403) {
        setError("El número de documento no coincide con el titular de esta petición. Por su seguridad, solo el titular puede consultar el estado de su caso.");
        setCargando(false);
        return;
      }
      if (!resp.ok) {
        setError("No encontramos ese radicado. Verifique el número e intente de nuevo.");
        setCargando(false);
        return;
      }
      const data = await resp.json();
      setResultado(mapearResultado(data));
      setImpugEnviada(false);
    } catch (e) {
      setError(
        e.message.includes("Failed to fetch")
          ? "El servidor está iniciando (puede tardar hasta 50 segundos). Intente de nuevo en un momento."
          : "Ocurrió un error al consultar. Intente de nuevo."
      );
    } finally {
      setCargando(false);
    }
  };

  const enviarImpugnacion = () => {
    if (!motivoImpugna.trim()) return;
    setModalAbierto(false); setMotivoImpugna(""); setImpugEnviada(true);
  };

  const pedirConsultaRapida = async (tipo) => {
    if (!resultado) return;
    setCrCargando(true); setConsultaRapida(null);
    try {
      const resp = await fetch(`${API_URL}/api/consulta-simple`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          radicado: resultado.radicado,
          cedula: (verificacion || "").trim().replace(/\s/g, ""),
          tipo_consulta: tipo,
        }),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setConsultaRapida(data.respuesta);
    } catch (e) {
      setConsultaRapida("No se pudo obtener la respuesta en este momento. Intente de nuevo.");
    } finally {
      setCrCargando(false);
    }
  };

  return (
    <div>
      <div style={s.tabs}>
        <button style={s.tab(vista === "buscar")} onClick={() => setVista("buscar")}>Consultar radicado</button>
        <button style={s.tab(vista === "historial")} onClick={() => setVista("historial")}>Mis peticiones</button>
      </div>

      {vista === "buscar" && (
        <div>
          <p style={{ fontSize: 12, color: COLORS.textoSec, marginBottom: 4 }}>Consulte el estado de su petición.</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 12 }}>
            Por su seguridad, además del radicado le pedimos su documento: así nos aseguramos de que solo usted vea el estado de su caso.
          </p>
          <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 4 }}>Número de radicado</label>
          <input style={{ ...s.input, width: "100%", boxSizing: "border-box", marginBottom: 10, fontFamily: FONT_MONO }} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} placeholder="Ej: DP-2026-004821" />
          <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 4 }}>Su número de documento</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={{ ...s.input, flex: 1, fontFamily: FONT_MONO }} value={verificacion} onChange={e => setVerificacion(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} placeholder="El documento con el que radicó" />
            <button style={{ ...s.btnP, whiteSpace: "nowrap", padding: "9px 18px", opacity: cargando ? .5 : 1 }} onClick={buscar} disabled={cargando}>{cargando ? "Consultando..." : "Consultar"}</button>
          </div>

          {error && <p style={{ fontSize: 12, color: COLORS.rojo, marginBottom: 12 }}>{error}</p>}

          {resultado && (
            <div>
              <AvisoIA texto="El estado, la prioridad y las gestiones que ve a continuación fueron organizados con apoyo de un sistema de inteligencia artificial. Todas las decisiones sobre su caso y las respuestas que reciba son revisadas y aprobadas por un profesional de la Defensoría del Pueblo." />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 2, fontFamily: FONT_MONO }}>{resultado.radicado}</h3>
                  <p style={{ fontSize: 11, color: COLORS.textoSec }}>{resultado.ciudadano} · {resultado.canal} · {resultado.fecha}</p>
                </div>
                <span style={{ ...LABEL_STYLE, background: URG[resultado.urgencia].bg, color: URG[resultado.urgencia].color, border: `1px solid ${URG[resultado.urgencia].border}`, padding: "4px 10px", borderRadius: RADIUS.sm, fontSize: 11 }}>
                  {URG[resultado.urgencia].lbl}
                </span>
              </div>

              <BarraHitos hitos={resultado.hitos} />

              {/* OBSERVACIÓN 5: banner sin línea de emergencia */}
              <div style={{ padding: "10px 14px", borderRadius: RADIUS.md, marginBottom: 14, background: resultado.urgencia === "critica" ? "rgba(180,35,24,0.06)" : COLORS.fondo, border: `1px solid ${COLORS.borde}`, borderLeft: `4px solid ${resultado.urgencia === "critica" ? COLORS.rojo : COLORS.navy}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, marginBottom: 4 }}>
                  {resultado.urgencia === "critica" ? " " : ""}{resultado.estado_actual}
                </p>
                <p style={{ fontSize: 11, color: COLORS.textoSec, lineHeight: 1.6, margin: 0 }}>
                  {resultado.urgencia === "critica" ? "Un profesional especializado se comunicará con usted dentro de las próximas 2 horas hábiles." : `Profesional asignado/a: ${resultado.profesional} · Especialidad: ${resultado.especialidad}`}
                </p>
              </div>

              <div style={{ background: COLORS.fondo, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, margin: "0 0 4px" }}>Consulta rápida</p>
                <p style={{ fontSize: 11, color: COLORS.textoSec, margin: "0 0 8px" }}>Respuestas automáticas e inmediatas a preguntas frecuentes sobre su caso.</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["estado_tramite","Estado del trámite"],["profesional_asignado","Profesional asignado"],["reenvio_constancia","Reenviar constancia"]].map(([k,l]) => (
                    <button key={k} style={{ ...s.btnSm, opacity: crCargando ? .6 : 1, cursor: crCargando ? "default" : "pointer" }} disabled={crCargando} onClick={() => pedirConsultaRapida(k)}>{l}</button>
                  ))}
                </div>
                {consultaRapida && <p style={{ fontSize: 12, color: COLORS.texto, marginTop: 10, lineHeight: 1.6, background: COLORS.panel, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.sm, padding: "9px 11px" }}>{consultaRapida}</p>}
              </div>

              {resultado.caso_cerrado && (
                <div style={{ padding: "12px 14px", borderRadius: RADIUS.md, marginBottom: 14, background: "rgba(26,92,58,0.06)", border: `1px solid ${COLORS.borde}`, borderLeft: `4px solid ${COLORS.verde}` }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, margin: "0 0 3px" }}>Su caso fue cerrado{resultado.fecha_cierre ? ` el ${resultado.fecha_cierre}` : ""}</p>
                  <p style={{ fontSize: 11, color: COLORS.textoSec, margin: 0 }}>Todas las gestiones recibieron respuesta. Si considera que su caso no fue resuelto, puede radicar una nueva petición.</p>
                </div>
              )}

              {resultado.tipo_recepcion && (
                <div style={{ padding: "10px 14px", borderRadius: RADIUS.md, marginBottom: 14, background: COLORS.fondo, border: `1px solid ${COLORS.borde}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, marginBottom: 3 }}>Forma de recepción</p>
                  <p style={{ fontSize: 11, color: COLORS.textoSec, margin: 0, lineHeight: 1.6 }}>{resultado.procedimiento_recepcion || (resultado.tipo_recepcion === "ciudadano_directo" ? "Petición radicada directamente por usted." : "Petición documentada y radicada por un funcionario de la Defensoría.")}</p>
                </div>
              )}

              {resultado.gestiones && resultado.gestiones.length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: RADIUS.md, marginBottom: 14, background: "rgba(26,92,58,0.06)", border: `1px solid ${COLORS.borde}`, borderLeft: `4px solid ${COLORS.verde}` }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, marginBottom: 8 }}>Gestiones realizadas en su caso</p>
                  {resultado.gestiones.map((g, i) => (
                    <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i < resultado.gestiones.length - 1 ? `1px solid ${COLORS.borde}` : "none" }}>
                      <p style={{ fontSize: 11, color: COLORS.texto, fontWeight: 500, margin: "0 0 2px" }}>{g.accion}</p>
                      {g.entidad && <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0 }}>Entidad: {g.entidad}</p>}
                      {g.respuesta ? (
                        <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "3px 0 0" }}>Respuesta recibida el {g.fecha_respuesta}: {g.respuesta}</p>
                      ) : (
                        <p style={{ fontSize: 10, color: COLORS.navy, margin: "3px 0 0", fontStyle: "italic" }}>En trámite — a la espera de respuesta</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(resultado.caso_cerrado || (resultado.gestiones && resultado.gestiones.length > 0)) && (
                <div style={{ marginBottom: 14 }}>
                  <a href={`${API_URL}/api/casos/${encodeURIComponent(resultado.radicado)}/respuesta-pdf`}
                     target="_blank" rel="noopener noreferrer"
                     style={{ ...LABEL_STYLE, display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: RADIUS.md, fontSize: 12, textDecoration: "none", background: COLORS.accion, color: "#fff" }}>
                    ⬇ Descargar respuesta oficial en PDF
                  </a>
                  <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "5px 0 0" }}>Carta oficial de la Defensoría del Pueblo con las gestiones realizadas en su caso.</p>
                </div>
              )}
              {resultado.clasificacion_ia && !impugEnviada && (
                <div style={s.infoLegal}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, marginBottom: 4 }}>Sobre la clasificación de su caso</p>
                  <p style={{ fontSize: 11, color: COLORS.texto, lineHeight: 1.6, marginBottom: 8 }}>
                    Un sistema de inteligencia artificial analizó su petición y le propuso la prioridad <strong>{URG[resultado.urgencia].lbl}</strong>. Esta propuesta es revisada por un profesional de la Defensoría, quien decide sobre su caso. Si considera que la clasificación no refleja su situación real, puede solicitar que una persona la revise (Constitución Política, artículo 29; Directiva Conjunta 007 de 2025).
                  </p>
                  <button style={{ ...s.btnP, fontSize: 11, padding: "7px 14px" }} onClick={() => setModalAbierto(true)}>
                    Solicitar revisión humana de la clasificación
                  </button>
                </div>
              )}

              {impugEnviada && (
                <div style={{ background: "rgba(26,92,58,0.06)", borderLeft: `4px solid ${COLORS.verde}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, marginBottom: 3 }}>Solicitud de revisión enviada</p>
                  <p style={{ fontSize: 11, color: COLORS.textoSec, margin: 0 }}>Un profesional revisará la clasificación dentro de las próximas 24 horas hábiles y le notificará por correo o teléfono.</p>
                </div>
              )}

              {/* Documentos que el profesional le envió */}
              {resultado.adjuntos_funcionario && resultado.adjuntos_funcionario.length > 0 && (
                <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px", marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, marginBottom: 3 }}>Documentos que le envió la Defensoría</p>
                  <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>
                    El profesional que atiende su caso le remitió los siguientes documentos.
                  </p>
                  {resultado.adjuntos_funcionario.map((a, i) => (
                    <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i < resultado.adjuntos_funcionario.length - 1 ? `1px solid ${COLORS.borde}` : "none" }}>
                      <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 4px", lineHeight: 1.5 }}>{a.descripcion}</p>
                      {(a.archivos || []).map((nombre, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel, borderRadius: RADIUS.sm, padding: "6px 10px", marginBottom: 3 }}>
                          <div style={{ width: 24, height: 24, borderRadius: RADIUS.sm, background: COLORS.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>DOC</div>
                          <span style={{ fontSize: 11, color: COLORS.texto, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
                          <span style={{ fontSize: 10, color: COLORS.accion, fontWeight: 600 }}>Descargar</span>
                        </div>
                      ))}
                      <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "3px 0 0" }}>{a.funcionario} · {a.fecha}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Complementar la petición: aportar información o documentos adicionales */}
              <div style={{ background: "rgba(26,92,58,0.06)", borderLeft: `4px solid ${COLORS.verde}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, marginBottom: 3 }}>¿Necesita agregar algo a su petición?</p>
                <p style={{ fontSize: 11, color: COLORS.textoSec, margin: "0 0 8px", lineHeight: 1.55 }}>
                  Puede aportar información adicional o documentos en cualquier momento. Lo que agregue llegará al profesional que atiende su caso y quedará en su expediente.
                </p>

                {!compAbierto && !compEnviado && (
                  <button onClick={() => setCompAbierto(true)} style={{ ...s.btnP, fontSize: 11, padding: "7px 14px", background: COLORS.verde, border: `1px solid ${COLORS.verde}` }}>
                    Agregar información o documentos
                  </button>
                )}

                {compAbierto && !compEnviado && (
                  <div>
                    <textarea value={compTexto} onChange={e => setCompTexto(e.target.value)}
                      placeholder="Escriba aquí lo que quiere agregar. Por ejemplo: información nueva sobre su caso, algo que olvidó mencionar, o una aclaración."
                      style={{ width: "100%", minHeight: 80, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />

                    <input ref={compFileRef} type="file" multiple style={{ display: "none" }}
                      onChange={e => {
                        const nuevos = Array.from(e.target.files || []).map(f => f.name);
                        setCompArchivos(a => [...a, ...nuevos]);
                      }} />
                    <button onClick={() => compFileRef.current?.click()} style={{ ...LABEL_STYLE, fontSize: 11, padding: "6px 12px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, background: COLORS.panel, color: COLORS.verde, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
                      Adjuntar documentos (opcional)
                    </button>

                    {compArchivos.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {compArchivos.map((nombre, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panel, borderRadius: RADIUS.sm, padding: "5px 9px", marginBottom: 3, fontSize: 11, color: COLORS.texto }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
                            <button onClick={() => setCompArchivos(a => a.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: COLORS.textoSec, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={async () => {
                          setCompEnviando(true);
                          try {
                            const resp = await fetch(`${API_URL}/api/peticiones/${encodeURIComponent(resultado.radicado)}/complementar`, {
                              method: "PUT", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ texto: compTexto.trim(), archivos: compArchivos, cedula: resultado.cedula || null })
                            });
                            if (!resp.ok) throw new Error();
                            setCompEnviado(true);
                          } catch (e) { setCompEnviado(true); /* modo demo */ }
                          finally { setCompEnviando(false); setCompAbierto(false); }
                        }}
                        disabled={compTexto.trim().length < 10 || compEnviando}
                        style={{ ...s.btnP, fontSize: 11, padding: "7px 14px", background: compTexto.trim().length < 10 ? COLORS.bordeFuerte : COLORS.verde, border: `1px solid ${compTexto.trim().length < 10 ? COLORS.bordeFuerte : COLORS.verde}`, cursor: compTexto.trim().length < 10 ? "not-allowed" : "pointer" }}>
                        {compEnviando ? "Enviando..." : "Enviar a mi profesional"}
                      </button>
                      <button onClick={() => { setCompAbierto(false); setCompTexto(""); setCompArchivos([]); }}
                        style={{ ...LABEL_STYLE, fontSize: 11, padding: "7px 14px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, background: COLORS.panel, color: COLORS.texto, cursor: "pointer", fontFamily: "inherit" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {compEnviado && (
                  <div style={{ background: "rgba(26,92,58,0.08)", border: `1px solid ${COLORS.borde}`, borderLeft: `4px solid ${COLORS.verde}`, borderRadius: RADIUS.md, padding: "9px 12px" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 2px" }}>Información recibida</p>
                    <p style={{ fontSize: 11, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>
                      Lo que agregó quedó en su expediente y fue enviado a {resultado.profesional || "el profesional que atiende su caso"}. Puede seguir agregando información cuando lo necesite.
                    </p>
                    <button onClick={() => { setCompEnviado(false); setCompTexto(""); setCompArchivos([]); }}
                      style={{ background: "none", border: "none", color: COLORS.verde, fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: "6px 0 0", fontFamily: "inherit" }}>
                      Agregar algo más
                    </button>
                  </div>
                )}

                {resultado.complementos_ciudadano && resultado.complementos_ciudadano.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.borde}` }}>
                    <p style={{ ...LABEL_STYLE, fontSize: 10, color: COLORS.texto, marginBottom: 6 }}>Información que usted ha aportado</p>
                    {resultado.complementos_ciudadano.map((c, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 2px", lineHeight: 1.5 }}>{c.texto}</p>
                        {c.archivos && c.archivos.length > 0 && (
                          <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "0 0 2px" }}>Documentos: {c.archivos.join(", ")}</p>
                        )}
                        <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0 }}>{c.fecha}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 10, color: COLORS.textoSec }}>
                  {[["c",ACTOR_COLOR.c,"Usted"],["ia",ACTOR_COLOR.ia,"Sistema IA"],["f",ACTOR_COLOR.f,"Funcionario/a"]].map(([k,c,l]) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: RADIUS.full, background: c, display: "inline-block" }}></span> {l}
                    </span>
                  ))}
                </div>
                {resultado.eventos.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${COLORS.borde}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: RADIUS.full, background: ACTOR_COLOR[e.actor], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, color: "#fff" }}>{e.actor === "c" ? "" : e.actor === "f" ? "" : ""}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.texto }}>{e.titulo}</span>
                        <span style={{ ...LABEL_STYLE, fontSize: 9, padding: "1px 7px", borderRadius: RADIUS.sm, background: ACTOR_BG[e.actor], color: ACTOR_COLOR[e.actor], border: `1px solid ${ACTOR_COLOR[e.actor]}40` }}>
                          {ACTOR_LBL[e.actor]}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textoSec }}>{e.fecha}</span>
                      </div>
                      <p style={{ fontSize: 11, color: COLORS.textoSec, lineHeight: 1.5, margin: 0 }}>{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {vista === "historial" && (
        <div>
          <p style={{ fontSize: 12, color: COLORS.textoSec, marginBottom: 4 }}>Consulte todas sus peticiones.</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 12 }}>
            Para proteger su información, verificamos que usted sea el titular antes de mostrar el historial.
          </p>
          <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 4 }}>Su número de documento</label>
          <input style={{ ...s.input, width: "100%", boxSizing: "border-box", marginBottom: 10 }} value={histCedula} onChange={e => setHistCedula(e.target.value)} placeholder="Número de documento" />
          <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 4 }}>Verificación</label>
          <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "0 0 4px" }}>El correo o el número de celular con el que radicó.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={{ ...s.input, flex: 1 }} value={histVerif} onChange={e => setHistVerif(e.target.value)} onKeyDown={e => e.key === "Enter" && consultarHistorial()} placeholder="correo@ejemplo.com o 3001234567" />
            <button style={{ ...s.btnP, whiteSpace: "nowrap", padding: "9px 18px", opacity: histCargando ? .5 : 1 }} onClick={consultarHistorial} disabled={histCargando}>{histCargando ? "Consultando..." : "Ver mis peticiones"}</button>
          </div>

          {histError && <p style={{ fontSize: 12, color: COLORS.rojo, marginBottom: 12 }}>{histError}</p>}

          {histLista && histLista.length === 0 && (
            <p style={{ fontSize: 12, color: COLORS.textoSec }}>No se encontraron peticiones con esos datos.</p>
          )}

          {histLista && histLista.map(h => (
            <div key={h.radicado} onClick={() => { setVista("buscar"); setQuery(h.radicado); setVerificacion(histCedula); }} style={{ padding: "10px 12px", borderRadius: RADIUS.md, background: COLORS.fondo, border: `1px solid ${COLORS.borde}`, marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy, fontFamily: FONT_MONO }}>{h.radicado}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textoSec }}>{h.fecha}</span>
              </div>
              <p style={{ fontSize: 11, color: COLORS.textoSec, margin: 0 }}>{h.categoria} · {h.estado}</p>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: COLORS.panel, borderRadius: RADIUS.md, boxShadow: SHADOW, padding: 20, maxWidth: 400, width: "100%", border: `1px solid ${COLORS.borde}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 8 }}>Solicitar revisión humana</h3>
            <p style={{ fontSize: 12, color: COLORS.textoSec, lineHeight: 1.6, marginBottom: 12 }}>
              Usted tiene derecho a pedir que una persona revise la clasificación que hizo el sistema automático (Constitución Política, artículo 29). Explique brevemente por qué considera que no es correcta.
            </p>
            <textarea value={motivoImpugna} onChange={e => setMotivoImpugna(e.target.value)} placeholder="Ej: Considero que mi caso debería tener prioridad más alta porque..." style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={s.btnG} onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button style={s.btnP} onClick={enviarImpugnacion}>Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portal de radicación (formulario con las 7 observaciones) ──────────
function Portal() {
  const [paso, setPaso] = useState(1);
  const [urg, setUrg] = useState(false);
  const [rad, setRad] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [resultadoRadicado, setResultadoRadicado] = useState(null);
  const [d, setD] = useState({
    nombre: "", tipo_doc: "CC", cedula: "",
    // OBS 1: caracterización con otro/no_decir
    etario: null, etario_otro: "",
    etnia: null, etnia_otro: "",
    disc: null, disc_otro: "",
    victima: null, victima_otro: "",
    grupos: new Set(), grupo_otro: "",
    // OBS 2: entidades múltiples con búsqueda
    entidadesSel: new Set(), entidadOtro: "", entidadNoSabe: false,
    // OBS 3: contacto obligatorio correo o celular
    contactoTipo: "correo", correo: "", celular: "",
    // OBS 4: adjuntos
    archivos: [],
    texto: "",
    // OBS 7: consentimiento
    consentimiento: false,
  });

  useEffect(() => {
    // La urgencia depende del CONTENIDO del relato/adjunto, no de marcar una casilla de
    // caracterización. Pertenecer a un grupo de especial protección no es, por sí solo,
    // evidencia de un hecho urgente actual — eso sería un falso positivo sistemático.
    const palabrasCriticas = ["amenaza", "amenazan", "matar", "me va a matar", "desapareci", "secuestr", "violencia sexual", "abuso sexual", "tortura", "intento de feminicidio", "riesgo de vida", "peligro inminente", "violencia física", "me golpe", "me pegó", "agred"];
    const textoLower = d.texto.toLowerCase();
    const hayContenidoMinimo = d.texto.trim().length >= 15;
    const tieneIndicadorCritico = hayContenidoMinimo && palabrasCriticas.some(p => textoLower.includes(p));
    // NNA + indicador crítico en el relato  regla hard-coded de protección reforzada
    const esNNAconRiesgo = ["nino", "nina", "adolescente"].includes(d.etario) && tieneIndicadorCritico;
    setUrg(tieneIndicadorCritico || esNNAconRiesgo);
  }, [d.texto, d.etario]);

  const upd = (k, v) => setD(prev => ({ ...prev, [k]: v }));
  const toggleGrupo = g => setD(prev => { const s = new Set(prev.grupos); s.has(g) ? s.delete(g) : s.add(g); return { ...prev, grupos: s }; });
  const toggleEntidad = e => setD(prev => { const s = new Set(prev.entidadesSel); s.has(e) ? s.delete(e) : s.add(e); return { ...prev, entidadesSel: s }; });
  const addArchivo = (f) => setD(prev => {
    const existe = prev.archivos.find(a => a.id === f.id);
    if (existe) return { ...prev, archivos: prev.archivos.map(a => a.id === f.id ? f : a) };
    return { ...prev, archivos: [...prev.archivos, f] };
  });
  const removeArchivo = (id) => setD(prev => ({ ...prev, archivos: prev.archivos.filter(a => a.id !== id) }));

  // ── Paso 5: dos formas de contar la situación ──
  const [modoEntrada, setModoEntrada] = useState("escribir"); // "escribir" | "documento"
  const [autofillCargando, setAutofillCargando] = useState(false);
  const [autofill, setAutofill] = useState(null); // resumen de lo leído del documento
  const autofillInputRef = useRef(null);

  // Opción "subir documento y autocompletar": lee el documento con Claude Vision,
  // rellena el relato y completa los datos detectados que estén vacíos. La persona
  // confirma y puede corregir en los pasos anteriores. No sobrescribe lo que ya
  // escribió: solo llena campos de identidad vacíos; el relato sí lo completa.
  const autocompletarDesdeDocumento = async (file) => {
    if (!file) return;
    setAutofillCargando(true); setAutofill(null);
    const id = Date.now() + Math.random();
    const tipo = file.name.match(/\.pdf$/i) ? "PDF" : file.name.match(/\.(jpe?g|png|webp)$/i) ? "IMG" : "DOC";
    addArchivo({ id, nombre: file.name, tipo, estado: "Leyendo el documento con IA…", extraido: false });

    let campos = null, textoDoc = "";
    try {
      const fd = new FormData(); fd.append("archivo", file);
      const resp = await fetch(`${API_URL}/api/ocr/extraer`, { method: "POST", body: fd });
      if (resp.ok) {
        const data = await resp.json();
        campos = data.campos && Object.keys(data.campos).length ? data.campos : null;
        textoDoc = (data.texto || "").trim();
      }
    } catch { /* sin conexión: se maneja abajo */ }

    if (!campos && textoDoc.length < 15) {
      setAutofill({ ok: false });
      addArchivo({ id, nombre: file.name, tipo, estado: "No se pudo leer — quedó adjunto para revisión", extraido: true, _update: true });
      setAutofillCargando(false);
      return;
    }

    const c = campos || {};
    const nom = (c.nombre || "").trim();
    const ced = (c.cedula || "").replace(/\D/g, "");
    const ent = (c.entidad_referida || "").trim();
    const relato = textoDoc.length >= 15 ? textoDoc : (c.pretension || "");

    const patch = {};
    if (relato) patch.texto = relato;
    if (nom && !d.nombre.trim()) patch.nombre = nom;
    if (ced && !d.cedula.trim()) patch.cedula = ced;
    if (ent && !d.entidadOtro.trim()) patch.entidadOtro = ent;
    setD(prev => ({ ...prev, ...patch }));

    setAutofill({ ok: true, relato: !!relato, nombre: nom || null, cedula: ced || null, entidad: ent || null });
    addArchivo({ id, nombre: file.name, tipo, estado: "Documento leído — datos completados", extraido: true, _update: true });
    setAutofillCargando(false);
  };

  const GrupoOpt = ({ val, label }) => (
    <button style={s.optBtn(d.grupos.has(val))} onClick={() => toggleGrupo(val)}>{label}</button>
  );

  // Validaciones por paso
  const contactoValido = (d.contactoTipo === "correo" && d.correo.includes("@")) || (d.contactoTipo === "celular" && d.celular.length >= 10);
  // La entidad es obligatoria: debe elegir al menos una, escribirla, o
  // declarar explícitamente que no la conoce. Resuelve la observación de que
  // el paso podía saltarse en blanco, sin bloquear a quien no sabe la entidad.
  const entidadValida = d.entidadesSel.size > 0 || (d.entidadOtro || "").trim().length > 0 || d.entidadNoSabe;

  const Nav = ({ disabled, ultimoTexto }) => paso < 6 && (
    <div style={s.nav}>
      <button style={s.btnG} onClick={() => paso > 1 ? setPaso(p => p - 1) : null}>{paso === 1 ? "Cancelar" : " Anterior"}</button>
      <button style={{ ...s.btnP, opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer" }} disabled={disabled} onClick={() => setPaso(p => p + 1)}>
        {ultimoTexto || "Siguiente "}
      </button>
    </div>
  );

  const etarioLbls = { nino: "Niño (0–8)", nina: "Niña (0–8)", adolescente: "Adolescente (9–17)", adulto: "Adulto (18–59)", adulto_mayor: "Persona mayor (60+)" };
  const etniaLbls = { indigena: "Pueblo indígena", afro: "Afrodescendiente", raizal: "Raizal", rom: "Pueblo Rom", palenquero: "Palenquero", ninguna: "No aplica", otro: d.etnia_otro, no_decir: "Prefiere no decirlo" };
  const discLbls = { fisica: "Física/motora", visual: "Visual", auditiva: "Auditiva", cognitiva: "Cognitiva", psicosocial: "Psicosocial", ninguna: "No aplica", otro: d.disc_otro, no_decir: "Prefiere no decirlo" };
  const victimaLbls = { si: "Sí", no: "No", otro: d.victima_otro, no_decir: "Prefiere no decirlo" };
  const grupoLbls = { migrante: "Migrante", vbg: "Víctima de VBG", lgbtiq: "LGBTIQ+", privado_libertad: "Privado de libertad", desplazado: "Desplazado", habitante_calle: "Habitante de calle", refugiado: "Refugiado", defensora: "Defensor/a DDHH", no_aplica: "No aplica", otro_grupo: d.grupo_otro || "Otro", no_decir_grupo: "Prefiero no decirlo" };

  return (
    <div>
      <Stepper paso={paso} />

      {/* OBSERVACIÓN 5: banner sin línea de emergencia, mensaje de confianza en la herramienta */}
      {urg && paso === 6 && (
        <div style={{ background: "rgba(180,35,24,0.06)", borderLeft: `4px solid ${COLORS.rojo}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.texto, margin: "0 0 3px" }}>Su caso ha sido identificado como urgente</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, margin: 0 }}>Un profesional especializado revisará su petición de forma prioritaria y se comunicará con usted dentro de las próximas 2 horas hábiles.</p>
        </div>
      )}

      {paso === 1 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 14 }}>Sus datos de contacto</p>
          <div style={{ marginBottom: 10 }}>
            <label style={s.flabel}>Nombre y apellidos completos *</label>
            <input style={s.input} value={d.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Nombre completo" />
          </div>
          <div style={{ ...s.grid2, marginBottom: 4 }}>
            <div>
              <label style={s.flabel}>Tipo de documento *</label>
              <select style={s.input} value={d.tipo_doc} onChange={e => upd("tipo_doc", e.target.value)}>
                {[["CC","Cédula de ciudadanía"],["CE","Cédula de extranjería"],["Pasaporte","Pasaporte"],["PPT","Permiso de Protección Temporal (PPT)"],["NUIP","Documento de menor (NUIP)"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={s.flabel}>Número *</label>
              <input style={{ ...s.input, fontFamily: FONT_MONO }} value={d.cedula} onChange={e => upd("cedula", e.target.value)} placeholder="Sin puntos" />
            </div>
          </div>
          <Nav disabled={!d.nombre || !d.cedula} />
        </div>
      )}

      {paso === 2 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 6 }}>Cuéntenos un poco sobre usted</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 16, lineHeight: 1.6 }}>Esta información nos ayuda a atender su caso con la prioridad y el cuidado que usted necesita. Por ejemplo, si es niña, niño, adolescente o persona con discapacidad, la ley le da una protección especial. Todos los campos son opcionales: puede dejarlos en blanco o marcar «prefiero no responder».</p>

          <CampoCaracterizacion
            titulo="¿A qué grupo etario pertenece?" icono=""
            opciones={[["nino","Niño (0–8)"],["nina","Niña (0–8)"],["adolescente","Adolescente (9–17)"],["adulto","Adulto (18–59)"],["adulto_mayor","Persona mayor (60+)"]]}
            valor={d.etario} onChange={v => upd("etario", v)}
            otroVal={d.etario_otro} onOtroChange={v => upd("etario_otro", v)}
            placeholderOtro="Especifique el grupo etario"
          />
          <CampoCaracterizacion
            titulo="¿Tiene pertenencia étnica?" icono=""
            opciones={[["indigena","Pueblo indígena"],["afro","Afrodescendiente"],["raizal","Raizal"],["rom","Pueblo Rom"],["palenquero","Palenquero"],["ninguna","No aplica"],["otro","Otro"],["no_decir","Prefiero no decirlo"]]}
            valor={d.etnia} onChange={v => upd("etnia", v)}
            otroVal={d.etnia_otro} onOtroChange={v => upd("etnia_otro", v)}
            placeholderOtro="¿Cuál pueblo, comunidad o resguardo?"
          />
          <CampoCaracterizacion
            titulo="¿Tiene alguna condición de discapacidad?" icono=""
            opciones={[["fisica","Física/motora"],["visual","Visual"],["auditiva","Auditiva"],["cognitiva","Cognitiva"],["psicosocial","Psicosocial"],["ninguna","No aplica"],["otro","Otro"],["no_decir","Prefiero no decirlo"]]}
            valor={d.disc} onChange={v => upd("disc", v)}
            otroVal={d.disc_otro} onOtroChange={v => upd("disc_otro", v)}
            placeholderOtro="Especifique el tipo de discapacidad"
          />
          <CampoCaracterizacion
            titulo="¿Ha sido víctima del conflicto armado?" icono=""
            opciones={[["si","Sí"],["no","No"],["no_decir","Prefiero no decirlo"]]}
            valor={d.victima} onChange={v => upd("victima", v)}
            otroVal={d.victima_otro} onOtroChange={v => upd("victima_otro", v)}
            placeholderOtro="Especifique el hecho victimizante"
          />

          <div style={{ marginBottom: 8 }}>
            <div style={s.groupTitle}> ¿Pertenece a algún grupo de especial protección? <span style={{ fontSize: 10, fontWeight: 400, color: COLORS.textoSec }}>(puede marcar varios)</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {Object.entries(grupoLbls).map(([v,l]) => <GrupoOpt key={v} val={v} label={l} />)}
            </div>
            {d.grupos.has("otro_grupo") && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿Cuál? *</label>
                <input style={s.input} value={d.grupo_otro} onChange={e => upd("grupo_otro", e.target.value)} placeholder="Especifique el grupo de especial protección" autoFocus />
              </div>
            )}
          </div>
          <Nav />
        </div>
      )}

      {paso === 3 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 6 }}>¿Sobre qué entidad es su petición? *</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 12, lineHeight: 1.6 }}>Es la entidad con la que tiene el problema o sobre la que necesita ayuda (por ejemplo, su EPS, un banco, una empresa de servicios).</p>
          <ComboEntidades
            seleccionadas={d.entidadesSel} onToggle={toggleEntidad}
            otroVal={d.entidadOtro} onOtroChange={v => upd("entidadOtro", v)}
          />
          <div style={{ marginTop: 12, padding: "10px 12px", background: COLORS.fondo, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: COLORS.texto }}>
              <input type="checkbox" checked={d.entidadNoSabe || false}
                onChange={e => upd("entidadNoSabe", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }} />
              No sé contra qué entidad va mi petición, o aún no aplica.
            </label>
            <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "6px 0 0 24px" }}>
              La Defensoría determinará la entidad competente al analizar su caso.
            </p>
          </div>
          {!entidadValida && (
            <p style={{ fontSize: 10, color: COLORS.rojo, marginTop: 8 }}>
              Seleccione al menos una entidad, escríbala en el campo de arriba, o marque la casilla si no la conoce.
            </p>
          )}
          <Nav disabled={!entidadValida} />
        </div>
      )}

      {paso === 4 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 6 }}>¿Cómo le notificamos sobre su petición?</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 14, lineHeight: 1.6 }}>Debe indicar al menos un medio de contacto para recibir actualizaciones de su caso.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div onClick={() => upd("contactoTipo", "correo")} style={{ flex: 1, padding: 8, textAlign: "center", borderRadius: RADIUS.md, border: d.contactoTipo === "correo" ? `1.5px solid ${COLORS.accion}` : `1.5px solid ${COLORS.borde}`, background: d.contactoTipo === "correo" ? "rgba(28,63,110,0.06)" : COLORS.panel, cursor: "pointer", fontSize: 12, fontWeight: 500, color: d.contactoTipo === "correo" ? COLORS.navy : COLORS.textoSec }}>Correo electrónico</div>
            <div onClick={() => upd("contactoTipo", "celular")} style={{ flex: 1, padding: 8, textAlign: "center", borderRadius: RADIUS.md, border: d.contactoTipo === "celular" ? `1.5px solid ${COLORS.accion}` : `1.5px solid ${COLORS.borde}`, background: d.contactoTipo === "celular" ? "rgba(28,63,110,0.06)" : COLORS.panel, cursor: "pointer", fontSize: 12, fontWeight: 500, color: d.contactoTipo === "celular" ? COLORS.navy : COLORS.textoSec }}>Mensaje de texto (SMS)</div>
          </div>

          {d.contactoTipo === "correo" ? (
            <div>
              <label style={s.flabel}>Correo electrónico *</label>
              <input style={{ ...s.input, fontFamily: FONT_MONO }} type="email" value={d.correo} onChange={e => upd("correo", e.target.value)} placeholder="nombre@correo.com" />
            </div>
          ) : (
            <div>
              <label style={s.flabel}>Número de celular *</label>
              <input style={{ ...s.input, fontFamily: FONT_MONO }} type="tel" value={d.celular} onChange={e => upd("celular", e.target.value)} placeholder="3001234567" />
              {d.celular.length >= 10 && (
                <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "8px 0 0" }}>Recibirá un mensaje de texto con su número de radicado al finalizar (simulación MVP — en producción se envía SMS real).</p>
              )}
            </div>
          )}
          <Nav disabled={!contactoValido} />
          {!contactoValido && <p style={{ fontSize: 10, color: COLORS.rojo, textAlign: "right", marginTop: 6 }}>Debe indicar un correo o celular válido</p>}
        </div>
      )}

      {paso === 5 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 6 }}>Cuéntenos su situación</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 14, lineHeight: 1.6 }}>Elija cómo prefiere contarnos su caso. Puede escribirlo usted, o subir un documento para que lo leamos y completemos sus datos.</p>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "escribir", titulo: "Escribir yo mismo", desc: "Cuento mi situación con mis palabras (puedo dictar por voz) y, si quiero, adjunto documentos de soporte." },
              { id: "documento", titulo: "Subir un documento y autocompletar", desc: "Subo una foto o PDF de mi carta o petición. La leemos y llenamos su relato y sus datos por usted." },
            ].map(op => {
              const activa = modoEntrada === op.id;
              return (
                <button key={op.id} type="button" onClick={() => setModoEntrada(op.id)}
                  style={{ flex: "1 1 220px", textAlign: "left", cursor: "pointer", padding: "14px 16px",
                    borderRadius: RADIUS.md, border: `1.5px solid ${activa ? COLORS.accion : COLORS.borde}`,
                    background: activa ? "#EEF3FB" : COLORS.panel, fontFamily: "inherit",
                    display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: activa ? COLORS.accion : COLORS.texto }}>{op.titulo}</span>
                  <span style={{ fontSize: 11, color: COLORS.textoSec, lineHeight: 1.5 }}>{op.desc}</span>
                </button>
              );
            })}
          </div>

          {modoEntrada === "escribir" && (
            <div>
              <label style={s.flabel}>Relato de la situación *</label>
              <AsistenteVoz
                onDictado={(t) => upd("texto", (d.texto ? d.texto + " " : "") + t)}
                textoAyuda="Cuéntenos su situación con sus propias palabras. Toque el botón del micrófono y hable: lo que diga aparecerá escrito aquí. Diga qué entidad le está fallando, qué pasó y qué necesita que la Defensoría haga."
              />
              <textarea style={{ ...s.input, minHeight: 110, resize: "vertical" }} value={d.texto} onChange={e => upd("texto", e.target.value)} placeholder="Ejemplo: 'Mi EPS me negó la cirugía que el médico ordenó hace 3 meses. Ya presenté los documentos dos veces y no recibo respuesta...'" />
              <p style={{ fontSize: 10, color: COLORS.textoSec, marginTop: 4 }}>{d.texto.length} caracteres — mínimo 15 para continuar</p>

              <div style={{ marginTop: 14, background: COLORS.fondo, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: COLORS.texto, marginBottom: 8 }}>Documentos de soporte <span style={{ fontSize: 10, color: COLORS.textoSec, fontWeight: 400 }}>(opcional)</span></p>
                <DropzoneAdjuntos archivos={d.archivos} onAdd={addArchivo} onRemove={removeArchivo} relato={d.texto} />
              </div>
            </div>
          )}

          {modoEntrada === "documento" && (
            <div>
              <div onClick={() => autofillInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); autocompletarDesdeDocumento(e.dataTransfer.files?.[0]); }}
                style={{ border: `2px dashed ${COLORS.bordeFuerte}`, borderRadius: RADIUS.md, padding: "22px 16px", textAlign: "center", cursor: "pointer", background: COLORS.panel }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.texto, marginBottom: 4 }}>Arrastre su documento aquí o haga clic para seleccionar</p>
                <p style={{ fontSize: 11, color: COLORS.textoSec }}>Foto o PDF de su carta, formulario o petición · Máximo 20 MB</p>
                <input ref={autofillInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
                  onChange={e => autocompletarDesdeDocumento(e.target.files?.[0])} />
              </div>

              {autofillCargando && (
                <p style={{ fontSize: 12, color: COLORS.accion, marginTop: 12, fontWeight: 500 }}>Leyendo el documento con inteligencia artificial…</p>
              )}

              {autofill && autofill.ok && (
                <div style={{ marginTop: 12, background: "#EEF3FB", border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.accion, margin: "0 0 6px" }}>Leímos su documento y completamos lo que detectamos</p>
                  <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>
                    {autofill.relato && <li style={{ fontSize: 11, color: COLORS.texto }}>Relato de la situación: completado</li>}
                    {autofill.nombre && <li style={{ fontSize: 11, color: COLORS.texto }}>Nombre: {autofill.nombre}</li>}
                    {autofill.cedula && <li style={{ fontSize: 11, color: COLORS.texto }}>Documento: {autofill.cedula}</li>}
                    {autofill.entidad && <li style={{ fontSize: 11, color: COLORS.texto }}>Entidad: {autofill.entidad}</li>}
                  </ul>
                  <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0, lineHeight: 1.5 }}>Un sistema de inteligencia artificial leyó su documento. Revise el relato abajo y los datos en los pasos anteriores; corrija lo que no corresponda. Usted confirma la información.</p>
                </div>
              )}

              {autofill && !autofill.ok && (
                <div style={{ marginTop: 12, background: "#FEF2F2", border: `1px solid ${COLORS.rojo}33`, borderRadius: RADIUS.md, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: COLORS.rojo, margin: 0, lineHeight: 1.5 }}>No pudimos leer el documento automáticamente. Puede escribir su relato en la opción «Escribir yo mismo». El documento quedó adjunto para que un profesional lo revise.</p>
                </div>
              )}

              {d.texto.trim().length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label style={s.flabel}>Relato leído del documento (puede editarlo) *</label>
                  <textarea style={{ ...s.input, minHeight: 110, resize: "vertical" }} value={d.texto} onChange={e => upd("texto", e.target.value)} />
                  <p style={{ fontSize: 10, color: COLORS.textoSec, marginTop: 4 }}>{d.texto.length} caracteres — mínimo 15 para continuar</p>
                </div>
              )}
            </div>
          )}

          <Nav disabled={d.texto.trim().length < 15} />
        </div>
      )}

      {paso === 6 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy, marginBottom: 14 }}>Confirme su petición</p>
          <div style={s.resumen}>
            {[
              ["Nombre", d.nombre || "(no indicado)"],
              ["Documento", `${d.tipo_doc} ${d.cedula}`],
              ["Contacto", d.contactoTipo === "correo" ? d.correo : d.celular + " (SMS)"],
              ["Grupo etario", etarioLbls[d.etario] || "No indicado"],
              ["Pertenencia étnica", etniaLbls[d.etnia] || "No indicado"],
              ["Discapacidad", discLbls[d.disc] || "No indicado"],
              ["Víctima del conflicto", victimaLbls[d.victima] || "No indicado"],
            ].map(([l, v]) => (
              <div key={l} style={s.resRow}><span style={s.resLbl}>{l}:</span><span style={{ ...s.resVal, fontFamily: (l === "Documento" || l === "Contacto") ? FONT_MONO : "inherit" }}>{v}</span></div>
            ))}
            {d.entidadesSel.size > 0 && (
              <div style={s.resRow}>
                <span style={s.resLbl}>Entidades:</span>
                <span style={s.resVal}>{[...d.entidadesSel].map(e => <span key={e} style={s.tag}>{e}</span>)}</span>
              </div>
            )}
            {d.grupos.size > 0 && (
              <div style={s.resRow}>
                <span style={s.resLbl}>Protección especial:</span>
                <span style={s.resVal}>{[...d.grupos].map(g => <span key={g} style={s.tag}>{grupoLbls[g] || g}</span>)}</span>
              </div>
            )}
            {d.archivos.length > 0 && (
              <div style={s.resRow}><span style={s.resLbl}>Adjuntos:</span><span style={s.resVal}>{d.archivos.length} archivo(s)</span></div>
            )}
          </div>

          {/* OBSERVACIÓN 7: consentimiento de tratamiento de datos antes de radicar */}
          <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: 14, marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={d.consentimiento} onChange={e => upd("consentimiento", e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: COLORS.texto, lineHeight: 1.6 }}>
                He leído y autorizo el tratamiento de mis datos personales conforme a la{" "}
                <a href="https://www.defensoria.gov.co/transparencia" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accion, fontWeight: 600, textDecoration: "underline" }}>Política de Tratamiento de Datos Personales de la Defensoría del Pueblo</a>,
                de acuerdo con la Ley 1581 de 2012. Entiendo que mis datos sensibles serán usados exclusivamente para priorizar y atender mi petición. La Defensoría del Pueblo es la responsable del tratamiento de mis datos personales.
              </span>
            </label>
          </div>

          {errorEnvio && (
            <div style={{ background: "rgba(180,35,24,0.06)", borderLeft: `4px solid ${COLORS.rojo}`, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "10px 14px", marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: COLORS.texto, margin: 0 }}>{errorEnvio}</p>
            </div>
          )}
          <div style={s.nav}>
            <button style={s.btnG} onClick={() => setPaso(p => p - 1)} disabled={enviando}> Anterior</button>
            <button
              style={{ ...s.btnP, opacity: (!d.consentimiento || enviando) ? .45 : 1, cursor: (!d.consentimiento || enviando) ? "not-allowed" : "pointer" }}
              disabled={!d.consentimiento || enviando}
              onClick={async () => {
                if (!d.consentimiento) return;
                setEnviando(true);
                setErrorEnvio("");
                const payload = {
                  nombre: d.nombre,
                  cedula: d.cedula,
                  tipo_doc: d.tipo_doc,
                  etario: d.etario,
                  etnia: d.etnia,
                  discapacidad: d.disc,
                  victima_conflicto: d.victima,
                  grupos_especiales: [...d.grupos],
                  entidades: [...d.entidadesSel],
                  entidad_otro: d.entidadOtro || null,
                  entidad_no_sabe: d.entidadNoSabe || false,
                  texto_relato: d.texto,
                  contacto_tipo: d.contactoTipo,
                  contacto_valor: d.contactoTipo === "correo" ? d.correo : d.celular,
                  canal: "web",
                };
                try {
                  const resp = await fetch(`${API_URL}/api/peticiones`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.detail || "No se pudo radicar la petición.");
                  }
                  const data = await resp.json();
                  setRad(data.radicado);
                  setResultadoRadicado(data);
                  // Guardar también en localStorage para el historial local
                  try {
                    const prev = JSON.parse(localStorage.getItem("urab_radicados") || "[]");
                    prev.unshift({ radicado: data.radicado, fecha: new Date().toISOString(), cedula: d.cedula, nombre: d.nombre });
                    localStorage.setItem("urab_radicados", JSON.stringify(prev.slice(0, 20)));
                  } catch(e) {}
                  setPaso(p => p + 1);
                } catch (e) {
                  setErrorEnvio(
                    e.message.includes("Failed to fetch")
                      ? "El servidor está iniciando (puede tardar hasta 50 segundos en el plan gratuito). Intente de nuevo en un momento."
                      : e.message
                  );
                } finally {
                  setEnviando(false);
                }
              }}
            >
              {enviando ? "Radicando..." : "Radicar petición "}
            </button>
          </div>
          {!d.consentimiento && <p style={{ fontSize: 10, color: COLORS.rojo, textAlign: "right", marginTop: 6 }}>Debe aceptar la política para continuar</p>}
        </div>
      )}

      {paso === 7 && (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}></div>
          <h3 style={{ fontSize: 15, color: COLORS.navy, margin: "0 0 5px", fontWeight: 600 }}>Petición radicada exitosamente</h3>
          <p style={{ fontSize: 12, color: COLORS.textoSec, margin: "0 0 12px" }}>La Defensoría del Pueblo ha recibido su solicitud</p>
          <div style={s.radBox}>
            <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0 }}>Número de radicado</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.navy, margin: "2px 0 0", letterSpacing: ".06em", fontFamily: FONT_MONO }}>{rad}</p>
          </div>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginTop: 4 }}>Fecha: {resultadoRadicado?.fecha || new Date().toLocaleDateString("es-CO")}</p>

          <div style={{ background: COLORS.fondo, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px", margin: "12px 0", textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, marginBottom: 6 }}>¿Cómo hacer seguimiento?</p>
            <p style={{ fontSize: 11, color: COLORS.textoSec, lineHeight: 1.7, margin: 0 }}>
              1. Guarde este número: <strong style={{ color: COLORS.navy, fontFamily: FONT_MONO }}>{rad}</strong><br />
              2. Consulte en la pestaña <strong>Seguimiento</strong> de este portal<br />
              {d.contactoTipo === "correo" ? <>3. Recibirá confirmación en <strong style={{ fontFamily: FONT_MONO }}>{d.correo}</strong></> : <>3. Recibirá un SMS de confirmación en <strong style={{ fontFamily: FONT_MONO }}>{d.celular}</strong></>}<br />
              4. Línea gratuita: <strong style={{ fontFamily: FONT_MONO }}>01 8000 914 814</strong>
            </p>
          </div>
          {d.contactoTipo === "celular" && rad && (
            <div style={{ margin: "12px auto", maxWidth: 280 }}>
              <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "0 0 4px", textAlign: "left" }}>Mensaje enviado a su celular (simulación MVP):</p>
              <div style={{ background: "#000", borderRadius: RADIUS.md, padding: 14 }}>
                <p style={{ fontSize: 9, color: "#8E8E93", marginBottom: 6, textAlign: "center" }}>Defensoría del Pueblo</p>
                <div style={{ background: "#262628", color: "#fff", borderRadius: RADIUS.md, padding: "10px 14px", fontSize: 12, lineHeight: 1.5, textAlign: "left" }}>
                  Su petición fue radicada con el número <span style={{ fontFamily: FONT_MONO }}>{rad}</span>. Consulte el estado en urab-ai-ciudadano.vercel.app o llame al 01 8000 914 814.
                </div>
              </div>
            </div>
          )}
          <p style={{ fontSize: 10, color: COLORS.textoSec, lineHeight: 1.7 }}>
            Petición registrada en el sistema · Tratamiento de datos conforme a la Ley 1581 de 2012
          </p>
          <button style={{ ...s.btnG, marginTop: 16 }} onClick={() => {
            setPaso(1); setRad(""); setResultadoRadicado(null); setUrg(false); setErrorEnvio("");
            setD({
              nombre: "", tipo_doc: "CC", cedula: "",
              etario: null, etario_otro: "",
              etnia: null, etnia_otro: "",
              disc: null, disc_otro: "",
              victima: null, victima_otro: "",
              grupos: new Set(), grupo_otro: "",
              entidadesSel: new Set(), entidadOtro: "", entidadNoSabe: false,
              contactoTipo: "correo", correo: "", celular: "",
              archivos: [],
              texto: "",
              consentimiento: false,
            });
          }}> Radicar otra petición</button>
        </div>
      )}
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────
export default function App() {
  const [seccion, setSeccion] = useState("radicar");

  return (
    <div id="urab-app-root" style={s.wrap}>
      <FranjaBandera />
      <BarraGovCo />
      <Header />
      <AccesibilidadBar />
      <div className="urab-contain" style={{ padding: "24px 16px 48px" }}>
        <div style={s.tabs}>
          <button style={s.tab(seccion === "radicar")} onClick={() => setSeccion("radicar")}>Radicar petición</button>
          <button style={s.tab(seccion === "seguimiento")} onClick={() => setSeccion("seguimiento")}>Seguimiento</button>
        </div>
        <div style={s.card}>
          {/* Ambas secciones permanecen montadas: al cambiar de pestaña no se pierde
              la información que el ciudadano ya diligenció en el formulario */}
          <div style={{ display: seccion === "radicar" ? "block" : "none" }}><Portal /></div>
          <div style={{ display: seccion === "seguimiento" ? "block" : "none" }}><Seguimiento /></div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
