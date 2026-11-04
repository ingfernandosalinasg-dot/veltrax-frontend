import { useState } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaCalculator, FaExclamationTriangle } from "react-icons/fa";
import { API_URL } from "../config/api";
import { hoyMexico } from "../utils/fechas";

// VID-M1, entrega 2: vista previa semanal con el esquema de pago del operador
// (el suyo o el de por omisión). Solo calcula: no guarda nada. La semana va de
// lunes a domingo; cualquier día elige su semana. Entrega 4: por fecha de entrega
// o de salida, según el esquema; cada trayecto con su importe y su fuente, y los
// días del sueldo diario (plantilla 8).

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const pesos = (n) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const km = (n) => (n || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 });
const CARGA = { CARGADO: "Cargado", VACIO: "Vacío", SIN_MARCA: "Sin marca" };

// El sueldo fijo del cálculo: semanal, o diario × días.
const etiquetaSueldo = (c) => (c.percepcionFija === "DIARIO"
    ? `Sueldo diario${c.sueldoDiario != null ? ` ${pesos(c.sueldoDiario)}` : ""} × ${c.dias ?? 0} días`
    : "Sueldo semanal");

export default function VistaPreviaEsquema({ drivers, onClose }) {
    const [driverId, setDriverId] = useState("");
    const [semana, setSemana]     = useState(hoyMexico());
    const [dias, setDias]         = useState("");
    const [vista, setVista]       = useState(null);
    const [error, setError]       = useState("");
    const [cargando, setCargando] = useState(false);

    const calcular = async () => {
        setError("");
        setVista(null);
        if (!driverId) { setError("Elige un operador."); return; }
        if (!semana) { setError("Elige un día de la semana."); return; }
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/liquidaciones/preview-esquema?driverId=${driverId}&semana=${semana}${dias !== "" ? `&dias=${dias}` : ""}`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || `No se pudo calcular (${res.status}).`); return; }
            setVista(data);
        } catch (e) {
            console.error(e);
            setError("No se pudo conectar con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    const c = vista?.calculo;
    const porSalida = vista?.periodoPor === "SALIDA";

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-cyan-300">Vista previa (esquema)</h2>
                        <p className="text-gray-400 text-sm mt-1">Calcula la semana con el esquema de pago del operador. No guarda nada.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                </div>

                <div className="px-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end flex-shrink-0">
                    <label className="block">
                        <span className="text-gray-400 text-sm">Operador</span>
                        <select value={driverId} onChange={e => setDriverId(e.target.value)} className={selectCls}>
                            <option value="">Elige un operador</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-gray-400 text-sm">Semana (cualquier día)</span>
                        <input type="date" value={semana} onChange={e => setSemana(e.target.value)} className={inputCls} />
                    </label>
                    <label className="block">
                        <span className="text-gray-400 text-sm">Días (solo sueldo diario)</span>
                        <input type="number" min="0" max="7" step="1" value={dias} onChange={e => setDias(e.target.value)} placeholder="0 a 7" className={inputCls} />
                    </label>
                    <button onClick={calcular} disabled={cargando}
                        className="py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2">
                        <FaCalculator /> {cargando ? "Calculando..." : "Calcular"}
                    </button>
                </div>

                <div className="p-6 overflow-auto space-y-5">
                    {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-400/30 text-red-300">{error}</div>}

                    {c && (
                        <>
                            <div className="text-sm text-gray-300">
                                <span className="font-bold text-white">{vista.operador}</span> · semana del {vista.semanaInicio} al {vista.semanaFin} ·
                                esquema <span className="text-cyan-300 font-bold">{vista.esquema?.nombre}</span>
                            </div>

                            {c.avisos.length > 0 && (
                                <div className="rounded-2xl bg-yellow-500/5 border border-yellow-400/30 p-4 space-y-1">
                                    {c.avisos.map((a, i) => (
                                        <p key={i} className="text-yellow-300 text-sm flex gap-2">
                                            <FaExclamationTriangle className="mt-1 flex-shrink-0" /> {a.texto}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <div>
                                <h3 className="text-cyan-300 font-bold mb-2">{porSalida ? "Trayectos que salieron y llegaron, por viaje" : "Viajes entregados"}</h3>
                                {c.viajes.length === 0 ? (
                                    <p className="text-gray-500 text-sm">{porSalida ? "No hay trayectos por pagar en esta semana." : "No hay viajes entregados por pagar en esta semana."}</p>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="text-gray-400 border-b border-cyan-400/10">
                                                {["Viaje", porSalida ? "Salida" : "Entrega", "Km cargados", "Km vacíos", "Km sin marca", "Km que cuentan", "Meta", "Importe"]
                                                    .map(h => <th key={h} className="pb-2 pr-3">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {c.viajes.map(v => (
                                                <tr key={v.id} className="border-b border-cyan-400/5 align-top">
                                                    <td className="py-2 pr-3">
                                                        <span className="font-bold text-cyan-300">{v.folio}</span>
                                                        {v.semanaAnterior && <span className="ml-2 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-xs">de semana anterior</span>}
                                                        <div className="text-gray-500 text-xs mt-1">
                                                            {v.trayectos.map(t => (
                                                                <div key={`${t.id}-${t.rol}`}>
                                                                    T{t.secuencia} {t.origen} → {t.destino}: {km(t.km)} km, {CARGA[t.carga]}
                                                                    {t.rol === "AUXILIAR" ? " (como auxiliar)" : ""}
                                                                    {!t.liquidable ? " (no liquidable)" : t.cuenta ? "" : " (no cuenta)"}
                                                                    {t.fuente !== null && t.fuente !== undefined && (
                                                                        <span className="text-green-300"> · {pesos(t.importe)}</span>
                                                                    )}
                                                                    {t.fuente && <div className="pl-4 text-gray-600">{t.fuente}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 pr-3">{v.fecha}</td>
                                                    <td className="py-2 pr-3">{km(v.kmCargados)}</td>
                                                    <td className="py-2 pr-3">{km(v.kmVacios)}</td>
                                                    <td className="py-2 pr-3">{km(v.kmSinMarca)}</td>
                                                    <td className="py-2 pr-3 font-bold">{km(v.kmQueCuentan)}</td>
                                                    <td className="py-2 pr-3">{v.cumpleMeta === null ? "-" : v.cumpleMeta ? "Cumple" : "No cumple"}</td>
                                                    <td className="py-2 pr-3 text-green-300 font-bold">{pesos(v.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <h3 className="text-cyan-300 font-bold mb-2">Anticipos del operador</h3>
                                    {c.anticipos.length === 0 ? <p className="text-gray-500 text-sm">Ninguno.</p> : c.anticipos.map(m => (
                                        <p key={m.id} className="text-sm text-gray-300">{m.folio || "Anticipo"} · {m.viaje}: <span className="text-red-300">{pesos(m.monto)}</span></p>
                                    ))}
                                </div>
                                <div>
                                    <h3 className="text-cyan-300 font-bold mb-2">Gastos comprobados del operador</h3>
                                    {c.comprobados.length === 0 ? <p className="text-gray-500 text-sm">Ninguno.</p> : c.comprobados.map(m => (
                                        <p key={m.id} className="text-sm text-gray-300">{m.concepto} · {m.viaje}: <span className="text-green-300">{pesos(m.monto)}</span></p>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/5 border border-cyan-400/10 p-4 text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-gray-400">{etiquetaSueldo(c)}</span><span>{pesos(c.sueldoFijo)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">{c.conceptoTrayecto === "COMISION" ? "Comisión por trayectos" : "Pago por viajes y trayectos"}</span><span>{pesos(c.totalViajes)}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">
                                        Comprobación: anticipos {pesos(c.totalAnticipos)} − comprobados {pesos(c.totalComprobado)}
                                        {c.diferencia < 0 ? " (a favor del operador)" : ""}
                                    </span>
                                    <span className={c.diferencia > 0 ? "text-red-300" : "text-green-300"}>
                                        {c.diferencia > 0 ? `-${pesos(c.diferencia)}` : `+${pesos(-c.diferencia)}`}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-cyan-400/10 pt-2 mt-2">
                                    <span className="font-bold">Neto</span>
                                    <span className={`font-black text-xl ${c.neto < 0 ? "text-red-300" : "text-yellow-300"}`}>{pesos(c.neto)}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
