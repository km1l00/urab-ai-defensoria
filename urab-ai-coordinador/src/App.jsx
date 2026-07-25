import { useState, useEffect } from "react";

// ── Backend API ────────────────────────────────────────────────────────
const API_URL = "https://urab-ai-api.onrender.com";

// Token de sesión para endpoints protegidos (RBAC).
let TOKEN_SESION = null;
const authHeaders = () => TOKEN_SESION ? { "Authorization": `Bearer ${TOKEN_SESION}` } : {};

// ── Datos ──────────────────────────────────────────────────────────────
const PROFS = [
  { id:"P01", nombre:"Ana Torres",   color:"#7C3AED", esp:["Violencia basada en género","Niñez y adolescencia"],                casos:847,  max:1200, hitl:2, venc:0,
    hist:[{fecha:"13/06",cat:"Violencia basada en género",accion:"Respuesta enviada"},{fecha:"12/06",cat:"Niñez y adolescencia",accion:"Escalado al Instituto Colombiano de Bienestar Familiar"},{fecha:"11/06",cat:"Violencia basada en género",accion:"Tutela interpuesta"}] },
  { id:"P02", nombre:"Luis Morales", color:"#059669", esp:["Salud","General"],           casos:1103, max:1200, hitl:1, venc:1,
    hist:[{fecha:"13/06",cat:"Salud",accion:"Mediación con EPS"},{fecha:"12/06",cat:"Pensiones",accion:"Respuesta enviada"},{fecha:"11/06",cat:"Salud",accion:"Término prorrogado"}] },
  { id:"P03", nombre:"Clara Ruiz",   color:"#1A3D6B", esp:["Desaparición","Conflicto"], casos:612,  max:1200, hitl:1, venc:1,
    hist:[{fecha:"13/06",cat:"Desaparición",accion:"Coordinación Fiscalía"},{fecha:"12/06",cat:"Conflicto",accion:"Respuesta enviada"},{fecha:"10/06",cat:"Desaparición",accion:"Búsqueda activada"}] },
  { id:"P04", nombre:"Jorge Vargas", color:"#D97706", esp:["General"],                  casos:954,  max:1200, hitl:0, venc:0,
    hist:[{fecha:"13/06",cat:"General",accion:"Respuesta enviada"},{fecha:"12/06",cat:"Educación",accion:"Remisión SED"},{fecha:"11/06",cat:"General",accion:"Respuesta enviada"}] },
  { id:"P05", nombre:"María Ospina", color:"#DC2626", esp:["Carcelario","Conflicto"],   casos:1089, max:1200, hitl:0, venc:1,
    hist:[{fecha:"13/06",cat:"Carcelario",accion:"Visita programada"},{fecha:"12/06",cat:"Conflicto",accion:"Respuesta enviada"},{fecha:"11/06",cat:"Carcelario",accion:"Término prorrogado"}] },
];

const CASOS = [
  { radicado:"DP-2026-004821", ciudadano:"María García",  urgencia:"critica", cat:"Violencia basada en género",         prof:"P01", tiempo:"2h",  hitl:true,  venc:false, dup:false, dias:2,  diasMax:15, fechaRad:"14/06", fechaVence:"05/07",
    estado:"Pendiente de revisión humana", explicacion:"Presencia de niñas, niños o adolescentes junto con amenaza vital. Prioridad máxima automática.", borrador:true },
  { radicado:"DP-2026-004820", ciudadano:"Carlos Pérez",  urgencia:"media",   cat:"Salud",       prof:"P02", tiempo:"6h",  hitl:false, venc:false, dup:false, dias:12, diasMax:15, fechaRad:"28/05", fechaVence:"17/06",
    estado:"En gestión", explicacion:"Negación de servicios de salud. Sin riesgo vital.", borrador:true },
  { radicado:"DP-2026-004819", ciudadano:"Rosa Martínez", urgencia:"alta",    cat:"Desaparición",prof:"P03", tiempo:"18h", hitl:true,  venc:true,  dup:false, dias:14, diasMax:15, fechaRad:"30/05", fechaVence:"15/06",
    estado:"Pendiente de revisión humana", explicacion:"Desaparición de familiar hace 72h. Hash custodia SHA-256 registrado.", borrador:true },
  { radicado:"DP-2026-004818", ciudadano:"Carlos Pérez",  urgencia:"media",   cat:"Salud",       prof:"P02", tiempo:"24h", hitl:true,  venc:false, dup:true,  dias:11, diasMax:15, fechaRad:"29/05", fechaVence:"18/06",
    estado:"Pendiente acumulación", explicacion:"Duplicado M4 — similitud 89% con DP-2026-004820.", borrador:false },
  { radicado:"DP-2026-004815", ciudadano:"Jhon Ramírez",  urgencia:"alta",    cat:"Carcelario",  prof:"P05", tiempo:"31h", hitl:false, venc:true,  dup:false, dias:15, diasMax:15, fechaRad:"13/05", fechaVence:"14/06",
    estado:"En gestión", explicacion:"Privado de libertad reporta condiciones inhumanas. Término vence hoy.", borrador:true,
    radicadoPorFuncionario:true, funcionarioRadicador:"María Ospina (P05)", canalOrigen:"Recolectada en terreno", camposCompletadosManual:["Número de cédula","Fecha del hecho"] },
];

const ALL_ESP = ["Violencia basada en género","Niñez y adolescencia","Salud","Desaparición","Conflicto","Carcelario","Migrantes","General","Pensiones","Discapacidad"];

// Mapea un caso de la API al formato de la lista de peticiones del coordinador
function mapearCasoCoord(c) {
  const profId = c.profesional_id || "P01";
  return {
    radicado: c.radicado,
    ciudadano: c.ciudadano,
    urgencia: c.urgencia,
    cat: c.categoria,
    prof: profId,
    tiempo: "nuevo",
    hitl: c.requiere_hitl && !c.hitl_resuelto,
    venc: c.vence_hoy || false,
    dup: c.es_duplicado || false,
    dias: c.dias_vence != null ? (15 - Math.max(0, c.dias_vence)) : 1,
    diasMax: 15,
    fechaRad: c.fecha ? c.fecha.split(" ")[0] : "hoy",
    fechaVence: c.fecha_vencimiento || "—",
    estado: c.estado,
    explicacion: c.explicacion_ia || "",
    borrador: false,
    gestion: c.gestion || null,
    gestiones: c.gestiones || [],
    tipo_peticion: c.tipo_peticion,
    tipo_peticion_sugerido: c.tipo_peticion_sugerido,
    override_tipo_justificacion: c.override_tipo_justificacion,
    observaciones_ia: c.observaciones_ia || [],
    devuelto_a_coordinacion: c.devuelto_a_coordinacion,
    devolucion_razon: c.devolucion_razon,
    devolucion_funcionario: c.devolucion_funcionario,
    devolucion_fecha: c.devolucion_fecha,
    devolucion_resuelta: c.devolucion_resuelta,
    tipo_recepcion: c.tipo_recepcion,
    procedimiento_recepcion: c.procedimiento_recepcion,
    caso_cerrado: c.caso_cerrado,
    observaciones_coord: c.observaciones_coord || [],
    esNuevo: true,
  };
}
const URG_B = { critica:{lbl:"CRÍTICA",bg:"#FEE2E2",color:"#991B1B",border:"#FCA5A5"}, alta:{lbl:"ALTA",bg:"#FEF3C7",color:"#92400E",border:"#FCD34D"}, media:{lbl:"MEDIA",bg:"#DBEAFE",color:"#1E40AF",border:"#93C5FD"} };
const NIVELES_ACC = ["Normal","Grande","Muy grande","Máximo"];
const SIZES_ACC   = ["14px","17px","20px","24px"];

