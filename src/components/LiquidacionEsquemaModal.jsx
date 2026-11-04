import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaTimes, FaCalculator, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { API_URL } from "../config/api";
import { hoyMexico } from "../utils/fechas";

// VID-M1, entrega 3: nueva liquidación por esquema de pago (y editar una abierta).
// Operador y semana (cualquier día; va de lunes a domingo por fecha de entrega), con
// el esquema del operador o el de por omisión. «Calcular» muestra la vista previa;
// «Guardar» guarda la liquidación con sus líneas. Al editar, el operador y la semana
// no cambian: solo bonos, préstamo, fecha y notas, y las líneas se rehacen.
// Entrega 4: los días del sueldo diario (plantilla 8) y, al calcular, el aviso si el
// operador ya tiene liquidación en esa semana (viene entre los avisos).

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all disabled:opacity-60";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all disabled:opacity-60";

const pesos = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const km = (n) => (n || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 });

const BONOS = [
    ["bonoProductividad", "Bono de productividad ($)"],
    ["bonoCarga", "Bono camión cargado ($)"],
    ["bonoDescarga", "Bono por descarga ($)"],
    ["bonoManiobras", "Bono de maniobras ($)"],
];

const numero = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

// El sueldo fijo del cálculo: semanal, o diario × días.
const etiquetaSueldo = (c) => (c.percepcionFija === "DIARIO"
    ? `Sueldo diario${c.sueldoDiario != null ? ` ${pesos(c.sueldoDiario)}` : ""} × ${c.dias ?? 0} días`
    : "Sueldo semanal");

