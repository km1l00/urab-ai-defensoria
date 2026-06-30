import { useState, useEffect, useRef } from "react";

// ── Barra de accesibilidad ─────────────────────────────────────────────
const NIVELES_ACC = ["Normal","Grande","Muy grande","Máximo"];
const SIZES_ACC   = ["14px","17px","20px","24px"];

function useAccesibilidad() {
  const [nivel, setNivel] = useState(() => parseInt(localStorage.getItem("urab_fs")||"0"));
  const [contraste, setContraste] = useState(() => localStorage.getItem("urab_ac")==="1");
  useEffect(() => { document.documentElement.style.fontSize = SIZES_ACC[nivel]; localStorage.setItem("urab_fs", nivel); }, [nivel]);
  useEffect(() => { document.body.classList.toggle("urab-ac", contraste); localStorage.setItem("urab_ac", contraste?"1":"0"); }, [contraste]);
  return { nivel, setNivel, contraste, setContraste };
}

function AccesibilidadBar() {
  const { nivel, setNivel, contraste, setContraste } = useAccesibilidad();
  const [ayuda, setAyuda] = useState(false);
  const cambiar = d => setNivel(n => Math.max(0, Math.min(3, n+d)));
  return (
    <>
      <style>{`.urab-ac{filter:invert(1) hue-rotate(180deg)}.urab-ac img,.urab-ac svg{filter:invert(1) hue-rotate(180deg)}
body.urab-fs1 *{font-size:107%!important;line-height:1.65!important}
body.urab-fs2 *{font-size:118%!important;line-height:1.7!important}
body.urab-fs3 *{font-size:132%!important;line-height:1.8!important}`}</style>
      <div style={{ background:"#0F2E5A", padding:"5px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
        <span style={{ fontSize:10, color:"#93C5FD", letterSpacing:".08em" }}>TEXTO</span>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <button onClick={()=>cambiar(-1)} disabled={nivel===0} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:12, fontWeight:700, cursor:nivel===0?"not-allowed":"pointer", opacity:nivel===0?.35:1, fontFamily:"inherit" }}>A−</button>
          <button onClick={()=>cambiar(1)}  disabled={nivel===3} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:12, fontWeight:700, cursor:nivel===3?"not-allowed":"pointer", opacity:nivel===3?.35:1, fontFamily:"inherit" }}>A+</button>
          <span style={{ fontSize:10, color:"#BFDBFE", padding:"0 4px", minWidth:62 }}>{NIVELES_ACC[nivel]}</span>
          <button onClick={()=>setNivel(0)} style={{ fontSize:10, color:"#93C5FD", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>Restablecer</button>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,.2)", margin:"0 2px" }}/>
          <button onClick={()=>setContraste(c=>!c)} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:contraste?"#FFD700":"rgba(255,255,255,.1)", color:contraste?"#000":"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>
            🌓 {contraste?"Desactivar contraste":"Alto contraste"}
          </button>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,.2)", margin:"0 2px" }}/>
          <button onClick={()=>setAyuda(a=>!a)} style={{ fontSize:10, color:"#93C5FD", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>
            ¿Cómo funciona? {ayuda?"▴":"▾"}
          </button>
        </div>
      </div>
      {ayuda && (
        <div style={{ background:"#FFF9C4", border:"1px solid #F59E0B", borderRadius:"0 0 8px 8px", padding:"12px 18px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["A−","Letra más pequeña","Hace el texto más pequeño. Útil si quiere ver más contenido en pantalla."],
              ["A+","Letra más grande","Hace el texto más grande. Recomendado si le cuesta leer o usa el celular."],
              ["Rest.","Restablecer","Vuelve al tamaño normal del portal, como estaba al entrar."],
              ["🌓","Alto contraste","Cambia los colores para que sea más fácil leer. Ayuda si tiene dificultad para ver bien la pantalla."],
            ].map(([ico,titulo,desc])=>(
              <div key={titulo} style={{ display:"flex", gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:"#1A3D6B", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{ico}</div>
                <div>
                  <p style={{ fontSize:12, fontWeight:600, color:"#92400E", margin:"0 0 2px" }}>{titulo}</p>
                  <p style={{ fontSize:11, color:"#78350F", margin:0, lineHeight:1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:10, color:"#92400E", textAlign:"center", marginTop:10, paddingTop:8, borderTop:"1px solid #FCD34D" }}>
            Su preferencia se guarda automáticamente — no necesita volver a ajustarla en su próxima visita.
          </p>
        </div>
      )}
    </>
  );
}

// ── Datos ──────────────────────────────────────────────────────────────
const PASOS = ["Datos personales", "Caracterización", "Entidad", "Contacto", "Adjuntos", "Confirmar", "Radicado"];

const ENTIDADES = {
  "Salud": ["EPS Sanitas","EPS Sura","Nueva EPS","EPS Famisanar","Compensar EPS","Salud Total","Coosalud","Mutual SER"],
  "Pensiones": ["Colpensiones","Porvenir","Protección","Colfondos","Skandia"],
  "Educación": ["Secretaría de Educación de Bogotá","ICFES","ICETEX","Universidad Nacional","SENA"],
  "Justicia": ["Fiscalía General de la Nación","INPEC","Rama Judicial","Policía Nacional","ICBF"],
  "Servicios públicos": ["EPM","Codensa / Enel","Vanti","Acueducto de Bogotá","Claro","Movistar","Tigo"],
  "Vivienda": ["Curaduría Urbana","Catastro Distrital","Fondo Nacional del Ahorro"],
  "Migración": ["Migración Colombia","Cancillería"],
};

const URG = {
  critica: { lbl: "CRÍTICA", color: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5" },
  alta:    { lbl: "ALTA",    color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" },
  media:   { lbl: "MEDIA",   color: "#1E40AF", bg: "#DBEAFE", border: "#93C5FD" },
  baja:    { lbl: "BAJA",    color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
};
const ACTOR_COLOR = { c: "#1A3D6B", f: "#059669", ia: "#7C3AED" };
const ACTOR_BG    = { c: "#EFF6FF", f: "#ECFDF5", ia: "#F5F3FF" };
const ACTOR_LBL   = { c: "Usted", f: "Funcionario/a", ia: "Sistema IA" };

const RADICADOS = {
  "DP-2026-004821": {
    radicado: "DP-2026-004821", ciudadano: "María García", canal: "Web", fecha: "14/06/2026",
    urgencia: "critica", categoria: "VBG", profesional: "Ana Torres", especialidad: "VBG · NNA",
    estado_actual: "En revisión por profesional especializado", clasificacion_ia: true,
    hitos: [
      { lbl: "Recibida",    fecha: "14/06 08:42", actor: "c", actorLbl: "Usted",       desc: "Su petición fue radicada exitosamente.", done: true },
      { lbl: "Priorizada",  fecha: "14/06 08:42", actor: "ia",actorLbl: "Sistema IA",  desc: "El sistema identificó su caso como urgente y lo priorizó automáticamente.", done: true },
      { lbl: "Asignada",    fecha: "14/06 08:43", actor: "ia",actorLbl: "Sistema IA",  desc: "Asignada a profesional especializada en VBG.", done: true },
      { lbl: "En revisión", fecha: "Hoy",         actor: "f", actorLbl: "Profesional", desc: "Ana Torres está revisando su caso.", done: true, now: true },
      { lbl: "Respuesta",   fecha: "Pendiente",   actor: "f", actorLbl: "Profesional", desc: "Recibirá respuesta por correo o teléfono.", done: false },
      { lbl: "Cerrada",     fecha: "—",           actor: "f", actorLbl: "Profesional", desc: "El caso será cerrado una vez resuelto.", done: false },
    ],
    eventos: [
      { titulo: "Radicación recibida",       fecha: "14/06 08:42", actor: "c",  desc: "Su petición fue registrada con el número DP-2026-004821. Categoría: VBG." },
      { titulo: "Priorización automática",   fecha: "14/06 08:42", actor: "ia", desc: "El sistema de IA identificó indicadores de urgencia crítica. Su caso fue marcado para atención prioritaria." },
      { titulo: "Asignación de profesional", fecha: "14/06 08:43", actor: "ia", desc: "Asignada a Ana Torres, especialista en VBG y NNA." },
      { titulo: "Revisión en curso",         fecha: "14/06 09:00", actor: "f",  desc: "La profesional Ana Torres inició la revisión de su caso." },
    ],
  },
  "52.847.193": { redirect: "DP-2026-004821" },
};

// ── Logo SVG Defensoría ────────────────────────────────────────────────
const LogoDefensoria = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 44, height: 44, flexShrink: 0 }}>
    <circle cx="50" cy="26" r="16" fill="white" opacity=".95"/>
    <ellipse cx="37" cy="26" rx="5" ry="7" fill="#1A3D6B" transform="rotate(-15 37 26)"/>
    <ellipse cx="63" cy="26" rx="5" ry="7" fill="#1A3D6B" transform="rotate(15 63 26)"/>
    <ellipse cx="50" cy="19" rx="6" ry="8" fill="white"/>
    <path d="M10 55 Q18 38 34 42 Q42 44 48 50 Q50 52 50 52 Q50 52 52 50 Q58 44 66 42 Q82 38 90 55 Q72 68 58 65 Q54 64 50 66 Q46 64 42 65 Q28 68 10 55Z" fill="white" opacity=".95"/>
    <circle cx="28" cy="50" r="3.5" fill="#1A3D6B"/>
    <circle cx="72" cy="50" r="3.5" fill="#1A3D6B"/>
    <path d="M47 52 Q50 48 53 52 Q51 57 50 59 Q49 57 47 52Z" fill="white" opacity=".6"/>
  </svg>
);

// ── Estilos base ───────────────────────────────────────────────────────
const s = {
  wrap:    { maxWidth: 640, margin: "0 auto", padding: "0 16px 40px", fontFamily: "'Inter',system-ui,sans-serif" },
  hdr:     { background: "#1A3D6B", borderRadius: "0 0 12px 12px", marginBottom: 0, overflow: "hidden" },
  hdrTop:  { padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoWrap:{ display: "flex", alignItems: "center", gap: 12 },
  gov:     { fontSize: 9, color: "#93C5FD", letterSpacing: ".12em", textTransform: "uppercase" },
  h1:      { fontSize: 14, fontWeight: 600, color: "#fff", margin: "2px 0 1px" },
  slogan:  { fontSize: 10, color: "#BFDBFE", fontStyle: "italic" },
  card:    { background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "18px 20px" },
  tabs:    { display: "flex", borderBottom: "0.5px solid #E5E7EB", marginBottom: 18 },
  tab:     (a) => ({ padding: "9px 16px", fontSize: 12, border: "none", borderBottom: a ? "2px solid #1A3D6B" : "2px solid transparent", marginBottom: -1, background: "none", cursor: "pointer", color: a ? "#1A3D6B" : "#6B7280", fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  flabel:  { display: "block", fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 500 },
  input:   { width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#111827" },
  grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  optBtn:  (sel) => ({ padding: "6px 12px", borderRadius: 20, border: sel ? "1.5px solid #2E75B6" : "1.5px solid #E5E7EB", background: sel ? "#EFF6FF" : "#fff", fontSize: 12, cursor: "pointer", color: sel ? "#1A3D6B" : "#374151", fontWeight: sel ? 600 : 400, fontFamily: "inherit" }),
  subcampo:{ background: "#F9FAFB", borderLeft: "3px solid #2E75B6", borderRadius: "0 6px 6px 0", padding: "10px 12px", marginTop: 8 },
  infoLegal:{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "11px 13px", marginBottom: 12 },
  resumen: { background: "#F9FAFB", borderRadius: 8, padding: 14, marginBottom: 14 },
  resRow:  { display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" },
  resLbl:  { fontSize: 11, color: "#6B7280", minWidth: 130, flexShrink: 0 },
  resVal:  { fontSize: 11, fontWeight: 600, color: "#111827", lineHeight: 1.5 },
  tag:     { display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#EFF6FF", color: "#1A3D6B", border: "0.5px solid #BFDBFE", margin: "2px 2px 2px 0", fontWeight: 500 },
  radBox:  { background: "#EFF6FF", border: "2px solid #1A3D6B", borderRadius: 8, padding: "10px 22px", display: "inline-block", margin: "12px auto" },
  nav:     { display: "flex", justifyContent: "space-between", marginTop: 18 },
  btnP:    { padding: "9px 20px", borderRadius: 6, border: "1px solid #1A3D6B", background: "#1A3D6B", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  btnG:    { padding: "9px 16px", borderRadius: 6, border: "0.5px solid #E5E7EB", background: "#fff", color: "#374151", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnSm:   { padding: "7px 14px", borderRadius: 6, border: "0.5px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  groupTitle:{ fontSize: 11, fontWeight: 700, color: "#2E75B6", marginBottom: 10, paddingBottom: 5, borderBottom: "0.5px solid #E5E7EB" },
  groupBlock:{ marginBottom: 20 },
};

// ── Header ─────────────────────────────────────────────────────────────
function Header() {
  return (
    <div style={s.hdr}>
      <div style={s.hdrTop}>
        <div style={s.logoWrap}>
          <LogoDefensoria />
          <div>
            <div style={s.gov}>GOV.CO · República de Colombia</div>
            <div style={s.h1}>Defensoría del Pueblo · URAB-AI</div>
            <div style={s.slogan}>Nos unen tus derechos · Portal de atención ciudadana</div>
          </div>
        </div>
      </div>
    </div>
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
            <div style={{ width: 24, height: 24, borderRadius: "50%", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: st === "done" ? "#22C55E" : st === "active" ? "#1A3D6B" : "#E5E7EB", color: st === "future" ? "#9CA3AF" : "#fff" }}>
              {n < paso ? "✓" : n}
            </div>
            <div style={{ fontSize: 8, color: n === paso ? "#1A3D6B" : "#9CA3AF", fontWeight: n === paso ? 600 : 400 }}>{l}</div>
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
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 4px #F59E0B20}60%{box-shadow:0 0 0 8px #F59E0B08}}`}</style>
      <div style={{ position: "relative", padding: "4px 0 0" }}>
        <div style={{ position: "absolute", top: 13, left: 13, right: 13, height: 2.5, background: "#E5E7EB", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 13, left: 13, height: 2.5, borderRadius: 2, background: "#1A3D6B", width: `calc(${pct}% - 13px)`, transition: "width .4s" }} />
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          {hitos.map((h, i) => {
            const dotBg = h.done ? (h.now ? "#F59E0B" : h.actor === "f" ? "#059669" : "#1A3D6B") : "#F3F4F6";
            const dotColor = h.done ? "#fff" : "#9CA3AF";
            const dotBorder = h.done ? "none" : "2px solid #D1D5DB";
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: dotBg, color: dotColor, border: dotBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginBottom: 6, animation: h.now ? "pulse 1.8s infinite" : "none" }}>
                  {h.done && !h.now ? "✓" : h.now ? "●" : ""}
                </div>
                <div style={{ fontSize: 9, textAlign: "center", lineHeight: 1.4, maxWidth: 56, color: h.done ? (h.now ? "#92400E" : "#6B7280") : "#9CA3AF", fontWeight: h.now ? 700 : h.done ? 500 : 400 }}>{h.lbl}</div>
                <div style={{ fontSize: 8, color: "#9CA3AF", textAlign: "center", marginTop: 2 }}>{h.fecha}</div>
                <div style={{ fontSize: 8, textAlign: "center", marginTop: 3, padding: "1px 5px", borderRadius: 6, background: ACTOR_BG[h.actor], color: ACTOR_COLOR[h.actor] }}>{h.actorLbl}</div>
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
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "0.5px solid #D1D5DB", borderRadius: 8, marginTop: 4, maxHeight: 260, overflowY: "auto", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
            {grupos.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 12, color: "#9CA3AF" }}>Sin resultados — use el campo "Otro" abajo</div>
            )}
            {grupos.map(([grupo, items]) => (
              <div key={grupo}>
                <div style={{ padding: "6px 10px 3px", fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", background: "#F9FAFB", position: "sticky", top: 0 }}>{grupo}</div>
                {items.map(item => {
                  const sel = seleccionadas.has(item);
                  return (
                    <div key={item} onClick={() => onToggle(item)}
                      style={{ padding: "8px 12px", fontSize: 12, color: sel ? "#1A3D6B" : "#111827", fontWeight: sel ? 600 : 400, cursor: "pointer", background: sel ? "#EFF6FF" : "transparent" }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#F9FAFB"; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                      {sel ? "✓ " : ""}{item}
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
          <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EFF6FF", color: "#1A3D6B", border: "1px solid #BFDBFE", borderRadius: 16, padding: "5px 10px 5px 12px", fontSize: 12, fontWeight: 500, margin: "3px 4px 3px 0" }}>
            {e} <button onClick={() => onToggle(e)} style={{ background: "none", border: "none", color: "#1A3D6B", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
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

// ── OBSERVACIÓN 4: Dropzone con simulación de extracción IA ─────────────
function DropzoneAdjuntos({ archivos, onAdd, onRemove }) {
  const inputRef = useRef(null);

  const simularSubida = (nombre = "queja_eps_sanitas.pdf") => {
    const id = Date.now();
    onAdd({ id, nombre, tipo: nombre.endsWith(".pdf") ? "PDF" : nombre.match(/\.(jpg|jpeg|png)$/i) ? "IMG" : "DOC", estado: "Procesando con IA...", extraido: false });
    setTimeout(() => {
      onAdd({ id, nombre, tipo: nombre.endsWith(".pdf") ? "PDF" : nombre.match(/\.(jpg|jpeg|png)$/i) ? "IMG" : "DOC", estado: "Información extraída ✓", extraido: true, _update: true });
    }, 1200);
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(f => simularSubida(f.name));
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        style={{ border: "2px dashed #D1D5DB", borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer" }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 4 }}>Arrastre su archivo aquí o haga clic para seleccionar</p>
        <p style={{ fontSize: 11, color: "#9CA3AF" }}>PDF, Word o imagen (JPG, PNG) · Máximo 10 MB</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      </div>

      <div style={{ marginTop: 14 }}>
        {archivos.map((f, i) => (
          <div key={f.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F9FAFB", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: "#1A3D6B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{f.tipo}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nombre}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>{f.estado}</div>
              </div>
              <button onClick={() => onRemove(f.id)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
            </div>
            {f.extraido && (
              <div style={{ background: "#F5F3FF", border: "0.5px solid #C4B5FD", borderRadius: 8, padding: "10px 12px", marginTop: -4, marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#5B21B6", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>🤖 Información extraída automáticamente</p>
                {[["Tipo de petición", "Queja por salud"], ["Entidad mencionada", "EPS Sanitas"], ["Relato", "Negación de cirugía autorizada"]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "0.5px solid #E9D5FF" }}>
                    <span style={{ color: "#6B21A8" }}>{l}</span><span style={{ color: "#374151", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0" }}>
                  <span style={{ color: "#6B21A8" }}>Número de cédula</span><span style={{ color: "#D97706", fontStyle: "italic" }}>No se pudo extraer — le preguntaremos</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Seguimiento de radicado ────────────────────────────────────────────
function Seguimiento() {
  const [vista, setVista] = useState("buscar");
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivoImpugna, setMotivoImpugna] = useState("");
  const [impugEnviada, setImpugEnviada] = useState(false);

  const buscar = () => {
    const v = query.trim().toUpperCase().replace(/\s/g, "");
    if (!v) { setError("Ingrese un número de radicado o cédula."); return; }
    let caso = RADICADOS[v] || RADICADOS["DP-2026-" + v] || null;
    if (!caso) {
      const key = v.replace(/[^0-9.]/g, "");
      caso = RADICADOS[key] || null;
    }
    if (!caso) { setError("No encontramos ese radicado. Verifique el número o intente con su cédula."); setResultado(null); return; }
    if (caso.redirect) caso = RADICADOS[caso.redirect];
    setResultado(caso); setError(""); setImpugEnviada(false);
  };

  const enviarImpugnacion = () => {
    if (!motivoImpugna.trim()) return;
    setModalAbierto(false); setMotivoImpugna(""); setImpugEnviada(true);
  };

  return (
    <div>
      <div style={s.tabs}>
        <button style={s.tab(vista === "buscar")} onClick={() => setVista("buscar")}>Consultar radicado</button>
        <button style={s.tab(vista === "historial")} onClick={() => setVista("historial")}>Mis peticiones</button>
      </div>

      {vista === "buscar" && (
        <div>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>Ingrese su número de radicado o cédula para ver el estado de su petición.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={{ ...s.input, flex: 1 }} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()} placeholder="Ej: DP-2026-004821 o su número de cédula" />
            <button style={{ ...s.btnP, whiteSpace: "nowrap", padding: "9px 18px" }} onClick={buscar}>Consultar</button>
          </div>

          {error && <p style={{ fontSize: 12, color: "#991B1B", marginBottom: 12 }}>{error}</p>}

          {resultado && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 2 }}>{resultado.radicado}</h3>
                  <p style={{ fontSize: 11, color: "#6B7280" }}>{resultado.ciudadano} · {resultado.canal} · {resultado.fecha}</p>
                </div>
                <span style={{ background: URG[resultado.urgencia].bg, color: URG[resultado.urgencia].color, border: `1px solid ${URG[resultado.urgencia].border}`, padding: "4px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {URG[resultado.urgencia].lbl}
                </span>
              </div>

              <BarraHitos hitos={resultado.hitos} />

              {/* OBSERVACIÓN 5: banner sin línea de emergencia */}
              <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: resultado.urgencia === "critica" ? "#FEF9C3" : "#F9FAFB", border: `0.5px solid ${resultado.urgencia === "critica" ? "#FDE047" : "#E5E7EB"}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: resultado.urgencia === "critica" ? "#713F12" : "#111827", marginBottom: 4 }}>
                  {resultado.urgencia === "critica" ? "⚡ " : ""}{resultado.estado_actual}
                </p>
                <p style={{ fontSize: 11, color: resultado.urgencia === "critica" ? "#92400E" : "#6B7280", lineHeight: 1.6, margin: 0 }}>
                  {resultado.urgencia === "critica" ? "Un profesional especializado se comunicará con usted dentro de las próximas 2 horas hábiles." : `Profesional asignado/a: ${resultado.profesional} · Especialidad: ${resultado.especialidad}`}
                </p>
              </div>

              {resultado.clasificacion_ia && !impugEnviada && (
                <div style={s.infoLegal}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#1E40AF", marginBottom: 4 }}>Sobre la clasificación de su caso</p>
                  <p style={{ fontSize: 11, color: "#1E40AF", lineHeight: 1.6, marginBottom: 8 }}>
                    El sistema de inteligencia artificial analizó su petición y le asignó la prioridad <strong>{URG[resultado.urgencia].lbl}</strong>. Si considera que esta clasificación no refleja su situación real, puede solicitar revisión humana (Art. 29 CP · Directiva 007/2025).
                  </p>
                  <button style={{ ...s.btnP, fontSize: 11, padding: "7px 14px" }} onClick={() => setModalAbierto(true)}>
                    Solicitar revisión humana de la clasificación
                  </button>
                </div>
              )}

              {impugEnviada && (
                <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#065F46", marginBottom: 3 }}>✓ Solicitud de revisión enviada</p>
                  <p style={{ fontSize: 11, color: "#065F46", margin: 0 }}>Un profesional revisará la clasificación dentro de las próximas 24 horas hábiles y le notificará por correo o teléfono.</p>
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 10, color: "#6B7280" }}>
                  {[["c","#1A3D6B","Usted"],["ia","#7C3AED","Sistema IA"],["f","#059669","Funcionario/a"]].map(([k,c,l]) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }}></span> {l}
                    </span>
                  ))}
                </div>
                {resultado.eventos.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #F3F4F6" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: ACTOR_COLOR[e.actor], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, color: "#fff" }}>{e.actor === "c" ? "👤" : e.actor === "f" ? "🏛️" : "🤖"}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{e.titulo}</span>
                        <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: ACTOR_BG[e.actor], color: ACTOR_COLOR[e.actor], border: `0.5px solid ${ACTOR_COLOR[e.actor]}40`, fontWeight: 600 }}>
                          {ACTOR_LBL[e.actor]}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{e.fecha}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, margin: 0 }}>{e.desc}</p>
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
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14 }}>Peticiones registradas para la cédula <strong>52.847.193</strong></p>
          {[
            { rad: "DP-2026-004821", badge: "IA priorizó", badgeColor: "#4C1D95", badgeBg: "#F5F3FF", fecha: "14/06/2026", desc: "VBG · Urgencia crítica · En revisión", activo: true },
            { rad: "DP-2025-018432", badge: "Revisión humana", badgeColor: "#065F46", badgeBg: "#ECFDF5", fecha: "03/11/2025", desc: "Salud · Cerrada · Respuesta enviada 07/11/2025", activo: false },
          ].map(h => (
            <div key={h.rad} onClick={() => { if (h.activo) { setVista("buscar"); setQuery(h.rad); setTimeout(() => { const c = RADICADOS[h.rad]; if (c) setResultado(c); }, 50); } }} style={{ padding: "10px 12px", borderRadius: 8, background: "#F9FAFB", marginBottom: 8, cursor: h.activo ? "pointer" : "default", opacity: h.activo ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A3D6B" }}>{h.rad}</span>
                <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: h.badgeBg, color: h.badgeColor, border: `0.5px solid ${h.badgeColor}40`, fontWeight: 600 }}>{h.badge}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{h.fecha}</span>
              </div>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{h.desc}</p>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, maxWidth: 400, width: "100%", border: "0.5px solid #E5E7EB" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 8 }}>Solicitar revisión humana</h3>
            <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 12 }}>
              Tiene derecho a impugnar la clasificación automática (Art. 29 CP). Explique brevemente por qué considera que la clasificación es incorrecta.
            </p>
            <textarea value={motivoImpugna} onChange={e => setMotivoImpugna(e.target.value)} placeholder="Ej: Considero que mi caso debería tener prioridad más alta porque..." style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 12, fontFamily: "inherit", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }} />
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
  const [rad] = useState("DP-2026-" + String(Math.floor(Math.random() * 9000) + 1000).padStart(6, "0"));
  const [d, setD] = useState({
    nombre: "", tipo_doc: "CC", cedula: "",
    // OBS 1: caracterización con otro/no_decir
    etario: null, etario_otro: "",
    etnia: null, etnia_otro: "",
    disc: null, disc_otro: "",
    victima: null, victima_otro: "",
    grupos: new Set(), grupo_otro: "",
    // OBS 2: entidades múltiples con búsqueda
    entidadesSel: new Set(), entidadOtro: "",
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
    // NNA + indicador crítico en el relato → regla hard-coded de protección reforzada
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

  const GrupoOpt = ({ val, label }) => (
    <button style={s.optBtn(d.grupos.has(val))} onClick={() => toggleGrupo(val)}>{label}</button>
  );

  // Validaciones por paso
  const contactoValido = (d.contactoTipo === "correo" && d.correo.includes("@")) || (d.contactoTipo === "celular" && d.celular.length >= 10);

  const Nav = ({ disabled, ultimoTexto }) => paso < 6 && (
    <div style={s.nav}>
      <button style={s.btnG} onClick={() => paso > 1 ? setPaso(p => p - 1) : null}>{paso === 1 ? "Cancelar" : "← Anterior"}</button>
      <button style={{ ...s.btnP, opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer" }} disabled={disabled} onClick={() => setPaso(p => p + 1)}>
        {ultimoTexto || "Siguiente →"}
      </button>
    </div>
  );

  const etarioLbls = { nino: "Niño (0–8)", nina: "Niña (0–8)", adolescente: "Adolescente (9–17)", adulto: "Adulto (18–59)", adulto_mayor: "Persona mayor (60+)", otro: d.etario_otro, no_decir: "Prefiere no decirlo" };
  const etniaLbls = { indigena: "Pueblo indígena", afro: "Afrodescendiente", raizal: "Raizal", rom: "Pueblo Rom", palenquero: "Palenquero", ninguna: "No aplica", otro: d.etnia_otro, no_decir: "Prefiere no decirlo" };
  const discLbls = { fisica: "Física/motora", visual: "Visual", auditiva: "Auditiva", cognitiva: "Cognitiva", psicosocial: "Psicosocial", ninguna: "No aplica", otro: d.disc_otro, no_decir: "Prefiere no decirlo" };
  const victimaLbls = { si: "Sí", no: "No", otro: d.victima_otro, no_decir: "Prefiere no decirlo" };
  const grupoLbls = { migrante: "Migrante", vbg: "Víctima de VBG", lgbtiq: "LGBTIQ+", privado_libertad: "Privado de libertad", desplazado: "Desplazado", habitante_calle: "Habitante de calle", refugiado: "Refugiado", defensora: "Defensor/a DDHH", otro_grupo: d.grupo_otro || "Otro", no_decir_grupo: "Prefiero no decirlo" };

  return (
    <div>
      <Stepper paso={paso} />

      {/* OBSERVACIÓN 5: banner sin línea de emergencia, mensaje de confianza en la herramienta */}
      {urg && paso === 6 && (
        <div style={{ background: "#FEF9C3", border: "2px solid #FDE047", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#713F12", margin: "0 0 3px" }}>⚡ Su caso ha sido identificado como urgente</p>
          <p style={{ fontSize: 11, color: "#78350F", margin: 0 }}>Un profesional especializado revisará su petición de forma prioritaria y se comunicará con usted dentro de las próximas 2 horas hábiles.</p>
        </div>
      )}

      {paso === 1 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 14 }}>Sus datos de contacto</p>
          <div style={{ marginBottom: 10 }}>
            <label style={s.flabel}>Nombre y apellidos completos *</label>
            <input style={s.input} value={d.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Nombre completo" />
          </div>
          <div style={{ ...s.grid2, marginBottom: 4 }}>
            <div>
              <label style={s.flabel}>Tipo de documento *</label>
              <select style={s.input} value={d.tipo_doc} onChange={e => upd("tipo_doc", e.target.value)}>
                {["CC","CE","Pasaporte","PPT","NUIP"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.flabel}>Número *</label>
              <input style={s.input} value={d.cedula} onChange={e => upd("cedula", e.target.value)} placeholder="Sin puntos" />
            </div>
          </div>
          <Nav disabled={!d.nombre || !d.cedula} />
        </div>
      )}

      {paso === 2 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>Caracterización del peticionario</p>
          <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>Esta información permite priorizar su atención y garantizar sus derechos como sujeto de especial protección. Todos los campos son opcionales y puede elegir no responder.</p>

          <CampoCaracterizacion
            titulo="¿A qué grupo etario pertenece?" icono="👤"
            opciones={[["nino","Niño (0–8)"],["nina","Niña (0–8)"],["adolescente","Adolescente (9–17)"],["adulto","Adulto (18–59)"],["adulto_mayor","Persona mayor (60+)"],["no_decir","Prefiero no decirlo"]]}
            valor={d.etario} onChange={v => upd("etario", v)}
            otroVal={d.etario_otro} onOtroChange={v => upd("etario_otro", v)}
            placeholderOtro="Especifique el grupo etario"
          />
          <CampoCaracterizacion
            titulo="¿Tiene pertenencia étnica?" icono="🌿"
            opciones={[["indigena","Pueblo indígena"],["afro","Afrodescendiente"],["raizal","Raizal"],["rom","Pueblo Rom"],["palenquero","Palenquero"],["ninguna","No aplica"],["otro","Otro"],["no_decir","Prefiero no decirlo"]]}
            valor={d.etnia} onChange={v => upd("etnia", v)}
            otroVal={d.etnia_otro} onOtroChange={v => upd("etnia_otro", v)}
            placeholderOtro="¿Cuál pueblo, comunidad o resguardo?"
          />
          <CampoCaracterizacion
            titulo="¿Tiene alguna condición de discapacidad?" icono="♿"
            opciones={[["fisica","Física/motora"],["visual","Visual"],["auditiva","Auditiva"],["cognitiva","Cognitiva"],["psicosocial","Psicosocial"],["ninguna","No aplica"],["otro","Otro"],["no_decir","Prefiero no decirlo"]]}
            valor={d.disc} onChange={v => upd("disc", v)}
            otroVal={d.disc_otro} onOtroChange={v => upd("disc_otro", v)}
            placeholderOtro="Especifique el tipo de discapacidad"
          />
          <CampoCaracterizacion
            titulo="¿Ha sido víctima del conflicto armado?" icono="🕊️"
            opciones={[["si","Sí"],["no","No"],["no_decir","Prefiero no decirlo"]]}
            valor={d.victima} onChange={v => upd("victima", v)}
            otroVal={d.victima_otro} onOtroChange={v => upd("victima_otro", v)}
            placeholderOtro="Especifique el hecho victimizante"
          />

          <div style={{ marginBottom: 8 }}>
            <div style={s.groupTitle}>🛡️ ¿Pertenece a algún grupo de especial protección? <span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF" }}>(puede marcar varios)</span></div>
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
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>¿Contra qué entidad dirige su petición?</p>
          <ComboEntidades
            seleccionadas={d.entidadesSel} onToggle={toggleEntidad}
            otroVal={d.entidadOtro} onOtroChange={v => upd("entidadOtro", v)}
          />
          <Nav />
        </div>
      )}

      {paso === 4 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>¿Cómo le notificamos sobre su petición?</p>
          <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>Debe indicar al menos un medio de contacto para recibir actualizaciones de su caso.</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div onClick={() => upd("contactoTipo", "correo")} style={{ flex: 1, padding: 8, textAlign: "center", borderRadius: 6, border: d.contactoTipo === "correo" ? "1.5px solid #2E75B6" : "1.5px solid #D1D5DB", background: d.contactoTipo === "correo" ? "#EFF6FF" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, color: d.contactoTipo === "correo" ? "#1A3D6B" : "#6B7280" }}>📧 Correo electrónico</div>
            <div onClick={() => upd("contactoTipo", "celular")} style={{ flex: 1, padding: 8, textAlign: "center", borderRadius: 6, border: d.contactoTipo === "celular" ? "1.5px solid #2E75B6" : "1.5px solid #D1D5DB", background: d.contactoTipo === "celular" ? "#EFF6FF" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, color: d.contactoTipo === "celular" ? "#1A3D6B" : "#6B7280" }}>📱 Mensaje de texto (SMS)</div>
          </div>

          {d.contactoTipo === "correo" ? (
            <div>
              <label style={s.flabel}>Correo electrónico *</label>
              <input style={s.input} type="email" value={d.correo} onChange={e => upd("correo", e.target.value)} placeholder="nombre@correo.com" />
            </div>
          ) : (
            <div>
              <label style={s.flabel}>Número de celular *</label>
              <input style={s.input} type="tel" value={d.celular} onChange={e => upd("celular", e.target.value)} placeholder="3001234567" />
              {d.celular.length >= 10 && (
                <div>
                  <p style={{ fontSize: 10, color: "#9CA3AF", margin: "10px 0 4px" }}>Así se vería su notificación (simulación MVP — en producción se envía SMS real):</p>
                  <div style={{ background: "#000", borderRadius: 18, padding: 14, maxWidth: 280 }}>
                    <p style={{ fontSize: 9, color: "#8E8E93", marginBottom: 6, textAlign: "center" }}>Defensoría del Pueblo</p>
                    <div style={{ background: "#262628", color: "#fff", borderRadius: 14, padding: "10px 14px", fontSize: 12, lineHeight: 1.5 }}>
                      Su petición fue radicada con el número {rad}. Consulte el estado en urab-ciudadano.vercel.app
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <Nav disabled={!contactoValido} />
          {!contactoValido && <p style={{ fontSize: 10, color: "#DC2626", textAlign: "right", marginTop: 6 }}>Debe indicar un correo o celular válido</p>}
        </div>
      )}

      {paso === 5 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>Adjunte su petición o cuéntenos su situación</p>
          <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>Si ya tiene su petición en un documento, el sistema extraerá la información automáticamente y solo le pedirá lo que falte.</p>

          <DropzoneAdjuntos archivos={d.archivos} onAdd={addArchivo} onRemove={removeArchivo} />

          <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", margin: "14px 0" }}>— o —</p>

          <label style={s.flabel}>Describa su situación con sus propias palabras</label>
          <textarea style={{ ...s.input, minHeight: 100, resize: "vertical" }} value={d.texto} onChange={e => upd("texto", e.target.value)} placeholder="Ejemplo: 'Mi EPS me negó la cirugía que el médico ordenó hace 3 meses...'" />
          <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{d.texto.length} caracteres</p>

          <Nav disabled={d.texto.length < 10 && d.archivos.length === 0} />
        </div>
      )}

      {paso === 6 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 14 }}>Confirme su petición</p>
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
              <div key={l} style={s.resRow}><span style={s.resLbl}>{l}:</span><span style={s.resVal}>{v}</span></div>
            ))}
            {d.entidadesSel.size > 0 && (
              <div style={s.resRow}>
                <span style={s.resLbl}>Entidades:</span>
                <span style={s.resVal}>{[...d.entidadesSel].map(e => <span key={e} style={s.tag}>{e}</span>)}</span>
              </div>
            )}
            {d.grupos.size > 0 && (
              <div style={s.resRow}>
                <span style={s.resLbl}>Grupos especiales:</span>
                <span style={s.resVal}>{[...d.grupos].map(g => <span key={g} style={s.tag}>{grupoLbls[g] || g}</span>)}</span>
              </div>
            )}
            {d.archivos.length > 0 && (
              <div style={s.resRow}><span style={s.resLbl}>Adjuntos:</span><span style={s.resVal}>{d.archivos.length} archivo(s)</span></div>
            )}
          </div>

          {/* OBSERVACIÓN 7: consentimiento de tratamiento de datos antes de radicar */}
          <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={d.consentimiento} onChange={e => upd("consentimiento", e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.6 }}>
                He leído y autorizo el tratamiento de mis datos personales conforme a la{" "}
                <a href="#" onClick={e => e.preventDefault()} style={{ color: "#1A3D6B", fontWeight: 600, textDecoration: "underline" }}>Política de Tratamiento de Datos Personales de la Defensoría del Pueblo</a>,
                de acuerdo con la Ley 1581 de 2012. Entiendo que mis datos sensibles (etnia, discapacidad, condición de víctima) serán usados exclusivamente para priorizar y atender mi petición.
              </span>
            </label>
          </div>

          <Nav disabled={!d.consentimiento} ultimoTexto="Radicar petición ✓" />
          {!d.consentimiento && <p style={{ fontSize: 10, color: "#DC2626", textAlign: "right", marginTop: 6 }}>Debe aceptar la política para continuar</p>}
        </div>
      )}

      {paso === 7 && (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
          <h3 style={{ fontSize: 15, color: "#1A3D6B", margin: "0 0 5px", fontWeight: 600 }}>Petición radicada exitosamente</h3>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px" }}>La Defensoría del Pueblo ha recibido su solicitud</p>
          <div style={s.radBox}>
            <p style={{ fontSize: 10, color: "#6B7280", margin: 0 }}>Número de radicado</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#1A3D6B", margin: "2px 0 0", letterSpacing: ".06em" }}>{rad}</p>
          </div>
          {urg && (
            <div style={{ background: "#FEF9C3", border: "1.5px solid #FDE047", borderRadius: 8, padding: "10px 14px", margin: "12px 0", textAlign: "left" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: "0 0 3px" }}>⚡ Caso priorizado</p>
              <p style={{ fontSize: 11, color: "#78350F", margin: 0 }}>Su petición fue identificada como urgente. Un profesional se comunicará dentro de las próximas 2 horas hábiles.</p>
            </div>
          )}
          <p style={{ fontSize: 11, color: "#6B7280", margin: "10px 0", lineHeight: 1.6 }}>
            Guarde su número de radicado para hacer seguimiento.<br />
            {d.contactoTipo === "correo" ? <>Recibirá confirmación en <strong>{d.correo}</strong>.</> : <>Recibirá un SMS de confirmación en <strong>{d.celular}</strong>.</>}
          </p>
          <p style={{ fontSize: 10, color: "#9CA3AF", lineHeight: 1.7 }}>
            Seguimiento: <strong>01 8000 914 814</strong><br />
            Tratamiento de datos conforme a la Ley 1581 de 2012
          </p>
          <button style={{ ...s.btnG, marginTop: 16 }} onClick={() => setPaso(1)}>← Radicar otra petición</button>
        </div>
      )}
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────
export default function App() {
  const [seccion, setSeccion] = useState("radicar");

  return (
    <div style={s.wrap}>
      <Header />
      <AccesibilidadBar />
      <div style={s.tabs}>
        <button style={s.tab(seccion === "radicar")} onClick={() => setSeccion("radicar")}>Radicar petición</button>
        <button style={s.tab(seccion === "seguimiento")} onClick={() => setSeccion("seguimiento")}>Seguimiento</button>
      </div>
      <div style={s.card}>
        {seccion === "radicar" && <Portal />}
        {seccion === "seguimiento" && <Seguimiento />}
      </div>
      <p style={{ textAlign: "center", fontSize: 10, color: "#9CA3AF", marginTop: 12 }}>
        © 2026 Defensoría del Pueblo · Nos unen tus derechos · Ley 1581/2012 · Art. 29 CP · Directiva 007/2025
      </p>
      <p style={{ textAlign: "center", fontSize: 9, color: "#D1D5DB", marginTop: 4 }}>
        En caso de emergencia o peligro inmediato, comuníquese al 123 o a la línea gratuita 01 8000 914 814
      </p>
    </div>
  );
}
