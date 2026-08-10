import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaIdCard, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaSearch } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const emptyForm = {
    name: "", apellidos: "", telefono: "", email: "",
    licenseNumber: "", licenciaTipo: "E", licenseExpiration: "",
    vehiculoTipo: "", vehiculoMarca: "", vehiculoModelo: "", vehiculoAnio: "",
    vehiculoPlacas: "", vehiculoColor: "",
    tarjetaCirculacion: "", polizaSeguro: "", vigenciaSeguro: "",
    direccion: "", ciudad: "", pais: "México",
    notas: "", status: "Disponible",
    // SAT Carta Porte
    figuraTransporte: "", figuraTransporteDesc: "",
    rfcOperador: "", numLicenciaFederal: "",
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

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
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-10 pr-10 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm" />
                    {value && <button onClick={limpiar} className="absolute right-3 text-gray-500 hover:text-red-400 text-xs"><FaTimes /></button>}
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

    const set    = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const setSat = (claveF, descF) => (clave, desc) => setForm(f => ({ ...f, [claveF]: clave, [descF]: desc }));

    const openNew  = () => { setEditando(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (o) => { setEditando(o.id); setForm({ ...emptyForm, ...o }); setShowModal(true); };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url    = editando ? `${API}/drivers/${editando}` : `${API}/drivers`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(form) });
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
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">OPERADORES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Catálogo de conductores y operadores</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Operador
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Total",       value: operadores.length, color: "text-cyan-400",   border: "border-cyan-500/20" },
                        { label: "Disponibles", value: activos,           color: "text-green-400",  border: "border-green-500/20" },
                        { label: "Por vencer",  value: porVencer,         color: "text-yellow-400", border: "border-yellow-500/20" },
                        { label: "Vencidos",    value: vencidos,          color: "text-red-400",    border: "border-red-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <FaIdCard className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <div className="mb-6">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, licencia o placas..."
                        className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaIdCard /> Operadores Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre","RFC","Figura SAT","Licencia","Vigencia","Placas","Teléfono","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-5">{h}</th>)}
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
                                            <td className="py-4 pr-5">
                                                <div className="font-bold">{o.name} {o.apellidos}</div>
                                                <div className="text-xs text-gray-500">{o.email}</div>
                                            </td>
                                            <td className="py-4 pr-5 text-cyan-300 font-mono text-xs">{o.rfcOperador || "-"}</td>
                                            <td className="py-4 pr-5">
                                                {o.figuraTransporte
                                                    ? <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold">{o.figuraTransporte}</span>
                                                    : <span className="text-gray-600"></span>}
                                            </td>
                                            <td className="py-4 pr-5 text-cyan-300 font-mono text-sm">{o.licenseNumber || "-"}</td>
                                            <td className={`py-4 pr-5 font-bold text-sm ${vigColor}`}>
                                                {o.licenseExpiration || "-"}
                                                {dias !== null && <div className="text-xs font-normal">{dias < 0 ? "Vencida" : `${dias} días`}</div>}
                                            </td>
                                            <td className="py-4 pr-5 text-cyan-300 font-mono text-sm">{o.vehiculoPlacas || "-"}</td>
                                            <td className="py-4 pr-5 text-gray-400">{o.telefono || "-"}</td>
                                            <td className="py-4 pr-5">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
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
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar Operador" : "Nuevo Operador"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Datos personales</p>
                                    <Field label="Nombre(s)">
                                        <input value={form.name} onChange={set("name")} placeholder="Juan" className={inputCls} />
                                    </Field>
                                    <Field label="Apellidos">
                                        <input value={form.apellidos} onChange={set("apellidos")} placeholder="Pérez García" className={inputCls} />
                                    </Field>
                                    <Field label="Teléfono">
                                        <input value={form.telefono} onChange={set("telefono")} className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                                    </Field>
                                    <Field label="Dirección" span2>
                                        <input value={form.direccion} onChange={set("direccion")} className={inputCls} />
                                    </Field>
                                    <Field label="Ciudad">
                                        <input value={form.ciudad} onChange={set("ciudad")} className={inputCls} />
                                    </Field>
                                    <Field label="País">
                                        <input value={form.pais} onChange={set("pais")} className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Disponible</option>
                                            <option>En Ruta</option>
                                            <option>Descanso</option>
                                            <option>Suspendido</option>
                                        </select>
                                    </Field>

                                    {/* SECCIÓN SAT */}
                                    <div className="col-span-2 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-400/20">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Claves SAT -Carta Porte 3.1</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SatPicker label="Figura Transporte (SAT)" tipo="c_FiguraTransporte"
                                                value={form.figuraTransporte} valueDesc={form.figuraTransporteDesc}
                                                onChange={setSat("figuraTransporte","figuraTransporteDesc")}
                                                placeholder="Buscar figura... ej: operador" span2={true} />
                                            <Field label="RFC del Operador (para timbrado)">
                                                <input value={form.rfcOperador} onChange={set("rfcOperador")} placeholder="RFC del operador" className={inputCls} />
                                            </Field>
                                            <Field label="Núm. Licencia Federal SCT">
                                                <input value={form.numLicenciaFederal} onChange={set("numLicenciaFederal")} placeholder="Número de licencia federal" className={inputCls} />
                                            </Field>
                                        </div>
                                    </div>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Licencia de conducir</p>
                                    <Field label="Número de licencia">
                                        <input value={form.licenseNumber} onChange={set("licenseNumber")} placeholder="D00001234" className={inputCls} />
                                    </Field>
                                    <Field label="Tipo de licencia">
                                        <select value={form.licenciaTipo} onChange={set("licenciaTipo")} className={selectCls}>
                                            <option value="A">A -Motocicleta</option>
                                            <option value="B">B -Automóvil</option>
                                            <option value="C">C -Camión unitario</option>
                                            <option value="D">D -Autobús</option>
                                            <option value="E">E -Tractocamión (Trailer)</option>
                                            <option value="F">F -Motobomba</option>
                                        </select>
                                    </Field>
                                    <Field label="Vigencia de licencia">
                                        <input type="date" value={form.licenseExpiration} onChange={set("licenseExpiration")} className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Vehículo asignado</p>
                                    <Field label="Tipo de vehículo">
                                        <select value={form.vehiculoTipo} onChange={set("vehiculoTipo")} className={selectCls}>
                                            <option value="">Sin vehículo asignado</option>
                                            <option>Trailer / Tractocamión</option>
                                            <option>Torton</option>
                                            <option>Rabon</option>
                                            <option>Camión 3.5T</option>
                                            <option>Camioneta</option>
                                            <option>Otro</option>
                                        </select>
                                    </Field>
                                    <Field label="Marca">
                                        <input value={form.vehiculoMarca} onChange={set("vehiculoMarca")} className={inputCls} />
                                    </Field>
                                    <Field label="Modelo">
                                        <input value={form.vehiculoModelo} onChange={set("vehiculoModelo")} className={inputCls} />
                                    </Field>
                                    <Field label="Año">
                                        <input type="number" value={form.vehiculoAnio} onChange={set("vehiculoAnio")} className={inputCls} />
                                    </Field>
                                    <Field label="Placas">
                                        <input value={form.vehiculoPlacas} onChange={set("vehiculoPlacas")} className={inputCls} />
                                    </Field>
                                    <Field label="Color">
                                        <input value={form.vehiculoColor} onChange={set("vehiculoColor")} className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Documentos del vehículo</p>
                                    <Field label="Tarjeta de circulación">
                                        <input value={form.tarjetaCirculacion} onChange={set("tarjetaCirculacion")} className={inputCls} />
                                    </Field>
                                    <Field label="Póliza de seguro">
                                        <input value={form.polizaSeguro} onChange={set("polizaSeguro")} className={inputCls} />
                                    </Field>
                                    <Field label="Vigencia del seguro">
                                        <input type="date" value={form.vigenciaSeguro} onChange={set("vigenciaSeguro")} className={inputCls} />
                                    </Field>
                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={2} className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
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









