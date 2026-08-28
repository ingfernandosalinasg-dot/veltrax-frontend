import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaTruck, FaTools, FaCheckCircle, FaRoad, FaPlus, FaTrash, FaTimes, FaEdit, FaSearch, FaTachometerAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const TABS = [
    { id: "placas",     label: "Placas/Permisos" },
    { id: "specs",      label: "Especificaciones" },
    { id: "tanques",    label: "Tanques/Combustible" },
    { id: "documentos", label: "Documentos" },
    { id: "otros",      label: "Otros datos" },
    { id: "seguros",    label: "Seguros" },
    { id: "proyecciones", label: "Proyeccciones" },
];

const emptyDocumento = { numeroDocumento: "", documento: "", fechaVencimiento: "" };
const emptyProyeccion = {
    mes: "ENERO", anio: "", identificador: "", objetivoMensual: "",
    kmPresupuestados: "", comisionPresupuestada: "", ltsDieselPresupuestados: "",
    presupuestoDiesel: "", presupuestoUrea: "", presupuestoAutopistas: "", presupuestoDirecto: "",
};

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

const emptyForm = {
    // Encabezado general
    codigo: "", activa: true, rentada: false, unidadPermisionario: false,
    descripcion: "", tipoUnidad: "", sucursal: "", identidadSatelital: "",
    identificadorConvoy: "", operadorNombre: "", grupoUnidadesNumero: "1", grupoUnidadesNombre: "GENERAL",
    // Base
    plate: "", brand: "", model: "", year: "", tipo: "", color: "", numSerie: "", numMotor: "",
    capacidadCarga: "", notas: "", status: "Disponible", odometroKm: "",
    // SAT
    configAutotransporte: "", configAutotransporteDesc: "",
    tipoPermiso: "", tipoPermisoDesc: "", numPermisoSct: "",
    numPlacasRemolque1: "", numPlacasRemolque2: "",
    // Placas / Permisos nuevo
    placasMexicanasDefault: true, vigenciaPlacasMexicanas: "",
    placasEua: "", placasEuaDefault: false, vigenciaPlacasEua: "",
    vigenciaPermisoSct: "", verificacionSct: "",
    // Especificaciones
    largoM: "", anchoM: "", altoM: "", capacidadKg: "", numeroEjes: "", pesoTaraTon: "",
    numeroLlantas: "", llantasRefaccion: "", marcaLlanta: "TODOS", modeloLlanta: "TODOS",
    medidaLlanta: "", tipoLlanta: "", tipoMotor: "", tipoTransmision: "", observacionesEspecificaciones: "",
    // Tanques / Combustible
    tipoCombustible: "DIESEL", tarjetaCombustible1: "", tarjetaCombustible2: "", tarjetaCombustible3: "",
    capacidadTanqueLitros: "", capacidadTanqueGalones: "",
    rendimientoCargadoKmLt: "", rendimientoCargadoMiGal: "",
    rendimientoVacioKmLt: "", rendimientoVacioMiGal: "",
    paroPorRalenti: false, tiempoParoRalenti: "1",
    // Otros datos
    tarjetaIave: "", tarjetaEpass: "", tarjetaAdicional1: "", tarjetaAdicional2: "",
    propietario: "", odometroMillas: "", odometroGpsKm: "", odometroGpsMillas: "",
    horometro: "", rendimientoLocal: "", rendimientoForaneo: "",
    horasTrabajadasMotor: "", horasTrabajadasMotorGps: "", porcentajeCalculoIngresos: "100",
    // Seguros
    aseguradoraPlacaMexicana: "", numeroSeguroPlacaMexicana: "", telefonoSeguroPlacaMexicana: "",
    vigenciaSeguroPlacaMexicana: "", coberturaPlacaMexicana: "Amplia",
    aseguradoraPlacaEua: "", numeroSeguroPlacaEua: "", telefonoSeguroPlacaEua: "",
    vigenciaSeguroPlacaEua: "", coberturaPlacaEua: "Amplia",
    aseguradoraMedioAmbiente: "", polizaMedioAmbiente: "",
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

function Radio({ label, name, value, checked, onChange }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="w-4 h-4 cursor-pointer accent-cyan-400" />
            {label}
        </label>
    );
}

function SectionTitle({ children }) {
    return <div className="col-span-3 bg-white/5 rounded-lg px-3 py-1.5 text-cyan-400 text-xs font-bold uppercase tracking-widest">{children}</div>;
}