// ── Accesibilidad ──────────────────────────────────────────────────────
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
  const cambiar = d => setNivel(n =>Math.max(0, Math.min(3, n+d)));
  return (
    <>
      <style>{`.urab-ac{filter:invert(1) hue-rotate(180deg)}.urab-ac img,.urab-ac svg{filter:invert(1) hue-rotate(180deg)}
body.urab-fs1 *{font-size:115%!important;line-height:1.65!important}
body.urab-fs2 *{font-size:130%!important;line-height:1.7!important}
body.urab-fs3 *{font-size:148%!important;line-height:1.8!important}`}</style>
      <div style={{ background:"#0F2E5A", padding:"5px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
        <span style={{ fontSize:10, color:"#93C5FD", letterSpacing:".08em" }}>TEXTO</span>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <button onClick={()=>cambiar(-1)} disabled={nivel===0} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:12, fontWeight:700, cursor:nivel===0?"not-allowed":"pointer", opacity:nivel===0?.35:1, fontFamily:"inherit" }}>A−</button>
          <button onClick={()=>cambiar(1)}  disabled={nivel===3} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:"rgba(255,255,255,.1)", color:"#fff", fontSize:12, fontWeight:700, cursor:nivel===3?"not-allowed":"pointer", opacity:nivel===3?.35:1, fontFamily:"inherit" }}>A+</button>
          <span style={{ fontSize:10, color:"#BFDBFE", padding:"0 4px", minWidth:62 }}>{NIVELES_ACC[nivel]}</span>
          <button onClick={()=>setNivel(0)} style={{ fontSize:10, color:"#93C5FD", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>Restablecer</button>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,.2)", margin:"0 2px" }}/>
          <button onClick={()=>setContraste(c=>!c)} style={{ height:26, padding:"0 9px", borderRadius:5, border:"1px solid rgba(255,255,255,.25)", background:contraste?"#FFD700":"rgba(255,255,255,.1)", color:contraste?"#000":"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>
             {contraste?"Desactivar contraste":"Alto contraste"}
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
            {[["A−","Letra más pequeña","Hace el texto más pequeño."],["A+","Letra más grande","Hace el texto más grande. Útil en pantallas pequeñas."],["Rest.","Restablecer","Vuelve al tamaño normal."],["","Alto contraste","Cambia los colores para facilitar la lectura."]].map(([ico,titulo,desc])=>(
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

// ── Logo ───────────────────────────────────────────────────────────────
const Logo = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width:44, height:44, flexShrink:0 }}>
    <circle cx="50" cy="26" r="16" fill="white" opacity=".95"/>
    <ellipse cx="37" cy="26" rx="5" ry="7" fill="#1A3D6B" transform="rotate(-15 37 26)"/>
    <ellipse cx="63" cy="26" rx="5" ry="7" fill="#1A3D6B" transform="rotate(15 63 26)"/>
    <ellipse cx="50" cy="19" rx="6" ry="8" fill="white"/>
    <path d="M10 55 Q18 38 34 42 Q42 44 48 50 Q50 52 50 52 Q50 52 52 50 Q58 44 66 42 Q82 38 90 55 Q72 68 58 65 Q54 64 50 66 Q46 64 42 65 Q28 68 10 55Z" fill="white" opacity=".95"/>
    <circle cx="28" cy="50" r="3.5" fill="#1A3D6B"/>
    <circle cx="72" cy="50" r="3.5" fill="#1A3D6B"/>
  </svg>
);

// ── Estilos base ───────────────────────────────────────────────────────
const s = {
  wrap:   { maxWidth:900, margin:"0 auto", padding:"0 16px 40px", fontFamily:"'Inter',system-ui,sans-serif" },
  hdr:    { background:"#1A3D6B", borderRadius:"0 0 12px 12px", marginBottom:0, overflow:"hidden" },
  hdrTop: { padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  hdrNav: { display:"flex", borderTop:"1px solid rgba(255,255,255,.12)", background:"rgba(0,0,0,.15)" },
  hn:     (a) => ({ padding:"10px 16px", fontSize:12, color:a?"#fff":"rgba(255,255,255,.65)", background:a?"rgba(255,255,255,.07)":"none", border:"none", borderBottom:a?"2px solid #F59E0B":"2px solid transparent", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }),
  card:   { background:"#fff", border:"0.5px solid #E5E7EB", borderRadius:10, padding:"18px 20px", marginBottom:12 },
  badge:  (u) => ({ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:9, background:URG_B[u]?.bg||"#F3F4F6", color:URG_B[u]?.color||"#374151", border:`1px solid ${URG_B[u]?.border||"#E5E7EB"}` }),
  pill:   (ex={}) => ({ fontSize:10, padding:"2px 7px", borderRadius:9, background:"#F3F4F6", color:"#6B7280", border:"0.5px solid #E5E7EB", fontWeight:500, ...ex }),
  btn:    (v="g") => ({ padding:"7px 14px", borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500, border:"0.5px solid",
    ...(v==="p"?{background:"#1A3D6B",color:"#fff",borderColor:"#1A3D6B"}:v==="w"?{background:"#FEF3C7",color:"#92400E",borderColor:"#FCD34D",fontWeight:600}:v==="r"?{background:"#FEF2F2",color:"#991B1B",borderColor:"#FCA5A5"}:{background:"#fff",color:"#374151",borderColor:"#E5E7EB"}) }),
  back:   { fontSize:11, color:"#6B7280", background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:12, fontFamily:"inherit" },
  kv:     { background:"#F9FAFB", borderRadius:6, padding:"8px 11px" },
  xai:    { background:"#EFF6FF", border:"0.5px solid #93C5FD", borderRadius:8, padding:"10px 12px", marginBottom:10 },
};

// ── Componentes ────────────────────────────────────────────────────────
function BadgeUrgencia({ u }) {
  return <span style={s.badge(u)}>{URG_B[u]?.lbl||u}</span>;
}

function TerminoSemaforo({ caso }) {
  const pct = Math.round((caso.dias / caso.diasMax) * 100);
  const venceHoy = caso.dias >= caso.diasMax;
  const venceMañana = caso.dias >= caso.diasMax - 1 && !venceHoy;
  const alerta = venceHoy ? { bg:"#FEF2F2", border:"#FCA5A5", color:"#991B1B", ico:"", lbl:"VENCE HOY" }
               : venceMañana ? { bg:"#FEF2F2", border:"#FCA5A5", color:"#991B1B", ico:"", lbl:"Vence mañana" }
               : caso.dias >= caso.diasMax - 3 ? { bg:"#FFFBEB", border:"#FCD34D", color:"#92400E", ico:"", lbl:`Vence en ${caso.diasMax - caso.dias} días` }
               : { bg:"#F0FDF4", border:"#6EE7B7", color:"#065F46", ico:"", lbl:`${caso.diasMax - caso.dias} días restantes` };
  return (
    <div style={{ background:alerta.bg, border:`1px solid ${alerta.border}`, borderRadius:8, padding:"10px 14px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
        <span style={{ fontSize:16 }}>{alerta.ico}</span>
        <span style={{ fontSize:12, fontWeight:700, color:alerta.color }}>{alerta.lbl}</span>
        <span style={{ fontSize:11, color:alerta.color }}>— Radicada {caso.fechaRad} · Vence {caso.fechaVence} · {caso.dias}/{caso.diasMax} días hábiles (CPACA Art. 14)</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:9, color:"#9CA3AF", minWidth:88, flexShrink:0 }}>Término legal</span>
        <div style={{ flex:1, height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:venceHoy||venceMañana?"#EF4444":caso.dias>=caso.diasMax-3?"#F59E0B":"#22C55E", borderRadius:3 }} />
        </div>
      </div>
    </div>
  );
}

function ModalAccion({ tipo, casoRad, onClose, onConfirm }) {
  const [txt, setTxt] = useState("");
  const [prof, setProf] = useState(PROFS[0].nombre);
  if (!tipo) return null;
  const config = {
    devolver:      { titulo:" Devolver gestión al profesional",  desc:"El profesional recibirá su observación y deberá corregir la gestión antes de enviar la respuesta.", placeholder:"Ej: La respuesta no cita la jurisprudencia aplicable. Revisar Sentencia T-025/04..." },
    reasignar:     { titulo:" Reasignar caso",                   desc:"La reasignación queda registrada en la trazabilidad del caso con la razón indicada.", placeholder:"Razón de reasignación..." },
    recomendacion: { titulo:" Agregar recomendación",            desc:"La recomendación queda visible para el profesional asignado.", placeholder:"Ej: Considerar acción de tutela por vulneración del derecho a la vida..." },
  }[tipo];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
      <div style={{ background:"#fff", borderRadius:10, padding:20, maxWidth:440, width:"100%", border:"0.5px solid #E5E7EB" }}>
        <h3 style={{ fontSize:14, fontWeight:600, color:"#1A3D6B", marginBottom:6 }}>{config.titulo}</h3>
        <p style={{ fontSize:12, color:"#6B7280", marginBottom:12, lineHeight:1.6 }}>{config.desc}</p>
        {tipo==="reasignar" && (
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:"#6B7280", display:"block", marginBottom:4 }}>Nuevo profesional *</label>
            <select value={prof} onChange={e=>setProf(e.target.value)} style={{ width:"100%", padding:"7px 10px", borderRadius:6, border:"0.5px solid #D1D5DB", fontSize:12, fontFamily:"inherit", marginBottom:10 }}>
              {PROFS.map(p=><option key={p.id}>{p.nombre} ({p.id}) · {p.esp.join(", ")} — {p.casos} casos</option>)}
            </select>
          </div>
        )}
        <label style={{ fontSize:11, color:"#6B7280", display:"block", marginBottom:4 }}>{tipo==="reasignar"?"Razón de reasignación *":"Observación *"}</label>
        <textarea value={txt} onChange={e=>setTxt(e.target.value)} placeholder={config.placeholder}
          style={{ width:"100%", minHeight:70, padding:"8px 10px", borderRadius:6, border:"0.5px solid #D1D5DB", fontSize:12, fontFamily:"inherit", resize:"vertical", marginBottom:12, boxSizing:"border-box" }} />
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button style={s.btn("g")} onClick={onClose}>Cancelar</button>
          <button style={s.btn(tipo==="devolver"?"w":"p")} onClick={()=>{ if(txt.trim()||tipo==="reasignar") onConfirm(tipo, txt, prof); }}>
            {tipo==="devolver"?"Devolver":tipo==="reasignar"?"Confirmar reasignación":"Agregar recomendación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Secciones ──────────────────────────────────────────────────────────
function Dashboard({ onVerProf, onVerCaso }) {
  const criticasMock = CASOS.filter(c=>c.urgencia==="critica").length;
  const hitlMock     = CASOS.filter(c=>c.hitl).length;
  const vencMock     = CASOS.filter(c=>c.venc).length;

  const [metricas, setMetricas] = useState(null);
  const [errorAPI, setErrorAPI] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch(`${API_URL}/api/dashboard/metricas`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error("API no disponible");
        const data = await resp.json();
        if (!cancelado) setMetricas(data);
      } catch (e) {
        if (!cancelado) setErrorAPI(true);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // Usar datos de la API si están disponibles, sino los mock
  const criticas = metricas ? metricas.criticas_activas : criticasMock;
  const hitl     = metricas ? metricas.hitl_pendientes : hitlMock;
  const venc     = vencMock;
  const total    = metricas ? metricas.total_peticiones : CASOS.length;

  return (
    <div>
      <div style={s.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <h3 style={{ fontSize:13, color:"#1A3D6B", fontWeight:600, margin:0 }}>Resumen operativo — {new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"2-digit", year:"numeric" })}</h3>
          {metricas && <span style={{ fontSize:10, color:"#166534", background:"#DCFCE7", border:"0.5px solid #86EFAC", borderRadius:9, padding:"2px 8px", fontWeight:600 }}>● Datos en vivo del servidor</span>}
          {errorAPI && <span style={{ fontSize:10, color:"#92400E", background:"#FEF3C7", border:"0.5px solid #FCD34D", borderRadius:9, padding:"2px 8px" }}>Datos de demostración</span>}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
          {[
            ["Casos críticos",criticas,"#EF4444","#FEF2F2","Requieren atención inmediata"],
            ["revisiones humanas pendientes",hitl,"#F59E0B","#FEF9C3","Revisión humana requerida"],
            ["Términos en riesgo",venc,"#EF4444","#FEF2F2","Plazo legal próximo a vencer"],
            ["Total peticiones",total,"#059669","#ECFDF5","URAB Bogotá · sistema"],
          ].map(([l,v,c,bg,ss])=>(
            <div key={l} style={{ background:bg, borderRadius:8, padding:"12px 14px", borderLeft:`3px solid ${c}` }}>
              <p style={{ fontSize:10, color:"#6B7280", marginBottom:4 }}>{l}</p>
              <p style={{ fontSize:22, fontWeight:600, color:c, margin:"0 0 3px" }}>{v}</p>
              <p style={{ fontSize:10, color:c, margin:0 }}>{ss}</p>
            </div>
          ))}
        </div>
        <div style={{ background:"#EFF6FF", border:"0.5px solid #BFDBFE", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:11, color:"#1E40AF", lineHeight:1.8 }}>
          <strong>¿Qué son los términos legales en riesgo?</strong>La Ley 1437 de 2011, artículo 14 del Código de Procedimiento Administrativo, establece que la Defensoría tiene <strong>15 días hábiles</strong> para responder peticiones y quejas. Cuando un caso se acerca a ese límite sin respuesta, URAB-AI lo marca en rojo para que la coordinadora actúe antes de que venza el plazo. Incumplir puede generar incidente de desacato y responsabilidad disciplinaria (Ley 734 de 2002).<br/>
          <strong>¿Qué es el umbral de carga?</strong>Cada profesional tiene un máximo de casos activos (1.200 en el piloto). Cuando supera el 90%, M3 deja de asignarle casos automáticamente y la coordinadora recibe una alerta.
        </div>
        <h4 style={{ fontSize:12, fontWeight:600, color:"#111827", marginBottom:12 }}>Carga por profesional — haz clic para ver sus casos</h4>
        {PROFS.map(p=>{
          const pct = Math.round((p.casos/p.max)*100);
          const bc  = pct>90?"#EF4444":pct>75?"#F59E0B":"#059669";
          return (
            <div key={p.id} style={{ border:"0.5px solid #E5E7EB", borderRadius:8, padding:"12px 14px", marginBottom:8, cursor:"pointer" }}
              onClick={()=>onVerProf(p.id)}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:p.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                  {p.nombre.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:"#111827", margin:"0 0 1px" }}>{p.nombre} <span style={{ fontSize:9, color:"#9CA3AF" }}>{p.id}</span></p>
                  <p style={{ fontSize:10, color:"#6B7280", margin:0 }}>Especialidades: {p.esp.join(", ")}</p>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {p.hitl>0 && <span style={s.pill({background:"#FEF9C3",color:"#713F12",borderColor:"#FDE047",fontWeight:700})}>{p.hitl} por revisar</span>}
                  {p.venc>0 && <span style={s.pill({background:"#FEE2E2",color:"#991B1B",borderColor:"#FCA5A5",fontSize:9})}>término</span>}
                  <span style={{ fontSize:10, color:"#1A3D6B" }}>Ver casos </span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:9, color:"#9CA3AF", minWidth:88, flexShrink:0 }}>Carga de casos</span>
                <div style={{ flex:1, height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:bc, borderRadius:3 }} />
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#6B7280" }}>
                <span>{p.casos} casos activos de {p.max} máximo</span>
                <span style={{ color:bc, fontWeight:600 }}>{pct}% de capacidad — {pct>90?" No recibe casos nuevos automáticamente":pct>75?" Carga alta":" Carga normal"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Peticiones({ onAbrirCaso }) {
  const [casosAPI, setCasosAPI] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usandoRespaldo, setUsandoRespaldo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch(`${API_URL}/api/casos`, { headers: { ...authHeaders() } });
        if (!resp.ok) throw new Error("API no disponible");
        const data = await resp.json();
        if (!cancelado) { setCasosAPI(data.map(mapearCasoCoord)); setUsandoRespaldo(false); }
      } catch (e) {
        // El backend no respondió (puede estar despertando). Se usa el
        // respaldo local solo para no dejar la demostración vacía.
        if (!cancelado) setUsandoRespaldo(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // Datos reales del backend. Solo si el backend no respondió se recurre
  // al respaldo local, y nunca se mezclan: los datos mostrados provienen
  // de una sola fuente, para no crear inconsistencias.
  const listaCasos = usandoRespaldo ? CASOS : casosAPI;

  return (
    <div style={s.card}>
      <h3 style={{ fontSize:13, color:"#1A3D6B", marginBottom:8, fontWeight:600 }}>Todas las peticiones activas</h3>
      <div style={{ display:"flex", gap:14, marginBottom:14, flexWrap:"wrap", fontSize:10, color:"#6B7280", background:"#F9FAFB", borderRadius:7, padding:"8px 12px" }}>
        <span style={{ fontWeight:600, color:"#374151" }}>Cómo leer cada caso:</span>
        <span><span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:"#FEE2E2", border:"1.5px solid #EF4444", marginRight:4, verticalAlign:"middle" }}></span>Borde izquierdo = nivel de urgencia</span>
        <span><span style={{ display:"inline-block", width:16, height:6, borderRadius:3, background:"#EF4444", marginRight:4, verticalAlign:"middle" }}></span>Barra roja = término legal por vencer (Código de Procedimiento Administrativo, artículo 14)</span>
        <span><span style={{ display:"inline-block", width:10, height:10, background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:2, marginRight:4, verticalAlign:"middle" }}></span>Fondo amarillo = vence pronto</span>
      </div>
      {listaCasos.map(c=>(
        <div key={c.radicado} onClick={()=>onAbrirCaso(c)}
          style={{ border:`0.5px solid ${c.venc?"#FCD34D":"#E5E7EB"}`, borderRadius:8, padding:"11px 14px", cursor:"pointer", marginBottom:8, background:c.venc?"#FFFBEB":"#fff", borderLeft:`3px solid ${URG_B[c.urgencia]?.border||"#E5E7EB"}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#1A3D6B" }}>{c.radicado}</span>
            <BadgeUrgencia u={c.urgencia} />
            <span style={s.pill()}>{c.cat}</span>
            {c.esNuevo && <span style={s.pill({background:"#DCFCE7",color:"#166534",borderColor:"#86EFAC",fontWeight:700})}>● EN VIVO</span>}
            {c.hitl && <span style={s.pill({background:"#FEF9C3",color:"#713F12",borderColor:"#FDE047",fontWeight:700})}>Revisión humana</span>}
            {c.dup  && <span style={s.pill({background:"#EDE9FE",color:"#4C1D95",borderColor:"#C4B5FD"})}>DUPLICADO</span>}
            {c.venc && <span style={s.pill({background:"#FEE2E2",color:"#991B1B",borderColor:"#FCA5A5",fontSize:9})}>VENCE HOY</span>}
            {c.radicadoPorFuncionario && <span style={s.pill({background:"#F5F3FF",color:"#5B21B6",borderColor:"#C4B5FD",fontWeight:700})}>Radicada por funcionario</span>}
            <span style={{ marginLeft:"auto", fontSize:10, color:"#9CA3AF" }}>{c.tiempo} en cola</span>
          </div>
          <div style={{ fontSize:11, color:"#6B7280" }}>
            {c.ciudadano} · Prof: <span style={{ color:"#059669", fontWeight:500 }}>{PROFS.find(p=>p.id===c.prof)?.nombre}</span> · {c.estado}
          </div>
          {c.radicadoPorFuncionario && (
            <div style={{ marginTop:6, background:"#F5F3FF", borderRadius:6, padding:"6px 9px", fontSize:10, color:"#5B21B6" }}>
              Radicada por {c.funcionarioRadicador} · {c.canalOrigen} · Campos completados manualmente: {c.camposCompletadosManual.join(", ")}
            </div>
          )}
          <div style={{ height:4, background:"#E5E7EB", borderRadius:2, overflow:"hidden", marginTop:7 }}>
            <div style={{ height:"100%", width:`${Math.round((c.dias/c.diasMax)*100)}%`, background:c.dias>=c.diasMax?"#EF4444":c.dias>=c.diasMax-3?"#F59E0B":"#22C55E", borderRadius:2 }} />
          </div>
          <p style={{ fontSize:9, color:"#9CA3AF", marginTop:2 }}>Término legal: {c.dias}/{c.diasMax} días hábiles · Vence {c.fechaVence}</p>
        </div>
      ))}
    </div>
  );
}

function DetalleCaso({ caso, acciones, onVolver, onAccion }) {
  const API_URL = "https://urab-ai-api.onrender.com";
  const [obsInput, setObsInput] = useState("");
  const [observaciones, setObservaciones] = useState(caso.observaciones_coord || []);
  const [enviandoObs, setEnviandoObs] = useState(false);
  const [reasignarA, setReasignarA] = useState("");
  const [devolucionResuelta, setDevolucionResuelta] = useState(caso.devolucion_resuelta || false);
  const enviarObs = async () => {
    if (!obsInput.trim()) return;
    setEnviandoObs(true);
    const nueva = { observacion: obsInput, coordinador: "Coord. URAB", fecha: new Date().toLocaleDateString("es-CO"), indice_gestion: null };
    try {
      await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/observacion-coordinador`, {
        method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ observacion: obsInput, indice_gestion: null, coordinador: "Coord. URAB" })
      });
    } catch(e) { /* modo demo */ }
    setObservaciones([...observaciones, nueva]);
    setObsInput("");
    setEnviandoObs(false);
  };
  return (
    <div style={s.card}>
      <button style={s.back} onClick={onVolver}> Volver a todas las peticiones</button>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <h3 style={{ fontSize:14, color:"#1A3D6B", fontWeight:600, margin:0 }}>{caso.radicado}</h3>
            <BadgeUrgencia u={caso.urgencia} />
            {caso.hitl && <span style={s.pill({background:"#FEF9C3",color:"#713F12",borderColor:"#FDE047",fontWeight:700})}>Revisión humana</span>}
          </div>
          <p style={{ fontSize:11, color:"#6B7280", margin:0 }}>{caso.ciudadano} · Prof: <strong style={{ color:"#059669" }}>{PROFS.find(p=>p.id===caso.prof)?.nombre || caso.prof}</strong> · {caso.estado}</p>
        </div>
        <span style={{ fontSize:10, color:"#9CA3AF" }}>{caso.tiempo} en cola</span>
      </div>

      <TerminoSemaforo caso={caso} />

      {caso.radicadoPorFuncionario && (
        <div style={{ background:"#F5F3FF", borderLeft:"3px solid #7C3AED", borderRadius:"0 8px 8px 0", padding:"10px 14px", marginBottom:10 }}>
          <p style={{ fontSize:11, fontWeight:600, color:"#5B21B6", margin:"0 0 4px" }}>Radicada directamente por funcionario — no por el ciudadano</p>
          <p style={{ fontSize:11, color:"#5B21B6", margin:0, lineHeight:1.5 }}>
            Profesional: {caso.funcionarioRadicador} · Canal: {caso.canalOrigen}. Campos completados manualmente porque M1 no pudo extraerlos del archivo: <strong>{caso.camposCompletadosManual.join(", ")}</strong>. Verifique que los datos manuales sean correctos.
          </p>
        </div>
      )}

      {acciones.devuelto && (
        <div style={{ background:"#FFFBEB", borderLeft:"3px solid #F59E0B", borderRadius:"0 8px 8px 0", padding:"10px 14px", marginBottom:10 }}>
          <p style={{ fontSize:11, fontWeight:600, color:"#92400E", margin:"0 0 4px" }}>Observación de la coordinadora</p>
          <p style={{ fontSize:11, color:"#78350F", margin:0 }}>{acciones.devuelto}</p>
        </div>
      )}
      {acciones.recomendacion && (
        <div style={{ background:"#EFF6FF", borderLeft:"3px solid #3B82F6", borderRadius:"0 8px 8px 0", padding:"10px 14px", marginBottom:10 }}>
          <p style={{ fontSize:11, fontWeight:600, color:"#1E40AF", margin:"0 0 4px" }}>Recomendación de la coordinadora</p>
          <p style={{ fontSize:11, color:"#1E40AF", margin:0 }}>{acciones.recomendacion}</p>
        </div>
      )}

      <div style={s.xai}>
        <p style={{ fontSize:9, fontWeight:700, color:"#1E40AF", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Explicación de la clasificación automática · Directiva Conjunta 007 de 2025</p>
        <p style={{ fontSize:11, color:"#1E40AF", margin:"0 0 6px", lineHeight:1.6 }}>{caso.explicacion}</p>
        <p style={{ fontSize:10, color:"#3B82F6", margin:0, lineHeight:1.5, fontStyle:"italic" }}>Clasificación propuesta por un sistema de inteligencia artificial. Es una sugerencia sujeta a revisión: el profesional responsable confirma o corrige, y toda respuesta al ciudadano requiere aprobación humana.</p>
      </div>

      {caso.observaciones_ia && caso.observaciones_ia.length > 0 && (
        <div style={{ background:"#F5F3FF", border:"1px solid #C4B5FD", borderRadius:8, padding:"12px 14px", marginTop:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#5B21B6", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>
            Observaciones del profesional sobre la inteligencia artificial
          </p>
          <p style={{ fontSize:10, color:"#7C3AED", margin:"0 0 8px", lineHeight:1.5 }}>
            El profesional reportó lo siguiente sobre las propuestas del sistema. Estas observaciones alimentan la auditoría periódica del modelo.
          </p>
          {caso.observaciones_ia.map((o, i) => {
            const tiposLbl = {
              clasificacion_incorrecta: "La clasificación no corresponde",
              dato_no_detectado: "No detectó un dato importante",
              gestion_inadecuada: "Gestiones sugeridas inadecuadas",
              borrador_impreciso: "Borrador impreciso o incompleto",
              reparto_incorrecto: "Reparto no corresponde a la especialidad",
              otro: "Otro",
            };
            return (
              <div key={i} style={{ paddingBottom:8, marginBottom:8, borderBottom: i < caso.observaciones_ia.length-1 ? "0.5px solid #DDD6FE" : "none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:2 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:"#5B21B6" }}>{tiposLbl[o.tipo_error] || o.tipo_error}</span>
                  <span style={{ fontSize:10, color:"#A78BFA", flexShrink:0 }}>{o.modulo}</span>
                </div>
                <p style={{ fontSize:11, color:"#4C1D95", margin:"0 0 2px", lineHeight:1.5 }}>{o.comentario}</p>
                <p style={{ fontSize:10, color:"#A78BFA", margin:0 }}>{o.funcionario} · {o.fecha}</p>
              </div>
            );
          })}
        </div>
      )}

      {caso.devuelto_a_coordinacion && !caso.devolucion_resuelta && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:8, padding:"12px 14px", marginTop:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#991B1B", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Caso devuelto por falta de competencia</p>
          <p style={{ fontSize:11, color:"#7F1D1D", margin:"0 0 4px", lineHeight:1.5 }}>
            <strong>{caso.devolucion_funcionario}</strong> devolvió este caso el {caso.devolucion_fecha}. Requiere reasignación a un profesional con la competencia adecuada.
          </p>
          <p style={{ fontSize:11, color:"#7F1D1D", margin:"0 0 10px", lineHeight:1.5 }}><strong>Razón:</strong> {caso.devolucion_razon}</p>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <select value={reasignarA} onChange={e => setReasignarA(e.target.value)}
              style={{ padding:"6px 9px", borderRadius:6, border:"0.5px solid #FCA5A5", fontSize:11, fontFamily:"inherit", background:"#fff" }}>
              <option value="">Reasignar a...</option>
              {PROFS.filter(p => p.nombre !== caso.devolucion_funcionario).map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — {p.esp.join(", ")}</option>
              ))}
            </select>
            <button
              style={{ padding:"6px 12px", borderRadius:6, border:"none", background: reasignarA ? "#DC2626" : "#D1D5DB", color:"#fff", fontSize:11, fontWeight:600, cursor: reasignarA ? "pointer" : "not-allowed", fontFamily:"inherit" }}
              disabled={!reasignarA}
              onClick={async () => {
                try {
                  await fetch(`${API_URL}/api/casos/${encodeURIComponent(caso.radicado)}/resolver-devolucion`, {
                    method:"PUT", headers:{ "Content-Type":"application/json" },
                    body: JSON.stringify({ profesional_id: reasignarA, razon: "Reasignado tras devolución por falta de competencia.", coordinador: "Coordinación URAB" })
                  });
                } catch(e) { /* modo demo */ }
                setDevolucionResuelta(true);
              }}>
              Reasignar y resolver devolución
            </button>
          </div>
          {devolucionResuelta && (
            <p style={{ fontSize:11, color:"#065F46", fontWeight:600, marginTop:8, marginBottom:0 }}>Devolución resuelta. El caso fue reasignado y el nuevo profesional fue notificado.</p>
          )}
        </div>
      )}

      {caso.override_tipo_justificacion && (
        <div style={{ background:"#FEF3C7", border:"0.5px solid #FCD34D", borderRadius:8, padding:"12px 14px", marginTop:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#92400E", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Cambio de la clasificación automática</p>
          <p style={{ fontSize:11, color:"#78350F", margin:"0 0 4px", lineHeight:1.5 }}>El funcionario reclasificó este caso: M2 sugirió <strong>{({asesoria:"Asesoría",solicitud:"Solicitud",queja:"Queja"})[caso.tipo_peticion_sugerido] || caso.tipo_peticion_sugerido}</strong> y el funcionario lo cambió a <strong>{({asesoria:"Asesoría",solicitud:"Solicitud",queja:"Queja"})[caso.tipo_peticion] || caso.tipo_peticion}</strong>.</p>
          <p style={{ fontSize:11, color:"#78350F", margin:0 }}><strong>Justificación:</strong> {caso.override_tipo_justificacion}</p>
        </div>
      )}

      {caso.gestiones && caso.gestiones.length > 0 && (
        <div style={{ background:"#ECFDF5", border:"0.5px solid #6EE7B7", borderRadius:8, padding:"12px 14px", marginTop:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#065F46", marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>Gestiones del funcionario</p>
          {caso.gestiones.filter(g=>g.confirmada).map((g,i)=>(
            <div key={i} style={{ paddingBottom:8, marginBottom:8, borderBottom: i<caso.gestiones.filter(x=>x.confirmada).length-1?"0.5px solid #A7F3D0":"none" }}>
              <p style={{ fontSize:11, color:"#065F46", fontWeight:500, margin:"0 0 2px" }}>{g.accion}</p>
              {g.entidad && <p style={{ fontSize:10, color:"#047857", margin:0 }}>Entidad: {g.entidad}</p>}
              {g.respuesta ? (
                <p style={{ fontSize:10, color:"#047857", margin:"3px 0 0" }}>Respondida el {g.fecha_respuesta}: {g.respuesta}</p>
              ) : (
                <p style={{ fontSize:10, color:"#92400E", margin:"3px 0 0", fontStyle:"italic" }}>En trámite — sin respuesta aún</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Revisión del coordinador — observaciones sobre la gestión */}
      <div style={{ background:"#FFFBEB", border:"0.5px solid #FCD34D", borderRadius:8, padding:"12px 14px", marginTop:12 }}>
        <p style={{ fontSize:11, fontWeight:700, color:"#92400E", marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>Revisión de la coordinación</p>
        {observaciones.length > 0 && (
          <div style={{ marginBottom:10 }}>
            {observaciones.map((o,i)=>(
              <div key={i} style={{ background:"#fff", borderRadius:6, padding:"8px 10px", marginBottom:6, borderLeft:"3px solid #F59E0B" }}>
                <p style={{ fontSize:11, color:"#78350F", margin:"0 0 2px" }}>{o.observacion}</p>
                <p style={{ fontSize:9, color:"#9CA3AF", margin:0 }}>{o.coordinador} · {o.fecha}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:6 }}>
          <input value={obsInput} onChange={e=>setObsInput(e.target.value)} placeholder="Escriba una observación sobre la gestión del funcionario..." style={{ flex:1, padding:"8px 10px", borderRadius:6, border:"0.5px solid #D1D5DB", fontSize:11, fontFamily:"inherit" }} />
          <button style={s.btn("p")} disabled={enviandoObs || !obsInput.trim()} onClick={enviarObs}>{enviandoObs?"Enviando...":"Registrar observación"}</button>
        </div>
      </div>

      <div style={{ background:"#F9FAFB", borderRadius:8, padding:"14px", marginTop:12 }}>
        <p style={{ fontSize:12, fontWeight:600, color:"#111827", marginBottom:10 }}>Acciones de la coordinadora</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={s.btn("w")} onClick={()=>onAccion("devolver")}>Devolver con observación</button>
          <button style={s.btn("p")} onClick={()=>onAccion("reasignar")}>Reasignar caso</button>
          <button style={s.btn("g")} onClick={()=>onAccion("recomendacion")}>Agregar recomendación</button>
          <button style={s.btn("r")} onClick={()=>alert("Caso escalado al Defensor Regional. Notificación enviada.")}>Escalar a Defensor Regional</button>
        </div>
      </div>
    </div>
  );
}

function Profesionales({ initProf, onClearProf }) {
  const [profDetalle, setProfDetalle] = useState(initProf||null);
  useEffect(()=>{ if(initProf){ setProfDetalle(initProf); onClearProf&&onClearProf(); } },[initProf]);
  const [espModal, setEspModal] = useState(null);
  const [espState, setEspState] = useState({});
  const [profsState, setProfsState] = useState(PROFS.map(p=>({...p, esp:[...p.esp]})));

  const p = profDetalle ? profsState.find(x=>x.id===profDetalle) : null;
  const misCasos = p ? CASOS.filter(c=>c.prof===p.id) : [];

  if (p) {
    const pct = Math.round((p.casos/p.max)*100);
    const bc  = pct>90?"#EF4444":pct>75?"#F59E0B":"#059669";
    return (
      <div style={s.card}>
        <button style={s.back} onClick={()=>setProfDetalle(null)}> Volver a profesionales</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:p.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 }}>
            {p.nombre.split(" ").map(n=>n[0]).join("").slice(0,2)}
          </div>
          <div style={{ flex:1 }}>
            <h3 style={{ fontSize:15, fontWeight:600, color:"#1A3D6B", margin:"0 0 2px" }}>{p.nombre} · {p.id}</h3>
            <p style={{ fontSize:11, color:"#6B7280", margin:0 }}>Especialidades: <strong>{p.esp.join(", ")}</strong></p>
          </div>
          <button style={s.btn("g")} onClick={()=>{ const st={}; ALL_ESP.forEach(e=>st[e]=p.esp.includes(e)); setEspState(st); setEspModal(p.id); }}>Editar especialidades</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
          {[["Casos activos",p.casos,bc],["Capacidad",Math.round((p.casos/p.max)*100)+"%",bc],["revisiones humanas pendientes",p.hitl,p.hitl>0?"#F59E0B":"#059669"],["Términos en riesgo",p.venc,p.venc>0?"#EF4444":"#059669"]].map(([l,v,c])=>(
            <div key={l} style={s.kv}><p style={{ fontSize:9, color:"#9CA3AF", margin:"0 0 2px", textTransform:"uppercase", letterSpacing:".05em" }}>{l}</p><p style={{ fontSize:12, fontWeight:600, color:c, margin:0 }}>{v}</p></div>
          ))}
        </div>
        <div style={{ height:8, background:"#E5E7EB", borderRadius:4, overflow:"hidden", marginBottom:5 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:bc, borderRadius:4 }} />
        </div>
        <p style={{ fontSize:10, color:bc, fontWeight:600, marginBottom:16 }}>{p.casos} / {p.max} casos · {pct}% de capacidad — {pct>90?" No recibe casos nuevos automáticamente":pct>75?" Carga alta":" Carga normal"}</p>

        <p style={{ fontSize:12, fontWeight:600, color:"#111827", marginBottom:10 }}>Casos en su bandeja activa ({misCasos.length})</p>
        {misCasos.length ? misCasos.map(c=>(
          <div key={c.radicado} style={{ border:`0.5px solid ${c.venc?"#FCD34D":"#E5E7EB"}`, borderRadius:8, padding:"10px 12px", marginBottom:8, borderLeft:`3px solid ${URG_B[c.urgencia]?.border||"#E5E7EB"}`, background:c.venc?"#FFFBEB":"#fff" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#1A3D6B" }}>{c.radicado}</span>
              <BadgeUrgencia u={c.urgencia} />
              <span style={s.pill()}>{c.cat}</span>
              {c.hitl && <span style={s.pill({background:"#FEF9C3",color:"#713F12",borderColor:"#FDE047",fontWeight:700,fontSize:9})}>Revisión</span>}
              {c.venc && <span style={s.pill({background:"#FEE2E2",color:"#991B1B",borderColor:"#FCA5A5",fontSize:9})}>VENCE HOY</span>}
            </div>
            <p style={{ fontSize:11, color:"#6B7280", margin:0 }}>{c.ciudadano} · {c.estado} · {c.tiempo} en cola · Vence {c.fechaVence}</p>
          </div>
        )) : <p style={{ fontSize:12, color:"#9CA3AF", padding:"16px 0", textAlign:"center" }}>Sin casos activos en este momento</p>}

        <p style={{ fontSize:12, fontWeight:600, color:"#111827", margin:"16px 0 10px" }}>Historial reciente de gestiones</p>
        {p.hist.map((h,i)=>(
          <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"0.5px solid #F3F4F6", fontSize:11 }}>
            <span style={{ color:"#9CA3AF", minWidth:44 }}>{h.fecha}</span>
            <span style={{ background:"#EFF6FF", color:"#1A3D6B", padding:"1px 7px", borderRadius:8, fontSize:10, fontWeight:500, flexShrink:0 }}>{h.cat}</span>
            <span style={{ color:"#6B7280" }}>{h.accion}</span>
          </div>
        ))}

        {espModal && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
            <div style={{ background:"#fff", borderRadius:10, padding:20, maxWidth:420, width:"100%", border:"0.5px solid #E5E7EB" }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:"#1A3D6B", marginBottom:6 }}>Editar especialidades</h3>
              <p style={{ fontSize:11, color:"#6B7280", marginBottom:12, lineHeight:1.6 }}>Marque las categorías que este profesional puede atender como especialista. M3 usará este perfil para asignar casos por especialidad antes de considerar la carga.</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                {ALL_ESP.map(e=>(
                  <label key={e} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, cursor:"pointer", padding:"5px 10px", borderRadius:20, border:`1.5px solid ${espState[e]?"#2E75B6":"#E5E7EB"}`, background:espState[e]?"#EFF6FF":"#fff" }}>
                    <input type="checkbox" checked={!!espState[e]} onChange={ev=>setEspState(s=>({...s,[e]:ev.target.checked}))} style={{ cursor:"pointer" }} />
                    {e}
                  </label>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button style={s.btn("g")} onClick={()=>setEspModal(null)}>Cancelar</button>
                <button style={s.btn("p")} onClick={()=>{
                  setProfsState(ps=>ps.map(x=>x.id===espModal?{...x,esp:ALL_ESP.filter(e=>espState[e])}:x));
                  setEspModal(null);
                }}>Guardar especialidades</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize:13, color:"#1A3D6B", marginBottom:14, fontWeight:600 }}>Profesionales URAB — haz clic para ver sus casos</h3>
      {profsState.map(p=>{
        const pct=Math.round((p.casos/p.max)*100), bc=pct>90?"#EF4444":pct>75?"#F59E0B":"#059669";
        const nCasos=CASOS.filter(c=>c.prof===p.id).length;
        return (
          <div key={p.id} style={{ border:"0.5px solid #E5E7EB", borderRadius:8, padding:"14px", marginBottom:10, cursor:"pointer" }} onClick={()=>setProfDetalle(p.id)}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#9CA3AF"} onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:p.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                {p.nombre.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:"#111827", margin:"0 0 1px" }}>{p.nombre} <span style={{ fontSize:9, color:"#9CA3AF" }}>{p.id}</span></p>
                <p style={{ fontSize:10, color:"#6B7280", margin:0 }}>Especialidades: <strong>{p.esp.join(", ")}</strong> · {nCasos} casos en bandeja</p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {p.hitl>0&&<span style={s.pill({background:"#FEF9C3",color:"#713F12",borderColor:"#FDE047",fontWeight:700})}>{p.hitl} por revisar</span>}
                {p.venc>0&&<span style={s.pill({background:"#FEE2E2",color:"#991B1B",borderColor:"#FCA5A5",fontSize:9})}>término</span>}
                <span style={{ fontSize:10, color:"#1A3D6B", fontWeight:500 }}>Ver </span>
              </div>
            </div>
            <div style={{ height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden", marginBottom:3 }}>
              <div style={{ height:"100%", width:`${pct}%`, background:bc, borderRadius:3 }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#6B7280" }}>
              <span>{p.casos} / {p.max} casos</span>
              <span style={{ color:bc, fontWeight:600 }}>{pct}% — {pct>90?" Sin asignaciones nuevas automáticas":pct>75?" Carga alta":" Normal"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Alertas({ onAbrirCaso }) {
  const casosManuales = CASOS.filter(c => c.radicadoPorFuncionario);

  const alertas = [
    { ico:"", tipo:"venc", titulo:"DP-2026-004815 · Carcelario · VENCE HOY", desc:"Jhon Ramírez · 31h en cola · María Ospina (P05) · El plazo legal de 15 días hábiles se cumple hoy (Código de Procedimiento Administrativo, artículo 14). Escalar ahora.", rad:"DP-2026-004815" },
    { ico:"", tipo:"venc", titulo:"DP-2026-004819 · Desaparición · Vence mañana + revisión humana pendiente", desc:"Rosa Martínez · 18h en cola · Clara Ruiz (P03) · Vence 15/06. La revisión humana pendiente bloquea la respuesta. Acción doble urgente.", rad:"DP-2026-004819" },
    ...casosManuales.map(c => ({
      ico:"", tipo:"manual",
      titulo:`${c.radicado} · Radicada directamente por funcionario`,
      desc:`${c.ciudadano} · Canal: ${c.canalOrigen} · Radicada por ${c.funcionarioRadicador}, no por el ciudadano. Campos completados manualmente: ${c.camposCompletadosManual.join(", ")}. Verifique que la extracción de M1 y el completado manual sean correctos antes de avanzar.`,
      rad:c.radicado
    })),
    { ico:"", tipo:"venc3", titulo:"DP-2026-004820 · Salud · Vence en 3 días", desc:"Carlos Pérez · 6h en cola · Luis Morales (P02) · Vence 17/06. Profesional al 92% de carga. Monitorear.", rad:"DP-2026-004820" },
    { ico:"", tipo:"carga", titulo:"Luis Morales (P02) al 92% de capacidad", desc:"1.103 casos activos / 1.200 máximo. M3 no le asigna casos nuevos automáticamente. Clara Ruiz (P03) tiene 612 casos — considerar redistribuir hacia ella.", rad:null },
  ];
  const colorMap = {
    venc:  ["#FEF2F2","#FCA5A5","#991B1B"],
    venc3: ["#FFFBEB","#FCD34D","#713F12"],
    carga: ["#EFF6FF","#93C5FD","#1E40AF"],
    manual:["#F5F3FF","#C4B5FD","#5B21B6"],
  };
  return (
    <div style={s.card}>
      <h3 style={{ fontSize:13, color:"#1A3D6B", marginBottom:14, fontWeight:600 }}>Alertas activas — acción requerida</h3>
      {alertas.map((a,i)=>{
        const [bg,bdr,col]=colorMap[a.tipo];
        return (
          <div key={i} style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:8, padding:"12px 14px", marginBottom:10, display:"flex", alignItems:"flex-start", gap:10 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{a.ico}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:12, fontWeight:600, color:col, margin:"0 0 3px" }}>{a.titulo}</p>
              <p style={{ fontSize:11, color:col, margin:0, lineHeight:1.5, opacity:.9 }}>{a.desc}</p>
            </div>
            {a.rad && <button style={{ ...s.btn("g"), fontSize:10, padding:"4px 10px", flexShrink:0 }} onClick={()=>onAbrirCaso(CASOS.find(c=>c.radicado===a.rad))}>Ver caso</button>}
          </div>
        );
      })}
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────
// ── Panel de auditoría del modelo ───────────────────────────────────────
// RFP §4.6 (evaluación periódica por deriva) y §6.5 (informes periódicos).
// Reúne la evidencia empírica que alimenta la auditoría algorítmica anual.
function AuditoriaModelo() {
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [salud, setSalud] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API_URL}/api/auditoria/informe-modelo`, { headers: { ...authHeaders() } }),
        fetch(`${API_URL}/api/health`, { headers: { ...authHeaders() } }),
      ]);
      if (!r1.ok) throw new Error();
      setD(await r1.json());
      if (r2.ok) setSalud(await r2.json());
      setError(false);
    } catch (e) { setError(true); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const COLOR_SALUD = {
    disponible: { bg: "#DCFCE7", fg: "#166534", bd: "#86EFAC" },
    operativo: { bg: "#DCFCE7", fg: "#166534", bd: "#86EFAC" },
    degradado: { bg: "#FEF3C7", fg: "#92400E", bd: "#FCD34D" },
    atencion: { bg: "#FEF3C7", fg: "#92400E", bd: "#FCD34D" },
    no_disponible: { bg: "#FEE2E2", fg: "#991B1B", bd: "#FCA5A5" },
    desconocido: { bg: "#F3F4F6", fg: "#6B7280", bd: "#D1D5DB" },
  };
  const ETIQUETA_COMP = {
    base_de_datos: "Base de datos",
    motor_clasificacion: "Motor de clasificación",
    sincronizacion_plataformas: "Sincronización con plataformas",
    terminos_legales: "Términos legales",
  };

  const vol = d?.volumen || {};
  const mc = d?.metricas_criticas || {};

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1A3D6B", marginBottom: 3 }}>
          Auditoría del modelo
        </h2>
        <p style={{ fontSize: 11, color: "#6B7280", margin: 0, lineHeight: 1.55 }}>
          Evidencia empírica que alimenta la auditoría algorítmica anual y las extraordinarias que exige todo cambio de modelo, configuración o reglas.
        </p>
      </div>

      {cargando && <p style={{ fontSize: 12, color: "#6B7280" }}>Cargando informe...</p>}
      {error && <p style={{ fontSize: 12, color: "#92400E" }}>No fue posible consultar el informe. El servidor puede estar despertando; intente de nuevo en un minuto.</p>}

      {salud && (
        <div style={{ background: "#F8FAFC", border: "0.5px solid #E2E8F0", borderRadius: 8, padding: "11px 13px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#1A3D6B", margin: 0 }}>Estado del sistema</p>
            <span style={{
              fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "2px 9px",
              ...(({ bg, fg, bd }) => ({ background: bg, color: fg, border: `0.5px solid ${bd}` }))(COLOR_SALUD[salud.estado] || COLOR_SALUD.desconocido)
            }}>
              {salud.estado === "operativo" ? "Operativo" : "Degradado"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {Object.entries(salud.componentes || {}).map(([k, v]) => {
              const c = COLOR_SALUD[v.estado] || COLOR_SALUD.desconocido;
              return (
                <div key={k} style={{ background: "#fff", border: "0.5px solid #E2E8F0", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.fg, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#374151" }}>{ETIQUETA_COMP[k] || k}</span>
                  </div>
                  <p style={{ fontSize: 9, color: "#6B7280", margin: 0, lineHeight: 1.45 }}>{v.detalle}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            {[
              ["Casos procesados", vol.casos_totales ?? 0, "#1A3D6B"],
              ["Errores reportados", vol.errores_reportados ?? 0, (vol.errores_reportados ?? 0) > 0 ? "#B45309" : "#6B7280"],
              ["Tasa de error", `${vol.tasa_error_reportado ?? 0}%`, "#2E75B6"],
              ["Detección de urgentes", `${mc.deteccion_urgentes ?? 100}%`, mc.cumple === false ? "#DC2626" : "#059669"],
            ].map(([lbl, val, color]) => (
              <div key={lbl} style={{ background: "#F8FAFC", border: "0.5px solid #E2E8F0", borderRadius: 8, padding: "11px 13px" }}>
                <div style={{ fontSize: 21, fontWeight: 700, color, lineHeight: 1.1 }}>{val}</div>
                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3, lineHeight: 1.35 }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Configuración auditada */}
          <div style={{ background: "#F8FAFC", border: "0.5px solid #E2E8F0", borderRadius: 8, padding: "11px 13px", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#1A3D6B", margin: "0 0 6px" }}>Configuración auditada</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
              {[
                ["Modelo activo", d.version_activa?.modelo],
                ["Taxonomía", d.version_activa?.taxonomia],
                ["Reglas de protección", d.version_activa?.reglas_proteccion],
                ["Activo desde", d.version_activa?.fecha_activacion],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em" }}>{l}</div>
                  <div style={{ fontSize: 11, color: "#1A3D6B", fontWeight: 600, marginTop: 1 }}>{v || "—"}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 9, color: "#6B7280", margin: "8px 0 0", lineHeight: 1.5 }}>
              Cada clasificación queda sellada con la versión que la produjo. Permite atribuir retroactivamente cualquier decisión a una configuración concreta y detectar deriva entre versiones.
            </p>
          </div>

          {/* Errores por tipo */}
          <p style={{ fontSize: 11, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>
            Errores del modelo reportados por los profesionales
          </p>
          {(!d.errores_por_tipo || d.errores_por_tipo.length === 0) ? (
            <p style={{ fontSize: 11, color: "#6B7280", background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", margin: "0 0 14px" }}>
              No se han reportado errores. El canal está disponible en cada aviso de inteligencia artificial del portal del profesional.
            </p>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {d.errores_por_tipo.map(e => (
                <div key={e.clave} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                    <span style={{ color: "#374151", fontWeight: 500 }}>{e.tipo}</span>
                    <span style={{ color: "#6B7280" }}>{e.conteo} ({e.porcentaje}%)</span>
                  </div>
                  <div style={{ height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${e.porcentaje}%`, height: "100%", background: "#2E75B6", borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Equidad por canal */}
          <p style={{ fontSize: 11, fontWeight: 600, color: "#1A3D6B", marginBottom: 3 }}>
            Equidad: desempeño desagregado por canal de ingreso
          </p>
          <p style={{ fontSize: 10, color: "#6B7280", margin: "0 0 8px", lineHeight: 1.5 }}>
            Una brecha injustificada entre canales indica que el diseño técnico está amplificando una exclusión preexistente y exige corrección.
          </p>
          <div style={{ border: "0.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", background: "#1A3D6B", padding: "7px 10px" }}>
              {["Canal", "Casos", "Críticos", "% críticos", "% error"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</div>
              ))}
            </div>
            {Object.entries(d.equidad_por_canal || {}).sort((a, b) => b[1].casos - a[1].casos).map(([canal, x], i) => (
              <div key={canal} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", padding: "7px 10px", background: i % 2 ? "#F8FAFC" : "#fff", borderTop: "0.5px solid #F1F5F9" }}>
                <div style={{ fontSize: 10, color: "#374151", fontWeight: 500 }}>{canal}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>{x.casos}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>{x.criticos}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>{x.tasa_criticos}%</div>
                <div style={{ fontSize: 10, color: x.tasa_error_reportado > 0 ? "#B45309" : "#6B7280" }}>{x.tasa_error_reportado}%</div>
              </div>
            ))}
          </div>

          {/* Cambios de clasificación */}
          {d.detalle?.cambios_de_clasificacion?.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#1A3D6B", marginBottom: 6 }}>
                Cambios de clasificación con justificación ({d.volumen.cambios_de_clasificacion})
              </p>
              <div style={{ marginBottom: 14 }}>
                {d.detalle.cambios_de_clasificacion.map((o, i) => (
                  <div key={i} style={{ background: "#F8FAFC", border: "0.5px solid #E2E8F0", borderRadius: 6, padding: "8px 11px", marginBottom: 5 }}>
                    <p style={{ fontSize: 10, color: "#1A3D6B", margin: "0 0 2px", fontWeight: 600 }}>
                      {o.radicado} · {o.tipo_sugerido} → {o.tipo_confirmado}
                    </p>
                    <p style={{ fontSize: 10, color: "#374151", margin: "0 0 2px", lineHeight: 1.45 }}>{o.justificacion}</p>
                    <p style={{ fontSize: 9, color: "#9CA3AF", margin: 0 }}>{o.profesional}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Exportar */}
          <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: "11px 13px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#1E40AF", margin: "0 0 3px" }}>Informe para el comité de auditoría</p>
            <p style={{ fontSize: 10, color: "#1E40AF", margin: "0 0 8px", lineHeight: 1.5 }}>
              {d.nota}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <a href={`${API_URL}/api/auditoria/informe-modelo/exportar`} target="_blank" rel="noopener noreferrer"
                 style={{ fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "0.5px solid #1A3D6B", background: "#1A3D6B", color: "#fff", textDecoration: "none", fontWeight: 500 }}>
                Descargar informe de auditoría
              </a>
              <button onClick={cargar}
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "0.5px solid #D1D5DB", background: "#fff", color: "#374151", cursor: "pointer", fontFamily: "inherit" }}>
                Actualizar
              </button>
            </div>
            <p style={{ fontSize: 9, color: "#6B7280", margin: "8px 0 0", lineHeight: 1.5 }}>
              Generado el {d.generado} · {d.marco}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Panel de interoperabilidad: bitácora de sincronización con IRIS y VisionWeb ──
// RFP §4.2 — qué se replicó, cuándo, por quién y con qué resultado.
function Interoperabilidad() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [vwCaido, setVwCaido] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await fetch(`${API_URL}/api/interoperabilidad/bitacora`, { headers: { ...authHeaders() } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setDatos(d);
      // Refleja el estado real del simulador que reporta el servidor
      const conf = d?.consistencia?.configuracion_simulador;
      if (conf) setVwCaido(conf.probabilidad_fallo_visionweb >= 1);
      setError(false);
    } catch (e) { setError(true); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const simular = async (prob) => {
    setAccionando(true);
    try {
      const r = await fetch(`${API_URL}/api/interoperabilidad/simulador/configurar?fallo_visionweb=${prob}`, { method: "POST", headers: { ...authHeaders() } });
      if (!r.ok) throw new Error();
      const conf = await r.json();
      setVwCaido(conf.probabilidad_fallo_visionweb >= 1);
      setAviso(prob >= 1
        ? { tipo: "caido", texto: "VisionWeb está fuera de servicio. Radique ahora una petición desde el portal ciudadano y vuelva a actualizar la bitácora: verá los reintentos y el encolamiento." }
        : { tipo: "ok", texto: "VisionWeb está disponible de nuevo. Si hay operaciones en cola, procéselas para restablecer la consistencia entre plataformas." });
    } catch (e) {
      setAviso({ tipo: "error", texto: "No fue posible cambiar el estado del simulador. El servidor puede estar despertando." });
    }
    setAccionando(false);
  };

  const reintentar = async () => {
    setAccionando(true);
    try {
      const r = await fetch(`${API_URL}/api/interoperabilidad/reintentar-cola`, { method: "POST", headers: { ...authHeaders() } });
      if (!r.ok) throw new Error();
      const res = await r.json();
      if (res.procesadas > 0) {
        setAviso({ tipo: "ok", texto: `Se completaron ${res.procesadas} operación(es) que estaban en cola. La información no se perdió: se replicó al restablecerse la plataforma.` });
      } else if (res.aun_pendientes > 0) {
        setAviso({ tipo: "caido", texto: `Quedan ${res.aun_pendientes} operación(es) en cola: la plataforma sigue sin responder. Restablezca VisionWeb e intente de nuevo.` });
      } else {
        setAviso({ tipo: "ok", texto: "No hay operaciones pendientes en la cola." });
      }
      await cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: "No fue posible procesar la cola." });
    }
    setAccionando(false);
  };

  const COLOR_RES = {
    exitoso: { bg: "#DCFCE7", fg: "#166534", bd: "#86EFAC" },
    reintentado: { bg: "#FEF3C7", fg: "#92400E", bd: "#FCD34D" },
    encolado: { bg: "#FEE2E2", fg: "#991B1B", bd: "#FCA5A5" },
    fallido: { bg: "#FEE2E2", fg: "#991B1B", bd: "#FCA5A5" },
  };

  const resumen = datos?.resumen || {};
  const cons = datos?.consistencia || {};

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#1A3D6B", marginBottom: 3 }}>
          Interoperabilidad con plataformas institucionales
        </h2>
        <p style={{ fontSize: 11, color: "#6B7280", margin: 0, lineHeight: 1.55 }}>
          Bitácora de sincronización con IRIS y VisionWeb: qué se replicó, cuándo, por quién y con qué resultado.
        </p>
      </div>

      <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 13px", marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#92400E", margin: "0 0 3px" }}>Plataformas simuladas</p>
        <p style={{ fontSize: 10, color: "#92400E", margin: 0, lineHeight: 1.55 }}>
          IRIS y VisionWeb están representados por un doble de prueba: no existe acceso a los sistemas reales de la entidad en el marco de este trabajo. El mecanismo de sincronización sí es real y se verifica contra ese doble; al recibir credenciales del sistema real solo cambia la dirección del servicio.
        </p>
      </div>

      {cargando && <p style={{ fontSize: 12, color: "#6B7280" }}>Cargando bitácora...</p>}
      {error && <p style={{ fontSize: 12, color: "#92400E" }}>No fue posible consultar la bitácora. El servidor puede estar despertando; intente de nuevo en un minuto.</p>}

      {datos && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              ["Operaciones replicadas", resumen.total_operaciones ?? 0, "#1A3D6B"],
              ["Tasa de éxito", `${resumen.tasa_exito ?? 100}%`, "#059669"],
              ["Consistencia entre plataformas", `${cons.tasa_consistencia ?? 100}%`, "#2E75B6"],
              ["Operaciones en cola", cons.operaciones_en_cola ?? 0, (cons.operaciones_en_cola ?? 0) > 0 ? "#B45309" : "#6B7280"],
            ].map(([lbl, val, color]) => (
              <div key={lbl} style={{ background: "#F8FAFC", border: "0.5px solid #E2E8F0", borderRadius: 8, padding: "11px 13px" }}>
                <div style={{ fontSize: 21, fontWeight: 700, color, lineHeight: 1.1 }}>{val}</div>
                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3, lineHeight: 1.35 }}>{lbl}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px dashed #94A3B8", borderRadius: 8, padding: "11px 13px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", background: "#F1F5F9", border: "0.5px solid #CBD5E1", borderRadius: 4, padding: "3px 8px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Controles exclusivos de demostración — no forman parte del sistema en operación
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".05em" }}>Estado</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#166534", background: "#DCFCE7", border: "0.5px solid #86EFAC", borderRadius: 9, padding: "2px 8px" }}>
                  IRIS: disponible
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "2px 8px",
                  color: vwCaido ? "#991B1B" : "#166534",
                  background: vwCaido ? "#FEE2E2" : "#DCFCE7",
                  border: `0.5px solid ${vwCaido ? "#FCA5A5" : "#86EFAC"}`
                }}>
                  VisionWeb: {vwCaido ? "fuera de servicio" : "disponible"}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 10, color: "#475569", margin: "0 0 8px", lineHeight: 1.55 }}>
              Ninguna entidad tendría un control para interrumpir sus propias plataformas. Estos botones existen únicamente para exhibir, ante el evaluador, el comportamiento del sistema frente al escenario descrito en el problema 2 del diagnóstico: cuando IRIS o VisionWeb no están disponibles, la Unidad no logra despachar y se vencen términos. Al desplegar en producción, este bloque se retira; el mecanismo de reintento, encolamiento y reproceso permanece.
            </p>

            <div style={{ background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 6, padding: "8px 11px", marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#1E40AF", margin: "0 0 3px" }}>Cómo hacer la demostración</p>
              <ol style={{ fontSize: 10, color: "#1E40AF", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                <li>Provoque la caída de VisionWeb.</li>
                <li>
                  Radique una petición desde el{" "}
                  <a href="https://urab-ciudadano.vercel.app" target="_blank" rel="noopener noreferrer"
                     style={{ color: "#1E40AF", fontWeight: 600, textDecoration: "underline" }}>portal ciudadano</a>.
                </li>
                <li>Actualice la bitácora: verá los reintentos y el encolamiento.</li>
                <li>Restablezca VisionWeb y procese la cola: la operación se completa sin pérdida.</li>
              </ol>
            </div>

            {aviso && (
              <div style={{
                borderRadius: 6, padding: "8px 11px", marginBottom: 8,
                background: aviso.tipo === "caido" ? "#FEF2F2" : aviso.tipo === "error" ? "#FFFBEB" : "#F0FDF4",
                border: `0.5px solid ${aviso.tipo === "caido" ? "#FCA5A5" : aviso.tipo === "error" ? "#FCD34D" : "#86EFAC"}`
              }}>
                <p style={{
                  fontSize: 10, margin: 0, lineHeight: 1.5, fontWeight: 500,
                  color: aviso.tipo === "caido" ? "#991B1B" : aviso.tipo === "error" ? "#92400E" : "#166534"
                }}>{aviso.texto}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => simular(1.0)} disabled={accionando || vwCaido}
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "0.5px solid #FCA5A5", background: vwCaido ? "#F3F4F6" : "#FEF2F2", color: vwCaido ? "#9CA3AF" : "#991B1B", cursor: (accionando || vwCaido) ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                1. Provocar caída de VisionWeb
              </button>
              <button onClick={() => simular(0.0)} disabled={accionando || !vwCaido}
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "0.5px solid #86EFAC", background: !vwCaido ? "#F3F4F6" : "#F0FDF4", color: !vwCaido ? "#9CA3AF" : "#166534", cursor: (accionando || !vwCaido) ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                3. Restablecer VisionWeb
              </button>
              <button onClick={reintentar} disabled={accionando}
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "0.5px solid #BFDBFE", background: "#EFF6FF", color: "#1E40AF", cursor: accionando ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                4. Procesar cola pendiente {(cons.operaciones_en_cola ?? 0) > 0 ? `(${cons.operaciones_en_cola})` : ""}
              </button>
              <button onClick={cargar} disabled={accionando}
                style={{ fontSize: 11, padding: "5px 11px", borderRadius: 6, border: "0.5px solid #D1D5DB", background: "#fff", color: "#374151", cursor: accionando ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                Actualizar bitácora
              </button>
            </div>
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: "#1A3D6B", marginBottom: 8 }}>
            Bitácora de sincronización {datos.operaciones?.length ? `(${datos.operaciones.length} operaciones)` : ""}
          </p>

          {(!datos.operaciones || datos.operaciones.length === 0) ? (
            <p style={{ fontSize: 11, color: "#6B7280", background: "#F9FAFB", borderRadius: 8, padding: "12px 14px", margin: 0 }}>
              Aún no hay operaciones registradas. Radique una petición desde el portal ciudadano para ver la sincronización en funcionamiento.
            </p>
          ) : (
            <div style={{ border: "0.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "88px 78px 128px 62px 1fr", gap: 0, background: "#1A3D6B", padding: "7px 10px" }}>
                {["Resultado", "Plataforma", "Radicado", "Intento", "Detalle"].map(h => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</div>
                ))}
              </div>
              {datos.operaciones.map((o, i) => {
                const c = COLOR_RES[o.resultado] || COLOR_RES.fallido;
                return (
                  <div key={o.id || i} style={{ display: "grid", gridTemplateColumns: "88px 78px 128px 62px 1fr", gap: 0, padding: "7px 10px", background: i % 2 ? "#F8FAFC" : "#fff", borderTop: "0.5px solid #F1F5F9", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: c.fg, background: c.bg, border: `0.5px solid ${c.bd}`, borderRadius: 8, padding: "2px 6px", display: "inline-block" }}>
                        {o.resultado}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "#374151", fontWeight: 500 }}>{o.plataforma}</div>
                    <div style={{ fontSize: 10, color: "#1A3D6B", fontWeight: 500 }}>{o.radicado}</div>
                    <div style={{ fontSize: 10, color: "#6B7280" }}>{o.intento}</div>
                    <div>
                      <div style={{ fontSize: 10, color: "#374151", lineHeight: 1.4 }}>{o.detalle}</div>
                      <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 1 }}>{o.fecha} · {o.actor}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cons.radicados_inconsistentes && cons.radicados_inconsistentes.length > 0 && (
            <div style={{ background: "#FEF2F2", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: "10px 13px", marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#991B1B", margin: "0 0 3px" }}>Registros inconsistentes entre plataformas</p>
              <p style={{ fontSize: 10, color: "#991B1B", margin: 0, lineHeight: 1.5 }}>
                {cons.radicados_inconsistentes.join(", ")} — existen en una plataforma pero no en la otra. Procese la cola pendiente para restablecer la consistencia.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Inicio de sesión del coordinador (RBAC) ────────────────────────────
function LoginCoord({ onEntrar }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const entrar = async () => {
    setCargando(true); setError("");
    try {
      const r = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ profesional_id: "COORD", codigo: codigo.trim(), nombre: "Patricia Molina" }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Credenciales no válidas.");
      }
      const sesion = await r.json();
      TOKEN_SESION = sesion.token;
      onEntrar(sesion);
    } catch (e) {
      setError(e.message || "No fue posible iniciar sesión. El servidor puede estar despertando.");
    }
    setCargando(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: "100%", maxWidth: 440, overflow: "hidden" }}>
        <div style={{ background: "#1A3D6B", padding: "22px 26px", color: "#fff" }}>
          <div style={{ fontSize: 11, letterSpacing: 1, opacity: 0.8 }}>GOV.CO · República de Colombia</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Defensoría del Pueblo</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>URAB-AI · Panel de coordinación</div>
        </div>
        <div style={{ padding: "24px 26px" }}>
          <p style={{ fontSize: 13, color: "#374151", margin: "0 0 18px", lineHeight: 1.5 }}>
            El panel de coordinación da acceso a la supervisión de todos los casos, la reasignación y la auditoría del modelo. Requiere autenticación con rol de coordinación.
          </p>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Coordinadora</label>
          <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 14, marginBottom: 14, color: "#374151" }}>
            Patricia Molina — Coordinadora URAB
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Código de acceso</label>
          <input type="password" value={codigo} onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()}
            placeholder="Ingrese su código"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, marginBottom: 6, fontFamily: "inherit", boxSizing: "border-box" }} />
          {error && <p style={{ fontSize: 12, color: "#991B1B", margin: "6px 0 0" }}>{error}</p>}
          <button onClick={entrar} disabled={cargando || !codigo.trim()}
            style={{ width: "100%", marginTop: 16, padding: "11px", borderRadius: 8, border: "none", background: (cargando || !codigo.trim()) ? "#9CA3AF" : "#1A3D6B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: (cargando || !codigo.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {cargando ? "Verificando..." : "Iniciar sesión"}
          </button>
          <div style={{ marginTop: 18, padding: "11px 13px", background: "#EFF6FF", border: "1px dashed #93C5FD", borderRadius: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>Credencial de demostración</p>
            <p style={{ fontSize: 11, color: "#1E40AF", margin: 0, lineHeight: 1.5 }}>
              Código de la coordinadora: <strong>urab-coord</strong>
            </p>
            <p style={{ fontSize: 10, color: "#3B82F6", margin: "6px 0 0", lineHeight: 1.5 }}>
              En producción, el inicio de sesión se integra con el directorio institucional. La credencial de demostración se retira; el control de acceso por roles permanece.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(null);
  if (!sesion) return <LoginCoord onEntrar={setSesion} />;
  return <PanelCoord sesion={sesion} onSalir={() => { TOKEN_SESION = null; setSesion(null); }} />;
}

function PanelCoord({ sesion, onSalir }) {
  const [seccion, setSeccion] = useState("dashboard");
  const [casoAbierto, setCasoAbierto] = useState(null);
  const [profDetalle, setProfDetalle] = useState(null);
  const [modal, setModal] = useState(null);
  const [acciones, setAcciones] = useState({});

  const handleAccion = (tipo, txt, prof) => {
    if (!casoAbierto) return;
    setAcciones(a=>({ ...a, [casoAbierto.radicado]: { ...a[casoAbierto.radicado],
      [tipo==="devolver"?"devuelto":tipo==="reasignar"?"reasignado":"recomendacion"]: tipo==="reasignar" ? prof : txt
    }}));
    setModal(null);
  };

  const nav = (sec) => () => { setSeccion(sec); setCasoAbierto(null); };

  return (
    <div style={s.wrap}>
      <div style={s.hdr}>
        <div style={s.hdrTop}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Logo />
            <div>
              <div style={{ fontSize:9, color:"#93C5FD", letterSpacing:".12em", textTransform:"uppercase" }}>GOV.CO · República de Colombia</div>
              <div style={{ fontSize:14, fontWeight:600, color:"#fff", margin:"2px 0 1px" }}>Defensoría del Pueblo</div>
              <div style={{ fontSize:10, color:"#BFDBFE", fontStyle:"italic" }}>Nos unen tus derechos · URAB-AI · Panel de coordinación</div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>Patricia Molina</div>
            <div style={{ fontSize:10, color:"#F59E0B", marginTop:2, fontWeight:600 }}>Coordinadora URAB</div>
            <button onClick={onSalir} style={{ marginTop: 6, fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "0.5px solid rgba(255,255,255,0.3)", background: "transparent", color: "#BFDBFE", cursor: "pointer", fontFamily: "inherit" }}>
              Cerrar sesión
            </button>
            <div style={{ fontSize:10, color:"#BFDBFE", marginTop:1 }}>Acceso completo · 17 profesionales</div>
          </div>
        </div>
        <div style={s.hdrNav}>
          {[["dashboard"," Dashboard"],["peticiones"," Peticiones"],["profesionales"," Profesionales"],["alertas"," Alertas (5)"],["interoperabilidad","Interoperabilidad"],["auditoria","Auditoría del modelo"]].map(([k,l])=>(
            <button key={k} style={s.hn(seccion===k)} onClick={nav(k)}>{l}</button>
          ))}
        </div>
      </div>

      <AccesibilidadBar />

      <div style={{ marginTop:14 }}>
        {seccion==="dashboard" && !casoAbierto && <Dashboard onVerProf={(id)=>{setProfDetalle(id);setSeccion("profesionales");}} onVerCaso={(c)=>{setCasoAbierto(c);setSeccion("peticiones");}} />}
        {seccion==="peticiones" && !casoAbierto && <Peticiones onAbrirCaso={setCasoAbierto} />}
        {seccion==="peticiones" && casoAbierto && (
          <DetalleCaso caso={casoAbierto} acciones={acciones[casoAbierto.radicado]||{}} onVolver={()=>setCasoAbierto(null)} onAccion={setModal} />
        )}
        {seccion==="profesionales" && <Profesionales initProf={profDetalle} onClearProf={()=>setProfDetalle(null)} />}
        {seccion==="alertas" && <Alertas onAbrirCaso={(c)=>{ setCasoAbierto(c); setSeccion("peticiones"); }} />}
        {seccion==="interoperabilidad" && <Interoperabilidad />}
        {seccion==="auditoria" && <AuditoriaModelo />}
      </div>

      <ModalAccion tipo={modal} casoRad={casoAbierto?.radicado} onClose={()=>setModal(null)} onConfirm={handleAccion} />

      <p style={{ textAlign:"center", fontSize:10, color:"#9CA3AF", marginTop:12 }}>
        Defensoría del Pueblo · Directiva Conjunta 007 de 2025 · CONPES 4144 · Ley 1581 de 2012 · Marco de gestión de riesgos de IA del NIST · Norma ISO/IEC 42001
      </p>
      <div style={{ maxWidth:680, margin:"10px auto 0", padding:"10px 14px", background:"#F9FAFB", border:"0.5px solid #E5E7EB", borderRadius:8 }}>
        <p style={{ textAlign:"center", fontSize:9, color:"#9CA3AF", lineHeight:1.6, margin:0 }}>
           Prototipo académico · Legal Strategy Lab 2026 — Universidad Externado de Colombia. Los indicadores y casos provienen de un corpus sintético (N=20.417) calibrado al RFP oficial; no reflejan datos reales de ciudadanos ni de la Defensoría del Pueblo. El perfilamiento de datos reales está contemplado en la Fase 0.
        </p>
      </div>
    </div>
  );
}
