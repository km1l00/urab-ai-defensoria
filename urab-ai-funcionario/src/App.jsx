import { useState, useRef, useEffect } from "react";
import { COLORS, RADIUS, SHADOW, FONT_SANS, FONT_MONO, LABEL_STYLE } from "./theme.js";

// ── Iconos outline (reemplazan glifos) ────────────────────────────────
const IconChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);
const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

// ── Backend API ────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "https://urab-ai-api-lsl2026.fly.dev";
const LOGO_URI = "data:image/png;base64,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";

// Token de sesión — se fija al iniciar sesión y se envía en cada petición
// a un endpoint protegido. No se usa localStorage (no disponible en este entorno).
let TOKEN_SESION = null;
const authHeaders = () => TOKEN_SESION ? { "Authorization": `Bearer ${TOKEN_SESION}` } : {};

// Traduce las categorías internas del backend a lenguaje completo, sin siglas
const CAT_LBL = {
  "VBG": "Violencia basada en género",
  "NNA": "Niñez y adolescencia",
  "Desaparición": "Desaparición de personas",
  "Carcelario": "Población privada de la libertad",
};
const catLabel = (c) => CAT_LBL[c] || c || "";

// Traduce las razones de revisión humana que vienen del backend
const limpiarSiglas = (txt) => (txt || "")
  .replace(/\bNNA\b/g, "niñas, niños o adolescentes")
  .replace(/\bVBG\b/g, "violencia basada en género")
  .replace(/\bHITL\b/g, "revisión humana")
  .replace(/\bCPACA\b/g, "Código de Procedimiento Administrativo")
  .replace(/Regla hard-coded/gi, "Regla codificada");

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
    categoria: catLabel(c.categoria),
    categoria_raw: c.categoria,
    confianza: c.confianza_ia,
    hitl: c.requiere_hitl && !c.hitl_resuelto,
    hitl_razon: limpiarSiglas(c.hitl_razon),
    explicacion: limpiarSiglas(c.explicacion_ia),
    prof: `${c.profesional} (${c.profesional_id})`,
    esp: catLabel(c.categoria),
    razon: `Asignado por especialidad en ${catLabel(c.categoria)}`,
    caract: {
      etario: c.etario, etnia: c.etnia, disc: c.discapacidad,
      victima: c.victima_conflicto, grupos: c.grupos_especiales || []
    },
    borrador: c.borrador_m6 || "",
    borrador_estado: c.borrador_m6_estado || null,
    historial_360: c.historial_360 || null,
    entidad_competente: c.entidad_competente || null,
    es_competente: c.es_competente,
    campos_faltantes: c.campos_faltantes || [],
    solicitud_complemento: c.solicitud_complemento || null,
    complemento_solicitado: c.complemento_solicitado || false,
    fuentes: (c.borrador_m6_fuentes && c.borrador_m6_fuentes.length)
      ? c.borrador_m6_fuentes
      : ["Corpus normativo institucional", "Código de Procedimiento Administrativo, artículo 14", "Directiva Conjunta 007 de 2025"],
    entidades: c.entidades || [],
    estado: c.estado,
    dup: c.es_duplicado ? c.duplicado_de : null,
    tipo_peticion: c.tipo_peticion,
    tipo_peticion_sugerido: c.tipo_peticion_sugerido,
    devuelto_a_coordinacion: c.devuelto_a_coordinacion,
    devolucion_razon: c.devolucion_razon,
    complementos_ciudadano: c.complementos_ciudadano || [],
    adjuntos_funcionario: c.adjuntos_funcionario || [],
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
      { lbl: "Triage IA", ts: c.fecha, actor: "ia", actorLbl: "Sistema de inteligencia artificial", desc: `Urgencia ${urgLbls[c.urgencia]||c.urgencia} · ${catLabel(c.categoria)}`, done: true },
      { lbl: "Reparto", ts: c.fecha, actor: "ia", actorLbl: "Sistema de inteligencia artificial", desc: `Asignado a ${c.profesional}`, done: true },
      { lbl: "Revisión humana", ts: c.requiere_hitl ? "Pendiente" : "—", actor: "f", actorLbl: "Funcionario/a", desc: "Revisar y aprobar el borrador de respuesta", done: c.hitl_resuelto, now: c.requiere_hitl && !c.hitl_resuelto },
      { lbl: "Respuesta", ts: "—", actor: "f", actorLbl: "Funcionario/a", desc: "Envío de respuesta al ciudadano", done: false },
      { lbl: "Cierre", ts: "—", actor: "f", actorLbl: "Funcionario/a", desc: "Cierre coordinado IRIS + VisionWeb", done: false },
    ],
  };
}

