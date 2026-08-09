import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaClipboardCheck, FaMoneyBillWave, FaTruck, FaChartLine, FaTools } from "react-icons/fa";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

export default function ServiciosCompletadosPage() {
    const [ordenes, setOrdenes] = useState([]);
    const [resumen, setResumen] = useState(null);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [o, r] = await Promise.all([
                fetch(`${API}/api/mantenimiento/ordenes-servicio?status=COMPLETADA`, { headers }).then(r => r.json()),
                fetch(`${API}/api/mantenimiento/ordenes-servicio/resumen`, { headers }).then(r => r.json()),
            ]);
            setOrdenes(Array.isArray(o) ? o : []);
            setResumen(r);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">SERVICIOS COMPLETADOS</h1>
                    <p className="text-gray-400 mt-2">Historial y control de costos de mantenimiento</p>
                </motion.div>

                <div className="grid grid-cols-3 gap-6 mb-10">
                    {[
                        { label: "Total Gastado",        value: `$${(resumen?.totalGastado ?? 0).toLocaleString()}`,   icon: <FaMoneyBillWave />, color: "text-green-400" },
                        { label: "Promedio por Servicio", value: `$${(resumen?.promedioOrden ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <FaChartLine />, color: "text-cyan-400" },
                        { label: "Servicios Completados", value: resumen?.totalCompletadas ?? 0,                        icon: <FaClipboardCheck />, color: "text-purple-400" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                            <div className={`text-4xl ${s.color}`}>{s.icon}</div>
                            <div><p className="text-gray-400">{s.label}</p><h2 className="text-3xl font-black">{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaClipboardCheck /> Historial de Servicios</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio", "Unidad", "Tipo", "Taller", "Entrada", "Salida", "Refacciones", "Costo Final"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {ordenes.length === 0 && (
                                    <tr><td colSpan={8} className="py-10 text-center text-gray-500">Aún no hay servicios completados</td></tr>
                                )}
                                {ordenes.map((o, i) => (
                                    <motion.tr key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300 text-sm">{o.folio}</td>
                                        <td className="py-4 pr-4 text-sm flex items-center gap-2"><FaTruck className="text-gray-500" /> {o.vehiclePlaca || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm flex items-center gap-2"><FaTools className="text-gray-500" size={12} /> {o.tipo}</td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm">{o.taller || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">{o.fechaEntrada || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">{o.fechaSalidaReal || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm max-w-[160px] truncate">{o.refacciones || "-"}</td>
                                        <td className="py-4 pr-4 text-green-300 font-bold">${(o.costoFinal || 0).toLocaleString()}</td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}






