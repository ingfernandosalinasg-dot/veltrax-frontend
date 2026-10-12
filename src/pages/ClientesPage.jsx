import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CodigoPostalInput from "../components/CodigoPostalInput";
import ValidacionRegimenUso from "../components/ValidacionRegimenUso";
import { FaUserTie, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaBuilding, FaUser } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
const API = API_URL;

const tipoColor = {
    "Empresa": "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    "Persona": "text-purple-300 bg-purple-500/10 border-purple-400/30",
};

const TABS = [
    { id: "pagos",      label: "Pagos/Créditos" },
    { id: "domicilio",  label: "Domicilio" },
    { id: "infoAd",     label: "Inf. Adicional" },
    { id: "obs",        label: "Observaciones" },
    { id: "contactos",  label: "Contactos" },
];

const emptyContacto = {
    nombreContacto: "", correoElectronico: "",
    telefonos: [],
    parametros: {
        recibirFactura: false, recibirNotifCancelacion: false, recibirComplementoPago: false,
        recibirNotaCredito: false, recibirCartaPorte: false, recibirEstadosCuenta: false,
        permitirVerViajesUnidades: false, permitirVerSeguimientoChoferViaje: false,
        usoServiciosWeb: false, recibirReporteFourkites: false, permitirVerPortalClientes: false,
    },
    usuario: "", contrasena: "", ligaSeguimiento: "",
};
const emptyTelefono = { telefono: "", tipo: "MÓVIL" };

