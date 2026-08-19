import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CodigoPostalInput from "../components/CodigoPostalInput";
import ValidacionRegimenUso from "../components/ValidacionRegimenUso";
import { FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaBuilding, FaSearch } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const emptyForm = {
    nombre: "", razonSocial: "", rfc: "",
    telefono: "", email: "",
    direccion: "", ciudad: "", estado: "", pais: "México", codigoPostal: "",
    municipio: "", localidad: "", colonia: "",
    contacto: "", contactoTelefono: "",
    tipoCarga: "", notas: "", status: "Activo",
    // Campos SAT
    regimenFiscal: "", regimenFiscalDesc: "",
    usoCfdi: "", usoCfdiDesc: "",
    numRegIdTrib: "", residenciaFiscal: "",
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

// Regímenes fiscales más comunes (SAT México)
const REGIMENES = [
    { clave: "601", desc: "General de Ley Personas Morales" },
    { clave: "603", desc: "Personas Morales con Fines no Lucrativos" },
    { clave: "605", desc: "Sueldos y Salarios e Ingresos Asimilados" },
    { clave: "606", desc: "Arrendamiento" },
    { clave: "607", desc: "Régimen de Enajenación o Adquisición de Bienes" },
    { clave: "608", desc: "Demás Ingresos" },
    { clave: "610", desc: "Residentes en el Extranjero" },
    { clave: "611", desc: "Ingresos por Dividendos (socios y accionistas)" },
    { clave: "612", desc: "Personas Físicas con Actividades Empresariales" },
    { clave: "614", desc: "Ingresos por intereses" },
    { clave: "615", desc: "Régimen de los ingresos por obtención de premios" },
    { clave: "616", desc: "Sin obligaciones fiscales" },
    { clave: "620", desc: "Sociedades Cooperativas de Producción" },
    { clave: "621", desc: "Incorporación Fiscal" },
    { clave: "622", desc: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
    { clave: "623", desc: "Opcional para Grupos de Sociedades" },
    { clave: "624", desc: "Coordinados" },
    { clave: "625", desc: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
    { clave: "626", desc: "Régimen Simplificado de Confianza (RESICO)" },
];

const USOS_CFDI = [
    { clave: "G01", desc: "Adquisición de mercancias" },
    { clave: "G02", desc: "Devoluciones, descuentos o bonificaciones" },
    { clave: "G03", desc: "Gastos en general" },
    { clave: "I01", desc: "Construcciones" },
    { clave: "I02", desc: "Mobilario y equipo de oficina por inversiones" },
    { clave: "I03", desc: "Equipo de transporte" },
    { clave: "I04", desc: "Equipo de computo y accesorios" },
    { clave: "I05", desc: "Dados, troqueles, moldes, matrices y herramental" },
    { clave: "I06", desc: "Comunicaciones telefónicas" },
    { clave: "I07", desc: "Comunicaciones satelitales" },
    { clave: "I08", desc: "Otra maquinaria y equipo" },
    { clave: "D01", desc: "Honorarios médicos, dentales y gastos hospitalarios" },
    { clave: "D02", desc: "Gastos médicos por incapacidad o discapacidad" },
    { clave: "D03", desc: "Gastos funerales" },
    { clave: "D04", desc: "Donativos" },
    { clave: "D05", desc: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)" },
    { clave: "D06", desc: "Aportaciones voluntarias al SAR" },
    { clave: "D07", desc: "Primas por seguros de gastos médicos" },
    { clave: "D08", desc: "Gastos de transportación escolar obligatoria" },
    { clave: "D09", desc: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones" },
    { clave: "D10", desc: "Pagos por servicios educativos (colegiaturas)" },
    { clave: "S01", desc: "Sin efectos fiscales" },
    { clave: "CP01", desc: "Pagos" },
    { clave: "CN01", desc: "Nómina" },
];

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

// Picker para catálogos SAT cargados en BD (Carta Porte 3.1)
function SatPicker({ label, tipo, value, valueDesc, onChange, placeholder, span2 = false }) {
    const [query,   setQuery]   = useState(value ? `${value} -${valueDesc || ""}` : "");
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
        setQuery(`${item.clave} -${item.descripcion}`);
        setOpen(false);
        onChange(item.clave, item.descripcion);
    };

    const limpiar = () => { setQuery(""); setResults([]); setOpen(false); onChange("", ""); };

    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            <div className="relative">
                <div className="relative flex items-center">
                    <FaSearch className="absolute left-4 text-gray-500 text-xs pointer-events-none" />
                    <input value={query} onChange={handleInput} onFocus={() => { if (query.length >= 2) setOpen(true); }}
                        placeholder={placeholder || `Buscar en ${tipo}...`}
                        className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-10 pr-10 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm" />
                    {value && <button onClick={limpiar} className="absolute right-3 text-gray-500 hover:text-red-400 transition-colors text-xs"><FaTimes /></button>}
                </div>
                {value && (
                    <div className="mt-1 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-xs text-cyan-300 flex items-center gap-2">
                        <span className="font-mono font-bold">{value}</span>
                        <span className="text-gray-400"></span>
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

export default function RemitentesPage() {
    const [items,     setItems]     = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editando,  setEditando]  = useState(null);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [busqueda,  setBusqueda]  = useState("");
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchItems = async () => {
        try {
            const res  = await fetch(`${API}/remitentes`, { headers });
            const data = await res.json();
            setItems(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchItems(); }, []);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
    const setSat = (claveF, descF) => (clave, desc) => setForm(prev => ({ ...prev, [claveF]: clave, [descF]: desc }));

    const openNew  = () => { setEditando(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (item) => { setEditando(item.id); setForm({ ...emptyForm, ...item }); setShowModal(true); };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url    = editando ? `${API}/remitentes/${editando}` : `${API}/remitentes`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(form) });
            setShowModal(false);
            fetchItems();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este remitente?")) return;
        try { await fetch(`${API}/remitentes/${id}`, { method: "DELETE", headers }); fetchItems(); }
        catch (e) { console.error(e); }
    };

    // Adaptador: CodigoPostalInput trabaja con { cp, estado, municipio, localidad, colonia }
    const direccionCp = {
        cp: form.codigoPostal,
        estado: form.estado,
        municipio: form.municipio,
        localidad: form.localidad,
        colonia: form.colonia,
    };
    const handleDireccionChange = (nuevo) => {
        setForm(f => ({
            ...f,
            codigoPostal: nuevo.cp,
            estado: nuevo.estado,
            municipio: nuevo.municipio,
            localidad: nuevo.localidad,
            colonia: nuevo.colonia,
            ciudad: nuevo.municipio || f.ciudad,
        }));
    };

    const filtrados = items.filter(i =>
        i.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.rfc?.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.ciudad?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">REMITENTES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Catálogo de empresas y personas que envían mercancía</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Remitente
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    {[
                        { label: "Total",     value: items.length,                                    color: "text-cyan-400",  border: "border-cyan-500/20" },
                        { label: "Activos",   value: items.filter(i => i.status === "Activo").length,  color: "text-green-400", border: "border-green-500/20" },
                        { label: "Inactivos", value: items.filter(i => i.status !== "Activo").length,  color: "text-red-400",   border: "border-red-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <FaBuilding className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="mb-6">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, RFC o ciudad..."
                        className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaBuilding /> Remitentes Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre / Razón Social","RFC","Régimen Fiscal","Ciudad","Teléfono","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-6">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={7} className="py-10 text-center text-gray-500">No hay remitentes registrados</td></tr>
                                )}
                                {filtrados.map((item, i) => (
                                    <motion.tr key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-6">
                                            <div className="font-bold text-white">{item.nombre}</div>
                                            {item.razonSocial && <div className="text-xs text-gray-500">{item.razonSocial}</div>}
                                        </td>
                                        <td className="py-4 pr-6 text-cyan-300 font-mono text-sm">{item.rfc || "-"}</td>
                                        <td className="py-4 pr-6">
                                            {item.regimenFiscal ? (
                                                <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-mono font-bold">
                                                    {item.regimenFiscal}
                                                </span>
                                            ) : <span className="text-gray-600"></span>}
                                        </td>
                                        <td className="py-4 pr-6 text-gray-400">{item.ciudad || "-"}</td>
                                        <td className="py-4 pr-6 text-gray-400">{item.telefono || "-"}</td>
                                        <td className="py-4 pr-6">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${item.status === "Activo" ? "text-green-300 bg-green-500/10 border-green-400/30" : "text-red-300 bg-red-500/10 border-red-400/30"}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(item)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
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
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar Remitente" : "Nuevo Remitente"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Datos generales</p>
                                    <Field label="Nombre / Razón Social" span2>
                                        <input value={form.nombre} onChange={set("nombre")} placeholder="Empresa S.A. de C.V." className={inputCls} />
                                    </Field>
                                    <Field label="Nombre comercial">
                                        <input value={form.razonSocial} onChange={set("razonSocial")} placeholder="Nombre comercial (opcional)" className={inputCls} />
                                    </Field>
                                    <Field label="RFC">
                                        <input value={form.rfc} onChange={set("rfc")} placeholder="RFC000000XXX" className={inputCls} />
                                    </Field>
                                    <Field label="Tipo de carga que maneja" span2>
                                        <input value={form.tipoCarga} onChange={set("tipoCarga")} placeholder="Electrónicos, alimentos, químicos..." className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Activo</option><option>Inactivo</option>
                                        </select>
                                    </Field>

                                    {/* SECCIÓN SAT */}
                                    <div className="col-span-2 mt-2 p-4 rounded-2xl bg-purple-500/5 border border-purple-400/20">
                                        <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Datos fiscales SAT (para timbrado CFDI)</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Régimen Fiscal (SAT)" span2>
                                                <select value={form.regimenFiscal} onChange={e => {
                                                    const reg = REGIMENES.find(r => r.clave === e.target.value);
                                                    setForm(prev => ({ ...prev, regimenFiscal: e.target.value, regimenFiscalDesc: reg?.desc || "" }));
                                                }} className={selectCls}>
                                                    <option value="">Seleccionar régimen fiscal...</option>
                                                    {REGIMENES.map(r => <option key={r.clave} value={r.clave}>{r.clave} -{r.desc}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Uso CFDI (SAT)" span2>
                                                <select value={form.usoCfdi} onChange={e => {
                                                    const uso = USOS_CFDI.find(u => u.clave === e.target.value);
                                                    setForm(prev => ({ ...prev, usoCfdi: e.target.value, usoCfdiDesc: uso?.desc || "" }));
                                                }} className={selectCls}>
                                                    <option value="">Seleccionar uso de CFDI...</option>
                                                    {USOS_CFDI.map(u => <option key={u.clave} value={u.clave}>{u.clave} -{u.desc}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Num. Reg. ID Trib. (extranjeros)" span2>
                                                <input value={form.numRegIdTrib} onChange={set("numRegIdTrib")} placeholder="Solo si es extranjero" className={inputCls} />
                                            </Field>
                                            <ValidacionRegimenUso regimen={form.regimenFiscal} uso={form.usoCfdi} />
                                        </div>
                                        <p className="text-purple-300/60 text-xs mt-3">
                                            El código postal fiscal se captura abajo, en la sección de Dirección de origen.
                                        </p>
                                    </div>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Contacto</p>
                                    <Field label="Teléfono">
                                        <input value={form.telefono} onChange={set("telefono")} placeholder="+52 81 0000 0000" className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.email} onChange={set("email")} placeholder="contacto@empresa.com" className={inputCls} />
                                    </Field>
                                    <Field label="Persona de contacto">
                                        <input value={form.contacto} onChange={set("contacto")} placeholder="Nombre del encargado" className={inputCls} />
                                    </Field>
                                    <Field label="Tel. del contacto">
                                        <input value={form.contactoTelefono} onChange={set("contactoTelefono")} className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Dirección de origen</p>
                                    <Field label="Calle y Número" span2>
                                        <input value={form.direccion} onChange={set("direccion")} placeholder="Calle, No., Colonia" className={inputCls} />
                                    </Field>

                                    <div className="col-span-2">
                                        <CodigoPostalInput value={direccionCp} onChange={handleDireccionChange} />
                                    </div>

                                    <Field label="País">
                                        <input value={form.pais} onChange={set("pais")} className={inputCls} />
                                    </Field>

                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={2}
                                            placeholder="Horarios de carga, instrucciones especiales..."
                                            className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Remitente"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}










