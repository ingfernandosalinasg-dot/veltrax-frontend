import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaMapMarkerAlt, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck,
         FaHistory, FaRoute, FaFileAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
const API = API_URL;

const emptyForm = {
    nombre: "", razonSocial: "", rfc: "", telefono: "", email: "",
    direccion: "", ciudad: "", estado: "", pais: "México", codigoPostal: "",
    contacto: "", contactoTelefono: "", horariosRecepcion: "", requisitosDescarga: "", notas: "", status: "Activo",
    // Campos SAT
    regimenFiscal: "", regimenFiscalDesc: "",
    usoCfdi: "", usoCfdiDesc: "",
    numRegIdTrib: "", residenciaFiscal: "",
};

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

export default function DestinatariosPage() {
    const [destinatarios, setDestinatarios] = useState([]);
    const [showModal,     setShowModal]     = useState(false);
    const [editando,      setEditando]      = useState(null);
    const [form,          setForm]          = useState(emptyForm);
    const [loading,       setLoading]       = useState(false);
    const [errorGuardar,  setErrorGuardar]  = useState("");

    const [showHistorial,     setShowHistorial]     = useState(false);
    const [destinatarioActivo, setDestinatarioActivo] = useState(null);
    const [historial,         setHistorial]         = useState(null);
    const [loadingHistorial,  setLoadingHistorial]  = useState(false);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchDestinatarios = async () => {
        try {
            const res  = await fetch(`${API}/destinatarios`, { headers });
            const data = await res.json();
            setDestinatarios(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchDestinatarios(); }, []);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

    const openNew  = () => { setEditando(null); setForm(emptyForm); setErrorGuardar(""); setShowModal(true); };
    const openEdit = (d) => { setEditando(d.id); setForm({ ...emptyForm, ...d }); setErrorGuardar(""); setShowModal(true); };

    // Si el servidor rechaza el guardado ({"error": mensaje}), el mensaje se
    // muestra en la ventana, que sigue abierta para corregir.
    const handleSubmit = async () => {
        setLoading(true);
        setErrorGuardar("");
        try {
            const url    = editando ? `${API}/destinatarios/${editando}` : `${API}/destinatarios`;
            const method = editando ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (!res.ok) {
                const cuerpo = await res.json().catch(() => null);
                setErrorGuardar(cuerpo?.error || `No se pudo guardar (error ${res.status}).`);
                return;
            }
            setShowModal(false);
            fetchDestinatarios();
        } catch (e) {
            console.error(e);
            setErrorGuardar("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este destinatario?")) return;
        await fetch(`${API}/destinatarios/${id}`, { method: "DELETE", headers });
        fetchDestinatarios();
    };

    const abrirHistorial = async (d) => {
        setDestinatarioActivo(d);
        setShowHistorial(true);
        setLoadingHistorial(true);
        try {
            const res  = await fetch(`${API}/destinatarios/${d.id}/historial`, { headers });
            const data = await res.json();
            setHistorial(data);
        } catch (e) { setHistorial(null); }
        setLoadingHistorial(false);
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">DESTINATARIOS</h1>
                        <p className="text-gray-400 mt-2">Destino de entrega y su historial de viajes</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Destinatario
                    </motion.button>
                </motion.div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaMapMarkerAlt /> Destinatarios Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Nombre", "RFC", "Régimen Fiscal", "Ciudad", "Contacto", "Status", "Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {destinatarios.length === 0 && (
                                    <tr><td colSpan={7} className="py-10 text-center text-gray-500">No hay destinatarios registrados</td></tr>
                                )}
                                {destinatarios.map((d, i) => (
                                    <motion.tr key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300 text-sm">{d.nombre}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm font-mono">{d.rfc || "—"}</td>
                                        <td className="py-4 pr-4">
                                            {d.regimenFiscal ? (
                                                <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-mono font-bold">
                                                    {d.regimenFiscal}
                                                </span>
                                            ) : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm">{d.ciudad || "—"}</td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm">{d.contacto || "—"}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${d.status === "Activo" ? "text-green-300 bg-green-500/10 border-green-400/30" : "text-gray-400 bg-white/5 border-white/10"}`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => abrirHistorial(d)}
                                                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-400/20 text-purple-300 hover:bg-purple-500/20 transition-all text-xs font-bold">
                                                    <FaHistory size={10} /> Historial
                                                </button>
                                                <button onClick={() => openEdit(d)} className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit size={12} /></button>
                                                <button onClick={() => handleDelete(d.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showHistorial && destinatarioActivo && (
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25 }}
                        className="fixed right-0 top-0 h-full w-[480px] bg-[#020617] border-l border-cyan-400/20 z-50 flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-cyan-400/10 flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-cyan-300">{destinatarioActivo.nombre}</h2>
                                <p className="text-gray-400 text-sm mt-1">{destinatarioActivo.ciudad} — {destinatarioActivo.rfc || "sin RFC"}</p>
                            </div>
                            <button onClick={() => setShowHistorial(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {loadingHistorial ? (
                                <p className="text-center text-gray-500 py-10">Cargando historial...</p>
                            ) : !historial ? (
                                <p className="text-center text-gray-500 py-10">No se pudo cargar el historial</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="rounded-2xl bg-cyan-500/10 border border-cyan-400/20 p-4 text-center">
                                            <p className="text-cyan-400 text-xs font-bold uppercase">Viajes</p>
                                            <p className="text-3xl font-black text-cyan-300 mt-1">{historial.totalViajes}</p>
                                        </div>
                                        <div className="rounded-2xl bg-purple-500/10 border border-purple-400/20 p-4 text-center">
                                            <p className="text-purple-400 text-xs font-bold uppercase">Cartas Porte</p>
                                            <p className="text-3xl font-black text-purple-300 mt-1">{historial.totalCartasPorte}</p>
                                        </div>
                                    </div>

                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><FaRoute /> Viajes</p>
                                    {historial.viajes.length === 0 ? (
                                        <p className="text-gray-500 text-sm mb-6">Este destinatario aún no aparece en ningún viaje.</p>
                                    ) : (
                                        <div className="space-y-2 mb-6">
                                            {historial.viajes.map(v => (
                                                <div key={v.id} className="bg-white/5 border border-cyan-400/10 rounded-xl p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{v.folio || `#${v.id}`}</p>
                                                        <p className="text-gray-400 text-xs">{v.origen || "—"} → {v.clienteNombre}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-green-300 font-bold text-sm">${(v.cost || 0).toLocaleString()}</p>
                                                        <p className="text-gray-500 text-xs">{v.date}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><FaFileAlt /> Cartas Porte</p>
                                    {historial.cartasPorte.length === 0 ? (
                                        <p className="text-gray-500 text-sm">Este destinatario aún no aparece en ninguna carta porte.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {historial.cartasPorte.map(c => (
                                                <div key={c.id} className="bg-white/5 border border-purple-400/10 rounded-xl p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{c.folio || `#${c.id}`}</p>
                                                        <p className="text-gray-400 text-xs">{c.remitenteNombre || "—"} →</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-gray-500 text-xs">{c.fechaEmision}</p>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">{c.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar Destinatario" : "Nuevo Destinatario"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Nombre" span2>
                                        <input value={form.nombre} onChange={set("nombre")} className={inputCls} />
                                    </Field>
                                    <Field label="Razón Social">
                                        <input value={form.razonSocial} onChange={set("razonSocial")} className={inputCls} />
                                    </Field>
                                    <Field label="RFC">
                                        <input value={form.rfc} onChange={set("rfc")} className={inputCls} />
                                    </Field>

                                    {/* SECCIÓN SAT */}
                                    <div className="col-span-2 mt-2 p-4 rounded-2xl bg-purple-500/5 border border-purple-400/20">
                                        <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Datos fiscales SAT (para timbrado CFDI)</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Régimen Fiscal (SAT)" span2>
                                                <select value={form.regimenFiscal || ""} onChange={e => {
                                                    const reg = REGIMENES.find(r => r.clave === e.target.value);
                                                    setForm(prev => ({ ...prev, regimenFiscal: e.target.value, regimenFiscalDesc: reg?.desc || "" }));
                                                }} className={selectCls}>
                                                    <option value="">Seleccionar régimen fiscal...</option>
                                                    {REGIMENES.map(r => <option key={r.clave} value={r.clave}>{r.clave} — {r.desc}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Uso CFDI (SAT)" span2>
                                                <select value={form.usoCfdi || ""} onChange={e => {
                                                    const uso = USOS_CFDI.find(u => u.clave === e.target.value);
                                                    setForm(prev => ({ ...prev, usoCfdi: e.target.value, usoCfdiDesc: uso?.desc || "" }));
                                                }} className={selectCls}>
                                                    <option value="">Seleccionar uso de CFDI...</option>
                                                    {USOS_CFDI.map(u => <option key={u.clave} value={u.clave}>{u.clave} — {u.desc}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Num. Reg. ID Trib. (extranjeros)" span2>
                                                <input value={form.numRegIdTrib || ""} onChange={set("numRegIdTrib")} placeholder="Solo si es extranjero" className={inputCls} />
                                            </Field>
                                        </div>
                                        <p className="text-purple-300/60 text-xs mt-3">
                                            El código postal fiscal es el campo «Código Postal» de la dirección, más abajo.
                                        </p>
                                    </div>

                                    <Field label="Teléfono">
                                        <input value={form.telefono} onChange={set("telefono")} className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input value={form.email} onChange={set("email")} className={inputCls} />
                                    </Field>
                                    <Field label="Dirección" span2>
                                        <input value={form.direccion} onChange={set("direccion")} className={inputCls} />
                                    </Field>
                                    <Field label="Ciudad">
                                        <input value={form.ciudad} onChange={set("ciudad")} className={inputCls} />
                                    </Field>
                                    <Field label="Estado">
                                        <input value={form.estado} onChange={set("estado")} className={inputCls} />
                                    </Field>
                                    <Field label="País">
                                        <input value={form.pais} onChange={set("pais")} className={inputCls} />
                                    </Field>
                                    <Field label="Código Postal">
                                        <input value={form.codigoPostal} onChange={set("codigoPostal")} className={inputCls} />
                                    </Field>
                                    <Field label="Contacto">
                                        <input value={form.contacto} onChange={set("contacto")} className={inputCls} />
                                    </Field>
                                    <Field label="Teléfono de contacto">
                                        <input value={form.contactoTelefono} onChange={set("contactoTelefono")} className={inputCls} />
                                    </Field>
                                    <Field label="Horarios de recepción" span2>
                                        <input value={form.horariosRecepcion} onChange={set("horariosRecepcion")} placeholder="Lunes a viernes 8am-5pm" className={inputCls} />
                                    </Field>
                                    <Field label="Requisitos de descarga" span2>
                                        <input value={form.requisitosDescarga} onChange={set("requisitosDescarga")} placeholder="Cita previa, rampa, etc." className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Activo</option>
                                            <option>Inactivo</option>
                                        </select>
                                    </Field>
                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={2} className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            </div>
                            {errorGuardar && (
                                <p role="alert" className="mx-8 mt-4 px-4 py-3 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 text-sm flex-shrink-0">
                                    {errorGuardar}
                                </p>
                            )}
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Destinatario"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
