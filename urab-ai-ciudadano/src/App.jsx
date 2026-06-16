import { useState, useEffect } from "react";

const pasoLabels = ["Datos personales","Caracterización","Su situación","Confirmar","Radicado"];

const s = {
  wrap: { maxWidth: 640, margin: "0 auto", padding: "0 16px 40px", fontFamily: "'Inter',system-ui,sans-serif" },
  hdr: { background: "#1F4E79", color: "#fff", padding: "12px 18px", borderRadius: "0 0 10px 10px", marginBottom: 18 },
  gov: { fontSize: 9, color: "#93C5FD", letterSpacing: ".1em" },
  h1: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  sub: { fontSize: 10, color: "#93C5FD", marginTop: 2 },
  card: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: 20 },
  stepWrap: { display: "flex", marginBottom: 20 },
  stepItem: { flex: 1, textAlign: "center" },
  stepDot: (s) => ({ width: 26, height: 26, borderRadius: "50%", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: s==="done"?"#22C55E":s==="active"?"#1F4E79":"#E5E7EB", color: s==="future"?"#9CA3AF":"#fff" }),
  stepLbl: (a) => ({ fontSize: 9, color: a?"#1F4E79":"#9CA3AF", fontWeight: a?600:400 }),
  secTitle: { fontSize: 14, fontWeight: 700, color: "#1F4E79", marginBottom: 14 },
  secSub: { fontSize: 11, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 },
  flabel: { display: "block", fontSize: 11, color: "#6B7280", marginBottom: 4, fontWeight: 500 },
  input: { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E5E7EB", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  groupTitle: { fontSize: 11, fontWeight: 700, color: "#2E75B6", marginBottom: 10, paddingBottom: 5, borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 6 },
  opts: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6 },
  optBtn: (sel) => ({ padding: "6px 12px", borderRadius: 20, border: sel?"1.5px solid #2E75B6":"1.5px solid #E5E7EB", background: sel?"#EFF6FF":"#fff", fontSize: 12, cursor: "pointer", color: sel?"#1F4E79":"#374151", fontWeight: sel?600:400, fontFamily: "inherit", transition: "all .15s" }),
  subcampo: { background: "#F9FAFB", borderLeft: "3px solid #2E75B6", borderRadius: "0 6px 6px 0", padding: "10px 12px", marginTop: 6 },
  urgBanner: { background: "#FEE2E2", border: "2px solid #EF4444", borderRadius: 8, padding: "12px 14px", marginBottom: 14 },
  infoLegal: { background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "11px 13px", marginBottom: 12 },
  resumen: { background: "#F9FAFB", borderRadius: 8, padding: 14, marginBottom: 14 },
  resRow: { display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" },
  resLbl: { fontSize: 11, color: "#6B7280", minWidth: 130, flexShrink: 0 },
  resVal: { fontSize: 11, fontWeight: 600, color: "#111827", lineHeight: 1.5 },
  tag: { display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#EFF6FF", color: "#1F4E79", border: "1px solid #BFDBFE", margin: "2px 2px 2px 0", fontWeight: 500 },
  radBox: { background: "#EFF6FF", border: "2px solid #1F4E79", borderRadius: 8, padding: "10px 22px", display: "inline-block", margin: "12px auto" },
  nav: { display: "flex", justifyContent: "space-between", marginTop: 18 },
  btnP: { padding: "9px 20px", borderRadius: 6, border: "1px solid #1F4E79", background: "#1F4E79", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },
  btnG: { padding: "9px 16px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", color: "#374151", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  modoAsistido: { background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 },
};

const ETNIAS = [["indigena","Pueblo indígena"],["afro","Afrodescendiente"],["raizal","Raizal"],["rom","Pueblo Rom"],["palenquero","Palenquero"],["ninguna","No aplica"]];
const HECHOS = ["Desplazamiento forzado","Homicidio / masacre de familiar","Desaparición forzada","Secuestro","Minas antipersona","Violencia sexual","Reclutamiento forzado","Tortura","Confinamiento","Amenazas","Otro"];
const GRUPOS = [["migrante","Migrante o apátrida"],["vbg","Víctima de violencia basada en género"],["lgbtiq","Persona LGBTIQ+"],["privado_libertad","Privado/a de la libertad"],["desplazado","Persona desplazada"],["habitante_calle","Habitante de calle"],["refugiado","Persona refugiada"],["defensora","Defensor/a de DDHH"]];

export default function App() {
  const [paso, setPaso] = useState(1);
  const [urg, setUrg] = useState(false);
  const [rad] = useState("DP-2026-" + String(Math.floor(Math.random()*9000)+1000).padStart(6,"0"));
  const [d, setD] = useState({
    nombre:"", tipo_doc:"CC", cedula:"", correo:"", telefono:"",
    etario:null, etnia:null, etnia_cual:"",
    disc:null, tipo_disc:"",
    victima:null, hecho:"",
    grupos:new Set(),
    texto:"", entidad:""
  });

  useEffect(() => {
    const palabras = ["amenaza","matar","desapareci","violencia","tortura","riesgo","peligro","secuestr","agred"];
    const u = palabras.some(p=>d.texto.toLowerCase().includes(p)) || d.grupos.has("vbg") || d.grupos.has("desplazado") || ["nino","nina","adolescente"].includes(d.etario);
    setUrg(u);
  }, [d.texto, d.etario, d.grupos]);

  const upd = (k,v) => setD(prev => ({...prev, [k]:v}));
  const toggleGrupo = (g) => setD(prev => { const s=new Set(prev.grupos); s.has(g)?s.delete(g):s.add(g); return {...prev, grupos:s}; });

  const OptBtn = ({campo, val, label}) => (
    <button style={s.optBtn(d[campo]===val)} onClick={()=>upd(campo,val)}>{label}</button>
  );

  const Stepper = () => (
    <div style={s.stepWrap}>
      {pasoLabels.map((l,i) => {
        const n=i+1, st=n<paso?"done":n===paso?"active":"future";
        return <div key={n} style={s.stepItem}>
          <div style={s.stepDot(st)}>{n<paso?"✓":n}</div>
          <div style={s.stepLbl(n===paso)}>{l}</div>
        </div>;
      })}
    </div>
  );

  const Nav = ({disabled}) => paso < 5 && (
    <div style={s.nav}>
      <button style={s.btnG} onClick={()=>paso>1?setPaso(p=>p-1):null}>{paso===1?"Cancelar":"← Anterior"}</button>
      <button style={{...s.btnP, opacity:disabled?.5:1, cursor:disabled?"not-allowed":"pointer"}} disabled={disabled} onClick={()=>setPaso(p=>p+1)}>
        {paso===4?"Radicar petición ✓":"Siguiente →"}
      </button>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.hdr}>
        <div style={s.gov}>GOV.CO · DEFENSORÍA DEL PUEBLO DE COLOMBIA</div>
        <div style={s.h1}>Portal de Atención Ciudadana · URAB-AI</div>
        <div style={s.sub}>Unidad de Recepción y Análisis de Bogotá · Emergencias: 123 · Línea gratuita: 01 8000 914 814</div>
      </div>

      <Stepper />

      {urg && paso===3 && (
        <div style={s.urgBanner}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:"#991B1B"}}>🚨 Su caso ha sido identificado como urgente</p>
          <p style={{margin:"4px 0 0",fontSize:11,color:"#7F1D1D"}}>Un profesional revisará su petición de forma prioritaria. Si está en peligro inmediato llame al <strong>123</strong>.</p>
        </div>
      )}

      <div style={s.card}>

        {paso===1 && <>
          <p style={s.secTitle}>Sus datos de contacto</p>
          <div style={s.modoAsistido}>
            <span style={{fontSize:20}}>🎙️</span>
            <p style={{fontSize:11,color:"#6B7280",flex:1,margin:0}}>¿Prefiere que le hagamos las preguntas una a una con letra grande y voz?</p>
            <button style={{...s.btnG,fontSize:11,padding:"5px 10px"}}>Modo asistido</button>
          </div>
          <div style={{marginBottom:12}}>
            <label style={s.flabel}>Nombre y apellidos completos *</label>
            <input style={s.input} value={d.nombre} onChange={e=>upd("nombre",e.target.value)} placeholder="Nombre completo"/>
          </div>
          <div style={{...s.grid2,marginBottom:12}}>
            <div>
              <label style={s.flabel}>Tipo de documento *</label>
              <select style={s.input} value={d.tipo_doc} onChange={e=>upd("tipo_doc",e.target.value)}>
                {["CC","CE","Pasaporte","PPT","NUIP"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.flabel}>Número *</label>
              <input style={s.input} value={d.cedula} onChange={e=>upd("cedula",e.target.value)} placeholder="Sin puntos"/>
            </div>
          </div>
          <div style={{...s.grid2,marginBottom:4}}>
            <div><label style={s.flabel}>Teléfono</label><input style={s.input} value={d.telefono} onChange={e=>upd("telefono",e.target.value)} placeholder="Celular o fijo"/></div>
            <div><label style={s.flabel}>Correo electrónico</label><input style={s.input} type="email" value={d.correo} onChange={e=>upd("correo",e.target.value)} placeholder="Para notificaciones"/></div>
          </div>
          <Nav disabled={!d.nombre || !d.cedula}/>
        </>}

        {paso===2 && <>
          <p style={s.secTitle}>Caracterización del peticionario</p>
          <p style={s.secSub}>Esta información nos permite priorizar su atención y garantizar sus derechos como sujeto de especial protección constitucional. Todos los campos son opcionales.</p>

          <div style={{marginBottom:18}}>
            <div style={s.groupTitle}><span>👤</span> ¿A qué grupo etario pertenece?</div>
            <div style={s.opts}>
              {[["nino","Niño (0–8)"],["nina","Niña (0–8)"],["adolescente","Adolescente (9–17)"],["adulto","Adulto (18–59)"],["adulto_mayor","Persona mayor (60+)"]].map(([v,l])=>(
                <button key={v} style={s.optBtn(d.etario===v)} onClick={()=>upd("etario",v)}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <div style={s.groupTitle}><span>🌿</span> ¿Tiene pertenencia étnica?</div>
            <div style={s.opts}>
              {ETNIAS.map(([v,l])=><button key={v} style={s.optBtn(d.etnia===v)} onClick={()=>upd("etnia",v)}>{l}</button>)}
            </div>
            {d.etnia && d.etnia!=="ninguna" && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿A cuál pueblo, comunidad o resguardo pertenece?</label>
                <input style={s.input} value={d.etnia_cual} onChange={e=>upd("etnia_cual",e.target.value)} placeholder="Nombre del pueblo o resguardo"/>
              </div>
            )}
          </div>

          <div style={{marginBottom:18}}>
            <div style={s.groupTitle}><span>♿</span> ¿Tiene alguna condición de discapacidad?</div>
            <div style={s.opts}>
              <button style={s.optBtn(d.disc==="si")} onClick={()=>upd("disc","si")}>Sí</button>
              <button style={s.optBtn(d.disc==="no")} onClick={()=>upd("disc","no")}>No</button>
            </div>
            {d.disc==="si" && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿Qué tipo de discapacidad?</label>
                <select style={s.input} value={d.tipo_disc} onChange={e=>upd("tipo_disc",e.target.value)}>
                  <option value="">Seleccione...</option>
                  {["Física / motora","Visual","Auditiva","Cognitiva / intelectual","Psicosocial / mental","Múltiple","Otra"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{marginBottom:18}}>
            <div style={s.groupTitle}><span>🕊️</span> ¿Ha sido víctima del conflicto armado?</div>
            <div style={s.opts}>
              <button style={s.optBtn(d.victima==="si")} onClick={()=>upd("victima","si")}>Sí</button>
              <button style={s.optBtn(d.victima==="no")} onClick={()=>upd("victima","no")}>No</button>
            </div>
            {d.victima==="si" && (
              <div style={s.subcampo}>
                <label style={s.flabel}>¿Cuál fue el hecho victimizante principal?</label>
                <select style={s.input} value={d.hecho} onChange={e=>upd("hecho",e.target.value)}>
                  <option value="">Seleccione...</option>
                  {HECHOS.map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{marginBottom:8}}>
            <div style={s.groupTitle}><span>🛡️</span> ¿Pertenece a algún grupo de especial protección? <span style={{fontSize:10,fontWeight:400,color:"#9CA3AF"}}>(puede marcar varios)</span></div>
            <div style={s.opts}>
              {GRUPOS.map(([v,l])=>(
                <button key={v} style={s.optBtn(d.grupos.has(v))} onClick={()=>toggleGrupo(v)}>{l}</button>
              ))}
            </div>
          </div>
          <Nav/>
        </>}

        {paso===3 && <>
          <p style={s.secTitle}>Cuéntenos su situación</p>
          <p style={s.secSub}>Describa con sus propias palabras qué pasó, qué entidad está involucrada y qué necesita de la Defensoría.</p>
          <div style={{marginBottom:12}}>
            <textarea style={{...s.input,minHeight:120,resize:"vertical"}} value={d.texto} onChange={e=>upd("texto",e.target.value)} placeholder="Ejemplo: 'Mi EPS me negó la cirugía que el médico ordenó hace 3 meses...'"/>
            <p style={{fontSize:10,color:"#9CA3AF",marginTop:4}}>{d.texto.length} caracteres</p>
          </div>
          <div style={{marginBottom:4}}>
            <label style={s.flabel}>¿Contra qué entidad o persona dirige su petición? (opcional)</label>
            <input style={s.input} value={d.entidad} onChange={e=>upd("entidad",e.target.value)} placeholder="Nombre de la entidad o persona"/>
          </div>
          <Nav disabled={d.texto.length < 10}/>
        </>}

        {paso===4 && <>
          <p style={s.secTitle}>Confirme su petición</p>
          <div style={s.resumen}>
            {[
              ["Nombre", d.nombre||"(no indicado)"],
              ["Documento", `${d.tipo_doc} ${d.cedula}`],
              ["Contacto", d.correo||d.telefono||"(no indicado)"],
              ["Grupo etario", {nino:"Niño (0–8)",nina:"Niña (0–8)",adolescente:"Adolescente (9–17)",adulto:"Adulto (18–59)",adulto_mayor:"Persona mayor (60+)"}[d.etario]||"No indicado"],
              ["Pertenencia étnica", d.etnia ? ({indigena:"Pueblo indígena",afro:"Afrodescendiente",raizal:"Raizal",rom:"Pueblo Rom",palenquero:"Palenquero",ninguna:"No aplica"}[d.etnia]||d.etnia) + (d.etnia_cual?` — ${d.etnia_cual}`:"") : "No indicado"],
              ["Discapacidad", d.disc==="si"?`Sí${d.tipo_disc?` — ${d.tipo_disc}`:""}`:d.disc==="no"?"No":"No indicado"],
              ["Víctima del conflicto", d.victima==="si"?`Sí${d.hecho?` — ${d.hecho}`:""}`:d.victima==="no"?"No":"No indicado"],
            ].map(([l,v])=>(
              <div key={l} style={s.resRow}>
                <span style={s.resLbl}>{l}:</span>
                <span style={s.resVal}>{v}</span>
              </div>
            ))}
            {d.grupos.size>0 && (
              <div style={s.resRow}>
                <span style={s.resLbl}>Grupos especiales:</span>
                <span style={s.resVal}>
                  {[...d.grupos].map(g=><span key={g} style={s.tag}>{{"migrante":"Migrante","vbg":"VBG","lgbtiq":"LGBTIQ+","privado_libertad":"Privado de libertad","desplazado":"Desplazado","habitante_calle":"Habitante de calle","refugiado":"Refugiado","defensora":"Defensor/a DDHH"}[g]||g}</span>)}
                </span>
              </div>
            )}
            {d.texto && <div style={{...s.resRow,marginTop:8,paddingTop:8,borderTop:"1px solid #E5E7EB"}}>
              <span style={s.resLbl}>Relato:</span>
              <span style={s.resVal}>{d.texto.slice(0,200)}{d.texto.length>200?"...":""}</span>
            </div>}
          </div>
          <div style={s.infoLegal}>
            <p style={{fontSize:10,color:"#1E40AF",lineHeight:1.6,margin:"0 0 5px"}}><strong>Tratamiento de datos (Ley 1581/2012):</strong> Sus datos, incluida la información de caracterización, se usan exclusivamente para la atención de su petición. Los datos de grupos étnicos, discapacidad y condición de víctima son datos sensibles protegidos por ley.</p>
            <p style={{fontSize:10,color:"#1E40AF",lineHeight:1.6,margin:0}}><strong>Debido proceso (Art. 29 CP):</strong> Si el sistema asigna una prioridad automática a su caso, puede impugnarla ante el profesional designado dentro de los 5 días hábiles siguientes.</p>
          </div>
          <Nav/>
        </>}

        {paso===5 && <>
          <div style={{textAlign:"center",padding:"8px 0"}}>
            <div style={{fontSize:44,marginBottom:10}}>✅</div>
            <h3 style={{fontSize:15,color:"#1F4E79",margin:"0 0 5px"}}>Petición radicada exitosamente</h3>
            <p style={{fontSize:12,color:"#6B7280",margin:"0 0 12px"}}>La Defensoría del Pueblo ha recibido su solicitud</p>
            <div style={s.radBox}>
              <p style={{fontSize:10,color:"#6B7280",margin:0}}>Número de radicado</p>
              <p style={{fontSize:22,fontWeight:700,color:"#1F4E79",margin:"2px 0 0",letterSpacing:".06em"}}>{rad}</p>
            </div>
            {urg && <div style={{background:"#FEF3C7",border:"1.5px solid #F59E0B",borderRadius:8,padding:"10px 14px",margin:"12px 0",textAlign:"left"}}>
              <p style={{fontSize:12,fontWeight:700,color:"#92400E",margin:"0 0 3px"}}>⚡ Caso priorizado</p>
              <p style={{fontSize:11,color:"#78350F",margin:0}}>Su petición fue identificada como urgente. Un profesional se comunicará dentro de las próximas 2 horas hábiles.</p>
            </div>}
            <p style={{fontSize:11,color:"#6B7280",margin:"10px 0",lineHeight:1.6}}>
              Guarde su número de radicado para hacer seguimiento.<br/>
              {d.correo?<>Recibirá confirmación en <strong>{d.correo}</strong>.</>:"Registre un correo para recibir notificaciones."}
            </p>
            <p style={{fontSize:10,color:"#9CA3AF",lineHeight:1.7}}>Seguimiento: <strong>01 8000 914 814</strong><br/>Emergencias: <strong>123</strong><br/>Tratamiento de datos conforme a la Ley 1581 de 2012</p>
            <button style={{...s.btnG,marginTop:16}} onClick={()=>setPaso(1)}>← Radicar otra petición</button>
          </div>
        </>}

      </div>
      <p style={{textAlign:"center",fontSize:10,color:"#9CA3AF",marginTop:12}}>
        © 2026 Defensoría del Pueblo · Nos unen tus derechos · Ley 1581/2012 · Directiva 007/2025
      </p>
    </div>
  );
}
