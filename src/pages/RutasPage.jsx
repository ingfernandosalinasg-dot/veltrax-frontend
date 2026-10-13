import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaRoute, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaMapMarkedAlt, FaExclamationTriangle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
const API = API_URL;

const TABS = [
    { id: "trayectos",     label: "Trayectos" },
    { id: "conceptos",     label: "Conceptos de Facturación" },
    { id: "mercancias",    label: "Mercancías" },
    { id: "notificaciones",label: "Notificaciones a Contactos" },
    { id: "infoAd",        label: "Inf. Adicional" },
];

const TRAYECTO_SUBTABS = [
    { id: "gastos",     label: "Gastos Autorizados" },
    { id: "geocercas",  label: "Salidas/Llegadas por geocercas" },
    { id: "autopistas", label: "Detalle de autopistas" },
    { id: "ingresos",   label: "Ingresos" },
    { id: "percepciones", label: "Percepciones" },
];

const emptyFactoresSueldos = () => ({ sencilloCargado: "", fullCargado: "", sencilloVacio: "", fullVacio: "" });

const emptyTrayecto = () => ({
    origen: "", destino: "", horas: "", km: "", millas: "",
    tipoTrayecto: "Permanente", trayectoLiquidable: true,
    factores: emptyFactoresSueldos(),
    sueldos: emptyFactoresSueldos(),
    gastosAutorizados: [],
    geocercas: {
        geocercaSalida: "", condicionSalida: "ENTRA A LA GEOCERCA", estatusSalida: "DEJARLE EL ESTATUS QUE TIENE",
        geocercaLlegada: "", condicionLlegada: "ENTRA A LA GEOCERCA", estatusLlegada: "DEJARLE EL ESTATUS QUE TIENE",
    },
    detalleAutopistas: [],
    ingresos: [],
    percepciones: [],
});
const emptyGastoViaje = { concepto: "DIESEL A CREDITO", litros: "", galones: "", importe: "" };
const emptyCaseta = { caseta: "", vehiculo2Ejes: "", vehiculo3Ejes: "" };
const emptyIngresoTrayecto = { concepto: "", pesos: "", dolares: "" };
const emptyPercepcion = { codigo: "", percepcion: "", importe: "" };

const emptyConcepto = { codigo: "", concepto: "", pesos: "", dolares: "", trasladaIva: true, ivaTasa: "IVA 16%", retieneIva: false, retencionIvaTasa: "RETENCION IVA 4%", retieneIsr: false };

const emptyMercancia = {
    descripcion: "", unidadEmbalaje: "", unidadPeso: "", aplicarTarifaPor: "UNIDADES DE EMBALAJE",
    tarifaPesos: "", tarifaDolares: "", importeBaseLiquidacion: "", noIdentificacion: "", unidadAduana: "",
    claveProdServ: "", claveProdServDesc: "", claveUnidadEmbalaje: "", claveUnidadEmbalajeDesc: "",
    claveUnidadSat: "", claveUnidadSatDesc: "", materialPeligroso: false,
};

const emptyNotificacion = {
    contacto: "", eventos: {
        recibirFactura: false, recibirCartaPorte: false, permitirVerViajesUnidades: false,
        permitirVerSeguimientoChoferViaje: false, recibirEstadosCuenta: false,
    },
};

