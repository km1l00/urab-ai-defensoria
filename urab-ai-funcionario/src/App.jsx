import { useState, useEffect } from "react";

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
      <style>{`.urab-ac{filter:invert(1) hue-rotate(180deg)}.urab-ac img,.urab-ac svg{filter:invert(1) hue-rotate(180deg)}`}</style>
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
            {[["A−","Letra más pequeña","Hace el texto más pequeño."],["A+","Letra más grande","Hace el texto más grande. Útil en pantallas pequeñas."],["Rest.","Restablecer","Vuelve al tamaño normal."],["🌓","Alto contraste","Cambia los colores para facilitar la lectura."]].map(([ico,titulo,desc])=>(
              <div key={titulo} style={{ display:"flex", gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:"#1A3D6B", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{ico}</div>
                <div><p style={{ fontSize:12, fontWeight:600, color:"#92400E", margin:"0 0 2px" }}>{titulo}</p><p style={{ fontSize:11, color:"#78350F", margin:0, lineHeight:1.5 }}>{desc}</p></div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:10, color:"#92400E", textAlign:"center", marginTop:10, paddingTop:8, borderTop:"1px solid #FCD34D" }}>Su preferencia se guarda automáticamente.</p>
        </div>
      )}
    </>
  );
}



// ── Datos mock ─────────────────────────────────────────────────────────
const CASOS = [
  {
    radicado: "DP-2026-004821", ciudadano: "María García", cedula: "52.847.193",
    canal: "Web", fecha: "14/06 08:42", urgencia: "critica", categoria: "VBG", confianza: 94,
    hitl: true,
    hitl_razon: "Regla hard-coded: NNA detectado + amenaza vital | Doble revisión requerida (Sprint C1)",
    explicacion: "El relato describe amenazas de muerte reiteradas con menores de edad en el hogar. La presencia de NNA activa prioridad máxima automáticamente, independiente del clasificador.",
    prof: "Ana Torres (P01)", esp: "VBG · NNA",
    razon: "perfil VBG + NNA coincidente | carga 847 casos (bajo umbral 1.200) | peticionaria sin radicados previos",
    caract: { etario: "Adulta (18–59)", etnia: null, disc: null, victima: null, grupos: ["VBG", "NNA en el hogar"] },
    borrador: "Señora María García:\n\nLa Defensoría del Pueblo ha recibido su petición DP-2026-004821 el 14 de junio de 2026, con PRIORIDAD CRÍTICA.\n\nSu caso ha sido asignado a la profesional Ana Torres, especialista en VBG y NNA, quien se comunicará dentro de las próximas 2 horas hábiles.\n\nSi está en peligro inmediato llame al 123 o al 01 8000 914 814.\n\nFuentes RAG: Ley 1257/2008 · Decreto 1729/2008 · Ruta de atención VBG URAB\n\n[El profesional debe verificar la competencia institucional y complementar con el plan de acción]",
    fuentes: ["Ley 1257/2008 - Violencia basada en género", "Ruta de atención VBG URAB", "Decreto 1729/2008"],
    estado: "Pendiente HITL", dup: null,
    hitos: [
      { lbl: "Recepción",        ts: "08:42", actor: "c",  actorLbl: "Ciudadana",   desc: "Radicación canal web · datos y caracterización capturados", done: true },
      { lbl: "Triage IA",        ts: "08:42", actor: "ia", actorLbl: "M2 IA",       desc: "Urgencia CRÍTICA · VBG · confianza 94% · HITL activado", done: true },
      { lbl: "Reparto M3",       ts: "08:42", actor: "ia", actorLbl: "M3 IA",       desc: "Asignado a Ana Torres por perfil VBG + NNA", done: true },
      { lbl: "Revisión HITL",    ts: "Pendiente", actor: "f", actorLbl: "Funcionaria", desc: "Funcionaria debe revisar y aprobar borrador M6", done: false, now: true },
      { lbl: "Respuesta",        ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Envío de respuesta al ciudadano", done: false },
      { lbl: "Cierre M7-C",      ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Cierre coordinado IRIS + VisionWeb + hash SHA-256", done: false },
    ],
  },
  {
    radicado: "DP-2026-004820", ciudadano: "Carlos Pérez", cedula: "80.123.456",
    canal: "Correo", fecha: "14/06 07:15", urgencia: "media", categoria: "Salud", confianza: 88,
    hitl: false, hitl_razon: "",
    explicacion: "Petición sobre negación de servicios de salud por EPS Sanitas. Sin indicadores de riesgo vital inmediato.",
    prof: "Luis Morales (P02)", esp: "Salud · General",
    razon: "perfil Salud coincidente | carga mínima disponible: 1.103 casos | sin radicados previos",
    caract: { etario: "Adulto (18–59)", etnia: null, disc: null, victima: null, grupos: [] },
    borrador: "Señor Carlos Pérez:\n\nLa Defensoría ha radicado su petición DP-2026-004820 relacionada con la presunta negación de servicios de salud...\n\n[Completar con detalles del caso específico]",
    fuentes: ["Ley 1751/2015 - Derecho fundamental a la salud"],
    estado: "En gestión", dup: null,
    hitos: [
      { lbl: "Recepción",    ts: "07:15", actor: "c",  actorLbl: "Ciudadano",  desc: "Radicación canal correo", done: true },
      { lbl: "Triage IA",    ts: "07:15", actor: "ia", actorLbl: "M2 IA",      desc: "Urgencia MEDIA · Salud · confianza 88%", done: true },
      { lbl: "Reparto M3",   ts: "07:15", actor: "ia", actorLbl: "M3 IA",      desc: "Asignado a Luis Morales por perfil Salud", done: true },
      { lbl: "Sin HITL",     ts: "07:15", actor: "ia", actorLbl: "Automático", desc: "Clasificación automática aprobada — sin HITL requerido", done: true },
      { lbl: "Respuesta",    ts: "Pendiente", actor: "f", actorLbl: "Funcionario", desc: "Borrador M6 disponible para revisión", done: false, now: true },
      { lbl: "Cierre M7-C",  ts: "—",     actor: "f",  actorLbl: "Funcionario", desc: "Pendiente", done: false },
    ],
  },
  {
    radicado: "DP-2026-004819", ciudadano: "Rosa Martínez", cedula: "41.987.654",
    canal: "Presencial", fecha: "13/06 16:30", urgencia: "alta", categoria: "Desaparición", confianza: 91,
    hitl: true, hitl_razon: "Urgencia alta: desaparición de familiar | HITL obligatorio por categoría",
    explicacion: "Ciudadana reporta desaparición de su hijo adulto hace 72 horas. Hash cadena custodia: SHA256:a3f8b2c1... (M1 presencial). Entidades: Fiscalía y SIJÍN.",
    prof: "Clara Ruiz (P03)", esp: "Desaparición · Conflicto",
    razon: "perfil Desaparición coincidente | carga mínima: 612 casos | sin radicados previos",
    caract: { etario: "Adulta (18–59)", etnia: "Afrodescendiente", disc: null, victima: "Desplazamiento forzado", grupos: ["Desplazada"] },
    borrador: "Señora Rosa Martínez:\n\nLa Defensoría ha radicado su denuncia DP-2026-004819...\n\n[Coordinar con Fiscalía y SIJÍN antes de completar]",
    fuentes: ["Protocolo desaparición URAB", "Ley 1448/2011"],
    estado: "Pendiente HITL", dup: null,
    hitos: [
      { lbl: "Recepción",     ts: "16:30", actor: "c",  actorLbl: "Ciudadana",   desc: "Radicación presencial · hash custodia SHA-256:a3f8b2c1...", done: true },
      { lbl: "Triage IA",     ts: "16:31", actor: "ia", actorLbl: "M2 IA",       desc: "Urgencia ALTA · Desaparición · confianza 91% · HITL", done: true },
      { lbl: "Reparto M3",    ts: "16:31", actor: "ia", actorLbl: "M3 IA",       desc: "Asignado a Clara Ruiz por perfil Desaparición", done: true },
      { lbl: "Revisión HITL", ts: "Pendiente", actor: "f", actorLbl: "Funcionaria", desc: "Revisión obligatoria — categoría desaparición", done: false, now: true },
      { lbl: "Respuesta",     ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Pendiente aprobación HITL", done: false },
      { lbl: "Cierre M7-C",   ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Pendiente", done: false },
    ],
  },
  {
    radicado: "DP-2026-004818", ciudadano: "Carlos Pérez", cedula: "80.123.456",
    canal: "Web", fecha: "13/06 09:00", urgencia: "media", categoria: "Salud", confianza: 82,
    hitl: true, hitl_razon: "M4: posible duplicado de DP-2026-004820 (similitud 89%) — funcionario debe aprobar acumulación",
    explicacion: "Misma situación de salud reportada el día anterior. M4 detectó similitud ≥85% con radicado existente del mismo ciudadano (cédula 80.123.456).",
    prof: "Luis Morales (P02)", esp: "Salud · General",
    razon: "continuidad con peticionario (radicado previo DP-2026-004820 con P02) | carga 1.103 casos",
    caract: { etario: "Adulto (18–59)", etnia: null, disc: null, victima: null, grupos: [] },
    borrador: "", fuentes: [], estado: "Pendiente HITL", dup: "DP-2026-004820",
    hitos: [
      { lbl: "Recepción",       ts: "09:00", actor: "c",  actorLbl: "Ciudadano",  desc: "Radicación canal web", done: true },
      { lbl: "Triage IA",       ts: "09:00", actor: "ia", actorLbl: "M2 IA",      desc: "Urgencia MEDIA · Salud · confianza 82%", done: true },
      { lbl: "Duplicado M4",    ts: "09:00", actor: "ia", actorLbl: "M4 IA",      desc: "Similitud 89% con DP-2026-004820 detectada", done: true },
      { lbl: "Acumulación",     ts: "Pendiente", actor: "f", actorLbl: "Funcionario", desc: "Aprobar acumulación o tramitar por separado", done: false, now: true },
      { lbl: "Respuesta",       ts: "—",     actor: "f",  actorLbl: "Funcionario", desc: "Pendiente decisión", done: false },
      { lbl: "Cierre M7-C",     ts: "—",     actor: "f",  actorLbl: "Funcionario", desc: "Pendiente", done: false },
    ],
  },
];

const METRICAS = {
  tri_a: 9.1, tri_t: 1.4, urg_a: 56.2, urg_t: 4.5,
  dr_a: 72.6, dr_t: 5.0, rc_a: 7.7, rc_t: 2.1,
  horas: 13320, fte: 6.4, ua: 7600, prec: 92.3, rec: 100, dup: 91, n: 20417,
};

// ── Constantes de color ────────────────────────────────────────────────
const URG = {
  critica: { lbl: "CRÍTICA", color: "#991B1B", bg: "#FEE2E2", border: "#FCA5A5" },
  alta:    { lbl: "ALTA",    color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" },
  media:   { lbl: "MEDIA",   color: "#1E40AF", bg: "#DBEAFE", border: "#93C5FD" },
  baja:    { lbl: "BAJA",    color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
};
const ACTOR_COLOR = { c: "#1A3D6B", f: "#059669", ia: "#7C3AED" };
const ACTOR_BG    = { c: "#EFF6FF", f: "#ECFDF5", ia: "#F5F3FF" };

// ── Logo SVG Defensoría ────────────────────────────────────────────────
const LogoDefensoria = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 48, height: 48, flexShrink: 0 }}>
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

// ── Estilos ────────────────────────────────────────────────────────────
const s = {
  wrap:     { maxWidth: 860, margin: "0 auto", padding: "0 16px 40px", fontFamily: "'Inter',system-ui,sans-serif" },
  hdr:      { background: "#1A3D6B", borderRadius: "0 0 12px 12px", marginBottom: 20, overflow: "hidden" },
  hdrTop:   { padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoWrap: { display: "flex", alignItems: "center", gap: 14 },
  gov:      { fontSize: 9, color: "#93C5FD", letterSpacing: ".12em", textTransform: "uppercase" },
  h1:       { fontSize: 15, fontWeight: 600, color: "#fff", margin: "2px 0 1px" },
  slogan:   { fontSize: 10, color: "#BFDBFE", fontStyle: "italic" },
  hdrUser:  { textAlign: "right" },
  uname:    { fontSize: 12, fontWeight: 600, color: "#fff" },
  urole:    { fontSize: 10, color: "#93C5FD", marginTop: 2 },
  ucarga:   { fontSize: 10, color: "#BFDBFE", marginTop: 1 },
  hdrNav:   { display: "flex", borderTop: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.15)" },
  hn:       (a) => ({ padding: "10px 18px", fontSize: 12, color: a ? "#fff" : "rgba(255,255,255,.65)", background: a ? "rgba(255,255,255,.07)" : "none", border: "none", borderBottom: a ? "2px solid #60A5FA" : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }),
  card:     { background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 10, padding: "18px 20px" },
  badge:    (u) => ({ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: URG[u]?.bg || "#F3F4F6", color: URG[u]?.color || "#374151", border: `1px solid ${URG[u]?.border || "#E5E7EB"}` }),
  pill:     (extra = {}) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 9, background: "#F3F4F6", color: "#6B7280", border: "0.5px solid #E5E7EB", fontWeight: 500, ...extra }),
  btn:      (v = "ghost") => ({
    padding: "7px 15px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, border: "0.5px solid",
    ...(v === "primary" ? { background: "#1A3D6B", color: "#fff", borderColor: "#1A3D6B" } :
        v === "success" ? { background: "#059669", color: "#fff", borderColor: "#059669" } :
        v === "amber"   ? { background: "#FEF3C7", color: "#92400E", borderColor: "#FCD34D", fontWeight: 600 } :
                          { background: "#fff", color: "#374151", borderColor: "#E5E7EB" }),
  }),
  tab:      (a) => ({ padding: "7px 14px", fontSize: 12, border: "none", borderBottom: a ? "2px solid #1A3D6B" : "2px solid transparent", marginBottom: -1, background: "none", cursor: "pointer", color: a ? "#1A3D6B" : "#6B7280", fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  fb:       (a) => ({ padding: "4px 12px", borderRadius: 14, fontSize: 11, cursor: "pointer", border: "0.5px solid", background: a ? "#1A3D6B" : "#F3F4F6", color: a ? "#fff" : "#6B7280", borderColor: a ? "#1A3D6B" : "#E5E7EB", fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  kv:       { background: "#F9FAFB", borderRadius: 6, padding: "8px 11px" },
  kvL:      { fontSize: 9, color: "#9CA3AF", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".05em" },
  kvV:      { fontSize: 12, fontWeight: 500, color: "#111827" },
  xaiBox:   { background: "#EFF6FF", border: "0.5px solid #93C5FD", borderRadius: 8, padding: "10px 12px", marginBottom: 10 },
  xaiL:     { fontSize: 9, fontWeight: 700, color: "#1E40AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" },
  hitlBnr:  { background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 8, padding: "10px 13px", marginBottom: 12, display: "flex", gap: 9 },
  sello:    { background: "#FEF9C3", border: "1px solid #FDE047", borderRadius: 6, padding: "7px 11px", marginBottom: 9, fontSize: 10, fontWeight: 700, color: "#713F12", display: "flex", alignItems: "center", gap: 6 },
  razonBox: { background: "#F9FAFB", borderRadius: 7, padding: "9px 12px", marginBottom: 10 },
  razonL:   { fontSize: 9, color: "#9CA3AF", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 500 },
  ctag:     (c) => ({ display: "inline-block", fontSize: 10, padding: "3px 9px", borderRadius: 10, margin: "2px 3px 2px 0", fontWeight: 500, ...c }),
};

// ── Barra de hitos vertical (trazabilidad funcionario) ─────────────────
function BarraHitosVertical({ hitos }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: "#6B7280" }}>
        {[["#1A3D6B","Ciudadano/a"],["#7C3AED","Sistema IA"],["#059669","Funcionario/a"]].map(([c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }}></span> {l}
          </span>
        ))}
      </div>
      <div>
        {hitos.map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
            {i < hitos.length - 1 && (
              <div style={{ position: "absolute", left: 9, top: 20, bottom: -4, width: 2, background: h.done ? "#1A3D6B40" : "#E5E7EB" }} />
            )}
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: h.done ? ACTOR_COLOR[h.actor] : "#F3F4F6", border: h.done ? "none" : "2px solid #D1D5DB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: h.done ? "#fff" : "#9CA3AF", fontWeight: 700, flexShrink: 0, zIndex: 1, position: "relative", marginTop: 1 }}>
              {h.done ? "✓" : ""}
            </div>
            <div style={{ paddingBottom: 14, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: h.done ? 500 : 400, color: h.done ? "#111827" : "#9CA3AF" }}>{h.lbl}</span>
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: ACTOR_BG[h.actor], color: ACTOR_COLOR[h.actor], border: `0.5px solid ${ACTOR_COLOR[h.actor]}40`, fontWeight: 600 }}>{h.actorLbl}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{h.ts}</span>
              </div>
              <p style={{ fontSize: 11, color: h.done ? "#6B7280" : "#9CA3AF", margin: 0, lineHeight: 1.5 }}>{h.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Caracterzación tags ────────────────────────────────────────────────
function CaractTags({ caract }) {
  if (!caract) return null;
  const tags = [];
  if (caract.etario) tags.push(<span key="e" style={s.ctag({ background: "#F5F3FF", color: "#4C1D95", border: "1px solid #C4B5FD" })}>👤 {caract.etario}</span>);
  if (caract.etnia)  tags.push(<span key="n" style={s.ctag({ background: "#ECFDF5", color: "#065F46", border: "1px solid #6EE7B7" })}>🌿 {caract.etnia}</span>);
  if (caract.disc)   tags.push(<span key="d" style={s.ctag({ background: "#FFF7ED", color: "#9A3412", border: "1px solid #FDBA74" })}>♿ {caract.disc}</span>);
  if (caract.victima) tags.push(<span key="v" style={s.ctag({ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" })}>🕊️ {caract.victima}</span>);
  (caract.grupos || []).forEach((g, i) => tags.push(<span key={`g${i}`} style={s.ctag({ background: "#EFF6FF", color: "#1E40AF", border: "1px solid #93C5FD" })}>🛡️ {g}</span>));
  return tags.length ? <div>{tags}</div> : <span style={{ fontSize: 11, color: "#9CA3AF" }}>Sin caracterización adicional</span>;
}

// ── Métrica card dashboard ─────────────────────────────────────────────
function MetricCard({ label, asis, tobe, unidad, mejora }) {
  const pct = Math.round((tobe / asis) * 100);
  return (
    <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" }}>
      <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, fontWeight: 500 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 7 }}>
        <div><p style={{ fontSize: 9, color: "#EF4444", margin: 0 }}>AS-IS</p><p style={{ fontSize: 20, fontWeight: 500, color: "#EF4444", margin: 0 }}>{asis}{unidad}</p></div>
        <span style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 2 }}>→</span>
        <div><p style={{ fontSize: 9, color: "#059669", margin: 0 }}>TO-BE</p><p style={{ fontSize: 20, fontWeight: 500, color: "#059669", margin: 0 }}>{tobe}{unidad}</p></div>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#059669", marginBottom: 2 }}>{mejora}</span>
      </div>
      <div style={{ height: 5, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#059669", borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Dashboard M8 ───────────────────────────────────────────────────────
function DashboardM8() {
  const m = METRICAS;
  return (
    <div>
      <h3 style={{ fontSize: 13, color: "#1A3D6B", marginBottom: 3, fontWeight: 600 }}>Analítica operativa y de derechos · M8</h3>
      <p style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 14 }}>Corpus sintético N={m.n.toLocaleString()} · Piloto URAB 90 días · Datos declarados como sintéticos (LSL2026)</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <MetricCard label="Tiempo mediano de triage" asis={m.tri_a} tobe={m.tri_t} unidad="h" mejora="−85%" />
        <MetricCard label="Urgentes con triage tardío >8h" asis={m.urg_a} tobe={m.urg_t} unidad="%" mejora="−92%" />
        <MetricCard label="Doble registro IRIS / VisionWeb" asis={m.dr_a} tobe={m.dr_t} unidad="%" mejora="−93%" />
        <MetricCard label="Ratio carga máx / mín profesionales" asis={m.rc_a} tobe={m.rc_t} unidad="x" mejora="−73%" />
      </div>
      <div style={{ background: "#EFF6FF", border: "0.5px solid #93C5FD", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#1E40AF", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>ROI institucional — argumento central del pitch</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Horas/año liberadas", `${m.horas.toLocaleString()} h`, "#1A3D6B"],
            ["FTE equivalente", `${m.fte} FTE`, "#1A3D6B"],
            ["Urgentes adicionales atendidos/año", `+${m.ua.toLocaleString()}`, "#059669"],
            ["Horas redirigidas a gestión misional", "13.320 h", "#059669"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "#6B7280", marginBottom: 2, lineHeight: 1.4 }}>{l}</p>
              <p style={{ fontSize: 18, fontWeight: 500, color: c, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "#111827", marginBottom: 10 }}>Calidad del modelo M2 · Benchmark Claude Sonnet 4.6</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Precisión M2", `${m.prec}%`, "#1A3D6B"],
            ["HITL recall urgentes", `${m.rec}%`, "#059669"],
            ["Detección duplicados M4", `${m.dup}%`, "#1A3D6B"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2, lineHeight: 1.4 }}>{l}</p>
              <p style={{ fontSize: 18, fontWeight: 500, color: c, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#D1FAE5", border: "0.5px solid #6EE7B7", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#065F46", fontWeight: 500, marginTop: 8 }}>
          🟢 Drift: VERDE · Próxima evaluación: 14/07/2026
        </div>
        <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>HITL recall = 100% es la métrica no negociable · Haiku 4.5 fue descartado: clasificó amenaza vital como urgencia media</p>
      </div>
    </div>
  );
}

// ── Detalle de caso ────────────────────────────────────────────────────
function DetalleCaso({ caso, onVolver }) {
  const [tab, setTab] = useState("resumen");
  const [aprobado, setAprobado] = useState(false);
  const [acumulado, setAcumulado] = useState(false);
  const [borrador, setBorrador] = useState(caso.borrador);

  return (
    <div>
      <button style={{ fontSize: 11, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }} onClick={onVolver}>
        ← Volver a la bandeja
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <h3 style={{ fontSize: 14, color: "#1A3D6B", fontWeight: 600, margin: 0 }}>{caso.radicado}</h3>
        <span style={s.badge(caso.urgencia)}>{URG[caso.urgencia]?.lbl}</span>
        {caso.hitl && !aprobado && <span style={s.pill({ background: "#FEF9C3", color: "#713F12", borderColor: "#FDE047", fontWeight: 700 })}>⚠ HITL</span>}
        {aprobado && <span style={s.pill({ background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B7" })}>✓ Resuelto</span>}
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 11, color: "#6B7280" }}>
        <span><strong style={{ color: "#1A3D6B" }}>Peticionario/a:</strong> {caso.ciudadano} · {caso.cedula}</span>
        <span>|</span>
        <span><strong style={{ color: "#059669" }}>Profesional:</strong> {caso.prof}</span>
        <span>·</span>
        <span>{caso.canal} · {caso.fecha}</span>
      </div>

      {caso.hitl && !aprobado && (
        <div style={s.hitlBnr}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#713F12", margin: "0 0 3px" }}>
              {caso.dup ? "Posible duplicado — requiere decisión de acumulación" : "Revisión humana obligatoria (HITL)"}
            </p>
            <p style={{ fontSize: 11, color: "#92400E", margin: 0, lineHeight: 1.5 }}>
              {caso.hitl_razon}
              {caso.dup && <><br />Radicado similar: <strong>{caso.dup}</strong></>}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "0.5px solid #E5E7EB", marginBottom: 16 }}>
        {[["resumen","Resumen"],["trazabilidad","Trazabilidad"],["borrador","Borrador M6"]].map(([k,l]) => (
          <button key={k} style={s.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["Categoría", caso.categoria],["Confianza IA M2", `${caso.confianza}%`],["Profesional · Especialidad", `${caso.prof.split(" (")[0]} · ${caso.esp}`],["Estado", caso.estado]].map(([l,v]) => (
              <div key={l} style={s.kv}><p style={s.kvL}>{l}</p><p style={s.kvV}>{v}</p></div>
            ))}
          </div>
          <div style={{ background: "#F9FAFB", borderRadius: 7, padding: "10px 12px", marginBottom: 10 }}>
            <p style={{ ...s.kvL, margin: "0 0 6px" }}>Caracterización del peticionario</p>
            <CaractTags caract={caso.caract} />
          </div>
          <div style={s.xaiBox}>
            <p style={s.xaiL}>🧠 Explicación IA · XAI obligatorio (Directiva 007/2025)</p>
            <p style={{ fontSize: 11, color: "#1E40AF", margin: 0, lineHeight: 1.6 }}>{caso.explicacion}</p>
          </div>
          <div style={s.razonBox}>
            <p style={s.razonL}>Razón de asignación M3 — trazabilidad del "por qué"</p>
            <p style={{ fontSize: 11, color: "#111827", margin: 0, lineHeight: 1.5 }}>{caso.razon}</p>
          </div>
          {caso.dup && !acumulado && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={s.btn("amber")} onClick={() => setAcumulado(true)}>Aprobar acumulación con {caso.dup}</button>
              <button style={s.btn("ghost")}>Tramitar por separado</button>
            </div>
          )}
          {acumulado && <p style={{ fontSize: 12, color: "#059669", fontWeight: 500, marginTop: 8 }}>✓ Acumulación aprobada — expediente consolidado con {caso.dup}</p>}
        </div>
      )}

      {tab === "trazabilidad" && (
        <div>
          <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>
            Línea de tiempo completa del caso — actores y módulos M1–M8
          </p>
          <BarraHitosVertical hitos={caso.hitos} />
        </div>
      )}

      {tab === "borrador" && (
        caso.borrador ? (
          <div>
            <div style={s.sello}>⚠ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE</div>
            {caso.fuentes.length > 0 && (
              <div style={{ background: "#F9FAFB", borderRadius: 6, padding: "8px 12px", marginBottom: 9, fontSize: 11, color: "#6B7280" }}>
                <strong>Fuentes RAG:</strong> {caso.fuentes.join(" · ")}
              </div>
            )}
            <textarea value={borrador} onChange={e => setBorrador(e.target.value)}
              style={{ width: "100%", minHeight: 160, padding: "9px 11px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            <p style={{ fontSize: 10, color: "#9CA3AF", margin: "4px 0 10px" }}>
              Al aprobar, su firma certifica revisión independiente del contenido jurídico (Ley 734/2002 · Art. 29 CP · Sprint C1)
            </p>
            {!aprobado ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btn("success")} onClick={() => setAprobado(true)}>✓ Aprobar y enviar al ciudadano</button>
                <button style={s.btn("ghost")}>Guardar borrador</button>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>✓ Respuesta aprobada — bitácora de ediciones y hash SHA-256 registrados</p>
            )}
          </div>
        ) : (
          <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 22, textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
            Sin borrador — caso pendiente de decisión de acumulación M4.<br />Resuelva primero en la pestaña Resumen.
          </div>
        )
      )}
    </div>
  );
}

// ── Bandeja ────────────────────────────────────────────────────────────
function Bandeja({ onSeleccionar }) {
  const [filtro, setFiltro] = useState("todos");
  const lista = filtro === "hitl" ? CASOS.filter(c => c.hitl)
              : filtro === "critica" ? CASOS.filter(c => c.urgencia === "critica")
              : CASOS;
  const nhitl = CASOS.filter(c => c.hitl).length;

  // Mini barra de hitos para la bandeja
  const MiniHitos = ({ hitos }) => {
    const done = hitos.filter(h => h.done).length;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
        {hitos.map((h, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: h.done ? ACTOR_COLOR[h.actor] : "#E5E7EB", border: h.done ? "none" : "1.5px solid #D1D5DB", display: "inline-block" }} title={h.lbl} />
            {i < hitos.length - 1 && <span style={{ width: 12, height: 1.5, background: h.done ? "#1A3D6B40" : "#E5E7EB", display: "inline-block" }} />}
          </span>
        ))}
        <span style={{ fontSize: 9, color: "#9CA3AF", marginLeft: 4 }}>{done}/{hitos.length} hitos</span>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["todos",`Todos (${CASOS.length})`],["hitl",`⚠ HITL (${nhitl})`],["critica","Críticos"]].map(([k,l]) => (
          <button key={k} style={s.fb(filtro === k)} onClick={() => setFiltro(k)}>{l}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{nhitl} casos requieren revisión HITL inmediata</span>
      </div>
      {lista.map(c => (
        <div key={c.radicado}
          onClick={() => onSeleccionar(c)}
          style={{ border: `0.5px solid ${c.hitl ? "#FCD34D" : "#E5E7EB"}`, borderRadius: 8, padding: "11px 14px", cursor: "pointer", marginBottom: 8, background: c.hitl ? "#FFFBEB" : "#fff" }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1A3D6B" }}>{c.radicado}</span>
            <span style={s.badge(c.urgencia)}>{URG[c.urgencia]?.lbl}</span>
            <span style={s.pill()}>{c.categoria}</span>
            {c.hitl && <span style={s.pill({ background: "#FEF9C3", color: "#713F12", borderColor: "#FDE047", fontWeight: 700 })}>⚠ HITL</span>}
            {c.dup && <span style={s.pill({ background: "#EDE9FE", color: "#4C1D95", borderColor: "#C4B5FD" })}>DUPLICADO</span>}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{c.fecha}</span>
          </div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>
            <span style={{ color: "#1A3D6B", fontWeight: 500 }}>{c.ciudadano}</span> · Peticionario/a &nbsp;|&nbsp;
            <span style={{ color: "#059669", fontWeight: 500 }}>{c.prof.split(" (")[0]}</span> · Profesional
          </div>
          {c.hitl && <p style={{ fontSize: 10, color: "#92400E", margin: "3px 0 0", fontStyle: "italic" }}>{c.hitl_razon.slice(0, 110)}...</p>}
          <MiniHitos hitos={c.hitos} />
        </div>
      ))}
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────
export default function App() {
  const [seccion, setSeccion] = useState("bandeja");
  const [casoAbierto, setCasoAbierto] = useState(null);

  return (
    <div style={s.wrap}>
      {/* Header institucional */}
      <div style={s.hdr}>
        <div style={s.hdrTop}>
          <div style={s.logoWrap}>
            <LogoDefensoria />
            <div>
              <div style={s.gov}>GOV.CO · República de Colombia</div>
              <div style={s.h1}>Defensoría del Pueblo</div>
              <div style={s.slogan}>Nos unen tus derechos · URAB-AI · Panel de profesionales</div>
            </div>
          </div>
          <div style={s.hdrUser}>
            <div style={s.uname}>Ana Torres</div>
            <div style={s.urole}>Profesional de trámite · P01</div>
            <div style={s.ucarga}>VBG · NNA · Carga: 847 casos activos</div>
          </div>
        </div>
        <div style={s.hdrNav}>
          <button style={s.hn(seccion === "bandeja")} onClick={() => { setSeccion("bandeja"); setCasoAbierto(null); }}>
            📋 Bandeja de casos
          </button>
          <button style={s.hn(seccion === "dashboard")} onClick={() => setSeccion("dashboard")}>
            📊 Dashboard M8
          </button>
        </div>
      </div>
      <AccesibilidadBar />

      <div style={s.card}>
        {seccion === "bandeja" && !casoAbierto && <Bandeja onSeleccionar={setCasoAbierto} />}
        {seccion === "bandeja" && casoAbierto && <DetalleCaso caso={casoAbierto} onVolver={() => setCasoAbierto(null)} />}
        {seccion === "dashboard" && <DashboardM8 />}
      </div>

      <p style={{ textAlign: "center", fontSize: 10, color: "#9CA3AF", marginTop: 12 }}>
        Defensoría del Pueblo de Colombia · Directiva 007/2025 · CONPES 4144 · Ley 1581/2012 · NIST AI RMF · ISO/IEC 42001
      </p>
    </div>
  );
}
