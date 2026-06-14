import { useState, useEffect } from "react";

// ── Datos mock calibrados al corpus sintético (N=20,417) ──────────────
const PROFESIONALES = [
  { id: "P01", nombre: "Ana Torres",   especialidades: ["VBG", "NNA"],       carga: 847  },
  { id: "P02", nombre: "Luis Morales", especialidades: ["Salud", "General"],  carga: 1103 },
  { id: "P03", nombre: "Clara Ruiz",   especialidades: ["Desaparición"],      carga: 612  },
  { id: "P04", nombre: "Jorge Vargas", especialidades: ["General"],           carga: 954  },
];

const CASOS_MOCK = [
  {
    radicado: "DP-2026-004821",
    ciudadano: "María García",
    cedula: "52.847.193",
    canal: "Web",
    fecha: "2026-06-14 08:42",
    urgencia: "critica",
    categoria: "VBG",
    confianza: 0.94,
    hitl: true,
    hitl_razon: "Regla hard-coded: NNA detectado + amenaza vital | Doble revisión requerida",
    explicacion: "El relato describe amenazas de muerte reiteradas con menores de edad en el hogar. La presencia de NNA activa prioridad máxima de forma automática.",
    profesional: "P01",
    razon_asignacion: "perfil VBG + NNA coincidente | carga 847 casos",
    borrador_m6: `⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE

Señora María García:
La Defensoría del Pueblo ha recibido su petición radicada bajo el número DP-2026-004821 el día 14 de junio de 2026.

Su caso ha sido clasificado con PRIORIDAD CRÍTICA. Se ha asignado a la profesional Ana Torres, especialista en VBG, quien se comunicará con usted dentro de las próximas 2 horas hábiles conforme al protocolo de atención urgente.

Puede contactar la línea de emergencias de la Defensoría al 01 8000 914 814.

Fuentes RAG: Ley 1257/2008 · Decreto 1729/2008 · Ruta de atención VBG URAB`,
    fuentes_rag: ["Ley 1257/2008 - Violencia basada en género", "Ruta de atención VBG URAB"],
    estado: "pendiente_hitl",
    duplicado: null,
  },
  {
    radicado: "DP-2026-004820",
    ciudadano: "Carlos Pérez",
    cedula: "80.123.456",
    canal: "Correo",
    fecha: "2026-06-14 07:15",
    urgencia: "media",
    categoria: "Salud",
    confianza: 0.88,
    hitl: false,
    hitl_razon: "",
    explicacion: "Petición sobre negación de servicios de salud. Sin indicadores de riesgo vital inmediato.",
    profesional: "P02",
    razon_asignacion: "perfil Salud coincidente | carga mínima disponible: 1103 casos",
    borrador_m6: `⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE

Señor Carlos Pérez:
La Defensoría del Pueblo acusa recibo de su petición DP-2026-004820 relacionada con la presunta negación de servicios de salud por parte de su EPS...`,
    fuentes_rag: ["Ley 1751/2015 - Derecho fundamental a la salud"],
    estado: "en_gestion",
    duplicado: null,
  },
  {
    radicado: "DP-2026-004819",
    ciudadano: "Rosa Martínez",
    cedula: "41.987.654",
    canal: "Presencial",
    fecha: "2026-06-13 16:30",
    urgencia: "alta",
    categoria: "Desaparición",
    confianza: 0.91,
    hitl: true,
    hitl_razon: "Urgencia alta: desaparición de familiar | HITL obligatorio",
    explicacion: "Ciudadana reporta desaparición de su hijo adulto hace 72 horas. Entidad competente: Fiscalía y SIJÍN.",
    profesional: "P03",
    razon_asignacion: "perfil Desaparición coincidente | carga mínima: 612 casos",
    borrador_m6: `⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE

Señora Rosa Martínez:
La Defensoría del Pueblo ha radicado su denuncia por desaparición de familiar bajo el número DP-2026-004819...`,
    fuentes_rag: ["Protocolo desaparición URAB", "Ley 1448/2011"],
    estado: "pendiente_hitl",
    duplicado: null,
  },
  {
    radicado: "DP-2026-004818",
    ciudadano: "Carlos Pérez",
    cedula: "80.123.456",
    canal: "Web",
    fecha: "2026-06-13 09:00",
    urgencia: "media",
    categoria: "Salud",
    confianza: 0.82,
    hitl: true,
    hitl_razon: "M4: posible duplicado de DP-2026-004820 (similitud 89%) — funcionario debe aprobar acumulación",
    explicacion: "Misma situación de salud reportada el día anterior por el mismo ciudadano.",
    profesional: "P02",
    razon_asignacion: "continuidad con peticionario (radicado previo DP-2026-004820) | carga 1103 casos",
    borrador_m6: "",
    fuentes_rag: [],
    estado: "pendiente_hitl",
    duplicado: "DP-2026-004820",
  },
];