const REGIMENES = [
    { clave: "601", desc: "General de Ley Personas Morales" },
    { clave: "603", desc: "Personas Morales con Fines no Lucrativos" },
    { clave: "605", desc: "Sueldos y Salarios e Ingresos Asimilados" },
    { clave: "606", desc: "Arrendamiento" },
    { clave: "608", desc: "Demás Ingresos" },
    { clave: "610", desc: "Residentes en el Extranjero" },
    { clave: "612", desc: "Personas Físicas con Actividades Empresariales" },
    { clave: "616", desc: "Sin obligaciones fiscales" },
    { clave: "620", desc: "Sociedades Cooperativas de Producción" },
    { clave: "621", desc: "Incorporación Fiscal" },
    { clave: "622", desc: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
    { clave: "626", desc: "Régimen Simplificado de Confianza (RESICO)" },
];

const USOS_CFDI = [
    { clave: "G01", desc: "Adquisición de mercancias" },
    { clave: "G02", desc: "Devoluciones, descuentos o bonificaciones" },
    { clave: "G03", desc: "Gastos en general" },
    { clave: "I01", desc: "Construcciones" },
    { clave: "I03", desc: "Equipo de transporte" },
    { clave: "I04", desc: "Equipo de computo y accesorios" },
    { clave: "S01", desc: "Sin efectos fiscales" },
    { clave: "CP01", desc: "Pagos" },
    { clave: "CN01", desc: "Nómina" },
];

const emptyForm = {
    // Encabezado general
    numeroCliente: "", nombre: "", razonSocial: "", fechaAlta: "", rfc: "", curp: "",
    tipoCliente: "NACIONAL", monedaCliente: "PESOS", ivaPorcentaje: "IVA 16%",
    grupoCliente: "", sucursalCliente: "MATRIZ",
    activo: true, operadorLogistico: false, detallePorViajeXml: false,
    tipo: "Empresa", status: "Activo",
    // Base
    telefono: "", email: "", direccion: "", ciudad: "",
    estado: "", pais: "México", codigoPostal: "",
    municipio: "", localidad: "", colonia: "",
    creditoDias: "0", limiteCredito: "",
    contactoPrincipal: "", contactoTelefono: "",
    notas: "",
    // SAT
    regimenFiscal: "", regimenFiscalDesc: "",
    usoCfdi: "", usoCfdiDesc: "",
    numRegIdTrib: "", residenciaFiscal: "",
    // Pagos / Créditos nuevo
    formaPagoCliente: "EFECTIVO",
    limiteCreditoPesos: "", limiteCreditoDolares: "",
    saldoFacturadoPesos: "", saldoFacturadoDolares: "",
    viajesPendFacturarPesos: "", viajesPendFacturarDolares: "",
    limitarViajes: false, limiteFacturasVencidas: "",
    bancoOrdenante: "", bancoOrdenanteExtranjero: false,
    rfcBancoOrdenante: "", noCuentaBancaria: "",
    // Domicilio nuevo
    calle: "", numExterior: "", numInterior: "", celular: "",
    // Inf. Adicional nuevo
    agruparConceptosFacturar: false, ajustar2Decimales: false,
    detallePorConceptoXml: false, desglosarDetalleXml: false,
    desglosarInfoViajeXml: false,
    incluirNombreConcepto: false, incluirDescripcionRuta: false,
    incluirFechaViaje: false, incluirNoViajeCliente: false, incluirObservacionesFactura: false,
    claveTar: "", distanciaDistribuidoraCliente: "", numProveedorLocalizacion: "",
    longitudCliente: "", latitudCliente: "",
    // Observaciones nuevo
    observacionesDescripcion: "",
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
    return <div className="col-span-2 sm:col-span-3 bg-white/5 rounded-lg px-3 py-1.5 text-cyan-400 text-xs font-bold uppercase tracking-widest">{children}</div>;
}

export default function ClientesPage() {
    const [clientes,  setClientes]  = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editando,  setEditando]  = useState(null);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [busqueda,  setBusqueda]  = useState("");
    const [activeTab, setActiveTab] = useState("pagos");
    const [errorGuardar, setErrorGuardar] = useState("");

    const [contactos,    setContactos]    = useState([]);
    const [nuevoContacto, setNuevoContacto] = useState({ ...emptyContacto, telefonos: [] });
    const [nuevoTel,      setNuevoTel]      = useState({ ...emptyTelefono });

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchClientes = async () => {
        try {
            const res  = await fetch(`${API}/clients`, { headers });
            const data = await res.json();
            setClientes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchClientes(); }, []);

    const set  = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const setB = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.checked }));

    const openNew = () => {
        setEditando(null);
        setForm(emptyForm);
        setContactos([]);
        setNuevoContacto({ ...emptyContacto, telefonos: [] });
        setNuevoTel({ ...emptyTelefono });
        setActiveTab("pagos");
        setErrorGuardar("");
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditando(c.id);
        setForm({ ...emptyForm, ...c });
        try { setContactos(c.contactosJson ? JSON.parse(c.contactosJson) : []); } catch { setContactos([]); }
        setNuevoContacto({ ...emptyContacto, telefonos: [] });
        setNuevoTel({ ...emptyTelefono });
        setActiveTab("pagos");
        setErrorGuardar("");
        setShowModal(true);
    };

    const agregarTelAlContacto = () => {
        if (!nuevoTel.telefono) return;
        setNuevoContacto(c => ({ ...c, telefonos: [...c.telefonos, nuevoTel] }));
        setNuevoTel({ ...emptyTelefono });
    };
    const quitarTelDelContacto = (idx) => setNuevoContacto(c => ({ ...c, telefonos: c.telefonos.filter((_, i) => i !== idx) }));
    const setParametroContacto = (campo) => (e) => setNuevoContacto(c => ({ ...c, parametros: { ...c.parametros, [campo]: e.target.checked } }));

    const agregarContacto = () => {
        if (!nuevoContacto.nombreContacto) return;
        setContactos(cs => [...cs, nuevoContacto]);
        setNuevoContacto({ ...emptyContacto, telefonos: [] });
    };
    const quitarContacto = (idx) => setContactos(cs => cs.filter((_, i) => i !== idx));

    // Si el servidor rechaza el guardado ({"error": mensaje}), el mensaje se
    // muestra en la ventana, que sigue abierta para corregir.
    const handleSubmit = async () => {
        setLoading(true);
        setErrorGuardar("");
        try {
            const numFields = ["limiteCreditoPesos","limiteCreditoDolares","saldoFacturadoPesos","saldoFacturadoDolares",
                "viajesPendFacturarPesos","viajesPendFacturarDolares"];
            const payload = { ...form };
            numFields.forEach(f => { payload[f] = payload[f] !== "" && payload[f] !== null ? Number(payload[f]) : null; });
            payload.contactosJson = JSON.stringify(contactos);

            const url    = editando ? `${API}/clients/${editando}` : `${API}/clients`;
            const method = editando ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (!res.ok) {
                const cuerpo = await res.json().catch(() => null);
                setErrorGuardar(cuerpo?.error || `No se pudo guardar (error ${res.status}).`);
                return;
            }
            setShowModal(false);
            fetchClientes();
        } catch (e) {
            console.error(e);
            setErrorGuardar("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este cliente?")) return;
        try { await fetch(`${API}/clients/${id}`, { method: "DELETE", headers }); fetchClientes(); }
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
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CLIENTES</h1>
                        <p className="text-gray-400 mt-4 text-lg md:text-xl">Catálogo de clientes y empresas</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Cliente
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 mb-10">
                    {[
                        { label: "Total",    value: clientes.length, color: "text-cyan-400",   border: "border-cyan-500/20",   icon: <FaUserTie /> },
                        { label: "Activos",  value: activos,         color: "text-green-400",  border: "border-green-500/20",  icon: <FaCheck /> },
                        { label: "Empresas", value: empresas,        color: "text-blue-400",   border: "border-blue-500/20",   icon: <FaBuilding /> },
                        { label: "Personas", value: personas,        color: "text-purple-400", border: "border-purple-500/20", icon: <FaUser /> },
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
                        placeholder="Buscar por nombre, RFC o ciudad..."
                        className="w-full max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-4 md:p-8">
                    <h2 className="text-2xl md:text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaUserTie /> Clientes Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Código","Nombre / Razón Social","RFC","Régimen Fiscal","Tipo","Ciudad","Teléfono","Crédito","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-5 whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr><td colSpan={10} className="py-10 text-center text-gray-500">No hay clientes registrados</td></tr>
                                )}
                                {filtrados.map((c, i) => (
                                    <motion.tr key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-5 font-mono text-cyan-300 font-bold whitespace-nowrap">{c.numeroCliente || "-"}</td>
                                        <td className="py-4 pr-5 whitespace-nowrap">
                                            <div className="font-bold text-white">{c.nombre}</div>
                                            {c.razonSocial && <div className="text-xs text-gray-500">{c.razonSocial}</div>}
                                        </td>
                                        <td className="py-4 pr-5 text-cyan-300 font-mono text-sm whitespace-nowrap">{c.rfc || "-"}</td>
                                        <td className="py-4 pr-5">
                                            {c.regimenFiscal
                                                ? <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-mono font-bold">{c.regimenFiscal}</span>
                                                : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="py-4 pr-5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${tipoColor[c.tipo] || "text-gray-300 bg-white/5 border-white/10"}`}>
                                                {c.tipo}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-5 text-gray-400 whitespace-nowrap">{c.ciudad || "-"}</td>
                                        <td className="py-4 pr-5 text-gray-400 whitespace-nowrap">{c.telefono || "-"}</td>
                                        <td className="py-4 pr-5 text-gray-400 whitespace-nowrap">{c.creditoDias && c.creditoDias !== "0" ? `${c.creditoDias} días` : "Contado"}</td>
                                        <td className="py-4 pr-5">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${c.status === "Activo" ? "text-green-300 bg-green-500/10 border-green-400/30" : "text-red-300 bg-red-500/10 border-red-400/30"}`}>
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
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col">
                            <div className="flex justify-between items-center p-5 sm:p-8 pb-0 flex-shrink-0">
                                <h2 className="text-xl sm:text-3xl font-black text-cyan-300">{editando ? "Editar Cliente" : "Nuevo Cliente"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {/* ENCABEZADO GENERAL */}
                                <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-cyan-400/10">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Número Cliente">
                                            <input value={form.numeroCliente} onChange={set("numeroCliente")} placeholder="000038" className={inputCls + " font-bold text-cyan-300"} />
                                        </Field>
                                        <Field label="Nombre Fiscal" span2>
                                            <input value={form.nombre} onChange={set("nombre")} placeholder="Nombre completo o razón social" className={inputCls} />
                                        </Field>
                                        <Field label="Nombre Corto">
                                            <input value={form.razonSocial} onChange={set("razonSocial")} className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Fecha de alta">
                                            <input type="date" value={form.fechaAlta} onChange={set("fechaAlta")} className={inputCls} />
                                        </Field>
                                        <Field label="RFC">
                                            <input value={form.rfc} onChange={set("rfc")} placeholder="RFC000000XXX" className={inputCls} />
                                        </Field>
                                        <Field label="CURP">
                                            <input value={form.curp} onChange={set("curp")} className={inputCls} />
                                        </Field>
                                        <Field label="Tipo Cliente">
                                            <select value={form.tipoCliente} onChange={set("tipoCliente")} className={selectCls}>
                                                <option>NACIONAL</option><option>EXTRANJERO</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <Field label="Moneda">
                                            <select value={form.monedaCliente} onChange={set("monedaCliente")} className={selectCls}>
                                                <option>PESOS</option><option>DÓLARES</option>
                                            </select>
                                        </Field>
                                        <Field label="IVA">
                                            <select value={form.ivaPorcentaje} onChange={set("ivaPorcentaje")} className={selectCls}>
                                                <option>IVA 16%</option><option>IVA 0%</option><option>Exento</option>
                                            </select>
                                        </Field>
                                        <Field label="Grupo">
                                            <input value={form.grupoCliente} onChange={set("grupoCliente")} className={inputCls} />
                                        </Field>
                                        <Field label="Sucursal">
                                            <input value={form.sucursalCliente} onChange={set("sucursalCliente")} placeholder="MATRIZ" className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
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
                                    </div>
                                    <div className="flex flex-wrap gap-5">
                                        <Check label="Activo" checked={!!form.activo} onChange={setB("activo")} />
                                        <Check label="Operador Logístico" checked={!!form.operadorLogistico} onChange={setB("operadorLogistico")} />
                                        <Check label="Aplicar en el XML de la factura, el detalle por viaje" checked={!!form.detallePorViajeXml} onChange={setB("detallePorViajeXml")} />
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

                                    {/* PAGOS / CRÉDITOS */}
                                    {activeTab === "pagos" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <SectionTitle>Método de Pago y Crédito</SectionTitle>
                                            <Field label="Forma de Pago">
                                                <select value={form.formaPagoCliente} onChange={set("formaPagoCliente")} className={selectCls}>
                                                    <option>EFECTIVO</option><option>TRANSFERENCIA</option><option>CHEQUE</option><option>TARJETA</option>
                                                </select>
                                            </Field>
                                            <Field label="Días Crédito">
                                                <select value={form.creditoDias} onChange={set("creditoDias")} className={selectCls}>
                                                    <option value="0">Contado</option>
                                                    <option value="15">15 días</option>
                                                    <option value="30">30 días</option>
                                                    <option value="60">60 días</option>
                                                    <option value="90">90 días</option>
                                                </select>
                                            </Field>
                                            <div />
                                            <Field label="Límite Crédito (Pesos)"><input type="number" value={form.limiteCreditoPesos} onChange={set("limiteCreditoPesos")} className={inputCls} /></Field>
                                            <Field label="Límite Crédito (Dólares)"><input type="number" value={form.limiteCreditoDolares} onChange={set("limiteCreditoDolares")} className={inputCls} /></Field>
                                            <div />
                                            <Field label="Saldo Facturado x Cobrar (Pesos)"><input type="number" value={form.saldoFacturadoPesos} onChange={set("saldoFacturadoPesos")} className={inputCls} /></Field>
                                            <Field label="Saldo Facturado x Cobrar (Dólares)"><input type="number" value={form.saldoFacturadoDolares} onChange={set("saldoFacturadoDolares")} className={inputCls} /></Field>
                                            <div />
                                            <Field label="Viajes Pend. Facturar (Pesos)"><input type="number" value={form.viajesPendFacturarPesos} onChange={set("viajesPendFacturarPesos")} className={inputCls} /></Field>
                                            <Field label="Viajes Pend. Facturar (Dólares)"><input type="number" value={form.viajesPendFacturarDolares} onChange={set("viajesPendFacturarDolares")} className={inputCls} /></Field>
                                            <div />
                                            <div className="flex items-end pb-2.5">
                                                <Check label="Limitar viajes" checked={!!form.limitarViajes} onChange={setB("limitarViajes")} />
                                            </div>
                                            <Field label="Límite de facturas vencidas">
                                                <input type="number" value={form.limiteFacturasVencidas} onChange={set("limiteFacturasVencidas")} className={inputCls} />
                                            </Field>
                                            <div />

                                            <SectionTitle>Información Adicional del Pago</SectionTitle>
                                            <Field label="Banco Ordenante">
                                                <input value={form.bancoOrdenante} onChange={set("bancoOrdenante")} className={inputCls} />
                                            </Field>
                                            <div className="flex items-end pb-2.5">
                                                <Check label="Banco Ordenante Extranjero" checked={!!form.bancoOrdenanteExtranjero} onChange={setB("bancoOrdenanteExtranjero")} />
                                            </div>
                                            <div />
                                            <Field label="RFC">
                                                <input value={form.rfcBancoOrdenante} onChange={set("rfcBancoOrdenante")} className={inputCls} />
                                            </Field>
                                            <Field label="No. Cuenta">
                                                <input value={form.noCuentaBancaria} onChange={set("noCuentaBancaria")} className={inputCls} />
                                            </Field>
                                        </div>
                                    )}

                                    {/* DOMICILIO */}
                                    {activeTab === "domicilio" && (
                                        <div className="space-y-4">
                                            <Field label="País">
                                                <input value={form.pais} onChange={set("pais")} className={inputCls} />
                                            </Field>
                                            <div>
                                                <CodigoPostalInput value={direccionCp} onChange={handleDireccionChange} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <Field label="Calle">
                                                    <input value={form.calle} onChange={set("calle")} className={inputCls} />
                                                </Field>
                                                <Field label="No. Exterior">
                                                    <input value={form.numExterior} onChange={set("numExterior")} className={inputCls} />
                                                </Field>
                                                <Field label="No. Interior">
                                                    <input value={form.numInterior} onChange={set("numInterior")} className={inputCls} />
                                                </Field>
                                                <Field label="Teléfonos">
                                                    <input value={form.telefono} onChange={set("telefono")} className={inputCls} />
                                                </Field>
                                                <Field label="Celular">
                                                    <input value={form.celular} onChange={set("celular")} className={inputCls} />
                                                </Field>
                                                <Field label="Correo">
                                                    <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
                                                </Field>
                                            </div>
                                        </div>
                                    )}

                                    {/* INF. ADICIONAL */}
                                    {activeTab === "infoAd" && (
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Proceso Facturación</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                    <div className="space-y-2">
                                                        <Check label="Permitir agrupar la cantidad de conceptos al facturar." checked={!!form.agruparConceptosFacturar} onChange={setB("agruparConceptosFacturar")} />
                                                        <Check label="Ajustar a 2 decimales los importe de los conceptos en facturación x viaje." checked={!!form.ajustar2Decimales} onChange={setB("ajustar2Decimales")} />
                                                        <Check label="Aplicar en el XML de la factura, el detalle por concepto de cada viaje/carta porte." checked={!!form.detallePorConceptoXml} onChange={setB("detallePorConceptoXml")} />
                                                        <Check label="Desglosar detalle (en el concepto) dentro del XML." checked={!!form.desglosarDetalleXml} onChange={setB("desglosarDetalleXml")} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Check label="Desglosar información del viaje (en el concepto) dentro del XML." checked={!!form.desglosarInfoViajeXml} onChange={setB("desglosarInfoViajeXml")} />
                                                        <div className="pl-6 space-y-2">
                                                            <Check label="Nombre de Concepto de facturación." checked={!!form.incluirNombreConcepto} onChange={setB("incluirNombreConcepto")} />
                                                            <Check label="Descripción de Ruta." checked={!!form.incluirDescripcionRuta} onChange={setB("incluirDescripcionRuta")} />
                                                            <Check label="Fecha de viaje." checked={!!form.incluirFechaViaje} onChange={setB("incluirFechaViaje")} />
                                                            <Check label="No. Viaje de cliente (Load Number)." checked={!!form.incluirNoViajeCliente} onChange={setB("incluirNoViajeCliente")} />
                                                            <Check label="Observaciones de la factura." checked={!!form.incluirObservacionesFactura} onChange={setB("incluirObservacionesFactura")} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="No. Registro Identidad Fiscal">
                                                        <input value={form.numRegIdTrib} onChange={set("numRegIdTrib")} placeholder="Solo si es extranjero" className={inputCls} />
                                                    </Field>
                                                    <div />
                                                    <Field label="Uso del CFDI">
                                                        <select value={form.usoCfdi} onChange={e => {
                                                            const uso = USOS_CFDI.find(u => u.clave === e.target.value);
                                                            setForm(prev => ({ ...prev, usoCfdi: e.target.value, usoCfdiDesc: uso?.desc || "" }));
                                                        }} className={selectCls}>
                                                            <option value="">Seleccionar uso de CFDI...</option>
                                                            {USOS_CFDI.map(u => <option key={u.clave} value={u.clave}>{u.clave} - {u.desc}</option>)}
                                                        </select>
                                                    </Field>
                                                    <Field label="Régimen Fiscal">
                                                        <select value={form.regimenFiscal} onChange={e => {
                                                            const reg = REGIMENES.find(r => r.clave === e.target.value);
                                                            setForm(prev => ({ ...prev, regimenFiscal: e.target.value, regimenFiscalDesc: reg?.desc || "" }));
                                                        }} className={selectCls}>
                                                            <option value="">Seleccionar régimen fiscal...</option>
                                                            {REGIMENES.map(r => <option key={r.clave} value={r.clave}>{r.clave} - {r.desc}</option>)}
                                                        </select>
                                                    </Field>
                                                </div>
                                                <ValidacionRegimenUso regimen={form.regimenFiscal} uso={form.usoCfdi} />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Proceso Localización</p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field label="Clave TAR"><input value={form.claveTar} onChange={set("claveTar")} className={inputCls} /></Field>
                                                        <Field label="Distancia distribuidora/cliente"><input value={form.distanciaDistribuidoraCliente} onChange={set("distanciaDistribuidoraCliente")} className={inputCls} /></Field>
                                                        <Field label="No. Proveedor"><input value={form.numProveedorLocalizacion} onChange={set("numProveedorLocalizacion")} className={inputCls} /></Field>
                                                        <Field label="Longitud"><input value={form.longitudCliente} onChange={set("longitudCliente")} className={inputCls} /></Field>
                                                        <Field label="Latitud"><input value={form.latitudCliente} onChange={set("latitudCliente")} className={inputCls} /></Field>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* OBSERVACIONES */}
                                    {activeTab === "obs" && (
                                        <div className="space-y-5">
                                            <Field label="Descripción">
                                                <input value={form.observacionesDescripcion} onChange={set("observacionesDescripcion")} className={inputCls} />
                                                <p className="text-gray-500 text-xs mt-1">La carga de archivos estará disponible próximamente.</p>
                                            </Field>
                                            <Field label="Observaciones">
                                                <textarea value={form.notas} onChange={set("notas")} rows={6} className={inputCls + " resize-none"} />
                                            </Field>
                                        </div>
                                    )}

                                    {/* CONTACTOS */}
                                    {activeTab === "contactos" && (
                                        <div className="space-y-5">
                                            <div className="p-4 rounded-2xl border border-cyan-400/10 bg-white/5 space-y-4">
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Agregar Contacto</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Nombre Contacto">
                                                        <input value={nuevoContacto.nombreContacto} onChange={e => setNuevoContacto(c => ({ ...c, nombreContacto: e.target.value }))} className={inputCls} />
                                                    </Field>
                                                    <Field label="Correo Electrónico">
                                                        <input type="email" value={nuevoContacto.correoElectronico} onChange={e => setNuevoContacto(c => ({ ...c, correoElectronico: e.target.value }))} className={inputCls} />
                                                    </Field>
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                    <Field label="Teléfono">
                                                        <input value={nuevoTel.telefono} onChange={e => setNuevoTel(t => ({ ...t, telefono: e.target.value }))} className={inputCls} />
                                                    </Field>
                                                    <Field label="Tipo Teléfono">
                                                        <select value={nuevoTel.tipo} onChange={e => setNuevoTel(t => ({ ...t, tipo: e.target.value }))} className={selectCls}>
                                                            <option>MÓVIL</option><option>FIJO</option><option>OFICINA</option>
                                                        </select>
                                                    </Field>
                                                    <button onClick={agregarTelAlContacto} type="button"
                                                        className="mb-0.5 px-4 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 transition-all">+</button>
                                                </div>
                                                {nuevoContacto.telefonos.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {nuevoContacto.telefonos.map((t, i) => (
                                                            <span key={i} className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs flex items-center gap-2">
                                                                {t.telefono} ({t.tipo})
                                                                <button onClick={() => quitarTelDelContacto(i)} className="text-red-400 hover:text-red-300"><FaTimes size={10} /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Parámetros</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <Check label="Recibir Factura" checked={nuevoContacto.parametros.recibirFactura} onChange={setParametroContacto("recibirFactura")} />
                                                    <Check label="Recibir notificación de cancelación de factura" checked={nuevoContacto.parametros.recibirNotifCancelacion} onChange={setParametroContacto("recibirNotifCancelacion")} />
                                                    <Check label="Recibir Complemento de Pago" checked={nuevoContacto.parametros.recibirComplementoPago} onChange={setParametroContacto("recibirComplementoPago")} />
                                                    <Check label="Recibir Nota de Crédito" checked={nuevoContacto.parametros.recibirNotaCredito} onChange={setParametroContacto("recibirNotaCredito")} />
                                                    <Check label="Recibir Carta Porte" checked={nuevoContacto.parametros.recibirCartaPorte} onChange={setParametroContacto("recibirCartaPorte")} />
                                                    <Check label="Recibir Estados de Cuenta" checked={nuevoContacto.parametros.recibirEstadosCuenta} onChange={setParametroContacto("recibirEstadosCuenta")} />
                                                    <Check label="Permitir ver seguimiento de viajes/unidades" checked={nuevoContacto.parametros.permitirVerViajesUnidades} onChange={setParametroContacto("permitirVerViajesUnidades")} />
                                                    <Check label="Permitir ver seguimiento al asignar chofer al viaje" checked={nuevoContacto.parametros.permitirVerSeguimientoChoferViaje} onChange={setParametroContacto("permitirVerSeguimientoChoferViaje")} />
                                                    <Check label="Uso de Servicios Web" checked={nuevoContacto.parametros.usoServiciosWeb} onChange={setParametroContacto("usoServiciosWeb")} />
                                                    <Check label="Recibir reporte FOURKITES" checked={nuevoContacto.parametros.recibirReporteFourkites} onChange={setParametroContacto("recibirReporteFourkites")} />
                                                    <Check label="Permitir ver portal de clientes" checked={nuevoContacto.parametros.permitirVerPortalClientes} onChange={setParametroContacto("permitirVerPortalClientes")} />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Usuario"><input value={nuevoContacto.usuario} onChange={e => setNuevoContacto(c => ({ ...c, usuario: e.target.value }))} className={inputCls} /></Field>
                                                    <Field label="Contraseña"><input type="password" value={nuevoContacto.contrasena} onChange={e => setNuevoContacto(c => ({ ...c, contrasena: e.target.value }))} className={inputCls} /></Field>
                                                </div>
                                                <Field label="Liga de seguimiento de unidades">
                                                    <input value={nuevoContacto.ligaSeguimiento} onChange={e => setNuevoContacto(c => ({ ...c, ligaSeguimiento: e.target.value }))} className={inputCls} />
                                                </Field>
                                                <button onClick={agregarContacto} type="button"
                                                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-sm">
                                                    Agregar Contacto
                                                </button>
                                            </div>

                                            <div className="rounded-2xl border border-cyan-400/10 overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-white/5 text-gray-400">
                                                            <th className="px-3 py-2">Nombre Contacto</th>
                                                            <th className="px-3 py-2">Correo Electrónico</th>
                                                            <th className="px-3 py-2">Teléfonos</th>
                                                            <th className="px-3 py-2">Parámetros Configurados</th>
                                                            <th className="px-3 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {contactos.length === 0 && (
                                                            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Sin contactos agregados</td></tr>
                                                        )}
                                                        {contactos.map((c, i) => (
                                                            <tr key={i} className="border-t border-white/5">
                                                                <td className="px-3 py-2 text-white whitespace-nowrap">{c.nombreContacto}</td>
                                                                <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{c.correoElectronico}</td>
                                                                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{c.telefonos?.map(t => t.telefono).join(", ")}</td>
                                                                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{Object.values(c.parametros || {}).filter(Boolean).length} activos</td>
                                                                <td className="px-3 py-2"><button onClick={() => quitarContacto(i)} className="text-red-400 hover:text-red-300"><FaTrash size={11} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
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
