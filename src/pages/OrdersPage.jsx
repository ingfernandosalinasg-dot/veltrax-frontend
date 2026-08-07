import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
    FaClipboardList, FaSearch, FaCheckCircle, FaTruckMoving,
    FaClock, FaMapMarkerAlt, FaUserTie, FaTruck, FaPlus, FaTrash, FaTimes
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:8081";

const estadoColor = {
    "Pendiente":   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "En Tránsito": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Entregado":   "bg-green-500/20 text-green-400 border-green-500/30",
    "Cancelado":   "bg-red-500/20 text-red-400 border-red-500/30",
};

const empty = { client: "", vehicle: "", driver: "", origin: "", destination: "", date: "", cost: "", status: "Pendiente" };

function OrdersPage() {
    const [orders, setOrders]       = useState([]);
    const [search, setSearch]       = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm]           = useState(empty);
    const [loading, setLoading]     = useState(false);
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };

    const fetchOrders = async () => {
        try {
            const res  = await fetch(`${API}/pedidos`, { headers });
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Error cargando órdenes:", e);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await fetch(`${API}/pedidos`, {
                method: "POST",
                headers,
                body: JSON.stringify({ ...form, cost: Number(form.cost) }),
            });
            setShowModal(false);
            setForm(empty);
            fetchOrders();
        } catch (e) {
            console.error("Error creando orden:", e);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar esta orden?")) return;
        try {
            await fetch(`${API}/pedidos/${id}`, { method: "DELETE", headers });
            fetchOrders();
        } catch (e) {
            console.error("Error eliminando:", e);
        }
    };

    const filtered = orders.filter(o =>
        o.client?.toLowerCase().includes(search.toLowerCase()) ||
        o.origin?.toLowerCase().includes(search.toLowerCase()) ||
        o.destination?.toLowerCase().includes(search.toLowerCase()) ||
        String(o.id).includes(search)
    );

    const pendientes = orders.filter(o => o.status === "Pendiente").length;
    const enRuta     = orders.filter(o => o.status === "En Tránsito").length;
    const entregadas = orders.filter(o => o.status === "Entregado").length;

    return (
        <div className="flex bg-[#020617] min-h-screen text-white overflow-hidden">
            <Sidebar />

            <div className="flex-1 p-10 overflow-auto relative">
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: "40px 40px"
                    }}
                />

                <Topbar />

                {/* HEADER */}
                <motion.div initial={{ opacity:0, y:-30 }} animate={{ opacity:1, y:0 }}
                    className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">
                            ÓRDENES
                        </h1>
                        <p className="text-gray-400 mt-4 text-xl">Gestión avanzada de viajes y entregas</p>
                    </div>
                    <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Orden
                    </motion.button>
                </motion.div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label:"Total Órdenes", value: orders.length, icon:<FaClipboardList />, border:"border-cyan-500/20",   text:"text-cyan-400" },
                        { label:"Pendientes",    value: pendientes,    icon:<FaClock />,         border:"border-yellow-500/20", text:"text-yellow-400" },
                        { label:"En Ruta",       value: enRuta,        icon:<FaTruckMoving />,   border:"border-blue-500/20",   text:"text-blue-400" },
                        { label:"Entregadas",    value: entregadas,    icon:<FaCheckCircle />,   border:"border-green-500/20",  text:"text-green-400" },
                    ].map((kpi, i) => (
                        <motion.div key={i} initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }}
                            className={`bg-white/5 border ${kpi.border} rounded-3xl p-6`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`${kpi.text} text-2xl`}>{kpi.icon}</div>
                                <h2 className="text-xl font-bold">{kpi.label}</h2>
                            </div>
                            <p className={`text-5xl font-bold ${kpi.text}`}>{kpi.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* SEARCH */}
                <div className="flex items-center gap-3 bg-white/5 border border-cyan-500/20 rounded-2xl px-5 py-4 mb-8">
                    <FaSearch className="text-cyan-400" />
                    <input type="text" placeholder="Buscar por cliente, origen o destino..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="bg-transparent outline-none w-full text-white placeholder-gray-500" />
                </div>

                {/* TABLA */}
                <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                    className="bg-white/5 border border-cyan-500/20 rounded-3xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-cyan-500/10 text-cyan-300">
                            <tr>
                                <th className="p-5 text-left">ID</th>
                                <th className="p-5 text-left">Cliente</th>
                                <th className="p-5 text-left">Ruta</th>
                                <th className="p-5 text-left">Conductor</th>
                                <th className="p-5 text-left">Vehículo</th>
                                <th className="p-5 text-left">Fecha</th>
                                <th className="p-5 text-left">Costo</th>
                                <th className="p-5 text-left">Estado</th>
                                <th className="p-5 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-10 text-center text-gray-500">
                                        No hay órdenes registradas
                                    </td>
                                </tr>
                            )}
                            {filtered.map((o, i) => (
                                <motion.tr key={o.id}
                                    initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.05 }}
                                    className="border-t border-white/5 hover:bg-white/5 transition">
                                    <td className="p-5 font-bold text-cyan-300">#{o.id}</td>
                                    <td className="p-5">{o.client}</td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <FaMapMarkerAlt className="text-cyan-400" />
                                            {o.origin} → {o.destination}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <FaUserTie className="text-yellow-400" />
                                            {o.driver}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-2">
                                            <FaTruck className="text-blue-400" />
                                            {o.vehicle}
                                        </div>
                                    </td>
                                    <td className="p-5 text-gray-400">{o.date}</td>
                                    <td className="p-5 text-green-300">${o.cost}</td>
                                    <td className="p-5">
                                        <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${estadoColor[o.status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <button onClick={() => handleDelete(o.id)}
                                            className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all">
                                            <FaTrash />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            </div>

            {/* MODAL */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-black text-cyan-300">Nueva Orden</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                {[
                                    { label:"Cliente",   key:"client" },
                                    { label:"Vehículo",  key:"vehicle" },
                                    { label:"Conductor", key:"driver" },
                                    { label:"Origen",    key:"origin" },
                                    { label:"Destino",   key:"destination" },
                                    { label:"Fecha",     key:"date", type:"date" },
                                    { label:"Costo",     key:"cost", type:"number" },
                                ].map(f => (
                                    <div key={f.key} className={f.key === "client" ? "col-span-2" : ""}>
                                        <label className="text-gray-400 text-sm mb-2 block">{f.label}</label>
                                        <input type={f.type || "text"} value={form[f.key]}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            className="w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Estado</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none">
                                        <option>Pendiente</option>
                                        <option>En Tránsito</option>
                                        <option>Entregado</option>
                                        <option>Cancelado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">
                                    Cancelar
                                </button>
                                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                                    onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                    {loading ? "Guardando..." : "Guardar Orden"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default OrdersPage;