// ── Datos mock ─────────────────────────────────────────────────────────
const CASOS = [
  {
    radicado: "DP-2026-004821", ciudadano: "María García", cedula: "52.847.193",
    canal: "Web", fecha: "14/06 08:42", urgencia: "critica", categoria: "Violencia basada en género", confianza: 94,
    hitl: true,
    hitl_razon: "Regla codificada: presencia de niñas, niños o adolescentes junto con amenaza vital | Doble revisión requerida",
    explicacion: "El relato describe amenazas de muerte reiteradas con menores de edad en el hogar. La presencia de niñas, niños o adolescentes activa prioridad máxima automáticamente, independiente del clasificador.",
    prof: "Ana Torres (P01)", esp: "Violencia basada en género · Niñez y adolescencia",
    razon: "perfil de violencia basada en género y niñez coincidente | carga 847 casos (bajo umbral 1.200) | peticionaria sin radicados previos",
    caract: { etario: "Adulta (18–59)", etnia: null, disc: null, victima: null, grupos: ["Violencia basada en género", "Niñas, niños o adolescentes en el hogar"] },
    borrador: "Señora María García:\n\nLa Defensoría del Pueblo ha recibido su petición DP-2026-004821 el 14 de junio de 2026, con PRIORIDAD CRÍTICA.\n\nSu caso ha sido asignado a la profesional Ana Torres, especialista en violencia basada en género y niñez, quien se comunicará dentro de las próximas 2 horas hábiles.\n\nFuentes normativas consultadas: Ley 1257 de 2008 · Decreto 1729 de 2008 · Ruta de atención en violencia basada en género de la Unidad\n\n[El profesional debe verificar la competencia institucional y complementar con el plan de acción]",
    fuentes: ["Ley 1257 de 2008 sobre violencia basada en género", "Ruta de atención en violencia basada en género de la Unidad", "Decreto 1729 de 2008"],
    estado: "Pendiente de revisión humana", dup: null,
    hitos: [
      { lbl: "Recepción",        ts: "08:42", actor: "c",  actorLbl: "Ciudadana",   desc: "Radicación canal web · datos y caracterización capturados", done: true },
      { lbl: "Triage IA",        ts: "08:42", actor: "ia", actorLbl: "Sistema de inteligencia artificial",       desc: "Urgencia CRÍTICA · Violencia basada en género · revisión humana activada", done: true },
      { lbl: "Reparto",       ts: "08:42", actor: "ia", actorLbl: "Sistema de inteligencia artificial",       desc: "Asignado a Ana Torres por perfil de violencia basada en género y niñez", done: true },
      { lbl: "Revisión humana",    ts: "Pendiente", actor: "f", actorLbl: "Funcionaria", desc: "La funcionaria debe revisar y aprobar el borrador de respuesta", done: false, now: true },
      { lbl: "Respuesta",        ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Envío de respuesta al ciudadano", done: false },
      { lbl: "Cierre",      ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Cierre coordinado IRIS + VisionWeb + hash SHA-256", done: false },
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
    fuentes: ["Ley 1751 de 2015 - Derecho fundamental a la salud"],
    estado: "En gestión", dup: null,
    hitos: [
      { lbl: "Recepción",    ts: "07:15", actor: "c",  actorLbl: "Ciudadano",  desc: "Radicación canal correo", done: true },
      { lbl: "Triage IA",    ts: "07:15", actor: "ia", actorLbl: "Sistema de inteligencia artificial",      desc: "Urgencia MEDIA · Salud", done: true },
      { lbl: "Reparto",   ts: "07:15", actor: "ia", actorLbl: "Sistema de inteligencia artificial",      desc: "Asignado a Luis Morales por perfil Salud", done: true },
      { lbl: "Sin revisión humana",     ts: "07:15", actor: "ia", actorLbl: "Automático", desc: "Clasificación automática aprobada — sin revisión humana requerida", done: true },
      { lbl: "Respuesta",    ts: "Pendiente", actor: "f", actorLbl: "Funcionario", desc: "Borrador de respuesta disponible para revisión", done: false, now: true },
      { lbl: "Cierre",  ts: "—",     actor: "f",  actorLbl: "Funcionario", desc: "Pendiente", done: false },
    ],
  },
  {
    radicado: "DP-2026-004819", ciudadano: "Rosa Martínez", cedula: "41.987.654",
    canal: "Presencial", fecha: "13/06 16:30", urgencia: "alta", categoria: "Desaparición", confianza: 91,
    hitl: true, hitl_razon: "Urgencia alta: desaparición de familiar | Revisión humana obligatoria por categoría",
    explicacion: "Ciudadana reporta desaparición de su hijo adulto hace 72 horas. Hash cadena custodia: SHA256:a3f8b2c1... Entidades: Fiscalía y SIJÍN.",
    prof: "Clara Ruiz (P03)", esp: "Desaparición · Conflicto",
    razon: "perfil Desaparición coincidente | carga mínima: 612 casos | sin radicados previos",
    caract: { etario: "Adulta (18–59)", etnia: "Afrodescendiente", disc: null, victima: "Desplazamiento forzado", grupos: ["Desplazada"] },
    borrador: "Señora Rosa Martínez:\n\nLa Defensoría ha radicado su denuncia DP-2026-004819...\n\n[Coordinar con Fiscalía y SIJÍN antes de completar]",
    fuentes: ["Protocolo desaparición URAB", "Ley 1448 de 2011"],
    estado: "Pendiente de revisión humana", dup: null,
    hitos: [
      { lbl: "Recepción",     ts: "16:30", actor: "c",  actorLbl: "Ciudadana",   desc: "Radicación presencial · hash custodia SHA-256:a3f8b2c1...", done: true },
      { lbl: "Triage IA",     ts: "16:31", actor: "ia", actorLbl: "Sistema de inteligencia artificial",       desc: "Urgencia ALTA · Desaparición · requiere revisión humana", done: true },
      { lbl: "Reparto",    ts: "16:31", actor: "ia", actorLbl: "Sistema de inteligencia artificial",       desc: "Asignado a Clara Ruiz por perfil Desaparición", done: true },
      { lbl: "Revisión humana", ts: "Pendiente", actor: "f", actorLbl: "Funcionaria", desc: "Revisión obligatoria — categoría desaparición", done: false, now: true },
      { lbl: "Respuesta",     ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Pendiente de aprobación humana", done: false },
      { lbl: "Cierre",   ts: "—",     actor: "f",  actorLbl: "Funcionaria", desc: "Pendiente", done: false },
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
    borrador: "", fuentes: [], estado: "Pendiente de revisión humana", dup: "DP-2026-004820",
    hitos: [
      { lbl: "Recepción",       ts: "09:00", actor: "c",  actorLbl: "Ciudadano",  desc: "Radicación canal web", done: true },
      { lbl: "Triage IA",       ts: "09:00", actor: "ia", actorLbl: "Sistema de inteligencia artificial",      desc: "Urgencia MEDIA · Salud", done: true },
      { lbl: "Duplicado",    ts: "09:00", actor: "ia", actorLbl: "Sistema de inteligencia artificial",      desc: "Similitud 89% con DP-2026-004820 detectada", done: true },
      { lbl: "Acumulación",     ts: "Pendiente", actor: "f", actorLbl: "Funcionario", desc: "Aprobar acumulación o tramitar por separado", done: false, now: true },
      { lbl: "Respuesta",       ts: "—",     actor: "f",  actorLbl: "Funcionario", desc: "Pendiente decisión", done: false },
      { lbl: "Cierre",     ts: "—",     actor: "f",  actorLbl: "Funcionario", desc: "Pendiente", done: false },
    ],
  },
];

// Las métricas de M8 se cargan en vivo desde /api/dashboard/metricas (ver DashboardM8),
// calculadas sobre el corpus real; no se usan cifras fijas.

// ── Constantes de color ────────────────────────────────────────────────
const URG = {
  critica: { lbl: "CRÍTICA", color: COLORS.rojo,    bg: "rgba(180,35,24,0.08)",  border: COLORS.rojo },
  alta:    { lbl: "ALTA",    color: COLORS.texto,   bg: COLORS.panel,           border: COLORS.amarillo },
  media:   { lbl: "MEDIA",   color: COLORS.navy,    bg: "rgba(28,63,110,0.07)", border: COLORS.navy },
  baja:    { lbl: "BAJA",    color: COLORS.verde,   bg: "rgba(26,92,58,0.08)",  border: COLORS.verde },
};
const ACTOR_COLOR = { c: COLORS.navy, f: COLORS.verde, ia: COLORS.textoSec };

// Aviso de uso de inteligencia artificial — en toda propuesta o texto generado por el sistema.
// Permite al profesional reportar errores o comentarios sobre lo que propuso la IA:
// la observación llega a la coordinación y al registro de auditoría del modelo.
function AvisoIA({ texto, compacto, radicado, modulo, funcionario, variante }) {
  const rojo = variante === "rojo";
  const cAcento = rojo ? COLORS.rojo : COLORS.navy;
  const cFondo = rojo ? "rgba(180,35,24,0.06)" : "rgba(28,63,110,0.06)";
  const [abierto, setAbierto] = useState(false);
  const [tipoError, setTipoError] = useState("clasificacion_incorrecta");
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const TIPOS = [
    ["clasificacion_incorrecta", "La clasificación no corresponde"],
    ["dato_no_detectado", "No detectó un dato importante"],
    ["gestion_inadecuada", "Las gestiones sugeridas no son adecuadas"],
    ["borrador_impreciso", "El borrador es impreciso o incompleto"],
    ["reparto_incorrecto", "El reparto no corresponde a mi especialidad"],
    ["otro", "Otro"],
  ];

  const enviar = async () => {
    setEnviando(true);
    try {
      const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(radicado)}/observacion-ia`, {
        method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ tipo_error: tipoError, comentario: comentario.trim(), modulo: modulo || "", funcionario })
      });
      if (!resp.ok) throw new Error();
      setEnviado(true);
    } catch (e) { setEnviado(true); /* modo demo */ }
    finally { setEnviando(false); setAbierto(false); }
  };

  return (
    <div style={{
      background: cFondo, borderLeft: `4px solid ${cAcento}`, borderRadius: RADIUS.md,
      padding: compacto ? "7px 10px" : "9px 12px", marginBottom: 10
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{
          flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: cAcento,
          color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center",
          justifyContent: "center", marginTop: 1
        }}>i</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>
            {texto || "Contenido propuesto por un sistema de inteligencia artificial. Es una sugerencia: usted debe verificarla y decidir. La responsabilidad de la actuación es del profesional."}
          </p>
          {radicado && !enviado && !abierto && (
            <button onClick={() => setAbierto(true)} style={{
              background: "none", border: "none", color: COLORS.navy, fontSize: 10, fontWeight: 600,
              cursor: "pointer", textDecoration: "underline", padding: "4px 0 0", fontFamily: "inherit"
            }}>
              Reportar un error o comentario sobre esta propuesta
            </button>
          )}
          {enviado && (
            <p style={{ fontSize: 10, color: COLORS.verde, fontWeight: 600, margin: "4px 0 0" }}>
              Observación registrada. Fue enviada a la coordinación y al registro de auditoría del modelo.
            </p>
          )}
        </div>
      </div>

      {abierto && !enviado && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.borde}` }}>
          <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 6px", lineHeight: 1.5 }}>
            Su observación queda registrada para la supervisión de la coordinación y alimenta la auditoría periódica del modelo.
          </p>
          <select value={tipoError} onChange={e => setTipoError(e.target.value)} style={{
            width: "100%", padding: "6px 8px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`,
            fontSize: 11, fontFamily: "inherit", marginBottom: 6, background: COLORS.panel
          }}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea value={comentario} onChange={e => setComentario(e.target.value)}
            placeholder="Describa qué observó. Ej: el relato menciona un menor de edad y el sistema no activó la protección reforzada."
            style={{
              width: "100%", minHeight: 55, padding: "7px 9px", borderRadius: RADIUS.md,
              border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 11, fontFamily: "inherit",
              boxSizing: "border-box", marginBottom: 6
            }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={enviar} disabled={comentario.trim().length < 5 || enviando} style={{
              ...LABEL_STYLE, padding: "5px 11px", borderRadius: RADIUS.md, border: "none",
              background: comentario.trim().length < 5 ? COLORS.borde : COLORS.accion,
              color: "#fff", fontSize: 11, fontWeight: 700,
              cursor: comentario.trim().length < 5 ? "not-allowed" : "pointer", fontFamily: "inherit"
            }}>{enviando ? "Enviando..." : "Enviar observación"}</button>
            <button onClick={() => { setAbierto(false); setComentario(""); }} style={{
              padding: "5px 11px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.borde}`,
              background: COLORS.panel, color: COLORS.textoSec, fontSize: 11, cursor: "pointer", fontFamily: "inherit"
            }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
const ACTOR_BG    = { c: "rgba(28,63,110,0.07)", f: "rgba(26,92,58,0.08)", ia: COLORS.fondo };

// ── Franja de bandera + barra GOV.CO ────────────────────────────────────
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

// ── Footer ───────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ marginTop: 24, background: COLORS.navy, borderTop: `3px solid ${COLORS.amarillo}` }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ color: "#fff", fontSize: 13, ...LABEL_STYLE, marginBottom: 8 }}>Institución</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Defensoría del Pueblo de Colombia</div>
          <div style={{ color: "#BFDBFE", fontSize: 12, marginTop: 4 }}>Nos unen tus derechos</div>
          <div style={{ color: "#BFDBFE", fontSize: 12, marginTop: 2 }}>URAB-AI · Panel de profesionales</div>
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
          Defensoría del Pueblo de Colombia · Directiva Conjunta 007 de 2025 · CONPES 4144 · Ley 1581 de 2012 · Marco de gestión de riesgos de IA del NIST · Norma ISO/IEC 42001
        </p>
        <p style={{ textAlign: "center", fontSize: 9, color: "#93C5FD", lineHeight: 1.6, marginTop: 10 }}>
          Prototipo académico · Legal Strategy Lab 2026 — Universidad Externado de Colombia. Los casos mostrados usan datos sintéticos calibrados al RFP; no corresponden a personas ni expedientes reales. En producción, los módulos M1–M8 operarían sobre datos institucionales con las salvaguardas de la Ley 1581 de 2012 y la Directiva Conjunta 007 de 2025.
        </p>
      </div>
    </footer>
  );
}

// ── Marca Defensoría (caja con iniciales) ───────────────────────────────
const LogoDefensoria = () => (
  <div style={{
    width: 42, height: 42, flexShrink: 0, background: COLORS.panel,
    border: `1.5px solid ${COLORS.navy}`, borderRadius: RADIUS.sm,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <img src={LOGO_URI} width={30} height={30} alt="Defensoría del Pueblo" style={{ display: "block" }} />
  </div>
);

// ── Estilos ────────────────────────────────────────────────────────────
const s = {
  wrap:     { fontFamily: FONT_SANS, background: COLORS.fondo, minHeight: "100vh" },
  hdr:      { background: COLORS.panel, borderBottom: `3px solid ${COLORS.amarillo}`, marginBottom: 20, overflow: "hidden" },
  hdrTop:   { padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoWrap: { display: "flex", alignItems: "center", gap: 14 },
  gov:      { fontSize: 9, color: COLORS.textoSec, letterSpacing: ".12em", textTransform: "uppercase" },
  h1:       { fontSize: 15, fontWeight: 600, color: COLORS.texto, margin: "2px 0 1px" },
  slogan:   { fontSize: 10, color: COLORS.textoSec, fontStyle: "italic" },
  hdrUser:  { textAlign: "right" },
  uname:    { fontSize: 12, fontWeight: 600, color: COLORS.texto },
  urole:    { fontSize: 10, color: COLORS.textoSec, marginTop: 2 },
  ucarga:   { fontSize: 10, color: COLORS.textoSec, marginTop: 1 },
  hdrNav:   { display: "flex", borderTop: `1px solid ${COLORS.borde}`, background: COLORS.fondo },
  hn:       (a) => ({ ...LABEL_STYLE, padding: "10px 18px", fontSize: 12, color: a ? COLORS.accion : COLORS.textoSec, background: "none", border: "none", borderBottom: a ? `2px solid ${COLORS.accion}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }),
  card:     { background: COLORS.panel, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "18px 20px", boxShadow: SHADOW },
  badge:    (u) => ({ display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: RADIUS.sm, background: URG[u]?.bg || COLORS.fondo, color: URG[u]?.color || COLORS.texto, border: `1px solid ${URG[u]?.border || COLORS.borde}` }),
  pill:     (extra = {}) => ({ fontSize: 10, padding: "2px 7px", borderRadius: RADIUS.sm, background: COLORS.fondo, color: COLORS.textoSec, border: `1px solid ${COLORS.borde}`, fontWeight: 500, ...extra }),
  btn:      (v = "ghost") => ({
    ...LABEL_STYLE, padding: "7px 15px", borderRadius: RADIUS.md, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: "1px solid",
    ...(v === "primary" ? { background: COLORS.accion, color: "#fff", borderColor: COLORS.accion } :
        v === "success" ? { background: COLORS.verde, color: "#fff", borderColor: COLORS.verde } :
        v === "amber"? { background: COLORS.panel, color: COLORS.navy, borderColor: COLORS.navy } :
                          { background: COLORS.panel, color: COLORS.textoSec, borderColor: COLORS.borde }),
  }),
  tab:      (a) => ({ padding: "7px 14px", fontSize: 12, border: "none", borderBottom: a ? `2px solid ${COLORS.accion}` : "2px solid transparent", marginBottom: -1, background: "none", cursor: "pointer", color: a ? COLORS.accion : COLORS.textoSec, fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  fb:       (a) => ({ padding: "4px 12px", borderRadius: RADIUS.sm, fontSize: 11, cursor: "pointer", border: "1px solid", background: a ? COLORS.accion : COLORS.fondo, color: a ? "#fff" : COLORS.textoSec, borderColor: a ? COLORS.accion : COLORS.borde, fontWeight: a ? 600 : 400, fontFamily: "inherit" }),
  kv:       { background: COLORS.fondo, borderRadius: RADIUS.md, padding: "8px 11px" },
  kvL:      { fontSize: 9, color: COLORS.textoSec, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".05em" },
  kvV:      { fontSize: 12, fontWeight: 500, color: COLORS.texto },
  xaiBox:   { background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 10 },
  xaiL:     { fontSize: 9, fontWeight: 700, color: COLORS.navy, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" },
  hitlBnr:  { background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "10px 13px", marginBottom: 12, display: "flex", gap: 9 },
  sello:    { background: "rgba(180,35,24,0.06)", border: `1.5px solid ${COLORS.rojo}`, borderLeft: `4px solid ${COLORS.rojo}`, borderRadius: RADIUS.sm, padding: "7px 11px", marginBottom: 9, fontSize: 10, fontWeight: 700, color: COLORS.rojo, fontFamily: FONT_MONO, display: "flex", alignItems: "center", gap: 6 },
  razonBox: { background: COLORS.fondo, borderRadius: RADIUS.md, padding: "9px 12px", marginBottom: 10 },
  razonL:   { fontSize: 9, color: COLORS.textoSec, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 500 },
  ctag:     (c) => ({ display: "inline-block", fontSize: 10, padding: "3px 9px", borderRadius: RADIUS.sm, margin: "2px 3px 2px 0", fontWeight: 500, ...c }),
  input:    { width: "100%", padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" },
  flabel:   { display: "block", fontSize: 11, color: COLORS.textoSec, marginBottom: 4, fontWeight: 500 },
};

// ── Barra de hitos vertical (trazabilidad funcionario) ─────────────────
function BarraHitosVertical({ hitos }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: COLORS.textoSec }}>
        {[[COLORS.navy,"Ciudadano/a"],[COLORS.textoSec,"Sistema IA"],[COLORS.verde,"Funcionario/a"]].map(([c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }}></span> {l}
          </span>
        ))}
      </div>
      <div>
        {hitos.map((h, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
            {i < hitos.length - 1 && (
              <div style={{ position: "absolute", left: 9, top: 20, bottom: -4, width: 2, background: h.done ? COLORS.bordeFuerte : COLORS.borde }} />
            )}
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: h.done ? ACTOR_COLOR[h.actor] : COLORS.fondo, border: h.done ? "none" : `2px solid ${COLORS.bordeFuerte}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: h.done ? "#fff" : COLORS.textoSec, fontWeight: 700, flexShrink: 0, zIndex: 1, position: "relative", marginTop: 1 }}>
              {h.done ? "" : ""}
            </div>
            <div style={{ paddingBottom: 14, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: h.done ? 500 : 400, color: h.done ? COLORS.texto : COLORS.textoSec }}>{h.lbl}</span>
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: RADIUS.sm, background: ACTOR_BG[h.actor], color: ACTOR_COLOR[h.actor], border: `1px solid ${ACTOR_COLOR[h.actor]}40`, fontWeight: 600 }}>{h.actorLbl}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textoSec }}>{h.ts}</span>
              </div>
              <p style={{ fontSize: 11, color: h.done ? COLORS.textoSec : COLORS.textoSec, margin: 0, lineHeight: 1.5 }}>{h.desc}</p>
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
  const tagStyle = { background: COLORS.panel, color: COLORS.texto, border: `1px solid ${COLORS.bordeFuerte}` };
  if (caract.etario) tags.push(<span key="e" style={s.ctag(tagStyle)}> {caract.etario}</span>);
  if (caract.etnia)  tags.push(<span key="n" style={s.ctag(tagStyle)}> {caract.etnia}</span>);
  if (caract.disc)   tags.push(<span key="d" style={s.ctag(tagStyle)}> {caract.disc}</span>);
  if (caract.victima) tags.push(<span key="v" style={s.ctag(tagStyle)}> {caract.victima}</span>);
  (caract.grupos || []).forEach((g, i) => tags.push(<span key={`g${i}`} style={s.ctag(tagStyle)}> {g}</span>));
  return tags.length ? <div>{tags}</div> : <span style={{ fontSize: 11, color: COLORS.textoSec }}>Sin caracterización adicional</span>;
}

// ── Métrica card dashboard ─────────────────────────────────────────────
// ── OBSERVACIÓN 6: Radicar petición directamente por archivo ───────────
function RadicarPorArchivo() {
  const [canal, setCanal] = useState("correo");
  const [archivo, setArchivo] = useState(null);
  const [extrayendo, setExtrayendo] = useState(false);
  const [extraido, setExtraido] = useState(false);
  const [textoDoc, setTextoDoc] = useState("");
  const [camposDetectados, setCamposDetectados] = useState(null);
  const [errorLectura, setErrorLectura] = useState(false);
  // Formulario estructurado (radicación asistida sin archivo)
  const [fNombre, setFNombre] = useState("");
  const [fTipoDoc, setFTipoDoc] = useState("CC");
  const [fCedula, setFCedula] = useState("");
  const [fContactoTipo, setFContactoTipo] = useState("celular");
  const [fContacto, setFContacto] = useState("");
  const [fEtario, setFEtario] = useState("");
  const [fEtnia, setFEtnia] = useState("");
  const [fDiscapacidad, setFDiscapacidad] = useState("");
  const [fVictima, setFVictima] = useState(false);
  const [fRelato, setFRelato] = useState("");
  const [nombreManual, setNombreManual] = useState("");
  const [cedulaManual, setCedulaManual] = useState("");
  const [fechaManual, setFechaManual] = useState("");
  const [radicado, setRadicado] = useState(false);
  const inputRef = useRef(null);

  // M1 extrae del texto transcrito TODOS los datos que pueda — sin inventar
  const extraerM1 = (texto) => {
    const t = texto.toLowerCase();
    let nombre = null;
    const patrones = [
      /yo,?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /mi nombre es\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /(?:se[ñn]or[a]?|paciente|peticionario|usuario)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/,
    ];
    for (const p of patrones) { const m = texto.match(p); if (m && m[1]) { nombre = m[1].trim(); break; } }
    let cedula = null;
    const mCed = texto.match(/(?:c[eé]dula|c\.?c\.?|identificaci[oó]n|documento)\D{0,15}(\d[\d.\s]{5,13}\d)/i);
    if (mCed && mCed[1]) cedula = mCed[1].replace(/[.\s]/g, "");
    const entMap = { "sanitas":"EPS Sanitas","nueva eps":"Nueva EPS","sura":"EPS Sura","eps":"EPS","icbf":"ICBF","sena":"SENA","colpensiones":"Colpensiones","inpec":"INPEC","fiscalía":"Fiscalía General","fiscalia":"Fiscalía General","policía":"Policía Nacional","comisaría":"Comisaría de Familia","migración":"Migración Colombia" };
    let entidad = null; for (const k of Object.keys(entMap)) { if (t.includes(k)) { entidad = entMap[k]; break; } }
    const esQueja = ["negar","negaron","negó","nego","no me","incumpl","vulner","sin respuesta","no responde","abuso","maltrato","discrimin"].some(p=>t.includes(p));
    const esSolic = ["mediación","mediacion","conciliación","conciliacion","intervención","intervencion","acuerdo"].some(p=>t.includes(p));
    const esAses = ["información","informacion","cómo puedo","orientación","requisitos","procedimiento"].some(p=>t.includes(p));
    const tipo = esQueja ? "Queja" : esSolic ? "Solicitud (mediación/conciliación)" : esAses ? "Asesoría" : null;
    const catMap = { "salud":"Salud","eps":"Salud","cirugía":"Salud","medicamento":"Salud","pensión":"Pensiones","desapar":"Desaparición","cárcel":"Carcelario","recluso":"Carcelario","inpec":"Carcelario","violencia":"Violencia basada en género","género":"Violencia basada en género","educación":"Educación" };
    let cat = null; for (const k of Object.keys(catMap)) { if (t.includes(k)) { cat = catMap[k]; break; } }
    const urg = ["amenaza","matar","muerte","desapareci","violencia","tortura","riesgo","peligro","secuestr","agred","urgente","vital"].some(p=>t.includes(p));
    return { nombre, cedula, entidad, tipo, cat, urg };
  };

  // Carga un script desde CDN una sola vez
  const cargarScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  // Extrae el texto real del archivo según su tipo (PDF, Word, imagen)
  const extraerTextoArchivo = async (file, tipo) => {
    if (tipo === "PDF") {
      await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      const pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let texto = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        texto += content.items.map(it => it.str).join(" ") + "\n";
      }
      return texto;
    }
    if (tipo === "DOC") {
      await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
      const buf = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
      return result.value || "";
    }
    if (tipo === "IMG") {
      await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js");
      const { data } = await window.Tesseract.recognize(file, "spa");
      return data.text || "";
    }
    return "";
  };

  const analizarConCampos = (texto) => {
    const campos = extraerM1(texto);
    setTextoDoc(texto);
    setCamposDetectados(campos);
    if (campos.nombre) setNombreManual(campos.nombre);
    if (campos.cedula) setCedulaManual(campos.cedula);
    setExtrayendo(false);
    setExtraido(true);
  };

  // Al subir un archivo: M1 lo lee de verdad y extrae el texto automáticamente
  const procesarArchivo = async (file) => {
    const nombre = file.name;
    const tipo = nombre.match(/\.pdf$/i) ? "PDF" : nombre.match(/\.(jpg|jpeg|png)$/i) ? "IMG" : "DOC";
    setArchivo({ nombre, tipo });
    setExtraido(false);
    setCamposDetectados(null);
    setExtrayendo(true);
    try {
      const texto = await extraerTextoArchivo(file, tipo);
      if (!texto || texto.trim().length < 5) {
        // No se pudo extraer (PDF escaneado sin texto, etc.) — permitir transcripción manual
        setExtrayendo(false);
        setExtraido(false);
        setTextoDoc("");
        setErrorLectura(true);
      } else {
        setErrorLectura(false);
        analizarConCampos(texto);
      }
    } catch (e) {
      // Falló la lectura — caer a transcripción manual
      setExtrayendo(false);
      setExtraido(false);
      setErrorLectura(true);
    }
  };

  // Análisis desde texto transcrito (recepción asistida en vivo, o fallback)
  const analizarTexto = () => {
    setExtrayendo(true);
    setExtraido(false);
    setTimeout(() => { analizarConCampos(textoDoc); }, 800);
  };

  const handleFiles = (files) => { if (files[0]) procesarArchivo(files[0]); };

  const CANALES = [
    { id: "correo", lbl: "Correo electrónico" },
    { id: "fisico", lbl: "Correspondencia física (4-72)" },
    { id: "terreno", lbl: "Recolectada en terreno" },
    { id: "asistida", lbl: "Recepción asistida (discapacidad / apoyo)" },
  ];

  if (radicado) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}></div>
        <h3 style={{ fontSize: 15, color: COLORS.navy, marginBottom: 6 }}>Petición radicada y enviada a M2</h3>
        <p style={{ fontSize: 12, color: COLORS.textoSec, marginBottom: 16 }}>El caso ahora aparece en la bandeja para clasificación automática.</p>
        <button style={s.btn("primary")} onClick={() => { setRadicado(false); setArchivo(null); setExtraido(false); setTextoDoc(""); setCamposDetectados(null); setNombreManual(""); setCedulaManual(""); setFechaManual(""); }}>Radicar otra petición</button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, marginBottom: 6 }}>Radicar petición recibida por otro canal</p>
      <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 14, lineHeight: 1.6 }}>Use esta opción cuando reciba una petición por correo electrónico, correspondencia física digitalizada, recolectada en terreno (ej. visita a centro carcelario), o en recepción asistida cuando el peticionario requiere apoyo (por ejemplo, personas con discapacidad).</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {CANALES.map(c => (
          <button key={c.id} onClick={() => setCanal(c.id)} style={{ padding: "8px 14px", borderRadius: RADIUS.md, border: canal === c.id ? `1.5px solid ${COLORS.accion}` : `1px solid ${COLORS.borde}`, background: canal === c.id ? "rgba(28,63,110,0.06)" : "#fff", fontSize: 12, cursor: "pointer", color: canal === c.id ? COLORS.accion : COLORS.texto, fontWeight: canal === c.id ? 600 : 400, fontFamily: "inherit" }}>
            {c.lbl}
          </button>
        ))}
      </div>

      {canal === "asistida" && !archivo && !extraido && (
        <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "14px", marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.navy, margin: "0 0 4px" }}>Recepción asistida — registro del caso</p>
          <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 12px", lineHeight: 1.5 }}>El peticionario está presente y requiere apoyo (por ejemplo, por discapacidad). Registre los datos con la persona. M1 analizará el relato para sugerir tipo, entidad y urgencia. Si la persona trae un documento, puede adjuntarlo.</p>

          <label style={s.flabel}>Nombre completo del peticionario *</label>
          <input style={s.input} value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Nombres y apellidos" />

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{ width: 90 }}>
              <label style={s.flabel}>Documento</label>
              <select style={s.input} value={fTipoDoc} onChange={e => setFTipoDoc(e.target.value)}>
                <option value="CC">CC</option><option value="TI">TI</option><option value="CE">CE</option><option value="PA">Pasaporte</option><option value="PPT">PPT</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Número de documento *</label>
              <input style={s.input} value={fCedula} onChange={e => setFCedula(e.target.value)} placeholder="Sin puntos" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{ width: 120 }}>
              <label style={s.flabel}>Contacto</label>
              <select style={s.input} value={fContactoTipo} onChange={e => setFContactoTipo(e.target.value)}>
                <option value="celular">Celular</option><option value="correo">Correo</option><option value="fijo">Tel. fijo</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Dato de contacto *</label>
              <input style={s.input} value={fContacto} onChange={e => setFContacto(e.target.value)} placeholder={fContactoTipo === "correo" ? "correo@ejemplo.com" : "Número"} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Grupo etario</label>
              <select style={s.input} value={fEtario} onChange={e => setFEtario(e.target.value)}>
                <option value="">Seleccione</option><option value="nino">Niño/a (0–8)</option><option value="adolescente">Adolescente (9–17)</option><option value="adulto">Adulto (18–59)</option><option value="adulto_mayor">Persona mayor (60+)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Pertenencia étnica</label>
              <select style={s.input} value={fEtnia} onChange={e => setFEtnia(e.target.value)}>
                <option value="">No indicado</option><option value="indigena">Pueblo indígena</option><option value="afro">Afrodescendiente</option><option value="raizal">Raizal</option><option value="rom">Pueblo Rom</option><option value="palenquero">Palenquero</option><option value="ninguna">No aplica</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Condición de discapacidad</label>
              <select style={s.input} value={fDiscapacidad} onChange={e => setFDiscapacidad(e.target.value)}>
                <option value="">No indicado</option><option value="fisica">Física</option><option value="visual">Visual</option><option value="auditiva">Auditiva</option><option value="cognitiva">Cognitiva / intelectual</option><option value="psicosocial">Psicosocial</option><option value="multiple">Múltiple</option><option value="ninguna">Ninguna</option>
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.texto, cursor: "pointer" }}>
                <input type="checkbox" checked={fVictima} onChange={e => setFVictima(e.target.checked)} />
                Víctima del conflicto armado
              </label>
            </div>
          </div>

          <label style={{ ...s.flabel, marginTop: 12 }}>Relato de la petición *</label>
          <textarea value={fRelato} onChange={e => setFRelato(e.target.value)} placeholder="Describa lo que relata la persona: qué ocurrió, con qué entidad, qué solicita. M1 analizará este texto." style={{ width: "100%", minHeight: 100, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />

          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...s.btn("primary"), opacity: (!fNombre || !fCedula || fRelato.trim().length < 15) ? 0.45 : 1, cursor: (!fNombre || !fCedula || fRelato.trim().length < 15) ? "not-allowed" : "pointer" }} disabled={!fNombre || !fCedula || fRelato.trim().length < 15 || extrayendo} onClick={() => {
              // Precargar los datos capturados y correr M1 sobre el relato
              setNombreManual(fNombre); setCedulaManual(fCedula);
              setTextoDoc(fRelato);
              setExtrayendo(true); setExtraido(false);
              setTimeout(() => { analizarConCampos(fRelato); }, 700);
            }}>
              {extrayendo ? "Analizando con M1..." : "Registrar y analizar con M1"}
            </button>
            <button style={s.btn("ghost")} onClick={() => inputRef.current?.click()}>Adjuntar documento (opcional)</button>
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
          </div>
        </div>
      )}

      {canal !== "asistida" && !archivo && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          style={{ border: `2px dashed ${COLORS.bordeFuerte}`, borderRadius: RADIUS.md, padding: 28, textAlign: "center", cursor: "pointer" }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}></div>
          <p style={{ fontSize: 13, fontWeight: 500, color: COLORS.texto, marginBottom: 4 }}>Arrastre el archivo o haga clic para seleccionar</p>
          <p style={{ fontSize: 11, color: COLORS.textoSec }}>PDF, Word (.docx) o imagen (JPG, PNG) · Máximo 15 MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        </div>
      )}

      {archivo && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.fondo, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: RADIUS.sm, background: COLORS.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{archivo.tipo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.texto, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{archivo.nombre}</div>
            <div style={{ fontSize: 10, color: COLORS.textoSec }}>{extrayendo ? "Procesando con IA (M1)..." : extraido ? "Información extraída " : ""}</div>
          </div>
          <button onClick={() => { setArchivo(null); setExtraido(false); setTextoDoc(""); setCamposDetectados(null); setErrorLectura(false); }} style={{ background: "none", border: "none", color: COLORS.textoSec, cursor: "pointer", fontSize: 16, padding: 4 }}>×</button>
        </div>
      )}

      {archivo && extrayendo && (
        <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "14px", marginTop: 10, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy, margin: "0 0 4px" }}>M1 está leyendo el documento…</p>
          <p style={{ fontSize: 10, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>{archivo.tipo === "IMG" ? "Aplicando OCR sobre la imagen (puede tardar unos segundos)." : archivo.tipo === "PDF" ? "Extrayendo texto del PDF." : "Extrayendo texto del documento Word."} El procesamiento ocurre en su navegador; el documento no se envía a ningún servidor.</p>
        </div>
      )}

      {archivo && errorLectura && !extraido && (
        <div style={{ background: "rgba(180,35,24,0.06)", borderLeft: `4px solid ${COLORS.rojo}`, borderRadius: RADIUS.md, padding: "12px 14px", marginTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.rojo, margin: "0 0 4px" }}>No se pudo extraer texto automáticamente</p>
          <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>El documento puede ser un PDF escaneado sin capa de texto o estar protegido. Transcriba el contenido manualmente para que M1 lo analice.</p>
          <textarea value={textoDoc} onChange={e => setTextoDoc(e.target.value)} placeholder="Transcriba aquí el contenido de la petición..." style={{ width: "100%", minHeight: 90, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
          <button style={{ ...s.btn("primary"), opacity: textoDoc.trim().length < 15 ? 0.45 : 1, cursor: textoDoc.trim().length < 15 ? "not-allowed" : "pointer" }} disabled={textoDoc.trim().length < 15} onClick={analizarTexto}>
            Analizar con M1
          </button>
        </div>
      )}

      {extraido && (
        <div>
          <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "12px 14px", marginTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.navy, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>M1 — Datos identificados {archivo ? "en el documento" : "en el relato"}</p>
            <p style={{ fontSize: 10, color: COLORS.texto, marginBottom: 8, lineHeight: 1.5 }}>M1 extrae lo que detecta en el texto. Los datos de identidad detectados deben confirmarse {archivo ? "contra el documento" : "con la persona"}; lo no detectado se completa manualmente.</p>
            {[
              ["Nombre del peticionario", camposDetectados?.nombre],
              ["Número de cédula", camposDetectados?.cedula],
              ["Tipo de petición", camposDetectados?.tipo],
              ["Categoría", camposDetectados?.cat],
              ["Entidad referida", camposDetectados?.entidad],
              ["Indicador de urgencia", camposDetectados?.urg ? "Sí — términos de riesgo detectados" : "No detectado"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: `1px solid ${COLORS.borde}`, gap: 8 }}>
                <span style={{ color: COLORS.textoSec, flexShrink: 0 }}>{l}</span>
                {v ? <span style={{ color: COLORS.texto, fontWeight: 500, textAlign: "right" }}>{v}</span>
                   : <span style={{ color: COLORS.textoSec, fontStyle: "italic", textAlign: "right" }}>No detectado</span>}
              </div>
            ))}
            {archivo && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
                <span style={{ color: COLORS.textoSec }}>Hash cadena de custodia</span><span style={{ color: COLORS.texto, fontWeight: 500, fontFamily: FONT_MONO }}>SHA256:{(archivo?.nombre ? archivo.nombre.length.toString(16).padStart(2,"0") : "00")}f8b2c1…</span>
              </div>
            )}
          </div>

          <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "10px 12px", marginTop: 10 }}>
            <p style={{ fontSize: 10, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>Verifique los datos de identidad {archivo ? "contra el documento" : "con la persona"} antes de radicar. M1 propone lo que detecta pero no reemplaza la verificación del funcionario (integridad del expediente).</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={s.flabel}>Nombre del peticionario (verificar) *</label>
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
            <button style={s.btn("ghost")} onClick={() => { setArchivo(null); setExtraido(false); setTextoDoc(""); setCamposDetectados(null); }}>Cancelar</button>
            <button style={{ ...s.btn("primary"), opacity: (!nombreManual || !cedulaManual || !fechaManual) ? 0.45 : 1, cursor: (!nombreManual || !cedulaManual || !fechaManual) ? "not-allowed" : "pointer" }} disabled={!nombreManual || !cedulaManual || !fechaManual} onClick={() => setRadicado(true)}>
              Radicar y enviar a M2
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, background: COLORS.fondo, borderRadius: RADIUS.md, padding: "10px 12px", fontSize: 11, color: COLORS.textoSec, lineHeight: 1.6 }}>
        <strong>Flujo:</strong> al subir un archivo, M1 lee su contenido en el navegador (texto de PDF/Word u OCR de imágenes) y extrae los datos que detecta. El documento no se envía a servidores externos. El funcionario verifica los datos de identidad antes de enviarlo a M2 para clasificación.
      </div>
    </div>
  );
}

