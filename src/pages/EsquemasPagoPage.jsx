import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaCalculator, FaEdit, FaTimes, FaCheck, FaToggleOn, FaToggleOff, FaStar, FaRegStar } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
const API = API_URL;

// VID-M1, entrega 1: los esquemas de pago de la empresa. Se activan los que se
// usan, uno queda por omisión y cada operador puede tener otro (Operadores,
// pestaña Valores p/Liquidar). Montos, umbral y opciones se cambian aquí; la
// plantilla no. Solo ADMIN cambia; los rechazos se ven dentro de la pantalla.
// TEC-QUINCENAL: periodo quincenal (1–15 y 16–fin de mes), sueldo quincenal y la
// opción «Los viajes se pagan»: en su periodo o al cierre del mes (2ª quincena).

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const PLANTILLAS = {
    FLETE_PCT: "Flete × % del operador",
    IMPORTE_BASE_PCT: "Importe base × % del operador",
    SUELDO_TRAYECTO: "Sueldo del trayecto",
    SEMANAL_SUELDO_TRAYECTO: "Semanal + sueldo del trayecto (comisión)",
    KM_FACTOR_TRAYECTO: "Km × factor del trayecto",
    SEMANAL_FLETE_PCT: "Semanal + flete × % (comisión)",
    DIARIO_SUELDO_TRAYECTO: "Diario × días + sueldo del trayecto (comisión)",
    KM_FACTOR_OPERADOR: "Km × factor del operador",
    SEMANAL_META_ESCALON: "Semanal + meta con escalón por viaje",
};
const PERIODOS = [
    { value: "SEMANAL", label: "Semanal (lunes a domingo)" },
    { value: "QUINCENAL", label: "Quincenal (1 al 15 y 16 al fin de mes)" },
    { value: "MENSUAL", label: "Mensual (próximamente)", disabled: true },
    { value: "POR_VIAJE", label: "Por viaje (próximamente)", disabled: true },
];
const PERIODO_POR = { ENTREGA: "Por fecha de entrega", SALIDA: "Por fecha de salida" };
const FIJA = { NINGUNA: "Ninguno", SEMANAL: "Sueldo semanal del operador", QUINCENAL: "Sueldo quincenal del operador", DIARIO: "Sueldo diario × días" };
const BASES = { FLETE: "Flete (prorrateado por km)", IMPORTE_BASE: "Importe base (prorrateado por km)", KM: "Km del trayecto", TRAYECTO: "Por trayecto" };
const TASAS = { PCT_OPERADOR: "% del operador", FACTOR_TRAYECTO: "Factor del trayecto", FACTOR_OPERADOR: "Factor del operador", SUELDO_TRAYECTO: "Sueldo del trayecto" };
const TASAS_POR_BASE = { FLETE: ["PCT_OPERADOR"], IMPORTE_BASE: ["PCT_OPERADOR"], KM: ["FACTOR_TRAYECTO", "FACTOR_OPERADOR"], TRAYECTO: ["SUELDO_TRAYECTO"] };
const FILTROS = { CARGADOS: "Solo cargados", VACIOS: "Solo vacíos", TODOS: "Todos" };
const SIN_MARCA = { NO_CUENTA: "No cuenta (por defecto)", CARGADO: "Cuenta como cargado" };
const META_POR = { OPERADOR: "Operador: sus km (por defecto)", VIAJE: "Viaje: el total de km" };
const AUXILIAR = { NO: "No (por defecto)", IGUAL: "Igual que el operador", PORCENTAJE: "Un porcentaje" };
const VIAJES_SE_PAGAN = { EN_SU_PERIODO: "En su periodo (por defecto)", CIERRE_DE_MES: "Al cierre del mes (2ª quincena)" };

