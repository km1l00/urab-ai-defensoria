import { useState } from "react";

// ── Datos mock calibrados al corpus sintético (N=20,417) ──────────────
const PROFESIONALES = [
  { id: "P01", nombre: "Ana Torres",   especialidades: ["VBG", "NNA"],        carga: 847  },
  { id: "P02", nombre: "Luis Morales", especialidades: ["Salud", "General"],  carga: 1103 },
  { id: "P03", nombre: "Clara Ruiz",   especialidades: ["Desaparición"],      carga: 612  },
  { id: "P04", nombre: "Jorge Vargas", especialidades: ["General"],           carga: 954  },
];

const CASOS = [
  {
    radicado: "DP-2026-004821",
    ciudadano: "María García", cedula: "52.847.193",
    canal: "Web", fecha: "14/06 08:42",
    urgencia: "critica", categoria: "VBG", confianza: 94,
    hitl: true,
    hitl_razon: "Regla hard-coded: NNA detectado + amenaza vital | Doble revisión requerida (Sprint C1)",
    explicacion: "El relato describe amenazas de muerte reiteradas con menores de edad en el hogar. La presencia de NNA activa prioridad máxima de forma automática independientemente del clasificador.",
    profesional: "P01", profesional_nombre: "Ana Torres",
    especialidad: "VBG · NNA",
    razon: "perfil VBG + NNA coincidente | carga 847 casos (bajo umbral 1.200) | sin radicados previos",
    caract: { etario: "Adulta (18–59)", etnia: "No indica", disc: "No indica", victima: "No indica", grupos: ["VBG"] },
    borrador: `Señora María García:\n\nLa Defensoría del Pueblo ha recibido su petición radicada bajo el número DP-2026-004821 el 14 de junio de 2026, con PRIORIDAD CRÍTICA.\n\nSu caso ha sido asignado a la profesional Ana Torres, especialista en VBG y NNA, quien se comunicará con usted dentro de las próximas 2 horas hábiles.\n\nSi se encuentra en peligro inmediato, comuníquese al 123 (emergencias) o al 01 8000 914 814.\n\nFuentes RAG: Ley 1257/2008 · Decreto 1729/2008 · Ruta de atención VBG URAB`,
    fuentes: ["Ley 1257/2008 - Violencia basada en género", "Ruta de atención VBG URAB", "Decreto 1729/2008"],
    estado: "Pendiente HITL", duplicado: null,
  },
  {
    radicado: "DP-2026-004820",
    ciudadano: "Carlos Pérez", cedula: "80.123.456",
    canal: "Correo", fecha: "14/06 07:15",
    urgencia: "media", categoria: "Salud", confianza: 88,
    hitl: false, hitl_razon: "",
    explicacion: "Petición sobre negación de servicios de salud por EPS Sanitas. Sin indicadores de riesgo vital inmediato.",
    profesional: "P02", profesional_nombre: "Luis Morales",
    especialidad: "Salud · General",
    razon: "perfil Salud coincidente | carga mínima disponible: 1.103 casos | sin radicados previos",
    caract: { etario: "Adulto (18–59)", etnia: "No indica", disc: "No indica", victima: "No indica", grupos: [] },
    borrador: "Señor Carlos Pérez:\n\nLa Defensoría ha radicado su petición DP-2026-004820 relacionada con la presunta negación de servicios de salud...\n\n[El profesional debe completar con detalles del caso]",
    fuentes: ["Ley 1751/2015 - Derecho fundamental a la salud"],
    estado: "En gestión", duplicado: null,
  },
  {
    radicado: "DP-2026-004819",
    ciudadano: "Rosa Martínez", cedula: "41.987.654",
    canal: "Presencial", fecha: "13/06 16:30",
    urgencia: "alta", categoria: "Desaparición", confianza: 91,
    hitl: true,
    hitl_razon: "Urgencia alta: desaparición de familiar | HITL obligatorio por categoría",
    explicacion: "Ciudadana reporta desaparición de su hijo adulto hace 72 horas. Hash cadena custodia: SHA256:a3f8b2c1... (M1 presencial). Entidades competentes: Fiscalía y SIJÍN.",
    profesional: "P03", profesional_nombre: "Clara Ruiz",
    especialidad: "Desaparición · Conflicto",
    razon: "perfil Desaparición coincidente | carga mínima: 612 casos | sin radicados previos",
    caract: { etario: "Adulta (18–59)", etnia: "Afrodescendiente", disc: "No", victima: "Sí — Desplazamiento", grupos: ["Desplazada"] },
    borrador: "Señora Rosa Martínez:\n\nLa Defensoría ha radicado su denuncia DP-2026-004819...\n\n[Coordinar con Fiscalía y SIJÍN antes de completar]",
    fuentes: ["Protocolo desaparición URAB", "Ley 1448/2011"],
    estado: "Pendiente HITL", duplicado: null,
  },
  {
    radicado: "DP-2026-004818",
    ciudadano: "Carlos Pérez", cedula: "80.123.456",
    canal: "Web", fecha: "13/06 09:00",
    urgencia: "media", categoria: "Salud", confianza: 82,
    hitl: true,
    hitl_razon: "M4: posible duplicado de DP-2026-004820 (similitud 89%) — funcionario debe aprobar acumulación",
    explicacion: "Misma situación reportada el día anterior. M4 detectó similitud semántica ≥85% con radicado existente del mismo ciudadano.",
    profesional: "P02", profesional_nombre: "Luis Morales",
    especialidad: "Salud · General",
    razon: "continuidad con peticionario (radicado previo DP-2026-004820) | carga 1.103 casos",
    caract: { etario: "Adulto (18–59)", etnia: "No indica", disc: "No indica", victima: "No indica", grupos: [] },
    borrador: "", fuentes: [],
    estado: "Pendiente HITL", duplicado: "DP-2026-004820",
  },
];

