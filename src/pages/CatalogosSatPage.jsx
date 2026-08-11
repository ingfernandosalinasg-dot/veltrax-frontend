import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaSearch, FaDatabase, FaCheckCircle } from "react-icons/fa";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const TIPOS_LABEL = {
    "c_CveTransporte":        "Clave de Transporte",
    "c_FiguraTransporte":     "Figura Transporte",
    "c_ConfigAutotransporte": "Configuración Autotransporte",
    "c_TipoPermiso":          "Tipo de Permiso SCT",
    "c_TipoEmbalaje":         "Tipo de Embalaje",
    "c_ClaveUnidadPeso":      "Clave Unidad de Peso",
    "c_TipoEstacion":         "Tipo de Estación",
    "c_TipoDeServicio":       "Tipo de Servicio",
    "c_TipoCarro":            "Tipo de Carro",
    "c_Contenedor":           "Tipo de Contenedor",
    "c_MaterialPeligroso":    "Material Peligroso",
    "c_ClaveProdServCP":      "Clave Producto/Servicio (Carta Porte)",
    "c_Aduana":               "Aduana",
    "c_ClaveProdServ":        "Clave Producto/Servicio (General)",
    "c_ClaveUnidad":          "Clave de Unidad",
    "c_FormaPago":            "Forma de Pago",
    "c_Impuesto":             "Impuesto",
    "c_MetodoPago":           "Método de Pago",
    "c_Moneda":               "Moneda",
    "c_Pais":                 "País",
    "c_RegimenFiscal":        "Régimen Fiscal",
    "c_TipoDeComprobante":    "Tipo de Comprobante",
    "c_TipoFactor":           "Tipo de Factor",
    "c_TipoRelacion":         "Tipo de Relación",
    "c_UsoCFDI":              "Uso de CFDI",
};

export default function CatalogosSatPage() {
    const [tipos,      setTipos]      = useState([]);
    const [tipoActivo, setTipoActivo] = useState("c_CveTransporte");
    const [busqueda,   setBusqueda]   = useState("");
    const [resultados, setResultados] = useState([]);
    const [cargando,   setCargando]   = useState(false);

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    useEffect(() => {
        fetch(`${API}/catalogos-sat/tipos`, { headers })
            .then(r => r.json())
            .then(data => setTipos(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    const buscar = useCallback(async (tipo, q) => {
        setCargando(true);
        try {
            const url = `${API}/catalogos-sat/${tipo}?q=${encodeURIComponent(q)}&limit=100`;
            const res = await fetch(url, { headers });
            const data = await res.json();
            setResultados(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); setResultados([]); }
        setCargando(false);
    }, []);

    useEffect(() => {
        buscar(tipoActivo, busqueda);
    }, [tipoActivo, busqueda, buscar]);

    const totalActivo = Number(tipos.find(t => t.tipo === tipoActivo)?.total) || 0;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CATÁLOGOS SAT</h1>
                    <p className="text-gray-400 mt-3 text-lg">Catálogos oficiales del SAT para Carta Porte 3.1</p>
                </motion.div>

                {/* Stats de catálogos cargados */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {tipos.slice(0, 4).map((t, i) => {
                        const total = Number(t.total) || 0;
                        return (
                            <motion.div key={t.tipo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                onClick={() => setTipoActivo(t.tipo)}
                                className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                                    tipoActivo === t.tipo
                                        ? "bg-cyan-500/15 border-cyan-400/40"
                                        : "bg-white/5 border-cyan-400/10 hover:bg-white/10"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <FaDatabase className="text-cyan-400 text-sm" />
                                    <span className={`text-xs font-bold ${total > 0 ? "text-green-400" : "text-red-400"}`}>
                                        {total > 0 ? `${total.toLocaleString()} registros` : "Sin datos"}
                                    </span>
                                </div>
                                <p className="text-white text-sm font-bold leading-tight">{TIPOS_LABEL[t.tipo] || t.tipo}</p>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    {tipos.slice(4).map((t, i) => {
                        const total = Number(t.total) || 0;
                        return (
                            <motion.div key={t.tipo} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 4) * 0.08 }}
                                onClick={() => setTipoActivo(t.tipo)}
                                className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                                    tipoActivo === t.tipo
                                        ? "bg-cyan-500/15 border-cyan-400/40"
                                        : "bg-white/5 border-cyan-400/10 hover:bg-white/10"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <FaDatabase className="text-cyan-400 text-sm" />
                                    <span className={`text-xs font-bold ${total > 0 ? "text-green-400" : "text-red-400"}`}>
                                        {total > 0 ? `${total.toLocaleString()} registros` : "Sin datos"}
                                    </span>
                                </div>
                                <p className="text-white text-sm font-bold leading-tight">{TIPOS_LABEL[t.tipo] || t.tipo}</p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Buscador */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-cyan-300 flex items-center gap-3">
                            <FaDatabase /> {TIPOS_LABEL[tipoActivo] || tipoActivo}
                        </h2>
                        <span className="text-gray-500 text-sm">{totalActivo.toLocaleString()} registros totales</span>
                    </div>

                    {/* Select de tipo */}
                    <div className="flex gap-4 mb-6">
                        <select
                            value={tipoActivo}
                            onChange={e => { setTipoActivo(e.target.value); setBusqueda(""); }}
                            className="bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all">
                            {Object.entries(TIPOS_LABEL).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>

                        <div className="flex-1 relative">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar por clave o descripción..."
                                className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-11 pr-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                        </div>
                    </div>

                    {/* Resultados */}
                    {cargando ? (
                        <div className="py-10 text-center text-gray-500">Buscando...</div>
                    ) : resultados.length === 0 ? (
                        <div className="py-10 text-center text-gray-500">
                            {totalActivo === 0
                                ? "Este catálogo no tiene datos cargados. Ejecuta el script de carga."
                                : "No se encontraron resultados."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                        <th className="pb-3 pr-6 w-40">Clave</th>
                                        <th className="pb-3">Descripción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultados.map((r, i) => (
                                        <motion.tr key={r.id ?? `${r.clave}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-3 pr-6">
                                                <span className="font-mono text-cyan-300 font-bold text-sm bg-cyan-500/10 px-2 py-1 rounded-lg">
                                                    {r.clave}
                                                </span>
                                            </td>
                                            <td className="py-3 text-gray-200 text-sm">{r.descripcion}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                            {resultados.length >= 100 && (
                                <p className="text-center text-gray-500 text-xs mt-4">
                                    Mostrando los primeros 100 resultados. Refina tu búsqueda para ver más.
                                </p>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}