export default function LiquidacionEsquemaModal({ drivers, liquidacion, driverInicial, onClose, onGuardada }) {
    const editando = !!liquidacion;
    const [form, setForm] = useState(() => ({
        driverId: liquidacion ? String(liquidacion.driverId || "") : (driverInicial || ""),
        semana: liquidacion ? liquidacion.periodoInicio : hoyMexico(),
        bonoProductividad: liquidacion?.bonoProductividad ?? "",
        bonoCarga: liquidacion?.bonoCarga ?? "",
        bonoDescarga: liquidacion?.bonoDescarga ?? "",
        bonoManiobras: liquidacion?.bonoManiobras ?? "",
        prestamoId: liquidacion?.prestamoId ? String(liquidacion.prestamoId) : "",
        montoDescuentoPrestamo: liquidacion?.montoDescuentoPrestamo ?? "",
        fechaLiquidacion: liquidacion?.fechaLiquidacion || hoyMexico(),
        notas: liquidacion?.notas || "",
        dias: liquidacion?.dias ?? "",
    }));
    // Los préstamos activos, con el operador al que pertenecen.
    const [deOperador, setDeOperador] = useState({ driverId: "", lista: [] });
    const [vista, setVista]         = useState(null);
    const [error, setError]         = useState("");
    const [cargando, setCargando]   = useState(false);
    const [guardando, setGuardando] = useState(false);

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
    const set = (campo) => (e) => setForm(prev => ({ ...prev, [campo]: e.target.value }));

    useEffect(() => {
        if (!form.driverId) return;
        let vigente = true;
        const driverId = form.driverId;
        fetch(`${API_URL}/prestamos/driver/${driverId}/activos`, { headers })
            .then(res => (res.ok ? res.json() : []))
            .catch(() => [])
            .then(data => { if (vigente) setDeOperador({ driverId, lista: Array.isArray(data) ? data : [] }); });
        return () => { vigente = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.driverId]);
    const prestamos = deOperador.driverId === form.driverId ? deOperador.lista : [];

    // La vista previa ya no cuenta lo que está en otras liquidaciones; al editar,
    // tampoco ve lo de esta misma, así que solo se ofrece en una nueva.
    const calcular = async () => {
        setError("");
        setVista(null);
        if (!form.driverId) { setError("Elige un operador."); return; }
        if (!form.semana) { setError("Elige un día de la semana."); return; }
        setCargando(true);
        try {
            const res = await fetch(`${API_URL}/liquidaciones/preview-esquema?driverId=${form.driverId}&semana=${form.semana}${form.dias !== "" ? `&dias=${form.dias}` : ""}`, { headers });
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

    const guardar = async () => {
        setError("");
        if (!form.driverId) { setError("Elige un operador."); return; }
        if (!form.semana) { setError("Elige un día de la semana."); return; }
        if (form.prestamoId && !(Number(form.montoDescuentoPrestamo) > 0)) {
            setError("Seleccionaste un préstamo: escribe el monto a descontar (mayor a 0).");
            return;
        }
        setGuardando(true);
        try {
            const body = {
                modo: "ESQUEMA",
                driverId: Number(form.driverId),
                semana: form.semana,
                bonoProductividad: numero(form.bonoProductividad),
                bonoCarga: numero(form.bonoCarga),
                bonoDescarga: numero(form.bonoDescarga),
                bonoManiobras: numero(form.bonoManiobras),
                prestamoId: form.prestamoId ? Number(form.prestamoId) : null,
                montoDescuentoPrestamo: form.prestamoId ? numero(form.montoDescuentoPrestamo) : null,
                fechaLiquidacion: form.fechaLiquidacion || null,
                notas: form.notas || null,
                dias: form.dias === "" ? null : Number(form.dias),
            };
            const url = editando ? `${API_URL}/liquidaciones/${liquidacion.id}` : `${API_URL}/liquidaciones`;
            const res = await fetch(url, { method: editando ? "PUT" : "POST", headers, body: JSON.stringify(body) });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.error || (res.status === 403
                    ? "No tienes permiso para esta acción o tu sesión expiró."
                    : `No se pudo guardar (error ${res.status}).`));
                return;
            }
            onGuardada(data);
        } catch (e) {
            console.error(e);
            setError("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setGuardando(false);
        }
    };

    const c = vista?.calculo;
    const bonos = BONOS.reduce((s, [campo]) => s + (Number(form[campo]) || 0), 0);
    const prestamo = form.prestamoId ? (Number(form.montoDescuentoPrestamo) || 0) : 0;
    const prestamoSeleccionado = prestamos.find(p => String(p.id) === String(form.prestamoId));

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                <div className="flex justify-between items-center p-6 pb-2 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-cyan-300">
                            {editando ? `Editar ${liquidacion.folio || `#${liquidacion.id}`}` : "Nueva Liquidación"}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {editando
                                ? `Semana del ${liquidacion.periodoInicio} al ${liquidacion.periodoFin} · esquema ${liquidacion.esquemaNombre || "-"}. Al guardar, las líneas se recalculan.`
                                : "Por operador y semana, con el esquema de pago del operador (o el de por omisión)."}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <label className="block md:col-span-1">
                            <span className="text-gray-400 text-sm">Operador</span>
                            <select value={form.driverId} onChange={set("driverId")} className={selectCls} disabled={editando}>
                                <option value="">Elige un operador</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-gray-400 text-sm">Semana (cualquier día)</span>
                            <input type="date" value={form.semana} onChange={set("semana")} className={inputCls} disabled={editando} />
                        </label>
                        <label className="block">
                            <span className="text-gray-400 text-sm">Días (solo sueldo diario)</span>
                            <input type="number" min="0" max="7" step="1" value={form.dias} onChange={set("dias")} placeholder="0 a 7" className={inputCls} />
                        </label>
                        {!editando && (
                            <button onClick={calcular} disabled={cargando}
                                className="py-3 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2">
                                <FaCalculator /> {cargando ? "Calculando..." : "Calcular"}
                            </button>
                        )}
                    </div>

                    {c && (
                        <div className="rounded-2xl bg-white/5 border border-cyan-400/10 p-4 space-y-3 text-sm">
                            <p className="text-gray-300">
                                <span className="font-bold text-white">{vista.operador}</span> · del {vista.semanaInicio} al {vista.semanaFin} ·
                                esquema <span className="text-cyan-300 font-bold">{vista.esquema?.nombre}</span>
                            </p>
                            {c.avisos.length > 0 && (
                                <div className="rounded-xl bg-yellow-500/5 border border-yellow-400/30 p-3 space-y-1">
                                    {c.avisos.map((a, i) => (
                                        <p key={i} className="text-yellow-300 flex gap-2"><FaExclamationTriangle className="mt-1 flex-shrink-0" /> {a.texto}</p>
                                    ))}
                                </div>
                            )}
                            {c.viajes.length === 0
                                ? <p className="text-gray-500">{vista.periodoPor === "SALIDA" ? "No hay trayectos por pagar en esta semana." : "No hay viajes entregados por pagar en esta semana."}</p>
                                : c.viajes.map(v => (
                                    <div key={v.id}>
                                        <div className="flex justify-between">
                                            <span>
                                                <span className="font-bold text-cyan-300">{v.folio}</span> · {vista.periodoPor === "SALIDA" ? "salida" : "entrega"} {v.fecha} · {km(v.kmQueCuentan)} km
                                                {v.cumpleMeta === null ? "" : v.cumpleMeta ? " · cumple la meta" : " · no cumple la meta"}
                                                {v.semanaAnterior && <span className="ml-2 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-xs">de semana anterior</span>}
                                            </span>
                                            <span className="text-green-300 font-bold">{pesos(v.total)}</span>
                                        </div>
                                        {v.trayectos.filter(t => t.fuente).map(t => (
                                            <div key={`${t.id}-${t.rol}`} className="flex justify-between pl-4 text-xs text-gray-400">
                                                <span>T{t.secuencia} {t.origen} → {t.destino}: {t.fuente}</span>
                                                <span>{pesos(t.importe)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            <div className="border-t border-cyan-400/10 pt-2 space-y-1">
                                <div className="flex justify-between"><span className="text-gray-400">{etiquetaSueldo(c)}</span><span>{pesos(c.sueldoFijo)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">{c.conceptoTrayecto === "COMISION" ? "Comisión por trayectos" : "Pago por viajes y trayectos"}</span><span>{pesos(c.totalViajes)}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Comprobación: anticipos {pesos(c.totalAnticipos)} − comprobados {pesos(c.totalComprobado)}</span>
                                    <span>{pesos(-c.diferencia)}</span>
                                </div>
                                <div className="flex justify-between"><span className="text-gray-400">Bonos</span><span>{pesos(bonos)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Préstamo</span><span>{pesos(-prestamo)}</span></div>
                                <div className="flex justify-between border-t border-cyan-400/10 pt-2">
                                    <span className="font-bold">Neto</span>
                                    <span className={`font-black text-lg ${c.neto + bonos - prestamo < 0 ? "text-red-300" : "text-yellow-300"}`}>{pesos(c.neto + bonos - prestamo)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Bonos manuales</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {BONOS.map(([campo, etiqueta]) => (
                            <label key={campo} className="block">
                                <span className="text-gray-400 text-sm">{etiqueta}</span>
                                <input type="number" min="0" value={form[campo]} onChange={set(campo)} placeholder="0.00" className={inputCls} />
                            </label>
                        ))}
                    </div>

                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Descuento de préstamo</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-gray-400 text-sm">Préstamo activo del operador</span>
                            <select value={form.prestamoId} onChange={set("prestamoId")} className={selectCls} disabled={!form.driverId}>
                                <option value="">Sin préstamo / no aplicar</option>
                                {prestamos.map(p => (
                                    <option key={p.id} value={p.id}>{p.folio} - Saldo: ${(p.saldoPendiente || 0).toLocaleString()}</option>
                                ))}
                            </select>
                        </label>
                        {form.prestamoId && (
                            <label className="block">
                                <span className="text-gray-400 text-sm">Monto a descontar ($)</span>
                                <input type="number" min="0" value={form.montoDescuentoPrestamo} onChange={set("montoDescuentoPrestamo")} placeholder="0.00" className={inputCls} />
                                {prestamoSeleccionado && <span className="text-gray-500 text-xs">Saldo pendiente: ${(prestamoSeleccionado.saldoPendiente || 0).toLocaleString()}</span>}
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-gray-400 text-sm">Fecha de liquidación</span>
                            <input type="date" value={form.fechaLiquidacion} onChange={set("fechaLiquidacion")} className={inputCls} />
                        </label>
                        <label className="block">
                            <span className="text-gray-400 text-sm">Notas</span>
                            <input value={form.notas} onChange={set("notas")} placeholder="Observaciones..." className={inputCls} />
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="px-6 pb-2 flex-shrink-0">
                        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-semibold">{error}</div>
                    </div>
                )}

                <div className="flex gap-4 p-6 pt-3 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={guardar} disabled={guardando}
                        className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2">
                        <FaCheck /> {guardando ? "Guardando..." : editando ? "Guardar y recalcular" : "Guardar liquidación"}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
