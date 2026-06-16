import { useState, useEffect } from "react";

// ── Barra de accesibilidad ─────────────────────────────────────────────
const NIVELES_ACC = ["Normal","Grande","Muy grande","Máximo"];
const SIZES_ACC   = ["14px","17px","20px","24px"];

function useAccesibilidad() {
  const [nivel, setNivel] = useState(() => parseInt(localStorage.getItem("urab_fs")||"0"));
  const [contraste, setContraste] = useState(() => localStorage.getItem("urab_ac")==="1");
  useEffect(() => {
    const clases = ["urab-fs0","urab-fs1","urab-fs2","urab-fs3"];
    clases.forEach(c => document.body.classList.remove(c));
    document.body.classList.add("urab-fs"+nivel);
    localStorage.setItem("urab_fs", nivel);
  }, [nivel]);
  useEffect(() => { document.body.classList.toggle("urab-ac", contraste); localStorage.setItem("urab_ac", contraste?"1":"0"); }, [contraste]);
  return { nivel, setNivel, contraste, setContraste };
}

function AccesibilidadBar() {
  const { nivel, setNivel, contraste, setContraste } = useAccesibilidad();
  const [ayuda, setAyuda] = useState(false);
  const cambiar = d => setNivel(n => Math.max(0, Math.min(3, n+d)));
  const btnAcc = (disabled, onClick, label, children) => (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:12, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.35:1, fontFamily:"inherit" }}>
      {children}
    </button>
  );
  return (
    <>
      <style>{`.urab-ac{filter:invert(1) hue-rotate(180deg)}.urab-ac img,.urab-ac svg{filter:invert(1) hue-rotate(180deg)}
body.urab-fs1 *{font-size:107%!important;line-height:1.65!important}
body.urab-fs2 *{font-size:118%!important;line-height:1.7!important}
body.urab-fs3 *{font-size:132%!important;line-height:1.8!important}`}</style>
      <div style={{ background:"#0F2E5A", padding:"5px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
        <span style={{ fontSize:10, color:"#93C5FD", letterSpacing:".08em" }}>TEXTO</span>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {btnAcc(nivel===0, ()=>cambiar(-1), "Letra más pequeña", "A−")}
          {btnAcc(nivel===3, ()=>cambiar(1),  "Letra más grande",  "A+")}
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



// ── Datos mock de seguimiento ──────────────────────────────────────────
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
  "DP-2026-004820": {
    radicado: "DP-2026-004820", ciudadano: "Carlos Pérez", canal: "Correo", fecha: "14/06/2026",
    urgencia: "media", categoria: "Salud", profesional: "Luis Morales", especialidad: "Salud",
    estado_actual: "En gestión por profesional", clasificacion_ia: true,
    hitos: [
      { lbl: "Recibida",    fecha: "14/06 07:15", actor: "c",  actorLbl: "Usted",       desc: "Petición recibida por correo.", done: true },
      { lbl: "Priorizada",  fecha: "14/06 07:15", actor: "ia", actorLbl: "Sistema IA",  desc: "Clasificada como urgencia media.", done: true },
      { lbl: "Asignada",    fecha: "14/06 07:15", actor: "ia", actorLbl: "Sistema IA",  desc: "Asignada a profesional de salud.", done: true },
      { lbl: "En revisión", fecha: "14/06 08:00", actor: "f",  actorLbl: "Profesional", desc: "Profesional revisó el borrador.", done: true },
      { lbl: "Respuesta",   fecha: "En proceso",  actor: "f",  actorLbl: "Profesional", desc: "Respuesta en preparación.", done: true, now: true },
      { lbl: "Cerrada",     fecha: "—",           actor: "f",  actorLbl: "Profesional", desc: "Pendiente.", done: false },
    ],
    eventos: [
      { titulo: "Petición recibida",       fecha: "14/06 07:15", actor: "c",  desc: "Su petición fue registrada." },
      { titulo: "Clasificación automática",fecha: "14/06 07:15", actor: "ia", desc: "Urgencia media — salud. Sin indicadores de riesgo vital." },
      { titulo: "Asignación",              fecha: "14/06 07:15", actor: "ia", desc: "Asignada a Luis Morales, especialista en salud." },
      { titulo: "Revisión completada",     fecha: "14/06 08:00", actor: "f",  desc: "El profesional revisó el caso y está preparando la respuesta." },
    ],
  },
};

// ── Constantes ─────────────────────────────────────────────────────────
const PASOS = ["Datos personales", "Caracterización", "Su situación", "Confirmar", "Radicado"];
const ETNIAS = [["indigena","Pueblo indígena"],["afro","Afrodescendiente"],["raizal","Raizal"],["rom","Pueblo Rom"],["palenquero","Palenquero"],["ninguna","No aplica"]];
const HECHOS = ["Desplazamiento forzado","Homicidio / masacre de familiar","Desaparición forzada","Secuestro","Minas antipersona","Violencia sexual","Reclutamiento forzado","Tortura","Confinamiento","Amenazas","Otro"];
const GRUPOS = [["migrante","Migrante o apátrida"],["vbg","Víctima de VBG"],["lgbtiq","Persona LGBTIQ+"],["privado_libertad","Privado/a de la libertad"],["desplazado","Persona desplazada"],["habitante_calle","Habitante de calle"],["refugiado","Persona refugiada"],["defensora","Defensor/a de DDHH"]];

const URG = {
  critica: { lbl: "CRÍTICA", color: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5" },
  alta:    { lbl: "ALTA",    color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" },
  media:   { lbl: "MEDIA",   color: "#1E40AF", bg: "#DBEAFE", border: "#93C5FD" },
  baja:    { lbl: "BAJA",    color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
};

const ACTOR_COLOR = { c: "#1A3D6B", f: "#059669", ia: "#7C3AED" };
const ACTOR_BG    = { c: "#EFF6FF", f: "#ECFDF5", ia: "#F5F3FF" };
const ACTOR_LBL   = { c: "Usted", f: "Funcionario/a", ia: "Sistema IA" };

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
  hdr:     { background: "#1A3D6B", borderRadius: "0 0 12px 12px", marginBottom: 18, overflow: "hidden" },
  hdrTop:  { padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoWrap:{ display: "flex", alignItems: "center", gap: 12 },
  gov:     { fontSize: 9, color: "#93C5FD", letterSpacing: ".12em", textTransform: "uppercase" },
  h1:      { fontSize: 14, fontWeight: 600, color: "#fff", margin: "2px 0 1px" },
  slogan:  { fontSize: 10, color: "#BFDBFE", fontStyle: "italic" },
  emerg:   { textAlign: "right", fontSize: 10, color: "#93C5FD", lineHeight: 1.7 },
  card:    { background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "18px 20px" },
  tabs:    { display: "flex", borderBottom: "0.5px solid #E5E7EB", marginBottom: 18 },
  tab:     (a) => ({ padding: "9px 16px", fontSize: 12, border: "none", borderBottom: a ? "2px solid #1A3D6B" : "2px solid transparent", marginBottom: -1, background: "none", cursor: "pointer", color: a ? "#1A3D6B" : "#6B7280", fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  flabel:  { display: "block", fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 500 },
  input:   { width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#111827" },
  grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  optBtn:  (sel) => ({ padding: "6px 12px", borderRadius: 20, border: sel ? "1.5px solid #2E75B6" : "1.5px solid #E5E7EB", background: sel ? "#EFF6FF" : "#fff", fontSize: 12, cursor: "pointer", color: sel ? "#1A3D6B" : "#374151", fontWeight: sel ? 600 : 400, fontFamily: "inherit" }),
  subcampo:{ background: "#F9FAFB", borderLeft: "3px solid #2E75B6", borderRadius: "0 6px 6px 0", padding: "10px 12px", marginTop: 6 },
  urgBanner:{ background: "#FEE2E2", border: "2px solid #EF4444", borderRadius: 8, padding: "12px 14px", marginBottom: 14 },
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
  modoBox: { background: "#F9FAFB", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 },
  groupTitle:{ fontSize: 11, fontWeight: 700, color: "#2E75B6", marginBottom: 10, paddingBottom: 5, borderBottom: "0.5px solid #E5E7EB" },
  ctag:    (c) => ({ display: "inline-block", fontSize: 10, padding: "3px 9px", borderRadius: 10, margin: "2px 3px 2px 0", fontWeight: 500, ...c }),
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
        <div style={s.emerg}>
          Emergencias: <strong style={{ color: "#fff" }}>123</strong><br />
          Línea gratuita: <strong style={{ color: "#fff" }}>01 8000 914 814</strong>
        </div>
      </div>
    </div>
  );
}

// ── Stepper ────────────────────────────────────────────────────────────
function Stepper({ paso }) {
  return (
    <div style={{ display: "flex", marginBottom: 20 }}>
      {PASOS.map((l, i) => {
        const n = i + 1;
        const st = n < paso ? "done" : n === paso ? "active" : "future";
        return (
          <div key={n} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: st === "done" ? "#22C55E" : st === "active" ? "#1A3D6B" : "#E5E7EB", color: st === "future" ? "#9CA3AF" : "#fff" }}>
              {n < paso ? "✓" : n}
            </div>
            <div style={{ fontSize: 9, color: n === paso ? "#1A3D6B" : "#9CA3AF", fontWeight: n === paso ? 600 : 400 }}>{l}</div>
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
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 4px #F59E0B20}60%{box-shadow:0 0 0 8px #F59E0B08}}`}</style>
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

              <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: resultado.urgencia === "critica" ? "#FEF9C3" : "#F9FAFB", border: `0.5px solid ${resultado.urgencia === "critica" ? "#FDE047" : "#E5E7EB"}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: resultado.urgencia === "critica" ? "#713F12" : "#111827", marginBottom: 4 }}>
                  {resultado.urgencia === "critica" ? "⚡ " : ""}{resultado.estado_actual}
                </p>
                <p style={{ fontSize: 11, color: resultado.urgencia === "critica" ? "#92400E" : "#6B7280", lineHeight: 1.6, margin: 0 }}>
                  {resultado.urgencia === "critica" ? "Un profesional especializado se comunicará dentro de las próximas 2 horas hábiles. Si está en peligro inmediato llame al 123." : `Profesional asignado/a: ${resultado.profesional} · Especialidad: ${resultado.especialidad}`}
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

// ── Portal de radicación (formulario 5 pasos) ──────────────────────────
function Portal() {
  const [paso, setPaso] = useState(1);
  const [urg, setUrg] = useState(false);
  const [rad] = useState("DP-2026-" + String(Math.floor(Math.random() * 9000) + 1000).padStart(6, "0"));
  const [d, setD] = useState({
    nombre: "", tipo_doc: "CC", cedula: "", correo: "", telefono: "",
    etario: null, etnia: null, etnia_cual: "",
    disc: null, tipo_disc: "",
    victima: null, hecho: "",
    grupos: new Set(),
    texto: "", entidad: ""
  });

  useEffect(() => {
    const palabras = ["amenaza", "matar", "desapareci", "violencia", "tortura", "riesgo", "peligro", "secuestr", "agred"];
    setUrg(palabras.some(p => d.texto.toLowerCase().includes(p)) || d.grupos.has("vbg") || d.grupos.has("desplazado") || ["nino", "nina", "adolescente"].includes(d.etario));
  }, [d.texto, d.etario, d.grupos]);

  const upd = (k, v) => setD(prev => ({ ...prev, [k]: v }));
  const toggleGrupo = g => setD(prev => { const s = new Set(prev.grupos); s.has(g) ? s.delete(g) : s.add(g); return { ...prev, grupos: s }; });

  const Opt = ({ campo, val, label }) => (
    <button style={s.optBtn(d[campo] === val)} onClick={() => upd(campo, val)}>{label}</button>
  );

  const GrupoOpt = ({ val, label }) => (
    <button style={s.optBtn(d.grupos.has(val))} onClick={() => toggleGrupo(val)}>{label}</button>
  );

  const Nav = ({ disabled }) => paso < 5 && (
    <div style={s.nav}>
      <button style={s.btnG} onClick={() => paso > 1 ? setPaso(p => p - 1) : null}>{paso === 1 ? "Cancelar" : "← Anterior"}</button>
      <button style={{ ...s.btnP, opacity: disabled ? .45 : 1, cursor: disabled ? "not-allowed" : "pointer" }} disabled={disabled} onClick={() => setPaso(p => p + 1)}>
        {paso === 4 ? "Radicar petición ✓" : "Siguiente →"}
      </button>
    </div>
  );

  const etarioLbls = { nino: "Niño (0–8)", nina: "Niña (0–8)", adolescente: "Adolescente (9–17)", adulto: "Adulto (18–59)", adulto_mayor: "Persona mayor (60+)" };
  const etniaLbls = { indigena: "Pueblo indígena", afro: "Afrodescendiente", raizal: "Raizal", rom: "Pueblo Rom", palenquero: "Palenquero", ninguna: "No aplica" };
  const grupoLbls = { migrante: "Migrante", vbg: "VBG", lgbtiq: "LGBTIQ+", privado_libertad: "Privado de libertad", desplazado: "Desplazado", habitante_calle: "Habitante de calle", refugiado: "Refugiado", defensora: "Defensor/a DDHH" };

  return (
    <div>
      <Stepper paso={paso} />

      {urg && paso === 3 && (
        <div style={s.urgBanner}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", margin: "0 0 3px" }}>🚨 Su caso ha sido identificado como urgente</p>
          <p style={{ fontSize: 11, color: "#7F1D1D", margin: 0 }}>Un profesional revisará su petición de forma prioritaria. Si está en peligro inmediato llame al <strong>123</strong>.</p>
        </div>
      )}

      {paso === 1 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 14 }}>Sus datos de contacto</p>
          <div style={s.modoBox}>
            <span style={{ fontSize: 20 }}>🎙️</span>
            <p style={{ fontSize: 11, color: "#6B7280", flex: 1, margin: 0 }}>¿Prefiere que le hagamos las preguntas una a una con letra grande y voz?</p>
            <button style={{ ...s.btnSm, color: "#1A3D6B", borderColor: "#BFDBFE" }}>Modo asistido</button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={s.flabel}>Nombre y apellidos completos *</label>
            <input style={s.input} value={d.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="Nombre completo" />
          </div>
          <div style={{ ...s.grid2, marginBottom: 10 }}>
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
          <div style={{ ...s.grid2, marginBottom: 4 }}>
            <div><label style={s.flabel}>Teléfono</label><input style={s.input} value={d.telefono} onChange={e => upd("telefono", e.target.value)} placeholder="Celular o fijo" /></div>
            <div><label style={s.flabel}>Correo electrónico</label><input style={s.input} type="email" value={d.correo} onChange={e => upd("correo", e.target.value)} placeholder="Para notificaciones" /></div>
          </div>
          <Nav disabled={!d.nombre || !d.cedula} />
        </div>
      )}

      {paso === 2 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>Caracterización del peticionario</p>
          <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>Esta información permite priorizar su atención y garantizar sus derechos como sujeto de especial protección. Todos los campos son opcionales.</p>

          <div style={{ marginBottom: 16 }}>
            <div style={s.groupTitle}>👤 ¿A qué grupo etario pertenece?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[["nino","Niño (0–8)"],["nina","Niña (0–8)"],["adolescente","Adolescente (9–17)"],["adulto","Adulto (18–59)"],["adulto_mayor","Persona mayor (60+)"]].map(([v,l]) => <Opt key={v} campo="etario" val={v} label={l} />)}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={s.groupTitle}>🌿 ¿Tiene pertenencia étnica?</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {ETNIAS.map(([v,l]) => <Opt key={v} campo="etnia" val={v} label={l} />)}
            </div>
            {d.etnia && d.etnia !== "ninguna" && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿A cuál pueblo, comunidad o resguardo pertenece?</label>
                <input style={s.input} value={d.etnia_cual} onChange={e => upd("etnia_cual", e.target.value)} placeholder="Nombre del pueblo o resguardo" />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={s.groupTitle}>♿ ¿Tiene alguna condición de discapacidad?</div>
            <div style={{ display: "flex", gap: 7 }}>
              <Opt campo="disc" val="si" label="Sí" />
              <Opt campo="disc" val="no" label="No" />
            </div>
            {d.disc === "si" && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿Qué tipo de discapacidad?</label>
                <select style={s.input} value={d.tipo_disc} onChange={e => upd("tipo_disc", e.target.value)}>
                  <option value="">Seleccione...</option>
                  {["Física / motora","Visual","Auditiva","Cognitiva / intelectual","Psicosocial / mental","Múltiple","Otra"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={s.groupTitle}>🕊️ ¿Ha sido víctima del conflicto armado?</div>
            <div style={{ display: "flex", gap: 7 }}>
              <Opt campo="victima" val="si" label="Sí" />
              <Opt campo="victima" val="no" label="No" />
            </div>
            {d.victima === "si" && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿Cuál fue el hecho victimizante principal?</label>
                <select style={s.input} value={d.hecho} onChange={e => upd("hecho", e.target.value)}>
                  <option value="">Seleccione...</option>
                  {HECHOS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={s.groupTitle}>🛡️ ¿Pertenece a algún grupo de especial protección? <span style={{ fontSize: 10, fontWeight: 400, color: "#9CA3AF" }}>(puede marcar varios)</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {GRUPOS.map(([v,l]) => <GrupoOpt key={v} val={v} label={l} />)}
            </div>
          </div>
          <Nav />
        </div>
      )}

      {paso === 3 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>Cuéntenos su situación</p>
          <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 12, lineHeight: 1.6 }}>Describa con sus propias palabras qué pasó, qué entidad está involucrada y qué necesita de la Defensoría.</p>
          <div style={{ marginBottom: 12 }}>
            <textarea style={{ ...s.input, minHeight: 120, resize: "vertical" }} value={d.texto} onChange={e => upd("texto", e.target.value)} placeholder="Ejemplo: 'Mi EPS me negó la cirugía que el médico ordenó hace 3 meses...'" />
            <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{d.texto.length} caracteres</p>
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={s.flabel}>¿Contra qué entidad o persona dirige su petición? (opcional)</label>
            <input style={s.input} value={d.entidad} onChange={e => upd("entidad", e.target.value)} placeholder="Nombre de la entidad o persona" />
          </div>
          <Nav disabled={d.texto.length < 10} />
        </div>
      )}

      {paso === 4 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1A3D6B", marginBottom: 14 }}>Confirme su petición</p>
          <div style={s.resumen}>
            {[
              ["Nombre", d.nombre || "(no indicado)"],
              ["Documento", `${d.tipo_doc} ${d.cedula}`],
              ["Contacto", d.correo || d.telefono || "(no indicado)"],
              ["Grupo etario", etarioLbls[d.etario] || "No indicado"],
              ["Pertenencia étnica", d.etnia ? (etniaLbls[d.etnia] + (d.etnia_cual ? ` — ${d.etnia_cual}` : "")) : "No indicado"],
              ["Discapacidad", d.disc === "si" ? `Sí${d.tipo_disc ? ` — ${d.tipo_disc}` : ""}` : d.disc === "no" ? "No" : "No indicado"],
              ["Víctima del conflicto", d.victima === "si" ? `Sí${d.hecho ? ` — ${d.hecho}` : ""}` : d.victima === "no" ? "No" : "No indicado"],
            ].map(([l, v]) => (
              <div key={l} style={s.resRow}><span style={s.resLbl}>{l}:</span><span style={s.resVal}>{v}</span></div>
            ))}
            {d.grupos.size > 0 && (
              <div style={s.resRow}>
                <span style={s.resLbl}>Grupos especiales:</span>
                <span style={s.resVal}>{[...d.grupos].map(g => <span key={g} style={s.tag}>{grupoLbls[g] || g}</span>)}</span>
              </div>
            )}
            {d.texto && (
              <div style={{ ...s.resRow, marginTop: 8, paddingTop: 8, borderTop: "0.5px solid #E5E7EB" }}>
                <span style={s.resLbl}>Relato:</span>
                <span style={s.resVal}>{d.texto.slice(0, 200)}{d.texto.length > 200 ? "..." : ""}</span>
              </div>
            )}
          </div>
          <div style={s.infoLegal}>
            <p style={{ fontSize: 10, color: "#1E40AF", lineHeight: 1.6, margin: "0 0 5px" }}><strong>Tratamiento de datos (Ley 1581/2012):</strong> Sus datos se usan exclusivamente para la atención de su petición. Los datos de caracterización son sensibles y están protegidos por ley.</p>
            <p style={{ fontSize: 10, color: "#1E40AF", lineHeight: 1.6, margin: 0 }}><strong>Debido proceso (Art. 29 CP):</strong> Si el sistema IA asigna una prioridad automática a su caso, puede impugnarla ante el profesional designado dentro de los 5 días hábiles siguientes.</p>
          </div>
          <Nav />
        </div>
      )}

      {paso === 5 && (
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
            {d.correo ? <>Recibirá confirmación en <strong>{d.correo}</strong>.</> : "Registre un correo para recibir notificaciones."}
          </p>
          <p style={{ fontSize: 10, color: "#9CA3AF", lineHeight: 1.7 }}>
            Seguimiento: <strong>01 8000 914 814</strong><br />
            Emergencias: <strong>123</strong><br />
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
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 4px #F59E0B20}60%{box-shadow:0 0 0 8px #F59E0B08}}`}</style>
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
    </div>
  );
}
