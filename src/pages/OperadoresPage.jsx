import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaIdCard, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaSearch } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const TABS = [
    { id: "general",      label: "Información General" },
    { id: "domicilio",    label: "Domicilio" },
    { id: "cfdi",         label: "Liquidaciones CFDI" },
    { id: "valores",      label: "Valores p/Liquidar" },
    { id: "mas",          label: "Más Información" },
    { id: "documentos",   label: "Fotos / Documentos" },
];

const emptyDocumento = { documento: "", nombre: "", fechaVencimiento: "", conVencimiento: true };

const emptyTasa = { kms: "", mi: "" };
const emptyTasasMoneda = () => ({
    sencilloCargado: { sinPeligroso: { ...emptyTasa }, conPeligroso: { ...emptyTasa } },
    sencilloVacio:   { sinPeligroso: { ...emptyTasa }, conPeligroso: { ...emptyTasa } },
    fullCargado:     { sinPeligroso: { ...emptyTasa }, conPeligroso: { ...emptyTasa } },
    fullVacio:       { sinPeligroso: { ...emptyTasa }, conPeligroso: { ...emptyTasa } },
});
const emptyValoresLiquidar = {
    pctSencilloCargado: "", pctFullCargado: "", pctSencilloVacio: "", pctFullVacio: "",
    sueldoSemanal: "", sueldoDiario: "", sueldoDiarioIntegrado: "", sbc: "",
    tasas: { pesos: emptyTasasMoneda(), dolares: emptyTasasMoneda() },
};

const FILAS_TASAS = [
    { key: "sencilloCargado", label: "Sencillo Cargado" },
    { key: "sencilloVacio",   label: "Sencillo Vacío" },
    { key: "fullCargado",     label: "Full Cargado/Cargado" },
    { key: "fullVacio",       label: "Full Vacío/Vacío" },
];

