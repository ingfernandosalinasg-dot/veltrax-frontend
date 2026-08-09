import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaTrophy, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const emptyForm = {
    nombre: "", metrica: "VIAJES", valorMinimo: "", tipoBono: "FIJO", valorBono: "", activo: true
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const metricaLabel = { VIAJES: "Número de viajes", KM: "Kil贸metros recorridos", INGRESO: "Ingreso generado ($)" };

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

export default function UmbralesPage() {
    const [umbrales, setUmbrales] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editando,  setEditando]  = useState(null);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const res = await fetch(`${API}/umbrales`, { headers });
            const data = await res.json();
            setUmbrales(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

    const openNew = () => {
        setEditando(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditando(u.id);
        setForm({ ...emptyForm, ...u });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = {
                ...form,
                valorMinimo: form.valorMinimo ? Number(form.valorMinimo) : null,
                valorBono: form.valorBono ? Number(form.valorBono) : null,
            };
            const url    = editando ? `${API}/umbrales/${editando}` : `${API}/umbrales`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(body) });
            setShowModal(false);
            fetchAll();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("驴Eliminar esta regla de umbral?")) return;
        try { await fetch(`${API}/umbrales/${id}`, { method: "DELETE", headers }); fetchAll(); }
        catch (e) { console.error(e); }
    };

    const toggleActivo = async (u) => {
        try {
            await fetch(`${API}/umbrales/${u.id}`, { method: "PUT", headers, body: JSON.stringify({ activo: !u.activo }) });
            fetchAll();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">UMBRALES DE RENDIMIENTO</h1>
                        <p className="text-gray-400 mt-4 text-xl">Reglas de bonos autom谩ticos por metas cumplidas</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Regla
                    </motion.button>
                </motion.div>

                <p className="text-gray-500 text-sm mb-6 max-w-2xl">
                    Estas reglas se eval煤an autom谩ticamente al generar una <strong>liquidaci贸n por per铆odo</strong>.
                    Si el operador alcanza la meta, el bono se suma a la liquidaci贸n. Si dos reglas activas comparten
                    la misma m茅trica, solo se aplica la de mayor umbral cumplido; reglas de m茅tricas distintas se suman.
                </p>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaTrophy /> Reglas Configuradas</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre", "M茅trica", "Meta m铆nima", "Bono", "Activa", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {umbrales.length === 0 && (
                                    <tr><td colSpan={6} className="py-10 text-center text-gray-500">No hay reglas configuradas todav铆a</td></tr>
                                )}
                                {umbrales.map((u, i) => (
                                    <motion.tr key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold">{u.nombre}</td>
                                        <td className="py-4 pr-4">
                                            <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-bold">
                                                {metricaLabel[u.metrica] || u.metrica}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-300">{u.valorMinimo?.toLocaleString() ?? "-"}</td>
                                        <td className="py-4 pr-4 text-yellow-300 font-bold">
                                            {u.tipoBono === "PORCENTAJE" ? `${u.valorBono}% del ingreso` : `$${(u.valorBono || 0).toLocaleString()}`}
                                        </td>
                                        <td className="py-4 pr-4">
                                            <button onClick={() => toggleActivo(u)} className="text-2xl">
                                                {u.activo ? <FaToggleOn className="text-green-400" /> : <FaToggleOff className="text-gray-500" />}
                                            </button>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(u)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all" title="Editar"><FaEdit /></button>
                                                <button onClick={() => handleDelete(u.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all" title="Eliminar"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg">
                            <div className="flex justify-between items-center p-8 pb-0">
                                <h2 className="text-2xl font-black text-cyan-300">{editando ? "Editar Regla" : "Nueva Regla de Umbral"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="p-8 grid grid-cols-2 gap-5">
                                <Field label="Nombre de la regla" span2>
                                    <input type="text" value={form.nombre} onChange={set("nombre")} placeholder="Bono por viajes en quincena" className={inputCls} />
                                </Field>
                                <Field label="M茅trica">
                                    <select value={form.metrica} onChange={set("metrica")} className={selectCls}>
                                        <option value="VIAJES">Número de viajes</option>
                                        <option value="KM">Kil贸metros recorridos</option>
                                        <option value="INGRESO">Ingreso generado ($)</option>
                                    </select>
                                </Field>
                                <Field label="Meta m铆nima a alcanzar">
                                    <input type="number" value={form.valorMinimo} onChange={set("valorMinimo")} placeholder="8" className={inputCls} />
                                </Field>
                                <Field label="Tipo de bono">
                                    <select value={form.tipoBono} onChange={set("tipoBono")} className={selectCls}>
                                        <option value="FIJO">Monto fijo ($)</option>
                                        <option value="PORCENTAJE">Porcentaje del ingreso (%)</option>
                                    </select>
                                </Field>
                                <Field label={form.tipoBono === "PORCENTAJE" ? "Porcentaje (%)" : "Monto ($)"}>
                                    <input type="number" value={form.valorBono} onChange={set("valorBono")} placeholder={form.tipoBono === "PORCENTAJE" ? "5" : "1000"} className={inputCls} />
                                </Field>
                            </div>
                            <div className="flex gap-4 p-8 pt-2">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Regla"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}










