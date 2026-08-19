import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaPlus, FaFilePdf, FaTrash, FaFileInvoiceDollar, FaTimes, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const TIPOS_FACTURA = [
    { id: "VIAJE",        label: "Por Viaje",       icon: "🚛", desc: "Factura vinculada a un viaje especifico",        color: "cyan" },
    { id: "CONCEPTO",     label: "Por Concepto",    icon: "📄", desc: "Factura libre por conceptos personalizados",     color: "blue" },
    { id: "NOTA_CARGO",   label: "Nota de Cargo",   icon: "⬆️", desc: "Cargo adicional sobre una factura existente",    color: "orange" },
    { id: "NOTA_CREDITO", label: "Nota de Credito", icon: "⬇️", desc: "Descuento o devolucion sobre factura existente", color: "red" },
    { id: "GLOBAL",       label: "Factura Global",  icon: "🌐", desc: "Para publico en general, RFC generico",          color: "purple" },
];

const TIPOS_CONCEPTO = ["FLETE", "MANIOBRA", "SEGURO", "COMBUSTIBLE", "PEAJE", "OTRO"];
const USOS_CFDI      = ["G01 - Adquisicion de mercancias", "G03 - Gastos en general", "S01 - Sin efectos fiscales", "CP01 - Pagos"];
const FORMAS_PAGO    = ["01 - Efectivo", "02 - Cheque nominativo", "03 - Transferencia electronica", "04 - Tarjeta de credito", "99 - Por definir"];
const METODOS_PAGO   = ["PUE - Pago en una sola exhibicion", "PPD - Pago en parcialidades o diferido"];

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const emptyConcepto = { descripcion:"", tipoConcepto:"FLETE", claveProdServ:"78101800", claveUnidad:"E48", cantidad:1, valorUnitario:"", descuento:0, orderId:"" };
const emptyForm = { clienteId:"", serie:"A", folio:"", fecha:new Date().toISOString().slice(0,10), formaPago:"03 - Transferencia electronica", metodoPago:"PUE - Pago en una sola exhibicion", usoCfdi:"G03 - Gastos en general", tipoComprobante:"I", receptorRfc:"", receptorRazonSocial:"", receptorRegimenFiscal:"", receptorUsoCfdi:"G03 - Gastos en general", receptorCodigoPostal:"", descuento:0, notas:"", orderId:"", facturaRelacionadaId:"" };

const tipoColor = (tipo) => {
    const map = { VIAJE:"text-cyan-300 bg-cyan-500/10 border-cyan-400/30", CONCEPTO:"text-blue-300 bg-blue-500/10 border-blue-400/30", NOTA_CARGO:"text-orange-300 bg-orange-500/10 border-orange-400/30", NOTA_CREDITO:"text-red-300 bg-red-500/10 border-red-400/30", GLOBAL:"text-purple-300 bg-purple-500/10 border-purple-400/30" };
    return map[tipo] || "text-gray-300 bg-white/5 border-white/10";
};

const statusColor = s => {
    if (s === "Timbrada")  return "text-green-300 bg-green-500/10 border-green-400/30";
    if (s === "Cancelada") return "text-red-300 bg-red-500/10 border-red-400/30";
    return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
};

