import { useState, useRef, useEffect } from "react";

// ── Backend API ────────────────────────────────────────────────────────
const API_URL = "https://urab-ai-api.onrender.com";

// Mapea un caso de la API al formato que espera el render de la bandeja
function mapearCasoAPI(c) {
  const urgLbls = { critica: "CRÍTICA", alta: "ALTA", media: "MEDIA", baja: "BAJA" };
  return {
    radicado: c.radicado,
    ciudadano: c.ciudadano,
    cedula: c.cedula,
    canal: c.canal,
    fecha: c.fecha,
    urgencia: c.urgencia,
    categoria: c.categoria,
    confianza: c.confianza_ia,
    hitl: c.requiere_hitl && !c.hitl_resuelto,
    hitl_razon: c.hitl_razon || "",
    explicacion: c.explicacion_ia || "",
    prof: `${c.profesional} (${c.profesional_id})`,
    esp: c.categoria,
    razon: `Asignado por especialidad en ${c.categoria}`,
    caract: {
      etario: c.etario, etnia: c.etnia, disc: c.discapacidad,
      victima: c.victima_conflicto, grupos: c.grupos_especiales || []
    },
    borrador: `Señor(a) ${c.ciudadano}:\n\nLa Defensoría del Pueblo ha recibido su petición ${c.radicado}.\n\n[Borrador generado por M6 — el profesional debe revisar, complementar y aprobar antes de enviar.]`,
    fuentes: ["Corpus normativo institucional (RAG)"],
    entidades: c.entidades || [],
    estado: c.estado,
    dup: c.es_duplicado ? c.duplicado_de : null,
    tipo_peticion: c.tipo_peticion,
    tipo_confirmado_hitl: c.tipo_confirmado_hitl,
    derechos_vulnerados: c.derechos_vulnerados || [],
    conducta_vulnera: c.conducta_vulnera,
    gestiones: c.gestiones || [],
    gestiones_confirmadas: c.gestiones_confirmadas,
    tipo_recepcion: c.tipo_recepcion,
    procedimiento_recepcion: c.procedimiento_recepcion,
    caso_cerrado: c.caso_cerrado,
    observaciones_coord: c.observaciones_coord || [],
    esNuevo: true,
    hitos: [
      { lbl: "Recepción", ts: c.fecha, actor: "c", actorLbl: "Ciudadano/a", desc: `Radicación canal ${c.canal}`, done: true },
      { lbl: "Triage IA", ts: c.fecha, actor: "ia", actorLbl: "M2 IA", desc: `Urgencia ${urgLbls[c.urgencia]||c.urgencia} · ${c.categoria} · confianza ${c.confianza_ia}%`, done: true },
      { lbl: "Reparto M3", ts: c.fecha, actor: "ia", actorLbl: "M3 IA", desc: `Asignado a ${c.profesional}`, done: true },
      { lbl: "Revisión HITL", ts: c.requiere_hitl ? "Pendiente" : "—", actor: "f", actorLbl: "Funcionario/a", desc: "Revisar y aprobar borrador M6", done: c.hitl_resuelto, now: c.requiere_hitl && !c.hitl_resuelto },
      { lbl: "Respuesta", ts: "—", actor: "f", actorLbl: "Funcionario/a", desc: "Envío de respuesta al ciudadano", done: false },
      { lbl: "Cierre M7-C", ts: "—", actor: "f", actorLbl: "Funcionario/a", desc: "Cierre coordinado IRIS + VisionWeb", done: false },
    ],
  };
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
    borrador: "Señora María García:\n\nLa Defensoría del Pueblo ha recibido su petición DP-2026-004821 el 14 de junio de 2026, con PRIORIDAD CRÍTICA.\n\nSu caso ha sido asignado a la profesional Ana Torres, especialista en VBG y NNA, quien se comunicará dentro de las próximas 2 horas hábiles.\n\nFuentes RAG: Ley 1257/2008 · Decreto 1729/2008 · Ruta de atención VBG URAB\n\n[El profesional debe verificar la competencia institucional y complementar con el plan de acción]",
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
    explicacion: "Ciudadana reporta desaparición de su hijo adulto hace 72 horas. Hash cadena custodia: SHA256:a3f8b2c1... Entidades: Fiscalía y SIJÍN.",
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
  input:    { width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" },
  flabel:   { display: "block", fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 500 },
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

// ── OBSERVACIÓN 6: Radicar petición directamente por archivo ───────────
function RadicarPorArchivo() {
  const [canal, setCanal] = useState("correo");
  const [archivo, setArchivo] = useState(null);
  const [extrayendo, setExtrayendo] = useState(false);
  const [extraido, setExtraido] = useState(false);
  const [nombreManual, setNombreManual] = useState("");
  const [cedulaManual, setCedulaManual] = useState("");
  const [fechaManual, setFechaManual] = useState("");
  const [radicado, setRadicado] = useState(false);
  const inputRef = useRef(null);

  const simularSubida = (nombre) => {
    setArchivo({ nombre, tipo: nombre.match(/\.pdf$/i) ? "PDF" : nombre.match(/\.(jpg|jpeg|png)$/i) ? "IMG" : "DOC" });
    setExtrayendo(true);
    setExtraido(false);
    setTimeout(() => { setExtrayendo(false); setExtraido(true); }, 1300);
  };

  const handleFiles = (files) => { if (files[0]) simularSubida(files[0].name); };

  const CANALES = [
    { id: "correo", lbl: "📧 Correo electrónico" },
    { id: "fisico", lbl: "📦 Correspondencia física (4-72)" },
    { id: "terreno", lbl: "🏛️ Recolectada en terreno" },
  ];

  if (radicado) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <h3 style={{ fontSize: 15, color: "#1A3D6B", marginBottom: 6 }}>Petición radicada y enviada a M2</h3>
        <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>El caso ahora aparece en la bandeja para clasificación automática.</p>
        <button style={s.btn("primary")} onClick={() => { setRadicado(false); setArchivo(null); setExtraido(false); setNombreManual(""); setCedulaManual(""); setFechaManual(""); }}>Radicar otra petición</button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>Radicar petición recibida por otro canal</p>
      <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>Use esta opción cuando reciba una petición por correo electrónico, correspondencia física digitalizada, o la haya recolectado en terreno (ej. visita a centro carcelario).</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {CANALES.map(c => (
          <button key={c.id} onClick={() => setCanal(c.id)} style={{ padding: "8px 14px", borderRadius: 8, border: canal === c.id ? "1.5px solid #2E75B6" : "1.5px solid #D1D5DB", background: canal === c.id ? "#EFF6FF" : "#fff", fontSize: 12, cursor: "pointer", color: canal === c.id ? "#1A3D6B" : "#374151", fontWeight: canal === c.id ? 600 : 400, fontFamily: "inherit" }}>
            {c.lbl}
          </button>
        ))}
      </div>

      {!archivo && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{ border: "2px dashed #D1D5DB", borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer" }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 4 }}>Arrastre el archivo o haga clic para seleccionar</p>
          <p style={{ fontSize: 11, color: "#9CA3AF" }}>PDF, Word (.docx) o imagen (JPG, PNG) · Máximo 15 MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        </div>
      )}

      {archivo && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F9FAFB", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: "#1A3D6B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{archivo.tipo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{archivo.nombre}</div>
            <div style={{ fontSize: 10, color: "#6B7280" }}>{extrayendo ? "Procesando con IA (M1)..." : extraido ? "Información extraída ✓" : ""}</div>
          </div>
          <button onClick={() => { setArchivo(null); setExtraido(false); }} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
        </div>
      )}

      {extraido && (
        <div>
          <div style={{ background: "#F5F3FF", border: "0.5px solid #C4B5FD", borderRadius: 8, padding: "12px 14px", marginTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#5B21B6", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>🤖 M1 — Análisis del documento</p>
            <p style={{ fontSize: 10, color: "#7C3AED", marginBottom: 8, lineHeight: 1.5 }}>M1 infiere estos campos del contenido del documento. Los datos de identidad NO se dan por ciertos: deben verificarse manualmente contra el documento para evitar errores de extracción.</p>
            {[["Tipo de documento", archivo?.tipo === "PDF" ? "PDF con texto" : archivo?.tipo === "IMG" ? "Imagen (requiere OCR)" : "Documento Word"], ["Categoría inferida", "Por confirmar según el relato"], ["Hash cadena de custodia", "SHA256:" + (archivo?.nombre ? archivo.nombre.length.toString(16).padStart(2,"0") : "00") + "f8b2c1…"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "0.5px solid #E9D5FF" }}>
                <span style={{ color: "#6B21A8" }}>{l}</span><span style={{ color: "#374151", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
              <span style={{ color: "#6B21A8" }}>Datos de identidad (nombre, cédula)</span><span style={{ color: "#D97706", fontStyle: "italic" }}>Requieren verificación manual</span>
            </div>
          </div>

          <div style={{ background: "#FFFBEB", border: "0.5px solid #FCD34D", borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
            <p style={{ fontSize: 10, color: "#92400E", margin: 0, lineHeight: 1.5 }}>⚠ Para proteger la integridad del expediente, el funcionario debe transcribir y verificar los datos de identidad directamente del documento. M1 no completa nombres ni cédulas automáticamente.</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Nombre del peticionario (verificar en el documento) *</label>
              <input style={s.input} value={nombreManual} onChange={e => setNombreManual(e.target.value)} placeholder="Nombre completo como aparece en el documento" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Número de cédula (verificar) *</label>
              <input style={s.input} value={cedulaManual} onChange={e => setCedulaManual(e.target.value)} placeholder="Sin puntos" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Fecha del hecho *</label>
              <input style={s.input} type="date" value={fechaManual} onChange={e => setFechaManual(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button style={s.btn("ghost")} onClick={() => { setArchivo(null); setExtraido(false); }}>Cancelar</button>
            <button style={{ ...s.btn("primary"), opacity: (!nombreManual || !cedulaManual || !fechaManual) ? 0.45 : 1, cursor: (!nombreManual || !cedulaManual || !fechaManual) ? "not-allowed" : "pointer" }} disabled={!nombreManual || !cedulaManual || !fechaManual} onClick={() => setRadicado(true)}>
              Radicar y enviar a M2 →
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, background: "#F9FAFB", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
        <strong>Flujo:</strong> el archivo pasa por M1 (extracción + hash de custodia) igual que en el portal ciudadano. Complete los campos que la IA no pudo extraer antes de enviarlo a M2 para clasificación.
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
  const API_URL = "https://urab-ai-api.onrender.com";
  // Flujo de gestión completo
  const [tipoConfirmado, setTipoConfirmado] = useState(caso.tipo_confirmado_hitl || false);
  const [tipoSel, setTipoSel] = useState(caso.tipo_peticion || "queja");
  const [derechos, setDerechos] = useState((caso.derechos_vulnerados || []).join("\n"));
  const [conducta, setConducta] = useState(caso.conducta_vulnera || "");
  // Gestiones sugeridas (checkbox para confirmar cada una)
  const gestionesIniciales = (caso.gestiones && caso.gestiones.length > 0)
    ? caso.gestiones
    : [];
  const [gestiones, setGestiones] = useState(gestionesIniciales.map(g => ({ ...g, confirmada: g.confirmada !== false })));
  const [gestionesConfirmadas, setGestionesConfirmadas] = useState(caso.gestiones_confirmadas || false);
  const [nuevaAccion, setNuevaAccion] = useState("");
  const [nuevaEntidad, setNuevaEntidad] = useState("");
  const [respuestas, setRespuestas] = useState({});  // {indice: textoRespuesta}
  const [procesando, setProcesando] = useState(false);
  const [msgGestion, setMsgGestion] = useState("");
  const [casoCerrado, setCasoCerrado] = useState(caso.caso_cerrado || false);

  const nombreFunc = caso.prof ? caso.prof.split(" (")[0] : "Funcionario/a";
  const toggleGestion = (i) => setGestiones(gestiones.map((g, idx) => idx === i ? { ...g, confirmada: !g.confirmada } : g));
  const agregarGestion = () => {
    if (nuevaAccion.trim()) {
      setGestiones([...gestiones, { accion: nuevaAccion.trim(), entidad: nuevaEntidad.trim() || "Entidad accionada", confirmada: true, respuesta: null, fecha_respuesta: null }]);
      setNuevaAccion(""); setNuevaEntidad("");
    }
  };
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
        {[["resumen","Resumen"],["gestion","Gestión"],["trazabilidad","Trazabilidad"],["borrador","Borrador M6"]].map(([k,l]) => (
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

      {tab === "gestion" && (
        <div>
          {casoCerrado && (
            <div style={{ background: "#D1FAE5", border: "0.5px solid #6EE7B7", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#065F46", margin: 0 }}>Caso cerrado. Todas las gestiones recibieron respuesta y el expediente fue archivado.</p>
            </div>
          )}

          {/* PASO 1: Confirmar tipo (si es queja, confirmar derechos y conducta) */}
          <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "14px", marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1A3D6B", marginBottom: 4 }}>1. Tipo de petición {tipoConfirmado && <span style={{ color: "#059669", fontSize: 11 }}>confirmado</span>}</p>
            <p style={{ fontSize: 10, color: "#6B7280", marginBottom: 10 }}>M2 clasificó esta petición. Confirme el tipo y, si es queja, los derechos vulnerados y la conducta (Directiva 007/2025).</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[["asesoria","Asesoría"],["solicitud","Solicitud"],["queja","Queja"]].map(([k,l]) => (
                <button key={k} onClick={() => !tipoConfirmado && setTipoSel(k)} disabled={tipoConfirmado}
                  style={{ padding: "6px 14px", borderRadius: 8, border: tipoSel === k ? "1.5px solid #1A3D6B" : "1px solid #D1D5DB", background: tipoSel === k ? "#EFF6FF" : "#fff", color: tipoSel === k ? "#1A3D6B" : "#374151", fontSize: 12, fontWeight: tipoSel === k ? 600 : 400, cursor: tipoConfirmado ? "default" : "pointer", fontFamily: "inherit" }}>{l}</button>
              ))}
            </div>
            {tipoSel === "queja" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Derechos vulnerados (uno por línea)</label>
                <textarea value={derechos} onChange={e => setDerechos(e.target.value)} disabled={tipoConfirmado}
                  placeholder="Ej: Derecho fundamental a la salud (Art. 49 CP)" style={{ width: "100%", minHeight: 50, padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8, background: tipoConfirmado ? "#F9FAFB" : "#fff" }} />
                <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Conducta que vulnera</label>
                <textarea value={conducta} onChange={e => setConducta(e.target.value)} disabled={tipoConfirmado}
                  placeholder="Ej: Negación del servicio por la EPS" style={{ width: "100%", minHeight: 45, padding: "8px 10px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8, background: tipoConfirmado ? "#F9FAFB" : "#fff" }} />
              </div>
            )}
            {!tipoConfirmado && (
              <button style={s.btn("primary")} disabled={procesando} onClick={async () => {
                setProcesando(true); setMsgGestion("");
                try {
                  const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/tipo`, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tipo_peticion: tipoSel, derechos_vulnerados: derechos.split("\n").map(d=>d.trim()).filter(Boolean), conducta_vulnera: conducta, funcionario: nombreFunc })
                  });
                  if (!resp.ok) throw new Error();
                  setTipoConfirmado(true);
                } catch(e) { setTipoConfirmado(true); /* modo demo */ }
                finally { setProcesando(false); }
              }}>{procesando ? "Confirmando..." : "✓ Confirmar tipo (HITL)"}</button>
            )}
          </div>

          {/* PASO 2: Confirmar gestiones sugeridas por M2 */}
          <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "14px", marginBottom: 14, opacity: tipoConfirmado ? 1 : 0.5, pointerEvents: tipoConfirmado ? "auto" : "none" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1A3D6B", marginBottom: 4 }}>2. Gestiones a realizar {gestionesConfirmadas && <span style={{ color: "#059669", fontSize: 11 }}>confirmadas</span>}</p>
            <p style={{ fontSize: 10, color: "#6B7280", marginBottom: 10 }}>M2 sugiere estas gestiones según el caso. Marque las que va a realizar. Al confirmar, se notifica al ciudadano y a la coordinación.</p>
            {gestiones.length === 0 && <p style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", marginBottom: 8 }}>Sin gestiones sugeridas (radique un caso nuevo para ver la sugerencia de M2). Puede agregar gestiones manualmente abajo.</p>}
            {gestiones.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: "#F9FAFB", borderRadius: 6, marginBottom: 6 }}>
                <input type="checkbox" checked={g.confirmada} onChange={() => !gestionesConfirmadas && toggleGestion(i)} disabled={gestionesConfirmadas} style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "#111827", margin: 0 }}>{g.accion}</p>
                  <p style={{ fontSize: 10, color: "#6B7280", margin: "2px 0 0" }}>Entidad: {g.entidad}</p>
                </div>
              </div>
            ))}
            {!gestionesConfirmadas && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, marginBottom: 8 }}>
                <input value={nuevaAccion} onChange={e => setNuevaAccion(e.target.value)} placeholder="Agregar otra gestión..." style={{ flex: 2, padding: "7px 9px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 11, fontFamily: "inherit" }} />
                <input value={nuevaEntidad} onChange={e => setNuevaEntidad(e.target.value)} placeholder="Entidad" style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 11, fontFamily: "inherit" }} />
                <button style={s.btn("ghost")} onClick={agregarGestion}>+ Agregar</button>
              </div>
            )}
            {!gestionesConfirmadas && gestiones.length > 0 && (
              <button style={s.btn("success")} disabled={procesando} onClick={async () => {
                setProcesando(true); setMsgGestion("");
                try {
                  const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/gestiones`, {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gestiones: gestiones, funcionario: nombreFunc })
                  });
                  if (!resp.ok) throw new Error();
                  setGestionesConfirmadas(true);
                  setMsgGestion("Gestiones confirmadas. Se notificó al ciudadano y a la coordinación.");
                } catch(e) { setGestionesConfirmadas(true); setMsgGestion("Gestiones confirmadas (modo demo)."); }
                finally { setProcesando(false); }
              }}>{procesando ? "Confirmando..." : "✓ Confirmar gestiones (HITL)"}</button>
            )}
          </div>

          {/* PASO 3: Registrar respuestas y cerrar */}
          {gestionesConfirmadas && !casoCerrado && (
            <div style={{ border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "14px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1A3D6B", marginBottom: 4 }}>3. Respuestas y cierre</p>
              <p style={{ fontSize: 10, color: "#6B7280", marginBottom: 10 }}>Registre la respuesta recibida a cada gestión. Cuando todas tengan respuesta, podrá cerrar el caso.</p>
              {gestiones.filter(g => g.confirmada).map((g, idx) => {
                const i = gestiones.indexOf(g);
                return (
                  <div key={i} style={{ padding: "10px", background: g.respuesta ? "#ECFDF5" : "#F9FAFB", borderRadius: 6, marginBottom: 8, border: g.respuesta ? "0.5px solid #6EE7B7" : "0.5px solid #E5E7EB" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>{g.accion}</p>
                    {g.respuesta ? (
                      <p style={{ fontSize: 11, color: "#047857", margin: 0 }}>✓ Respondida el {g.fecha_respuesta}: {g.respuesta}</p>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={respuestas[i] || ""} onChange={e => setRespuestas({ ...respuestas, [i]: e.target.value })} placeholder="Respuesta recibida de la entidad..." style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 11, fontFamily: "inherit" }} />
                        <button style={s.btn("primary")} disabled={procesando || !respuestas[i]} onClick={async () => {
                          setProcesando(true);
                          try {
                            const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/respuesta`, {
                              method: "PUT", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ indice_gestion: i, respuesta: respuestas[i], funcionario: nombreFunc })
                            });
                            const data = await resp.json();
                            setGestiones(gestiones.map((gg, idx2) => idx2 === i ? { ...gg, respuesta: respuestas[i], fecha_respuesta: new Date().toLocaleDateString("es-CO") } : gg));
                          } catch(e) {
                            setGestiones(gestiones.map((gg, idx2) => idx2 === i ? { ...gg, respuesta: respuestas[i], fecha_respuesta: new Date().toLocaleDateString("es-CO") } : gg));
                          }
                          finally { setProcesando(false); }
                        }}>Registrar</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {gestiones.filter(g => g.confirmada).every(g => g.respuesta) && gestiones.filter(g=>g.confirmada).length > 0 && (
                <button style={{ ...s.btn("success"), marginTop: 8 }} disabled={procesando} onClick={async () => {
                  setProcesando(true);
                  try {
                    const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/cerrar`, { method: "PUT" });
                    if (!resp.ok) throw new Error();
                    setCasoCerrado(true);
                  } catch(e) { setCasoCerrado(true); }
                  finally { setProcesando(false); }
                }}>{procesando ? "Cerrando..." : "🔒 Cerrar caso (todas las gestiones respondidas)"}</button>
              )}
            </div>
          )}

          {msgGestion && <p style={{ fontSize: 11, color: "#065F46", marginTop: 10, fontWeight: 500 }}>{msgGestion}</p>}
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
        (() => {
          // M6 — genera el borrador completo de respuesta al ciudadano
          const tipoLbl = { asesoria: "Asesoría", solicitud: "Solicitud (intervención/mediación/conciliación)", queja: "Queja" }[caso.tipo_peticion] || "Petición";
          const urgLbl = { critica: "CRÍTICA", alta: "ALTA", media: "MEDIA", baja: "BAJA" }[caso.urgencia] || caso.urgencia;
          const entidadesTxt = (caso.gestiones && caso.gestiones.length > 0)
            ? [...new Set(caso.gestiones.filter(g => g.confirmada !== false).map(g => g.entidad))].join(", ")
            : (caso.entidades && caso.entidades.length > 0 ? caso.entidades.join(", ") : "la entidad competente");
          const derechosTxt = (caso.derechos_vulnerados && caso.derechos_vulnerados.length > 0)
            ? caso.derechos_vulnerados.join("; ")
            : null;
          const borradorM6 = borrador && borrador.length > 120 ? borrador : (
`Señor(a) ${caso.ciudadano}:

La Defensoría del Pueblo — Unidad de Recepción y Análisis de Bogotá (URAB) ha recibido y analizado su petición radicada bajo el número ${caso.radicado} el ${caso.fecha}.

1. CLASIFICACIÓN DE SU PETICIÓN
Tipo: ${tipoLbl}.
Prioridad asignada (triage automático M2): ${urgLbl} — confianza ${caso.confianza}%.
Justificación: ${caso.explicacion || "Clasificación basada en el análisis del relato aportado."}${derechosTxt ? `
Derechos presuntamente vulnerados: ${derechosTxt}.
Conducta que los vulnera: ${caso.conducta_vulnera || "en verificación por el profesional."}` : ""}

2. GESTIÓN QUE ADELANTARÁ LA DEFENSORÍA
Su caso fue asignado a ${caso.prof}, profesional especializado.
Se adelantará la siguiente gestión defensorial ante ${entidadesTxt}:${(caso.gestiones && caso.gestiones.length > 0) ? "\n" + caso.gestiones.filter(g => g.confirmada !== false).map(g => `   • ${g.accion}`).join("\n") : "\n   • Impulso y coordinación con la entidad competente para la garantía de sus derechos."}

3. TRÁMITE Y TÉRMINO
Su petición se encuentra en estado: ${caso.estado}. La Defensoría hará seguimiento a la respuesta de la(s) entidad(es) accionada(s). El término legal para la respuesta es de 15 días hábiles (CPACA, Art. 14, Ley 1437 de 2011), con vencimiento el ${caso.fecha_vencimiento || "según el cómputo del término"}.

Usted será informado de cada actuación, su fecha y su resultado, a través del canal de contacto registrado y del portal de seguimiento.

Cordialmente,
Defensoría del Pueblo — URAB
[Borrador generado por el módulo M6. El profesional responsable debe revisar, complementar y aprobar antes de su envío — Directiva 007/2025 · Ley 734/2002.]`
          );
          if (borrador !== borradorM6 && (!borrador || borrador.length <= 120)) {
            // inicializa el textarea con el borrador generado (una vez)
            setTimeout(() => setBorrador(borradorM6), 0);
          }
          return (
          <div>
            <div style={s.sello}>⚠ BORRADOR GENERADO POR IA (M6) — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE</div>
            <div style={{ background: "#F9FAFB", borderRadius: 6, padding: "8px 12px", marginBottom: 9, fontSize: 11, color: "#6B7280" }}>
              <strong>Fuentes RAG:</strong> {(caso.fuentes && caso.fuentes.length > 0 ? caso.fuentes : ["Corpus normativo institucional", "CPACA Art. 14", "Directiva 007/2025"]).join(" · ")}
            </div>
            <textarea value={borrador || borradorM6} onChange={e => setBorrador(e.target.value)}
              style={{ width: "100%", minHeight: 280, padding: "9px 11px", borderRadius: 6, border: "0.5px solid #D1D5DB", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
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
          );
        })()
      )}
    </div>
  );
}

// ── Bandeja ────────────────────────────────────────────────────────────
function Bandeja({ onSeleccionar }) {
  const [filtro, setFiltro] = useState("todos");
  const [casosAPI, setCasosAPI] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorAPI, setErrorAPI] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch(`${API_URL}/api/casos`);
        if (!resp.ok) throw new Error("API no disponible");
        const data = await resp.json();
        if (!cancelado) {
          setCasosAPI(data.map(mapearCasoAPI));
          setErrorAPI(false);
        }
      } catch (e) {
        if (!cancelado) setErrorAPI(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // Combinar: casos de la API (reales/nuevos) + casos mock que no estén ya en la API
  const radicadosAPI = new Set(casosAPI.map(c => c.radicado));
  const mockFiltrados = CASOS.filter(c => !radicadosAPI.has(c.radicado));
  const todos = [...casosAPI, ...mockFiltrados];

  const lista = filtro === "hitl" ? todos.filter(c => c.hitl)
              : filtro === "critica" ? todos.filter(c => c.urgencia === "critica")
              : todos;
  const nhitl = todos.filter(c => c.hitl).length;

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
      {cargando && (
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: "#6B7280" }}>
          Cargando casos desde el servidor... (puede tardar hasta 50s si el servidor estaba inactivo)
        </div>
      )}
      {errorAPI && !cargando && (
        <div style={{ background: "#FEF3C7", border: "0.5px solid #FCD34D", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 10, color: "#92400E" }}>
          ⚠ No se pudo conectar con el servidor. Mostrando casos de demostración. Recargue en un momento para ver los casos radicados en tiempo real.
        </div>
      )}
      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {[["todos",`Todos (${todos.length})`],["hitl",`⚠ HITL (${nhitl})`],["critica","Críticos"]].map(([k,l]) => (
          <button key={k} style={s.fb(filtro === k)} onClick={() => setFiltro(k)}>{l}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{nhitl} casos requieren revisión HITL inmediata</span>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap", fontSize: 10, color: "#6B7280", background: "#F9FAFB", borderRadius: 7, padding: "7px 11px" }}>
        <span style={{ fontWeight: 600, color: "#374151" }}>Convenciones:</span>
        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"#FEE2E2", border:"1.5px solid #EF4444", marginRight:4, verticalAlign:"middle" }}></span>Borde rojo izquierdo = urgencia CRÍTICA</span>
        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"#FEF3C7", border:"1.5px solid #F59E0B", marginRight:4, verticalAlign:"middle" }}></span>Borde amarillo = urgencia ALTA</span>
        <span><span style={{ display:"inline-block", width:10, height:10, background:"#FEF9C3", border:"1px solid #FDE047", borderRadius:2, marginRight:4, verticalAlign:"middle" }}></span>Fondo amarillo = requiere revisión HITL</span>
      </div>
      {lista.map(c => (
        <div key={c.radicado}
          onClick={() => onSeleccionar(c)}
          style={{ border: `0.5px solid ${c.hitl ? "#FCD34D" : "#E5E7EB"}`, borderRadius: 8, padding: "11px 14px", cursor: "pointer", marginBottom: 8, background: c.hitl ? "#FFFBEB" : "#fff", borderLeft: c.urgencia === "critica" ? "3px solid #EF4444" : c.urgencia === "alta" ? "3px solid #F59E0B" : `0.5px solid ${c.hitl ? "#FCD34D" : "#E5E7EB"}` }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1A3D6B" }}>{c.radicado}</span>
            <span style={s.badge(c.urgencia)}>{URG[c.urgencia]?.lbl}</span>
            <span style={s.pill()}>{c.categoria}</span>
            {c.hitl && <span style={s.pill({ background: "#FEF9C3", color: "#713F12", borderColor: "#FDE047", fontWeight: 700 })}>⚠ HITL</span>}
            {c.dup && <span style={s.pill({ background: "#EDE9FE", color: "#4C1D95", borderColor: "#C4B5FD" })}>DUPLICADO</span>}
            {c.esNuevo && <span style={s.pill({ background: "#DCFCE7", color: "#166534", borderColor: "#86EFAC", fontWeight: 700 })}>● EN VIVO</span>}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{c.fecha}</span>
          </div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>
            <span style={{ color: "#1A3D6B", fontWeight: 500 }}>{c.ciudadano}</span> · Peticionario/a &nbsp;|&nbsp;
            <span style={{ color: "#059669", fontWeight: 500 }}>{c.prof.split(" (")[0]}</span> · Profesional
          </div>
          {c.hitl && c.hitl_razon && <p style={{ fontSize: 10, color: "#92400E", margin: "3px 0 0", fontStyle: "italic" }}>{c.hitl_razon.slice(0, 110)}{c.hitl_razon.length > 110 ? "..." : ""}</p>}
          <MiniHitos hitos={c.hitos} />
        </div>
      ))}
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

// ── Barra de accesibilidad ─────────────────────────────────────────────
const NIVELES_ACC = ["Normal","Grande","Muy grande","Máximo"];
const SIZES_ACC   = ["14px","17px","20px","24px"];

function useAccesibilidad() {
  const [nivel, setNivel] = useState(() => parseInt(localStorage.getItem("urab_fs")||"0"));
  const [contraste, setContraste] = useState(() => localStorage.getItem("urab_ac")==="1");
  return { nivel, setNivel, contraste, setContraste };
}

function AccesibilidadBar() {
  const { nivel, setNivel, contraste, setContraste } = useAccesibilidad();
  const [ayuda, setAyuda] = useState(false);

  useState(() => { document.documentElement.style.fontSize = SIZES_ACC[nivel]; }, []);

  const cambiar = d => {
    const n = Math.max(0, Math.min(3, nivel + d));
    setNivel(n);
    document.documentElement.style.fontSize = SIZES_ACC[n];
    localStorage.setItem("urab_fs", n);
  };
  const reset = () => { setNivel(0); document.documentElement.style.fontSize = SIZES_ACC[0]; localStorage.setItem("urab_fs", 0); };
  const toggleContraste = () => {
    const c = !contraste; setContraste(c);
    document.body.classList.toggle("urab-ac", c);
    localStorage.setItem("urab_ac", c ? "1" : "0");
  };

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
          <button onClick={reset} style={{ fontSize:10, color:"#93C5FD", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>Restablecer</button>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,.2)", margin:"0 2px" }}/>
          <button onClick={toggleContraste} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:contraste?"#FFD700":"rgba(255,255,255,.1)", color:contraste?"#000":"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>
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
            {[["A−","Letra más pequeña","Hace el texto más pequeño."],["A+","Letra más grande","Hace el texto más grande."],["Rest.","Restablecer","Vuelve al tamaño normal."],["🌓","Alto contraste","Cambia los colores para facilitar la lectura."]].map(([ico,titulo,desc])=>(
              <div key={titulo} style={{ display:"flex", gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:"#1A3D6B", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{ico}</div>
                <div><p style={{ fontSize:12, fontWeight:600, color:"#92400E", margin:"0 0 2px" }}>{titulo}</p><p style={{ fontSize:11, color:"#78350F", margin:0, lineHeight:1.5 }}>{desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── App principal ──────────────────────────────────────────────────────
export default function App() {
  const [seccion, setSeccion] = useState("bandeja");
  const [casoAbierto, setCasoAbierto] = useState(null);

  return (
    <div style={s.wrap}>
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
          <button style={s.hn(seccion === "radicar")} onClick={() => setSeccion("radicar")}>
            📄 Radicar por archivo
          </button>
          <button style={s.hn(seccion === "dashboard")} onClick={() => setSeccion("dashboard")}>
            📊 Dashboard M8
          </button>
        </div>
      </div>

      <AccesibilidadBar />

      <div style={{ ...s.card, marginTop: 14 }}>
        {seccion === "bandeja" && !casoAbierto && <Bandeja onSeleccionar={setCasoAbierto} />}
        {seccion === "bandeja" && casoAbierto && <DetalleCaso caso={casoAbierto} onVolver={() => setCasoAbierto(null)} />}
        {seccion === "radicar" && <RadicarPorArchivo />}
        {seccion === "dashboard" && <DashboardM8 />}
      </div>

      <p style={{ textAlign: "center", fontSize: 10, color: "#9CA3AF", marginTop: 12 }}>
        Defensoría del Pueblo de Colombia · Directiva 007/2025 · CONPES 4144 · Ley 1581/2012 · NIST AI RMF · ISO/IEC 42001
      </p>
      <div style={{ maxWidth: 680, margin: "10px auto 0", padding: "10px 14px", background: "#F9FAFB", border: "0.5px solid #E5E7EB", borderRadius: 8 }}>
        <p style={{ textAlign: "center", fontSize: 9, color: "#9CA3AF", lineHeight: 1.6, margin: 0 }}>
          ⚠️ Prototipo académico · Legal Strategy Lab 2026 — Universidad Externado de Colombia. Los casos mostrados usan datos sintéticos calibrados al RFP; no corresponden a personas ni expedientes reales. En producción, los módulos M1–M8 operarían sobre datos institucionales con las salvaguardas de la Ley 1581/2012 y la Directiva 007/2025.
        </p>
      </div>
    </div>
  );
}
