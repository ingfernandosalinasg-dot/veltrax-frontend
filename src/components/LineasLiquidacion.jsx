import { useState } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaSyncAlt, FaExclamationTriangle } from "react-icons/fa";
import { API_URL } from "../config/api";

// VID-M1, entrega 3: las líneas de una liquidación por esquema. El neto es la suma
// de las líneas. Una abierta se puede recalcular con los datos actuales; al cerrarla,
// sus líneas quedan fijas. Entrega 4: un trayecto pagado muestra su importe y de dónde
// salieron su base y su tasa (fuente).

const pesos = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const km = (n) => (n === null || n === undefined ? "" : `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} km`);
const TIPO = { SUELDO: "Sueldo", VIAJE: "Viaje", TRAYECTO: "Trayecto", ANTICIPO: "Anticipo", COMPROBADO: "Comprobado", BONO: "Bono", PRESTAMO: "Préstamo" };
const CARGA = { CARGADO: "cargado", VACIO: "vacío", SIN_MARCA: "sin marca" };

export default function LineasLiquidacion({ liquidacion, onClose, onCambio }) {
    const [liq, setLiq]           = useState(liquidacion);
    const [avisos, setAvisos]     = useState(null);
    const [error, setError]       = useState("");
    const [cargando, setCargando] = useState(false);

    const recalcular = async () => {
        setError("");
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/liquidaciones/${liq.id}/recalcular`, {
                method: "PUT", headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(data?.error || `No se pudo recalcular (error ${res.status}).`); return; }
            setLiq(data);
            setAvisos(data.avisos || []);
            onCambio();
        } catch (e) {
            console.error(e);
            setError("No se pudo conectar con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    const lineas = liq.lineas || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start p-6 pb-3 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-cyan-300">Líneas de {liq.folio || `#${liq.id}`}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {liq.driverNombre} · del {liq.periodoInicio} al {liq.periodoFin} · esquema {liq.esquemaNombre || "-"}
                            {liq.status === "CERRADA" ? " · cerrada: las líneas están fijas" : ""}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                </div>

                <div className="px-6 pb-4 overflow-auto space-y-4">
                    {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-400/30 text-red-300">{error}</div>}
                    {avisos && (
                        <div className="rounded-xl bg-cyan-500/5 border border-cyan-400/20 p-3 space-y-1 text-sm">
                            <p className="text-cyan-300 font-bold">Recalculada.</p>
                            {avisos.map((a, i) => (
                                <p key={i} className="text-yellow-300 flex gap-2"><FaExclamationTriangle className="mt-1 flex-shrink-0" /> {a.texto}</p>
                            ))}
                        </div>
                    )}
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10">
                                {["#", "Tipo", "Concepto", "Importe"].map(h => <th key={h} className="pb-2 pr-3">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {lineas.length === 0 && (
                                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Sin líneas.</td></tr>
                            )}
                            {lineas.map(x => (
                                <tr key={x.id} className={`border-b border-cyan-400/5 ${x.tipo === "TRAYECTO" ? "text-gray-400" : ""}`}>
                                    <td className="py-2 pr-3 text-gray-500">{x.orden}</td>
                                    <td className="py-2 pr-3">{TIPO[x.tipo] || x.tipo}</td>
                                    <td className={`py-2 pr-3 ${x.tipo === "TRAYECTO" ? "pl-4" : ""}`}>
                                        {x.concepto}
                                        {x.tipo === "TRAYECTO" && (
                                            <span className="text-xs"> · {km(x.km)}, {CARGA[x.carga] || x.carga}
                                                {x.liquidable === false ? ", no liquidable" : x.cuenta ? ", cuenta" : ", no cuenta"}</span>
                                        )}
                                        {x.fuente && <div className="text-xs text-gray-500">{x.fuente}</div>}
                                    </td>
                                    <td className={`py-2 pr-3 font-bold whitespace-nowrap ${x.importe < 0 ? "text-red-300" : x.importe > 0 ? "text-green-300" : "text-gray-500"}`}>
                                        {x.tipo === "TRAYECTO" && !x.importe ? "" : pesos(x.importe)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex justify-between border-t border-cyan-400/10 pt-3">
                        <span className="font-bold">Neto (suma de las líneas)</span>
                        <span className={`font-black text-xl ${liq.netoAPagar < 0 ? "text-red-300" : "text-yellow-300"}`}>{pesos(liq.netoAPagar)}</span>
                    </div>
                    {liq.netoAPagar < 0 && (
                        <p className="text-red-300 text-sm">Neto negativo: se cierra y se autoriza, pero no se paga hasta que exista el saldo del operador.</p>
                    )}
                </div>

                {liq.status === "ABIERTA" && (
                    <div className="p-6 pt-2 flex-shrink-0">
                        <button onClick={recalcular} disabled={cargando}
                            className="w-full py-3 rounded-2xl bg-purple-500/10 border border-purple-400/30 text-purple-300 font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2">
                            <FaSyncAlt /> {cargando ? "Recalculando..." : "Recalcular con los datos actuales"}
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
