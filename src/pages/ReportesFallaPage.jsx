import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaExclamationTriangle, FaPlus, FaTrash, FaTimes, FaCheck,
         FaArrowRight, FaClipboardList, FaTruck, FaTools } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const PRIORIDADES = ["Baja", "Media", "Alta", "Urgente"];
const TIPOS_ORDEN = ["Preventivo", "Correctivo"];

const prioridadColor = (p) => {
    if (p === "Urgente") return "text-red-300 bg-red-500/10 border-red-400/30";
    if (p === "Alta")    return "text-orange-300 bg-orange-500/10 border-orange-400/30";
    if (p === "Media")   return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
    return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
};

const statusColor = (s) => {
    if (s === "CONVERTIDO") return "text-purple-300 bg-purple-500/10 border-purple-400/30";
    if (s === "DESCARTADO") return "text-gray-400 bg-white/5 border-white/10";
    return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
};

const emptyForm = { vehicleId: "", driverId: "", prioridad: "Media", descripcion: "", fecha: "", notas: "" };
const emptyConv = { tipo: "Correctivo", proveedorId: "", fechaEntrada: "", fechaEstimadaSalida: "", costoEstimado: "", descripcion: "" };

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

export default function ReportesFallaPage() {
    const [reportes,  setReportes]  = useState([]);
    const [vehicles,  setVehicles]  = useState([]);
    const [drivers,   setDrivers]   = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [msg,       setMsg]       = useState(null);

    const [showConvModal, setShowConvModal] = useState(false);
    const [reporteActivo, setReporteActivo] = useState(null);
    const [convForm,      setConvForm]      = useState(emptyConv);
    const [loadingConv,   setLoadingConv]   = useState(false);

    const navigate = useNavigate();
    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
    const usuario = localStorage.getItem("usuario") || "Sistema";

    const fetchAll = async () => {
        try {
            const [r, v, d, p] = await Promise.all([
                fetch(`${API}/api/mantenimiento/reportes-falla`, { headers }).then(r => r.json()),
                fetch(`${API}/vehicles`, { headers }).then(r => r.json()),
                fetch(`${API}/drivers`, { headers }).then(r => r.json()),
                fetch(`${API}/proveedores`, { headers }).then(r => r.json()),
            ]);
            setReportes(Array.isArray(r) ? r : []);
            setVehicles(Array.isArray(v) ? v : []);
            setDrivers(Array.isArray(d) ? d : []);
            setProveedores(Array.isArray(p) ? p : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const set  = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
    const setC = (f) => (e) => setConvForm(prev => ({ ...prev, [f]: e.target.value }));

    const showMsgFn = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 4000); };

    const openNew = () => {
        setForm({ ...emptyForm, fecha: new Date().toISOString().split("T")[0] });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = { ...form, vehicleId: form.vehicleId ? Number(form.vehicleId) : null, driverId: form.driverId ? Number(form.driverId) : null };
            await fetch(`${API}/api/mantenimiento/reportes-falla`, {
                method: "POST", headers: { ...headers, "X-Usuario": usuario }, body: JSON.stringify(body)
            });
            setShowModal(false);
            fetchAll();
            showMsgFn(true, "Reporte de falla creado ✓");
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este reporte?")) return;
        await fetch(`${API}/api/mantenimiento/reportes-falla/${id}`, { method: "DELETE", headers });
        fetchAll();
    };

    const openConvertir = (r) => {
        setReporteActivo(r);
        setConvForm({ ...emptyConv, descripcion: r.descripcion || "", fechaEntrada: new Date().toISOString().split("T")[0] });
        setShowConvModal(true);
    };

    const handleConvertir = async () => {
        if (!reporteActivo) return;
        setLoadingConv(true);
        try {
            const body = { ...convForm, proveedorId: convForm.proveedorId ? Number(convForm.proveedorId) : null, costoEstimado: convForm.costoEstimado ? Number(convForm.costoEstimado) : null };
            const res = await fetch(`${API}/api/mantenimiento/reportes-falla/${reporteActivo.id}/convertir-a-orden`, {
                method: "POST", headers: { ...headers, "X-Usuario": usuario }, body: JSON.stringify(body)
            });
            if (res.ok) {
                const data = await res.json();
                setShowConvModal(false);
                fetchAll();
                showMsgFn(true, `Orden ${data.ordenServicio?.folio || ""} creada ✓`);
            } else {
                const err = await res.json().catch(() => ({}));
                showMsgFn(false, err.error || "Error al convertir");
            }
        } catch (e) { console.error(e); }
        setLoadingConv(false);
    };

    const pendientes  = reportes.filter(r => r.status === "PENDIENTE").length;
    const convertidos = reportes.filter(r => r.status === "CONVERTIDO").length;

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
                        <h1 className="text-2xl md:text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">REPORTES DE FALLA</h1>
                        <p className="text-gray-400 mt-2">Reporta problemas de una unidad y conviértelos en orden de servicio</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Reporte
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    {[
                        { label: "Total",       value: reportes.length, icon: <FaClipboardList />,       color: "text-cyan-400" },
                        { label: "Pendientes",  value: pendientes,      icon: <FaExclamationTriangle />, color: "text-yellow-400" },
                        { label: "Convertidos", value: convertidos,     icon: <FaTools />,                color: "text-purple-400" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                            <div className={`text-4xl ${s.color}`}>{s.icon}</div>
                            <div><p className="text-gray-400">{s.label}</p><h2 className="text-3xl font-black">{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaExclamationTriangle /> Reportes Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio", "Unidad", "Prioridad", "Descripción", "Fecha", "Status", "Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {reportes.length === 0 && (
                                    <tr><td colSpan={7} className="py-10 text-center text-gray-500">No hay reportes de falla registrados</td></tr>
                                )}
                                {reportes.map((r, i) => (
                                    <motion.tr key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300 text-sm">{r.folio}</td>
                                        <td className="py-4 pr-4 text-sm flex items-center gap-2"><FaTruck className="text-gray-500" /> {r.vehiclePlaca || "-"}</td>
                                        <td className="py-4 pr-4"><span className={`px-2 py-1 rounded-lg border text-xs font-bold ${prioridadColor(r.prioridad)}`}>{r.prioridad}</span></td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm max-w-xs truncate">{r.descripcion}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">{r.fecha}</td>
                                        <td className="py-4 pr-4"><span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusColor(r.status)}`}>{r.status}</span></td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                {r.status === "PENDIENTE" && (
                                                    <button onClick={() => openConvertir(r)}
                                                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-400/20 text-purple-300 hover:bg-purple-500/20 transition-all text-xs font-bold">
                                                        <FaArrowRight size={10} /> Convertir a Orden
                                                    </button>
                                                )}
                                                {r.status === "CONVERTIDO" && (
                                                    <button onClick={() => navigate("/ordenes-servicio")}
                                                        className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-xs font-bold">
                                                        Ver Orden
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(r.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL NUEVO REPORTE */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0">
                                <h2 className="text-2xl font-black text-cyan-300">Nuevo Reporte de Falla</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <Field label="Unidad">
                                    <select value={form.vehicleId} onChange={set("vehicleId")} className={selectCls}>
                                        <option value="">Seleccionar unidad...</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>)}
                                    </select>
                                </Field>
                                <Field label="Reportado por (opcional)">
                                    <select value={form.driverId} onChange={set("driverId")} className={selectCls}>
                                        <option value="">Sin especificar</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                                    </select>
                                </Field>
                                <Field label="Prioridad">
                                    <select value={form.prioridad} onChange={set("prioridad")} className={selectCls}>
                                        {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </Field>
                                <Field label="Descripción de la falla">
                                    <textarea value={form.descripcion} onChange={set("descripcion")} rows={3} placeholder="¿Qué está fallando?" className={inputCls + " resize-none"} />
                                </Field>
                                <Field label="Fecha">
                                    <input type="date" value={form.fecha} onChange={set("fecha")} className={inputCls} />
                                </Field>
                            </div>
                            <div className="flex gap-4 p-6 pt-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                    {loading ? "Guardando..." : "Guardar Reporte"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL CONVERTIR A ORDEN */}
            <AnimatePresence>
                {showConvModal && reporteActivo && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-purple-400/20 rounded-3xl w-full max-w-lg flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0">
                                <div>
                                    <h2 className="text-2xl font-black text-purple-300">Convertir a Orden de Servicio</h2>
                                    <p className="text-gray-400 text-sm mt-1">{reporteActivo.folio} - {reporteActivo.vehiclePlaca}</p>
                                </div>
                                <button onClick={() => setShowConvModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <Field label="Tipo de servicio">
                                    <select value={convForm.tipo} onChange={setC("tipo")} className={selectCls}>
                                        {TIPOS_ORDEN.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </Field>
                                <Field label="Descripción del trabajo">
                                    <textarea value={convForm.descripcion} onChange={setC("descripcion")} rows={2} className={inputCls + " resize-none"} />
                                </Field>
                                <Field label="Proveedor / Taller">
                                    <select value={convForm.proveedorId} onChange={setC("proveedorId")} className={selectCls}>
                                        <option value="">Seleccionar proveedor...</option>
                                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.razonSocial ? ` - ${p.razonSocial}` : ""}</option>)}
                                    </select>
                                    {proveedores.length === 0 && (
                                        <p className="text-yellow-400 text-xs mt-1">No tienes proveedores registrados. <a href="/proveedores" className="underline">Agregar proveedor</a></p>
                                    )}
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Fecha de entrada">
                                        <input type="date" value={convForm.fechaEntrada} onChange={setC("fechaEntrada")} className={inputCls} />
                                    </Field>
                                    <Field label="Fecha estimada de salida">
                                        <input type="date" value={convForm.fechaEstimadaSalida} onChange={setC("fechaEstimadaSalida")} className={inputCls} />
                                    </Field>
                                </div>
                                <Field label="Costo estimado ($)">
                                    <input type="number" value={convForm.costoEstimado} onChange={setC("costoEstimado")} placeholder="0.00" className={inputCls} />
                                </Field>
                            </div>
                            <div className="flex gap-4 p-6 pt-0">
                                <button onClick={() => setShowConvModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleConvertir} disabled={loadingConv}
                                    className="flex-1 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold hover:bg-purple-500/30 transition-all flex items-center justify-center gap-2">
                                    <FaCheck /> {loadingConv ? "Creando..." : "Crear Orden de Servicio"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}