// ── Métricas dashboard M8 ──────────────────────────────────────────────
const METRICAS = {
  triage_mediana_asis: 9.1,
  triage_mediana_tobe: 1.4,
  urgentes_tardios_asis: 56.2,
  urgentes_tardios_tobe: 4.5,
  doble_registro_asis: 72.6,
  doble_registro_tobe: 5.0,
  ratio_carga_asis: 7.7,
  ratio_carga_tobe: 2.1,
  horas_liberadas: 13320,
  urgentes_adicionales: 7600,
  total_radicados: 20417,
  precision_m2: 92.3,
  recall_hitl: 100.0,
  duplicados_detectados: 91.0,
};

// ── Colores de urgencia ────────────────────────────────────────────────
const URGENCIA_CONFIG = {
  critica: { label: "CRÍTICA", bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
  alta:    { label: "ALTA",    bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  media:   { label: "MEDIA",   bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" },
  baja:    { label: "BAJA",    bg: "#F0FDF4", text: "#14532D", border: "#22C55E" },
};

// ──────────────────────────────────────────────────────────────────────
// COMPONENTES DE UTILIDAD
// ──────────────────────────────────────────────────────────────────────

function Badge({ urgencia }) {
  const c = URGENCIA_CONFIG[urgencia] || URGENCIA_CONFIG.media;
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      padding: "2px 8px", borderRadius: 12,
      background: c.bg, color: c.text,
      border: `1.5px solid ${c.border}`, letterSpacing: "0.05em"
    }}>
      {c.label}
    </span>
  );
}