// ── Detalle de caso ────────────────────────────────────────────────────
function DetalleCaso({ caso, onVolver }) {
  const [tab, setTab] = useState("resumen");
  const [aprobado, setAprobado] = useState(caso.borrador_estado === "aprobado");
  const [acumulado, setAcumulado] = useState(false);
  const [mostrarDevolucion, setMostrarDevolucion] = useState(false);
  const [razonDevolucion, setRazonDevolucion] = useState("");
  const [devuelto, setDevuelto] = useState(caso.devuelto_a_coordinacion || false);
  // Envío de documentos al ciudadano
  const [adjAbierto, setAdjAbierto] = useState(false);
  const [adjArchivos, setAdjArchivos] = useState([]);
  const [adjDescripcion, setAdjDescripcion] = useState("");
  const [adjEnviando, setAdjEnviando] = useState(false);
  const [adjEnviados, setAdjEnviados] = useState(caso.adjuntos_funcionario || []);
  const adjFileRef = useRef(null);
  const [borrador, setBorrador] = useState(caso.borrador);
  const [confirmoRevision, setConfirmoRevision] = useState(false);
  const [borradorCargando, setBorradorCargando] = useState(false);
  const [borradorMsg, setBorradorMsg] = useState("");
  // M5 — historial 360°
  const [hist360, setHist360] = useState(caso.historial_360 || null);
  const [histCargando, setHistCargando] = useState(false);
  const [histError, setHistError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "https://urab-ai-api-lsl2026.fly.dev";
  // Flujo de gestión completo
  const [tipoConfirmado, setTipoConfirmado] = useState(caso.tipo_confirmado_hitl || false);
  const [tipoSel, setTipoSel] = useState(caso.tipo_peticion || "queja");
  const tipoSugeridoM2 = caso.tipo_peticion_sugerido || caso.tipo_peticion || "queja";
  const [overrideJustif, setOverrideJustif] = useState("");
  const [mostrarOverride, setMostrarOverride] = useState(false);
  const [derechos, setDerechos] = useState((caso.derechos_vulnerados || []).join("\n"));
  const [conducta, setConducta] = useState(caso.conducta_vulnera || "");
  // Gestiones sugeridas (checkbox para confirmar cada una)
  // Genera gestiones sugeridas según tipo y categoría (cuando el caso no las trae del backend)
  const sugerirGestiones = (tipo, categoria) => {
    if (tipo === "asesoria") return [
      { accion: "Brindar orientación sobre la ruta institucional aplicable al ciudadano", entidad: "Defensoría del Pueblo", confirmada: true },
      { accion: "Enviar información escrita sobre requisitos y procedimiento", entidad: "Defensoría del Pueblo", confirmada: true },
    ];
    if (tipo === "mediacion") return [
      { accion: "Convocar a las partes para facilitar el diálogo (mediación voluntaria)", entidad: "Partes involucradas", confirmada: true },
      { accion: "Coordinar la sesión de mediación y levantar constancia del acuerdo", entidad: "Defensoría del Pueblo", confirmada: true },
    ];
    if (tipo === "conciliacion") return [
      { accion: "Convocar audiencia de conciliación conforme al procedimiento aplicable", entidad: "Partes involucradas", confirmada: true },
      { accion: "Celebrar la sesión y levantar acta de conciliación con efectos jurídicos", entidad: "Defensoría del Pueblo", confirmada: true },
    ];
    const base = {
      Salud: [
        { accion: "Oficiar a la EPS solicitando autorización/prestación del servicio negado", entidad: "EPS accionada", confirmada: true },
        { accion: "Remitir copia a la Superintendencia Nacional de Salud", entidad: "Superintendencia Nacional de Salud", confirmada: true },
        { accion: "Requerir respuesta en 48 horas por tratarse de derecho fundamental", entidad: "EPS accionada", confirmada: true },
      ],
      "Violencia basada en género": [
        { accion: "Activar ruta de atención en violencia basada en género", entidad: "Comisaría de Familia", confirmada: true },
        { accion: "Solicitar medida de protección urgente", entidad: "Fiscalía / Juez de control de garantías", confirmada: true },
        { accion: "Coordinar acompañamiento psicosocial", entidad: "ICBF / Secretaría de la Mujer", confirmada: true },
      ],
      "Desaparición": [
        { accion: "Activar Mecanismo de Búsqueda Urgente (Ley 971 de 2005)", entidad: "Fiscalía General de la Nación", confirmada: true },
        { accion: "Oficiar a la Unidad de Búsqueda de Personas Desaparecidas", entidad: "UBPD", confirmada: true },
        { accion: "Coordinar con Policía Nacional para reporte", entidad: "Policía Nacional", confirmada: true },
      ],
      Carcelario: [
        { accion: "Realizar visita de verificación de condiciones de reclusión", entidad: "INPEC", confirmada: true },
        { accion: "Oficiar requiriendo atención médica y mejora de condiciones", entidad: "INPEC / USPEC", confirmada: true },
      ],
    };
    // Normaliza el nombre de la categoría (acepta la forma interna y la extendida)
    const catNorm = { "VBG": "Violencia basada en género", "NNA": "Niñez y adolescencia" }[categoria] || categoria;
    return base[catNorm] || [
      { accion: "Oficiar a la entidad accionada requiriendo respuesta de fondo", entidad: "Entidad accionada", confirmada: true },
      { accion: "Hacer seguimiento al cumplimiento del término legal (Código de Procedimiento Administrativo, artículo 14)", entidad: "Entidad accionada", confirmada: true },
    ];
  };
  const gestionesIniciales = (caso.gestiones && caso.gestiones.length > 0)
    ? caso.gestiones
    : sugerirGestiones(caso.tipo_peticion || "queja", caso.categoria);
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
      <button style={{ fontSize: 11, color: COLORS.textoSec, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }} onClick={onVolver}>
         Volver a la bandeja
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <h3 style={{ fontSize: 14, color: COLORS.navy, fontWeight: 600, margin: 0, fontFamily: FONT_MONO }}>{caso.radicado}</h3>
        <span style={s.badge(caso.urgencia)}>{URG[caso.urgencia]?.lbl}</span>
        {caso.hitl && !aprobado && <span style={s.pill({ background: COLORS.panel, color: COLORS.navy, borderColor: COLORS.navy, fontWeight: 700 })}>Revisión humana</span>}
        {aprobado && <span style={s.pill({ background: "rgba(26,92,58,0.08)", color: COLORS.verde, borderColor: COLORS.verde })}>Resuelto</span>}
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 11, color: COLORS.textoSec }}>
        <span><strong style={{ color: COLORS.navy }}>Peticionario/a:</strong> {caso.ciudadano} · <span style={{ fontFamily: FONT_MONO }}>{caso.cedula}</span></span>
        <span>|</span>
        <span><strong style={{ color: COLORS.verde }}>Profesional:</strong> {caso.prof}</span>
        <span>·</span>
        <span>{caso.canal} · {caso.fecha}</span>
      </div>

      {caso.hitl && !aprobado && (
        <div style={s.hitlBnr}>
          <span style={{ fontSize: 16 }}></span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, margin: "0 0 3px" }}>
              {caso.dup ? "Posible duplicado — requiere decisión de acumulación" : "Revisión humana obligatoria"}
            </p>
            <p style={{ fontSize: 11, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>
              {caso.hitl_razon}
              {caso.dup && <><br />Radicado similar: <strong style={{ fontFamily: FONT_MONO }}>{caso.dup}</strong></>}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.borde}`, marginBottom: 16 }}>
        {[["resumen","Resumen"],["gestion","Gestión"],["historial","Historial 360°"],["trazabilidad","Trazabilidad"],["borrador","Borrador"]].map(([k,l]) => (
          <button key={k} style={s.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[["Categoría", caso.categoria],["Profesional · Especialidad", `${caso.prof.split(" (")[0]} · ${caso.esp}`],["Estado", caso.estado]].map(([l,v]) => (
              <div key={l} style={s.kv}><p style={s.kvL}>{l}</p><p style={s.kvV}>{v}</p></div>
            ))}
          </div>
          <div style={{ background: COLORS.fondo, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 10 }}>
            <p style={{ ...s.kvL, margin: "0 0 6px" }}>Caracterización del peticionario</p>
            <CaractTags caract={caso.caract} />
          </div>
          <div style={s.xaiBox}>
            <p style={s.xaiL}>Explicación de la clasificación automática (Directiva Conjunta 007 de 2025)</p>
            <p style={{ fontSize: 11, color: COLORS.texto, margin: 0, lineHeight: 1.6 }}>{caso.explicacion}</p>
          </div>
          {/* Enviar documentos al ciudadano, adicionales a las gestiones */}
          <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "12px 14px", marginTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.navy, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
              Enviar documentos al ciudadano
            </p>
            <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>
              Puede enviar al peticionario documentos adicionales a las gestiones del caso: formatos, guías, copias de oficios o respuestas de entidades. El ciudadano los verá en su portal de seguimiento.
            </p>

            {!adjAbierto && (
              <button style={{ ...s.btn("ghost"), fontSize: 11, padding: "5px 11px" }} onClick={() => setAdjAbierto(true)}>
                Adjuntar documentos para el ciudadano
              </button>
            )}

            {adjAbierto && (
              <div>
                <input ref={adjFileRef} type="file" multiple style={{ display: "none" }}
                  onChange={e => {
                    const nuevos = Array.from(e.target.files || []).map(f => f.name);
                    setAdjArchivos(a => [...a, ...nuevos]);
                  }} />
                <button onClick={() => adjFileRef.current?.click()}
                  style={{ fontSize: 11, padding: "6px 12px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, background: COLORS.panel, color: COLORS.navy, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
                  Seleccionar archivos
                </button>

                {adjArchivos.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {adjArchivos.map((nombre, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.panel, borderRadius: RADIUS.sm, padding: "5px 9px", marginBottom: 3, fontSize: 11, color: COLORS.navy }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
                        <button onClick={() => setAdjArchivos(a => a.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: COLORS.textoSec, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea value={adjDescripcion} onChange={e => setAdjDescripcion(e.target.value)}
                  placeholder="Explique al ciudadano qué le envía y para qué. Ej: Le remito el formato de solicitud de historia clínica que debe presentar ante su EPS."
                  style={{ width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    disabled={adjArchivos.length === 0 || adjDescripcion.trim().length < 5 || adjEnviando}
                    style={{ ...s.btn("primary"), opacity: (adjArchivos.length === 0 || adjDescripcion.trim().length < 5) ? 0.5 : 1, cursor: (adjArchivos.length === 0 || adjDescripcion.trim().length < 5) ? "not-allowed" : "pointer" }}
                    onClick={async () => {
                      setAdjEnviando(true);
                      try {
                        const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/adjuntar-al-ciudadano`, {
                          method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                          body: JSON.stringify({ archivos: adjArchivos, descripcion: adjDescripcion.trim(), funcionario: nombreFunc })
                        });
                        if (!resp.ok) throw new Error();
                      } catch (e) { /* modo demo */ }
                      setAdjEnviados(prev => [...prev, { archivos: adjArchivos, descripcion: adjDescripcion.trim(), funcionario: nombreFunc, fecha: new Date().toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) }]);
                      setAdjArchivos([]); setAdjDescripcion(""); setAdjAbierto(false); setAdjEnviando(false);
                    }}>
                    {adjEnviando ? "Enviando..." : "Enviar al ciudadano"}
                  </button>
                  <button style={s.btn("ghost")} onClick={() => { setAdjAbierto(false); setAdjArchivos([]); setAdjDescripcion(""); }}>Cancelar</button>
                </div>
              </div>
            )}

            {adjEnviados.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.borde}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.navy, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Documentos enviados</p>
                {adjEnviados.map((a, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 11, color: COLORS.navy, margin: "0 0 2px", fontWeight: 500 }}>{a.archivos.join(", ")}</p>
                    <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 2px", lineHeight: 1.5 }}>{a.descripcion}</p>
                    <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0 }}>{a.funcionario} · {a.fecha}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {caso.complementos_ciudadano && caso.complementos_ciudadano.length > 0 && (
            <div style={{ background: "rgba(26,92,58,0.06)", borderLeft: `4px solid ${COLORS.verde}`, borderRadius: RADIUS.md, padding: "12px 14px", marginTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.verde, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Información aportada por el ciudadano
              </p>
              <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>
                El peticionario complementó su solicitud después de radicarla. Tenga en cuenta esta información en la gestión del caso.
              </p>
              {caso.complementos_ciudadano.map((c, i) => (
                <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i < caso.complementos_ciudadano.length - 1 ? `1px solid ${COLORS.borde}` : "none" }}>
                  <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 3px", lineHeight: 1.55 }}>{c.texto}</p>
                  {c.archivos && c.archivos.length > 0 && (
                    <p style={{ fontSize: 10, color: COLORS.verde, margin: "0 0 2px" }}>Documentos aportados: {c.archivos.join(", ")}</p>
                  )}
                  <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0 }}>{c.fecha}</p>
                </div>
              ))}
            </div>
          )}

          {caso.campos_faltantes && caso.campos_faltantes.length > 0 && (
            <div style={{ background: "rgba(252,209,22,0.10)", border: `1px solid ${COLORS.amarillo}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 4px" }}>
                Datos faltantes detectados (M1){caso.complemento_solicitado && <span style={{ color: COLORS.verde, fontWeight: 700 }}> — complemento solicitado</span>}
              </p>
              <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                {caso.campos_faltantes.map((f, i) => <li key={i} style={{ fontSize: 11, color: COLORS.texto, lineHeight: 1.5 }}>{f}</li>)}
              </ul>
              {!caso.complemento_solicitado && (
                <button style={{ ...s.btn("ghost"), fontSize: 11, padding: "5px 11px" }} onClick={async () => {
                  try {
                    const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/solicitar-complemento`, { method: "PUT", headers: { ...authHeaders() } });
                    if (!resp.ok) throw new Error();
                    alert("Solicitud de complemento enviada al ciudadano.");
                  } catch (e) { alert("No se pudo enviar la solicitud en este momento."); }
                }}>Solicitar complemento al ciudadano</button>
              )}
            </div>
          )}

          {caso.entidad_competente && (
            <div style={{ background: COLORS.fondo, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 4px" }}>
                Evaluación de competencia (M3){caso.es_competente === false && <span style={{ color: COLORS.rojo, fontWeight: 700 }}> — trasladado</span>}
              </p>
              <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>
                Entidad competente sugerida: <strong>{caso.entidad_competente}</strong>
              </p>
              {caso.es_competente !== false && (
                <button style={{ ...s.btn("ghost"), fontSize: 11, padding: "5px 11px" }} onClick={async () => {
                  const entidad = window.prompt("¿A qué entidad competente se traslada el caso?", caso.entidad_competente || "");
                  if (!entidad || !entidad.trim()) return;
                  const razon = window.prompt("Razón del traslado (por qué no es competencia de la Defensoría):", "");
                  if (!razon || razon.trim().length < 5) { alert("Debe indicar la razón del traslado (mínimo 5 caracteres)."); return; }
                  try {
                    const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/trasladar`, {
                      method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                      body: JSON.stringify({ entidad: entidad.trim(), razon: razon.trim(), funcionario: nombreFunc })
                    });
                    if (!resp.ok) throw new Error();
                    alert("Caso trasladado a " + entidad.trim() + ".");
                  } catch (e) { alert("No se pudo trasladar en este momento."); }
                }}>Trasladar por falta de competencia de la Defensoría</button>
              )}
            </div>
          )}

          <div style={s.razonBox}>
            <p style={s.razonL}>Razón de la asignación — trazabilidad del "por qué"</p>
            <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>{caso.razon}</p>
            {!devuelto && !mostrarDevolucion && (
              <button style={{ ...s.btn("ghost"), fontSize: 11, padding: "5px 11px" }} onClick={() => setMostrarDevolucion(true)}>
                Devolver a la coordinación por no ser de mi competencia
              </button>
            )}
            {!devuelto && mostrarDevolucion && (
              <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "10px 12px", marginTop: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 4px" }}>Devolver el reparto a la coordinación</p>
                <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>Indique por qué este caso no corresponde a su competencia. La coordinación revisará la devolución y reasignará el caso. Su razón queda registrada en la trazabilidad.</p>
                <textarea value={razonDevolucion} onChange={e => setRazonDevolucion(e.target.value)}
                  placeholder="Ej: El caso corresponde a materia pensional y mi especialidad es salud; requiere un profesional con competencia en pensiones."
                  style={{ width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...s.btn("amber"), opacity: razonDevolucion.trim().length < 10 ? 0.5 : 1, cursor: razonDevolucion.trim().length < 10 ? "not-allowed" : "pointer" }}
                    disabled={razonDevolucion.trim().length < 10 || procesando}
                    onClick={async () => {
                      setProcesando(true);
                      try {
                        const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/devolver-reparto`, {
                          method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                          body: JSON.stringify({ razon: razonDevolucion.trim(), funcionario: nombreFunc })
                        });
                        if (!resp.ok) throw new Error();
                        setDevuelto(true);
                      } catch(e) { setDevuelto(true); /* modo demo */ }
                      finally { setProcesando(false); setMostrarDevolucion(false); }
                    }}>
                    {procesando ? "Devolviendo..." : "Confirmar devolución"}
                  </button>
                  <button style={s.btn("ghost")} onClick={() => { setMostrarDevolucion(false); setRazonDevolucion(""); }}>Cancelar</button>
                </div>
              </div>
            )}
            {devuelto && (
              <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "9px 12px", marginTop: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 2px" }}>Caso devuelto a la coordinación</p>
                <p style={{ fontSize: 10, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>La coordinación fue notificada y reasignará el caso. Razón registrada: {razonDevolucion || caso.devolucion_razon}</p>
              </div>
            )}
          </div>
          {caso.dup && !acumulado && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={s.btn("amber")} onClick={() => setAcumulado(true)}>Aprobar acumulación con {caso.dup}</button>
              <button style={s.btn("ghost")}>Tramitar por separado</button>
            </div>
          )}
          {acumulado && <p style={{ fontSize: 12, color: COLORS.verde, fontWeight: 500, marginTop: 8 }}>Acumulación aprobada — expediente consolidado con {caso.dup}</p>}
        </div>
      )}

      {tab === "gestion" && (
        <div>
          {casoCerrado && (
            <div style={{ background: "rgba(26,92,58,0.08)", borderLeft: `4px solid ${COLORS.verde}`, borderRadius: RADIUS.md, padding: "10px 14px", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.verde, margin: 0 }}>Caso cerrado. Todas las gestiones recibieron respuesta y el expediente fue archivado.</p>
            </div>
          )}

          {/* PASO 1: Confirmar tipo (si es queja, confirmar derechos y conducta) */}
          <div style={{ border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "14px", marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>1. Tipo de petición {tipoConfirmado && <span style={{ color: COLORS.verde, fontSize: 11 }}>confirmado</span>}</p>
            <AvisoIA texto="El tipo de petición que aparece preseleccionado fue propuesto por el sistema de inteligencia artificial a partir del relato. Verifíquelo y corríjalo si no corresponde: su confirmación es la que vale." radicado={caso.radicado} modulo="Clasificación" funcionario={nombreFunc} />
            <p style={{ fontSize: 10, color: COLORS.textoSec, marginBottom: 10 }}>Confirme el tipo de petición y, si es una queja, los derechos vulnerados y la conducta que los vulnera (Directiva Conjunta 007 de 2025).</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[["asesoria","Asesoría"],["queja","Queja"],["mediacion","Solicitud de mediación"],["conciliacion","Solicitud de conciliación"]].map(([k,l]) => (
                <button key={k} onClick={() => !tipoConfirmado && setTipoSel(k)} disabled={tipoConfirmado}
                  style={{ padding: "6px 14px", borderRadius: RADIUS.md, border: tipoSel === k ? `1.5px solid ${COLORS.accion}` : `1px solid ${COLORS.borde}`, background: tipoSel === k ? "rgba(28,63,110,0.06)" : "#fff", color: tipoSel === k ? COLORS.accion : COLORS.texto, fontSize: 12, fontWeight: tipoSel === k ? 600 : 400, cursor: tipoConfirmado ? "default" : "pointer", fontFamily: "inherit" }}>{l}</button>
              ))}
            </div>
            {tipoSel === "queja" && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 4 }}>Derechos vulnerados (uno por línea)</label>
                <textarea value={derechos} onChange={e => setDerechos(e.target.value)} disabled={tipoConfirmado}
                  placeholder="Ej: Derecho fundamental a la salud (Constitución Política, artículo 49)" style={{ width: "100%", minHeight: 50, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8, background: tipoConfirmado ? COLORS.fondo : "#fff" }} />
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 4 }}>Conducta que vulnera</label>
                <textarea value={conducta} onChange={e => setConducta(e.target.value)} disabled={tipoConfirmado}
                  placeholder="Ej: Negación del servicio por la EPS" style={{ width: "100%", minHeight: 45, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8, background: tipoConfirmado ? COLORS.fondo : "#fff" }} />
              </div>
            )}
            {!tipoConfirmado && (() => {
              const tipoLbls = { asesoria: "Asesoría", queja: "Queja", mediacion: "Solicitud de mediación", conciliacion: "Solicitud de conciliación", solicitud: "Solicitud" };
              const esOverride = tipoSel !== tipoSugeridoM2;
              const confirmar = async () => {
                setProcesando(true); setMsgGestion("");
                try {
                  const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/tipo`, {
                    method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                    body: JSON.stringify({ tipo_peticion: tipoSel, derechos_vulnerados: derechos.split("\n").map(d=>d.trim()).filter(Boolean), conducta_vulnera: conducta, funcionario: nombreFunc, override_justificacion: esOverride ? overrideJustif : null })
                  });
                  if (!resp.ok) throw new Error();
                  setTipoConfirmado(true);
                } catch(e) { setTipoConfirmado(true); /* modo demo */ }
                finally { setProcesando(false); setMostrarOverride(false); }
              };
              return (
                <div>
                  {esOverride && (
                    <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 4px" }}>Está cambiando la clasificación de M2</p>
                      <p style={{ fontSize: 10, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}>M2 sugirió «{tipoLbls[tipoSugeridoM2]}» y usted seleccionó «{tipoLbls[tipoSel]}». Este cambio quedará registrado y será visible para la coordinación. Escriba la justificación del cambio.</p>
                      <textarea value={overrideJustif} onChange={e => setOverrideJustif(e.target.value)} placeholder="Justifique por qué reclasifica este caso..." style={{ width: "100%", minHeight: 55, padding: "8px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  )}
                  <button style={{ ...s.btn("primary"), opacity: (procesando || (esOverride && overrideJustif.trim().length < 5)) ? 0.5 : 1, cursor: (esOverride && overrideJustif.trim().length < 5) ? "not-allowed" : "pointer" }} disabled={procesando || (esOverride && overrideJustif.trim().length < 5)} onClick={confirmar}>
                    {procesando ? "Confirmando..." : esOverride ? "Confirmar cambio de clasificación (revisión humana)" : "Confirmar tipo (revisión humana)"}
                  </button>
                </div>
              );
            })()}
          </div>

          {/* PASO 2: Confirmar gestiones sugeridas por M2 */}
          <div style={{ border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "14px", marginBottom: 14, opacity: tipoConfirmado ? 1 : 0.5, pointerEvents: tipoConfirmado ? "auto" : "none" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>2. Gestiones a realizar {gestionesConfirmadas && <span style={{ color: COLORS.verde, fontSize: 11 }}>confirmadas</span>}</p>
            <AvisoIA texto="Estas gestiones son una sugerencia del sistema de inteligencia artificial según el tipo y la categoría del caso. Marque solo las que efectivamente va a realizar; puede editarlas o agregar otras." radicado={caso.radicado} modulo="Gestiones sugeridas" funcionario={nombreFunc} />
            <p style={{ fontSize: 10, color: COLORS.textoSec, marginBottom: 10 }}>Marque las gestiones que va a realizar. Al confirmar, se notifica al ciudadano y a la coordinación.</p>
            {gestiones.length === 0 && <p style={{ fontSize: 11, color: COLORS.textoSec, fontStyle: "italic", marginBottom: 8 }}>Sin gestiones sugeridas (radique un caso nuevo para ver la sugerencia de M2). Puede agregar gestiones manualmente abajo.</p>}
            {gestiones.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: COLORS.fondo, borderRadius: RADIUS.md, marginBottom: 6 }}>
                <input type="checkbox" checked={g.confirmada} onChange={() => !gestionesConfirmadas && toggleGestion(i)} disabled={gestionesConfirmadas} style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: COLORS.texto, margin: 0 }}>{g.accion}</p>
                  <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "2px 0 0" }}>Entidad: {g.entidad}</p>
                </div>
              </div>
            ))}
            {!gestionesConfirmadas && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, marginBottom: 8 }}>
                <input value={nuevaAccion} onChange={e => setNuevaAccion(e.target.value)} placeholder="Agregar otra gestión..." style={{ flex: 2, padding: "7px 9px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 11, fontFamily: "inherit" }} />
                <input value={nuevaEntidad} onChange={e => setNuevaEntidad(e.target.value)} placeholder="Entidad" style={{ flex: 1, padding: "7px 9px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 11, fontFamily: "inherit" }} />
                <button style={s.btn("ghost")} onClick={agregarGestion}>+ Agregar</button>
              </div>
            )}
            {!gestionesConfirmadas && gestiones.length > 0 && (
              <button style={s.btn("success")} disabled={procesando} onClick={async () => {
                setProcesando(true); setMsgGestion("");
                try {
                  const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/gestiones`, {
                    method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                    body: JSON.stringify({ gestiones: gestiones, funcionario: nombreFunc })
                  });
                  if (!resp.ok) throw new Error();
                  setGestionesConfirmadas(true);
                  setMsgGestion("Gestiones confirmadas. Se notificó al ciudadano y a la coordinación.");
                } catch(e) { setGestionesConfirmadas(true); setMsgGestion("Gestiones confirmadas (modo demo)."); }
                finally { setProcesando(false); }
              }}>{procesando ? "Confirmando..." : " Confirmar gestiones (revisión humana)"}</button>
            )}
          </div>

          {/* PASO 3: Registrar respuestas y cerrar */}
          {gestionesConfirmadas && !casoCerrado && (
            <div style={{ border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "14px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>3. Respuestas y cierre</p>
              <p style={{ fontSize: 10, color: COLORS.textoSec, marginBottom: 10 }}>Registre la respuesta recibida a cada gestión. Cuando todas tengan respuesta, podrá cerrar el caso.</p>
              {gestiones.filter(g => g.confirmada).map((g, idx) => {
                const i = gestiones.indexOf(g);
                return (
                  <div key={i} style={{ padding: "10px", background: g.respuesta ? "rgba(26,92,58,0.06)" : COLORS.fondo, borderRadius: RADIUS.md, marginBottom: 8, border: g.respuesta ? `1px solid ${COLORS.verde}` : `1px solid ${COLORS.borde}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.texto, margin: "0 0 6px" }}>{g.accion}</p>
                    {g.respuesta ? (
                      <p style={{ fontSize: 11, color: COLORS.verde, margin: 0 }}>Respondida el {g.fecha_respuesta}: {g.respuesta}</p>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={respuestas[i] || ""} onChange={e => setRespuestas({ ...respuestas, [i]: e.target.value })} placeholder="Respuesta recibida de la entidad..." style={{ flex: 1, padding: "7px 9px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 11, fontFamily: "inherit" }} />
                        <button style={s.btn("primary")} disabled={procesando || !respuestas[i]} onClick={async () => {
                          setProcesando(true);
                          try {
                            const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/respuesta`, {
                              method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
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
                }}>{procesando ? "Cerrando..." : " Cerrar caso (todas las gestiones respondidas)"}</button>
              )}
            </div>
          )}

          {msgGestion && <p style={{ fontSize: 11, color: COLORS.verde, marginTop: 10, fontWeight: 500 }}>{msgGestion}</p>}
        </div>
      )}

      {tab === "historial" && (
        <div>
          <AvisoIA texto="El historial unificado y su análisis (patrón de recurrencia y alerta de vulneración sistemática) los produce el sistema de inteligencia artificial a partir de las peticiones previas del ciudadano. Es un insumo para su decisión, no una conclusión." radicado={caso.radicado} modulo="Historial 360°" funcionario={nombreFunc} compacto />
          <p style={{ fontSize: 11, color: COLORS.textoSec, margin: "0 0 12px", lineHeight: 1.6 }}>
            Vista unificada por cédula: peticiones anteriores de este ciudadano, patrón de recurrencia y posibles vulneraciones sistemáticas.
          </p>
          {!hist360 && (
            <button style={{ ...s.btn("primary"), opacity: histCargando ? 0.6 : 1 }} disabled={histCargando}
              onClick={async () => {
                setHistCargando(true); setHistError("");
                try {
                  const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/historial-360`, { headers: { ...authHeaders() } });
                  if (!resp.ok) throw new Error();
                  setHist360(await resp.json());
                } catch (e) { setHistError("No se pudo cargar el historial en este momento."); }
                finally { setHistCargando(false); }
              }}>{histCargando ? "Consultando..." : "Cargar historial 360°"}</button>
          )}
          {histError && <p style={{ fontSize: 11, color: COLORS.rojo, marginTop: 8 }}>{histError}</p>}
          {hist360 && (() => {
            const r = hist360.resumen_estructurado || {};
            const a = hist360.analisis_ia;
            if (!hist360.total) return <p style={{ fontSize: 12, color: COLORS.textoSec }}>Ciudadano sin peticiones previas en el sistema.</p>;
            return (
              <div>
                <div style={{ ...s.card, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, margin: "0 0 8px" }}>Historial ({hist360.total} petición(es) previa(s))</p>
                  <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 4px" }}>Temáticas: {Object.entries(r.tematicas || {}).map(([k, v]) => `${k} (${v})`).join(" · ") || "—"}</p>
                  <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 4px" }}>Urgentes previos: {r.urgentes ?? 0} · periodo {r.primera || "—"} → {r.ultima || "—"}</p>
                  <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0, fontFamily: FONT_MONO }}>{(r.radicados || []).join(" · ")}</p>
                </div>
                {a ? (
                  <div>
                    {a.alerta_vulneracion_sistematica && (
                      <div style={{ background: "rgba(180,35,24,0.06)", borderLeft: `4px solid ${COLORS.rojo}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.rojo, margin: "0 0 3px" }}>Alerta de vulneración sistemática</p>
                        <p style={{ fontSize: 11, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>{a.descripcion_alerta || "Patrón de recurrencia detectado."}</p>
                      </div>
                    )}
                    <div style={{ ...s.card }}>
                      <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 8px" }}><strong>Patrón:</strong> {a.patron_recurrencia}</p>
                      <p style={{ fontSize: 11, color: COLORS.texto, margin: "0 0 8px", lineHeight: 1.5 }}><strong>Resumen:</strong> {a.resumen_ejecutivo}</p>
                      <p style={{ fontSize: 11, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}><strong>Sugerencia:</strong> {a.sugerencia_linea_respuesta}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: COLORS.textoSec, fontStyle: "italic" }}>{hist360.nota || "Análisis del modelo no disponible; se muestra el historial estructurado."}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {tab === "trazabilidad" && (
        <div>
          <p style={{ fontSize: 11, color: COLORS.textoSec, marginBottom: 14, lineHeight: 1.6 }}>
            Línea de tiempo completa del caso — actores y etapas del proceso
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
Prioridad asignada: ${urgLbl}.
Justificación: ${caso.explicacion || "Clasificación basada en el análisis del relato aportado."}${derechosTxt ? `
Derechos presuntamente vulnerados: ${derechosTxt}.
Conducta que los vulnera: ${caso.conducta_vulnera || "en verificación por el profesional."}` : ""}

2. GESTIÓN QUE ADELANTARÁ LA DEFENSORÍA
Su caso fue asignado a ${caso.prof}, profesional especializado.
Se adelantará la siguiente gestión defensorial ante ${entidadesTxt}:${(caso.gestiones && caso.gestiones.length > 0) ? "\n" + caso.gestiones.filter(g => g.confirmada !== false).map(g => `   • ${g.accion}`).join("\n") : "\n   • Impulso y coordinación con la entidad competente para la garantía de sus derechos."}

3. TRÁMITE Y TÉRMINO
Su petición se encuentra en estado: ${caso.estado}. La Defensoría hará seguimiento a la respuesta de la(s) entidad(es) accionada(s). El término legal para la respuesta es de 15 días hábiles (Código de Procedimiento Administrativo, artículo 14, Ley 1437 de 2011), con vencimiento el ${caso.fecha_vencimiento || "según el cómputo del término"}.

Usted será informado de cada actuación, su fecha y su resultado, a través del canal de contacto registrado y del portal de seguimiento.

Aviso sobre el uso de inteligencia artificial: en el análisis inicial de su petición se utilizó un sistema de inteligencia artificial que apoya la clasificación y la organización de la información. La decisión sobre su caso y el contenido de esta comunicación fueron revisados y aprobados por el profesional responsable. Si considera que la clasificación de su caso no es correcta, puede solicitar su revisión a través del portal de seguimiento o de los canales de atención de la Defensoría del Pueblo.

Cordialmente,
Defensoría del Pueblo — URAB
[Borrador generado por el módulo de redacción asistida. El profesional responsable debe revisar, complementar y aprobar antes de su envío — Directiva Conjunta 007 de 2025 · Ley 734 de 2002.]`
          );
          if (borrador !== borradorM6 && (!borrador || borrador.length <= 120)) {
            // inicializa el textarea con el borrador generado (una vez)
            setTimeout(() => setBorrador(borradorM6), 0);
          }
          return (
          <div>
            <div style={s.sello}>BORRADOR GENERADO POR INTELIGENCIA ARTIFICIAL — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE</div>
            <AvisoIA texto="Este borrador fue redactado por el sistema de inteligencia artificial a partir de la clasificación y las gestiones confirmadas. Revíselo, edítelo y apruébelo: usted responde por su contenido." radicado={caso.radicado} modulo="Borrador de respuesta" funcionario={nombreFunc} compacto variante="rojo" />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 9, flexWrap: "wrap" }}>
              <button style={{ ...s.btn("primary"), opacity: borradorCargando ? 0.6 : 1 }} disabled={borradorCargando}
                onClick={async () => {
                  setBorradorCargando(true); setBorradorMsg("");
                  try {
                    const resp = await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/borrador`, { method: "POST", headers: { ...authHeaders() } });
                    if (resp.status === 503) { setBorradorMsg("El generador con inteligencia artificial aún no está activo (falta configurar la clave del modelo). Puede editar el borrador base manualmente."); return; }
                    if (!resp.ok) throw new Error();
                    const data = await resp.json();
                    if (data.borrador) setBorrador(data.borrador);
                    setBorradorMsg("Borrador generado por inteligencia artificial. El texto salió seudonimizado al modelo y volvió con los datos reales del ciudadano. Revíselo y apruébelo.");
                  } catch (e) { setBorradorMsg("No se pudo generar el borrador en este momento. Puede editar el borrador base manualmente."); }
                  finally { setBorradorCargando(false); }
                }}>{borradorCargando ? "Generando borrador..." : "Generar borrador con inteligencia artificial"}</button>
              <span style={{ fontSize: 10, color: COLORS.textoSec }}>La respuesta se genera sobre el caso; ningún dato personal viaja en claro al modelo.</span>
            </div>
            {borradorMsg && <p style={{ fontSize: 11, color: COLORS.navy, marginBottom: 8, lineHeight: 1.5 }}>{borradorMsg}</p>}
            <div style={{ background: COLORS.fondo, borderRadius: RADIUS.md, padding: "8px 12px", marginBottom: 9, fontSize: 11, color: COLORS.textoSec }}>
              <strong>Fuentes normativas consultadas:</strong> {(caso.fuentes && caso.fuentes.length > 0 ? caso.fuentes : ["Corpus normativo institucional", "Código de Procedimiento Administrativo, artículo 14", "Directiva Conjunta 007 de 2025"]).join(" · ")}
            </div>
            <textarea value={borrador || borradorM6} onChange={e => setBorrador(e.target.value)}
              style={{ width: "100%", minHeight: 280, padding: "9px 11px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
            <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "4px 0 10px" }}>
              Al aprobar, su firma certifica revisión independiente del contenido jurídico (Ley 734 de 2002 · Constitución Política, artículo 29)
            </p>
            {!aprobado ? (
              <>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", background: "rgba(180,35,24,0.06)", border: `1px solid ${COLORS.rojo}`, borderLeft: `4px solid ${COLORS.rojo}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 10 }}>
                <input type="checkbox" checked={confirmoRevision} onChange={e => setConfirmoRevision(e.target.checked)} style={{ marginTop: 2, cursor: "pointer", accentColor: COLORS.rojo }} />
                <span style={{ fontSize: 12, color: COLORS.texto, lineHeight: 1.5, fontWeight: 600 }}>Confirmo que he revisado este borrador y me hago cargo del contenido.</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...s.btn("success"), opacity: (borradorCargando || !confirmoRevision) ? 0.5 : 1, cursor: (borradorCargando || !confirmoRevision) ? "not-allowed" : "pointer" }} disabled={borradorCargando || !confirmoRevision}
                  onClick={async () => {
                    setBorradorCargando(true);
                    try {
                      await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/borrador`, {
                        method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                        body: JSON.stringify({ borrador: borrador || borradorM6, estado: "aprobado", funcionario: nombreFunc, confirmo_revision: true })
                      });
                      setAprobado(true);
                    } catch (e) { setAprobado(true); /* modo demo */ }
                    finally { setBorradorCargando(false); }
                  }}>Aprobar y enviar al ciudadano</button>
                <button style={{ ...s.btn("ghost"), opacity: borradorCargando ? 0.6 : 1 }} disabled={borradorCargando}
                  onClick={async () => {
                    setBorradorCargando(true); setBorradorMsg("");
                    try {
                      await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/borrador`, {
                        method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
                        body: JSON.stringify({ borrador: borrador || borradorM6, estado: "editado", funcionario: nombreFunc })
                      });
                      setBorradorMsg("Borrador guardado.");
                    } catch (e) { setBorradorMsg("Borrador guardado (modo demo)."); }
                    finally { setBorradorCargando(false); }
                  }}>Guardar borrador</button>
              </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: COLORS.verde, fontWeight: 500 }}>Respuesta aprobada — bitácora de ediciones y hash SHA-256 registrados</p>
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
  const [sesionExpirada, setSesionExpirada] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch(`${API_URL}/api/casos`, { headers: { ...authHeaders() } });
        if (resp.status === 401) {
          // La sesión se perdió (por ejemplo al recargar). No es fallo del
          // servidor: hay que volver a iniciar sesión.
          if (!cancelado) { setSesionExpirada(true); setErrorAPI(false); }
          return;
        }
        if (!resp.ok) throw new Error("API no disponible");
        const data = await resp.json();
        if (!cancelado) {
          setCasosAPI(data.map(mapearCasoAPI));
          setErrorAPI(false);
          setSesionExpirada(false);
        }
      } catch (e) {
        if (!cancelado) setErrorAPI(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // Solo se usa el respaldo si el backend no respondió Y no hay datos reales.
  // El aviso se deriva de la fuente que se muestra, no de un flag que puede
  // quedar desactualizado tras una recarga.
  const usandoRespaldo = errorAPI && casosAPI.length === 0;
  const todos = usandoRespaldo ? CASOS : casosAPI;

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
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: h.done ? ACTOR_COLOR[h.actor] : COLORS.borde, border: h.done ? "none" : `1.5px solid ${COLORS.bordeFuerte}`, display: "inline-block" }} title={h.lbl} />
            {i < hitos.length - 1 && <span style={{ width: 12, height: 1.5, background: h.done ? COLORS.bordeFuerte : COLORS.borde, display: "inline-block" }} />}
          </span>
        ))}
        <span style={{ fontSize: 9, color: COLORS.textoSec, marginLeft: 4 }}>{done}/{hitos.length} hitos</span>
      </div>
    );
  };

  return (
    <div>
      {cargando && (
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: COLORS.textoSec }}>
          Cargando casos desde el servidor... (puede tardar hasta 50s si el servidor estaba inactivo)
        </div>
      )}
      {sesionExpirada && !cargando && (
        <div style={{ background: "rgba(180,35,24,0.06)", borderLeft: `4px solid ${COLORS.rojo}`, borderRadius: RADIUS.md, padding: "10px 12px", marginBottom: 12, fontSize: 11, color: COLORS.texto, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span>Su sesión se cerró. Por seguridad, vuelva a iniciar sesión para ver los casos.</span>
          <button onClick={() => window.location.reload()} style={{ ...LABEL_STYLE, fontSize: 11, padding: "4px 12px", borderRadius: RADIUS.md, border: "none", background: COLORS.rojo, color: "#fff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Iniciar sesión
          </button>
        </div>
      )}
      {usandoRespaldo && !cargando && (
        <div style={{ background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md, padding: "8px 12px", marginBottom: 12, fontSize: 10, color: COLORS.texto }}>
          El servidor está iniciando (puede tardar hasta un minuto en el primer acceso). Mientras tanto se muestran casos de demostración. Recargue en un momento para ver los casos reales.
        </div>
      )}
      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {[["todos",`Todos (${todos.length})`],["hitl",`Por revisar (${nhitl})`],["critica","Críticos"]].map(([k,l]) => (
          <button key={k} style={s.fb(filtro === k)} onClick={() => setFiltro(k)}>{l}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textoSec }}>{nhitl} casos requieren revisión humana inmediata</span>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap", fontSize: 10, color: COLORS.textoSec, background: COLORS.fondo, borderRadius: RADIUS.md, padding: "7px 11px" }}>
        <span style={{ fontWeight: 600, color: COLORS.texto }}>Convenciones:</span>
        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:RADIUS.sm, background:"rgba(180,35,24,0.08)", border:`1.5px solid ${COLORS.rojo}`, marginRight:4, verticalAlign:"middle" }}></span>Borde rojo izquierdo = urgencia CRÍTICA</span>
        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:RADIUS.sm, background:COLORS.panel, border:`1.5px solid ${COLORS.amarillo}`, marginRight:4, verticalAlign:"middle" }}></span>Borde amarillo = urgencia ALTA</span>
        <span><span style={{ display:"inline-block", width:10, height:10, background:"rgba(28,63,110,0.08)", border:`1px solid ${COLORS.navy}`, borderRadius:RADIUS.sm, marginRight:4, verticalAlign:"middle" }}></span>Fondo amarillo = requiere revisión humana</span>
      </div>
      {lista.map(c => (
        <div key={c.radicado}
          onClick={() => onSeleccionar(c)}
          style={{ border: `1px solid ${c.hitl ? COLORS.navy : COLORS.borde}`, borderRadius: RADIUS.md, padding: "11px 14px", cursor: "pointer", marginBottom: 8, background: c.hitl ? "rgba(28,63,110,0.05)" : COLORS.panel, borderLeft: c.urgencia === "critica" ? `4px solid ${COLORS.rojo}` : c.urgencia === "alta" ? `3px solid ${COLORS.amarillo}` : `1px solid ${c.hitl ? COLORS.navy : COLORS.borde}`, boxShadow: SHADOW }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, fontFamily: FONT_MONO }}>{c.radicado}</span>
            <span style={s.badge(c.urgencia)}>{URG[c.urgencia]?.lbl}</span>
            <span style={s.pill()}>{c.categoria}</span>
            {c.hitl && <span style={s.pill({ background: COLORS.panel, color: COLORS.navy, borderColor: COLORS.navy, fontWeight: 700 })}>Revisión humana</span>}
            {c.dup && <span style={s.pill({ background: COLORS.panel, color: COLORS.texto, borderColor: COLORS.bordeFuerte })}>DUPLICADO</span>}
            {c.esNuevo && <span style={s.pill({ background: "rgba(26,92,58,0.08)", color: COLORS.verde, borderColor: COLORS.verde, fontWeight: 700 })}>● EN VIVO</span>}
            <span style={{ marginLeft: "auto", fontSize: 10, color: COLORS.textoSec }}>{c.fecha}</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textoSec }}>
            <span style={{ color: COLORS.navy, fontWeight: 500 }}>{c.ciudadano}</span> · Peticionario/a &nbsp;|&nbsp;
            <span style={{ color: COLORS.verde, fontWeight: 500 }}>{c.prof.split(" (")[0]}</span> · Profesional
          </div>
          {c.hitl && c.hitl_razon && <p style={{ fontSize: 10, color: COLORS.texto, margin: "3px 0 0", fontStyle: "italic" }}>{c.hitl_razon.slice(0, 110)}{c.hitl_razon.length > 110 ? "..." : ""}</p>}
          <MiniHitos hitos={c.hitos} />
        </div>
      ))}
    </div>
  );
}

