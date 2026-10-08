import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CodigoPostalInput from "../components/CodigoPostalInput";
import TablaCatalogo from "../components/TablaCatalogo";
import { FaWarehouse, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
const API = API_URL;

// Proveedores reales (Fase 0, D3): los usan Artículos, Órdenes de compra,
// Órdenes de servicio y Reportes de falla. Los campos coinciden con la lista
// blanca del backend (ProveedorRequest).
const emptyForm = {
    nombre: "", razonSocial: "", rfc: "",
    telefono: "", email: "", sitioWeb: "",
    direccion: "", ciudad: "", pais: "México", codigoPostal: "",
    estado: "", municipio: "", localidad: "", colonia: "",
    contactoPrincipal: "", contactoTelefono: "", contactoEmail: "",
    condicionesPago: "Contado", notas: "", status: "Activo",
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const STATUS           = ["Activo", "Inactivo", "Bloqueado"];
const CONDICIONES_PAGO = ["Contado", "Crédito 15 días", "Crédito 30 días", "Crédito 60 días"];

// Si el valor guardado no es una de las opciones (vacío o histórico), se agrega
// tal cual: así la lista muestra lo que realmente se guardará.
const opciones = (lista, actual) => (lista.includes(actual) ? lista : [actual, ...lista])
    .map(o => <option key={o} value={o}>{o}</option>);

const statusCls = (status) => status === "Activo"
    ? "text-green-300 bg-green-500/10 border-green-400/30"
    : "text-red-300 bg-red-500/10 border-red-400/30";

// Para 400, 404 y 409 el backend explica el problema en {"error": ...};
// para cualquier otra respuesta se muestra un mensaje genérico.
async function mensajeError(res) {
    if ([400, 404, 409].includes(res.status)) {
        try {
            const data = await res.json();
            if (data && data.error) return data.error;
        } catch {
            // Respuesta sin cuerpo JSON.
        }
    }
    return `No se pudo completar la operación (error ${res.status}).`;
}

const COLUMNAS = [
    {
        clave: "nombre", titulo: "Nombre / Razón Social",
        valor: p => [p.nombre, p.razonSocial].filter(Boolean).join(" "),
        render: p => (
            <>
                <div className="font-bold text-white">{p.nombre}</div>
                {p.razonSocial && <div className="text-xs text-gray-500">{p.razonSocial}</div>}
            </>
        ),
    },
    { clave: "rfc", titulo: "RFC", render: p => <span className="text-cyan-300 font-mono text-sm">{p.rfc || "-"}</span> },
    {
        clave: "ciudad", titulo: "Ciudad",
        valor: p => [p.ciudad, p.pais].filter(Boolean).join(", "),
        render: p => <span className="text-gray-400">{[p.ciudad, p.pais].filter(Boolean).join(", ") || "-"}</span>,
    },
    { clave: "contactoPrincipal", titulo: "Contacto", render: p => <span className="text-gray-400">{p.contactoPrincipal || "-"}</span> },
    { clave: "telefono", titulo: "Teléfono", render: p => <span className="text-gray-400">{p.telefono || "-"}</span> },
    { clave: "condicionesPago", titulo: "Condiciones de pago", render: p => <span className="text-gray-400 text-sm">{p.condicionesPago || "-"}</span> },
    {
        clave: "status", titulo: "Status",
        render: p => <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusCls(p.status)}`}>{p.status || "-"}</span>,
    },
];

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
    const [errorForm,   setErrorForm]   = useState("");
    const [aviso,       setAviso]       = useState("");
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

    const openNew = () => { setEditando(null); setForm(emptyForm); setErrorForm(""); setShowModal(true); };
    // Solo los campos de la lista blanca. Un campo sin valor (null) se muestra vacío
    // en lugar del valor por omisión de las altas: guardar sin tocarlo no lo cambia.
    const openEdit = (p) => {
        const datos = Object.fromEntries(Object.keys(emptyForm).map(k => [k, p[k] ?? ""]));
        setEditando(p.id); setForm(datos); setErrorForm(""); setShowModal(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrorForm("");
        try {
            const url    = editando ? `${API}/proveedores/${editando}` : `${API}/proveedores`;
            const method = editando ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (res.ok) {
                setShowModal(false);
                fetchProveedores();
            } else {
                setErrorForm(await mensajeError(res));
            }
        } catch (e) {
            console.error(e);
            setErrorForm("No se pudo conectar con el servidor.");
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este proveedor?")) return;
        setAviso("");
        try {
            const res = await fetch(`${API}/proveedores/${id}`, { method: "DELETE", headers });
            if (!res.ok) setAviso(await mensajeError(res));
            fetchProveedores();
        } catch (e) {
            console.error(e);
            setAviso("No se pudo conectar con el servidor.");
        }
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

    const activos = proveedores.filter(p => p.status === "Activo").length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">PROVEEDORES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Proveedores de bienes y servicios</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Proveedor
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                    {[
                        { label: "Total",   value: proveedores.length, color: "text-cyan-400",  border: "border-cyan-500/20" },
                        { label: "Activos", value: activos,            color: "text-green-400", border: "border-green-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <FaWarehouse className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                {aviso && (
                    <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300 px-6 py-4">
                        <p>{aviso}</p>
                        <button onClick={() => setAviso("")} aria-label="Cerrar aviso" className="text-red-300 hover:text-white"><FaTimes /></button>
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaWarehouse /> Proveedores Registrados</h2>
                    <TablaCatalogo
                        columnas={COLUMNAS}
                        filas={proveedores}
                        esActivo={p => p.status === "Activo"}
                        nombreArchivo="proveedores"
                        vacio="No hay proveedores registrados"
                        acciones={p => (
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(p)} aria-label="Editar proveedor" className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                <button onClick={() => handleDelete(p.id)} aria-label="Eliminar proveedor" className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                            </div>
                        )}
                    />
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
                                    <Field label="Nombre / Razón Social *" span2>
                                        <input value={form.nombre} onChange={set("nombre")} placeholder="Empresa o nombre completo" className={inputCls} />
                                    </Field>
                                    <Field label="Nombre comercial">
                                        <input value={form.razonSocial} onChange={set("razonSocial")} placeholder="Nombre comercial (opcional)" className={inputCls} />
                                    </Field>
                                    <Field label="RFC / NIF">
                                        <input value={form.rfc} onChange={set("rfc")} placeholder="RFC000000XXX" className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            {opciones(STATUS, form.status)}
                                        </select>
                                    </Field>
                                    <Field label="Condiciones de pago">
                                        <select value={form.condicionesPago} onChange={set("condicionesPago")} className={selectCls}>
                                            {opciones(CONDICIONES_PAGO, form.condicionesPago)}
                                        </select>
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Contacto principal</p>
                                    <Field label="Teléfono">
                                        <input value={form.telefono} onChange={set("telefono")} placeholder="+52 81 0000 0000" className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.email} onChange={set("email")} placeholder="contacto@empresa.com" className={inputCls} />
                                    </Field>
                                    <Field label="Sitio web" span2>
                                        <input value={form.sitioWeb} onChange={set("sitioWeb")} placeholder="www.empresa.com" className={inputCls} />
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
                                        <textarea value={form.notas} onChange={set("notas")} rows={3} placeholder="Observaciones, condiciones especiales, horarios..." className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            </div>
                            {errorForm && (
                                <div className="mx-8 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm flex-shrink-0">
                                    {errorForm}
                                </div>
                            )}
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
