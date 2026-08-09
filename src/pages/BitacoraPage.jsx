import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaHistory, FaSearch, FaFilter } from "react-icons/fa";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const MODULOS = ["TODOS", "VIAJE", "CARTA_PORTE", "LIQUIDACION", "FACTURA", "CAJA"];

const accionColor = (a) => {
    if (a === "CREADO")          return "text-green-300 bg-green-500/10 border-green-400/30";
    if (a === "ACTUALIZADO")     return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
    if (a === "STATUS_CAMBIADO") return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
    if (a === "ELIMINADO")       return "text-red-300 bg-red-500/10 border-red-400/30";
    if (a === "PDF_GENERADO")    return "text-purple-300 bg-purple-500/10 border-purple-400/30";
    return "text-gray-300 bg-gray-500/10 border-gray-400/30";
};

const moduloColor = (m) => {
    if (m === "VIAJE")       return "text-cyan-400";
    if (m === "FACTURA")     return "text-yellow-400";
    if (m === "LIQUIDACION") return "text-green-400";
    if (m === "CARTA_PORTE") return "text-orange-400";
    if (m === "CAJA")        return "text-purple-400";
    return "text-gray-400";
};

export default function BitacoraPage() {
    const [eventos,     setEventos]     = useState([]);
    const [filtroMod,   setFiltroMod]   = useState("TODOS");
    const [busqueda,    setBusqueda]    = useState("");
    const [buscarFolio, setBuscarFolio] = useState("");
    const [loading,     setLoading]     = useState(false);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchJson = async (url) => {
        const r = await fetch(url, { headers });
        if (!r.ok) return [];
        try { return await r.json(); } catch { return []; }
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const data = filtroMod === "TODOS"
                ? await fetchJson(`${API}/api/bitacora`)
                : await fetchJson(`${API}/api/bitacora/modulo/${filtroMod}`);
            setEventos(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const buscarPorFolio = async () => {
        if (!buscarFolio.trim()) return fetchAll();
        setLoading(true);
        try {
            const data = await fetchJson(`${API}/api/bitacora/folio/${buscarFolio.trim()}`);
            setEventos(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [filtroMod]);

    const filtrados = eventos.filter(e =>
        !busqueda ||
        e.folioReferencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.accion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.usuario?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-8 overflow-auto">
                <Topbar />

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-8">
                    <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">
                        BIT脕CORA
                    </h1>
                    <p className="text-gray-400 mt-2">Historial completo de eventos -qui茅n hizo qu茅 y cu谩ndo</p>
                </motion.div>

                {/* Stats r谩pidos */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label: "Total eventos", value: eventos.length, color: "text-white" },
                        { label: "Creados",        value: eventos.filter(e => e.accion === "CREADO").length,          color: "text-green-400" },
                        { label: "Actualizados",   value: eventos.filter(e => e.accion === "ACTUALIZADO").length,     color: "text-cyan-400" },
                        { label: "Status cambios", value: eventos.filter(e => e.accion === "STATUS_CAMBIADO").length, color: "text-yellow-400" },
                        { label: "Eliminados",     value: eventos.filter(e => e.accion === "ELIMINADO").length,       color: "text-red-400" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-2xl bg-white/5 border border-cyan-400/10 p-4">
                            <p className="text-gray-400 text-xs">{s.label}</p>
                            <h2 className={`text-2xl font-black ${s.color}`}>{s.value}</h2>
                        </motion.div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {/* Filtro por m贸dulo */}
                    <div className="flex gap-2 flex-wrap">
                        {MODULOS.map(m => (
                            <button key={m} onClick={() => setFiltroMod(m)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    filtroMod === m
                                        ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                }`}>
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* Buscar por texto */}
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar en eventos..."
                            className="bg-white/5 border border-cyan-400/10 rounded-xl pl-9 pr-4 py-2 text-white outline-none focus:border-cyan-400/40 transition-all text-sm w-56" />
                    </div>

                    {/* Buscar por folio espec铆fico */}
                    <div className="flex gap-2">
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input value={buscarFolio} onChange={e => setBuscarFolio(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && buscarPorFolio()}
                                placeholder="Buscar folio exacto..."
                                className="bg-white/5 border border-cyan-400/10 rounded-xl pl-9 pr-4 py-2 text-white outline-none focus:border-cyan-400/40 transition-all text-sm w-48" />
                        </div>
                        <button onClick={buscarPorFolio}
                            className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-sm font-bold hover:bg-cyan-500/20 transition-all">
                            Buscar
                        </button>
                        {buscarFolio && (
                            <button onClick={() => { setBuscarFolio(""); fetchAll(); }}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-bold hover:bg-white/10 transition-all">
                                
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabla de eventos */}
                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                    {loading ? (
                        <div className="py-12 text-center text-gray-500">Cargando...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-400 border-b border-cyan-400/10">
                                        {["Fecha", "Hora", "M贸dulo", "Folio", "Acci贸n", "Status Anterior", "Status Nuevo", "Usuario", "Descripci贸n"]
                                            .map(h => <th key={h} className="pb-3 pr-4 font-medium">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="py-12 text-center text-gray-500">
                                                No hay eventos registrados
                                            </td>
                                        </tr>
                                    )}
                                    {filtrados.map((e, i) => (
                                        <motion.tr key={e.id}
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{e.fecha}</td>
                                            <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{e.hora}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`font-bold text-xs ${moduloColor(e.modulo)}`}>
                                                    {e.modulo}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className="font-black text-cyan-300 text-xs">{e.folioReferencia || "-"}</span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${accionColor(e.accion)}`}>
                                                    {e.accion}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500 text-xs">{e.statusAnterior || "-"}</td>
                                            <td className="py-3 pr-4 text-gray-300 text-xs">{e.statusNuevo || "-"}</td>
                                            <td className="py-3 pr-4 text-white text-xs font-bold">{e.usuario || "-"}</td>
                                            <td className="py-3 pr-4 text-gray-400 text-xs max-w-xs truncate">{e.descripcion || "-"}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}








