import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaPlus, FaTimes, FaCheck, FaTrash, FaUpload, FaFileAlt,
         FaGavel, FaChartLine, FaClipboardList, FaDollarSign, FaRobot,
         FaTable, FaShieldAlt, FaRoute, FaCheckCircle,
         FaExclamationTriangle, FaTimesCircle, FaChevronDown, FaChevronUp,
         FaShoppingCart, FaLock, FaInfoCircle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const STATUS_COLORS = {
    PROSPECTO:  "text-gray-300 bg-gray-500/10 border-gray-400/30",
    EN_PROCESO: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    PRESENTADA: "text-yellow-300 bg-yellow-500/10 border-yellow-400/30",
    GANADA:     "text-green-300 bg-green-500/10 border-green-400/30",
    PERDIDA:    "text-red-300 bg-red-500/10 border-red-400/30",
    CANCELADA:  "text-orange-300 bg-orange-500/10 border-orange-400/30",
    DESIERTA:   "text-purple-300 bg-purple-500/10 border-purple-400/30",
};

const DOC_STATUS_COLOR = (s) => {
    if (s === "CARGADO")   return "text-green-300 bg-green-500/10 border-green-400/30";
    if (s === "VENCIDO")   return "text-red-300 bg-red-500/10 border-red-400/30";
    if (s === "NO_APLICA") return "text-gray-300 bg-gray-500/10 border-gray-400/30";
    return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
};

const TIPOS_LIC   = ["PUBLICA","INVITACION_3","ADJUDICACION_DIRECTA"];
const TIPOS_CON   = ["SERVICIO_TRANSPORTE","FLETE","MENSAJERIA","PAQUETERIA","MULTIMODAL"];
const ESTADOS_MX  = ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"];
const FLUJO_STATUS = ["PROSPECTO","EN_PROCESO","PRESENTADA","GANADA"];

const emptyForm = {
    titulo:"",numeroLicitacion:"",dependencia:"",tipoLicitacion:"PUBLICA",
    tipoContrato:"SERVICIO_TRANSPORTE",estado:"Nuevo León",municipio:"",
    fechaPublicacion:"",fechaJuntaAclaraciones:"",fechaPresentacionPropuestas:"",
    fechaAperturaTecnica:"",fechaAperturaEconomica:"",fechaFallo:"",
    fechaContrato:"",fechaInicioServicio:"",fechaFinServicio:"",
    montoEstimado:"",contactoNombre:"",contactoTelefono:"",contactoEmail:"",
    urlComprasMX:"",urlCompraNet:"",notas:"",status:"PROSPECTO"
};

const emptyPropuesta = {
    concepto:"",unidad:"Viaje",cantidad:"",precioUnitario:"",
    origen:"",destino:"",tipoVehiculo:"",notas:""
};

// ─── PDF IA ───────────────────────────────────────────────────────────────────
async function extractTextFromPDF(file, onProgress) {
    return new Promise((resolve, reject) => {
        const run = async () => {
            try {
                const pdfjsLib = window.pdfjsLib;
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";
                const maxPages = Math.min(pdf.numPages, 100);
                for (let i = 1; i <= maxPages; i++) {
                    if (onProgress) onProgress(`Leyendo página ${i} de ${maxPages}...`);
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += `\n--- Página ${i} ---\n` + content.items.map(x => x.str).join(" ");
                }
                resolve(fullText);
            } catch(e) { reject(e); }
        };
        if (window.pdfjsLib) { run(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = run;
        s.onerror = () => reject(new Error("No se pudo cargar pdf.js"));
        document.head.appendChild(s);
    });
}

async function analizarConIA(file, onProgress) {
    const SYSTEM = `Eres analista senior de licitaciones gobierno mexicano. Devuelve SOLO JSON válido sin texto extra ni backticks.
{
  "score":número 0-100,
  "veredicto":"CONVENIENTE"|"NEUTRAL"|"NO_CONVENIENTE",
  "veredicto_resumen":"2-3 oraciones",
  "ficha":{"numero":"","entidad":"","objeto":"","categoria":"","fecha_fallo":"","fecha_limite_oferta":"","duracion_contrato":"","lugar":"","presupuesto":"","plazo_entrega_dias":"","acepta_parcialidad":"","sectorizado":""},
  "articulos":[{"clave":"","descripcion":"","marca":"","unidad":"","cantidad_minima":null,"cantidad_maxima":null,"precio_unitario":null,"precio_total_min":null,"precio_total_max":null,"registro_sanitario":"","notas":""}],
  "financiero":{"valor_total_estimado":null,"garantia":"","forma_pago":"","penalidades":"","criterio_precio_pct":null,"analisis":""},
  "evaluacion":{"criterios":"","requisitos_tecnicos":[],"condiciones_clave":[]},
  "riesgos":[],"oportunidades":[],"analisis_riesgos":"",
  "pasos":[],"documentos_clave":"","recomendacion":""
}`;
    if (onProgress) onProgress("Extrayendo texto del PDF...");
    const texto = await extractTextFromPDF(file, onProgress);
    if (onProgress) onProgress("Analizando con IA...");
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            model:"claude-sonnet-4-6", max_tokens:4000, system:SYSTEM,
            messages:[{role:"user",content:`Analiza esta licitación. Extrae TODOS los artículos con claves, cantidades mínimas, máximas, precios y registros sanitarios.\n\n${texto}`}]
        })
    });
    if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.error?.message||`HTTP ${resp.status}`); }
    const data = await resp.json();
    const raw  = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
    return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

function fmxn(n){ if(n==null)return"-"; return"$"+Number(n).toLocaleString("es-MX",{minimumFractionDigits:2}); }
function fnum(n){ if(n==null)return"-"; return Number(n).toLocaleString("es-MX"); }

function SeccionIA({titulo,icon,children,defaultOpen=true}){
    const[open,setOpen]=useState(defaultOpen);
    return(
        <div className="mb-4 rounded-2xl bg-white/5 border border-cyan-400/10 overflow-hidden">
            <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-all" onClick={()=>setOpen(o=>!o)}>
                <span className="text-cyan-400">{icon}</span>
                <span className="font-bold text-white flex-1 text-sm">{titulo}</span>
                <span className="text-gray-500">{open?<FaChevronUp size={11}/>:<FaChevronDown size={11}/>}</span>
            </button>
            <AnimatePresence>
                {open&&(<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}} className="overflow-hidden"><div className="px-5 pb-5">{children}</div></motion.div>)}
            </AnimatePresence>
        </div>
    );
}

function KV({label,value}){
    return(
        <div className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
            <span className="text-gray-400 text-xs w-44 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-white text-sm font-bold flex-1">{value||"-"}</span>
        </div>
    );
}

function TagIA({items,color}){
    const cls={red:"text-red-300 bg-red-500/10 border-red-400/30",green:"text-green-300 bg-green-500/10 border-green-400/30",cyan:"text-cyan-300 bg-cyan-500/10 border-cyan-400/30"}[color]||"text-gray-300 bg-white/5 border-white/10";
    return(<div className="flex flex-wrap gap-2 mt-2">{(items||[]).map((t,i)=>(<span key={i} className={`px-3 py-1 rounded-full border text-xs font-bold ${cls}`}>{t}</span>))}</div>);
}