// El nombre de la plantilla con el periodo del esquema: «Semanal + …» dice
// «Quincenal + …» en un esquema quincenal (detalle de la prueba de TEC-QUINCENAL).
const NOMBRE_PERIODO = { SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual", POR_VIAJE: "Por viaje" };
function nombrePlantilla(e) {
    const nombre = PLANTILLAS[e.plantilla] || e.plantilla || "";
    return nombre.startsWith("Semanal") && NOMBRE_PERIODO[e.periodo]
        ? NOMBRE_PERIODO[e.periodo] + nombre.slice("Semanal".length)
        : nombre;
}

const dinero = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Resumen corto de lo que paga, para la tabla.
function resumen(p) {
    if (!p) return "Parámetros sin leer";
    const partes = [];
    const fija = p.percepcionFija?.tipo;
    if (fija === "SEMANAL") partes.push("Sueldo semanal");
    if (fija === "QUINCENAL") partes.push("Sueldo quincenal");
    if (fija === "DIARIO") partes.push("Sueldo diario × días");
    const t = p.pagoPorTrayecto;
    if (t) partes.push(`${BASES[t.base]?.split(" (")[0] || t.base} × ${(t.tasas || []).map(x => TASAS[x] || x).join(" / ")}${t.concepto === "COMISION" ? " (comisión)" : ""}`);
    const v = p.pagoPorViaje;
    if (v?.tipo === "META_ESCALON") partes.push(`Por viaje: ${v.umbralKm} km ${v.filtroKm === "CARGADOS" ? "cargados" : v.filtroKm === "VACIOS" ? "vacíos" : ""} → ${dinero(v.tasaKm)}/km; si no, ${dinero(v.montoNoCumple)}`);
    if (v?.tipo === "FIJO") partes.push(`Por viaje: ${dinero(v.monto)}`);
    return partes.join(" + ");
}

// Del esquema a la ventana, con texto en los números para los campos.
function aFormulario(e) {
    const p = e.parametros || {};
    const t = p.pagoPorTrayecto;
    const v = p.pagoPorViaje;
    const o = e.opciones || {};
    return {
        nombre: e.nombre || "",
        periodo: e.periodo || "SEMANAL",
        periodoPor: e.periodoPor || "ENTREGA",
        fija: p.percepcionFija?.tipo || "NINGUNA",
        conTrayecto: !!t,
        base: t?.base || "KM",
        tasa: t?.tasas?.[0] || "FACTOR_TRAYECTO",
        respaldo: t?.tasas?.[1] || "",
        concepto: t?.concepto || "SUELDO",
        filtroTrayecto: t?.filtroKm || "TODOS",
        viaje: v?.tipo || "NINGUNO",
        umbralKm: v?.umbralKm ?? "",
        tasaKm: v?.tasaKm ?? "",
        montoNoCumple: v?.montoNoCumple ?? "",
        monto: v?.monto ?? "",
        filtroViaje: v?.filtroKm || "CARGADOS",
        trayectoSinMarca: o.trayectoSinMarca || "NO_CUENTA",
        metaPor: o.metaPor || "OPERADOR",
        auxiliar: o.auxiliar || "NO",
        auxiliarPorcentaje: o.auxiliarPorcentaje ?? "",
        viajesSePagan: o.viajesSePagan || "EN_SU_PERIODO",
    };
}

// De la ventana al cuerpo del PUT. Los números van como texto: el servidor los
// revisa y responde con el campo y el valor si no sirven.
function aCuerpo(f) {
    const texto = (x) => (x === null || x === undefined ? "" : String(x).trim());
    const parametros = {
        moneda: "MXN",
        percepcionFija: { tipo: f.fija },
        pagoPorTrayecto: f.conTrayecto ? {
            base: f.base,
            tasas: [f.tasa, ...(f.respaldo ? [f.respaldo] : [])],
            concepto: f.concepto,
            filtroKm: f.filtroTrayecto,
        } : null,
        pagoPorViaje: f.viaje === "META_ESCALON"
            ? { tipo: "META_ESCALON", umbralKm: texto(f.umbralKm), tasaKm: texto(f.tasaKm), montoNoCumple: texto(f.montoNoCumple), filtroKm: f.filtroViaje }
            : f.viaje === "FIJO" ? { tipo: "FIJO", monto: texto(f.monto) } : null,
    };
    const opciones = {
        trayectoSinMarca: f.trayectoSinMarca,
        metaPor: f.metaPor,
        auxiliar: f.auxiliar,
        auxiliarPorcentaje: f.auxiliar === "PORCENTAJE" ? texto(f.auxiliarPorcentaje) : null,
        viajesSePagan: f.viajesSePagan,
    };
    return { nombre: f.nombre, periodo: f.periodo, periodoPor: f.periodoPor, parametros, opciones };
}

async function mensajeDeError(res, queFallo) {
    const cuerpo = await res.json().catch(() => null);
    if (cuerpo?.error) return cuerpo.error;
    if (res.status === 403) return "No tienes permiso para esta acción o tu sesión expiró.";
    return `${queFallo} (error ${res.status}).`;
}

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "sm:col-span-2" : ""}>
            <label className="text-gray-400 text-xs mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}