const emptyForm = {
    // Encabezado general
    name: "", apellidos: "", curp: "", fechaContratacion: "", sucursal: "",
    telefono: "", celular: "", registroPatronal: "", observaciones: "", email: "",
    status: "Disponible",
    // Base
    licenseNumber: "", licenciaTipo: "E", licenseExpiration: "",
    vehiculoTipo: "", vehiculoMarca: "", vehiculoModelo: "", vehiculoAnio: "",
    vehiculoPlacas: "", vehiculoColor: "",
    tarjetaCirculacion: "", polizaSeguro: "", vigenciaSeguro: "",
    direccion: "", ciudad: "", pais: "México", notas: "",
    // SAT
    figuraTransporte: "", figuraTransporteDesc: "", rfcOperador: "", numLicenciaFederal: "",
    // Información General nuevo
    licenciaB: false, licenciaC: false, licenciaE: false,
    pasaporte: "", vencimientoPasaporte: "",
    noImss: "", grupoSanguineo: "", alergias: "", diabetico: false, hipertenso: false,
    banco: "", cuentaClabe: "", noTarjeta: "",
    // Domicilio nuevo
    domicilioPais: "México", domicilioEstado: "", domicilioMunicipio: "", domicilioLocalidad: "",
    domicilioCp: "", domicilioColonia: "", domicilioCalle: "", domicilioNumInt: "", domicilioNumExt: "",
    domicilioReferencia: "",
    // Liquidaciones CFDI nuevo
    tipoRegimen: "", departamento: "", tipoContrato: "", tipoJornada: "",
    periodicidadPago: "", riesgoPuesto: "", clasificaciones: "",
    // Más Información nuevo
    tipoOperacion: "1) CARRETERO", estadoCivil: "", beneficiarioFallecimiento: "",
    avisarAccidente: "", puesto: "", sexo: "", fechaNacimiento: "",
    factorVsmInfonavit: "", factorPctInfonavit: "",
    retencionDiariaInfonavit: "", retencionDiariaFonacot: "", retencionDiariaImss: "",
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

function SectionTitle({ children }) {
    return <div className="col-span-3 bg-white/5 rounded-lg px-3 py-1.5 text-cyan-400 text-xs font-bold uppercase tracking-widest">{children}</div>;
}

function SatPicker({ label, tipo, value, valueDesc, onChange, placeholder, span2 = false }) {
    const [query,   setQuery]   = useState(value ? `${value} - ${valueDesc || ""}` : "");
    const [results, setResults] = useState([]);
    const [open,    setOpen]    = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const buscar = useCallback(async (q) => {
        if (!q || q.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const res  = await fetch(`${API}/catalogos-sat/${tipo}?q=${encodeURIComponent(q)}&limit=30`, { headers });
            const data = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (e) { setResults([]); }
        setLoading(false);
    }, [tipo]);
    const handleInput = (e) => {
        const q = e.target.value;
        setQuery(q);
        setOpen(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => buscar(q), 300);
    };
    const seleccionar = (item) => {
        setQuery(`${item.clave} - ${item.descripcion}`);
        setOpen(false);
        onChange(item.clave, item.descripcion);
    };
    const limpiar = () => { setQuery(""); setResults([]); setOpen(false); onChange("", ""); };
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-xs mb-1.5 block">{label}</label>
            <div className="relative">
                <div className="relative flex items-center">
                    <FaSearch className="absolute left-4 text-gray-500 text-xs pointer-events-none" />
                    <input value={query} onChange={handleInput} onFocus={() => { if (query.length >= 2) setOpen(true); }}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-10 pr-10 py-2.5 text-white outline-none focus:border-cyan-400/40 transition-all text-sm" />
                    {value && <button onClick={limpiar} className="absolute right-3 text-gray-500 hover:text-red-400 text-xs"><FaTimes /></button>}
                </div>
                {value && (
                    <div className="mt-1 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-xs text-cyan-300 flex items-center gap-2">
                        <span className="font-mono font-bold">{value}</span>
                        <span className="text-gray-400">-</span>
                        <span className="truncate">{valueDesc}</span>
                    </div>
                )}
                {open && query.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#080d1a] border border-cyan-400/20 rounded-2xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                        {loading && <p className="text-gray-500 text-sm text-center py-4">Buscando...</p>}
                        {!loading && results.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Sin resultados</p>}
                        {results.map(r => (
                            <button key={r.id} type="button" onClick={() => seleccionar(r)}
                                className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 transition-all border-b border-white/5 last:border-0">
                                <span className="font-mono text-cyan-300 text-xs font-bold mr-2">{r.clave}</span>
                                <span className="text-gray-300 text-xs">{r.descripcion}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function diasParaVencer(fecha) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function OperadoresPage() {
    const [operadores, setOperadores] = useState([]);
    const [showModal,  setShowModal]  = useState(false);
    const [editando,   setEditando]   = useState(null);
    const [form,       setForm]       = useState(emptyForm);
    const [loading,    setLoading]    = useState(false);
    const [busqueda,   setBusqueda]   = useState("");
    const [activeTab,  setActiveTab]  = useState("general");

    const [valores, setValores]   = useState(emptyValoresLiquidar);
    const [moneda,  setMoneda]    = useState("pesos");

    const [documentos, setDocumentos] = useState([]);
    const [nuevoDoc,   setNuevoDoc]   = useState({ ...emptyDocumento });

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchOperadores = async () => {
        try {
            const res  = await fetch(`${API}/drivers`, { headers });
            const data = await res.json();
            setOperadores(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchOperadores(); }, []);

    const set  = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const setB = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));
    const setSat = (claveF, descF) => (clave, desc) => setForm(f => ({ ...f, [claveF]: clave, [descF]: desc }));

    const setValor = (field) => (e) => setValores(v => ({ ...v, [field]: e.target.value }));
    const setTasa = (fila, sub, campo) => (e) => {
        const val = e.target.value;
        setValores(v => ({
            ...v,
            tasas: {
                ...v.tasas,
                [moneda]: {
                    ...v.tasas[moneda],
                    [fila]: { ...v.tasas[moneda][fila], [sub]: { ...v.tasas[moneda][fila][sub], [campo]: val } },
                },
            },
        }));
    };

    const openNew = () => {
        setEditando(null);
        setForm(emptyForm);
        setValores(emptyValoresLiquidar);
        setDocumentos([]);
        setNuevoDoc({ ...emptyDocumento });
        setMoneda("pesos");
        setActiveTab("general");
        setShowModal(true);
    };

    const openEdit = (o) => {
        setEditando(o.id);
        setForm({ ...emptyForm, ...o });
        try {
            const parsed = o.valoresLiquidarJson ? JSON.parse(o.valoresLiquidarJson) : emptyValoresLiquidar;
            setValores({ ...emptyValoresLiquidar, ...parsed, tasas: { pesos: { ...emptyTasasMoneda(), ...(parsed.tasas?.pesos || {}) }, dolares: { ...emptyTasasMoneda(), ...(parsed.tasas?.dolares || {}) } } });
        } catch { setValores(emptyValoresLiquidar); }
        try { setDocumentos(o.documentosJson ? JSON.parse(o.documentosJson) : []); } catch { setDocumentos([]); }
        setNuevoDoc({ ...emptyDocumento });
        setMoneda("pesos");
        setActiveTab("general");
        setShowModal(true);
    };

    const agregarDocumento = () => {
        if (!nuevoDoc.documento && !nuevoDoc.nombre) return;
        setDocumentos(ds => [...ds, nuevoDoc]);
        setNuevoDoc({ ...emptyDocumento });
    };
    const quitarDocumento = (idx) => setDocumentos(ds => ds.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url    = editando ? `${API}/drivers/${editando}` : `${API}/drivers`;
            const method = editando ? "PUT" : "POST";
            const numFields = ["factorVsmInfonavit","factorPctInfonavit","retencionDiariaInfonavit","retencionDiariaFonacot","retencionDiariaImss"];
            const payload = { ...form };
            numFields.forEach(f => { payload[f] = payload[f] !== "" && payload[f] !== null ? Number(payload[f]) : null; });
            payload.valoresLiquidarJson = JSON.stringify(valores);
            payload.documentosJson = JSON.stringify(documentos);

            await fetch(url, { method, headers, body: JSON.stringify(payload) });
            setShowModal(false);
            fetchOperadores();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este operador?")) return;
        try { await fetch(`${API}/drivers/${id}`, { method: "DELETE", headers }); fetchOperadores(); }
        catch (e) { console.error(e); }
    };

    const filtrados = operadores.filter(o =>
        `${o.name} ${o.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
        o.licenseNumber?.toLowerCase().includes(busqueda.toLowerCase()) ||
        o.vehiculoPlacas?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const activos   = operadores.filter(o => o.status === "Disponible").length;
    const porVencer = operadores.filter(o => { const d = diasParaVencer(o.licenseExpiration); return d !== null && d <= 30 && d >= 0; }).length;
    const vencidos  = operadores.filter(o => { const d = diasParaVencer(o.licenseExpiration); return d !== null && d < 0; }).length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">OPERADORES</h1>
                        <p className="text-gray-400 mt-4 text-lg md:text-xl">Catálogo de conductores y operadores</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Operador
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 mb-10">
                    {[
                        { label: "Total",       value: operadores.length, color: "text-cyan-400",   border: "border-cyan-500/20" },
                        { label: "Disponibles", value: activos,           color: "text-green-400",  border: "border-green-500/20" },
                        { label: "Por vencer",  value: porVencer,         color: "text-yellow-400", border: "border-yellow-500/20" },
                        { label: "Vencidos",    value: vencidos,          color: "text-red-400",    border: "border-red-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-4 md:p-6 flex items-center gap-3 md:gap-5`}>
                            <FaIdCard className={`text-2xl md:text-4xl ${s.color} flex-shrink-0`} />
                            <div className="min-w-0"><p className="text-gray-400 text-sm md:text-base truncate">{s.label}</p><h2 className={`text-2xl md:text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="mb-6">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, licencia o placas..."
                        className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-4 md:p-8">
                    <h2 className="text-2xl md:text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaIdCard /> Operadores Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre","RFC","Figura SAT","Licencia","Vigencia","Placas","Teléfono","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-5 whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay operadores registrados</td></tr>
                                )}
                                {filtrados.map((o, i) => {
                                    const dias = diasParaVencer(o.licenseExpiration);
                                    const vigColor = dias === null ? "text-gray-400" : dias < 0 ? "text-red-400" : dias <= 30 ? "text-yellow-400" : "text-green-400";
                                    return (
                                        <motion.tr key={o.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-4 pr-5 whitespace-nowrap">
                                                <div className="font-bold">{o.name} {o.apellidos}</div>
                                                <div className="text-xs text-gray-500">{o.email}</div>
                                            </td>
                                            <td className="py-4 pr-5 text-cyan-300 font-mono text-xs whitespace-nowrap">{o.rfcOperador || "-"}</td>
                                            <td className="py-4 pr-5">
                                                {o.figuraTransporte
                                                    ? <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold">{o.figuraTransporte}</span>
                                                    : <span className="text-gray-600">-</span>}
                                            </td>
                                            <td className="py-4 pr-5 text-cyan-300 font-mono text-sm whitespace-nowrap">{o.licenseNumber || "-"}</td>
                                            <td className={`py-4 pr-5 font-bold text-sm whitespace-nowrap ${vigColor}`}>
                                                {o.licenseExpiration || "-"}
                                                {dias !== null && <div className="text-xs font-normal">{dias < 0 ? "Vencida" : `${dias} días`}</div>}
                                            </td>
                                            <td className="py-4 pr-5 text-cyan-300 font-mono text-sm whitespace-nowrap">{o.vehiculoPlacas || "-"}</td>
                                            <td className="py-4 pr-5 text-gray-400 whitespace-nowrap">{o.telefono || "-"}</td>
                                            <td className="py-4 pr-5">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${
                                                    o.status === "Disponible" ? "text-green-300 bg-green-500/10 border-green-400/30" :
                                                    o.status === "En Ruta"    ? "text-blue-300 bg-blue-500/10 border-blue-400/30" :
                                                    o.status === "Descanso"   ? "text-yellow-300 bg-yellow-500/10 border-yellow-400/30" :
                                                    "text-red-300 bg-red-500/10 border-red-400/30"}`}>{o.status}</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEdit(o)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                    <button onClick={() => handleDelete(o.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col">
                            <div className="flex justify-between items-center p-5 sm:p-8 pb-0 flex-shrink-0">
                                <h2 className="text-xl sm:text-3xl font-black text-cyan-300">{editando ? "Editar Operador" : "Nuevo Operador"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {/* ENCABEZADO GENERAL */}
                                <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-cyan-400/10">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Nombre(s)">
                                            <input value={form.name} onChange={set("name")} placeholder="Juan" className={inputCls} />
                                        </Field>
                                        <Field label="Apellidos">
                                            <input value={form.apellidos} onChange={set("apellidos")} placeholder="Pérez García" className={inputCls} />
                                        </Field>
                                        <Field label="RFC">
                                            <input value={form.rfcOperador} onChange={set("rfcOperador")} className={inputCls} />
                                        </Field>
                                        <Field label="CURP">
                                            <input value={form.curp} onChange={set("curp")} className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Fecha de contratación">
                                            <input type="date" value={form.fechaContratacion} onChange={set("fechaContratacion")} className={inputCls} />
                                        </Field>
                                        <Field label="Sucursal">
                                            <input value={form.sucursal} onChange={set("sucursal")} placeholder="MATRIZ" className={inputCls} />
                                        </Field>
                                        <Field label="Teléfono">
                                            <input value={form.telefono} onChange={set("telefono")} className={inputCls} />
                                        </Field>
                                        <Field label="Celular">
                                            <input value={form.celular} onChange={set("celular")} className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <Field label="Registro Patronal">
                                            <input value={form.registroPatronal} onChange={set("registroPatronal")} className={inputCls} />
                                        </Field>
                                        <Field label="Status">
                                            <select value={form.status} onChange={set("status")} className={selectCls}>
                                                <option>Disponible</option><option>En Ruta</option><option>Descanso</option><option>Suspendido</option>
                                            </select>
                                        </Field>
                                        <Field label="Observaciones" span2>
                                            <input value={form.observaciones} onChange={set("observaciones")} className={inputCls} />
                                        </Field>
                                    </div>
                                </div>

                                {/* TABS */}
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

                                    {/* INFORMACIÓN GENERAL */}
                                    {activeTab === "general" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <SectionTitle>Documentos de identidad</SectionTitle>
                                            <Field label="Licencia">
                                                <input value={form.licenseNumber} onChange={set("licenseNumber")} placeholder="Tal cual como viene en la licencia" className={inputCls} />
                                            </Field>
                                            <Field label="Vencimiento">
                                                <input type="date" value={form.licenseExpiration} onChange={set("licenseExpiration")} className={inputCls} />
                                            </Field>
                                            <div className="flex items-end gap-4 pb-2.5">
                                                <Check label="Licencia B" checked={!!form.licenciaB} onChange={setB("licenciaB")} />
                                                <Check label="Licencia C" checked={!!form.licenciaC} onChange={setB("licenciaC")} />
                                                <Check label="Licencia E" checked={!!form.licenciaE} onChange={setB("licenciaE")} />
                                            </div>
                                            <Field label="Pasaporte">
                                                <input value={form.pasaporte} onChange={set("pasaporte")} className={inputCls} />
                                            </Field>
                                            <Field label="Vencimiento">
                                                <input type="date" value={form.vencimientoPasaporte} onChange={set("vencimientoPasaporte")} className={inputCls} />
                                            </Field>
                                            <div />

                                            <SectionTitle>Información médica</SectionTitle>
                                            <Field label="No. IMSS">
                                                <input value={form.noImss} onChange={set("noImss")} className={inputCls} />
                                            </Field>
                                            <Field label="Grupo Sanguíneo">
                                                <select value={form.grupoSanguineo} onChange={set("grupoSanguineo")} className={selectCls}>
                                                    <option value="">Seleccionar...</option>
                                                    {["O+","O-","A+","A-","B+","B-","AB+","AB-"].map(g => <option key={g}>{g}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Alergias">
                                                <input value={form.alergias} onChange={set("alergias")} className={inputCls} />
                                            </Field>
                                            <div className="col-span-3 flex gap-6">
                                                <Check label="Diabético" checked={!!form.diabetico} onChange={setB("diabetico")} />
                                                <Check label="Hipertenso" checked={!!form.hipertenso} onChange={setB("hipertenso")} />
                                            </div>

                                            <SectionTitle>Información bancaria</SectionTitle>
                                            <Field label="Banco">
                                                <input value={form.banco} onChange={set("banco")} className={inputCls} />
                                            </Field>
                                            <Field label="Cuenta CLABE">
                                                <input value={form.cuentaClabe} onChange={set("cuentaClabe")} className={inputCls} />
                                            </Field>
                                            <Field label="No. Tarjeta">
                                                <input value={form.noTarjeta} onChange={set("noTarjeta")} className={inputCls} />
                                            </Field>

                                            <SectionTitle>Claves SAT - Carta Porte 3.1</SectionTitle>
                                            <SatPicker label="Figura Transporte (SAT)" tipo="c_FiguraTransporte"
                                                value={form.figuraTransporte} valueDesc={form.figuraTransporteDesc}
                                                onChange={setSat("figuraTransporte","figuraTransporteDesc")}
                                                placeholder="Buscar figura... ej: operador" span2 />
                                            <Field label="Núm. Licencia Federal SCT">
                                                <input value={form.numLicenciaFederal} onChange={set("numLicenciaFederal")} className={inputCls} />
                                            </Field>
                                        </div>
                                    )}

                                    {/* DOMICILIO */}
                                    {activeTab === "domicilio" && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <Field label="País">
                                                    <input value={form.domicilioPais} onChange={set("domicilioPais")} className={inputCls} />
                                                </Field>
                                                <Field label="Estado">
                                                    <input value={form.domicilioEstado} onChange={set("domicilioEstado")} className={inputCls} />
                                                </Field>
                                                <div />
                                                <Field label="Municipio">
                                                    <input value={form.domicilioMunicipio} onChange={set("domicilioMunicipio")} className={inputCls} />
                                                </Field>
                                                <Field label="Localidad">
                                                    <input value={form.domicilioLocalidad} onChange={set("domicilioLocalidad")} className={inputCls} />
                                                </Field>
                                                <Field label="C.P.">
                                                    <input value={form.domicilioCp} onChange={set("domicilioCp")} className={inputCls} />
                                                </Field>
                                                <Field label="Colonia">
                                                    <input value={form.domicilioColonia} onChange={set("domicilioColonia")} className={inputCls} />
                                                </Field>
                                                <Field label="Calle">
                                                    <input value={form.domicilioCalle} onChange={set("domicilioCalle")} className={inputCls} />
                                                </Field>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Field label="No. Interior">
                                                        <input value={form.domicilioNumInt} onChange={set("domicilioNumInt")} className={inputCls} />
                                                    </Field>
                                                    <Field label="No. Exterior">
                                                        <input value={form.domicilioNumExt} onChange={set("domicilioNumExt")} className={inputCls} />
                                                    </Field>
                                                </div>
                                            </div>
                                            <Field label="Domicilio / Referencia">
                                                <textarea value={form.domicilioReferencia} onChange={set("domicilioReferencia")} rows={3} className={inputCls + " resize-none"} />
                                            </Field>
                                            <p className="text-gray-500 text-xs">*Dato requerido para la elaboración del complemento carta porte</p>
                                        </div>
                                    )}

                                    {/* LIQUIDACIONES CFDI */}
                                    {activeTab === "cfdi" && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Field label="Tipo de Régimen">
                                                    <select value={form.tipoRegimen} onChange={set("tipoRegimen")} className={selectCls}>
                                                        <option value="">Seleccionar...</option>
                                                        <option>SUELDOS</option><option>ASIMILADOS</option><option>HONORARIOS</option>
                                                    </select>
                                                </Field>
                                                <Field label="Departamento">
                                                    <input value={form.departamento} onChange={set("departamento")} placeholder="TRÁFICO" className={inputCls} />
                                                </Field>
                                                <Field label="Tipo de Contrato">
                                                    <select value={form.tipoContrato} onChange={set("tipoContrato")} className={selectCls}>
                                                        <option value="">Seleccionar...</option>
                                                        <option>CONTRATO DE TRABAJO POR TIEMPO INDETERMINADO</option>
                                                        <option>CONTRATO DE TRABAJO POR TIEMPO DETERMINADO</option>
                                                        <option>CONTRATO DE TRABAJO PARA OBRA DETERMINADA</option>
                                                    </select>
                                                </Field>
                                                <Field label="Tipo de Jornada">
                                                    <select value={form.tipoJornada} onChange={set("tipoJornada")} className={selectCls}>
                                                        <option value="">Seleccionar...</option>
                                                        <option>MATUTINO</option><option>VESPERTINO</option><option>MIXTO</option><option>NOCTURNO</option>
                                                    </select>
                                                </Field>
                                                <Field label="Periodicidad de Pago">
                                                    <input value={form.periodicidadPago} onChange={set("periodicidadPago")} placeholder="SEMANAL 2025" className={inputCls} />
                                                </Field>
                                                <Field label="Riesgo del Puesto">
                                                    <select value={form.riesgoPuesto} onChange={set("riesgoPuesto")} className={selectCls}>
                                                        <option value="">Seleccionar...</option>
                                                        {["CLASE I","CLASE II","CLASE III","CLASE IV","CLASE V"].map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </Field>
                                                <Field label="Correo">
                                                    <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                                                </Field>
                                                <Field label="Clasificaciones">
                                                    <input value={form.clasificaciones} onChange={set("clasificaciones")} placeholder="CARGA GENERAL" className={inputCls} />
                                                </Field>
                                            </div>
                                            <p className="text-gray-500 text-xs">*Dato requerido para la elaboración del complemento carta porte</p>
                                        </div>
                                    )}

                                    {/* VALORES P/LIQUIDAR */}
                                    {activeTab === "valores" && (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                                <Field label="% Sencillo Cargado"><input type="number" value={valores.pctSencilloCargado} onChange={setValor("pctSencilloCargado")} className={inputCls} /></Field>
                                                <Field label="% Full Cargado/Cargado"><input type="number" value={valores.pctFullCargado} onChange={setValor("pctFullCargado")} className={inputCls} /></Field>
                                                <Field label="% Sencillo Vacío"><input type="number" value={valores.pctSencilloVacio} onChange={setValor("pctSencilloVacio")} className={inputCls} /></Field>
                                                <Field label="% Full Vacío/Vacío"><input type="number" value={valores.pctFullVacio} onChange={setValor("pctFullVacio")} className={inputCls} /></Field>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                                <Field label="Sueldo Semanal"><input type="number" value={valores.sueldoSemanal} onChange={setValor("sueldoSemanal")} className={inputCls} /></Field>
                                                <Field label="Sueldo Diario"><input type="number" value={valores.sueldoDiario} onChange={setValor("sueldoDiario")} className={inputCls} /></Field>
                                                <Field label="Sueldo Diario Integrado"><input type="number" value={valores.sueldoDiarioIntegrado} onChange={setValor("sueldoDiarioIntegrado")} className={inputCls} /></Field>
                                                <Field label="SBC"><input type="number" value={valores.sbc} onChange={setValor("sbc")} className={inputCls} /></Field>
                                            </div>

                                            <div>
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Valores liquidación factor de operador x millas/kms de ruta/trayecto</p>
                                                <div className="flex gap-2 mb-4">
                                                    <button onClick={() => setMoneda("pesos")} type="button"
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${moneda === "pesos" ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "bg-white/5 border border-transparent text-gray-500"}`}>Pesos</button>
                                                    <button onClick={() => setMoneda("dolares")} type="button"
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${moneda === "dolares" ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "bg-white/5 border border-transparent text-gray-500"}`}>Dólares</button>
                                                </div>
                                                <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                                    <table className="w-full text-left text-xs">
                                                        <thead>
                                                            <tr className="bg-white/5 text-gray-400">
                                                                <th className="px-3 py-2">Tipo de carga</th>
                                                                <th className="px-3 py-2" colSpan={2}>s/Material peligroso</th>
                                                                <th className="px-3 py-2" colSpan={2}>c/Material peligroso</th>
                                                            </tr>
                                                            <tr className="bg-white/5 text-gray-500">
                                                                <th className="px-3 py-1"></th>
                                                                <th className="px-3 py-1">Kms</th><th className="px-3 py-1">Mi</th>
                                                                <th className="px-3 py-1">Kms</th><th className="px-3 py-1">Mi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {FILAS_TASAS.map(fila => (
                                                                <tr key={fila.key} className="border-t border-white/5">
                                                                    <td className="px-3 py-2 text-gray-300 font-bold whitespace-nowrap">{fila.label}</td>
                                                                    <td className="px-2 py-2"><input type="number" value={valores.tasas[moneda][fila.key].sinPeligroso.kms} onChange={setTasa(fila.key, "sinPeligroso", "kms")} className={inputCls} /></td>
                                                                    <td className="px-2 py-2"><input type="number" value={valores.tasas[moneda][fila.key].sinPeligroso.mi} onChange={setTasa(fila.key, "sinPeligroso", "mi")} className={inputCls} /></td>
                                                                    <td className="px-2 py-2"><input type="number" value={valores.tasas[moneda][fila.key].conPeligroso.kms} onChange={setTasa(fila.key, "conPeligroso", "kms")} className={inputCls} /></td>
                                                                    <td className="px-2 py-2"><input type="number" value={valores.tasas[moneda][fila.key].conPeligroso.mi} onChange={setTasa(fila.key, "conPeligroso", "mi")} className={inputCls} /></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MÁS INFORMACIÓN */}
                                    {activeTab === "mas" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <Field label="Tipo Operación">
                                                <select value={form.tipoOperacion} onChange={set("tipoOperacion")} className={selectCls}>
                                                    <option>1) CARRETERO</option><option>2) LOCAL</option><option>3) FORÁNEO</option>
                                                </select>
                                            </Field>
                                            <Field label="Estado Civil">
                                                <select value={form.estadoCivil} onChange={set("estadoCivil")} className={selectCls}>
                                                    <option value="">Seleccionar...</option>
                                                    <option>Soltero</option><option>Casado</option><option>Divorciado</option><option>Viudo</option><option>Unión libre</option>
                                                </select>
                                            </Field>
                                            <Field label="Beneficiario de Fallecimiento">
                                                <input value={form.beneficiarioFallecimiento} onChange={set("beneficiarioFallecimiento")} className={inputCls} />
                                            </Field>
                                            <Field label="En Caso de Accidente Avisar a">
                                                <input value={form.avisarAccidente} onChange={set("avisarAccidente")} className={inputCls} />
                                            </Field>
                                            <Field label="Puesto">
                                                <input value={form.puesto} onChange={set("puesto")} placeholder="GENERAL" className={inputCls} />
                                            </Field>
                                            <Field label="Sexo">
                                                <select value={form.sexo} onChange={set("sexo")} className={selectCls}>
                                                    <option value="">Seleccionar...</option>
                                                    <option>MASCULINO</option><option>FEMENINO</option>
                                                </select>
                                            </Field>
                                            <Field label="Fecha Nacimiento">
                                                <input type="date" value={form.fechaNacimiento} onChange={set("fechaNacimiento")} className={inputCls} />
                                            </Field>
                                            <Field label="Factor VSM Infonavit">
                                                <input type="number" value={form.factorVsmInfonavit} onChange={set("factorVsmInfonavit")} className={inputCls} />
                                            </Field>
                                            <Field label="Factor % Infonavit">
                                                <input type="number" value={form.factorPctInfonavit} onChange={set("factorPctInfonavit")} className={inputCls} />
                                            </Field>
                                            <Field label="Retención Diaria Infonavit">
                                                <input type="number" value={form.retencionDiariaInfonavit} onChange={set("retencionDiariaInfonavit")} className={inputCls} />
                                            </Field>
                                            <Field label="Retención Diaria Fonacot">
                                                <input type="number" value={form.retencionDiariaFonacot} onChange={set("retencionDiariaFonacot")} className={inputCls} />
                                            </Field>
                                            <Field label="Retención Diaria I.M.S.S.">
                                                <input type="number" value={form.retencionDiariaImss} onChange={set("retencionDiariaImss")} className={inputCls} />
                                            </Field>
                                            <p className="col-span-3 text-gray-500 text-xs">*Dato requerido para la elaboración del complemento carta porte</p>
                                        </div>
                                    )}

                                    {/* FOTOS / DOCUMENTOS */}
                                    {activeTab === "documentos" && (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                                <Field label="Documento">
                                                    <input value={nuevoDoc.documento} onChange={e => setNuevoDoc(d => ({ ...d, documento: e.target.value }))} className={inputCls} />
                                                </Field>
                                                <Field label="Nombre">
                                                    <input value={nuevoDoc.nombre} onChange={e => setNuevoDoc(d => ({ ...d, nombre: e.target.value }))} className={inputCls} />
                                                </Field>
                                                <div className="flex gap-2 items-end">
                                                    <Field label="Vencimiento">
                                                        <input type="date" value={nuevoDoc.fechaVencimiento} onChange={e => setNuevoDoc(d => ({ ...d, fechaVencimiento: e.target.value }))} className={inputCls} />
                                                    </Field>
                                                    <button onClick={agregarDocumento} type="button"
                                                        className="mb-0.5 px-4 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 transition-all">+</button>
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-cyan-400/10 overflow-hidden">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="bg-white/5 text-gray-400">
                                                            <th className="px-4 py-2">Documento</th>
                                                            <th className="px-4 py-2">Nombre</th>
                                                            <th className="px-4 py-2">Vencimiento</th>
                                                            <th className="px-4 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {documentos.length === 0 && (
                                                            <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Sin documentos agregados</td></tr>
                                                        )}
                                                        {documentos.map((d, i) => (
                                                            <tr key={i} className="border-t border-white/5">
                                                                <td className="px-4 py-2 text-white">{d.documento}</td>
                                                                <td className="px-4 py-2 text-gray-300">{d.nombre}</td>
                                                                <td className="px-4 py-2 text-gray-400">{d.fechaVencimiento}</td>
                                                                <td className="px-4 py-2">
                                                                    <button onClick={() => quitarDocumento(i)} className="text-red-400 hover:text-red-300"><FaTrash size={12} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-gray-500 text-xs">La carga de fotos/archivos de documentos estará disponible próximamente.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 p-5 sm:p-8 pt-4 flex-shrink-0 border-t border-cyan-400/10">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 sm:py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-3 sm:py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Operador"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