function TablaArticulos({articulos}){
    if(!articulos?.length)return<p className="text-gray-500 text-sm py-4">No se encontraron artículos.</p>;
    const tMin=articulos.reduce((s,a)=>s+(a.precio_total_min||0),0);
    const tMax=articulos.reduce((s,a)=>s+(a.precio_total_max||0),0);
    return(
        <div className="overflow-x-auto">
            <table className="w-full text-xs text-left" style={{minWidth:950}}>
                <thead><tr className="text-gray-400 border-b border-cyan-400/10">
                    {["Clave","Descripción","Marca","Unidad","Cant. Mín.","Cant. Máx.","Precio Unit.","Total Mín.","Total Máx.","Reg. Sanitario"].map(h=>(<th key={h} className="pb-3 pr-3 font-bold whitespace-nowrap">{h}</th>))}
                </tr></thead>
                <tbody>
                    {articulos.map((a,i)=>(
                        <motion.tr key={i} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.025}} className="border-b border-white/5 hover:bg-cyan-500/5 transition-all">
                            <td className="py-3 pr-3 font-black text-cyan-300 whitespace-nowrap">{a.clave||"-"}</td>
                            <td className="py-3 pr-3 text-white max-w-xs"><p className="font-bold leading-tight">{a.descripcion||"-"}</p>{a.notas&&<p className="text-gray-500 text-xs mt-0.5">{a.notas}</p>}</td>
                            <td className="py-3 pr-3 text-gray-300 whitespace-nowrap">{a.marca||"-"}</td>
                            <td className="py-3 pr-3 text-gray-400 whitespace-nowrap">{a.unidad||"-"}</td>
                            <td className="py-3 pr-3 text-yellow-300 font-black text-right whitespace-nowrap">{fnum(a.cantidad_minima)}</td>
                            <td className="py-3 pr-3 text-green-300 font-black text-right whitespace-nowrap">{fnum(a.cantidad_maxima)}</td>
                            <td className="py-3 pr-3 text-white font-bold text-right whitespace-nowrap">{fmxn(a.precio_unitario)}</td>
                            <td className="py-3 pr-3 text-yellow-200 text-right whitespace-nowrap">{fmxn(a.precio_total_min)}</td>
                            <td className="py-3 pr-3 text-green-200 text-right whitespace-nowrap">{fmxn(a.precio_total_max)}</td>
                            <td className="py-3 pr-3">{a.registro_sanitario&&a.registro_sanitario!=="N/A"?<span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 font-mono text-xs">{a.registro_sanitario}</span>:<span className="text-gray-600 text-xs">N/A</span>}</td>
                        </motion.tr>
                    ))}
                </tbody>
                {(tMin>0||tMax>0)&&(<tfoot><tr className="border-t-2 border-cyan-400/20">
                    <td colSpan={7} className="pt-4 text-right text-gray-400 font-bold pr-3">TOTAL ESTIMADO:</td>
                    <td className="pt-4 text-right font-black text-yellow-300 whitespace-nowrap">{fmxn(tMin)}</td>
                    <td className="pt-4 text-right font-black text-green-300 whitespace-nowrap pr-3">{fmxn(tMax)}</td>
                    <td/>
                </tr></tfoot>)}
            </table>
        </div>
    );
}