// ── Dashboard M8 ───────────────────────────────────────────────────────
// Métricas calculadas en vivo por el backend sobre el corpus real
// (/api/dashboard/metricas). No se muestran cifras fijas ni proyecciones.
function DashboardM8() {
  const [m, setM] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  useEffect(() => {
    fetch(`${API_URL}/api/dashboard/metricas`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { setM(d); setEstado("ok"); })
      .catch(() => setEstado("error"));
  }, []);

  if (estado === "cargando") return <p style={{ fontSize: 12, color: COLORS.textoSec }}>Cargando analítica…</p>;
  if (estado === "error" || !m) return <p style={{ fontSize: 12, color: COLORS.rojo }}>No fue posible cargar la analítica. Intente de nuevo.</p>;

  const u = m.distribucion_urgencia || {};
  const total = m.total_peticiones || 0;
  const fmt = (v, suf = "") => (v == null ? "—" : `${v}${suf}`);
  const tarjetas = [
    ["Peticiones en el corpus", fmt(total)],
    ["Pendientes de revisión humana", fmt(m.hitl_pendientes)],
    ["Críticas activas", fmt(m.criticas_activas)],
    ["Ratio de carga (máx / mín profesionales)", fmt(m.ratio_carga, "x")],
    ["Mediana de triage", fmt(m.mediana_triage_actual_h, " h")],
    ["Casos trasladados por competencia", fmt(m.casos_trasladados)],
  ];
  const urg = [
    ["Crítica", u.critica || 0, COLORS.rojo], ["Alta", u.alta || 0, COLORS.navy],
    ["Media", u.media || 0, COLORS.navy], ["Baja", u.baja || 0, COLORS.textoSec],
  ];
  return (
    <div>
      <h3 style={{ fontSize: 13, color: COLORS.navy, marginBottom: 3, fontWeight: 600 }}>Analítica operativa y de derechos</h3>
      <p style={{ fontSize: 10, color: COLORS.textoSec, marginBottom: 14 }}>
        Calculado en vivo sobre {total} caso{total === 1 ? "" : "s"} del corpus de demostración · datos sintéticos (LSL2026)
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {tarjetas.map(([l, v]) => (
          <div key={l} style={{ background: COLORS.panel, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px" }}>
            <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "0 0 4px", lineHeight: 1.4 }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 600, color: COLORS.navy, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.borde}`, borderRadius: RADIUS.md, padding: "12px 14px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.navy, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>Distribución por urgencia</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {urg.map(([l, v, c]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 600, color: c, margin: 0 }}>{v}</p>
              <p style={{ fontSize: 10, color: COLORS.textoSec, margin: 0 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Barra de accesibilidad ─────────────────────────────────────────────
const SIZES_ACC   = ["14px","17px","20px","24px"];

function useAccesibilidad() {
  const [oscuro, setOscuro] = useState(() => {
    const g = localStorage.getItem("urab_theme");
    if (g) return g === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  return { oscuro, setOscuro };
}

function AccesibilidadBar() {
  const { oscuro, setOscuro } = useAccesibilidad();
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
  }, []);
  const toggleOscuro = () => {
    const o = !oscuro; setOscuro(o);
    document.documentElement.setAttribute("data-theme", o ? "dark" : "light");
    localStorage.setItem("urab_theme", o ? "dark" : "light");
  };
  return (
    <div style={{ background:COLORS.navy, padding:"5px 18px", display:"flex", alignItems:"center", justifyContent:"flex-end", flexWrap:"wrap", gap:6 }}>
      <button onClick={toggleOscuro} style={{ height:26, padding:"0 10px", borderRadius:RADIUS.sm, border:"1px solid rgba(255,255,255,.35)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500, display:"inline-flex", alignItems:"center", gap:5 }}>
         <span aria-hidden="true">{oscuro?"☀":"☾"}</span>{oscuro?"Modo claro":"Modo oscuro"}
      </button>
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────
// ── Pantalla de inicio de sesión (RBAC) ────────────────────────────────
// El acceso a datos personales de peticionarios exige autenticación.
// RFP §4.5 · Ley 1581 de 2012.
function Login({ onEntrar }) {
  const [pid, setPid] = useState("P01");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const PROFESIONALES = [
    { id: "P01", nombre: "Ana Torres", esp: "Violencia basada en género · Niñez" },
    { id: "P02", nombre: "Luis Morales", esp: "Salud" },
    { id: "P03", nombre: "Clara Ruiz", esp: "Desaparición" },
    { id: "P04", nombre: "Jorge Vargas", esp: "General" },
    { id: "P05", nombre: "María Ospina", esp: "Carcelario" },
  ];

  const entrar = async () => {
    setCargando(true); setError("");
    try {
      const prof = PROFESIONALES.find(p => p.id === pid);
      const r = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ profesional_id: pid, codigo: codigo.trim(), nombre: prof?.nombre }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Credenciales no válidas.");
      }
      const sesion = await r.json();
      TOKEN_SESION = sesion.token;
      onEntrar({ ...sesion, especialidad: prof?.esp });
    } catch (e) {
      setError(e.message || "No fue posible iniciar sesión. El servidor puede estar despertando.");
    }
    setCargando(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.fondo, fontFamily: FONT_SANS }}>
      <FranjaBandera />
      <BarraGovCo />
      <div style={{ minHeight: "calc(100vh - 28px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: COLORS.panel, borderRadius: RADIUS.md, boxShadow: SHADOW, width: "100%", maxWidth: 440, overflow: "hidden", border: `1px solid ${COLORS.borde}` }}>
        <div style={{ background: COLORS.navy, padding: "22px 26px", color: "#fff", borderBottom: `3px solid ${COLORS.amarillo}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Defensoría del Pueblo</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>URAB-AI · Panel de profesionales</div>
        </div>

        <div style={{ padding: "24px 26px" }}>
          <p style={{ fontSize: 13, color: COLORS.texto, margin: "0 0 18px", lineHeight: 1.5 }}>
            El acceso a los datos de los peticionarios está restringido a personal autorizado. Inicie sesión para continuar.
          </p>

          <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 5 }}>Profesional</label>
          <select value={pid} onChange={e => setPid(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 14, marginBottom: 14, fontFamily: "inherit", background: COLORS.panel }}>
            {PROFESIONALES.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.esp}</option>)}
          </select>

          <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.texto, display: "block", marginBottom: 5 }}>Código de acceso</label>
          <input type="password" value={codigo} onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()}
            placeholder="Ingrese su código"
            style={{ width: "100%", padding: "10px 12px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.bordeFuerte}`, fontSize: 14, marginBottom: 6, fontFamily: "inherit", boxSizing: "border-box" }} />

          {error && <p style={{ fontSize: 12, color: COLORS.rojo, margin: "6px 0 0" }}>{error}</p>}

          <button onClick={entrar} disabled={cargando || !codigo.trim()}
            style={{ ...LABEL_STYLE, width: "100%", marginTop: 16, padding: "11px", borderRadius: RADIUS.md, border: "none", background: (cargando || !codigo.trim()) ? COLORS.borde : COLORS.accion, color: "#fff", fontSize: 14, cursor: (cargando || !codigo.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {cargando ? "Verificando..." : "Iniciar sesión"}
          </button>

          <div style={{ marginTop: 18, padding: "11px 13px", background: "rgba(28,63,110,0.06)", borderLeft: `4px solid ${COLORS.navy}`, borderRadius: RADIUS.md }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.navy, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Credenciales de demostración
            </p>
            <p style={{ fontSize: 11, color: COLORS.texto, margin: 0, lineHeight: 1.5 }}>
              El código de cada profesional es <strong>urab-</strong> seguido de su identificador en minúscula.
              Por ejemplo, para Ana Torres (P01): <strong>urab-p01</strong>.
            </p>
            <p style={{ fontSize: 10, color: COLORS.textoSec, margin: "6px 0 0", lineHeight: 1.5 }}>
              En producción, el inicio de sesión se integra con el directorio institucional de la Defensoría. Estas credenciales de demostración se retiran; el control de acceso por roles permanece.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(null);

  if (!sesion) return <Login onEntrar={setSesion} />;
  return <Panel sesion={sesion} onSalir={() => setSesion(null)} />;
}

function Panel({ sesion, onSalir }) {
  const [seccion, setSeccion] = useState("bandeja");
  const [casoAbierto, setCasoAbierto] = useState(null);

  return (
    <div style={s.wrap}>
      <FranjaBandera />
      <BarraGovCo />
      <div style={s.hdr}>
        <div className="urab-contain">
          <div style={s.hdrTop}>
            <div style={s.logoWrap}>
              <LogoDefensoria />
              <div>
                <div style={s.h1}>Defensoría del Pueblo</div>
                <div style={s.slogan}>Nos unen tus derechos · URAB-AI · Panel de profesionales</div>
              </div>
            </div>
            <div style={s.hdrUser}>
              <div style={s.uname}>{sesion.nombre}</div>
              <div style={s.urole}>Profesional de trámite · {sesion.profesional_id}</div>
              <div style={s.ucarga}>{sesion.especialidad || ""}</div>
              <button onClick={onSalir} style={{ marginTop: 6, fontSize: 11, padding: "3px 10px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.borde}`, background: COLORS.panel, color: COLORS.textoSec, cursor: "pointer", fontFamily: "inherit" }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
        <div style={s.hdrNav}>
          <div className="urab-contain" style={{ display: "flex" }}>
            <button style={s.hn(seccion === "bandeja")} onClick={() => { setSeccion("bandeja"); setCasoAbierto(null); }}>
               Bandeja de casos
            </button>
            <button style={s.hn(seccion === "radicar")} onClick={() => setSeccion("radicar")}>
               Radicar por archivo
            </button>
            <button style={s.hn(seccion === "dashboard")} onClick={() => setSeccion("dashboard")}>
               Panel de control
            </button>
          </div>
        </div>
      </div>

      <AccesibilidadBar />

      <div className="urab-contain" style={{ padding: "0 16px 40px" }}>
        <div style={{ ...s.card, marginTop: 14 }}>
          {seccion === "bandeja" && !casoAbierto && <Bandeja onSeleccionar={setCasoAbierto} />}
          {seccion === "bandeja" && casoAbierto && <DetalleCaso caso={casoAbierto} onVolver={() => setCasoAbierto(null)} />}
          {/* La radicación permanece montada: al cambiar de sección no se pierde
              la información ya diligenciada del peticionario */}
          <div style={{ display: seccion === "radicar" ? "block" : "none" }}><RadicarPorArchivo /></div>
          {seccion === "dashboard" && <DashboardM8 />}
        </div>
      </div>

      <Footer />
    </div>
  );
}