const METRICAS = {
  tri_a: 9.1, tri_t: 1.4,
  urg_a: 56.2, urg_t: 4.5,
  dr_a: 72.6, dr_t: 5.0,
  rc_a: 7.7, rc_t: 2.1,
  horas: 13320, fte: 6.4, urg_add: 7600,
  prec: 92.3, recall: 100.0, dup: 91.0, n: 20417,
};

// ── Utilidades ─────────────────────────────────────────────────────────
const URGENCIA = {
  critica: { label: "CRÍTICA", bg: "#FEE2E2", color: "#991B1B", border: "#EF4444" },
  alta:    { label: "ALTA",    bg: "#FEF3C7", color: "#92400E", border: "#F59E0B" },
  media:   { label: "MEDIA",   bg: "#DBEAFE", color: "#1E40AF", border: "#3B82F6" },
  baja:    { label: "BAJA",    bg: "#F0FDF4", color: "#14532D", border: "#22C55E" },
};

const CARACT_COLORS = {
  etario:   { bg: "#F5F3FF", color: "#5B21B6", border: "#C4B5FD" },
  etnia:    { bg: "#ECFDF5", color: "#065F46", border: "#6EE7B7" },
  disc:     { bg: "#FFF7ED", color: "#9A3412", border: "#FDBA74" },
  victima:  { bg: "#FEF2F2", color: "#991B1B", border: "#FCA5A5" },
  grupo:    { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
};

const s = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: "0 0 40px", fontFamily: "'Inter', system-ui, sans-serif" },
  hdr: { background: "#1F4E79", color: "#fff", padding: "12px 18px", borderRadius: "0 0 10px 10px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" },
  hdrL: { fontSize: 9, color: "#93C5FD", letterSpacing: ".08em" },
  hdrH: { fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 2 },
  hdrR: { textAlign: "right", fontSize: 10, color: "#93C5FD", lineHeight: 1.6 },
  tabs: { display: "flex", borderBottom: "2px solid #E5E7EB", marginBottom: 18 },
  tab: (active) => ({ padding: "9px 16px", fontSize: 12, border: "none", borderBottom: active ? "2px solid #1F4E79" : "2px solid transparent", marginBottom: -2, background: "none", cursor: "pointer", color: active ? "#1F4E79" : "#6B7280", fontWeight: active ? 700 : 400, fontFamily: "inherit" }),
  card: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "18px 20px" },
  badge: (u) => ({ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, letterSpacing: ".03em", background: URGENCIA[u]?.bg, color: URGENCIA[u]?.color, border: `1.5px solid ${URGENCIA[u]?.border}` }),
  pill: (extra = {}) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 9, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB", fontWeight: 500, ...extra }),
  ctag: (type) => ({ fontSize: 10, padding: "3px 9px", borderRadius: 10, border: `1px solid ${CARACT_COLORS[type]?.border}`, background: CARACT_COLORS[type]?.bg, color: CARACT_COLORS[type]?.color, fontWeight: 500, marginRight: 4, marginBottom: 4, display: "inline-block" }),
  btn: (variant = "ghost") => ({
    padding: "7px 15px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, border: "1px solid",
    ...(variant === "primary" ? { background: "#1F4E79", color: "#fff", borderColor: "#1F4E79" } :
        variant === "success" ? { background: "#16A34A", color: "#fff", borderColor: "#16A34A" } :
        variant === "amber"   ? { background: "#FEF3C7", color: "#92400E", borderColor: "#F59E0B" } :
                                { background: "#fff", color: "#374151", borderColor: "#E5E7EB" }),
  }),
  hitlBanner: { background: "#FEF3C7", border: "1.5px solid #F59E0B", borderRadius: 8, padding: "10px 13px", marginBottom: 12, display: "flex", gap: 9 },
  xai: { background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 7, padding: "10px 12px", marginBottom: 10 },
  sello: { background: "#FEF3C7", border: "1.5px solid #F59E0B", borderRadius: 6, padding: "7px 11px", marginBottom: 9, fontSize: 10, fontWeight: 700, color: "#92400E" },
  logRow: { display: "flex", gap: 9, padding: "5px 0", borderBottom: "1px solid #F3F4F6", fontSize: 10, fontFamily: "monospace" },
  mc: { border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px" },
  roiBox: { background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 14px", marginBottom: 14 },
};

// ── Componentes pequeños ───────────────────────────────────────────────
function Badge({ u }) {
  return <span style={s.badge(u)}>{URGENCIA[u]?.label || u}</span>;
}

function CaractTags({ caract }) {
  if (!caract) return null;
  return (
    <div style={{ marginTop: 6 }}>
      {caract.etario !== "No indica" && <span style={s.ctag("etario")}>👤 {caract.etario}</span>}
      {caract.etnia && caract.etnia !== "No indica" && <span style={s.ctag("etnia")}>🌿 {caract.etnia}</span>}
      {caract.disc && caract.disc !== "No indica" && caract.disc !== "No" && <span style={s.ctag("disc")}>♿ {caract.disc}</span>}
      {caract.victima && caract.victima !== "No indica" && <span style={s.ctag("victima")}>🕊️ {caract.victima}</span>}
      {(caract.grupos || []).map(g => <span key={g} style={s.ctag("grupo")}>🛡️ {g}</span>)}
    </div>
  );
}

function MetricCard({ label, asis, tobe, unidad, mejora }) {
  const pct = Math.round((tobe / asis) * 100);
  return (
    <div style={s.mc}>
      <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, fontWeight: 500 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 7 }}>
        <div><p style={{ fontSize: 9, color: "#EF4444", margin: 0 }}>AS-IS</p><p style={{ fontSize: 20, fontWeight: 700, color: "#EF4444", margin: 0 }}>{asis}{unidad}</p></div>
        <span style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 2 }}>→</span>
        <div><p style={{ fontSize: 9, color: "#15803D", margin: 0 }}>TO-BE</p><p style={{ fontSize: 20, fontWeight: 700, color: "#15803D", margin: 0 }}>{tobe}{unidad}</p></div>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#15803D", marginBottom: 2 }}>{mejora}</span>
      </div>
      <div style={{ height: 5, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#22C55E", borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── Vista bandeja ──────────────────────────────────────────────────────
function Bandeja({ onSeleccionar }) {
  const [filtro, setFiltro] = useState("todos");
  const lista = filtro === "hitl" ? CASOS.filter(c => c.hitl)
              : filtro === "critica" ? CASOS.filter(c => c.urgencia === "critica")
              : CASOS;
  const nhitl = CASOS.filter(c => c.hitl).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["todos", `Todos (${CASOS.length})`], ["hitl", `⚠️ HITL (${nhitl})`], ["critica", "🔴 Críticos"]].map(([k, l]) => (
          <button key={k} style={{ ...s.btn(filtro === k ? "primary" : "ghost"), borderRadius: 16, fontSize: 11 }} onClick={() => setFiltro(k)}>{l}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{nhitl} casos requieren revisión HITL</span>
      </div>

      {lista.map(c => (
        <div key={c.radicado}
          onClick={() => onSeleccionar(c)}
          style={{ border: `1px solid ${c.hitl ? "#F59E0B" : "#E5E7EB"}`, borderRadius: 8, padding: "11px 14px", cursor: "pointer", marginBottom: 8, background: c.hitl ? "#FFFBEB" : "#fff" }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1F4E79" }}>{c.radicado}</span>
            <Badge u={c.urgencia} />
            <span style={s.pill()}>{c.categoria}</span>
            {c.hitl && <span style={s.pill({ background: "#FEF3C7", color: "#92400E", borderColor: "#F59E0B", fontWeight: 700 })}>HITL</span>}
            {c.duplicado && <span style={s.pill({ background: "#EDE9FE", color: "#5B21B6", borderColor: "#C4B5FD" })}>DUPLICADO</span>}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#9CA3AF" }}>{c.fecha}</span>
          </div>
          <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{c.ciudadano} · {c.cedula} · {c.canal} · {c.profesional_nombre}</p>
          {c.hitl && <p style={{ fontSize: 10, color: "#78350F", margin: "3px 0 0" }}>{c.hitl_razon.slice(0, 110)}...</p>}
        </div>
      ))}
    </div>
  );
}

// ── Vista detalle caso ─────────────────────────────────────────────────
function DetalleCaso({ caso, onVolver }) {
  const [tab, setTab] = useState("resumen");
  const [aprobado, setAprobado] = useState(false);
  const [acumulado, setAcumulado] = useState(false);
  const [borrador, setBorrador] = useState(caso.borrador);

  const logRows = [
    ["08:42:00", "M1", `Recepción — canal ${caso.canal} · normalización completada`],
    ["08:42:03", "M1", "Hash cadena custodia: SHA256:a3f8b2c1d4e5f6a7..."],
    ["08:42:05", "M2", `Clasificación: urgencia=${caso.urgencia} · categoría=${caso.categoria} · confianza=${caso.confianza}%`],
    caso.hitl ? ["08:42:05", "M2", `HITL activado: ${caso.hitl_razon.slice(0, 70)}...`] : null,
    ["08:42:07", "M4", caso.duplicado ? `Duplicado detectado: ${caso.duplicado} similitud 89%` : `Sin duplicados para cédula ${caso.cedula}`],
    ["08:42:08", "M3", `Asignado a ${caso.profesional_nombre} — ${caso.razon}`],
    ["08:42:10", "M5", `Historial: ${caso.cedula} — ${CASOS.filter(x => x.cedula === caso.cedula).length} radicados`],
    ["08:42:12", "M6", caso.borrador ? `Borrador generado — hash:${caso.radicado.slice(-8)}... · fuentes RAG: ${caso.fuentes.length}` : "Sin borrador — pendiente acumulación"],
    ["08:42:13", "M7", "Registro en IRIS y VisionWeb — estado: recibido"],
  ].filter(Boolean);

  return (
    <div>
      <button style={{ fontSize: 11, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }} onClick={onVolver}>← Volver a la bandeja</button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <h3 style={{ fontSize: 14, color: "#1F4E79", margin: 0 }}>{caso.radicado}</h3>
        <Badge u={caso.urgencia} />
        {caso.hitl && !aprobado && <span style={s.pill({ background: "#FEF3C7", color: "#92400E", borderColor: "#F59E0B", fontWeight: 700 })}>⚠️ HITL</span>}
        {aprobado && <span style={s.pill({ background: "#F0FDF4", color: "#15803D", borderColor: "#22C55E" })}>✓ Resuelto</span>}
      </div>
      <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 14 }}>{caso.ciudadano} · {caso.cedula} · {caso.canal} · {caso.fecha} · {caso.profesional_nombre}</p>

      {caso.hitl && !aprobado && (
        <div style={s.hitlBanner}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: "0 0 3px" }}>
              {caso.duplicado ? "Posible duplicado — requiere decisión de acumulación" : "Revisión humana obligatoria (HITL)"}
            </p>
            <p style={{ fontSize: 11, color: "#78350F", margin: 0 }}>
              {caso.hitl_razon}
              {caso.duplicado && <><br />Radicado similar: <strong>{caso.duplicado}</strong></>}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB", marginBottom: 14 }}>
        {[["resumen", "Resumen"], ["borrador", "Borrador M6"], ["trazabilidad", "Trazabilidad"]].map(([k, l]) => (
          <button key={k} style={s.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["Categoría", caso.categoria], ["Confianza IA M2", `${caso.confianza}%`], ["Profesional · Especialidad", `${caso.profesional_nombre} · ${caso.especialidad}`], ["Estado", caso.estado]].map(([l, v]) => (
              <div key={l} style={{ background: "#F9FAFB", borderRadius: 6, padding: "8px 11px" }}>
                <p style={{ fontSize: 9, color: "#9CA3AF", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "#F9FAFB", borderRadius: 7, padding: "10px 12px", marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Caracterización del peticionario</p>
            <CaractTags caract={caso.caract} />
          </div>

          <div style={s.xai}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Explicación IA · XAI obligatorio (Directiva 007/2025)</p>
            <p style={{ fontSize: 11, color: "#1E40AF", margin: 0, lineHeight: 1.6 }}>{caso.explicacion}</p>
          </div>

          <div style={{ background: "#F9FAFB", borderRadius: 7, padding: "9px 12px", marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Razón de asignación M3</p>
            <p style={{ fontSize: 11, color: "#374151", margin: 0 }}>{caso.razon}</p>
          </div>

          {caso.duplicado && !acumulado && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={s.btn("amber")} onClick={() => setAcumulado(true)}>Aprobar acumulación con {caso.duplicado}</button>
              <button style={s.btn("ghost")}>Tramitar por separado</button>
            </div>
          )}
          {acumulado && <p style={{ fontSize: 12, color: "#15803D", fontWeight: 600, marginTop: 8 }}>✓ Acumulación aprobada — expediente consolidado con {caso.duplicado}</p>}
        </div>
      )}

      {tab === "borrador" && (
        <div>
          {caso.borrador ? (
            <>
              <div style={s.sello}>⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE</div>
              {caso.fuentes.length > 0 && (
                <div style={{ ...s.xai, marginBottom: 9 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", marginBottom: 3 }}>Fuentes RAG utilizadas</p>
                  <p style={{ fontSize: 11, color: "#1E40AF", margin: 0 }}>{caso.fuentes.join(" · ")}</p>
                </div>
              )}
              <textarea
                value={borrador}
                onChange={e => setBorrador(e.target.value)}
                style={{ width: "100%", minHeight: 160, padding: "9px 11px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 10, color: "#9CA3AF", margin: "4px 0 10px" }}>Al aprobar, su firma certifica que realizó revisión independiente del contenido jurídico (Ley 734/2002)</p>
              {!aprobado ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.btn("success")} onClick={() => setAprobado(true)}>✓ Aprobar y enviar al ciudadano</button>
                  <button style={s.btn("ghost")}>Guardar borrador</button>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>✓ Respuesta aprobada — bitácora de ediciones registrada</p>
              )}
            </>
          ) : (
            <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 22, textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>
              Sin borrador — caso pendiente de decisión de acumulación M4.<br />Resuelva primero en la pestaña Resumen.
            </div>
          )}
        </div>
      )}

      {tab === "trazabilidad" && (
        <div>
          {logRows.map((r, i) => (
            <div key={i} style={s.logRow}>
              <span style={{ color: "#9CA3AF", minWidth: 52 }}>{r[0]}</span>
              <span style={{ color: "#1F4E79", fontWeight: 700, minWidth: 25 }}>{r[1]}</span>
              <span style={{ color: "#374151" }}>{r[2]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dashboard M8 ───────────────────────────────────────────────────────
function DashboardM8() {
  const m = METRICAS;
  return (
    <div>
      <h3 style={{ fontSize: 13, color: "#1F4E79", marginBottom: 3 }}>Analítica operativa y de derechos · M8</h3>
      <p style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 14 }}>
        Corpus sintético N={m.n.toLocaleString()} · Piloto URAB 90 días simulados · Datos declarados como sintéticos (LSL2026)
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <MetricCard label="Tiempo mediano de triage" asis={m.tri_a} tobe={m.tri_t} unidad="h" mejora="−85%" />
        <MetricCard label="Urgentes con triage tardío >8h" asis={m.urg_a} tobe={m.urg_t} unidad="%" mejora="−92%" />
        <MetricCard label="Doble registro IRIS / VisionWeb" asis={m.dr_a} tobe={m.dr_t} unidad="%" mejora="−93%" />
        <MetricCard label="Ratio carga máx / mín profesionales" asis={m.rc_a} tobe={m.rc_t} unidad="x" mejora="−73%" />
      </div>

      <div style={s.roiBox}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>ROI institucional — argumento central del pitch</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["Horas/año liberadas", `${m.horas.toLocaleString()} h`, "#1E40AF"],
            ["FTE equivalente", `${m.fte} FTE`, "#1E40AF"],
            ["Urgentes adicionales atendidos a tiempo/año", `+${m.urg_add.toLocaleString()}`, "#15803D"],
            ["Horas redirigidas a gestión misional", "13.320 h", "#15803D"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "#6B7280", marginBottom: 2, lineHeight: 1.4 }}>{l}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: c, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Calidad del modelo M2 · Benchmark Claude Sonnet 4.6</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            ["Precisión M2", `${m.prec}%`, "#1F4E79"],
            ["HITL recall urgentes", `${m.recall}%`, "#15803D"],
            ["Detección duplicados M4", `${m.dup}%`, "#1F4E79"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 2, lineHeight: 1.4 }}>{l}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: c, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#F0FDF4", border: "1px solid #22C55E", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#15803D", fontWeight: 600 }}>🟢 Drift: VERDE</span>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>Próxima evaluación mensual: 14/07/2026 · HITL recall = 100% es no negociable</span>
        </div>
      </div>
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("bandeja");
  const [caso, setCaso] = useState(null);

  return (
    <div style={s.wrap}>
      <div style={s.hdr}>
        <div>
          <div style={s.hdrL}>GOV.CO · DEFENSORÍA DEL PUEBLO · URAB-AI</div>
          <div style={s.hdrH}>Panel de profesionales · Unidad de Recepción y Análisis</div>
        </div>
        <div style={s.hdrR}>
          <strong style={{ color: "#fff" }}>Ana Torres</strong> · P01 · VBG / NNA<br />
          Carga actual: 847 casos · LSL2026
        </div>
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === "bandeja")} onClick={() => { setTab("bandeja"); setCaso(null); }}>📋 Bandeja de casos</button>
        <button style={s.tab(tab === "dashboard")} onClick={() => setTab("dashboard")}>📊 Dashboard M8</button>
      </div>

      <div style={s.card}>
        {tab === "bandeja" && !caso && <Bandeja onSeleccionar={setCaso} />}
        {tab === "bandeja" && caso && <DetalleCaso caso={caso} onVolver={() => setCaso(null)} />}
        {tab === "dashboard" && <DashboardM8 />}
      </div>

      <p style={{ textAlign: "center", fontSize: 10, color: "#9CA3AF", marginTop: 12 }}>
        © 2026 Defensoría del Pueblo · Directiva 007/2025 · CONPES 4144 · Ley 1581/2012 · NIST AI RMF
      </p>
    </div>
  );
}