const emptyForm = {
    folioRuta: "", rutaActiva: true, viajeFacturable: true, viajeInternacional: false,
    tipoOperacion: "NO_APLICA",
    clienteId: "", remitenteId: "", destinatarioId: "",
    origenTexto: "", destinoTexto: "", descripcionRuta: "", regionIstmo: false,
    tipoUnidad: "TODOS LOS TIPOS DE UNIDADES",
    tipoViajeClave: "1", tipoViajeDesc: "NACIONAL",
    clasificacionClave: "", clasificacionDesc: "",
    importeBase: "", viajeRepartoRecolecta: false,
    item: "", planta: "", convenio: "",
    distanciaKm: "", tiempoEstimado: "", tarifa: "", notas: "", status: "Activa",
    monedaFacturar: "PESOS",
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

function Field({ label, children, span2 = false, span3 = false }) {
    return (
        <div className={span3 ? "col-span-3" : span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-xs mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}
function Check({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 cursor-pointer accent-cyan-400" />
            {label}
        </label>
    );
}

// Mensaje para un guardado o un borrado que el servidor rechazó: el que manda
// ({"error": mensaje}) o, si no hay, uno con el código. Un 403 llega con el
// cuerpo por defecto de Spring ("Forbidden"): falta de permiso o sesión vencida.
async function mensajeDeError(res, accion) {
    if (res.status === 403) return "No tienes permiso para esta acción o tu sesión expiró.";
    const cuerpo = await res.json().catch(() => null);
    return cuerpo?.error || `No se pudo ${accion} la ruta (error ${res.status}).`;
}

export default function RutasPage() {
    const [rutas,          setRutas]          = useState([]);
    const [clientes,       setClientes]       = useState([]);
    const [remitentes,     setRemitentes]     = useState([]);
    const [destinatarios,  setDestinatarios]  = useState([]);
    const [showModal,      setShowModal]      = useState(false);
    const [editando,       setEditando]       = useState(null);
    const [form,           setForm]           = useState(emptyForm);
    const [loading,        setLoading]        = useState(false);
    const [busqueda,       setBusqueda]       = useState("");
    const [activeTab,      setActiveTab]      = useState("trayectos");
    const [errorGuardar,   setErrorGuardar]   = useState("");
    const [errorBorrar,    setErrorBorrar]    = useState("");

    const [trayectos,        setTrayectos]        = useState([]);
    const [nuevoTrayecto,    setNuevoTrayecto]    = useState(emptyTrayecto());
    const [trayectoSubTab,   setTrayectoSubTab]   = useState("gastos");
    const [nuevoGasto,       setNuevoGasto]       = useState({ ...emptyGastoViaje });
    const [nuevaCaseta,      setNuevaCaseta]      = useState({ ...emptyCaseta });
    const [nuevoIngresoTray, setNuevoIngresoTray] = useState({ ...emptyIngresoTrayecto });
    const [nuevaPercepcion,  setNuevaPercepcion]  = useState({ ...emptyPercepcion });

    const [conceptos,     setConceptos]     = useState([]);
    const [nuevoConcepto, setNuevoConcepto] = useState({ ...emptyConcepto });

    const [mercancias,     setMercancias]     = useState([]);
    const [nuevaMercancia, setNuevaMercancia] = useState({ ...emptyMercancia });

    const [notificaciones,    setNotificaciones]    = useState([]);
    const [nuevaNotificacion, setNuevaNotificacion] = useState({ ...emptyNotificacion });

    const [infoAdicional, setInfoAdicional] = useState({ observaciones: "", referenciaInterna: "" });

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [rRes, cRes, remRes, destRes] = await Promise.all([
                fetch(`${API}/rutas`, { headers }),
                fetch(`${API}/clients`, { headers }),
                fetch(`${API}/remitentes`, { headers }),
                fetch(`${API}/destinatarios`, { headers }),
            ]);
            const [r, c, rem, dest] = await Promise.all([rRes.json(), cRes.json(), remRes.json(), destRes.json()]);
            setRutas(Array.isArray(r) ? r : []);
            setClientes(Array.isArray(c) ? c : []);
            setRemitentes(Array.isArray(rem) ? rem : []);
            setDestinatarios(Array.isArray(dest) ? dest : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const set  = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const setB = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

    const openNew = () => {
        setEditando(null);
        setForm(emptyForm);
        setTrayectos([]); setNuevoTrayecto(emptyTrayecto());
        setConceptos([]); setNuevoConcepto({ ...emptyConcepto });
        setMercancias([]); setNuevaMercancia({ ...emptyMercancia });
        setNotificaciones([]); setNuevaNotificacion({ ...emptyNotificacion });
        setInfoAdicional({ observaciones: "", referenciaInterna: "" });
        setActiveTab("trayectos");
        setErrorGuardar("");
        setShowModal(true);
    };

    const openEdit = (r) => {
        setEditando(r.id);
        setForm({ ...emptyForm, ...r, clienteId: r.cliente?.id || "", remitenteId: r.remitente?.id || "", destinatarioId: r.destinatario?.id || "" });
        try { setTrayectos(r.trayectosJson ? JSON.parse(r.trayectosJson) : []); } catch { setTrayectos([]); }
        try { setConceptos(r.conceptosFacturacionJson ? JSON.parse(r.conceptosFacturacionJson) : []); } catch { setConceptos([]); }
        try { setMercancias(r.mercanciasRutaJson ? JSON.parse(r.mercanciasRutaJson) : []); } catch { setMercancias([]); }
        try { setNotificaciones(r.notificacionesContactosJson ? JSON.parse(r.notificacionesContactosJson) : []); } catch { setNotificaciones([]); }
        try { setInfoAdicional(r.infoAdicionalJson ? JSON.parse(r.infoAdicionalJson) : { observaciones: "", referenciaInterna: "" }); } catch { setInfoAdicional({ observaciones: "", referenciaInterna: "" }); }
        setNuevoTrayecto(emptyTrayecto());
        setNuevoConcepto({ ...emptyConcepto });
        setNuevaMercancia({ ...emptyMercancia });
        setNuevaNotificacion({ ...emptyNotificacion });
        setActiveTab("trayectos");
        setErrorGuardar("");
        setShowModal(true);
    };

    const agregarGastoATrayecto = () => {
        if (!nuevoGasto.importe) return;
        setNuevoTrayecto(t => ({ ...t, gastosAutorizados: [...t.gastosAutorizados, nuevoGasto] }));
        setNuevoGasto({ ...emptyGastoViaje });
    };
    const agregarCasetaATrayecto = () => {
        if (!nuevaCaseta.caseta) return;
        setNuevoTrayecto(t => ({ ...t, detalleAutopistas: [...t.detalleAutopistas, nuevaCaseta] }));
        setNuevaCaseta({ ...emptyCaseta });
    };
    const agregarIngresoATrayecto = () => {
        if (!nuevoIngresoTray.concepto) return;
        setNuevoTrayecto(t => ({ ...t, ingresos: [...t.ingresos, nuevoIngresoTray] }));
        setNuevoIngresoTray({ ...emptyIngresoTrayecto });
    };
    const agregarPercepcionATrayecto = () => {
        if (!nuevaPercepcion.percepcion) return;
        setNuevoTrayecto(t => ({ ...t, percepciones: [...t.percepciones, nuevaPercepcion] }));
        setNuevaPercepcion({ ...emptyPercepcion });
    };
    const agregarTrayecto = () => {
        if (!nuevoTrayecto.origen || !nuevoTrayecto.destino) return;
        setTrayectos(ts => [...ts, nuevoTrayecto]);
        setNuevoTrayecto(emptyTrayecto());
        setTrayectoSubTab("gastos");
    };
    const quitarTrayecto = (idx) => setTrayectos(ts => ts.filter((_, i) => i !== idx));

    const agregarConcepto = () => {
        if (!nuevoConcepto.concepto) return;
        setConceptos(cs => [...cs, nuevoConcepto]);
        setNuevoConcepto({ ...emptyConcepto });
    };
    const quitarConcepto = (idx) => setConceptos(cs => cs.filter((_, i) => i !== idx));

    const agregarMercancia = () => {
        if (!nuevaMercancia.descripcion) return;
        setMercancias(ms => [...ms, nuevaMercancia]);
        setNuevaMercancia({ ...emptyMercancia });
    };
    const quitarMercancia = (idx) => setMercancias(ms => ms.filter((_, i) => i !== idx));

    const agregarNotificacion = () => {
        if (!nuevaNotificacion.contacto) return;
        setNotificaciones(ns => [...ns, nuevaNotificacion]);
        setNuevaNotificacion({ ...emptyNotificacion });
    };
    const quitarNotificacion = (idx) => setNotificaciones(ns => ns.filter((_, i) => i !== idx));

    // Si el servidor rechaza el guardado, el mensaje se muestra en la ventana,
    // que sigue abierta para corregir.
    const handleSubmit = async () => {
        setLoading(true);
        setErrorGuardar("");
        try {
            const payload = {
                ...form,
                distanciaKm: form.distanciaKm ? Number(form.distanciaKm) : null,
                tarifa: form.tarifa ? Number(form.tarifa) : null,
                importeBase: form.importeBase ? Number(form.importeBase) : null,
                trayectosJson: JSON.stringify(trayectos),
                conceptosFacturacionJson: JSON.stringify(conceptos),
                mercanciasRutaJson: JSON.stringify(mercancias),
                notificacionesContactosJson: JSON.stringify(notificaciones),
                infoAdicionalJson: JSON.stringify(infoAdicional),
            };
            const url    = editando ? `${API}/rutas/${editando}` : `${API}/rutas`;
            const method = editando ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (!res.ok) {
                setErrorGuardar(await mensajeDeError(res, "guardar"));
                return;
            }
            setShowModal(false);
            fetchAll();
        } catch (e) {
            console.error(e);
            setErrorGuardar("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    // Si el servidor rechaza el borrado (por ejemplo, 409 porque la ruta tiene
    // viajes), el mensaje se muestra en un letrero encima de la tabla.
    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar esta ruta?")) return;
        setErrorBorrar("");
        try {
            const res = await fetch(`${API}/rutas/${id}`, { method: "DELETE", headers });
            if (!res.ok) setErrorBorrar(await mensajeDeError(res, "eliminar"));
        } catch (e) {
            console.error(e);
            setErrorBorrar("No se pudo conectar con el servidor. Intenta de nuevo.");
        }
        fetchAll();
    };

    const filtradas = rutas.filter(r => {
        const origen = r.origenTexto || r.remitente?.ciudad || "";
        const destino = r.destinoTexto || r.destinatario?.ciudad || "";
        const cliente = r.cliente?.nombre || r.cliente?.name || "";
        const q = busqueda.toLowerCase();
        return origen.toLowerCase().includes(q) || destino.toLowerCase().includes(q) || cliente.toLowerCase().includes(q) || r.folioRuta?.toLowerCase().includes(q);
    });

    const activas = rutas.filter(r => r.rutaActiva !== false).length;
    const facturables = rutas.filter(r => r.viajeFacturable).length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <Topbar />
                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">RUTAS / TARIFAS</h1>
                        <p className="text-gray-400 mt-4 text-lg md:text-xl">Rutas, trayectos y tarifas por cliente</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Ruta
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mb-10">
                    {[
                        { label: "Total",       value: rutas.length, color: "text-cyan-400",  border: "border-cyan-500/20" },
                        { label: "Activas",     value: activas,      color: "text-green-400", border: "border-green-500/20" },
                        { label: "Facturables", value: facturables,  color: "text-blue-400",  border: "border-blue-500/20" },
                    ].map((s, i) => (
                        <div key={i} className={`rounded-3xl bg-white/5 border ${s.border} p-4 md:p-6 flex items-center gap-3 md:gap-5`}>
                            <FaRoute className={`text-2xl md:text-4xl ${s.color} flex-shrink-0`} />
                            <div className="min-w-0"><p className="text-gray-400 text-sm md:text-base truncate">{s.label}</p><h2 className={`text-2xl md:text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </div>
                    ))}
                </div>

                <div className="mb-6">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por folio, origen, destino o cliente..."
                        className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                {errorBorrar && (
                    <div role="alert" className="mb-6 px-4 py-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm flex items-start justify-between gap-4">
                        <span>{errorBorrar}</span>
                        <button onClick={() => setErrorBorrar("")} aria-label="Cerrar aviso" className="text-red-300 hover:text-white flex-shrink-0 mt-0.5"><FaTimes /></button>
                    </div>
                )}

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-4 md:p-8">
                    <h2 className="text-2xl md:text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaRoute /> Rutas Registradas</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio","Cliente","Origen","Destino","Distancia","Tiempo","Tarifa","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4 whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay rutas registradas</td></tr>
                                )}
                                {filtradas.map(r => (
                                    <tr key={r.id} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300 font-mono whitespace-nowrap">{r.folioRuta || "-"}</td>
                                        <td className="py-4 pr-4 whitespace-nowrap">{r.cliente?.nombre || r.cliente?.name || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-300 whitespace-nowrap">{r.origenTexto || r.remitente?.ciudad || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-300 whitespace-nowrap">{r.destinoTexto || r.destinatario?.ciudad || "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">{r.distanciaKm ? `${r.distanciaKm} km` : "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">{r.tiempoEstimado || "-"}</td>
                                        <td className="py-4 pr-4 text-green-300 font-bold whitespace-nowrap">{r.tarifa ? `$${r.tarifa.toLocaleString()}` : "-"}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${r.rutaActiva !== false ? "text-green-300 bg-green-500/10 border-green-400/30" : "text-red-300 bg-red-500/10 border-red-400/30"}`}>
                                                {r.rutaActiva !== false ? "Activa" : "Inactiva"}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(r)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                <button onClick={() => handleDelete(r.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col">
                            <div className="flex justify-between items-center p-5 sm:p-8 pb-0 flex-shrink-0">
                                <h2 className="text-xl sm:text-3xl font-black text-cyan-300">{editando ? "Editar Ruta/Tarifa" : "Agregando Ruta/Tarifa"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-cyan-400/10">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Información general de la ruta</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Folio Ruta">
                                            <input value={form.folioRuta} onChange={set("folioRuta")} placeholder="000001" className={inputCls + " font-bold text-cyan-300"} />
                                        </Field>
                                        <div className="flex items-end gap-4 pb-2.5 col-span-2">
                                            <Check label="Ruta Activa" checked={!!form.rutaActiva} onChange={setB("rutaActiva")} />
                                            <Check label="Viaje Facturable" checked={!!form.viajeFacturable} onChange={setB("viajeFacturable")} />
                                            <Check label="Viaje Internacional" checked={!!form.viajeInternacional} onChange={setB("viajeInternacional")} />
                                        </div>
                                        <Field label="Tipo de Operación">
                                            <select value={form.tipoOperacion} onChange={set("tipoOperacion")} className={selectCls}>
                                                <option value="NO_APLICA">NO APLICA</option>
                                                <option value="IMPORTACION">Importación</option>
                                                <option value="EXPORTACION">Exportación</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Cliente" span2>
                                            <select value={form.clienteId} onChange={set("clienteId")} className={selectCls}>
                                                <option value="">Seleccionar cliente...</option>
                                                {clientes.map(c => <option key={c.id} value={c.id}>{c.numeroCliente ? `[${c.numeroCliente}] ` : ""}{c.nombre || c.name}</option>)}
                                            </select>
                                        </Field>
                                        <div className="flex items-end pb-2.5">
                                            <Check label="Región ISTMO" checked={!!form.regionIstmo} onChange={setB("regionIstmo")} />
                                        </div>
                                        <div />
                                        <Field label="Origen">
                                            <input value={form.origenTexto} onChange={set("origenTexto")} placeholder="Ciudad, Estado" className={inputCls} />
                                        </Field>
                                        <Field label="Destino">
                                            <input value={form.destinoTexto} onChange={set("destinoTexto")} placeholder="Ciudad, Estado" className={inputCls} />
                                        </Field>
                                        <Field label="Descripción" span2>
                                            <input value={form.descripcionRuta} onChange={set("descripcionRuta")} placeholder="RUTA ORIGEN - DESTINO" className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Remitente">
                                            <select value={form.remitenteId} onChange={set("remitenteId")} className={selectCls}>
                                                <option value="">Seleccionar remitente...</option>
                                                {remitentes.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Destinatario">
                                            <select value={form.destinatarioId} onChange={set("destinatarioId")} className={selectCls}>
                                                <option value="">Seleccionar destinatario...</option>
                                                {destinatarios.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Tipo Unidad" span2>
                                            <select value={form.tipoUnidad} onChange={set("tipoUnidad")} className={selectCls}>
                                                <option>TODOS LOS TIPOS DE UNIDADES</option>
                                                <option>Trailer / Tractocamión</option><option>Torton</option><option>Rabon</option><option>Camión 3.5T</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Tipo de Viaje">
                                            <input value={form.tipoViajeDesc} onChange={set("tipoViajeDesc")} placeholder="NACIONAL" className={inputCls} />
                                        </Field>
                                        <Field label="Clasificación">
                                            <input value={form.clasificacionDesc} onChange={set("clasificacionDesc")} className={inputCls} />
                                        </Field>
                                        <Field label="Importe Base">
                                            <input type="number" value={form.importeBase} onChange={set("importeBase")} className={inputCls} />
                                        </Field>
                                        <div className="flex items-end pb-2.5">
                                            <Check label="Viaje reparto/recolecta" checked={!!form.viajeRepartoRecolecta} onChange={setB("viajeRepartoRecolecta")} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <Field label="Item"><input value={form.item} onChange={set("item")} className={inputCls} /></Field>
                                        <Field label="Planta"><input value={form.planta} onChange={set("planta")} className={inputCls} /></Field>
                                        <Field label="Convenio"><input value={form.convenio} onChange={set("convenio")} className={inputCls} /></Field>
                                        <Field label="Status">
                                            <select value={form.status} onChange={set("status")} className={selectCls}>
                                                <option>Activa</option><option>Inactiva</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>

                                <div className="px-5 sm:px-8 pt-4">
                                    <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/5 p-5 flex items-start gap-4">
                                        <FaExclamationTriangle className="text-yellow-400 text-xl flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-yellow-300 font-bold text-sm mb-1">Trazar tu ruta (pendiente)</p>
                                            <p className="text-gray-400 text-xs">El mapa interactivo con Google Maps (búsqueda de direcciones, trazado automático de ruta y cálculo de distancia) está pendiente de conectar — requiere una API Key de Google Maps con facturación activa. Mientras tanto, captura Kilómetros y Tiempo Estimado manualmente abajo, en cada trayecto.</p>
                                        </div>
                                        <FaMapMarkedAlt className="text-3xl text-gray-600 flex-shrink-0" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <Field label="Distancia total (km)">
                                            <input type="number" value={form.distanciaKm} onChange={set("distanciaKm")} className={inputCls} />
                                        </Field>
                                        <Field label="Tiempo estimado total">
                                            <input value={form.tiempoEstimado} onChange={set("tiempoEstimado")} placeholder="8 horas" className={inputCls} />
                                        </Field>
                                    </div>
                                </div>

                                <div className="flex gap-1 px-5 sm:px-8 pt-4 pb-1 overflow-x-auto sticky top-0 bg-[#020617] z-10 border-b border-cyan-400/10">
                                    {TABS.map(t => (
                                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all
                                                ${activeTab === t.id ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="px-5 sm:px-8 py-6">

                                    {activeTab === "trayectos" && (
                                        <div className="space-y-5">
                                            <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="bg-white/5 text-gray-400">
                                                            {["Secuencia","Origen","Destino","Kilómetros","Millas","Horas","Tipo",""].map(h => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {trayectos.length === 0 && (
                                                            <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin trayectos agregados</td></tr>
                                                        )}
                                                        {trayectos.map((t, i) => (
                                                            <tr key={i} className="border-t border-white/5">
                                                                <td className="px-3 py-2 text-cyan-300 font-bold">{i + 1}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">{t.origen}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">{t.destino}</td>
                                                                <td className="px-3 py-2">{t.km}</td>
                                                                <td className="px-3 py-2">{t.millas}</td>
                                                                <td className="px-3 py-2">{t.horas}</td>
                                                                <td className="px-3 py-2">{t.tipoTrayecto}</td>
                                                                <td className="px-3 py-2"><button onClick={() => quitarTrayecto(i)} className="text-red-400 hover:text-red-300"><FaTrash size={12} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="p-5 rounded-2xl border border-cyan-400/10 bg-white/5 space-y-4">
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Origen y Destino del Trayecto</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                                    <Field label="Origen" span2><input value={nuevoTrayecto.origen} onChange={e => setNuevoTrayecto(t => ({ ...t, origen: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Destino" span2><input value={nuevoTrayecto.destino} onChange={e => setNuevoTrayecto(t => ({ ...t, destino: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Horas"><input value={nuevoTrayecto.horas} onChange={e => setNuevoTrayecto(t => ({ ...t, horas: e.target.value }))} placeholder="1h 34 Min" className={inputCls} /></Field>
                                                    <Field label="Kilómetros"><input type="number" value={nuevoTrayecto.km} onChange={e => setNuevoTrayecto(t => ({ ...t, km: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Millas"><input type="number" value={nuevoTrayecto.millas} onChange={e => setNuevoTrayecto(t => ({ ...t, millas: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Tipo Trayecto">
                                                        <select value={nuevoTrayecto.tipoTrayecto} onChange={e => setNuevoTrayecto(t => ({ ...t, tipoTrayecto: e.target.value }))} className={selectCls}>
                                                            <option>Permanente</option><option>Eventual</option>
                                                        </select>
                                                    </Field>
                                                    <div className="flex items-end pb-2.5">
                                                        <Check label="Trayecto liquidable" checked={nuevoTrayecto.trayectoLiquidable} onChange={e => setNuevoTrayecto(t => ({ ...t, trayectoLiquidable: e.target.checked }))} />
                                                    </div>
                                                </div>

                                                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-400/10">
                                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Pesos - Factores y Sueldos por tipo de carga</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                                        <Field label="Factor Sencillo Cargado"><input type="number" value={nuevoTrayecto.factores.sencilloCargado} onChange={e => setNuevoTrayecto(t => ({ ...t, factores: { ...t.factores, sencilloCargado: e.target.value } }))} className={inputCls} /></Field>
                                                        <Field label="Factor Full Cargado/Cargado"><input type="number" value={nuevoTrayecto.factores.fullCargado} onChange={e => setNuevoTrayecto(t => ({ ...t, factores: { ...t.factores, fullCargado: e.target.value } }))} className={inputCls} /></Field>
                                                        <Field label="Factor Sencillo Vacío"><input type="number" value={nuevoTrayecto.factores.sencilloVacio} onChange={e => setNuevoTrayecto(t => ({ ...t, factores: { ...t.factores, sencilloVacio: e.target.value } }))} className={inputCls} /></Field>
                                                        <Field label="Factor Full Vacío/Vacío"><input type="number" value={nuevoTrayecto.factores.fullVacio} onChange={e => setNuevoTrayecto(t => ({ ...t, factores: { ...t.factores, fullVacio: e.target.value } }))} className={inputCls} /></Field>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <Field label="Sueldo/Comisión Sencillo Cargado"><input type="number" value={nuevoTrayecto.sueldos.sencilloCargado} onChange={e => setNuevoTrayecto(t => ({ ...t, sueldos: { ...t.sueldos, sencilloCargado: e.target.value } }))} className={inputCls} /></Field>
                                                        <Field label="Sueldo/Comisión Full Cargado/Cargado"><input type="number" value={nuevoTrayecto.sueldos.fullCargado} onChange={e => setNuevoTrayecto(t => ({ ...t, sueldos: { ...t.sueldos, fullCargado: e.target.value } }))} className={inputCls} /></Field>
                                                        <Field label="Sueldo/Comisión Sencillo Vacío"><input type="number" value={nuevoTrayecto.sueldos.sencilloVacio} onChange={e => setNuevoTrayecto(t => ({ ...t, sueldos: { ...t.sueldos, sencilloVacio: e.target.value } }))} className={inputCls} /></Field>
                                                        <Field label="Sueldo/Comisión Full Vacío/Vacío"><input type="number" value={nuevoTrayecto.sueldos.fullVacio} onChange={e => setNuevoTrayecto(t => ({ ...t, sueldos: { ...t.sueldos, fullVacio: e.target.value } }))} className={inputCls} /></Field>
                                                    </div>
                                                </div>

                                                <div className="flex gap-1 flex-wrap">
                                                    {TRAYECTO_SUBTABS.map(st => (
                                                        <button key={st.id} onClick={() => setTrayectoSubTab(st.id)} type="button"
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all
                                                                ${trayectoSubTab === st.id ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "bg-white/5 border border-transparent text-gray-500"}`}>
                                                            {st.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {trayectoSubTab === "gastos" && (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                                                            <Field label="Concepto de Gasto de Viaje">
                                                                <select value={nuevoGasto.concepto} onChange={e => setNuevoGasto(g => ({ ...g, concepto: e.target.value }))} className={selectCls}>
                                                                    <option>DIESEL A CREDITO</option><option>CASETAS</option><option>VIATICOS</option><option>OTRO</option>
                                                                </select>
                                                            </Field>
                                                            <Field label="Litros"><input type="number" value={nuevoGasto.litros} onChange={e => setNuevoGasto(g => ({ ...g, litros: e.target.value }))} className={inputCls} /></Field>
                                                            <Field label="Galones"><input type="number" value={nuevoGasto.galones} onChange={e => setNuevoGasto(g => ({ ...g, galones: e.target.value }))} className={inputCls} /></Field>
                                                            <div className="flex gap-2">
                                                                <Field label="Importe"><input type="number" value={nuevoGasto.importe} onChange={e => setNuevoGasto(g => ({ ...g, importe: e.target.value }))} className={inputCls} /></Field>
                                                                <button onClick={agregarGastoATrayecto} type="button" className="mb-0.5 px-3 rounded-xl bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold">+</button>
                                                            </div>
                                                        </div>
                                                        {nuevoTrayecto.gastosAutorizados.length > 0 && (
                                                            <div className="text-xs text-gray-400">{nuevoTrayecto.gastosAutorizados.map((g, i) => <div key={i}>{g.concepto} — {g.litros || 0} L / {g.galones || 0} Gal — ${g.importe}</div>)}</div>
                                                        )}
                                                    </div>
                                                )}

                                                {trayectoSubTab === "geocercas" && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-3">
                                                            <Field label="Geocerca que dispara salida"><input value={nuevoTrayecto.geocercas.geocercaSalida} onChange={e => setNuevoTrayecto(t => ({ ...t, geocercas: { ...t.geocercas, geocercaSalida: e.target.value } }))} className={inputCls} /></Field>
                                                            <Field label="Dar salida al trayecto cuando">
                                                                <select value={nuevoTrayecto.geocercas.condicionSalida} onChange={e => setNuevoTrayecto(t => ({ ...t, geocercas: { ...t.geocercas, condicionSalida: e.target.value } }))} className={selectCls}>
                                                                    <option>ENTRA A LA GEOCERCA</option><option>SALE DE LA GEOCERCA</option>
                                                                </select>
                                                            </Field>
                                                            <Field label="Asignar el sig Estatus al viaje">
                                                                <select value={nuevoTrayecto.geocercas.estatusSalida} onChange={e => setNuevoTrayecto(t => ({ ...t, geocercas: { ...t.geocercas, estatusSalida: e.target.value } }))} className={selectCls}>
                                                                    <option>DEJARLE EL ESTATUS QUE TIENE</option><option>EN RUTA</option><option>ENTREGADO</option>
                                                                </select>
                                                            </Field>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Field label="Geocerca que dispara llegada"><input value={nuevoTrayecto.geocercas.geocercaLlegada} onChange={e => setNuevoTrayecto(t => ({ ...t, geocercas: { ...t.geocercas, geocercaLlegada: e.target.value } }))} className={inputCls} /></Field>
                                                            <Field label="Dar llegada al trayecto cuando">
                                                                <select value={nuevoTrayecto.geocercas.condicionLlegada} onChange={e => setNuevoTrayecto(t => ({ ...t, geocercas: { ...t.geocercas, condicionLlegada: e.target.value } }))} className={selectCls}>
                                                                    <option>ENTRA A LA GEOCERCA</option><option>SALE DE LA GEOCERCA</option>
                                                                </select>
                                                            </Field>
                                                            <Field label="Asignar el sig Estatus al viaje">
                                                                <select value={nuevoTrayecto.geocercas.estatusLlegada} onChange={e => setNuevoTrayecto(t => ({ ...t, geocercas: { ...t.geocercas, estatusLlegada: e.target.value } }))} className={selectCls}>
                                                                    <option>DEJARLE EL ESTATUS QUE TIENE</option><option>ENTREGADO</option>
                                                                </select>
                                                            </Field>
                                                        </div>
                                                    </div>
                                                )}

                                                {trayectoSubTab === "autopistas" && (
                                                    <div className="space-y-3">
                                                        <p className="text-gray-500 text-xs">Sincronización automática de casetas requiere el mapa (pendiente de API Key).</p>
                                                        <div className="grid grid-cols-3 gap-3 items-end">
                                                            <Field label="Caseta"><input value={nuevaCaseta.caseta} onChange={e => setNuevaCaseta(c => ({ ...c, caseta: e.target.value }))} className={inputCls} /></Field>
                                                            <Field label="Vehículo 2 Ejes"><input type="number" value={nuevaCaseta.vehiculo2Ejes} onChange={e => setNuevaCaseta(c => ({ ...c, vehiculo2Ejes: e.target.value }))} className={inputCls} /></Field>
                                                            <div className="flex gap-2">
                                                                <Field label="Vehículo 3 Ejes"><input type="number" value={nuevaCaseta.vehiculo3Ejes} onChange={e => setNuevaCaseta(c => ({ ...c, vehiculo3Ejes: e.target.value }))} className={inputCls} /></Field>
                                                                <button onClick={agregarCasetaATrayecto} type="button" className="mb-0.5 px-3 rounded-xl bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold">+</button>
                                                            </div>
                                                        </div>
                                                        {nuevoTrayecto.detalleAutopistas.length > 0 && (
                                                            <div className="text-xs text-gray-400">{nuevoTrayecto.detalleAutopistas.map((c, i) => <div key={i}>{c.caseta} — 2 ejes: ${c.vehiculo2Ejes || 0} / 3 ejes: ${c.vehiculo3Ejes || 0}</div>)}</div>
                                                        )}
                                                    </div>
                                                )}

                                                {trayectoSubTab === "ingresos" && (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-3 items-end">
                                                            <Field label="Concepto de facturación"><input value={nuevoIngresoTray.concepto} onChange={e => setNuevoIngresoTray(g => ({ ...g, concepto: e.target.value }))} placeholder="FLETE" className={inputCls} /></Field>
                                                            <Field label="Pesos"><input type="number" value={nuevoIngresoTray.pesos} onChange={e => setNuevoIngresoTray(g => ({ ...g, pesos: e.target.value }))} className={inputCls} /></Field>
                                                            <div className="flex gap-2">
                                                                <Field label="Dólares"><input type="number" value={nuevoIngresoTray.dolares} onChange={e => setNuevoIngresoTray(g => ({ ...g, dolares: e.target.value }))} className={inputCls} /></Field>
                                                                <button onClick={agregarIngresoATrayecto} type="button" className="mb-0.5 px-3 rounded-xl bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold">+</button>
                                                            </div>
                                                        </div>
                                                        {nuevoTrayecto.ingresos.length > 0 && (
                                                            <div className="text-xs text-gray-400">{nuevoTrayecto.ingresos.map((g, i) => <div key={i}>{g.concepto} — ${g.pesos || 0} / ${g.dolares || 0} USD</div>)}</div>
                                                        )}
                                                    </div>
                                                )}

                                                {trayectoSubTab === "percepciones" && (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-3 items-end">
                                                            <Field label="Código"><input value={nuevaPercepcion.codigo} onChange={e => setNuevaPercepcion(p => ({ ...p, codigo: e.target.value }))} className={inputCls} /></Field>
                                                            <Field label="Percepción"><input value={nuevaPercepcion.percepcion} onChange={e => setNuevaPercepcion(p => ({ ...p, percepcion: e.target.value }))} className={inputCls} /></Field>
                                                            <div className="flex gap-2">
                                                                <Field label="Importe"><input type="number" value={nuevaPercepcion.importe} onChange={e => setNuevaPercepcion(p => ({ ...p, importe: e.target.value }))} className={inputCls} /></Field>
                                                                <button onClick={agregarPercepcionATrayecto} type="button" className="mb-0.5 px-3 rounded-xl bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold">+</button>
                                                            </div>
                                                        </div>
                                                        {nuevoTrayecto.percepciones.length > 0 && (
                                                            <div className="text-xs text-gray-400">{nuevoTrayecto.percepciones.map((p, i) => <div key={i}>{p.codigo} {p.percepcion} — ${p.importe}</div>)}</div>
                                                        )}
                                                    </div>
                                                )}

                                                <button onClick={agregarTrayecto} type="button"
                                                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-sm">
                                                    Agregar Trayecto
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "conceptos" && (
                                        <div className="space-y-5">
                                            <Field label="Moneda a Facturar" span2>
                                                <select value={form.monedaFacturar} onChange={set("monedaFacturar")} className={selectCls}>
                                                    <option>PESOS</option><option>DÓLARES</option>
                                                </select>
                                            </Field>
                                            <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="bg-white/5 text-gray-400">
                                                            {["Código","Concepto Facturación","Pesos","Dólares","Traslada","Retiene","Retiene ISR",""].map(h => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {conceptos.length === 0 && (
                                                            <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin conceptos agregados</td></tr>
                                                        )}
                                                        {conceptos.map((c, i) => (
                                                            <tr key={i} className="border-t border-white/5">
                                                                <td className="px-3 py-2 text-cyan-300 font-bold">{i + 1}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">{c.concepto}</td>
                                                                <td className="px-3 py-2">${Number(c.pesos || 0).toLocaleString()}</td>
                                                                <td className="px-3 py-2">${Number(c.dolares || 0).toLocaleString()}</td>
                                                                <td className="px-3 py-2">{c.trasladaIva ? c.ivaTasa : "-"}</td>
                                                                <td className="px-3 py-2">{c.retieneIva ? c.retencionIvaTasa : "-"}</td>
                                                                <td className="px-3 py-2">{c.retieneIsr ? "Sí" : "-"}</td>
                                                                <td className="px-3 py-2"><button onClick={() => quitarConcepto(i)} className="text-red-400 hover:text-red-300"><FaTrash size={12} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="p-5 rounded-2xl border border-cyan-400/10 bg-white/5 space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Concepto"><input value={nuevoConcepto.concepto} onChange={e => setNuevoConcepto(c => ({ ...c, concepto: e.target.value }))} placeholder="FLETE" className={inputCls} /></Field>
                                                    <Field label="Código"><input value={nuevoConcepto.codigo} onChange={e => setNuevoConcepto(c => ({ ...c, codigo: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Pesos"><input type="number" value={nuevoConcepto.pesos} onChange={e => setNuevoConcepto(c => ({ ...c, pesos: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Dólares"><input type="number" value={nuevoConcepto.dolares} onChange={e => setNuevoConcepto(c => ({ ...c, dolares: e.target.value }))} className={inputCls} /></Field>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <Check label="Traslada IVA" checked={nuevoConcepto.trasladaIva} onChange={e => setNuevoConcepto(c => ({ ...c, trasladaIva: e.target.checked }))} />
                                                        <select value={nuevoConcepto.ivaTasa} onChange={e => setNuevoConcepto(c => ({ ...c, ivaTasa: e.target.value }))} className={selectCls} disabled={!nuevoConcepto.trasladaIva}>
                                                            <option>IVA 16%</option><option>IVA 0%</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Check label="Retiene IVA" checked={nuevoConcepto.retieneIva} onChange={e => setNuevoConcepto(c => ({ ...c, retieneIva: e.target.checked }))} />
                                                        <select value={nuevoConcepto.retencionIvaTasa} onChange={e => setNuevoConcepto(c => ({ ...c, retencionIvaTasa: e.target.value }))} className={selectCls} disabled={!nuevoConcepto.retieneIva}>
                                                            <option>RETENCION IVA 4%</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <Check label="Retiene ISR" checked={nuevoConcepto.retieneIsr} onChange={e => setNuevoConcepto(c => ({ ...c, retieneIsr: e.target.checked }))} />
                                                <button onClick={agregarConcepto} type="button"
                                                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-sm">
                                                    Agregar Concepto
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "mercancias" && (
                                        <div className="space-y-5">
                                            <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="bg-white/5 text-gray-400">
                                                            {["Descripción","Unidad Embalaje","Unidad Peso","Aplicar Tarifa Por","Tarifa","Tarifa Dlls",""].map(h => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mercancias.length === 0 && (
                                                            <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Sin mercancías agregadas</td></tr>
                                                        )}
                                                        {mercancias.map((m, i) => (
                                                            <tr key={i} className="border-t border-white/5">
                                                                <td className="px-3 py-2 font-bold whitespace-nowrap">{m.descripcion}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">{m.unidadEmbalaje}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">{m.unidadPeso}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">{m.aplicarTarifaPor}</td>
                                                                <td className="px-3 py-2">${Number(m.tarifaPesos || 0).toLocaleString()}</td>
                                                                <td className="px-3 py-2">${Number(m.tarifaDolares || 0).toLocaleString()}</td>
                                                                <td className="px-3 py-2"><button onClick={() => quitarMercancia(i)} className="text-red-400 hover:text-red-300"><FaTrash size={12} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="p-5 rounded-2xl border border-cyan-400/10 bg-white/5 space-y-4">
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Agregar Material</p>
                                                <Field label="Descripción material" span2>
                                                    <input value={nuevaMercancia.descripcion} onChange={e => setNuevaMercancia(m => ({ ...m, descripcion: e.target.value }))} className={inputCls} />
                                                </Field>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <Field label="Unidad de embalaje"><input value={nuevaMercancia.unidadEmbalaje} onChange={e => setNuevaMercancia(m => ({ ...m, unidadEmbalaje: e.target.value }))} placeholder="LITROS" className={inputCls} /></Field>
                                                    <Field label="Unidad peso"><input value={nuevaMercancia.unidadPeso} onChange={e => setNuevaMercancia(m => ({ ...m, unidadPeso: e.target.value }))} placeholder="KILOGRAMOS" className={inputCls} /></Field>
                                                    <Field label="Aplicar tarifa por">
                                                        <select value={nuevaMercancia.aplicarTarifaPor} onChange={e => setNuevaMercancia(m => ({ ...m, aplicarTarifaPor: e.target.value }))} className={selectCls}>
                                                            <option>UNIDADES DE EMBALAJE</option><option>PESO</option><option>VIAJE</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Tarifa Pesos"><input type="number" value={nuevaMercancia.tarifaPesos} onChange={e => setNuevaMercancia(m => ({ ...m, tarifaPesos: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Tarifa dólares"><input type="number" value={nuevaMercancia.tarifaDolares} onChange={e => setNuevaMercancia(m => ({ ...m, tarifaDolares: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Importe base liquidación"><input type="number" value={nuevaMercancia.importeBaseLiquidacion} onChange={e => setNuevaMercancia(m => ({ ...m, importeBaseLiquidacion: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="No. de Identificación"><input value={nuevaMercancia.noIdentificacion} onChange={e => setNuevaMercancia(m => ({ ...m, noIdentificacion: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Unidad Aduana"><input value={nuevaMercancia.unidadAduana} onChange={e => setNuevaMercancia(m => ({ ...m, unidadAduana: e.target.value }))} placeholder="KILO" className={inputCls} /></Field>
                                                </div>

                                                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest pt-2">Complemento Carta Porte — Mercancía (SAT)</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <Field label="Clave SAT Productos y servicios"><input value={nuevaMercancia.claveProdServ} onChange={e => setNuevaMercancia(m => ({ ...m, claveProdServ: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Clave SAT Unidades de medida y embalaje"><input value={nuevaMercancia.claveUnidadEmbalaje} onChange={e => setNuevaMercancia(m => ({ ...m, claveUnidadEmbalaje: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Clave SAT Unidad"><input value={nuevaMercancia.claveUnidadSat} onChange={e => setNuevaMercancia(m => ({ ...m, claveUnidadSat: e.target.value }))} className={inputCls} /></Field>
                                                </div>
                                                <Check label="Material peligroso" checked={nuevaMercancia.materialPeligroso} onChange={e => setNuevaMercancia(m => ({ ...m, materialPeligroso: e.target.checked }))} />
                                                <p className="text-gray-500 text-xs">Sector COFEPRIS y Control Volumétrico estarán disponibles próximamente.</p>

                                                <button onClick={agregarMercancia} type="button"
                                                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-sm">
                                                    Agregar Material
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "notificaciones" && (
                                        <div className="space-y-5">
                                            <p className="text-gray-500 text-xs">Selecciona qué contactos del cliente reciben notificaciones de esta ruta y qué eventos les llegan.</p>
                                            <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="bg-white/5 text-gray-400">
                                                            {["Contacto","Eventos configurados",""].map(h => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {notificaciones.length === 0 && (
                                                            <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">Sin notificaciones configuradas</td></tr>
                                                        )}
                                                        {notificaciones.map((n, i) => (
                                                            <tr key={i} className="border-t border-white/5">
                                                                <td className="px-3 py-2 whitespace-nowrap">{n.contacto}</td>
                                                                <td className="px-3 py-2 text-gray-400">{Object.values(n.eventos).filter(Boolean).length} activos</td>
                                                                <td className="px-3 py-2"><button onClick={() => quitarNotificacion(i)} className="text-red-400 hover:text-red-300"><FaTrash size={12} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-5 rounded-2xl border border-cyan-400/10 bg-white/5 space-y-4">
                                                <Field label="Contacto (nombre o correo)">
                                                    <input value={nuevaNotificacion.contacto} onChange={e => setNuevaNotificacion(n => ({ ...n, contacto: e.target.value }))} className={inputCls} />
                                                </Field>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <Check label="Recibir Factura" checked={nuevaNotificacion.eventos.recibirFactura} onChange={e => setNuevaNotificacion(n => ({ ...n, eventos: { ...n.eventos, recibirFactura: e.target.checked } }))} />
                                                    <Check label="Recibir Carta Porte" checked={nuevaNotificacion.eventos.recibirCartaPorte} onChange={e => setNuevaNotificacion(n => ({ ...n, eventos: { ...n.eventos, recibirCartaPorte: e.target.checked } }))} />
                                                    <Check label="Permitir ver seguimiento de viajes/unidades" checked={nuevaNotificacion.eventos.permitirVerViajesUnidades} onChange={e => setNuevaNotificacion(n => ({ ...n, eventos: { ...n.eventos, permitirVerViajesUnidades: e.target.checked } }))} />
                                                    <Check label="Permitir ver seguimiento al asignar chofer" checked={nuevaNotificacion.eventos.permitirVerSeguimientoChoferViaje} onChange={e => setNuevaNotificacion(n => ({ ...n, eventos: { ...n.eventos, permitirVerSeguimientoChoferViaje: e.target.checked } }))} />
                                                    <Check label="Recibir Estados de Cuenta" checked={nuevaNotificacion.eventos.recibirEstadosCuenta} onChange={e => setNuevaNotificacion(n => ({ ...n, eventos: { ...n.eventos, recibirEstadosCuenta: e.target.checked } }))} />
                                                </div>
                                                <button onClick={agregarNotificacion} type="button"
                                                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-sm">
                                                    Agregar Notificación
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "infoAd" && (
                                        <div className="space-y-5">
                                            <Field label="Referencia interna">
                                                <input value={infoAdicional.referenciaInterna} onChange={e => setInfoAdicional(a => ({ ...a, referenciaInterna: e.target.value }))} className={inputCls} />
                                            </Field>
                                            <Field label="Observaciones adicionales">
                                                <textarea value={infoAdicional.observaciones} onChange={e => setInfoAdicional(a => ({ ...a, observaciones: e.target.value }))} rows={6} className={inputCls + " resize-none"} />
                                            </Field>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {errorGuardar && (
                                <p role="alert" className="mx-5 sm:mx-8 mt-4 px-4 py-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm flex-shrink-0">
                                    {errorGuardar}
                                </p>
                            )}
                            <div className="flex gap-4 p-5 sm:p-8 pt-4 flex-shrink-0 border-t border-cyan-400/10">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 sm:py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-3 sm:py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Ruta"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
