import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CodigoPostalInput from "../components/CodigoPostalInput";
import ValidacionRegimenUso from "../components/ValidacionRegimenUso";
import { FaUserTie, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaBuilding, FaUser } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const tipoColor = {
    "Empresa": "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    "Persona": "text-purple-300 bg-purple-500/10 border-purple-400/30",
};

const emptyForm = {
    nombre: "", razonSocial: "", rfc: "", tipo: "Empresa",
    telefono: "", email: "", direccion: "", ciudad: "",
    estado: "", pais: "M茅xico", codigoPostal: "",
    municipio: "", localidad: "", colonia: "",
    creditoDias: "0", limiteCredito: "",
    contactoPrincipal: "", contactoTelefono: "",
    notas: "", status: "Activo",
    // SAT
    regimenFiscal: "", regimenFiscalDesc: "",
    usoCfdi: "", usoCfdiDesc: "",
    numRegIdTrib: "", residenciaFiscal: "",
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const REGIMENES = [
    { clave: "601", desc: "General de Ley Personas Morales" },
    { clave: "603", desc: "Personas Morales con Fines no Lucrativos" },
    { clave: "605", desc: "Sueldos y Salarios e Ingresos Asimilados" },
    { clave: "606", desc: "Arrendamiento" },
    { clave: "608", desc: "Dem谩s Ingresos" },
    { clave: "610", desc: "Residentes en el Extranjero" },
    { clave: "612", desc: "Personas F铆sicas con Actividades Empresariales" },
    { clave: "616", desc: "Sin obligaciones fiscales" },
    { clave: "620", desc: "Sociedades Cooperativas de Producci贸n" },
    { clave: "621", desc: "Incorporaci贸n Fiscal" },
    { clave: "622", desc: "Actividades Agr铆colas, Ganaderas, Silv铆colas y Pesqueras" },
    { clave: "626", desc: "R茅gimen Simplificado de Confianza (RESICO)" },
];

const USOS_CFDI = [
    { clave: "G01", desc: "Adquisici贸n de mercancias" },
    { clave: "G02", desc: "Devoluciones, descuentos o bonificaciones" },
    { clave: "G03", desc: "Gastos en general" },
    { clave: "I01", desc: "Construcciones" },
    { clave: "I03", desc: "Equipo de transporte" },
    { clave: "I04", desc: "Equipo de computo y accesorios" },
    { clave: "S01", desc: "Sin efectos fiscales" },
    { clave: "CP01", desc: "Pagos" },
    { clave: "CN01", desc: "N贸mina" },
];

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

export default function ClientesPage() {
    const [clientes,  setClientes]  = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editando,  setEditando]  = useState(null);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [busqueda,  setBusqueda]  = useState("");

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchClientes = async () => {
        try {
            const res  = await fetch(`${API}/clientes`, { headers });
            const data = await res.json();
            setClientes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchClientes(); }, []);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const openNew  = () => { setEditando(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (c) => { setEditando(c.id); setForm({ ...emptyForm, ...c }); setShowModal(true); };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const url    = editando ? `${API}/clientes/${editando}` : `${API}/clientes`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(form) });
            setShowModal(false);
            fetchClientes();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("驴Eliminar este cliente?")) return;
        try { await fetch(`${API}/clientes/${id}`, { method: "DELETE", headers }); fetchClientes(); }
        catch (e) { console.error(e); }
    };

    // Adaptador: CodigoPostalInput trabaja con { cp, estado, municipio, localidad, colonia }
    // y el form de este componente guarda esos mismos datos bajo otros nombres de campo.
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
            // Mantenemos "ciudad" sincronizada con el municipio para no romper
            // la columna "Ciudad" que ya se muestra en la tabla de clientes.
            ciudad: nuevo.municipio || f.ciudad,
        }));
    };

    const filtrados = clientes.filter(c =>
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.rfc?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.ciudad?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const activos  = clientes.filter(c => c.status === "Activo").length;
    const empresas = clientes.filter(c => c.tipo === "Empresa").length;
    const personas = clientes.filter(c => c.tipo === "Persona").length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CLIENTES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Cat谩logo de clientes y empresas</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Cliente
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Total",    value: clientes.length, color: "text-cyan-400",   border: "border-cyan-500/20",   icon: <FaUserTie /> },
                        { label: "Activos",  value: activos,         color: "text-green-400",  border: "border-green-500/20",  icon: <FaCheck /> },
                        { label: "Empresas", value: empresas,        color: "text-blue-400",   border: "border-blue-500/20",   icon: <FaBuilding /> },
                        { label: "Personas", value: personas,        color: "text-purple-400", border: "border-purple-500/20", icon: <FaUser /> },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <div className={`text-4xl ${s.color}`}>{s.icon}</div>
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
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaUserTie /> Clientes Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre / Raz贸n Social","RFC","R茅gimen Fiscal","Tipo","Ciudad","Tel茅fono","Cr茅dito","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-5">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay clientes registrados</td></tr>
                                )}
                                {filtrados.map((c, i) => (
                                    <motion.tr key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-5">
                                            <div className="font-bold text-white">{c.nombre}</div>
                                            {c.razonSocial && <div className="text-xs text-gray-500">{c.razonSocial}</div>}
                                        </td>
                                        <td className="py-4 pr-5 text-cyan-300 font-mono text-sm">{c.rfc || "-"}</td>
                                        <td className="py-4 pr-5">
                                            {c.regimenFiscal
                                                ? <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-mono font-bold">{c.regimenFiscal}</span>
                                                : <span className="text-gray-600"></span>}
                                        </td>
                                        <td className="py-4 pr-5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${tipoColor[c.tipo] || "text-gray-300 bg-white/5 border-white/10"}`}>
                                                {c.tipo}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-5 text-gray-400">{c.ciudad || "-"}</td>
                                        <td className="py-4 pr-5 text-gray-400">{c.telefono || "-"}</td>
                                        <td className="py-4 pr-5 text-gray-400">{c.creditoDias && c.creditoDias !== "0" ? `${c.creditoDias} d铆as` : "Contado"}</td>
                                        <td className="py-4 pr-5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${c.status === "Activo" ? "text-green-300 bg-green-500/10 border-green-400/30" : "text-red-300 bg-red-500/10 border-red-400/30"}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(c)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                <button onClick={() => handleDelete(c.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
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
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar Cliente" : "Nuevo Cliente"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">

                                    <Field label="Nombre / Raz贸n Social" span2>
                                        <input value={form.nombre} onChange={set("nombre")} placeholder="Nombre completo o raz贸n social" className={inputCls} />
                                    </Field>
                                    <Field label="Nombre comercial">
                                        <input value={form.razonSocial} onChange={set("razonSocial")} placeholder="Nombre comercial (opcional)" className={inputCls} />
                                    </Field>
                                    <Field label="RFC">
                                        <input value={form.rfc} onChange={set("rfc")} placeholder="RFC000000XXX" className={inputCls} />
                                    </Field>
                                    <Field label="Tipo de cliente">
                                        <select value={form.tipo} onChange={set("tipo")} className={selectCls}>
                                            <option>Empresa</option><option>Persona</option>
                                        </select>
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Activo</option><option>Inactivo</option><option>Bloqueado</option>
                                        </select>
                                    </Field>

                                    {/* SECCI脫N SAT */}
                                    <div className="col-span-2 p-4 rounded-2xl bg-purple-500/5 border border-purple-400/20">
                                        <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Datos fiscales SAT (para timbrado CFDI)</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="R茅gimen Fiscal (SAT)" span2>
                                                <select value={form.regimenFiscal} onChange={e => {
                                                    const reg = REGIMENES.find(r => r.clave === e.target.value);
                                                    setForm(prev => ({ ...prev, regimenFiscal: e.target.value, regimenFiscalDesc: reg?.desc || "" }));
                                                }} className={selectCls}>
                                                    <option value="">Seleccionar r茅gimen fiscal...</option>
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
                                            El c贸digo postal fiscal se captura abajo, en la secci贸n de Direcci贸n -se usa el mismo dato para timbrado y domicilio.
                                        </p>
                                    </div>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Contacto</p>
                                    <Field label="Tel茅fono">
                                        <input value={form.telefono} onChange={set("telefono")} className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                                    </Field>
                                    <Field label="Persona de contacto">
                                        <input value={form.contactoPrincipal} onChange={set("contactoPrincipal")} className={inputCls} />
                                    </Field>
                                    <Field label="Tel. del contacto">
                                        <input value={form.contactoTelefono} onChange={set("contactoTelefono")} className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Direcci贸n</p>
                                    <Field label="Calle y Número" span2>
                                        <input value={form.direccion} onChange={set("direccion")} placeholder="Calle, Número exterior/interior" className={inputCls} />
                                    </Field>

                                    <div className="col-span-2">
                                        <CodigoPostalInput value={direccionCp} onChange={handleDireccionChange} />
                                    </div>

                                    <Field label="Pa铆s">
                                        <input value={form.pais} onChange={set("pais")} className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Cr茅dito</p>
                                    <Field label="D铆as de cr茅dito">
                                        <select value={form.creditoDias} onChange={set("creditoDias")} className={selectCls}>
                                            <option value="0">Contado</option>
                                            <option value="15">15 d铆as</option>
                                            <option value="30">30 d铆as</option>
                                            <option value="60">60 d铆as</option>
                                            <option value="90">90 d铆as</option>
                                        </select>
                                    </Field>
                                    <Field label="L铆mite de cr茅dito (MXN)">
                                        <input type="number" value={form.limiteCredito} onChange={set("limiteCredito")} placeholder="0.00" className={inputCls} />
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
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Cliente"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}