function TabAnalisisIA(){
    const[archivo,setArchivo]=useState(null);
    const[cargando,setCargando]=useState(false);
    const[progreso,setProgreso]=useState("");
    const[resultado,setResultado]=useState(null);
    const[error,setError]=useState(null);
    const[subTab,setSubTab]=useState("articulos");
    const inputRef=useRef();
    const elegirArchivo=(f)=>{ if(!f)return; if(f.type!=="application/pdf"){setError("Solo PDF.");return;} setArchivo(f);setError(null);setResultado(null); };
    const analizar=async()=>{
        if(!archivo)return; setCargando(true);setError(null);setResultado(null);
        try{ const data=await analizarConIA(archivo,setProgreso); setResultado(data);setSubTab("articulos"); }
        catch(e){ setError("Error: "+e.message); }
        finally{ setCargando(false);setProgreso(""); }
    };
    const vcfg={
        CONVENIENTE:{cls:"text-green-300 bg-green-500/10 border-green-400/30",icon:<FaCheckCircle/>,label:"Conveniente participar"},
        NEUTRAL:{cls:"text-yellow-300 bg-yellow-500/10 border-yellow-400/30",icon:<FaExclamationTriangle/>,label:"Participación con reservas"},
        NO_CONVENIENTE:{cls:"text-red-300 bg-red-500/10 border-red-400/30",icon:<FaTimesCircle/>,label:"No recomendado"},
    };
    const SUB_TABS=[
        {key:"articulos",label:"Artículos / Partidas",icon:<FaTable size={11}/>},
        {key:"ficha",label:"Ficha general",icon:<FaFileAlt size={11}/>},
        {key:"financiero",label:"Financiero",icon:<FaRoute size={11}/>},
        {key:"riesgos",label:"Riesgos y estrategia",icon:<FaShieldAlt size={11}/>},
    ];
    return(
        <div>
            {!resultado&&(<div className="border-2 border-dashed border-cyan-400/20 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-all mb-4" onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();elegirArchivo(e.dataTransfer.files[0]);}}>
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e=>elegirArchivo(e.target.files[0])}/>
                <FaUpload className="text-cyan-400 text-3xl mx-auto mb-3"/>
                <p className="text-white font-bold">Arrastra el PDF de la licitación aquí</p>
                <p className="text-gray-500 text-sm mt-1">o haz clic - sin límite de tamaño</p>
            </div>)}
            {archivo&&!resultado&&(<div className="flex items-center gap-3 bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 mb-3">
                <FaFileAlt className="text-red-400 flex-shrink-0"/>
                <span className="text-white text-sm font-bold flex-1 truncate">{archivo.name}</span>
                <span className="text-gray-500 text-xs flex-shrink-0">{archivo.size>1024*1024?(archivo.size/1024/1024).toFixed(1)+" MB":(archivo.size/1024).toFixed(0)+" KB"}</span>
                <button onClick={()=>{setArchivo(null);setError(null);}} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
            </div>)}
            {error&&<div className="mb-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-bold">{error}</div>}
            {archivo&&!resultado&&(<button onClick={analizar} disabled={cargando} className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-black hover:bg-cyan-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-2">
                <FaRobot/>{cargando?progreso||"Procesando...":"Analizar licitación con IA"}
            </button>)}
            {cargando&&(<div className="mb-4"><div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{width:"70%"}}/></div><p className="text-gray-500 text-xs mt-2 text-center">{progreso}</p></div>)}
            {resultado&&(<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                {(()=>{const vc=vcfg[resultado.veredicto]||vcfg.NEUTRAL;return(<div className={`flex items-center gap-4 p-5 rounded-2xl border ${vc.cls} mb-4`}><div className="text-3xl flex-shrink-0">{vc.icon}</div><div className="flex-1 min-w-0"><p className="font-black text-lg">{vc.label}</p><p className="text-sm opacity-80 mt-1 leading-relaxed">{resultado.veredicto_resumen}</p></div><div className="text-right flex-shrink-0"><p className="text-xs opacity-70">Score</p><p className="text-4xl font-black">{resultado.score}/100</p></div></div>);})()}
                <button onClick={()=>{setResultado(null);setArchivo(null);}} className="mb-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-all">↩ Analizar otro PDF</button>
                <div className="flex gap-2 flex-wrap mb-4">{SUB_TABS.map(t=>(<button key={t.key} onClick={()=>setSubTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab===t.key?"bg-cyan-500/20 border border-cyan-400/30 text-cyan-300":"bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10"}`}>{t.icon} {t.label}</button>))}</div>
                {subTab==="articulos"&&(<SeccionIA titulo={`Partidas / Artículos (${resultado.articulos?.length||0})`} icon={<FaTable/>}><div className="flex gap-4 mb-4 text-xs flex-wrap"><span className="flex items-center gap-1.5 text-yellow-300"><span className="w-3 h-3 rounded-full bg-yellow-400/30 border border-yellow-400/50 inline-block"/>Cantidad mínima</span><span className="flex items-center gap-1.5 text-green-300"><span className="w-3 h-3 rounded-full bg-green-400/30 border border-green-400/50 inline-block"/>Cantidad máxima</span><span className="flex items-center gap-1.5 text-blue-300"><span className="w-3 h-3 rounded-full bg-blue-400/30 border border-blue-400/50 inline-block"/>Registro sanitario</span></div><TablaArticulos articulos={resultado.articulos}/></SeccionIA>)}
                {subTab==="ficha"&&(<SeccionIA titulo="Ficha general" icon={<FaFileAlt/>}><KV label="Número de licitación" value={resultado.ficha?.numero}/><KV label="Entidad convocante" value={resultado.ficha?.entidad}/><KV label="Objeto del contrato" value={resultado.ficha?.objeto}/><KV label="Categoría" value={resultado.ficha?.categoria}/><KV label="Fecha de fallo" value={resultado.ficha?.fecha_fallo}/><KV label="Fecha límite oferta" value={resultado.ficha?.fecha_limite_oferta}/><KV label="Duración del contrato" value={resultado.ficha?.duracion_contrato}/><KV label="Lugar de ejecución" value={resultado.ficha?.lugar}/><KV label="Presupuesto referencial" value={resultado.ficha?.presupuesto}/><KV label="Plazo entrega (días)" value={resultado.ficha?.plazo_entrega_dias}/><KV label="Acepta parcialidad" value={resultado.ficha?.acepta_parcialidad}/><KV label="Sectorizado" value={resultado.ficha?.sectorizado}/></SeccionIA>)}
                {subTab==="financiero"&&(<div><SeccionIA titulo="Análisis financiero" icon={<FaRoute/>}><div className="grid grid-cols-2 gap-3 mb-4">{[{label:"Valor total estimado",value:fmxn(resultado.financiero?.valor_total_estimado)},{label:"Peso del precio (eval.)",value:resultado.financiero?.criterio_precio_pct!=null?`${resultado.financiero.criterio_precio_pct}%`:"-"},{label:"Garantía requerida",value:resultado.financiero?.garantia},{label:"Forma de pago",value:resultado.financiero?.forma_pago},{label:"Penalidades",value:resultado.financiero?.penalidades}].map((item,i)=>(<div key={i} className="bg-white/5 rounded-xl p-3"><p className="text-gray-400 text-xs mb-1">{item.label}</p><p className="text-white font-bold text-sm">{item.value||"-"}</p></div>))}</div><p className="text-gray-300 text-sm leading-relaxed">{resultado.financiero?.analisis}</p></SeccionIA><SeccionIA titulo="Criterios de evaluación" icon={<FaShieldAlt/>}><p className="text-gray-300 text-sm mb-3">{resultado.evaluacion?.criterios}</p>{resultado.evaluacion?.requisitos_tecnicos?.length>0&&(<><p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">Requisitos técnicos</p><TagIA items={resultado.evaluacion.requisitos_tecnicos} color="cyan"/></>)}{resultado.evaluacion?.condiciones_clave?.length>0&&(<ul className="mt-4 space-y-2">{resultado.evaluacion.condiciones_clave.map((c,i)=>(<li key={i} className="flex gap-2 text-sm text-gray-300"><span className="text-cyan-400 mt-0.5 flex-shrink-0">▸</span>{c}</li>))}</ul>)}</SeccionIA></div>)}
                {subTab==="riesgos"&&(<div><SeccionIA titulo="Riesgos identificados" icon={<FaExclamationTriangle/>}><TagIA items={resultado.riesgos} color="red"/><p className="text-gray-300 text-sm mt-4 leading-relaxed">{resultado.analisis_riesgos}</p></SeccionIA><SeccionIA titulo="Oportunidades" icon={<FaCheckCircle/>}><TagIA items={resultado.oportunidades} color="green"/></SeccionIA><SeccionIA titulo="Hoja de ruta" icon={<FaRoute/>} defaultOpen={false}><ol className="space-y-3">{(resultado.pasos||[]).map((p,i)=>(<li key={i} className="flex gap-3 text-sm text-gray-300"><span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>{p}</li>))}</ol>{resultado.documentos_clave&&(<div className="mt-4 bg-white/5 rounded-xl p-3"><p className="text-cyan-400 text-xs font-bold mb-1">Documentos a preparar:</p><p className="text-gray-300 text-sm">{resultado.documentos_clave}</p></div>)}</SeccionIA><SeccionIA titulo="Recomendación estratégica" icon={<FaRobot/>} defaultOpen={false}><p className="text-gray-300 text-sm leading-relaxed">{resultado.recomendacion}</p></SeccionIA></div>)}
            </motion.div>)}
        </div>
    );
}

// ─── TAB ADJUDICADO + ÓRDENES DE COMPRA ──────────────────────────────────────
function TabAdjudicado({ licitacion, licitacionId, onActualizar }) {
    const token   = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario") || "Sistema";
    const headers = { "Content-Type":"application/json", ...(token&&{Authorization:`Bearer ${token}`}) };

    const [partidas,    setPartidas]    = useState([]);
    const [ordenes,     setOrdenes]     = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [showOCModal, setShowOCModal] = useState(false);
    const [ocPartida,   setOcPartida]   = useState(null); // partida seleccionada
    const [ocForm,      setOcForm]      = useState({ proveedorId:"", cantidad:"", precioUnitario:"", notas:"" });
    const [errOC,       setErrOC]       = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [msg,         setMsg]         = useState(null);
    const [showAddPartida, setShowAddPartida] = useState(false);
    const [pForm, setPForm] = useState({ clave:"", descripcion:"", unidad:"", cantidadMinima:"", cantidadMaxima:"", precioUnitario:"", registroSanitario:"", notas:"" });

    const showMsg = (ok, txt) => { setMsg({ok,txt}); setTimeout(()=>setMsg(null),3500); };

    const fetchAll = async () => {
        const [p, o] = await Promise.all([
            fetch(`${API}/api/licitaciones/${licitacionId}/partidas`, {headers}).then(r=>r.ok?r.json():[]).catch(()=>[]),
            fetch(`${API}/api/licitaciones/${licitacionId}/ordenes-compra`, {headers}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        ]);
        setPartidas(Array.isArray(p)?p:[]);
        setOrdenes(Array.isArray(o)?o:[]);
    };

    const fetchProveedores = async () => {
        const r = await fetch(`${API}/api/proveedores`, {headers}).catch(()=>null);
        if(r?.ok) setProveedores(await r.json());
    };

    useEffect(() => { fetchAll(); fetchProveedores(); }, [licitacionId]);

    // Calcula saldo disponible por partida
    const saldoPartida = (partida) => {
        const consumido = ordenes
            .filter(o => o.partidaId === partida.id && o.status !== "CANCELADA")
            .reduce((s, o) => s + (o.cantidad || 0), 0);
        return { consumido, disponible: (partida.cantidadMaxima || 0) - consumido };
    };

    const abrirOC = (partida) => {
        const { disponible } = saldoPartida(partida);
        if (disponible <= 0) { showMsg(false, "⛔ Sin saldo disponible en esta partida"); return; }
        setOcPartida(partida);
        setOcForm({ proveedorId:"", cantidad:"", precioUnitario: partida.precioUnitario||"", notas:"" });
        setErrOC(null);
        setShowOCModal(true);
    };

    const validarOC = () => {
        if (!ocForm.proveedorId) return "Selecciona un proveedor";
        const cant = Number(ocForm.cantidad);
        if (!cant || cant <= 0) return "Ingresa una cantidad válida";
        const { disponible } = saldoPartida(ocPartida);
        if (cant > disponible) return `⛔ Excede el saldo disponible (${disponible} ${ocPartida.unidad||"unidades"})`;
        if (!ocForm.precioUnitario || Number(ocForm.precioUnitario) <= 0) return "Ingresa el precio unitario";
        return null;
    };

    const crearOC = async () => {
        const err = validarOC();
        if (err) { setErrOC(err); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/licitaciones/${licitacionId}/ordenes-compra`, {
                method:"POST", headers,
                body: JSON.stringify({
                    partidaId:    ocPartida.id,
                    proveedorId:  Number(ocForm.proveedorId),
                    cantidad:     Number(ocForm.cantidad),
                    precioUnitario: Number(ocForm.precioUnitario),
                    notas:        ocForm.notas,
                    usuario
                })
            });
            if (res.ok) {
                showMsg(true,"✓ Orden de compra creada");
                setShowOCModal(false);
                fetchAll();
            } else {
                const e = await res.json().catch(()=>({}));
                setErrOC(e.message || "Error al crear la orden");
            }
        } catch { setErrOC("Error de conexión"); }
        setLoading(false);
    };

    const cancelarOC = async (ocId) => {
        if (!confirm("¿Cancelar esta orden de compra?")) return;
        await fetch(`${API}/api/licitaciones/ordenes-compra/${ocId}/cancelar`, { method:"PUT", headers });
        showMsg(true,"Orden cancelada");
        fetchAll();
    };

    const guardarPartida = async () => {
        if (!pForm.descripcion || !pForm.cantidadMaxima) { showMsg(false,"Descripción y cantidad máxima son requeridas"); return; }
        const res = await fetch(`${API}/api/licitaciones/${licitacionId}/partidas`, {
            method:"POST", headers,
            body: JSON.stringify({
                clave:            pForm.clave,
                descripcion:      pForm.descripcion,
                unidad:           pForm.unidad,
                cantidadMinima:   Number(pForm.cantidadMinima)||0,
                cantidadMaxima:   Number(pForm.cantidadMaxima),
                precioUnitario:   Number(pForm.precioUnitario)||0,
                registroSanitario:pForm.registroSanitario,
                notas:            pForm.notas,
            })
        });
        if (res.ok) { showMsg(true,"Partida agregada ✓"); setShowAddPartida(false); setPForm({clave:"",descripcion:"",unidad:"",cantidadMinima:"",cantidadMaxima:"",precioUnitario:"",registroSanitario:"",notas:""}); fetchAll(); }
        else showMsg(false,"Error guardando partida");
    };

    const OC_STATUS = {
        PENDIENTE:  "text-yellow-300 bg-yellow-500/10 border-yellow-400/30",
        AUTORIZADA: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
        ENTREGADA:  "text-green-300 bg-green-500/10 border-green-400/30",
        CANCELADA:  "text-red-300 bg-red-500/10 border-red-400/30",
    };

    return (
        <div>
            {msg && (
                <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold ${msg.ok?"bg-green-500/10 border border-green-400/30 text-green-300":"bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                    {msg.txt}
                </div>
            )}

            {/* Montos adjudicados */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 border border-cyan-400/10 rounded-2xl p-4">
                    <p className="text-gray-400 text-xs mb-1">Monto Adjudicado</p>
                    <p className="text-2xl font-black text-green-300">
                        {licitacion?.montoAdjudicado ? `$${Number(licitacion.montoAdjudicado).toLocaleString("es-MX")}` : "-"}
                    </p>
                </div>
                <div className="bg-white/5 border border-cyan-400/10 rounded-2xl p-4">
                    <p className="text-gray-400 text-xs mb-1">Total Órdenes Generadas</p>
                    <p className="text-2xl font-black text-cyan-300">
                        {fmxn(ordenes.filter(o=>o.status!=="CANCELADA").reduce((s,o)=>s+(o.total||0),0))}
                    </p>
                </div>
                <div className="bg-white/5 border border-cyan-400/10 rounded-2xl p-4">
                    <p className="text-gray-400 text-xs mb-1">Órdenes</p>
                    <p className="text-2xl font-black text-white">{ordenes.filter(o=>o.status!=="CANCELADA").length}</p>
                </div>
            </div>

            {/* Partidas del fallo */}
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-bold">Partidas adjudicadas del fallo</h3>
                <button onClick={()=>setShowAddPartida(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all">
                    <FaPlus/> Agregar partida
                </button>
            </div>

            {partidas.length === 0 && (
                <div className="py-8 text-center text-gray-500 bg-white/5 rounded-2xl border border-white/5 mb-4">
                    <FaTable className="mx-auto mb-2 text-2xl"/>
                    <p>No hay partidas registradas.</p>
                    <p className="text-xs mt-1">Agrégalas manualmente o impórtalas desde el Análisis IA.</p>
                </div>
            )}

            <div className="space-y-3 mb-6">
                {partidas.map(partida => {
                    const { consumido, disponible } = saldoPartida(partida);
                    const pct = partida.cantidadMaxima > 0 ? Math.min(100, (consumido / partida.cantidadMaxima) * 100) : 0;
                    const agotado = disponible <= 0;
                    return (
                        <div key={partida.id} className={`rounded-2xl border p-4 ${agotado?"bg-red-500/5 border-red-400/20":"bg-white/5 border-cyan-400/10"}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {partida.clave && <span className="text-cyan-300 font-black text-xs">{partida.clave}</span>}
                                        {partida.registroSanitario && partida.registroSanitario !== "N/A" && (
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 font-mono text-xs">{partida.registroSanitario}</span>
                                        )}
                                        {agotado && <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-400/30 text-red-300 text-xs font-bold flex items-center gap-1"><FaLock size={9}/> Agotado</span>}
                                    </div>
                                    <p className="text-white font-bold text-sm">{partida.descripcion}</p>
                                    <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                                        <span>Unidad: <span className="text-white">{partida.unidad||"-"}</span></span>
                                        <span className="text-yellow-300">Mín: {fnum(partida.cantidadMinima)}</span>
                                        <span className="text-green-300">Máx: {fnum(partida.cantidadMaxima)}</span>
                                        <span>Precio u.: <span className="text-white">{fmxn(partida.precioUnitario)}</span></span>
                                    </div>
                                    {/* Barra de consumo */}
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400">Consumido: <span className={consumido>0?"text-white font-bold":"text-gray-500"}>{fnum(consumido)} / {fnum(partida.cantidadMaxima)}</span></span>
                                            <span className={agotado?"text-red-300 font-bold":"text-cyan-300 font-bold"}>Disponible: {fnum(disponible)}</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${agotado?"bg-red-400":pct>80?"bg-yellow-400":"bg-cyan-400"}`} style={{width:`${pct}%`}}/>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => abrirOC(partida)}
                                    disabled={agotado}
                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${agotado?"bg-gray-500/10 border border-gray-400/20 text-gray-500 cursor-not-allowed":"bg-green-500/10 border border-green-400/30 text-green-300 hover:bg-green-500/20"}`}>
                                    <FaShoppingCart/> Nueva OC
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Órdenes de compra generadas */}
            {ordenes.length > 0 && (
                <>
                    <h3 className="text-white font-bold mb-3">Órdenes de compra generadas</h3>
                    <div className="rounded-2xl bg-white/5 border border-cyan-400/10 overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead><tr className="text-gray-400 border-b border-cyan-400/10">
                                {["# OC","Partida","Proveedor","Cantidad","Precio U.","Total","Status","Acciones"].map(h=>(
                                    <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {ordenes.map(oc=>(
                                    <tr key={oc.id} className={`border-b border-white/5 ${oc.status==="CANCELADA"?"opacity-40":""}`}>
                                        <td className="px-4 py-3 font-black text-cyan-300">{oc.folio||`OC-${oc.id}`}</td>
                                        <td className="px-4 py-3 text-white max-w-xs">
                                            <p className="font-bold truncate">{oc.partidaDescripcion||"-"}</p>
                                            {oc.partidaClave&&<p className="text-gray-500 text-xs">{oc.partidaClave}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{oc.proveedorNombre||"-"}</td>
                                        <td className="px-4 py-3 text-white font-bold text-right whitespace-nowrap">{fnum(oc.cantidad)} {oc.unidad}</td>
                                        <td className="px-4 py-3 text-white text-right whitespace-nowrap">{fmxn(oc.precioUnitario)}</td>
                                        <td className="px-4 py-3 text-green-300 font-black text-right whitespace-nowrap">{fmxn(oc.total)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${OC_STATUS[oc.status]||"text-gray-300 bg-white/5 border-white/10"}`}>{oc.status}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {oc.status !== "CANCELADA" && (
                                                <button onClick={()=>cancelarOC(oc.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                                    <FaTrash size={10}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-cyan-400/20">
                                    <td colSpan={5} className="px-4 pt-3 text-right text-gray-400 font-bold">TOTAL ÓRDENES ACTIVAS:</td>
                                    <td className="px-4 pt-3 text-right font-black text-cyan-300 whitespace-nowrap">{fmxn(ordenes.filter(o=>o.status!=="CANCELADA").reduce((s,o)=>s+(o.total||0),0))}</td>
                                    <td colSpan={2}/>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}

            {/* Modal agregar partida */}
            <AnimatePresence>
                {showAddPartida && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-black text-cyan-300">Agregar partida del fallo</h2>
                                <button onClick={()=>setShowAddPartida(false)} className="text-gray-400 hover:text-white"><FaTimes/></button>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Clave / Código</label>
                                        <input value={pForm.clave} onChange={e=>setPForm(p=>({...p,clave:e.target.value}))} className={inputCls} placeholder="010.000.2618.00"/>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Registro Sanitario</label>
                                        <input value={pForm.registroSanitario} onChange={e=>setPForm(p=>({...p,registroSanitario:e.target.value}))} className={inputCls} placeholder="XXS00910"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Descripción *</label>
                                    <input value={pForm.descripcion} onChange={e=>setPForm(p=>({...p,descripcion:e.target.value}))} className={inputCls} placeholder="LEVETIRACETAM TABLETA..."/>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Unidad</label>
                                        <input value={pForm.unidad} onChange={e=>setPForm(p=>({...p,unidad:e.target.value}))} className={inputCls} placeholder="Pieza"/>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cant. Mínima</label>
                                        <input type="number" value={pForm.cantidadMinima} onChange={e=>setPForm(p=>({...p,cantidadMinima:e.target.value}))} className={inputCls} placeholder="1"/>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cant. Máxima *</label>
                                        <input type="number" value={pForm.cantidadMaxima} onChange={e=>setPForm(p=>({...p,cantidadMaxima:e.target.value}))} className={inputCls} placeholder="1000"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Precio Unitario ($)</label>
                                    <input type="number" value={pForm.precioUnitario} onChange={e=>setPForm(p=>({...p,precioUnitario:e.target.value}))} className={inputCls} placeholder="100"/>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Notas</label>
                                    <input value={pForm.notas} onChange={e=>setPForm(p=>({...p,notas:e.target.value}))} className={inputCls} placeholder="Observaciones..."/>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={()=>setShowAddPartida(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={guardarPartida} className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30">
                                    <FaCheck className="inline mr-2"/>Guardar partida
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal crear OC */}
            <AnimatePresence>
                {showOCModal && ocPartida && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-cyan-300">Nueva Orden de Compra</h2>
                                <button onClick={()=>setShowOCModal(false)} className="text-gray-400 hover:text-white"><FaTimes/></button>
                            </div>

                            {/* Info de la partida */}
                            <div className="bg-cyan-500/5 border border-cyan-400/20 rounded-xl p-4 mb-4">
                                <p className="text-xs text-gray-400 mb-1">Partida seleccionada</p>
                                {ocPartida.clave&&<p className="text-cyan-300 font-black text-xs mb-1">{ocPartida.clave}</p>}
                                <p className="text-white font-bold text-sm">{ocPartida.descripcion}</p>
                                <div className="flex gap-4 mt-2 text-xs">
                                    <span className="text-yellow-300">Mín: {fnum(ocPartida.cantidadMinima)}</span>
                                    <span className="text-green-300">Máx: {fnum(ocPartida.cantidadMaxima)}</span>
                                    <span className="text-cyan-300 font-bold">Disponible: {fnum(saldoPartida(ocPartida).disponible)} {ocPartida.unidad}</span>
                                </div>
                            </div>

                            {errOC && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-bold flex items-center gap-2">
                                    <FaLock size={12}/> {errOC}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Proveedor *</label>
                                    <select value={ocForm.proveedorId} onChange={e=>setOcForm(f=>({...f,proveedorId:e.target.value}))} className={selectCls}>
                                        <option value="">- Seleccionar proveedor -</option>
                                        {proveedores.map(p=>(<option key={p.id} value={p.id}>{p.nombre||p.razonSocial}</option>))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cantidad a ordenar *</label>
                                        <input type="number" value={ocForm.cantidad}
                                            onChange={e=>{ setOcForm(f=>({...f,cantidad:e.target.value})); setErrOC(null); }}
                                            className={inputCls} placeholder={`Máx ${saldoPartida(ocPartida).disponible}`}
                                            max={saldoPartida(ocPartida).disponible} min={1}/>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Precio Unitario ($) *</label>
                                        <input type="number" value={ocForm.precioUnitario} onChange={e=>setOcForm(f=>({...f,precioUnitario:e.target.value}))} className={inputCls} placeholder="0.00"/>
                                    </div>
                                </div>
                                {ocForm.cantidad && ocForm.precioUnitario && Number(ocForm.cantidad)>0 && Number(ocForm.precioUnitario)>0 && (
                                    <div className="bg-white/5 border border-cyan-400/10 rounded-xl p-3 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white">{fmxn(Number(ocForm.cantidad)*Number(ocForm.precioUnitario))}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">IVA 16%</span><span className="text-white">{fmxn(Number(ocForm.cantidad)*Number(ocForm.precioUnitario)*0.16)}</span></div>
                                        <div className="flex justify-between font-black border-t border-white/10 pt-2 mt-2"><span className="text-cyan-300">Total OC</span><span className="text-cyan-300">{fmxn(Number(ocForm.cantidad)*Number(ocForm.precioUnitario)*1.16)}</span></div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Notas</label>
                                    <input value={ocForm.notas} onChange={e=>setOcForm(f=>({...f,notas:e.target.value}))} className={inputCls} placeholder="Observaciones de la orden..."/>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button onClick={()=>setShowOCModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={crearOC} disabled={loading} className="flex-1 py-3 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 flex items-center justify-center gap-2">
                                    <FaShoppingCart/>{loading?"Creando...":"Crear Orden de Compra"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function LicitacionesPage() {
    const [licitaciones, setLicitaciones] = useState([]);
    const [resumen,      setResumen]      = useState({});
    const [showModal,    setShowModal]    = useState(false);
    const [showExpediente, setShowExpediente] = useState(false);
    const [expediente,   setExpediente]   = useState(null);
    const [form,         setForm]         = useState(emptyForm);
    const [loading,      setLoading]      = useState(false);
    const [msg,          setMsg]          = useState(null);
    const [tabExp,       setTabExp]       = useState("info");
    const [propForm,     setPropForm]     = useState(emptyPropuesta);
    const [showPropModal,setShowPropModal]= useState(false);
    const [busqueda,     setBusqueda]     = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");

    const token   = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario") || "Sistema";
    const headers = { "Content-Type":"application/json", ...(token&&{Authorization:`Bearer ${token}`}) };

    const fetchJson = async (url) => { const r=await fetch(url,{headers}); if(!r.ok)return null; try{return await r.json();}catch{return null;} };
    const fetchAll  = async () => {
        const [l,r] = await Promise.all([fetchJson(`${API}/api/licitaciones`), fetchJson(`${API}/api/licitaciones/resumen`)]);
        setLicitaciones(Array.isArray(l)?l:[]); setResumen(r||{});
    };
    const fetchExpediente = async (id) => { const d=await fetchJson(`${API}/api/licitaciones/${id}/expediente`); if(d)setExpediente(d); };
    useEffect(()=>{fetchAll();},[]);

    const setF = k=>e=>setForm(p=>({...p,[k]:e.target.value}));
    const setP = k=>e=>setPropForm(p=>({...p,[k]:e.target.value}));
    const showMsgFn = (ok,txt)=>{ setMsg({ok,txt}); setTimeout(()=>setMsg(null),3000); };

    const handleCreate = async () => {
        setLoading(true);
        try{
            const res=await fetch(`${API}/api/licitaciones`,{method:"POST",headers:{...headers,"X-Usuario":usuario},body:JSON.stringify(form)});
            if(res.ok){showMsgFn(true,"Licitación creada ✓");setShowModal(false);setForm(emptyForm);fetchAll();}
        }catch{showMsgFn(false,"Error creando licitación");}
        setLoading(false);
    };

    const handleStatus = async (id,status) => {
        await fetch(`${API}/api/licitaciones/${id}/status?status=${status}`,{method:"PUT",headers:{...headers,"X-Usuario":usuario}});
        fetchAll();
        if(expediente?.licitacion?.id===id)fetchExpediente(id);
    };

    const handleDelete = async (id) => {
        if(!confirm("¿Eliminar licitación?"))return;
        await fetch(`${API}/api/licitaciones/${id}`,{method:"DELETE",headers:{...headers,"X-Usuario":usuario}});
        fetchAll();
    };

    const abrirExpediente = async (l) => { await fetchExpediente(l.id); setShowExpediente(true); setTabExp("info"); };

    const uploadDoc = async (docId,file,licitacionId) => {
        const fd=new FormData(); fd.append("file",file); fd.append("documentoId",docId);
        try{
            const res=await fetch(`${API}/api/licitaciones/${licitacionId}/documentos/upload`,{method:"POST",headers:{...(token&&{Authorization:`Bearer ${token}`}),"X-Usuario":usuario},body:fd});
            if(res.ok){showMsgFn(true,"Documento cargado ✓");fetchExpediente(licitacionId);}
            else showMsgFn(false,"Error subiendo documento");
        }catch{showMsgFn(false,"Error de conexión");}
    };

    const updateDocStatus = async (docId,status,licitacionId) => { await fetch(`${API}/api/licitaciones/documentos/${docId}/status?status=${status}`,{method:"PUT",headers}); fetchExpediente(licitacionId); };
    const deleteDoc = async (docId,licitacionId) => { await fetch(`${API}/api/licitaciones/documentos/${docId}`,{method:"DELETE",headers}); fetchExpediente(licitacionId); };

    const savePropuesta = async () => {
        const res=await fetch(`${API}/api/licitaciones/${expediente.licitacion.id}/propuestas`,{method:"POST",headers,body:JSON.stringify(propForm)});
        if(res.ok){showMsgFn(true,"Concepto agregado ✓");setShowPropModal(false);setPropForm(emptyPropuesta);fetchExpediente(expediente.licitacion.id);}
    };

    const deletePropuesta = async (propId) => { await fetch(`${API}/api/licitaciones/propuestas/${propId}`,{method:"DELETE",headers}); fetchExpediente(expediente.licitacion.id); };

    const filtradas = licitaciones.filter(l=>{
        const matchB=!busqueda||l.titulo?.toLowerCase().includes(busqueda.toLowerCase())||l.dependencia?.toLowerCase().includes(busqueda.toLowerCase())||l.folio?.toLowerCase().includes(busqueda.toLowerCase());
        const matchS=!filtroStatus||l.status===filtroStatus;
        return matchB&&matchS;
    });

    const docsPorCategoria = (docs) => docs?.reduce((acc,d)=>{const cat=d.categoria||"OTRO";if(!acc[cat])acc[cat]=[];acc[cat].push(d);return acc;},{})||{};
    const totalPropuesta = expediente?.propuestas?.reduce((a,p)=>a+(p.total||0),0)||0;

    const esGanada = expediente?.licitacion?.status === "GANADA";

    // Tabs dinámicos según status
    const TABS = [
        {key:"info",      label:"Información", icon:<FaClipboardList/>},
        {key:"docs",      label:"Documentos",  icon:<FaFileAlt/>},
        {key:"propuesta", label:"Propuesta $",  icon:<FaDollarSign/>},
        {key:"fechas",    label:"Calendario",  icon:<FaGavel/>},
        {key:"analisis",  label:"Análisis IA", icon:<FaRobot/>},
        ...(esGanada ? [{key:"adjudicado", label:"Adjudicado / OC", icon:<FaShoppingCart/>}] : []),
    ];

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar/>
            <div className="flex-1 p-8 overflow-auto">
                <Topbar/>
                {msg&&(<div className={`mb-4 px-5 py-3 rounded-xl text-sm font-bold ${msg.ok?"bg-green-500/10 border border-green-400/30 text-green-300":"bg-red-500/10 border border-red-400/30 text-red-300"}`}>{msg.txt}</div>)}

                <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">LICITACIONES</h1>
                        <p className="text-gray-400 mt-2">Gestión de expedientes para ComprasMX / CompraNet</p>
                    </div>
                    <button onClick={()=>setShowModal(true)} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                        <FaPlus/> Nueva Licitación
                    </button>
                </motion.div>

                <div className="grid grid-cols-6 gap-4 mb-8">
                    {[
                        {label:"Total",     value:resumen.total||0,     color:"text-white"},
                        {label:"Prospecto", value:resumen.prospecto||0,  color:"text-gray-400"},
                        {label:"En Proceso",value:resumen.enProceso||0,  color:"text-cyan-400"},
                        {label:"Presentada",value:resumen.presentada||0, color:"text-yellow-400"},
                        {label:"Ganadas",   value:resumen.ganadas||0,    color:"text-green-400"},
                        {label:"Pipeline",  value:`$${((resumen.montoPipeline||0)/1000000).toFixed(1)}M`, color:"text-purple-400"},
                    ].map((s,i)=>(
                        <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}} className="rounded-2xl bg-white/5 border border-cyan-400/10 p-4">
                            <p className="text-gray-400 text-xs">{s.label}</p>
                            <h2 className={`text-2xl font-black ${s.color}`}>{s.value}</h2>
                        </motion.div>
                    ))}
                </div>

                <div className="flex gap-3 mb-5 flex-wrap">
                    <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por título, dependencia, folio..." className="bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm w-72"/>
                    <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm">
                        <option value="">Todos los status</option>
                        {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
                    </select>
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                    <table className="w-full text-left text-sm">
                        <thead><tr className="text-gray-400 border-b border-cyan-400/10">
                            {["Folio","Título","Dependencia","Tipo","Monto Est.","Fallo","Status","Avanzar","Acciones"].map(h=><th key={h} className="pb-3 pr-4">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {filtradas.length===0&&(<tr><td colSpan={9} className="py-12 text-center text-gray-500">No hay licitaciones registradas</td></tr>)}
                            {filtradas.map((l,i)=>{
                                const idxActual=FLUJO_STATUS.indexOf(l.status);
                                const siguiente=idxActual>=0&&idxActual<FLUJO_STATUS.length-1?FLUJO_STATUS[idxActual+1]:null;
                                return(
                                    <motion.tr key={l.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all cursor-pointer" onClick={()=>abrirExpediente(l)}>
                                        <td className="py-3 pr-4 font-black text-cyan-300 text-xs">{l.folio}</td>
                                        <td className="py-3 pr-4 text-white font-bold max-w-xs truncate">{l.titulo||"-"}</td>
                                        <td className="py-3 pr-4 text-gray-300">{l.dependencia||"-"}</td>
                                        <td className="py-3 pr-4 text-gray-400 text-xs">{l.tipoLicitacion||"-"}</td>
                                        <td className="py-3 pr-4 text-green-300 font-bold">{l.montoEstimado?`$${l.montoEstimado.toLocaleString("es-MX",{minimumFractionDigits:0})}`:"-"}</td>
                                        <td className="py-3 pr-4 text-gray-400 text-xs">{l.fechaFallo||"-"}</td>
                                        <td className="py-3 pr-4" onClick={e=>e.stopPropagation()}>
                                            <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_COLORS[l.status]||"text-gray-300"}`}>{l.status}</span>
                                        </td>
                                        <td className="py-3 pr-4" onClick={e=>e.stopPropagation()}>
                                            {siguiente&&(<button onClick={()=>handleStatus(l.id,siguiente)} className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all">→ {siguiente}</button>)}
                                            {["EN_PROCESO","PRESENTADA"].includes(l.status)&&(<button onClick={()=>handleStatus(l.id,"PERDIDA")} className="ml-1 px-3 py-1 rounded-lg bg-red-500/10 border border-red-400/20 text-red-300 text-xs font-bold hover:bg-red-500/20 transition-all">Perdida</button>)}
                                        </td>
                                        <td className="py-3" onClick={e=>e.stopPropagation()}>
                                            <button onClick={()=>handleDelete(l.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12}/></button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── PANEL EXPEDIENTE ── */}
            <AnimatePresence>
                {showExpediente&&expediente&&(
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col">

                            <div className="flex justify-between items-start p-6 pb-0 flex-shrink-0">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-black text-cyan-300">{expediente.licitacion?.folio}</span>
                                        <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${STATUS_COLORS[expediente.licitacion?.status]}`}>{expediente.licitacion?.status}</span>
                                        {esGanada&&<span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-bold flex items-center gap-1"><FaShoppingCart size={9}/> OC habilitadas</span>}
                                    </div>
                                    <h2 className="text-2xl font-black text-white">{expediente.licitacion?.titulo}</h2>
                                    <p className="text-gray-400 text-sm">{expediente.licitacion?.dependencia} - {expediente.licitacion?.estado}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Documentos</p>
                                        <p className="text-lg font-black text-cyan-300">{expediente.docsCargados}/{expediente.docsTotal}</p>
                                        <div className="w-32 h-2 bg-white/10 rounded-full mt-1">
                                            <div className="h-2 bg-cyan-400 rounded-full transition-all" style={{width:`${expediente.progreso||0}%`}}/>
                                        </div>
                                    </div>
                                    <button onClick={()=>setShowExpediente(false)} className="text-gray-400 hover:text-white text-xl ml-4"><FaTimes/></button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 px-6 pt-4 flex-shrink-0 flex-wrap">
                                {TABS.map(t=>(
                                    <button key={t.key} onClick={()=>setTabExp(t.key)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tabExp===t.key?"bg-cyan-500/20 border border-cyan-400/30 text-cyan-300":"bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10"} ${t.key==="adjudicado"?"border-green-400/30 text-green-300 bg-green-500/10 hover:bg-green-500/20":""}`}>
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-4">

                                {/* Info */}
                                {tabExp==="info"&&(
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            {label:"Número de Licitación",value:expediente.licitacion?.numeroLicitacion},
                                            {label:"Tipo",value:expediente.licitacion?.tipoLicitacion},
                                            {label:"Tipo de Contrato",value:expediente.licitacion?.tipoContrato},
                                            {label:"Estado",value:expediente.licitacion?.estado},
                                            {label:"Municipio",value:expediente.licitacion?.municipio},
                                            {label:"Monto Estimado",value:expediente.licitacion?.montoEstimado?`$${expediente.licitacion.montoEstimado.toLocaleString("es-MX")}`:"-"},
                                            {label:"Monto Propuesto",value:expediente.licitacion?.montoPropuesto?`$${expediente.licitacion.montoPropuesto.toLocaleString("es-MX")}`:"-"},
                                            {label:"Monto Adjudicado",value:expediente.licitacion?.montoAdjudicado?`$${expediente.licitacion.montoAdjudicado.toLocaleString("es-MX")}`:"-"},
                                            {label:"Contacto",value:expediente.licitacion?.contactoNombre},
                                            {label:"Teléfono Contacto",value:expediente.licitacion?.contactoTelefono},
                                            {label:"Email Contacto",value:expediente.licitacion?.contactoEmail},
                                            {label:"URL ComprasMX",value:expediente.licitacion?.urlComprasMX},
                                        ].map((item,i)=>(
                                            <div key={i} className="bg-white/5 rounded-xl p-4">
                                                <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                                                <p className="text-white font-bold text-sm">{item.value||"-"}</p>
                                            </div>
                                        ))}
                                        {expediente.licitacion?.notas&&(<div className="col-span-2 bg-white/5 rounded-xl p-4"><p className="text-gray-400 text-xs mb-1">Notas</p><p className="text-white text-sm">{expediente.licitacion.notas}</p></div>)}
                                    </div>
                                )}

                                {/* Documentos */}
                                {tabExp==="docs"&&(
                                    <div className="space-y-5">
                                        {Object.entries(docsPorCategoria(expediente.documentos)).map(([cat,docs])=>(
                                            <div key={cat}>
                                                <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-3">{cat} - {docs.filter(d=>d.status==="CARGADO").length}/{docs.length} cargados</h3>
                                                <div className="space-y-2">
                                                    {docs.map(doc=>(
                                                        <div key={doc.id} className={`flex items-center justify-between p-4 rounded-xl border ${doc.status==="CARGADO"?"bg-green-500/5 border-green-400/20":"bg-white/5 border-white/10"}`}>
                                                            <div className="flex items-center gap-3">
                                                                <FaFileAlt className={doc.status==="CARGADO"?"text-green-400":"text-gray-500"}/>
                                                                <div><p className="text-white text-sm font-bold">{doc.nombre}</p>{doc.fileName&&<p className="text-gray-400 text-xs">{doc.fileName}</p>}{doc.fechaCarga&&<p className="text-gray-500 text-xs">Cargado: {doc.fechaCarga}</p>}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${DOC_STATUS_COLOR(doc.status)}`}>{doc.status}</span>
                                                                {doc.status==="PENDIENTE"&&(<><label className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-1"><FaUpload size={10}/> Subir<input type="file" className="hidden" onChange={e=>e.target.files[0]&&uploadDoc(doc.id,e.target.files[0],expediente.licitacion.id)}/></label><button onClick={()=>updateDocStatus(doc.id,"NO_APLICA",expediente.licitacion.id)} className="px-2 py-1 rounded-lg bg-gray-500/10 border border-gray-400/20 text-gray-400 text-xs hover:bg-gray-500/20 transition-all">N/A</button></>)}
                                                                {doc.status==="CARGADO"&&(<button onClick={()=>deleteDoc(doc.id,expediente.licitacion.id)} className="p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={10}/></button>)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Propuesta */}
                                {tabExp==="propuesta"&&(
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <div><h3 className="text-white font-bold">Propuesta Económica</h3><p className="text-gray-400 text-sm">Conceptos y precios unitarios</p></div>
                                            <button onClick={()=>setShowPropModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-sm font-bold hover:bg-cyan-500/20 transition-all"><FaPlus/> Agregar Concepto</button>
                                        </div>
                                        {expediente.propuestas?.length===0&&<div className="py-10 text-center text-gray-500">No hay conceptos en la propuesta</div>}
                                        <div className="space-y-3 mb-6">
                                            {expediente.propuestas?.map(p=>(
                                                <div key={p.id} className="bg-white/5 border border-cyan-400/10 rounded-xl p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="text-white font-bold">{p.concepto}</p>
                                                            <div className="flex gap-4 mt-1 text-xs text-gray-400">
                                                                {p.origen&&<span>📍 {p.origen} → {p.destino}</span>}
                                                                {p.tipoVehiculo&&<span>🚛 {p.tipoVehiculo}</span>}
                                                                <span>{p.cantidad} {p.unidad} × ${p.precioUnitario?.toLocaleString("es-MX")}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="text-gray-400 text-xs">Subtotal</p>
                                                            <p className="text-white font-bold">${p.subtotal?.toLocaleString("es-MX",{minimumFractionDigits:2})}</p>
                                                            <p className="text-gray-500 text-xs">IVA: ${p.iva?.toLocaleString("es-MX",{minimumFractionDigits:2})}</p>
                                                            <p className="text-green-300 font-black">Total: ${p.total?.toLocaleString("es-MX",{minimumFractionDigits:2})}</p>
                                                        </div>
                                                        <button onClick={()=>deletePropuesta(p.id)} className="ml-3 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {expediente.propuestas?.length>0&&(
                                            <div className="bg-cyan-500/5 border border-cyan-400/20 rounded-2xl p-5">
                                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Subtotal</span><span className="text-white">${(totalPropuesta/1.16).toLocaleString("es-MX",{minimumFractionDigits:2})}</span></div>
                                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">IVA (16%)</span><span className="text-white">${(totalPropuesta-totalPropuesta/1.16).toLocaleString("es-MX",{minimumFractionDigits:2})}</span></div>
                                                <div className="flex justify-between font-black text-lg border-t border-cyan-400/20 pt-3 mt-3"><span className="text-cyan-300">TOTAL PROPUESTA</span><span className="text-cyan-300">${totalPropuesta.toLocaleString("es-MX",{minimumFractionDigits:2})}</span></div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Fechas */}
                                {tabExp==="fechas"&&(
                                    <div className="space-y-3">
                                        {[
                                            {label:"Publicación",            value:expediente.licitacion?.fechaPublicacion,            icon:"📅"},
                                            {label:"Junta de Aclaraciones",  value:expediente.licitacion?.fechaJuntaAclaraciones,      icon:"💬"},
                                            {label:"Presentación Propuestas",value:expediente.licitacion?.fechaPresentacionPropuestas, icon:"📤"},
                                            {label:"Apertura Técnica",       value:expediente.licitacion?.fechaAperturaTecnica,        icon:"🔍"},
                                            {label:"Apertura Económica",     value:expediente.licitacion?.fechaAperturaEconomica,      icon:"💰"},
                                            {label:"Fallo",                  value:expediente.licitacion?.fechaFallo,                  icon:"⚖️"},
                                            {label:"Firma de Contrato",      value:expediente.licitacion?.fechaContrato,               icon:"✍️"},
                                            {label:"Inicio de Servicio",     value:expediente.licitacion?.fechaInicioServicio,         icon:"🚀"},
                                            {label:"Fin de Servicio",        value:expediente.licitacion?.fechaFinServicio,            icon:"🏁"},
                                        ].map((f,i)=>{
                                            const hoy=new Date();
                                            const fecha=f.value?new Date(f.value):null;
                                            const pasado=fecha&&fecha<hoy;
                                            const hoy7=fecha&&!pasado&&(fecha-hoy)<7*24*60*60*1000;
                                            return(
                                                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${pasado?"bg-white/5 border-white/5 opacity-60":hoy7?"bg-yellow-500/10 border-yellow-400/30":"bg-white/5 border-cyan-400/10"}`}>
                                                    <div className="flex items-center gap-3"><span className="text-xl">{f.icon}</span><p className="text-white font-bold text-sm">{f.label}</p></div>
                                                    <div className="text-right">
                                                        <p className={`font-bold ${pasado?"text-gray-500":hoy7?"text-yellow-300":"text-cyan-300"}`}>{f.value||"-"}</p>
                                                        {hoy7&&<p className="text-yellow-400 text-xs">⚠️ Próximo</p>}
                                                        {pasado&&f.value&&<p className="text-gray-500 text-xs">✓ Pasado</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Análisis IA */}
                                {tabExp==="analisis"&&<TabAnalisisIA/>}

                                {/* Adjudicado / OC - solo si GANADA */}
                                {tabExp==="adjudicado"&&esGanada&&(
                                    <TabAdjudicado
                                        licitacion={expediente.licitacion}
                                        licitacionId={expediente.licitacion.id}
                                        onActualizar={()=>fetchExpediente(expediente.licitacion.id)}
                                    />
                                )}

                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Nueva Licitación */}
            <AnimatePresence>
                {showModal&&(
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-3xl max-h-[95vh] flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">Nueva Licitación</h2>
                                <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-white"><FaTimes/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Título de la Licitación *</label><input value={form.titulo} onChange={setF("titulo")} className={inputCls} placeholder="Servicio de transporte de carga..."/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Número de Licitación</label><input value={form.numeroLicitacion} onChange={setF("numeroLicitacion")} className={inputCls} placeholder="LA-019GYN001-E1-2026"/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Dependencia *</label><input value={form.dependencia} onChange={setF("dependencia")} className={inputCls} placeholder="IMSS, CFE, SEP..."/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Tipo de Licitación</label><select value={form.tipoLicitacion} onChange={setF("tipoLicitacion")} className={selectCls}>{TIPOS_LIC.map(t=><option key={t}>{t}</option>)}</select></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Tipo de Contrato</label><select value={form.tipoContrato} onChange={setF("tipoContrato")} className={selectCls}>{TIPOS_CON.map(t=><option key={t}>{t}</option>)}</select></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Estado</label><select value={form.estado} onChange={setF("estado")} className={selectCls}>{ESTADOS_MX.map(e=><option key={e}>{e}</option>)}</select></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Municipio</label><input value={form.municipio} onChange={setF("municipio")} className={inputCls} placeholder="Monterrey"/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Monto Estimado ($)</label><input type="number" value={form.montoEstimado} onChange={setF("montoEstimado")} className={inputCls} placeholder="1000000"/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">URL ComprasMX</label><input value={form.urlComprasMX} onChange={setF("urlComprasMX")} className={inputCls} placeholder="https://comprasmx.gob.mx/..."/></div>
                                </div>
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Fechas Clave</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[{label:"Publicación",key:"fechaPublicacion"},{label:"Junta Aclaraciones",key:"fechaJuntaAclaraciones"},{label:"Entrega Propuestas",key:"fechaPresentacionPropuestas"},{label:"Apertura Técnica",key:"fechaAperturaTecnica"},{label:"Apertura Económica",key:"fechaAperturaEconomica"},{label:"Fallo",key:"fechaFallo"},{label:"Firma Contrato",key:"fechaContrato"},{label:"Inicio Servicio",key:"fechaInicioServicio"},{label:"Fin Servicio",key:"fechaFinServicio"}].map(f=>(
                                            <div key={f.key}><label className="text-gray-400 text-xs mb-1 block">{f.label}</label><input type="date" value={form[f.key]} onChange={setF(f.key)} className={inputCls}/></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="border-t border-white/5 pt-4">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Contacto en la Dependencia</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div><label className="text-gray-400 text-xs mb-1 block">Nombre</label><input value={form.contactoNombre} onChange={setF("contactoNombre")} className={inputCls} placeholder="Lic. Juan Pérez"/></div>
                                        <div><label className="text-gray-400 text-xs mb-1 block">Teléfono</label><input value={form.contactoTelefono} onChange={setF("contactoTelefono")} className={inputCls} placeholder="81 1234 5678"/></div>
                                        <div><label className="text-gray-400 text-xs mb-1 block">Email</label><input value={form.contactoEmail} onChange={setF("contactoEmail")} className={inputCls} placeholder="jperez@imss.gob.mx"/></div>
                                    </div>
                                </div>
                                <div><label className="text-gray-400 text-xs mb-1 block">Notas</label><textarea value={form.notas} onChange={setF("notas")} rows={2} className={inputCls+" resize-none"} placeholder="Observaciones..."/></div>
                            </div>
                            <div className="flex gap-4 p-6 pt-0 flex-shrink-0">
                                <button onClick={()=>setShowModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={handleCreate} disabled={loading} className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 flex items-center justify-center gap-2">
                                    <FaCheck/>{loading?"Creando...":"Crear Licitación"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Agregar Concepto */}
            <AnimatePresence>
                {showPropModal&&(
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-black text-cyan-300">Agregar Concepto</h2>
                                <button onClick={()=>setShowPropModal(false)} className="text-gray-400 hover:text-white"><FaTimes/></button>
                            </div>
                            <div className="space-y-3">
                                <div><label className="text-gray-400 text-xs mb-1 block">Concepto / Descripción</label><input value={propForm.concepto} onChange={setP("concepto")} className={inputCls} placeholder="Servicio de flete terrestre..."/></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-gray-400 text-xs mb-1 block">Origen</label><input value={propForm.origen} onChange={setP("origen")} className={inputCls} placeholder="Monterrey"/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Destino</label><input value={propForm.destino} onChange={setP("destino")} className={inputCls} placeholder="CDMX"/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Tipo de Vehículo</label><input value={propForm.tipoVehiculo} onChange={setP("tipoVehiculo")} className={inputCls} placeholder="Torton, Rabon..."/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Unidad</label><select value={propForm.unidad} onChange={setP("unidad")} className={selectCls}>{["Viaje","Km","Tonelada","Caja","Palet","Servicio"].map(u=><option key={u}>{u}</option>)}</select></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Cantidad</label><input type="number" value={propForm.cantidad} onChange={setP("cantidad")} className={inputCls} placeholder="100"/></div>
                                    <div><label className="text-gray-400 text-xs mb-1 block">Precio Unitario ($)</label><input type="number" value={propForm.precioUnitario} onChange={setP("precioUnitario")} className={inputCls} placeholder="8500"/></div>
                                </div>
                                {propForm.cantidad&&propForm.precioUnitario&&(
                                    <div className="bg-cyan-500/5 border border-cyan-400/10 rounded-xl p-3 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white">${(Number(propForm.cantidad)*Number(propForm.precioUnitario)).toLocaleString("es-MX")}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">IVA 16%</span><span className="text-white">${(Number(propForm.cantidad)*Number(propForm.precioUnitario)*0.16).toLocaleString("es-MX")}</span></div>
                                        <div className="flex justify-between font-black"><span className="text-cyan-300">Total</span><span className="text-cyan-300">${(Number(propForm.cantidad)*Number(propForm.precioUnitario)*1.16).toLocaleString("es-MX")}</span></div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-5">
                                <button onClick={()=>setShowPropModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={savePropuesta} className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30"><FaCheck className="inline mr-2"/>Agregar</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}




