import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaRoute, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaArrowRight, FaSearch } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const emptyForm = {
    clienteId: "", remitenteId: "", destinatarioId: "",
    distanciaKm: "", tiempoEstimado: "", tarifa: "",
    notas: "", status: "Activa"
};

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

function RutaTag({ ruta }) {
    const origen  = ruta.remitente?.ciudad  || ruta.remitente?.nombre  || "鈥?;
    const destino = ruta.destinatario?.ciudad || ruta.destinatario?.nombre || "鈥?;
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-cyan-300 font-bold">{origen}</span>
            <FaArrowRight className="text-gray-500 text-xs flex-shrink-0" />
            <span className="text-purple-300 font-bold">{destino}</span>
        </div>
    );
}

export default function RutasPage() {
    const [rutas,         setRutas]         = useState([]);
    const [clientes,      setClientes]      = useState([]);
    const [remitentes,    setRemitentes]    = useState([]);
    const [destinatarios, setDestinatarios] = useState([]);
    const [showModal,     setShowModal]     = useState(false);
    const [editando,      setEditando]      = useState(null);
    const [form,          setForm]          = useState(emptyForm);
    const [loading,       setLoading]       = useState(false);
    const [formError,     setFormError]     = useState("");
    const [busqueda,      setBusqueda]      = useState("");

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [r, c, rem, dest] = await Promise.all([
                fetch(`${API}/rutas`,         { headers }).then(x => x.json()),
                fetch(`${API}/clients`,       { headers }).then(x => x.json()),
                fetch(`${API}/remitentes`,    { headers }).then(x => x.json()),
                fetch(`${API}/destinatarios`, { headers }).then(x => x.json()),
            ]);
            setRutas(Array.isArray(r)    ? r    : []);
            setClientes(Array.isArray(c) ? c    : []);
            setRemitentes(Array.isArray(rem)  ? rem  : []);
            setDestinatarios(Array.isArray(dest) ? dest : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

    const openNew = () => {
        setEditando(null);
        setForm(emptyForm);
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (r) => {
        setEditando(r.id);
        setForm({
            ...emptyForm,
            clienteId:      r.cliente?.id      || "",
            remitenteId:    r.remitente?.id    || "",
            destinatarioId: r.destinatario?.id || "",
            distanciaKm:    r.distanciaKm      || "",
            tiempoEstimado: r.tiempoEstimado   || "",
            tarifa:         r.tarifa           || "",
            notas:          r.notas            || "",
            status:         r.status           || "Activa",
        });
        setFormError("");
        setShowModal(true);
    };

    const validar = () => {
        if (!form.remitenteId)    return "Selecciona un remitente (origen).";
        if (!form.destinatarioId) return "Selecciona un destinatario (destino).";
        if (form.remitenteId === form.destinatarioId) return "El origen y destino no pueden ser el mismo.";
        return null;
    };

    const handleSubmit = async () => {
        const error = validar();
        if (error) { setFormError(error); return; }
        setFormError("");
        setLoading(true);
        try {
            const body = {
                clienteId:      form.clienteId      ? Number(form.clienteId)      : null,
                remitenteId:    form.remitenteId    ? Number(form.remitenteId)    : null,
                destinatarioId: form.destinatarioId ? Number(form.destinatarioId) : null,
                distanciaKm:    form.distanciaKm    ? Number(form.distanciaKm)    : null,
                tiempoEstimado: form.tiempoEstimado || null,
                tarifa:         form.tarifa         ? Number(form.tarifa)         : null,
                notas:          form.notas          || null,
                status:         form.status         || "Activa",
            };
            const url    = editando ? `${API}/rutas/${editando}` : `${API}/rutas`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(body) });
            setShowModal(false);
            fetchAll();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("驴Eliminar esta ruta?")) return;
        try { await fetch(`${API}/rutas/${id}`, { method: "DELETE", headers }); fetchAll(); }
        catch (e) { console.error(e); }
    };

    // Remitente y destinatario seleccionados en el form para mostrar preview
    const remitenteSeleccionado    = remitentes.find(r => String(r.id) === String(form.remitenteId));
    const destinatarioSeleccionado = destinatarios.find(d => String(d.id) === String(form.destinatarioId));

    const rutasFiltradas = rutas.filter(r => {
        if (!busqueda) return true;
        const origen  = r.remitente?.ciudad  || r.remitente?.nombre  || "";
        const destino = r.destinatario?.ciudad || r.destinatario?.nombre || "";
        const cliente = r.cliente?.name || "";
        const q = busqueda.toLowerCase();
        return origen.toLowerCase().includes(q) || destino.toLowerCase().includes(q) || cliente.toLowerCase().includes(q);
    });

    const activas = rutas.filter(r => r.status === "Activa").length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">RUTAS</h1>
                        <p className="text-gray-400 mt-3 text-lg">Rutas de transporte con origen, destino y tarifa</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Ruta
                    </motion.button>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    {[
                        { label: "Total rutas",  value: rutas.length, color: "text-cyan-400",  border: "border-cyan-500/20" },
                        { label: "Activas",      value: activas,      color: "text-green-400", border: "border-green-500/20" },
                        { label: "Remitentes",   value: remitentes.length, color: "text-purple-400", border: "border-purple-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <FaRoute className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-3xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative mb-6">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por origen, destino o cliente..."
                        className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-11 pr-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                {/* Tabla */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaRoute /> Rutas Registradas</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["#", "Ruta (Origen 鈫?Destino)", "Cliente", "Distancia", "Tiempo", "Tarifa", "Status", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {rutasFiltradas.length === 0 && (
                                    <tr><td colSpan={8} className="py-10 text-center text-gray-500">No hay rutas registradas</td></tr>
                                )}
                                {rutasFiltradas.map((r, i) => (
                                    <motion.tr key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300">#{r.id}</td>
                                        <td className="py-4 pr-4"><RutaTag ruta={r} /></td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm">{r.cliente?.name || "鈥?}</td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm">{r.distanciaKm ? `${r.distanciaKm} km` : "鈥?}</td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm">{r.tiempoEstimado || "鈥?}</td>
                                        <td className="py-4 pr-4 text-green-300 font-bold">{r.tarifa ? `$${r.tarifa.toLocaleString()}` : "鈥?}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                                r.status === "Activa"
                                                    ? "text-green-300 bg-green-500/10 border-green-400/30"
                                                    : "text-gray-400 bg-gray-500/10 border-gray-400/30"}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(r)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all" title="Editar"><FaEdit /></button>
                                                <button onClick={() => handleDelete(r.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all" title="Eliminar"><FaTrash /></button>
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
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">{editando ? "Editar Ruta" : "Nueva Ruta"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">

                                    {/* Preview de ruta */}
                                    {(remitenteSeleccionado || destinatarioSeleccionado) && (
                                        <div className="col-span-2 flex items-center justify-center gap-4 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-400/20">
                                            <div className="text-center">
                                                <p className="text-gray-500 text-xs mb-1">ORIGEN</p>
                                                <p className="text-cyan-300 font-black text-lg">
                                                    {remitenteSeleccionado?.ciudad || remitenteSeleccionado?.nombre || "鈥?}
                                                </p>
                                                <p className="text-gray-500 text-xs">{remitenteSeleccionado?.nombre}</p>
                                            </div>
                                            <FaArrowRight className="text-gray-500 text-2xl flex-shrink-0" />
                                            <div className="text-center">
                                                <p className="text-gray-500 text-xs mb-1">DESTINO</p>
                                                <p className="text-purple-300 font-black text-lg">
                                                    {destinatarioSeleccionado?.ciudad || destinatarioSeleccionado?.nombre || "鈥?}
                                                </p>
                                                <p className="text-gray-500 text-xs">{destinatarioSeleccionado?.nombre}</p>
                                            </div>
                                        </div>
                                    )}

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Origen y destino</p>

                                    <Field label="Remitente (Origen) *">
                                        <select value={form.remitenteId} onChange={set("remitenteId")} className={selectCls}>
                                            <option value="">Seleccionar remitente...</option>
                                            {remitentes.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.nombre} {r.ciudad ? `鈥?${r.ciudad}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Destinatario (Destino) *">
                                        <select value={form.destinatarioId} onChange={set("destinatarioId")} className={selectCls}>
                                            <option value="">Seleccionar destinatario...</option>
                                            {destinatarios.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.nombre} {d.ciudad ? `鈥?${d.ciudad}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Cliente (opcional)" span2>
                                        <select value={form.clienteId} onChange={set("clienteId")} className={selectCls}>
                                            <option value="">Sin cliente espec铆fico</option>
                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Detalles de la ruta</p>

                                    <Field label="Distancia (km)">
                                        <input type="number" value={form.distanciaKm} onChange={set("distanciaKm")} placeholder="850" className={inputCls} />
                                    </Field>
                                    <Field label="Tiempo estimado">
                                        <input type="text" value={form.tiempoEstimado} onChange={set("tiempoEstimado")} placeholder="8 horas / 2 d铆as" className={inputCls} />
                                    </Field>
                                    <Field label="Tarifa ($)">
                                        <input type="number" value={form.tarifa} onChange={set("tarifa")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option value="Activa">Activa</option>
                                            <option value="Inactiva">Inactiva</option>
                                        </select>
                                    </Field>
                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={2} placeholder="Observaciones, casetas, restricciones..." className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            </div>

                            {formError && (
                                <div className="px-8 pb-2 flex-shrink-0">
                                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-semibold">
                                        <FaTimes className="flex-shrink-0" /> {formError}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar Ruta" : "Guardar Ruta"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

