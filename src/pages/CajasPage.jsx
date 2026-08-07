import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaPlus, FaBox, FaTimes, FaCheck, FaUndo, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:8081";

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const emptyForm = {
    tipoMovimiento: "SALIDA", tipoCajaId: "", clienteId: "", orderId: "",
    driverId: "", cantidad: "", fecha: new Date().toISOString().slice(0, 10),
    fechaCompromisoDevolucion: "", status: "PENDIENTE", notas: ""
};

function diasEnCliente(fecha) {
    if (!fecha) return 0;
    const hoy  = new Date();
    const base = new Date(fecha);
    return Math.floor((hoy - base) / (1000 * 60 * 60 * 24));
}

function colorDias(dias) {
    if (dias <= 10) return { bg: "bg-green-500/10",  border: "border-green-400/30",  text: "text-green-300",  label: "Al día" };
    if (dias <= 15) return { bg: "bg-yellow-500/10", border: "border-yellow-400/30", text: "text-yellow-300", label: "Atención" };
    if (dias <= 20) return { bg: "bg-orange-500/10", border: "border-orange-400/30", text: "text-orange-300", label: "Urgente" };
    return           { bg: "bg-red-500/10",    border: "border-red-400/30",    text: "text-red-300",    label: "Crítico" };
}

export default function CajasPage() {
    const [movimientos, setMovimientos] = useState([]);
    const [resumen,     setResumen]     = useState({});
    const [tiposCaja,   setTiposCaja]   = useState([]);
    const [clientes,    setClientes]    = useState([]);
    const [orders,      setOrders]      = useState([]);
    const [drivers,     setDrivers]     = useState([]);
    const [showModal,   setShowModal]   = useState(false);
    const [showTipos,   setShowTipos]   = useState(false);
    const [form,        setForm]        = useState(emptyForm);
    const [formTipo,    setFormTipo]    = useState({ nombre: "", descripcion: "", valorUnitario: "", status: "Activo" });
    const [loading,     setLoading]     = useState(false);
    const [tab,         setTab]         = useState("dashboard"); // dashboard | movimientos | clientes
    const [busqueda,    setBusqueda]    = useState("");

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchJson = async (url) => {
        const r = await fetch(url, { headers });
        if (!r.ok) return [];
        try { return await r.json(); } catch { return []; }
    };

    const fetchAll = async () => {
        try {
            const [m, r, t, c, o, d] = await Promise.all([
                fetchJson(`${API}/api/movimientos-caja`),
                fetch(`${API}/api/movimientos-caja/resumen`, { headers }).then(r => r.json()).catch(() => ({})),
                fetchJson(`${API}/api/tipos-caja`),
                fetchJson(`${API}/clients`),
                fetchJson(`${API}/orders`),
                fetchJson(`${API}/drivers`),
            ]);
            setMovimientos(Array.isArray(m) ? m : []);
            setResumen(r || {});
            setTiposCaja(Array.isArray(t) ? t : []);
            setClientes(Array.isArray(c) ? c : []);
            setOrders(Array.isArray(o) ? o : []);
            setDrivers(Array.isArray(d) ? d : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await fetch(`${API}/api/movimientos-caja`, {
                method: "POST", headers, body: JSON.stringify(form)
            });
            setShowModal(false);
            setForm(emptyForm);
            fetchAll();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDevolver = async (id) => {
        await fetch(`${API}/api/movimientos-caja/${id}/devolver`, { method: "PUT", headers });
        fetchAll();
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar movimiento?")) return;
        await fetch(`${API}/api/movimientos-caja/${id}`, { method: "DELETE", headers });
        fetchAll();
    };

    const saveTipo = async () => {
        await fetch(`${API}/api/tipos-caja`, {
            method: "POST", headers, body: JSON.stringify(formTipo)
        });
        setFormTipo({ nombre: "", descripcion: "", valorUnitario: "", status: "Activo" });
        fetchAll();
    };

    const deleteTipo = async (id) => {
        await fetch(`${API}/api/tipos-caja/${id}`, { method: "DELETE", headers });
        fetchAll();
    };

    // Agrupar pendientes por cliente
    const pendientesPorCliente = movimientos
        .filter(m => m.tipoMovimiento === "SALIDA" && m.status === "PENDIENTE")
        .reduce((acc, m) => {
            const key = m.cliente?.name || "Sin cliente";
            if (!acc[key]) acc[key] = { movimientos: [], total: 0, fechaMasAntigua: m.fecha };
            acc[key].movimientos.push(m);
            acc[key].total += m.cantidad || 0;
            if (m.fecha < acc[key].fechaMasAntigua) acc[key].fechaMasAntigua = m.fecha;
            return acc;
        }, {});

    const filtrados = movimientos.filter(m =>
        m.cliente?.name?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.tipoCaja?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.tipoMovimiento?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalEnClientes = movimientos
        .filter(m => m.tipoMovimiento === "SALIDA" && m.status === "PENDIENTE")
        .reduce((acc, m) => acc + (m.cantidad || 0), 0);

    const valorRetenido = movimientos
        .filter(m => m.tipoMovimiento === "SALIDA" && m.status === "PENDIENTE")
        .reduce((acc, m) => acc + ((m.cantidad || 0) * (m.tipoCaja?.valorUnitario || 0)), 0);

    const criticas = movimientos.filter(m =>
        m.tipoMovimiento === "SALIDA" && m.status === "PENDIENTE" && diasEnCliente(m.fecha) > 20
    ).length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CAJAS</h1>
                        <p className="text-gray-400 mt-2">Control de cajas retornables</p>
                    </div>
                    <div className="flex gap-3">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setShowTipos(true)}
                            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-bold hover:bg-white/10 transition-all">
                            Tipos de Caja
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                            <FaPlus /> Nuevo Movimiento
                        </motion.button>
                    </div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-5 mb-8">
                    {[
                        { label: "En Clientes",    value: totalEnClientes, color: "text-cyan-400",   border: "border-cyan-500/20" },
                        { label: "Valor Retenido", value: `$${valorRetenido.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`, color: "text-yellow-400", border: "border-yellow-500/20" },
                        { label: "Alertas Críticas", value: criticas,      color: "text-red-400",    border: "border-red-500/20" },
                        { label: "Movimientos",    value: movimientos.length, color: "text-green-400", border: "border-green-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} p-6 flex items-center gap-4`}>
                            <FaBox className={`text-3xl ${s.color}`} />
                            <div>
                                <p className="text-gray-400 text-sm">{s.label}</p>
                                <h2 className={`text-3xl font-black ${s.color}`}>{s.value}</h2>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-3 mb-6">
                    {[
                        { key: "dashboard",    label: "Por Cliente" },
                        { key: "movimientos",  label: "Movimientos" },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${tab === t.key
                                ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300"
                                : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Por Cliente */}
                {tab === "dashboard" && (
                    <div className="space-y-4">
                        {Object.keys(pendientesPorCliente).length === 0 && (
                            <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-12 text-center text-gray-500">
                                No hay cajas pendientes en clientes 🎉
                            </div>
                        )}
                        {Object.entries(pendientesPorCliente).map(([cliente, data], i) => {
                            const dias  = diasEnCliente(data.fechaMasAntigua);
                            const color = colorDias(dias);
                            const valor = data.movimientos.reduce((acc, m) =>
                                acc + ((m.cantidad || 0) * (m.tipoCaja?.valorUnitario || 0)), 0);
                            return (
                                <motion.div key={cliente} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`rounded-3xl ${color.bg} border ${color.border} p-6`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-white">{cliente}</h3>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Desde: {data.fechaMasAntigua} — <span className={color.text}>{dias} días en cliente</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-4 py-2 rounded-full border text-xs font-black ${color.bg} ${color.border} ${color.text}`}>
                                                {color.label} — {dias} días
                                            </span>
                                            <p className="text-yellow-300 font-bold mt-2 text-sm">
                                                Valor retenido: ${valor.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-gray-400 border-b border-white/10">
                                                    {["Tipo", "Cantidad", "Fecha Salida", "Compromiso", "Operador", "Viaje", "Acción"]
                                                        .map(h => <th key={h} className="pb-2 pr-4 text-left font-medium">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.movimientos.map(m => (
                                                    <tr key={m.id} className="border-b border-white/5">
                                                        <td className="py-2 pr-4 text-white">{m.tipoCaja?.nombre || "—"}</td>
                                                        <td className="py-2 pr-4 font-bold text-cyan-300">{m.cantidad}</td>
                                                        <td className="py-2 pr-4 text-gray-400">{m.fecha}</td>
                                                        <td className="py-2 pr-4 text-gray-400">{m.fechaCompromisoDevolucion || "—"}</td>
                                                        <td className="py-2 pr-4 text-gray-400">{m.driver ? `${m.driver.name} ${m.driver.apellidos || ""}` : "—"}</td>
                                                        <td className="py-2 pr-4 text-gray-400">{m.order ? `#${m.order.id}` : "—"}</td>
                                                        <td className="py-2">
                                                            <button onClick={() => handleDevolver(m.id)}
                                                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/10 border border-green-400/20 text-green-300 text-xs font-bold hover:bg-green-500/20 transition-all">
                                                                <FaUndo /> Devuelta
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Tab: Movimientos */}
                {tab === "movimientos" && (
                    <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                        <div className="mb-5">
                            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar por cliente, tipo o movimiento..."
                                className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm" />
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Tipo", "Caja", "Cliente", "Cantidad", "Fecha", "Compromiso", "Operador", "Status", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay movimientos</td></tr>
                                )}
                                {filtrados.map((m, i) => {
                                    const dias  = diasEnCliente(m.fecha);
                                    const color = colorDias(dias);
                                    return (
                                        <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-3 pr-4">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                                    m.tipoMovimiento === "SALIDA"  ? "text-red-300 bg-red-500/10 border-red-400/30" :
                                                    m.tipoMovimiento === "ENTRADA" ? "text-green-300 bg-green-500/10 border-green-400/30" :
                                                    "text-yellow-300 bg-yellow-500/10 border-yellow-400/30"}`}>
                                                    {m.tipoMovimiento}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-white">{m.tipoCaja?.nombre || "—"}</td>
                                            <td className="py-3 pr-4 text-gray-300">{m.cliente?.name || "—"}</td>
                                            <td className="py-3 pr-4 font-bold text-cyan-300">{m.cantidad}</td>
                                            <td className="py-3 pr-4 text-gray-400">{m.fecha}</td>
                                            <td className="py-3 pr-4 text-gray-400">{m.fechaCompromisoDevolucion || "—"}</td>
                                            <td className="py-3 pr-4 text-gray-400">
                                                {m.driver ? `${m.driver.name} ${m.driver.apellidos || ""}` : "—"}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                                    m.status === "DEVUELTA" ? "text-green-300 bg-green-500/10 border-green-400/30" :
                                                    m.status === "PERDIDA"  ? "text-red-300 bg-red-500/10 border-red-400/30" :
                                                    `${color.text} ${color.bg} ${color.border}`}`}>
                                                    {m.status === "PENDIENTE" ? `${dias}d — ${color.label}` : m.status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex gap-2">
                                                    {m.status === "PENDIENTE" && (
                                                        <button onClick={() => handleDevolver(m.id)}
                                                            className="p-2 rounded-xl bg-green-500/10 border border-green-400/20 text-green-400 hover:bg-green-500/20 transition-all">
                                                            <FaUndo />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(m.id)}
                                                        className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Nuevo Movimiento */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">Nuevo Movimiento de Cajas</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Tipo de Movimiento</label>
                                        <select value={form.tipoMovimiento} onChange={setF("tipoMovimiento")} className={selectCls}>
                                            <option value="SALIDA">SALIDA — Entrega a cliente</option>
                                            <option value="ENTRADA">ENTRADA — Devolución de cliente</option>
                                            <option value="TRASPASO">TRASPASO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Tipo de Caja</label>
                                        <select value={form.tipoCajaId} onChange={setF("tipoCajaId")} className={selectCls}>
                                            <option value="">Seleccionar...</option>
                                            {tiposCaja.map(t => <option key={t.id} value={t.id}>{t.nombre} — ${t.valorUnitario}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cliente</label>
                                        <select value={form.clienteId} onChange={setF("clienteId")} className={selectCls}>
                                            <option value="">Seleccionar...</option>
                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cantidad</label>
                                        <input type="number" value={form.cantidad} onChange={setF("cantidad")} className={inputCls} placeholder="100" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Fecha</label>
                                        <input type="date" value={form.fecha} onChange={setF("fecha")} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Fecha Compromiso Devolución</label>
                                        <input type="date" value={form.fechaCompromisoDevolucion} onChange={setF("fechaCompromisoDevolucion")} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Viaje (Order) — Opcional</label>
                                        <select value={form.orderId} onChange={setF("orderId")} className={selectCls}>
                                            <option value="">Sin viaje</option>
                                            {orders.map(o => <option key={o.id} value={o.id}>#{o.id} — {o.cliente?.name || ""}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Operador — Opcional</label>
                                        <select value={form.driverId} onChange={setF("driverId")} className={selectCls}>
                                            <option value="">Sin operador</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-gray-400 text-xs mb-1 block">Notas</label>
                                        <textarea value={form.notas} onChange={setF("notas")} rows={2}
                                            className={inputCls + " resize-none"} placeholder="Observaciones..." />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">
                                    Cancelar
                                </button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : "Registrar Movimiento"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Tipos de Caja */}
            <AnimatePresence>
                {showTipos && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">Tipos de Caja</h2>
                                <button onClick={() => setShowTipos(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                {/* Formulario nuevo tipo */}
                                <div className="bg-white/5 border border-cyan-400/10 rounded-2xl p-5 mb-5">
                                    <p className="text-cyan-400 font-bold text-sm mb-3">Agregar tipo</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-gray-400 text-xs mb-1 block">Nombre</label>
                                            <input value={formTipo.nombre}
                                                onChange={e => setFormTipo(p => ({ ...p, nombre: e.target.value }))}
                                                className={inputCls} placeholder="Caja plástica" />
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-xs mb-1 block">Valor unitario ($)</label>
                                            <input type="number" value={formTipo.valorUnitario}
                                                onChange={e => setFormTipo(p => ({ ...p, valorUnitario: e.target.value }))}
                                                className={inputCls} placeholder="120" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-gray-400 text-xs mb-1 block">Descripción</label>
                                            <input value={formTipo.descripcion}
                                                onChange={e => setFormTipo(p => ({ ...p, descripcion: e.target.value }))}
                                                className={inputCls} placeholder="Descripción opcional" />
                                        </div>
                                    </div>
                                    <button onClick={saveTipo}
                                        className="mt-3 w-full py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                        + Agregar
                                    </button>
                                </div>
                                {/* Lista tipos */}
                                {tiposCaja.map(t => (
                                    <div key={t.id} className="flex justify-between items-center py-3 border-b border-white/5">
                                        <div>
                                            <p className="text-white font-bold">{t.nombre}</p>
                                            <p className="text-gray-400 text-xs">{t.descripcion} — ${t.valorUnitario} c/u</p>
                                        </div>
                                        <button onClick={() => deleteTipo(t.id)}
                                            className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all">
                                            <FaTrash />
                                        </button>
                                    </div>
                                ))}
                                {tiposCaja.length === 0 && (
                                    <p className="text-gray-500 text-center py-4">No hay tipos registrados</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}