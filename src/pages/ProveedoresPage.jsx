import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CodigoPostalInput from "../components/CodigoPostalInput";
import { FaWarehouse, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:8081";

const rolColor = {
    "Remitente":           "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    "Destinatario":        "text-purple-300 bg-purple-500/10 border-purple-400/30",
    "Remitente y Destinatario": "text-blue-300 bg-blue-500/10 border-blue-400/30",
};

const emptyForm = {
    nombre: "", razonSocial: "", rfc: "", rol: "Remitente",
    telefono: "", email: "", sitioWeb: "",
    direccion: "", ciudad: "", pais: "México", codigoPostal: "",
    municipio: "", localidad: "", colonia: "",
    contactoPrincipal: "", contactoTelefono: "", contactoEmail: "",
    tipoCarga: "", condicionesPago: "Contado",
    certificaciones: "", notas: "", status: "Activo",
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

export default function ProveedoresPage() {
    const [proveedores, setProveedores] = useState([]);
    const [showModal,   setShowModal]   = useState(false);
    const [editando,    setEditando]    = useState(null);
    const [form,        setForm]        = useState(emptyForm);
    const [loading,     setLoading]     = useState(false);
    const [busqueda,    setBusqueda]    = useState("");
    const [filtroRol,   setFiltroRol]   = useState("Todos");
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchProveedores = async () => {
        try {
            const res  = await fetch(`${API}/proveedores`, { headers });
            const data = await res.json();
            setProveedores(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchProveedores(); }, []);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const openNew = () => { setEditando(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (p) => { setEditando(p.id); setForm({ ...emptyForm, ...p }); setShowModal(true); };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url    = editando ? `${API}/proveedores/${editando}` : `${API}/proveedores`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(form) });
            setShowModal(false);
            fetchProveedores();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este proveedor?")) return;
        try { await fetch(`${API}/proveedores/${id}`, { method: "DELETE", headers }); fetchProveedores(); }
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

    const filtrados = proveedores.filter(p => {
        const matchBusq = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.rfc?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.ciudad?.toLowerCase().includes(busqueda.toLowerCase());
        const matchRol  = filtroRol === "Todos" || p.rol === filtroRol;
        return matchBusq && matchRol;
    });

    const remitentes    = proveedores.filter(p => p.rol === "Remitente" || p.rol === "Remitente y Destinatario").length;
    const destinatarios = proveedores.filter(p => p.rol === "Destinatario" || p.rol === "Remitente y Destinatario").length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">PROVEEDORES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Remitentes y destinatarios frecuentes</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Proveedor
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Total",          value: proveedores.length, color: "text-cyan-400",   border: "border-cyan-500/20" },
                        { label: "Activos",         value: proveedores.filter(p => p.status === "Activo").length, color: "text-green-400", border: "border-green-500/20" },
                        { label: "Remitentes",     value: remitentes,         color: "text-blue-400",   border: "border-blue-500/20" },
                        { label: "Destinatarios",  value: destinatarios,      color: "text-purple-400", border: "border-purple-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <FaWarehouse className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex gap-4 mb-6">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, RFC o ciudad..."
                        className="flex-1 max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                    <div className="flex gap-2">
                        {["Todos", "Remitente", "Destinatario", "Remitente y Destinatario"].map(r => (
                            <button key={r} onClick={() => setFiltroRol(r)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${filtroRol === r
                                    ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300"
                                    : "border-white/10 text-gray-500 hover:text-gray-300"}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaWarehouse /> Proveedores Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre / Razón Social", "RFC", "Rol", "Ciudad", "Tipo de Carga", "Contacto", "Teléfono", "Status", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-6">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay proveedores registrados</td></tr>
                                )}
                                {filtrados.map((p, i) => (
                                    <motion.tr key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-6">
                                            <div className="font-bold text-white">{p.nombre}</div>
                                            {p.razonSocial && <div className="text-xs text-gray-500">{p.razonSocial}</div>}
                                        </td>
                                        <td className="py-4 pr-6 text-cyan-300 font-mono text-sm">{p.rfc || "—"}</td>
                                        <td className="py-4 pr-6">
                                            <span className={`px-2 py-1 rounded-full border text-xs font-bold ${rolColor[p.rol] || "text-gray-300 bg-white/5 border-white/10"}`}>
                                                {p.rol}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-6 text-gray-400">{p.ciudad}{p.pais ? `, ${p.pais}` : ""}</td>
                                        <td className="py-4 pr-6 text-gray-400 text-sm">{p.tipoCarga || "—"}</td>
                                        <td className="py-4 pr-6 text-gray-400">{p.contactoPrincipal || "—"}</td>
                                        <td className="py-4 pr-6 text-gray-400">{p.telefono || "—"}</td>
                                        <td className="py-4 pr-6">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${p.status === "Activo" ? "text-green-300 bg-green-500/10 border-green-400/30" : "text-red-300 bg-red-500/10 border-red-400/30"}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(p)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                <button onClick={() => handleDelete(p.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
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
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Datos generales</p>
                                    <Field label="Nombre / Razón Social" span2>
                                        <input value={form.nombre} onChange={set("nombre")} placeholder="Empresa o nombre completo" className={inputCls} />
                                    </Field>
                                    <Field label="Nombre comercial">
                                        <input value={form.razonSocial} onChange={set("razonSocial")} placeholder="Nombre comercial (opcional)" className={inputCls} />
                                    </Field>
                                    <Field label="RFC / NIF">
                                        <input value={form.rfc} onChange={set("rfc")} placeholder="RFC000000XXX" className={inputCls} />
                                    </Field>
                                    <Field label="Rol en operaciones">
                                        <select value={form.rol} onChange={set("rol")} className={selectCls}>
                                            <option>Remitente</option>
                                            <option>Destinatario</option>
                                            <option>Remitente y Destinatario</option>
                                        </select>
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Activo</option><option>Inactivo</option><option>Bloqueado</option>
                                        </select>
                                    </Field>
                                    <Field label="Tipo de carga que maneja" span2>
                                        <input value={form.tipoCarga} onChange={set("tipoCarga")} placeholder="Electrónicos, alimentos, químicos, general..." className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Contacto principal</p>
                                    <Field label="Teléfono">
                                        <input value={form.telefono} onChange={set("telefono")} placeholder="+52 81 0000 0000" className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.email} onChange={set("email")} placeholder="contacto@empresa.com" className={inputCls} />
                                    </Field>
                                    <Field label="Sitio web">
                                        <input value={form.sitioWeb} onChange={set("sitioWeb")} placeholder="www.empresa.com" className={inputCls} />
                                    </Field>
                                    <Field label="Condiciones de pago">
                                        <select value={form.condicionesPago} onChange={set("condicionesPago")} className={selectCls}>
                                            <option>Contado</option>
                                            <option>Crédito 15 días</option>
                                            <option>Crédito 30 días</option>
                                            <option>Crédito 60 días</option>
                                        </select>
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Persona de contacto</p>
                                    <Field label="Nombre del contacto">
                                        <input value={form.contactoPrincipal} onChange={set("contactoPrincipal")} placeholder="Nombre del encargado" className={inputCls} />
                                    </Field>
                                    <Field label="Tel. del contacto">
                                        <input value={form.contactoTelefono} onChange={set("contactoTelefono")} placeholder="+52 81 0000 0000" className={inputCls} />
                                    </Field>
                                    <Field label="Email del contacto" span2>
                                        <input type="email" value={form.contactoEmail} onChange={set("contactoEmail")} placeholder="encargado@empresa.com" className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Dirección</p>
                                    <Field label="Calle y número" span2>
                                        <input value={form.direccion} onChange={set("direccion")} placeholder="Calle, No., Colonia" className={inputCls} />
                                    </Field>

                                    <div className="col-span-2">
                                        <CodigoPostalInput value={direccionCp} onChange={handleDireccionChange} />
                                    </div>

                                    <Field label="País">
                                        <input value={form.pais} onChange={set("pais")} className={inputCls} />
                                    </Field>
                                    <Field label="Certificaciones">
                                        <input value={form.certificaciones} onChange={set("certificaciones")} placeholder="ISO 9001, OEA, C-TPAT..." className={inputCls} />
                                    </Field>

                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={3} placeholder="Observaciones, condiciones especiales, horarios..." className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Proveedor"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