function HitlBanner({ caso }) {
  if (!caso.hitl) return null;
  const esDuplicado = !!caso.duplicado;
  return (
    <div style={{
      background: "#FEF3C7", border: "1.5px solid #F59E0B",
      borderRadius: 8, padding: "10px 14px", marginBottom: 12,
      display: "flex", gap: 10, alignItems: "flex-start"
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400E" }}>
          {esDuplicado ? "Posible duplicado — requiere decisión de acumulación" : "Revisión humana obligatoria (HITL)"}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78350F" }}>{caso.hitl_razon}</p>
        {esDuplicado && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78350F" }}>
            Radicado similar: <strong>{caso.duplicado}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

function MiniBar({ valor, max, color }) {
  return (
    <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min((valor / max) * 100, 100)}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// PORTAL CIUDADANO — formulario multi-paso con cierre (D3 + D4)
// ──────────────────────────────────────────────────────────────────────

function PortalCiudadano({ onVolver }) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState({
    nombre: "", cedula: "", correo: "", telefono: "",
    es_nna: false, es_discapacidad: false, es_vbg: false,
    es_victima: false, es_etnia: false, es_migrante: false,
    texto: "", tipo_doc: "CC"
  });
  const [urgenciaDetectada, setUrgenciaDetectada] = useState(false);
  const [radicadoGenerado] = useState("DP-2026-" + Math.floor(Math.random() * 10000).toString().padStart(6, "0"));

  // Detección de urgencia en tiempo real (D4)
  useEffect(() => {
    const palabrasCriticas = ["amenaza", "van a matar", "desaparecido", "violencia", "niño", "menor", "tortura"];
    const textoLower = datos.texto.toLowerCase();
    const detectado = palabrasCriticas.some(p => textoLower.includes(p)) || datos.es_nna || datos.es_vbg;
    setUrgenciaDetectada(detectado);
  }, [datos.texto, datos.es_nna, datos.es_vbg]);

  const campo = (key, label, tipo = "text") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{label}</label>
      <input
        type={tipo} value={datos[key]}
        onChange={e => setDatos(d => ({ ...d, [key]: e.target.value }))}
        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }}
      />
    </div>
  );

  const check = (key, label) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13 }}>
      <input type="checkbox" checked={datos[key]} onChange={e => setDatos(d => ({ ...d, [key]: e.target.checked }))} />
      {label}
    </label>
  );

  const btnNav = (label, onClick, disabled = false, primary = true) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "9px 20px", borderRadius: 6, border: "1px solid #D1D5DB",
      background: primary ? "#1F4E79" : "#fff", color: primary ? "#fff" : "#374151",
      fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1
    }}>{label}</button>
  );

  const pasos = ["Sus datos", "Documentos", "Su situación", "Confirmación", "Su cuenta"];

  return (
    <div>
      {/* Barra de pasos */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {pasos.map((p, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
              background: i + 1 === paso ? "#1F4E79" : i + 1 < paso ? "#22C55E" : "#E5E7EB",
              color: i + 1 <= paso ? "#fff" : "#9CA3AF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 600
            }}>{i + 1 < paso ? "✓" : i + 1}</div>
            <div style={{ fontSize: 10, color: i + 1 === paso ? "#1F4E79" : "#9CA3AF" }}>{p}</div>
          </div>
        ))}
      </div>

      {/* Banner de urgencia detectada (D4) */}
      {urgenciaDetectada && paso === 3 && (
        <div style={{
          background: "#FEE2E2", border: "2px solid #EF4444", borderRadius: 8,
          padding: "12px 16px", marginBottom: 16
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
            🚨 Caso priorizado — alerta enviada al funcionario de guardia HITL
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7F1D1D" }}>
            Su situación fue identificada como urgente. Un profesional de la Defensoría revisará su caso de forma prioritaria. Si está en peligro inmediato llame al 123.
          </p>
        </div>
      )}

      {/* Contenido por paso */}
      {paso === 1 && (
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1F4E79" }}>Sus datos personales</h3>
          {campo("nombre", "Nombre y apellidos *")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 4 }}>Tipo de documento *</label>
              <select value={datos.tipo_doc} onChange={e => setDatos(d => ({ ...d, tipo_doc: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 14 }}>
                {["CC","CE","Pasaporte","PPT"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {campo("cedula", "Número *")}
          </div>
          {campo("telefono", "Teléfono (opcional)")}
          {campo("correo", "Correo electrónico (opcional)", "email")}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>¿Aplica alguna de estas situaciones?</p>
            {check("es_nna", "Menor de edad (NNA)")}
            {check("es_discapacidad", "Persona con discapacidad")}
            {check("es_victima", "Víctima del conflicto armado")}
            {check("es_vbg", "Violencia basada en género")}
            {check("es_etnia", "Comunidad étnica")}
            {check("es_migrante", "Migrante o apátrida")}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1F4E79" }}>Documentos de soporte</h3>
          <div style={{
            border: "2px dashed #D1D5DB", borderRadius: 8, padding: 24,
            textAlign: "center", color: "#6B7280", marginBottom: 16
          }}>
            <p style={{ margin: 0, fontSize: 13 }}>📎 Arrastre sus documentos aquí o haga clic para seleccionar</p>
            <p style={{ margin: "8px 0 0", fontSize: 11 }}>PDF, imágenes, escaneos — máx. 10 MB por archivo</p>
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF" }}>
            Los documentos físicos serán digitalizados en la sede y protegidos con cadena de custodia digital (hash SHA-256 · AGN Acuerdo 006/2014).
          </p>
        </div>
      )}

      {paso === 3 && (
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1F4E79" }}>Cuéntenos su situación</h3>
          <textarea
            value={datos.texto}
            onChange={e => setDatos(d => ({ ...d, texto: e.target.value }))}
            placeholder="Describa con sus propias palabras qué pasó, qué entidad está involucrada y qué necesita de la Defensoría..."
            style={{
              width: "100%", minHeight: 140, padding: "10px 12px",
              borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 14,
              resize: "vertical", boxSizing: "border-box", fontFamily: "inherit"
            }}
          />
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>
            {datos.texto.length} caracteres · El sistema IA analizará su relato para priorizar la atención
          </p>
        </div>
      )}

      {paso === 4 && (
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1F4E79" }}>Confirme su petición</h3>
          <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            {[
              ["Nombre", datos.nombre || "(no indicado)"],
              ["Documento", `${datos.tipo_doc} ${datos.cedula}`],
              ["Contacto", datos.correo || datos.telefono || "(no indicado)"],
              ["Grupos protegidos", [datos.es_nna&&"NNA", datos.es_vbg&&"VBG", datos.es_discapacidad&&"Discapacidad", datos.es_victima&&"Conflicto"].filter(Boolean).join(", ") || "Ninguno"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#6B7280", minWidth: 100 }}>{l}:</span>
                <span style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 4px" }}>Relato:</p>
              <p style={{ fontSize: 12, color: "#111827", margin: 0 }}>{datos.texto.slice(0, 200)}{datos.texto.length > 200 ? "..." : ""}</p>
            </div>
          </div>
          {/* Aviso Art. 29 CP + Ley 1581 (D3) */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#1E40AF" }}>
              <strong>Tratamiento de datos personales (Ley 1581/2012):</strong> Sus datos serán usados exclusivamente para la gestión de su petición ante la Defensoría del Pueblo. Tiene derecho a consultar, corregir o suprimir su información. Puede ejercer estos derechos ante el DPO de la Defensoría.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#1E40AF" }}>
              <strong>Debido proceso (Art. 29 CP):</strong> Cualquier clasificación automática de su petición puede ser impugnada ante el profesional designado dentro de los 5 días hábiles siguientes a la notificación.
            </p>
          </div>
        </div>
      )}

      {paso === 5 && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ color: "#1F4E79", margin: "0 0 8px" }}>Petición radicada exitosamente</h3>
          <div style={{
            background: "#EFF6FF", border: "2px solid #1F4E79",
            borderRadius: 8, padding: "12px 20px", margin: "16px auto",
            maxWidth: 260, display: "inline-block"
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>Número de radicado</p>
            <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#1F4E79", letterSpacing: "0.05em" }}>
              {radicadoGenerado}
            </p>
          </div>
          {urgenciaDetectada && (
            <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: 12, margin: "12px 0", textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#92400E" }}>⚡ Caso priorizado</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78350F" }}>
                Su caso fue marcado como urgente. Un profesional se comunicará con usted en las próximas 2 horas hábiles.
              </p>
            </div>
          )}
          <p style={{ fontSize: 12, color: "#6B7280", margin: "12px 0" }}>
            Guarde este número para hacer seguimiento de su petición.<br />
            Recibirá confirmación por {datos.correo ? `correo a ${datos.correo}` : "SMS o correo cuando lo registre"}.
          </p>
          <p style={{ fontSize: 11, color: "#9CA3AF" }}>
            Canal de seguimiento: 01 8000 914 814 · atencion@defensoria.gov.co<br />
            Tratamiento de datos conforme a la Ley 1581 de 2012
          </p>
          <button onClick={onVolver} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, cursor: "pointer" }}>
            Volver al portal
          </button>
        </div>
      )}

      {/* Navegación */}
      {paso < 5 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={() => paso > 1 ? setPaso(p => p - 1) : onVolver()}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, cursor: "pointer" }}>
            ← {paso === 1 ? "Salir" : "Anterior"}
          </button>
          {btnNav(
            paso === 4 ? "Radicar petición" : "Siguiente →",
            () => setPaso(p => p + 1),
            paso === 1 && !datos.nombre,
            true
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// VISTA FUNCIONARIO — bandeja + detalle de caso (D1)
// ──────────────────────────────────────────────────────────────────────

function VistaCasoDetalle({ caso, onVolver }) {
  const [tab, setTab] = useState("resumen");
  const [borradorEditado, setBorradorEditado] = useState(caso.borrador_m6);
  const [acumulado, setAcumulado] = useState(false);
  const [aprobado, setAprobado] = useState(false);

  const prof = PROFESIONALES.find(p => p.id === caso.profesional);
  const tabStyle = (t) => ({
    padding: "6px 14px", fontSize: 12, fontWeight: tab === t ? 600 : 400,
    borderBottom: tab === t ? "2px solid #1F4E79" : "2px solid transparent",
    color: tab === t ? "#1F4E79" : "#6B7280", cursor: "pointer", background: "none", border: "none",
    borderBottom: tab === t ? "2px solid #1F4E79" : "2px solid transparent",
  });

  return (
    <div>
      <button onClick={onVolver} style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Volver a la bandeja
      </button>

      {/* Encabezado del caso */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#1F4E79" }}>{caso.radicado}</h3>
        <Badge urgencia={caso.urgencia} />
        {caso.hitl && <span style={{ fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>⚠️ HITL</span>}
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#6B7280" }}>
        {caso.ciudadano} · {caso.cedula} · {caso.canal} · {caso.fecha}
      </p>

      <HitlBanner caso={caso} />

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #E5E7EB", marginBottom: 16, display: "flex", gap: 4 }}>
        {[["resumen","Resumen"], ["borrador","Borrador M6 IA"], ["trazabilidad","Trazabilidad"]].map(([k,l]) => (
          <button key={k} style={tabStyle(k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "resumen" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              ["Categoría", caso.categoria],
              ["Confianza IA", `${(caso.confianza * 100).toFixed(0)}%`],
              ["Profesional", prof?.nombre || caso.profesional],
              ["Estado", caso.estado],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "#F9FAFB", borderRadius: 6, padding: "8px 12px" }}>
                <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>{l}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#111827" }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#EFF6FF", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#1E40AF" }}>Explicación IA (XAI — Directiva 007)</p>
            <p style={{ margin: 0, fontSize: 12, color: "#1E40AF" }}>{caso.explicacion}</p>
          </div>
          <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#6B7280" }}>Razón de asignación M3</p>
            <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>{caso.razon_asignacion}</p>
          </div>
          {caso.duplicado && !acumulado && (
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setAcumulado(true)} style={{ padding: "8px 16px", background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 6, color: "#92400E", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Aprobar acumulación con {caso.duplicado}
              </button>
              <button style={{ marginLeft: 8, padding: "8px 16px", background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, color: "#374151", fontSize: 12, cursor: "pointer" }}>
                Tramitar por separado
              </button>
            </div>
          )}
          {acumulado && <p style={{ fontSize: 12, color: "#15803D", fontWeight: 600, marginTop: 8 }}>✓ Acumulación aprobada — expediente consolidado con {caso.duplicado}</p>}
        </div>
      )}

      {tab === "borrador" && (
        <div>
          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#92400E" }}>
              ⚠️ BORRADOR GENERADO POR IA — REQUIERE REVISIÓN Y APROBACIÓN DEL PROFESIONAL RESPONSABLE
            </p>
          </div>
          {caso.fuentes_rag.length > 0 && (
            <div style={{ background: "#EFF6FF", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 11, color: "#1E40AF" }}>
                <strong>Fuentes RAG utilizadas:</strong> {caso.fuentes_rag.join(" · ")}
              </p>
            </div>
          )}
          <textarea
            value={borradorEditado}
            onChange={e => setBorradorEditado(e.target.value)}
            style={{
              width: "100%", minHeight: 200, padding: "10px 12px",
              borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 12,
              fontFamily: "inherit", resize: "vertical", boxSizing: "border-box"
            }}
          />
          <p style={{ fontSize: 10, color: "#9CA3AF", margin: "4px 0 12px" }}>
            Al aprobar, su firma certifica que realizó revisión independiente del contenido (Sprint C1 — responsabilidad disciplinaria)
          </p>
          {!aprobado ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAprobado(true)} style={{ padding: "8px 16px", background: "#1F4E79", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                ✓ Aprobar y enviar al ciudadano
              </button>
              <button style={{ padding: "8px 16px", background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                Guardar borrador
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>✓ Respuesta aprobada y enviada — bitácora de ediciones registrada</p>
          )}
        </div>
      )}

      {tab === "trazabilidad" && (
        <div style={{ fontFamily: "monospace" }}>
          {[
            ["08:42:00", "M1", "Recepción — canal web · normalización completada"],
            ["08:42:03", "M1", "Hash cadena custodia: SHA256:a3f8b2c1..."],
            ["08:42:05", "M2", "Clasificación: urgencia=critica · categoría=VBG · confianza=94%"],
            ["08:42:05", "M2", "Regla hard-coded: NNA detectado — HITL activado"],
            ["08:42:06", "M4", "Anti-duplicidad: sin radicados previos del ciudadano"],
            ["08:42:07", "M3", `Asignado a P01 — razón: ${caso.razon_asignacion}`],
            ["08:42:09", "M5", "Historial: sin radicados previos para cédula 52.847.193"],
            ["08:42:12", "M6", `Borrador generado — hash: ${caso.radicado.slice(-8)}... · fuentes RAG: 2`],
            ["08:42:12", "M6", "Doble revisión requerida — urgencia crítica + VBG"],
            ["08:42:13", "M7", "Registro en IRIS y VisionWeb — estado: recibido"],
          ].map(([ts, mod, ev]) => (
            <div key={ts + ev} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #F3F4F6", fontSize: 11 }}>
              <span style={{ color: "#9CA3AF", minWidth: 58 }}>{ts}</span>
              <span style={{ color: "#1F4E79", fontWeight: 700, minWidth: 28 }}>{mod}</span>
              <span style={{ color: "#374151" }}>{ev}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VistaBandeja({ onSeleccionar }) {
  const [filtro, setFiltro] = useState("todos");
  const casos = filtro === "hitl" ? CASOS_MOCK.filter(c => c.hitl)
               : filtro === "critica" ? CASOS_MOCK.filter(c => c.urgencia === "critica")
               : CASOS_MOCK;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["todos","Todos"], ["hitl","⚠️ HITL pendiente"], ["critica","🔴 Críticos"]].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            background: filtro === k ? "#1F4E79" : "#F3F4F6",
            color: filtro === k ? "#fff" : "#374151",
            border: "1px solid " + (filtro === k ? "#1F4E79" : "#E5E7EB"), fontWeight: filtro === k ? 600 : 400
          }}>{l}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6B7280", alignSelf: "center" }}>
          {casos.filter(c => c.hitl).length} casos pendientes de revisión HITL
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {casos.map(caso => (
          <div key={caso.radicado}
            onClick={() => onSeleccionar(caso)}
            style={{
              border: caso.hitl ? "1.5px solid #F59E0B" : "1px solid #E5E7EB",
              borderRadius: 8, padding: "12px 14px", cursor: "pointer",
              background: caso.hitl ? "#FFFBEB" : "#fff",
              transition: "box-shadow 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1F4E79" }}>{caso.radicado}</span>
              <Badge urgencia={caso.urgencia} />
              <span style={{ fontSize: 11, color: "#6B7280", background: "#F3F4F6", padding: "1px 7px", borderRadius: 10 }}>{caso.categoria}</span>
              {caso.hitl && <span style={{ fontSize: 10, background: "#FEF3C7", color: "#92400E", padding: "1px 7px", borderRadius: 10, fontWeight: 700 }}>HITL</span>}
              {caso.duplicado && <span style={{ fontSize: 10, background: "#EDE9FE", color: "#5B21B6", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>DUPLICADO</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>{caso.fecha}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>
              {caso.ciudadano} · {caso.canal}
            </p>
            {caso.hitl && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#92400E" }}>{caso.hitl_razon.slice(0, 90)}...</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// DASHBOARD M8
// ──────────────────────────────────────────────────────────────────────

function DashboardM8() {
  const m = METRICAS;

  const card = (label, asis, tobe, unidad = "", mejora = "") => (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px" }}>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: "#EF4444" }}>AS-IS</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#EF4444" }}>{asis}{unidad}</p>
        </div>
        <span style={{ fontSize: 18, color: "#9CA3AF", marginBottom: 4 }}>→</span>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: "#16A34A" }}>TO-BE</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#16A34A" }}>{tobe}{unidad}</p>
        </div>
        {mejora && <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>{mejora}</span>}
      </div>
      <MiniBar valor={tobe} max={asis} color="#16A34A" />
    </div>
  );

  const stat = (label, valor, color = "#1F4E79") => (
    <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 11, color: "#6B7280" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color }}>{valor}</p>
    </div>
  );

  return (
    <div>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#1F4E79" }}>Dashboard M8 — Analítica operativa</h3>
      <p style={{ margin: "0 0 16px", fontSize: 11, color: "#9CA3AF" }}>
        Corpus sintético N={m.total_radicados.toLocaleString()} radicados · Piloto URAB 90 días simulados · Datos declarados como sintéticos
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {card("Tiempo mediano de triage", m.triage_mediana_asis, m.triage_mediana_tobe, "h", "−85%")}
        {card("Urgentes con triage tardío >8h", m.urgentes_tardios_asis, m.urgentes_tardios_tobe, "%", "−92%")}
        {card("Doble registro IRIS/VisionWeb", m.doble_registro_asis, m.doble_registro_tobe, "%", "−93%")}
        {card("Ratio carga máx/mín profesionales", m.ratio_carga_asis, m.ratio_carga_tobe, "x", "−73%")}
      </div>

      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#1E40AF" }}>ROI institucional — argumento central del pitch</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {stat("Horas/año liberadas", `${m.horas_liberadas.toLocaleString()} h`, "#1E40AF")}
          {stat("Equivalente en FTE", "6.4 FTE", "#1E40AF")}
          {stat("Urgentes adicionales atendidos a tiempo/año", `+${m.urgentes_adicionales.toLocaleString()}`, "#15803D")}
          {stat("Doble registro eliminado", "13,320 h/año", "#15803D")}
        </div>
      </div>

      <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "14px 16px" }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#374151" }}>Métricas de calidad del modelo M2</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {stat("Precisión M2", `${m.precision_m2}%`, "#374151")}
          {stat("HITL recall urgentes", `${m.recall_hitl}%`, "#15803D")}
          {stat("Detección duplicados M4", `${m.duplicados_detectados}%`, "#374151")}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 10, color: "#9CA3AF" }}>
          HITL recall = 100% es la métrica no negociable. Un solo urgente no detectado es inaceptable.
          Nivel de alerta drift actual: 🟢 VERDE
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [vista, setVista] = useState("inicio");
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);

  const nav = (v) => () => setVista(v);

  const tabs = [
    ["inicio", "Portal ciudadano"],
    ["funcionario", "Bandeja funcionario"],
    ["dashboard", "Dashboard M8"],
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 16px 40px" }}>

      {/* Header */}
      <div style={{ background: "#1F4E79", color: "#fff", padding: "12px 20px", borderRadius: "0 0 10px 10px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#93C5FD", letterSpacing: "0.1em" }}>GOV.CO · DEFENSORÍA DEL PUEBLO</p>
            <h1 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700 }}>URAB-AI · Sistema Agéntico de Peticiones</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 10, color: "#93C5FD" }}>LSL2026 · MVP Demo</p>
            <p style={{ margin: 0, fontSize: 10, color: "#93C5FD" }}>Claude Sonnet 4.6</p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", marginBottom: 20, gap: 0 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={nav(k)} style={{
            padding: "9px 16px", fontSize: 13, fontWeight: vista === k ? 600 : 400,
            borderBottom: vista === k ? "2px solid #1F4E79" : "2px solid transparent",
            color: vista === k ? "#1F4E79" : "#6B7280",
            background: "none", border: "none",
            borderBottom: vista === k ? "2px solid #1F4E79" : "2px solid transparent",
            cursor: "pointer", marginBottom: -2
          }}>{l}</button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "20px 22px" }}>
        {vista === "inicio" && (
          <PortalCiudadano onVolver={() => setVista("inicio")} />
        )}

        {vista === "funcionario" && !casoSeleccionado && (
          <VistaBandeja onSeleccionar={(c) => setCasoSeleccionado(c)} />
        )}

        {vista === "funcionario" && casoSeleccionado && (
          <VistaCasoDetalle
            caso={casoSeleccionado}
            onVolver={() => setCasoSeleccionado(null)}
          />
        )}

        {vista === "dashboard" && <DashboardM8 />}
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 10, color: "#9CA3AF", marginTop: 16 }}>
        © 2026 Defensoría del Pueblo de Colombia · Nos unen tus derechos · Ley 1581/2012 · Directiva 007/2025
      </p>
    </div>
  );
}
