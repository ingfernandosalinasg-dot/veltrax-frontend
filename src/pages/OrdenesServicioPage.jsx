import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaTools, FaPlus, FaTrash, FaTimes, FaCheck, FaArrowRight,
         FaClock, FaMoneyBillWave, FaTruck, FaClipboardCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const TIPOS_ORDEN = ["Preventivo", "Correctivo"];
const FLUJO = ["PENDIENTE", "EN_PROCESO", "COMPLETADA"];

const statusColor = (s) => {
    if (s === "PENDIENTE")  return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
    if (s === "EN_PROCESO") return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
    if (s === "COMPLETADA") return "text-green-300 bg-green-500/10 border-green-400/30";
    return "text-gray-300 bg-white/5 border-white/10";
};

const siguienteStatus = (actual) => {
    const idx = FLUJO.indexOf(actual);
    return idx >= 0 && idx < FLUJO.length - 1 ? FLUJO[idx + 1] : null;
};

const emptyForm = { vehicleId: "", tipo: "Correctivo", descripcion: "", proveedorId: "", fechaEntrada: "", fechaEstimadaSalida: "", costoEstimado: "", refacciones: "", notas: "" };

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

export default function OrdenesServicioPage() {
    const [ordenes,   setOrdenes]   = useState([]);
    const [vehicles,  setVehicles]  = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [resumen,   setResumen]   = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [msg,       setMsg]       = useState(null);

    const [showCompletarModal, setShowCompletarModal] = useState(false);
    const [ordenActiva,        setOrdenActiva]        = useState(null);
    const [costoFinalForm,     setCostoFinalForm]     = useState("");
    const [loadingCompletar,   setLoadingCompletar]   = useState(false);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
    const usuario = localStorage.getItem("usuario") || "Sistema";

    const fetchAll = async () => {
        try {
            const [o, v, r, p] = await Promise.all([
                fetch(`${API}/api/mantenimiento/ordenes-servicio`, { headers }).then(r => r.json()),
                fetch(`${API}/vehicles`, { headers }).then(r => r.json()),
                fetch(`${API}/api/mantenimiento/ordenes-servicio/resumen`, { headers }).then(r => r.json()),
                fetch(`${API}/proveedores`, { headers }).then(r => r.json()),
            ]);
            setOrdenes(Array.isArray(o) ? o : []);
            setVehicles(Array.isArray(v) ? v : []);
            setResumen(r);
            setProveedores(Array.isArray(p) ? p : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
    const showMsgFn = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 4000); };

    const openNew = () => {
        setForm({ ...emptyForm, fechaEntrada: new Date().toISOString().split("T")[0] });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = { ...form, vehicleId: form.vehicleId ? Number(form.vehicleId) : null, proveedorId: form.proveedorId ? Number(form.proveedorId) : null, costoEstimado: form.costoEstimado ? Number(form.costoEstimado) : null };
            await fetch(`${API}/api/mantenimiento/ordenes-servicio`, {
                method: "POST", headers: { ...headers, "X-Usuario": usuario }, body: JSON.stringify(body)
            });
            setShowModal(false);
            fetchAll();
            showMsgFn(true, "Orden de servicio creada ✓");
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar esta orden de servicio?")) return;
        await fetch(`${API}/api/mantenimiento/ordenes-servicio/${id}`, { method: "DELETE", headers });
        fetchAll();
    };

    const avanzarStatus = async (orden, nuevoStatus) => {
        if (nuevoStatus === "COMPLETADA") {
            setOrdenActiva(orden);
            setCostoFinalForm(orden.costoEstimado != null ? String(orden.costoEstimado) : "");
            setShowCompletarModal(true);
            return;
        }
        await fetch(`${API}/api/mantenimiento/ordenes-servicio/${orden.id}/status?status=${nuevoStatus}`, {
            method: "PUT", headers: { ...headers, "X-Usuario": usuario }
        });
        fetchAll();
        showMsgFn(true, `Status actualizado a ${nuevoStatus} ✓`);
    };

    const confirmarCompletada = async () => {
        if (!ordenActiva) return;
        setLoadingCompletar(true);
        try {
            const url = `${API}/api/mantenimiento/ordenes-servicio/${ordenActiva.id}/status?status=COMPLETADA` +
                (costoFinalForm ? `&costoFinal=${Number(costoFinalForm)}` : "");
            await fetch(url, { method: "PUT", headers: { ...headers, "X-Usuario": usuario } });
            setShowCompletarModal(false);
            fetchAll();
            showMsgFn(true, "Orden marcada como completada ✓");
        } catch (e) { console.error(e); }
        setLoadingCompletar(false);
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <Topbar />

                {msg && (
                    <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-bold ${msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                        {msg.txt}
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl md:text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">ÓRDENES DE SERVICIO</h1>
                        <p className="text-gray-400 mt-2">Seguimiento de unidades en taller</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Orden
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Pendientes",     value: resumen?.pendientes ?? 0,                                      icon: <FaClock />,          color: "text-yellow-400" },
                        { label: "En Proceso",     value: resumen?.enProceso ?? 0,                                       icon: <FaTools />,           color: "text-cyan-400" },
                        { label: "Completadas",    value: resumen?.totalCompletadas ?? 0,                                icon: <FaClipboardCheck />,  color: "text-green-400" },
                        { label: "Total Gastado",  value: `$${(resumen?.totalGastado ?? 0).toLocaleString()}`,           icon: <FaMoneyBillWave />,   color: "text-purple-400" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 flex items-center gap-4">
                            <div className={`text-3xl ${s.color}`}>{s.icon}</div>
                            <div><p className="text-gray-400 text-sm">{s.label}</p><h2 className="text-2xl font-black">{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaTools /> Órdenes Registradas</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio", "Unidad", "Tipo", "Taller", "Entrada", "Costo", "Status", "Avanzar", "Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {ordenes.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay órdenes de servicio registradas</td></tr>
                                )}
                                {ordenes.map((o, i) => {
                                    const siguiente = siguienteStatus(o.status);
                                    return (
                                        <motion.tr key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-4 pr-4 font-bold text-cyan-300 text-sm">
                                                {o.folio}
                                                {o.reporteFallaFolio && <p className="text-gray-500 text-xs font-normal">desde {o.reporteFallaFolio}</p>}
                                            </td>
                                            <td className="py-4 pr-4 text-sm flex items-center gap-2"><FaTruck className="text-gray-500" /> {o.vehiclePlaca || "-"}</td>
                                            <td className="py-4 pr-4 text-gray-300 text-sm">{o.tipo}</td>
                                            <td className="py-4 pr-4 text-gray-300 text-sm">{o.taller || "-"}</td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">{o.fechaEntrada || "-"}</td>
                                            <td className="py-4 pr-4 text-sm">
                                                {o.status === "COMPLETADA"
                                                    ? <span className="text-green-300 font-bold">${(o.costoFinal || 0).toLocaleString()}</span>
                                                    : <span className="text-gray-400">est. ${(o.costoEstimado || 0).toLocaleString()}</span>}
                                            </td>
                                            <td className="py-4 pr-4"><span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusColor(o.status)}`}>{o.status}</span></td>
                                            <td className="py-4 pr-4">
                                                {siguiente && (
                                                    <button onClick={() => avanzarStatus(o, siguiente)}
                                                        className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-bold transition-all ${
                                                            siguiente === "COMPLETADA"
                                                                ? "bg-green-500/10 border-green-400/30 text-green-300 hover:bg-green-500/20"
                                                                : "bg-cyan-500/10 border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20"}`}>
                                                        <FaArrowRight size={10} /> {siguiente}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                <button onClick={() => handleDelete(o.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12} /></button>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL NUEVA ORDEN */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">Nueva Orden de Servicio</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto">
                                <Field label="Unidad">
                                    <select value={form.vehicleId} onChange={set("vehicleId")} className={selectCls}>
                                        <option value="">Seleccionar unidad...</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>)}
                                    </select>
                                </Field>
                                <Field label="Tipo de servicio">
                                    <select value={form.tipo} onChange={set("tipo")} className={selectCls}>
                                        {TIPOS_ORDEN.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </Field>
                                <Field label="Descripción del trabajo">
                                    <textarea value={form.descripcion} onChange={set("descripcion")} rows={2} className={inputCls + " resize-none"} />
                                </Field>
                                <Field label="Proveedor / Taller">
                                    <select value={form.proveedorId} onChange={set("proveedorId")} className={selectCls}>
                                        <option value="">Seleccionar proveedor...</option>
                                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.razonSocial ? ` - ${p.razonSocial}` : ""}</option>)}
                                    </select>
                                    {proveedores.length === 0 && (
                                        <p className="text-yellow-400 text-xs mt-1">No tienes proveedores registrados. <a href="/proveedores" className="underline">Agregar proveedor</a></p>
                                    )}
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Fecha de entrada">
                                        <input type="date" value={form.fechaEntrada} onChange={set("fechaEntrada")} className={inputCls} />
                                    </Field>
                                    <Field label="Fecha estimada de salida">
                                        <input type="date" value={form.fechaEstimadaSalida} onChange={set("fechaEstimadaSalida")} className={inputCls} />
                                    </Field>
                                </div>
                                <Field label="Costo estimado ($)">
                                    <input type="number" value={form.costoEstimado} onChange={set("costoEstimado")} placeholder="0.00" className={inputCls} />
                                </Field>
                                <Field label="Refacciones (opcional)">
                                    <input value={form.refacciones} onChange={set("refacciones")} placeholder="Balatas, filtro, etc." className={inputCls} />
                                </Field>
                            </div>
                            <div className="flex gap-4 p-6 pt-0 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                    {loading ? "Guardando..." : "Guardar Orden"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL COMPLETAR ORDEN */}
            <AnimatePresence>
                {showCompletarModal && ordenActiva && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-green-400/20 rounded-3xl w-full max-w-md flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0">
                                <div>
                                    <h2 className="text-2xl font-black text-green-300">Completar Orden</h2>
                                    <p className="text-gray-400 text-sm mt-1">{ordenActiva.folio} - {ordenActiva.vehiclePlaca}</p>
                                </div>
                                <button onClick={() => setShowCompletarModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <Field label="Costo final ($)">
                                    <input type="number" value={costoFinalForm} onChange={e => setCostoFinalForm(e.target.value)}
                                        placeholder={`Estimado: $${(ordenActiva.costoEstimado || 0).toLocaleString()}`} className={inputCls} />
                                </Field>
                                <p className="text-gray-500 text-xs">La fecha de salida se marcará como hoy automáticamente.</p>
                            </div>
                            <div className="flex gap-4 p-6 pt-0">
                                <button onClick={() => setShowCompletarModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={confirmarCompletada} disabled={loadingCompletar}
                                    className="flex-1 py-3 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 transition-all flex items-center justify-center gap-2">
                                    <FaCheck /> {loadingCompletar ? "Guardando..." : "Marcar Completada"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}