function Opciones({ valores, value, onChange, disabled = false }) {
    return (
        <select value={value} onChange={onChange} disabled={disabled} className={selectCls}>
            {Object.entries(valores).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
    );
}

export default function EsquemasPagoPage() {
    const [esquemas, setEsquemas] = useState([]);
    const [aviso, setAviso] = useState("");
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(null);
    const [errorGuardar, setErrorGuardar] = useState("");
    const [loading, setLoading] = useState(false);
    // version cambia para volver a cargar la lista tras un cambio.
    const [version, setVersion] = useState(0);
    const fetchAll = () => setVersion(v => v + 1);

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    useEffect(() => {
        let vigente = true;
        const t = localStorage.getItem("token");
        fetch(`${API}/api/esquemas-pago`, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
            .then(async (res) => {
                if (!vigente) return;
                if (!res.ok) { setAviso(await mensajeDeError(res, "No se pudo cargar la lista de esquemas")); return; }
                const data = await res.json();
                if (vigente) setEsquemas(Array.isArray(data) ? data : []);
            })
            .catch((e) => {
                console.error(e);
                if (vigente) setAviso("No se pudo conectar con el servidor. Intenta de nuevo.");
            });
        return () => { vigente = false; };
    }, [version]);

    const set = (campo) => (e) => {
        const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm(f => {
            const nuevo = { ...f, [campo]: valor };
            // Al cambiar la base, la tasa pasa a la primera que aplica.
            if (campo === "base") {
                nuevo.tasa = TASAS_POR_BASE[valor][0];
                nuevo.respaldo = "";
            }
            if (campo === "tasa" && nuevo.respaldo === valor) nuevo.respaldo = "";
            return nuevo;
        });
    };

    const accion = async (e, cual) => {
        setAviso("");
        try {
            const res = await fetch(`${API}/api/esquemas-pago/${e.id}/${cual}`, { method: "PUT", headers });
            if (!res.ok) { setAviso(await mensajeDeError(res, "No se pudo cambiar el esquema")); return; }
            fetchAll();
        } catch (err) {
            console.error(err);
            setAviso("No se pudo conectar con el servidor. Intenta de nuevo.");
        }
    };

    const abrir = (e) => {
        setEditando(e);
        setForm(aFormulario(e));
        setErrorGuardar("");
    };

    const guardar = async () => {
        setLoading(true);
        setErrorGuardar("");
        try {
            const res = await fetch(`${API}/api/esquemas-pago/${editando.id}`, { method: "PUT", headers, body: JSON.stringify(aCuerpo(form)) });
            if (!res.ok) { setErrorGuardar(await mensajeDeError(res, "No se pudo guardar el esquema")); return; }
            setEditando(null);
            fetchAll();
        } catch (e) {
            console.error(e);
            setErrorGuardar("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const tasasDeLaBase = form ? TASAS_POR_BASE[form.base] : [];

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-2xl md:text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">ESQUEMAS DE PAGO</h1>
                    <p className="text-gray-400 mt-4 text-xl">Cómo se calcula la liquidación de cada operador</p>
                </motion.div>

                <p className="text-gray-500 text-sm mb-6 max-w-3xl">
                    Activa los esquemas que usa la empresa y elige uno <strong>por omisión</strong>: es el de todos los operadores
                    que no tienen otro asignado en Operadores (pestaña Valores p/Liquidar). Un esquema por omisión o asignado a un
                    operador no se puede desactivar.
                </p>

                {aviso && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm flex justify-between items-start gap-4">
                        <span>{aviso}</span>
                        <button onClick={() => setAviso("")} className="text-red-300 hover:text-white"><FaTimes /></button>
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 md:p-8">
                    <h2 className="text-2xl md:text-3xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaCalculator /> Esquemas</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Esquema", "Qué paga", "Periodo", "Operadores", "Activo", "Por omisión", ""]
                                        .map((h, i) => <th key={i} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {esquemas.length === 0 && (
                                    <tr><td colSpan={7} className="py-10 text-center text-gray-500">No hay esquemas: corre el script vid_m1_esquemas_pago.sql</td></tr>
                                )}
                                {esquemas.map(e => (
                                    <tr key={e.id} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all align-top">
                                        <td className="py-4 pr-4">
                                            <p className="font-bold">{e.nombre}</p>
                                            <p className="text-gray-500 text-xs">{e.clave} · {nombrePlantilla(e)}</p>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm max-w-md">{resumen(e.parametros)}</td>
                                        <td className="py-4 pr-4 text-sm">
                                            <p>
                                                {PERIODOS.find(p => p.value === e.periodo)?.label.split(" (")[0] || e.periodo}
                                                {e.opciones?.viajesSePagan === "CIERRE_DE_MES" && " · Viajes al cierre del mes"}
                                            </p>
                                            <p className="text-gray-500 text-xs">{PERIODO_POR[e.periodoPor] || e.periodoPor}</p>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-300">{e.operadores}</td>
                                        <td className="py-4 pr-4">
                                            <button onClick={() => accion(e, e.activo ? "desactivar" : "activar")} className="text-2xl" title={e.activo ? "Desactivar" : "Activar"}>
                                                {e.activo ? <FaToggleOn className="text-green-400" /> : <FaToggleOff className="text-gray-500" />}
                                            </button>
                                        </td>
                                        <td className="py-4 pr-4">
                                            {e.porOmision
                                                ? <span className="flex items-center gap-2 text-yellow-300 text-sm font-bold"><FaStar /> Por omisión</span>
                                                : <button onClick={() => accion(e, "por-omision")} className="text-gray-500 hover:text-yellow-300 text-xl" title="Poner por omisión"><FaRegStar /></button>}
                                        </td>
                                        <td className="py-4">
                                            <button onClick={() => abrir(e)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all" title="Editar"><FaEdit /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {editando && form && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
                            <div className="flex justify-between items-start p-6 pb-0">
                                <div>
                                    <h2 className="text-2xl font-black text-cyan-300">Editar esquema</h2>
                                    <p className="text-gray-500 text-xs mt-1">{editando.clave} · plantilla {nombrePlantilla(editando)}</p>
                                </div>
                                <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Nombre" span2><input value={form.nombre} onChange={set("nombre")} className={inputCls} /></Field>
                                    <Field label="Periodo de la liquidación">
                                        <select value={form.periodo} onChange={set("periodo")} className={selectCls}>
                                            {PERIODOS.map(p => <option key={p.value} value={p.value} disabled={p.disabled}>{p.label}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Qué fecha pone el viaje en el periodo"><Opciones valores={PERIODO_POR} value={form.periodoPor} onChange={set("periodoPor")} /></Field>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <p className="sm:col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Sueldo fijo</p>
                                    <Field label="Percepción fija (se lee del operador)"><Opciones valores={FIJA} value={form.fija} onChange={set("fija")} /></Field>
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="sm:col-span-2 flex items-center gap-3 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                                        <input type="checkbox" checked={form.conTrayecto} onChange={set("conTrayecto")} /> Pago por trayecto
                                    </label>
                                    {form.conTrayecto && (<>
                                        <Field label="Base"><Opciones valores={BASES} value={form.base} onChange={set("base")} /></Field>
                                        <Field label="Tasa">
                                            <select value={form.tasa} onChange={set("tasa")} className={selectCls}>
                                                {tasasDeLaBase.map(t => <option key={t} value={t}>{TASAS[t]}</option>)}
                                            </select>
                                        </Field>
                                        {tasasDeLaBase.length > 1 && (
                                            <Field label="Si falta, usar (respaldo)">
                                                <select value={form.respaldo} onChange={set("respaldo")} className={selectCls}>
                                                    <option value="">Ninguno: paga 0 y avisa</option>
                                                    {tasasDeLaBase.filter(t => t !== form.tasa).map(t => <option key={t} value={t}>{TASAS[t]}</option>)}
                                                </select>
                                            </Field>
                                        )}
                                        <Field label="Se etiqueta como"><Opciones valores={{ SUELDO: "Sueldo", COMISION: "Comisión" }} value={form.concepto} onChange={set("concepto")} /></Field>
                                        <Field label="Km que cuentan"><Opciones valores={FILTROS} value={form.filtroTrayecto} onChange={set("filtroTrayecto")} /></Field>
                                    </>)}
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <p className="sm:col-span-3 text-cyan-400 text-xs font-bold uppercase tracking-widest">Pago por viaje entregado</p>
                                    <Field label="Tipo"><Opciones valores={{ NINGUNO: "Ninguno", META_ESCALON: "Meta con escalón", FIJO: "Monto fijo" }} value={form.viaje} onChange={set("viaje")} /></Field>
                                    {form.viaje === "META_ESCALON" && (<>
                                        <Field label="Km que cuentan"><Opciones valores={FILTROS} value={form.filtroViaje} onChange={set("filtroViaje")} /></Field>
                                        <Field label="Umbral de km"><input type="number" value={form.umbralKm} onChange={set("umbralKm")} className={inputCls} /></Field>
                                        <Field label="Si se cumple: $ por km"><input type="number" step="0.01" value={form.tasaKm} onChange={set("tasaKm")} className={inputCls} /></Field>
                                        <Field label="Si no se cumple: monto fijo $"><input type="number" step="0.01" value={form.montoNoCumple} onChange={set("montoNoCumple")} className={inputCls} /></Field>
                                    </>)}
                                    {form.viaje === "FIJO" && (
                                        <Field label="Monto por viaje $"><input type="number" step="0.01" value={form.monto} onChange={set("monto")} className={inputCls} /></Field>
                                    )}
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <p className="sm:col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Opciones</p>
                                    <Field label="Trayecto sin marca de remolque"><Opciones valores={SIN_MARCA} value={form.trayectoSinMarca} onChange={set("trayectoSinMarca")} /></Field>
                                    <Field label="La meta se mide por"><Opciones valores={META_POR} value={form.metaPor} onChange={set("metaPor")} /></Field>
                                    <Field label="El auxiliar cobra"><Opciones valores={AUXILIAR} value={form.auxiliar} onChange={set("auxiliar")} /></Field>
                                    {form.auxiliar === "PORCENTAJE" && (
                                        <Field label="% del auxiliar"><input type="number" value={form.auxiliarPorcentaje} onChange={set("auxiliarPorcentaje")} className={inputCls} /></Field>
                                    )}
                                    <Field label="Los viajes se pagan (al cierre del mes: solo quincenal)"><Opciones valores={VIAJES_SE_PAGAN} value={form.viajesSePagan} onChange={set("viajesSePagan")} /></Field>
                                </div>

                                {errorGuardar && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm">{errorGuardar}</div>
                                )}
                            </div>

                            <div className="flex gap-4 p-6 pt-0">
                                <button onClick={() => setEditando(null)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={guardar} disabled={loading}
                                    className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : "Guardar"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