export default function FacturasPage() {
    const [searchParams] = useSearchParams();
    const [facturas,    setFacturas]    = useState([]);
    const [clientes,    setClientes]    = useState([]);
    const [orders,      setOrders]      = useState([]);
    const [showModal,   setShowModal]   = useState(false);
    const [tipoFactura, setTipoFactura] = useState("CONCEPTO");
    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [msg,         setMsg]         = useState(null);
    const [filtroTipo,  setFiltroTipo]  = useState("TODOS");
    const [form,        setForm]        = useState({ ...emptyForm });
    const [conceptos,   setConceptos]   = useState([{ ...emptyConcepto }]);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) };

    const fetchJson = async (url) => { try { const r = await fetch(url, { headers }); return await r.json(); } catch { return []; } };

    const fetchAll = async () => {
        const [f, c, o] = await Promise.all([
            fetchJson(API+"/api/facturas"),
            fetchJson(API+"/clients"),
            fetchJson(API+"/orders"),
        ]);
        setFacturas(Array.isArray(f) ? f : []);
        setClientes(Array.isArray(c) ? c : []);
        setOrders(Array.isArray(o) ? o : []);
    };

    useEffect(() => {
        fetchAll();
        const orderId   = searchParams.get("orderId");
        const clienteId = searchParams.get("clienteId");
        const monto     = searchParams.get("monto");
        if (orderId) {
            setTipoFactura("VIAJE");
            setStep(2);
            setForm(f => ({ ...f, orderId, clienteId: clienteId || "" }));
            fetch(API+"/api/facturas/desde-viaje/"+orderId, { headers })
                .then(r => r.json())
                .then(data => {
                    setForm(f => ({ ...f, clienteId: data.clienteId ? String(data.clienteId) : f.clienteId, receptorRazonSocial: data.clienteNombre || "" }));
                    if (data.descripcion) setConceptos([{ ...emptyConcepto, descripcion: data.descripcion, valorUnitario: monto || "", orderId }]);
                }).catch(() => {});
            setShowModal(true);
        }
    }, []);

    const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
    const setConcepto    = (i, k, v) => setConceptos(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
    const addConcepto    = () => setConceptos(p => [...p, { ...emptyConcepto }]);
    const removeConcepto = i => setConceptos(p => p.filter((_, idx) => idx !== i));

    const onClienteChange = (e) => {
        const id = e.target.value;
        const c  = clientes.find(c => String(c.id) === String(id));
        setForm(p => ({ ...p, clienteId: id, receptorRazonSocial: c ? c.name : "" }));
    };

    const onOrderChange = async (e) => {
        const orderId = e.target.value;
        setForm(p => ({ ...p, orderId }));
        if (!orderId) return;
        try {
            const data = await fetch(API+"/api/facturas/desde-viaje/"+orderId, { headers }).then(r => r.json());
            setForm(p => ({ ...p, orderId, clienteId: data.clienteId ? String(data.clienteId) : p.clienteId, receptorRazonSocial: data.clienteNombre || p.receptorRazonSocial }));
            if (data.descripcion) setConceptos([{ ...emptyConcepto, descripcion: data.descripcion, valorUnitario: data.monto || "", orderId }]);
        } catch {}
    };

    const abrirNueva = () => {
        setForm({ ...emptyForm });
        setConceptos([{ ...emptyConcepto }]);
        setStep(1);
        setShowModal(true);
    };

    const elegirTipo = (tipo) => {
        setTipoFactura(tipo);
        setForm(f => ({
            ...f,
            tipoComprobante: tipo === "NOTA_CREDITO" ? "E" : "I",
            receptorRfc: tipo === "GLOBAL" ? "XAXX010101000" : "",
            receptorRazonSocial: tipo === "GLOBAL" ? "PUBLICO EN GENERAL" : "",
            receptorUsoCfdi: tipo === "GLOBAL" ? "S01 - Sin efectos fiscales" : "G03 - Gastos en general",
        }));
        setStep(2);
    };

    const subtotal = conceptos.reduce((acc, c) => acc + (Number(c.cantidad) * Number(c.valorUnitario) - Number(c.descuento || 0)), 0);
    const iva   = subtotal * 0.16;
    const total = subtotal + iva - Number(form.descuento || 0);

    const showMsg = (ok, txt, ms = 4000) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), ms); };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await fetch(API+"/api/facturas", {
                method: "POST", headers,
                body: JSON.stringify({
                    ...form, tipoFactura,
                    orderId: form.orderId ? Number(form.orderId) : null,
                    facturaRelacionadaId: form.facturaRelacionadaId ? Number(form.facturaRelacionadaId) : null,
                    conceptos
                })
            });
            setShowModal(false);
            setConceptos([{ ...emptyConcepto }]);
            fetchAll();
            showMsg(true, "Factura creada correctamente");
        } catch { showMsg(false, "Error creando factura"); }
        setLoading(false);
    };

    const descargarPdf = async (id, folio) => {
        try {
            const res  = await fetch(API+"/api/facturas/"+id+"/pdf", { headers });
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href  = URL.createObjectURL(blob);
            link.download = "factura_"+folio+".pdf";
            link.click();
        } catch { showMsg(false, "Error descargando PDF"); }
    };

    const eliminar = async (id) => {
        if (!confirm("Eliminar factura?")) return;
        await fetch(API+"/api/facturas/"+id, { method: "DELETE", headers });
        fetchAll();
    };

    const timbrar = async (id, folio) => {
        if (!confirm("Timbrar la factura "+folio+" ante el SAT?")) return;
        try {
            const res  = await fetch(API+"/api/facturas/"+id+"/timbrar", { method: "POST", headers });
            const data = await res.json();
            if (res.ok && data.status === "Timbrada") {
                showMsg(true, "Factura "+folio+" timbrada. UUID: "+data.uuid, 6000);
            } else {
                showMsg(false, data.error || "Error al timbrar");
            }
            fetchAll();
        } catch { showMsg(false, "Error de conexion"); }
    };

    const cancelarFactura = async (id, folio) => {
        if (!confirm("Cancelar la factura "+folio+" ante el SAT? Esta accion no se puede deshacer.")) return;
        try {
            const res  = await fetch(API+"/api/facturas/"+id+"/cancelar", { method: "DELETE", headers });
            const data = await res.json();
            if (res.ok && data.status === "Cancelada") {
                showMsg(true, "Factura "+folio+" cancelada");
            } else {
                showMsg(false, data.error || "Error al cancelar");
            }
            fetchAll();
        } catch { showMsg(false, "Error de conexion"); }
    };

    const facturasFiltradas = filtroTipo === "TODOS" ? facturas : facturas.filter(f => f.tipoFactura === filtroTipo);

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />

                <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">FACTURAS</h1>
                        <p className="text-gray-400 mt-2">CFDI 4.0 con timbrado PAC integrado</p>
                    </div>
                    <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }} onClick={abrirNueva}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Factura
                    </motion.button>
                </motion.div>

                {msg && (
                    <div className={"mb-6 px-5 py-3 rounded-xl text-sm font-bold "+(msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300")}>
                        {msg.txt}
                    </div>
                )}

                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label:"Total",      value:facturas.length,                                                                    color:"text-cyan-400" },
                        { label:"Timbradas",  value:facturas.filter(f => f.status==="Timbrada").length,                                 color:"text-green-400" },
                        { label:"Borradores", value:facturas.filter(f => f.status==="Borrador").length,                                 color:"text-yellow-400" },
                        { label:"Notas",      value:facturas.filter(f => ["NOTA_CARGO","NOTA_CREDITO"].includes(f.tipoFactura)).length,  color:"text-orange-400" },
                        { label:"Globales",   value:facturas.filter(f => f.tipoFactura==="GLOBAL").length,                              color:"text-purple-400" },
                    ].map((s,i) => (
                        <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
                            className="rounded-2xl bg-white/5 border border-cyan-400/10 p-5 flex items-center gap-4">
                            <FaFileInvoiceDollar className={"text-3xl "+s.color} />
                            <div><p className="text-gray-400 text-xs">{s.label}</p><h2 className={"text-3xl font-black "+s.color}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex gap-2 mb-6 flex-wrap">
                    {["TODOS", ...TIPOS_FACTURA.map(t => t.id)].map(t => (
                        <button key={t} onClick={() => setFiltroTipo(t)}
                            className={"px-4 py-2 rounded-xl text-xs font-bold transition-all border "+(filtroTipo===t ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10")}>
                            {t==="TODOS" ? "Todos" : TIPOS_FACTURA.find(x => x.id===t)?.label || t}
                        </button>
                    ))}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                {["Folio","Tipo","Cliente","Fecha","Subtotal","IVA","Total","Status","Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {facturasFiltradas.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay facturas registradas</td></tr>}
                            {facturasFiltradas.map((f,i) => (
                                <motion.tr key={f.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                                    className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                    <td className="py-4 pr-4 font-bold text-cyan-300">{f.serie}{f.folio}</td>
                                    <td className="py-4 pr-4">
                                        <span className={"px-2 py-0.5 rounded-full border text-xs font-bold "+tipoColor(f.tipoFactura)}>
                                            {TIPOS_FACTURA.find(t => t.id===f.tipoFactura)?.label || f.tipoFactura || "Concepto"}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4 text-white text-sm">{f.cliente?.name || f.receptorRazonSocial || "-"}</td>
                                    <td className="py-4 pr-4 text-gray-400 text-sm">{f.fecha}</td>
                                    <td className="py-4 pr-4 text-gray-300 text-sm">${f.subtotal?.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>
                                    <td className="py-4 pr-4 text-gray-300 text-sm">${f.iva?.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>
                                    <td className="py-4 pr-4 text-green-300 font-bold">${f.total?.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>
                                    <td className="py-4 pr-4">
                                        <span className={"px-3 py-1 rounded-full border text-xs font-bold "+statusColor(f.status)}>{f.status}</span>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex gap-2 flex-wrap">
                                            {f.status === "Borrador" && (
                                                <button onClick={() => timbrar(f.id, f.serie+""+f.folio)}
                                                    className="p-2 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all" title="Timbrar ante el SAT">
                                                    <FaCheck size={12} />
                                                </button>
                                            )}
                                            {f.status === "Timbrada" && (
                                                <button onClick={() => cancelarFactura(f.id, f.serie+""+f.folio)}
                                                    className="p-2 rounded-xl bg-orange-500/10 border border-orange-400/20 text-orange-300 hover:bg-orange-500/20 transition-all" title="Cancelar ante el SAT">
                                                    <FaTimes size={12} />
                                                </button>
                                            )}
                                            <button onClick={() => descargarPdf(f.id, f.folio)}
                                                className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all" title="PDF">
                                                <FaFilePdf size={12} />
                                            </button>
                                            <button onClick={() => eliminar(f.id)}
                                                className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all" title="Eliminar">
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <div>
                                    <h2 className="text-3xl font-black text-cyan-300">
                                        {step===1 ? "Nueva Factura -Elige el tipo" : (TIPOS_FACTURA.find(t=>t.id===tipoFactura)?.icon+" "+TIPOS_FACTURA.find(t=>t.id===tipoFactura)?.label)}
                                    </h2>
                                    {step===2 && <button onClick={() => setStep(1)} className="text-gray-500 text-sm mt-1 hover:text-gray-300">→Cambiar tipo</button>}
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            {step===1 && (
                                <div className="flex-1 p-8 grid grid-cols-1 gap-4">
                                    {TIPOS_FACTURA.map(t => (
                                        <button key={t.id} onClick={() => elegirTipo(t.id)}
                                            className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-cyan-400/10 hover:bg-cyan-500/10 hover:border-cyan-400/30 transition-all text-left group">
                                            <span className="text-3xl">{t.icon}</span>
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-lg group-hover:text-cyan-300 transition-colors">{t.label}</p>
                                                <p className="text-gray-500 text-sm">{t.desc}</p>
                                            </div>
                                            <span className={"px-3 py-1 rounded-full border text-xs font-bold "+tipoColor(t.id)}>
                                                {t.id==="NOTA_CREDITO" ? "Egreso" : "Ingreso"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step===2 && (
                                <>
                                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                                        {tipoFactura==="VIAJE" && (
                                            <div>
                                                <h3 className="text-cyan-400 font-bold mb-3 text-sm uppercase tracking-widest">Viaje a Facturar</h3>
                                                <select value={form.orderId} onChange={onOrderChange} className={selectCls}>
                                                    <option value="">Seleccionar viaje...</option>
                                                    {orders.map(o => <option key={o.id} value={o.id}>{o.folio||"#"+o.id} -{o.cliente?.name||""} {o.cost?"($"+o.cost.toLocaleString()+")":""}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {(tipoFactura==="NOTA_CARGO"||tipoFactura==="NOTA_CREDITO") && (
                                            <div>
                                                <h3 className="text-orange-400 font-bold mb-3 text-sm uppercase tracking-widest">Factura Relacionada</h3>
                                                <select value={form.facturaRelacionadaId} onChange={setF("facturaRelacionadaId")} className={selectCls}>
                                                    <option value="">Seleccionar factura...</option>
                                                    {facturas.filter(f=>f.tipoFactura!=="NOTA_CARGO"&&f.tipoFactura!=="NOTA_CREDITO").map(f => (
                                                        <option key={f.id} value={f.id}>{f.serie}{f.folio} -{f.cliente?.name||f.receptorRazonSocial} -${f.total?.toLocaleString()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-cyan-400 font-bold mb-3 text-sm uppercase tracking-widest">Datos Generales</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div><label className="text-gray-400 text-xs mb-1 block">Serie</label><input value={form.serie} onChange={setF("serie")} className={inputCls} /></div>
                                                <div><label className="text-gray-400 text-xs mb-1 block">Folio</label><input value={form.folio} onChange={setF("folio")} className={inputCls} placeholder="Auto" /></div>
                                                <div><label className="text-gray-400 text-xs mb-1 block">Fecha</label><input type="date" value={form.fecha} onChange={setF("fecha")} className={inputCls} /></div>
                                                <div><label className="text-gray-400 text-xs mb-1 block">Forma de Pago</label><select value={form.formaPago} onChange={setF("formaPago")} className={selectCls}>{FORMAS_PAGO.map(f=><option key={f}>{f}</option>)}</select></div>
                                                <div><label className="text-gray-400 text-xs mb-1 block">Metodo de Pago</label><select value={form.metodoPago} onChange={setF("metodoPago")} className={selectCls}>{METODOS_PAGO.map(f=><option key={f}>{f}</option>)}</select></div>
                                                <div><label className="text-gray-400 text-xs mb-1 block">Tipo Comprobante</label>
                                                    <select value={form.tipoComprobante} onChange={setF("tipoComprobante")} className={selectCls}>
                                                        <option value="I">I - Ingreso</option>
                                                        <option value="E">E - Egreso</option>
                                                        <option value="T">T - Traslado</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-cyan-400 font-bold mb-3 text-sm uppercase tracking-widest">Receptor</h3>
                                            {tipoFactura==="GLOBAL" ? (
                                                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/20 text-purple-300 text-sm">
                                                    RFC: <strong>XAXX010101000 -PUBLICO EN GENERAL</strong>
                                                    <div className="mt-3 grid grid-cols-2 gap-4">
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Regimen Fiscal</label><input value={form.receptorRegimenFiscal} onChange={setF("receptorRegimenFiscal")} className={inputCls} placeholder="616" /></div>
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Codigo Postal</label><input value={form.receptorCodigoPostal} onChange={setF("receptorCodigoPostal")} className={inputCls} placeholder="64000" /></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Cliente</label>
                                                        <select value={form.clienteId} onChange={onClienteChange} className={selectCls}>
                                                            <option value="">Seleccionar cliente...</option>
                                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div><label className="text-gray-400 text-xs mb-1 block">RFC</label><input value={form.receptorRfc} onChange={setF("receptorRfc")} className={inputCls} /></div>
                                                    <div><label className="text-gray-400 text-xs mb-1 block">Razon Social</label><input value={form.receptorRazonSocial} onChange={setF("receptorRazonSocial")} className={inputCls} /></div>
                                                    <div><label className="text-gray-400 text-xs mb-1 block">Regimen Fiscal</label><input value={form.receptorRegimenFiscal} onChange={setF("receptorRegimenFiscal")} className={inputCls} placeholder="616" /></div>
                                                    <div><label className="text-gray-400 text-xs mb-1 block">Codigo Postal</label><input value={form.receptorCodigoPostal} onChange={setF("receptorCodigoPostal")} className={inputCls} placeholder="64000" /></div>
                                                    <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Uso CFDI</label>
                                                        <select value={form.receptorUsoCfdi} onChange={setF("receptorUsoCfdi")} className={selectCls}>
                                                            {USOS_CFDI.map(u => <option key={u}>{u}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-widest">Conceptos</h3>
                                                <button onClick={addConcepto} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-sm font-bold hover:bg-cyan-500/20 transition-all">
                                                    <FaPlus /> Agregar
                                                </button>
                                            </div>
                                            {conceptos.map((c,i) => (
                                                <div key={i} className="bg-white/5 border border-cyan-400/10 rounded-2xl p-4 mb-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                        <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Descripcion</label><input value={c.descripcion} onChange={e=>setConcepto(i,"descripcion",e.target.value)} className={inputCls} /></div>
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Tipo</label>
                                                            <select value={c.tipoConcepto} onChange={e=>setConcepto(i,"tipoConcepto",e.target.value)} className={selectCls}>
                                                                {TIPOS_CONCEPTO.map(t=><option key={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-3 items-end">
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Clave SAT</label><input value={c.claveProdServ} onChange={e=>setConcepto(i,"claveProdServ",e.target.value)} className={inputCls} /></div>
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Unidad</label><input value={c.claveUnidad} onChange={e=>setConcepto(i,"claveUnidad",e.target.value)} className={inputCls} /></div>
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Cantidad</label><input type="number" value={c.cantidad} onChange={e=>setConcepto(i,"cantidad",e.target.value)} className={inputCls} /></div>
                                                        <div><label className="text-gray-400 text-xs mb-1 block">Precio Unit.</label><input type="number" value={c.valorUnitario} onChange={e=>setConcepto(i,"valorUnitario",e.target.value)} className={inputCls} /></div>
                                                        <div className="flex gap-2 items-end">
                                                            <div className="flex-1"><label className="text-gray-400 text-xs mb-1 block">Descuento</label><input type="number" value={c.descuento} onChange={e=>setConcepto(i,"descuento",e.target.value)} className={inputCls} /></div>
                                                            {conceptos.length>1 && <button onClick={()=>removeConcepto(i)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all mb-0.5"><FaTimes /></button>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end">
                                            <div className="bg-white/5 border border-cyan-400/10 rounded-2xl p-5 w-64">
                                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Subtotal</span><span className="text-white">${subtotal.toLocaleString("es-MX",{minimumFractionDigits:2})}</span></div>
                                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">IVA (16%)</span><span className="text-white">${iva.toLocaleString("es-MX",{minimumFractionDigits:2})}</span></div>
                                                <div className="flex justify-between text-sm mb-2 items-center">
                                                    <span className="text-gray-400">Descuento</span>
                                                    <input type="number" value={form.descuento} onChange={setF("descuento")} className="w-24 bg-white/5 border border-cyan-400/10 rounded-lg px-2 py-1 text-white text-right text-sm outline-none" />
                                                </div>
                                                <div className="border-t border-cyan-400/20 pt-3 flex justify-between font-bold">
                                                    <span className="text-cyan-300">TOTAL</span>
                                                    <span className="text-cyan-300 text-lg">${total.toLocaleString("es-MX",{minimumFractionDigits:2})}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div><label className="text-gray-400 text-xs mb-1 block">Notas</label><textarea value={form.notas} onChange={setF("notas")} rows={2} className={inputCls+" resize-none"} /></div>
                                    </div>
                                    <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                        <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} onClick={handleSubmit} disabled={loading}
                                            className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                            <FaCheck /> {loading ? "Guardando..." : "Crear Factura"}
                                        </motion.button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}