function SatPicker({ label, tipo, value, valueDesc, onChange, placeholder, span2 = false, span3 = false }) {
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
        <div className={span3 ? "col-span-3" : span2 ? "col-span-2" : ""}>
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

export default function VehiclesPage() {
    const [vehicles,  setVehicles]  = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editando,  setEditando]  = useState(null);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [busqueda,  setBusqueda]  = useState("");
    const [activeTab, setActiveTab] = useState("placas");

    const [documentos, setDocumentos] = useState([]);
    const [nuevoDoc,   setNuevoDoc]   = useState({ ...emptyDocumento });

    const [proyecciones,   setProyecciones]   = useState([]);
    const [nuevaProy,      setNuevaProy]      = useState({ ...emptyProyeccion });

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchVehicles = async () => {
        try {
            const res  = await fetch(`${API}/vehicles`, { headers });
            const data = await res.json();
            setVehicles(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchVehicles(); }, []);

    const set  = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const setB = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));
    const setSat = (claveF, descF) => (clave, desc) => setForm(f => ({ ...f, [claveF]: clave, [descF]: desc }));

    const openNew = () => {
        setEditando(null);
        setForm(emptyForm);
        setDocumentos([]);
        setProyecciones([]);
        setNuevoDoc({ ...emptyDocumento });
        setNuevaProy({ ...emptyProyeccion });
        setActiveTab("placas");
        setShowModal(true);
    };

    const openEdit = (v) => {
        setEditando(v.id);
        setForm({ ...emptyForm, ...v });
        try { setDocumentos(v.documentosJson ? JSON.parse(v.documentosJson) : []); } catch { setDocumentos([]); }
        try { setProyecciones(v.proyeccionesJson ? JSON.parse(v.proyeccionesJson) : []); } catch { setProyecciones([]); }
        setNuevoDoc({ ...emptyDocumento });
        setNuevaProy({ ...emptyProyeccion });
        setActiveTab("placas");
        setShowModal(true);
    };

    const agregarDocumento = () => {
        if (!nuevoDoc.numeroDocumento && !nuevoDoc.documento) return;
        setDocumentos(ds => [...ds, nuevoDoc]);
        setNuevoDoc({ ...emptyDocumento });
    };
    const quitarDocumento = (idx) => setDocumentos(ds => ds.filter((_, i) => i !== idx));

    const agregarProyeccion = () => {
        if (!nuevaProy.anio) return;
        setProyecciones(ps => [...ps, nuevaProy]);
        setNuevaProy({ ...emptyProyeccion });
    };
    const quitarProyeccion = (idx) => setProyecciones(ps => ps.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url    = editando ? `${API}/vehicles/${editando}` : `${API}/vehicles`;
            const method = editando ? "PUT" : "POST";
            const numFields = ["year","odometroKm","largoM","anchoM","altoM","capacidadKg","numeroEjes","pesoTaraTon",
                "numeroLlantas","llantasRefaccion","capacidadTanqueLitros","capacidadTanqueGalones",
                "rendimientoCargadoKmLt","rendimientoCargadoMiGal","rendimientoVacioKmLt","rendimientoVacioMiGal",
                "tiempoParoRalenti","odometroMillas","odometroGpsKm","odometroGpsMillas","rendimientoLocal",
                "rendimientoForaneo","horasTrabajadasMotor","horasTrabajadasMotorGps","porcentajeCalculoIngresos"];
            const payload = { ...form };
            numFields.forEach(f => { payload[f] = payload[f] !== "" && payload[f] !== null ? Number(payload[f]) : null; });
            payload.documentosJson = JSON.stringify(documentos);
            payload.proyeccionesJson = JSON.stringify(proyecciones);

            await fetch(url, { method, headers, body: JSON.stringify(payload) });
            setShowModal(false);
            fetchVehicles();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este vehículo?")) return;
        try { await fetch(`${API}/vehicles/${id}`, { method: "DELETE", headers }); fetchVehicles(); }
        catch (e) { console.error(e); }
    };

    const filtrados = vehicles.filter(v =>
        v.plate?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.brand?.toLowerCase().includes(busqueda.toLowerCase()) ||
        v.model?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const disponibles   = vehicles.filter(v => v.status === "Disponible").length;
    const enRuta        = vehicles.filter(v => v.status === "En Ruta").length;
    const mantenimiento = vehicles.filter(v => v.status === "Mantenimiento").length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">VEHÍCULOS</h1>
                        <p className="text-gray-400 mt-4 text-lg md:text-xl">Catálogo y gestión de flotilla</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Vehículo
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 mb-10">
                    {[
                        { label: "Total",         value: vehicles.length, color: "text-cyan-400",   border: "border-cyan-500/20",   icon: <FaTruck /> },
                        { label: "Disponibles",   value: disponibles,     color: "text-green-400",  border: "border-green-500/20",  icon: <FaCheckCircle /> },
                        { label: "En Ruta",       value: enRuta,          color: "text-blue-400",   border: "border-blue-500/20",   icon: <FaRoad /> },
                        { label: "Mantenimiento", value: mantenimiento,   color: "text-yellow-400", border: "border-yellow-500/20", icon: <FaTools /> },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-4 md:p-6 flex items-center gap-3 md:gap-5`}>
                            <div className={`text-2xl md:text-4xl ${s.color} flex-shrink-0`}>{s.icon}</div>
                            <div className="min-w-0"><p className="text-gray-400 text-sm md:text-base truncate">{s.label}</p><h2 className={`text-2xl md:text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="mb-6">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por código, placa, marca o modelo..."
                        className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-4 md:p-8">
                    <h2 className="text-2xl md:text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaTruck /> Vehículos Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Código","Placas","Marca","Modelo","Año","Tipo","Odómetro","Config SAT","Permiso SCT","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-5 whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={11} className="py-10 text-center text-gray-500">No hay vehículos registrados</td></tr>
                                )}
                                {filtrados.map((v, i) => (
                                    <motion.tr key={v.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-5 font-bold text-cyan-300 font-mono whitespace-nowrap">{v.codigo || "-"}</td>
                                        <td className="py-4 pr-5 font-bold text-cyan-300 font-mono whitespace-nowrap">{v.plate}</td>
                                        <td className="py-4 pr-5 font-bold whitespace-nowrap">{v.brand}</td>
                                        <td className="py-4 pr-5 text-gray-300 whitespace-nowrap">{v.model}</td>
                                        <td className="py-4 pr-5 text-gray-400 whitespace-nowrap">{v.year}</td>
                                        <td className="py-4 pr-5 text-gray-400 text-sm whitespace-nowrap">{v.tipo || "-"}</td>
                                        <td className="py-4 pr-5">
                                            <span className="flex items-center gap-2 text-orange-300 font-bold text-sm whitespace-nowrap">
                                                <FaTachometerAlt size={12} /> {(v.odometroKm || 0).toLocaleString()} km
                                            </span>
                                        </td>
                                        <td className="py-4 pr-5">
                                            {v.configAutotransporte
                                                ? <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold">{v.configAutotransporte}</span>
                                                : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="py-4 pr-5">
                                            {v.tipoPermiso
                                                ? <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-mono font-bold">{v.tipoPermiso}</span>
                                                : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="py-4 pr-5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${
                                                v.status === "Disponible"    ? "text-green-300 bg-green-500/10 border-green-400/30" :
                                                v.status === "En Ruta"       ? "text-blue-300 bg-blue-500/10 border-blue-400/30" :
                                                v.status === "Mantenimiento" ? "text-yellow-300 bg-yellow-500/10 border-yellow-400/30" :
                                                "text-red-300 bg-red-500/10 border-red-400/30"}`}>
                                                {v.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(v)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                <button onClick={() => handleDelete(v.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
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
                                <h2 className="text-xl sm:text-3xl font-black text-cyan-300">{editando ? "Modificando Unidad" : "Nueva Unidad"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            {/* ENCABEZADO GENERAL - visible siempre */}
                            <div className="px-5 sm:px-8 pt-5 pb-4 flex-shrink-0 border-b border-cyan-400/10">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    <Field label="Código">
                                        <input value={form.codigo} onChange={set("codigo")} placeholder="T-09" className={inputCls + " font-bold text-cyan-300"} />
                                    </Field>
                                    <Field label="Descripción">
                                        <input value={form.descripcion} onChange={set("descripcion")} placeholder="KENWORTH FR-350" className={inputCls} />
                                    </Field>
                                    <Field label="Tipo de unidad">
                                        <input value={form.tipoUnidad} onChange={set("tipoUnidad")} placeholder="TRACTOCAMION" className={inputCls} />
                                    </Field>
                                    <Field label="Sucursal">
                                        <input value={form.sucursal} onChange={set("sucursal")} placeholder="MATRIZ" className={inputCls} />
                                    </Field>
                                </div>
                                <div className="flex flex-wrap gap-5 mb-3">
                                    <Check label="Activa" checked={!!form.activa} onChange={setB("activa")} />
                                    <Check label="Rentada" checked={!!form.rentada} onChange={setB("rentada")} />
                                    <Check label="Unidad del permisionario" checked={!!form.unidadPermisionario} onChange={setB("unidadPermisionario")} />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <Field label="Identidad satelital">
                                        <input value={form.identidadSatelital} onChange={set("identidadSatelital")} className={inputCls} />
                                    </Field>
                                    <Field label="Identificador de convoy">
                                        <input value={form.identificadorConvoy} onChange={set("identificadorConvoy")} className={inputCls} />
                                    </Field>
                                    <Field label="No. de serie">
                                        <input value={form.numSerie} onChange={set("numSerie")} className={inputCls} />
                                    </Field>
                                    <Field label="Color">
                                        <input value={form.color} onChange={set("color")} className={inputCls} />
                                    </Field>
                                    <Field label="Marca">
                                        <input value={form.brand} onChange={set("brand")} className={inputCls} />
                                    </Field>
                                    <Field label="Modelo (Año)">
                                        <input type="number" value={form.year} onChange={set("year")} placeholder="2022" className={inputCls} />
                                    </Field>
                                    <Field label="Placas">
                                        <input value={form.plate} onChange={set("plate")} placeholder="ABC-1234" className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Disponible</option><option>En Ruta</option><option>Mantenimiento</option><option>Fuera de Servicio</option>
                                        </select>
                                    </Field>
                                    <Field label="Operador">
                                        <input value={form.operadorNombre} onChange={set("operadorNombre")} className={inputCls} />
                                    </Field>
                                    <Field label="Grupo de unidades #">
                                        <input value={form.grupoUnidadesNumero} onChange={set("grupoUnidadesNumero")} className={inputCls} />
                                    </Field>
                                    <Field label="Grupo de unidades" span2>
                                        <input value={form.grupoUnidadesNombre} onChange={set("grupoUnidadesNombre")} placeholder="GENERAL" className={inputCls} />
                                    </Field>
                                </div>
                            </div>

                            {/* TABS */}
                            <div className="flex gap-1 px-5 sm:px-8 pt-4 pb-1 overflow-x-auto flex-shrink-0">
                                {TABS.map(t => (
                                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all
                                            ${activeTab === t.id ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">

                                {/* PLACAS / PERMISOS */}
                                {activeTab === "placas" && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <SectionTitle>Placas</SectionTitle>
                                            <Field label="Placas mexicanas">
                                                <input value={form.plate} onChange={set("plate")} className={inputCls} />
                                            </Field>
                                            <Field label="Fecha de vencimiento">
                                                <input type="date" value={form.vigenciaPlacasMexicanas} onChange={set("vigenciaPlacasMexicanas")} className={inputCls} />
                                            </Field>
                                            <div className="flex items-end pb-2.5">
                                                <Check label="Default" checked={!!form.placasMexicanasDefault} onChange={setB("placasMexicanasDefault")} />
                                            </div>
                                            <Field label="Placas E.U.A.">
                                                <input value={form.placasEua} onChange={set("placasEua")} className={inputCls} />
                                            </Field>
                                            <Field label="Fecha de vencimiento">
                                                <input type="date" value={form.vigenciaPlacasEua} onChange={set("vigenciaPlacasEua")} className={inputCls} />
                                            </Field>
                                            <div className="flex items-end pb-2.5">
                                                <Check label="Default" checked={!!form.placasEuaDefault} onChange={setB("placasEuaDefault")} />
                                            </div>

                                            <SectionTitle>Permisos</SectionTitle>
                                            <Field label="Permiso SCT">
                                                <input value={form.numPermisoSct} onChange={set("numPermisoSct")} className={inputCls} />
                                            </Field>
                                            <Field label="Fecha de vencimiento">
                                                <input type="date" value={form.vigenciaPermisoSct} onChange={set("vigenciaPermisoSct")} className={inputCls} />
                                            </Field>
                                            <Field label="Verificación SCT">
                                                <input value={form.verificacionSct} onChange={set("verificacionSct")} className={inputCls} />
                                            </Field>
                                            <SatPicker label="Clave SAT / Permiso SCT" tipo="c_TipoPermiso"
                                                value={form.tipoPermiso} valueDesc={form.tipoPermisoDesc}
                                                onChange={setSat("tipoPermiso","tipoPermisoDesc")}
                                                placeholder="Ej: TPAF01 - Autotransporte Federal de Carga General" span3 />

                                            <SectionTitle>Configuración y remolques</SectionTitle>
                                            <SatPicker label="Configuración Autotransporte (SAT)" tipo="c_ConfigAutotransporte"
                                                value={form.configAutotransporte} valueDesc={form.configAutotransporteDesc}
                                                onChange={setSat("configAutotransporte","configAutotransporteDesc")}
                                                placeholder="Ej: C2, C3, T3S2..." span2 />
                                            <Field label="Placas Remolque 1">
                                                <input value={form.numPlacasRemolque1} onChange={set("numPlacasRemolque1")} className={inputCls} />
                                            </Field>
                                            <Field label="Placas Remolque 2" span2>
                                                <input value={form.numPlacasRemolque2} onChange={set("numPlacasRemolque2")} className={inputCls} />
                                            </Field>
                                        </div>
                                    </div>
                                )}

                                {/* ESPECIFICACIONES */}
                                {activeTab === "specs" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <SectionTitle>Dimensiones</SectionTitle>
                                        <Field label="Largo (metros)"><input type="number" value={form.largoM} onChange={set("largoM")} className={inputCls} /></Field>
                                        <Field label="Ancho (metros)"><input type="number" value={form.anchoM} onChange={set("anchoM")} className={inputCls} /></Field>
                                        <Field label="Alto (metros)"><input type="number" value={form.altoM} onChange={set("altoM")} className={inputCls} /></Field>
                                        <Field label="Capacidad (Kgs)"><input type="number" value={form.capacidadKg} onChange={set("capacidadKg")} className={inputCls} /></Field>
                                        <Field label="Número de ejes"><input type="number" value={form.numeroEjes} onChange={set("numeroEjes")} className={inputCls} /></Field>
                                        <Field label="Peso Tara (Ton)"><input type="number" value={form.pesoTaraTon} onChange={set("pesoTaraTon")} className={inputCls} /></Field>

                                        <SectionTitle>Llantas</SectionTitle>
                                        <Field label="Número de llantas"><input type="number" value={form.numeroLlantas} onChange={set("numeroLlantas")} className={inputCls} /></Field>
                                        <Field label="Llantas de refacción"><input type="number" value={form.llantasRefaccion} onChange={set("llantasRefaccion")} className={inputCls} /></Field>
                                        <Field label="Marca de la llanta">
                                            <select value={form.marcaLlanta} onChange={set("marcaLlanta")} className={selectCls}><option>TODOS</option></select>
                                        </Field>
                                        <Field label="Modelo de la llanta">
                                            <select value={form.modeloLlanta} onChange={set("modeloLlanta")} className={selectCls}><option>TODOS</option></select>
                                        </Field>
                                        <Field label="Medida de la llanta"><input value={form.medidaLlanta} onChange={set("medidaLlanta")} className={inputCls} /></Field>
                                        <Field label="Tipo llanta"><input value={form.tipoLlanta} onChange={set("tipoLlanta")} className={inputCls} /></Field>

                                        <SectionTitle>Motor</SectionTitle>
                                        <Field label="Tipo motor"><input value={form.tipoMotor} onChange={set("tipoMotor")} className={inputCls} /></Field>
                                        <Field label="Número de serie"><input value={form.numMotor} onChange={set("numMotor")} className={inputCls} /></Field>
                                        <Field label="Tipo transmisión"><input value={form.tipoTransmision} onChange={set("tipoTransmision")} className={inputCls} /></Field>
                                        <Field label="Observaciones" span3>
                                            <input value={form.observacionesEspecificaciones} onChange={set("observacionesEspecificaciones")} className={inputCls} />
                                        </Field>
                                    </div>
                                )}

                                {/* TANQUES / COMBUSTIBLE */}
                                {activeTab === "tanques" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <SectionTitle>Consumo de Combustible</SectionTitle>
                                        <Field label="Tipo de combustible">
                                            <select value={form.tipoCombustible} onChange={set("tipoCombustible")} className={selectCls}>
                                                <option>DIESEL</option><option>GASOLINA</option><option>GAS LP</option><option>ELÉCTRICO</option>
                                            </select>
                                        </Field>
                                        <Field label="Tarjeta de combustible 1"><input value={form.tarjetaCombustible1} onChange={set("tarjetaCombustible1")} className={inputCls} /></Field>
                                        <Field label="Tarjeta de combustible 2"><input value={form.tarjetaCombustible2} onChange={set("tarjetaCombustible2")} className={inputCls} /></Field>
                                        <Field label="Tarjeta de combustible 3"><input value={form.tarjetaCombustible3} onChange={set("tarjetaCombustible3")} className={inputCls} /></Field>
                                        <Field label="Capacidad Tanque (Litros)"><input type="number" value={form.capacidadTanqueLitros} onChange={set("capacidadTanqueLitros")} className={inputCls} /></Field>
                                        <Field label="Capacidad Tanque (Galones)"><input type="number" value={form.capacidadTanqueGalones} onChange={set("capacidadTanqueGalones")} className={inputCls} /></Field>
                                        <Field label="Rendimiento Cargado (Kms/Lts)"><input type="number" value={form.rendimientoCargadoKmLt} onChange={set("rendimientoCargadoKmLt")} className={inputCls} /></Field>
                                        <Field label="Rendimiento Cargado (Mi/Gal)"><input type="number" value={form.rendimientoCargadoMiGal} onChange={set("rendimientoCargadoMiGal")} className={inputCls} /></Field>
                                        <div />
                                        <Field label="Rendimiento Vacío (Kms/Lts)"><input type="number" value={form.rendimientoVacioKmLt} onChange={set("rendimientoVacioKmLt")} className={inputCls} /></Field>
                                        <Field label="Rendimiento Vacío (Mi/Gal)"><input type="number" value={form.rendimientoVacioMiGal} onChange={set("rendimientoVacioMiGal")} className={inputCls} /></Field>
                                        <div />

                                        <SectionTitle>Paro de Motor por Ralentí</SectionTitle>
                                        <div className="flex items-end pb-2.5">
                                            <Check label="Paro por Ralentí" checked={!!form.paroPorRalenti} onChange={setB("paroPorRalenti")} />
                                        </div>
                                        <Field label="Tiempo de paro de motor por ralentí (máx. 30 min)">
                                            <input type="number" max={30} value={form.tiempoParoRalenti} onChange={set("tiempoParoRalenti")} className={inputCls} />
                                        </Field>
                                    </div>
                                )}

                                {/* DOCUMENTOS */}
                                {activeTab === "documentos" && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                            <Field label="Número de documento">
                                                <input value={nuevoDoc.numeroDocumento} onChange={e => setNuevoDoc(d => ({ ...d, numeroDocumento: e.target.value }))} className={inputCls} />
                                            </Field>
                                            <Field label="Documento">
                                                <input value={nuevoDoc.documento} onChange={e => setNuevoDoc(d => ({ ...d, documento: e.target.value }))} className={inputCls} />
                                            </Field>
                                            <div className="flex gap-2">
                                                <Field label="Fecha de vencimiento">
                                                    <input type="date" value={nuevoDoc.fechaVencimiento} onChange={e => setNuevoDoc(d => ({ ...d, fechaVencimiento: e.target.value }))} className={inputCls} />
                                                </Field>
                                                <button onClick={agregarDocumento} type="button"
                                                    className="mb-0.5 px-4 rounded-xl bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold hover:bg-orange-500/30 transition-all">+</button>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-cyan-400/10 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="bg-white/5 text-gray-400">
                                                        <th className="px-4 py-2">Número de documento</th>
                                                        <th className="px-4 py-2">Documento</th>
                                                        <th className="px-4 py-2">Fecha de vencimiento</th>
                                                        <th className="px-4 py-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {documentos.length === 0 && (
                                                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Sin documentos agregados</td></tr>
                                                    )}
                                                    {documentos.map((d, i) => (
                                                        <tr key={i} className="border-t border-white/5">
                                                            <td className="px-4 py-2 text-white">{d.numeroDocumento}</td>
                                                            <td className="px-4 py-2 text-gray-300">{d.documento}</td>
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

                                {/* OTROS DATOS */}
                                {activeTab === "otros" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Tarjeta IAVE"><input value={form.tarjetaIave} onChange={set("tarjetaIave")} className={inputCls} /></Field>
                                        <Field label="Odómetro (Kms)"><input type="number" value={form.odometroKm} onChange={set("odometroKm")} className={inputCls} /></Field>
                                        <Field label="Horas trabajadas (Motor)"><input type="number" value={form.horasTrabajadasMotor} onChange={set("horasTrabajadasMotor")} className={inputCls} /></Field>

                                        <Field label="Tarjeta EPASS"><input value={form.tarjetaEpass} onChange={set("tarjetaEpass")} className={inputCls} /></Field>
                                        <Field label="Odómetro (Millas)"><input type="number" value={form.odometroMillas} onChange={set("odometroMillas")} className={inputCls} /></Field>
                                        <Field label="Horas trabajadas (Motor GPS)"><input type="number" value={form.horasTrabajadasMotorGps} onChange={set("horasTrabajadasMotorGps")} className={inputCls} /></Field>

                                        <Field label="Tarjeta adicional 1"><input value={form.tarjetaAdicional1} onChange={set("tarjetaAdicional1")} className={inputCls} /></Field>
                                        <Field label="Odómetro GPS (Kms)"><input type="number" value={form.odometroGpsKm} onChange={set("odometroGpsKm")} className={inputCls} /></Field>
                                        <Field label="% Cálculo reporte de ingresos"><input type="number" value={form.porcentajeCalculoIngresos} onChange={set("porcentajeCalculoIngresos")} className={inputCls} /></Field>

                                        <Field label="Tarjeta adicional 2"><input value={form.tarjetaAdicional2} onChange={set("tarjetaAdicional2")} className={inputCls} /></Field>
                                        <Field label="Odómetro GPS (Millas)"><input type="number" value={form.odometroGpsMillas} onChange={set("odometroGpsMillas")} className={inputCls} /></Field>
                                        <Field label="Horómetro (HH:MM)"><input value={form.horometro} onChange={set("horometro")} placeholder="00:00" className={inputCls} /></Field>

                                        <Field label="Propietario"><input value={form.propietario} onChange={set("propietario")} className={inputCls} /></Field>
                                        <Field label="Rendimiento Local"><input type="number" value={form.rendimientoLocal} onChange={set("rendimientoLocal")} className={inputCls} /></Field>
                                        <Field label="Rendimiento Foráneo"><input type="number" value={form.rendimientoForaneo} onChange={set("rendimientoForaneo")} className={inputCls} /></Field>
                                    </div>
                                )}

                                {/* SEGUROS */}
                                {activeTab === "seguros" && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10 space-y-3">
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Seguro placa mexicana</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Aseguradora"><input value={form.aseguradoraPlacaMexicana} onChange={set("aseguradoraPlacaMexicana")} className={inputCls} /></Field>
                                                    <Field label="Número de seguro"><input value={form.numeroSeguroPlacaMexicana} onChange={set("numeroSeguroPlacaMexicana")} className={inputCls} /></Field>
                                                    <Field label="Teléfono"><input value={form.telefonoSeguroPlacaMexicana} onChange={set("telefonoSeguroPlacaMexicana")} className={inputCls} /></Field>
                                                    <Field label="Fecha de vencimiento"><input type="date" value={form.vigenciaSeguroPlacaMexicana} onChange={set("vigenciaSeguroPlacaMexicana")} className={inputCls} /></Field>
                                                </div>
                                                <div className="flex gap-5 pt-1">
                                                    <Radio label="Amplia" name="coberturaMx" value="Amplia" checked={form.coberturaPlacaMexicana==="Amplia"} onChange={set("coberturaPlacaMexicana")} />
                                                    <Radio label="Limitada" name="coberturaMx" value="Limitada" checked={form.coberturaPlacaMexicana==="Limitada"} onChange={set("coberturaPlacaMexicana")} />
                                                    <Radio label="Sin cobertura" name="coberturaMx" value="Sin cobertura" checked={form.coberturaPlacaMexicana==="Sin cobertura"} onChange={set("coberturaPlacaMexicana")} />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10 space-y-3">
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Seguro placa E.U.A.</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Aseguradora"><input value={form.aseguradoraPlacaEua} onChange={set("aseguradoraPlacaEua")} className={inputCls} /></Field>
                                                    <Field label="Número de seguro"><input value={form.numeroSeguroPlacaEua} onChange={set("numeroSeguroPlacaEua")} className={inputCls} /></Field>
                                                    <Field label="Teléfono"><input value={form.telefonoSeguroPlacaEua} onChange={set("telefonoSeguroPlacaEua")} className={inputCls} /></Field>
                                                    <Field label="Fecha de vencimiento"><input type="date" value={form.vigenciaSeguroPlacaEua} onChange={set("vigenciaSeguroPlacaEua")} className={inputCls} /></Field>
                                                </div>
                                                <div className="flex gap-5 pt-1">
                                                    <Radio label="Amplia" name="coberturaEua" value="Amplia" checked={form.coberturaPlacaEua==="Amplia"} onChange={set("coberturaPlacaEua")} />
                                                    <Radio label="Limitada" name="coberturaEua" value="Limitada" checked={form.coberturaPlacaEua==="Limitada"} onChange={set("coberturaPlacaEua")} />
                                                    <Radio label="Sin cobertura" name="coberturaEua" value="Sin cobertura" checked={form.coberturaPlacaEua==="Sin cobertura"} onChange={set("coberturaPlacaEua")} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Seguros</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Field label="Aseguradora Medio Ambiente"><input value={form.aseguradoraMedioAmbiente} onChange={set("aseguradoraMedioAmbiente")} className={inputCls} /></Field>
                                                <Field label="Póliza"><input value={form.polizaMedioAmbiente} onChange={set("polizaMedioAmbiente")} className={inputCls} /></Field>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PROYECCIONES */}
                                {activeTab === "proyecciones" && (
                                    <div className="space-y-5">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest bg-white/5 rounded-lg px-3 py-1.5">Información proyección de cierre de mes</p>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <Field label="Mes">
                                                <select value={nuevaProy.mes} onChange={e => setNuevaProy(p => ({ ...p, mes: e.target.value }))} className={selectCls}>
                                                    {MESES.map(m => <option key={m}>{m}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Año">
                                                <input value={nuevaProy.anio} onChange={e => setNuevaProy(p => ({ ...p, anio: e.target.value }))} placeholder="2026" className={inputCls} />
                                            </Field>
                                            <button onClick={agregarProyeccion} type="button"
                                                className="mb-0.5 px-6 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 font-bold hover:bg-yellow-500/30 transition-all text-sm">Agregar</button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <Field label="Identificador"><input value={nuevaProy.identificador} onChange={e => setNuevaProy(p => ({ ...p, identificador: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Objetivo mensual ($)"><input type="number" value={nuevaProy.objetivoMensual} onChange={e => setNuevaProy(p => ({ ...p, objetivoMensual: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Km presupuestados"><input type="number" value={nuevaProy.kmPresupuestados} onChange={e => setNuevaProy(p => ({ ...p, kmPresupuestados: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Comisión presupuestada ($)"><input type="number" value={nuevaProy.comisionPresupuestada} onChange={e => setNuevaProy(p => ({ ...p, comisionPresupuestada: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Lts Diesel presupuestados"><input type="number" value={nuevaProy.ltsDieselPresupuestados} onChange={e => setNuevaProy(p => ({ ...p, ltsDieselPresupuestados: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Presupuesto diesel ($)"><input type="number" value={nuevaProy.presupuestoDiesel} onChange={e => setNuevaProy(p => ({ ...p, presupuestoDiesel: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Presupuesto urea ($)"><input type="number" value={nuevaProy.presupuestoUrea} onChange={e => setNuevaProy(p => ({ ...p, presupuestoUrea: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Presupuesto autopistas ($)"><input type="number" value={nuevaProy.presupuestoAutopistas} onChange={e => setNuevaProy(p => ({ ...p, presupuestoAutopistas: e.target.value }))} className={inputCls} /></Field>
                                            <Field label="Presupuesto directo ($)"><input type="number" value={nuevaProy.presupuestoDirecto} onChange={e => setNuevaProy(p => ({ ...p, presupuestoDirecto: e.target.value }))} className={inputCls} /></Field>
                                        </div>

                                        <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-white/5 text-gray-400">
                                                        {["Mes-Año","Identificador","Objetivo mensual","Km presup.","Comisión presup.","Lts Diesel presup.","Presup. diesel","Presup. urea","Presup. autopistas","Presup. directo",""]
                                                            .map(h => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {proyecciones.length === 0 && (
                                                        <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">Sin proyecciones agregadas</td></tr>
                                                    )}
                                                    {proyecciones.map((p, i) => (
                                                        <tr key={i} className="border-t border-white/5">
                                                            <td className="px-3 py-2 whitespace-nowrap">{p.mes} {p.anio}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{p.identificador}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">${Number(p.objetivoMensual||0).toLocaleString()}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{p.kmPresupuestados}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">${Number(p.comisionPresupuestada||0).toLocaleString()}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{p.ltsDieselPresupuestados}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">${Number(p.presupuestoDiesel||0).toLocaleString()}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">${Number(p.presupuestoUrea||0).toLocaleString()}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">${Number(p.presupuestoAutopistas||0).toLocaleString()}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">${Number(p.presupuestoDirecto||0).toLocaleString()}</td>
                                                            <td className="px-3 py-2"><button onClick={() => quitarProyeccion(i)} className="text-red-400 hover:text-red-300"><FaTrash size={11} /></button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-gray-500 text-xs">*Dato requerido para la elaboración del complemento carta porte</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 p-5 sm:p-8 pt-4 flex-shrink-0 border-t border-cyan-400/10">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 sm:py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-3 sm:py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Vehículo"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
