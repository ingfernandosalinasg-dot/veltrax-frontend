import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaWrench, FaTruck, FaExclamationTriangle, FaTools, FaCheckCircle,
         FaMoneyBillWave, FaHistory, FaClock, FaTachometerAlt } from "react-icons/fa";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const statusColor = (s) => {
    if (s === "PENDIENTE")  return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
    if (s === "EN_PROCESO") return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
    if (s === "COMPLETADA") return "text-green-300 bg-green-500/10 border-green-400/30";
    if (s === "CONVERTIDO") return "text-purple-300 bg-purple-500/10 border-purple-400/30";
    return "text-gray-300 bg-white/5 border-white/10";
};

export default function MantenimientosPage() {
    const [vehicles,   setVehicles]   = useState([]);
    const [vehicleSel, setVehicleSel] = useState("");
    const [reportes,   setReportes]   = useState([]);
    const [ordenes,    setOrdenes]    = useState([]);
    const [loading,    setLoading]    = useState(false);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    useEffect(() => {
        fetch(`${API}/vehicles`, { headers }).then(r => r.json()).then(v => setVehicles(Array.isArray(v) ? v : [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!vehicleSel) { setReportes([]); setOrdenes([]); return; }
        setLoading(true);
        Promise.all([
            fetch(`${API}/api/mantenimiento/reportes-falla/vehicle/${vehicleSel}`, { headers }).then(r => r.json()),
            fetch(`${API}/api/mantenimiento/ordenes-servicio/vehicle/${vehicleSel}`, { headers }).then(r => r.json()),
        ]).then(([r, o]) => {
            setReportes(Array.isArray(r) ? r : []);
            setOrdenes(Array.isArray(o) ? o : []);
        }).catch(() => {}).finally(() => setLoading(false));
    }, [vehicleSel]);

    // Combina reportes + 贸rdenes en una sola l铆nea de tiempo, ordenada por fecha
    const timeline = [
        ...reportes.map(r => ({ ...r, _tipo: "REPORTE", _fecha: r.fecha })),
        ...ordenes.map(o => ({ ...o, _tipo: "ORDEN", _fecha: o.fechaSalidaReal || o.fechaEntrada })),
    ].sort((a, b) => (b._fecha || "").localeCompare(a._fecha || ""));

    const totalGastadoUnidad = ordenes.filter(o => o.status === "COMPLETADA").reduce((s, o) => s + (o.costoFinal || 0), 0);
    const pendientesUnidad   = reportes.filter(r => r.status === "PENDIENTE").length + ordenes.filter(o => o.status !== "COMPLETADA").length;

    const vehicleActual = vehicles.find(v => String(v.id) === String(vehicleSel));

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">MANTENIMIENTOS</h1>
                    <p className="text-gray-400 mt-2">Historial y seguimiento completo por unidad</p>
                </motion.div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 mb-8">
                    <label className="text-gray-400 text-sm mb-2 block">Selecciona una unidad para ver su historial</label>
                    <select value={vehicleSel} onChange={e => setVehicleSel(e.target.value)}
                        className="w-full md:w-96 bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all">
                        <option value="">Seleccionar unidad...</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} -{v.brand} {v.model}</option>)}
                    </select>
                </div>

                {!vehicleSel && (
                    <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-16 text-center text-gray-500">
                        <FaWrench className="text-5xl mx-auto mb-4 opacity-30" />
                        Selecciona una unidad arriba para ver su historial de mantenimiento
                    </div>
                )}

                {vehicleSel && (
                    <>
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                                <FaTruck className="text-4xl text-cyan-400" />
                                <div><p className="text-gray-400">Unidad</p><h2 className="text-2xl font-black">{vehicleActual?.plate || "-"}</h2></div>
                            </div>
                            <div className="rounded-3xl bg-white/5 border border-orange-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                                <FaTachometerAlt className="text-4xl text-orange-400" />
                                <div><p className="text-gray-400">Od贸metro</p><h2 className="text-2xl font-black">{(vehicleActual?.odometroKm || 0).toLocaleString()} km</h2></div>
                            </div>
                            <div className="rounded-3xl bg-white/5 border border-yellow-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                                <FaClock className="text-4xl text-yellow-400" />
                                <div><p className="text-gray-400">Pendientes / Activos</p><h2 className="text-2xl font-black">{pendientesUnidad}</h2></div>
                            </div>
                            <div className="rounded-3xl bg-white/5 border border-green-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                                <FaMoneyBillWave className="text-4xl text-green-400" />
                                <div><p className="text-gray-400">Total Invertido</p><h2 className="text-2xl font-black">${totalGastadoUnidad.toLocaleString()}</h2></div>
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                            <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaHistory /> Historial Completo</h2>
                            {loading ? (
                                <p className="text-center text-gray-500 py-10">Cargando...</p>
                            ) : timeline.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">Esta unidad no tiene reportes ni 贸rdenes de servicio registradas</p>
                            ) : (
                                <div className="relative pl-8">
                                    <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-cyan-400/20" />
                                    {timeline.map((item, i) => (
                                        <motion.div key={`${item._tipo}-${item.id}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }} className="relative mb-5 last:mb-0">
                                            <div className={`absolute -left-8 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                item._tipo === "REPORTE" ? "bg-yellow-500/20 border-yellow-400" : "bg-cyan-500/20 border-cyan-400"}`}>
                                                {item._tipo === "REPORTE" ? <FaExclamationTriangle size={8} className="text-yellow-300" /> : <FaTools size={8} className="text-cyan-300" />}
                                            </div>
                                            <div className="bg-white/5 border border-cyan-400/10 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-cyan-300 font-bold text-sm">{item.folio}</span>
                                                        <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${statusColor(item.status)}`}>{item.status}</span>
                                                        {item._tipo === "REPORTE" && <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 text-xs font-bold">Reporte de Falla</span>}
                                                        {item._tipo === "ORDEN"   && <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-bold">{item.tipo} -Orden</span>}
                                                    </div>
                                                    <span className="text-gray-500 text-xs">{item._fecha || "-"}</span>
                                                </div>
                                                <p className="text-gray-300 text-sm">{item.descripcion}</p>
                                                {item._tipo === "ORDEN" && (
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                        {item.taller && <span>Taller: {item.taller}</span>}
                                                        {item.status === "COMPLETADA"
                                                            ? <span className="text-green-300 font-bold">Costo: ${(item.costoFinal || 0).toLocaleString()}</span>
                                                            : <span>Est: ${(item.costoEstimado || 0).toLocaleString()}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}





