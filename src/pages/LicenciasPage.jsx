import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaPlus, FaTimes, FaCheck, FaTrash, FaEdit,
         FaMoneyBillWave, FaBuilding, FaCrown, FaUsers,
         FaExclamationTriangle, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:8081";
const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const STATUS_COLORS = {
    ACTIVO:     "text-green-300 bg-green-500/10 border-green-400/30",
    PRUEBA:     "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    VENCIDO:    "text-red-300 bg-red-500/10 border-red-400/30",
    SUSPENDIDO: "text-gray-300 bg-gray-500/10 border-gray-400/30",
};

const PLAN_COLORS = {
    TRANSPORTE: "text-blue-300 bg-blue-500/10 border-blue-400/30",
    FULL:       "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
};

const fmt = n => "$" + Number(n||0).toLocaleString("es-MX", { minimumFractionDigits: 2 });
const emptyForm = { nombre:"", rfc:"", email:"", telefono:"", contacto:"", plan:"TRANSPORTE", status:"PRUEBA", fechaInicio:"", fechaVencimiento:"", precioMensual:"", maxUsuarios:"1", notas:"" };
const emptyUserForm = { name:"", email:"", password:"", role:"OPERADOR", activo:true };

export default function LicenciasPage() {
    const [tenants,       setTenants]       = useState([]);
    const [planes,        setPlanes]        = useState([]);
    const [resumen,       setResumen]       = useState({});
    const [showModal,     setShowModal]     = useState(false);
    const [showPlanes,    setShowPlanes]    = useState(false);
    const [showPanel,     setShowPanel]     = useState(false);
    const [panelTab,      setPanelTab]      = useState("pagos");
    const [editando,      setEditando]      = useState(null);
    const [tenantSel,     setTenantSel]     = useState(null);
    const [pagos,         setPagos]         = useState([]);
    const [usuarios,      setUsuarios]      = useState([]);
    const [form,          setForm]          = useState({ ...emptyForm });
    const [pagoForm,      setPagoForm]      = useState({ monto:"", metodoPago:"TRANSFERENCIA", referencia:"", periodo:"", meses:"1", notas:"" });
    const [userForm,      setUserForm]      = useState({ ...emptyUserForm });
    const [showUserModal, setShowUserModal] = useState(false);
    const [loading,       setLoading]       = useState(false);
    const [loadingUser,   setLoadingUser]   = useState(false);
    const [msg,           setMsg]           = useState(null);
    const [filtroStatus,  setFiltroStatus]  = useState("");
    const [busqueda,      setBusqueda]      = useState("");

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) };

    const fetchAll = async () => {
        try {
            const [t, p, r] = await Promise.all([
                fetch(API+"/api/tenants", { headers }).then(r => r.json()),
                fetch(API+"/api/tenants/planes", { headers }).then(r => r.json()),
                fetch(API+"/api/tenants/resumen", { headers }).then(r => r.json()),
            ]);
            setTenants(Array.isArray(t) ? t : []);
            setPlanes(Array.isArray(p) ? p : []);
            setResumen(r || {});
        } catch(e) { console.error(e); }
    };

    const fetchPagos = async (id) => {
        const data = await fetch(API+"/api/tenants/"+id+"/pagos", { headers }).then(r => r.json()).catch(() => []);
        setPagos(Array.isArray(data) ? data : []);
    };

    const fetchUsuarios = async (id) => {
        const data = await fetch(API+"/api/usuarios/tenant/"+id, { headers }).then(r => r.json()).catch(() => []);
        setUsuarios(Array.isArray(data) ? data : []);
    };

    useEffect(() => { fetchAll(); }, []);

    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3000); };
    const setF  = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
    const setPF = k => e => setPagoForm(p => ({ ...p, [k]: e.target.value }));
    const setUF = k => e => setUserForm(p => ({ ...p, [k]: e.target.value }));

    const onPlanChange = (planId) => {
        const plan = planes.find(p => p.id === planId);
        if (plan) {
            const usuarios = Number(form.maxUsuarios) || 1;
            setForm(f => ({ ...f, plan: planId, precioMensual: (plan.precioPorUsuario||0) * usuarios }));
        }
    };

    const onUsuariosChange = (e) => {
        const usuarios = Number(e.target.value) || 1;
        const plan = planes.find(p => p.id === form.plan);
        const precio = plan ? (plan.precioPorUsuario||0) * usuarios : 0;
        setForm(f => ({ ...f, maxUsuarios: usuarios, precioMensual: precio }));
    };

    const openNew = () => {
        setEditando(null);
        const hoy = new Date().toISOString().slice(0,10);
        const venc = new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10);
        setForm({ ...emptyForm, fechaInicio: hoy, fechaVencimiento: venc });
        setShowModal(true);
    };

    const openEdit = (t) => {
        setEditando(t.id);
        setForm({ nombre:t.nombre||"", rfc:t.rfc||"", email:t.email||"", telefono:t.telefono||"", contacto:t.contacto||"", plan:t.plan||"TRANSPORTE", status:t.status||"PRUEBA", fechaInicio:t.fechaInicio||"", fechaVencimiento:t.fechaVencimiento||"", precioMensual:t.precioMensual||"", maxUsuarios:t.maxUsuarios||1, notas:t.notas||"" });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.nombre || !form.rfc) { showMsg(false, "Nombre y RFC son requeridos"); return; }
        setLoading(true);
        try {
            const url    = editando ? API+"/api/tenants/"+editando : API+"/api/tenants";
            const method = editando ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify({ ...form, precioMensual: Number(form.precioMensual)||null, maxUsuarios: Number(form.maxUsuarios)||1 })});
            if (res.ok) { showMsg(true, editando ? "Cliente actualizado" : "Cliente registrado"); setShowModal(false); fetchAll(); }
            else showMsg(false, "Error al guardar");
        } catch { showMsg(false, "Error de conexion"); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Eliminar este cliente?")) return;
        await fetch(API+"/api/tenants/"+id, { method:"DELETE", headers });
        fetchAll();
    };

    const abrirPanel = (t, tab="pagos") => {
        setTenantSel(t); setPanelTab(tab);
        fetchPagos(t.id); fetchUsuarios(t.id);
        setPagoForm({ monto:t.precioMensual||"", metodoPago:"TRANSFERENCIA", referencia:"", periodo:new Date().toISOString().slice(0,7), meses:"1", notas:"" });
        setShowPanel(true);
    };

    const registrarPago = async () => {
        if (!pagoForm.monto) { showMsg(false, "Ingresa el monto"); return; }
        setLoading(true);
        try {
            const res = await fetch(API+"/api/tenants/"+tenantSel.id+"/pagos", { method:"POST", headers, body: JSON.stringify({ ...pagoForm, monto: Number(pagoForm.monto) }) });
            if (res.ok) { showMsg(true, "Pago registrado y licencia renovada"); fetchPagos(tenantSel.id); fetchAll(); }
            else showMsg(false, "Error al registrar pago");
        } catch { showMsg(false, "Error de conexion"); }
        setLoading(false);
    };

    const crearUsuario = async () => {
        if (!userForm.name || !userForm.email || !userForm.password) { showMsg(false, "Nombre, email y contrasena son requeridos"); return; }
        setLoadingUser(true);
        try {
            const res = await fetch(API+"/api/usuarios", { method:"POST", headers, body: JSON.stringify({ ...userForm, tenantId: tenantSel.id }) });
            const data = await res.json();
            if (res.ok) { showMsg(true, "Usuario creado"); setShowUserModal(false); setUserForm({ ...emptyUserForm }); fetchUsuarios(tenantSel.id); }
            else showMsg(false, data.error || "Error al crear usuario");
        } catch { showMsg(false, "Error de conexion"); }
        setLoadingUser(false);
    };

    const toggleUsuario = async (u) => {
        await fetch(API+"/api/usuarios/"+u.id, { method:"PUT", headers, body: JSON.stringify({ activo: !u.activo }) });
        fetchUsuarios(tenantSel.id);
    };

    const eliminarUsuario = async (id) => {
        if (!confirm("Eliminar usuario?")) return;
        await fetch(API+"/api/usuarios/"+id, { method:"DELETE", headers });
        fetchUsuarios(tenantSel.id);
    };

    const filtrados = tenants.filter(t => !filtroStatus || t.status === filtroStatus).filter(t => !busqueda || t.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || t.rfc?.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />
                {msg && <div className={"mb-4 px-5 py-3 rounded-xl text-sm font-bold "+(msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300")}>{msg.txt}</div>}
                <div className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">LICENCIAS</h1>
                        <p className="text-gray-400 mt-4 text-xl">Clientes, suscripciones y usuarios</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowPlanes(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-500/10 border border-purple-400/30 text-purple-300 font-bold hover:bg-purple-500/20 transition-all"><FaCrown /> Ver Planes</button>
                        <button onClick={openNew} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all"><FaPlus /> Nuevo Cliente</button>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label:"MRR",        value:fmt(resumen.mrr),       color:"text-green-300" },
                        { label:"Activos",    value:resumen.activos||0,     color:"text-cyan-300" },
                        { label:"En Prueba",  value:resumen.prueba||0,      color:"text-blue-300" },
                        { label:"Vencidos",   value:resumen.vencidos||0,    color:"text-red-300" },
                        { label:"Por Vencer", value:resumen.porVencer||0,   color:"text-yellow-300" },
                    ].map((s,i) => (
                        <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }} className="rounded-2xl bg-white/5 border border-cyan-400/10 p-5">
                            <p className="text-gray-400 text-xs">{s.label}</p>
                            <h2 className={"text-2xl font-black "+s.color}>{s.value}</h2>
                        </motion.div>
                    ))}
                </div>

                <div className="flex gap-3 mb-6 flex-wrap">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, RFC..." className="bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm w-72" />
                    {["","ACTIVO","PRUEBA","VENCIDO","SUSPENDIDO"].map(s => (
                        <button key={s} onClick={() => setFiltroStatus(s)} className={"px-4 py-2 rounded-xl text-xs font-bold transition-all border "+(filtroStatus===s ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10")}>{s||"Todos"}</button>
                    ))}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                {["Empresa","RFC","Plan","Status","Vencimiento","Dias","Usuarios","MRR","Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-500">No hay clientes registrados</td></tr>}
                            {filtrados.map((t,i) => (
                                <motion.tr key={t.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                    <td className="py-4 pr-4"><div className="flex items-center gap-2"><FaBuilding className="text-cyan-400" /><div><p className="text-white font-bold">{t.nombre}</p><p className="text-gray-500 text-xs">{t.email}</p></div></div></td>
                                    <td className="py-4 pr-4 text-gray-300 text-sm font-mono">{t.rfc}</td>
                                    <td className="py-4 pr-4"><span className={"px-2 py-0.5 rounded-full border text-xs font-bold "+(PLAN_COLORS[t.plan]||"text-gray-300 bg-white/5 border-white/10")}>{t.plan}</span></td>
                                    <td className="py-4 pr-4"><span className={"px-3 py-1 rounded-full border text-xs font-bold "+(STATUS_COLORS[t.status]||"text-gray-300 bg-white/5 border-white/10")}>{t.status}</span></td>
                                    <td className="py-4 pr-4 text-gray-400 text-sm">{t.fechaVencimiento||"?"}</td>
                                    <td className="py-4 pr-4">{t.diasRestantes!=null && <span className={"font-bold text-sm "+(t.diasRestantes<=0?"text-red-400":t.proximoVencer?"text-yellow-400":"text-green-400")}>{t.diasRestantes<=0?"Vencido":t.diasRestantes+"d"}</span>}</td>
                                    <td className="py-4 pr-4"><button onClick={() => abrirPanel(t,"usuarios")} className="flex items-center gap-1 text-cyan-300 text-sm font-bold hover:text-cyan-100"><FaUsers size={12}/> {t.maxUsuarios||1}</button></td>
                                    <td className="py-4 pr-4 text-green-300 font-bold">{fmt(t.precioMensual)}</td>
                                    <td className="py-4"><div className="flex gap-2">
                                        <button onClick={() => abrirPanel(t,"pagos")} className="p-2 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all" title="Pagos"><FaMoneyBillWave size={12}/></button>
                                        <button onClick={() => abrirPanel(t,"usuarios")} className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20 transition-all" title="Usuarios"><FaUsers size={12}/></button>
                                        <button onClick={() => openEdit(t)} className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit size={12}/></button>
                                        <button onClick={() => handleDelete(t.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12}/></button>
                                    </div></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PANEL LATERAL */}
            <AnimatePresence>
                {showPanel && tenantSel && (
                    <motion.div initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }} transition={{ type:"spring", damping:25 }} className="fixed right-0 top-0 h-full w-[440px] bg-[#020617] border-l border-cyan-400/20 z-50 flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-cyan-400/10 flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-cyan-300">{tenantSel.nombre}</h2>
                                <p className="text-gray-400 text-sm mt-1">{tenantSel.plan} ? {tenantSel.status}</p>
                                <p className="text-green-300 font-bold mt-1">{fmt(tenantSel.precioMensual)}/mes ? {tenantSel.maxUsuarios||1} licencia(s)</p>
                            </div>
                            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                        </div>
                        <div className="flex gap-2 px-4 pt-4 pb-2 flex-shrink-0">
                            {[{id:"pagos",label:"Pagos",icon:<FaMoneyBillWave size={11}/>},{id:"usuarios",label:"Usuarios",icon:<FaUsers size={11}/>}].map(t => (
                                <button key={t.id} onClick={() => setPanelTab(t.id)} className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border "+(panelTab===t.id?"bg-cyan-500/20 border-cyan-400/30 text-cyan-300":"text-gray-500 hover:text-gray-300 border-transparent")}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        {panelTab === "pagos" && (
                            <>
                                <div className="px-6 py-4 border-b border-cyan-400/10 flex-shrink-0 space-y-3">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Registrar Pago</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-gray-400 text-xs mb-1 block">Monto ($)</label><input type="number" value={pagoForm.monto} onChange={setPF("monto")} className={inputCls} /></div>
                                        <div><label className="text-gray-400 text-xs mb-1 block">Meses a renovar</label><select value={pagoForm.meses} onChange={setPF("meses")} className={selectCls}>{[1,2,3,6,12].map(m => <option key={m} value={m}>{m} {m===1?"mes":"meses"}</option>)}</select></div>
                                        <div><label className="text-gray-400 text-xs mb-1 block">Metodo</label><select value={pagoForm.metodoPago} onChange={setPF("metodoPago")} className={selectCls}>{["TRANSFERENCIA","TARJETA","EFECTIVO","CHEQUE"].map(m => <option key={m}>{m}</option>)}</select></div>
                                        <div><label className="text-gray-400 text-xs mb-1 block">Referencia</label><input value={pagoForm.referencia} onChange={setPF("referencia")} className={inputCls} placeholder="Folio" /></div>
                                    </div>
                                    <button onClick={registrarPago} disabled={loading} className="w-full py-3 rounded-2xl bg-green-500/10 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/20 transition-all flex items-center justify-center gap-2">
                                        <FaCheck /> {loading ? "Registrando..." : "Registrar Pago y Renovar"}
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Historial</p>
                                    {pagos.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Sin pagos registrados</p>}
                                    {pagos.map((p,i) => (
                                        <motion.div key={p.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.05 }} className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                            <div className="flex justify-between items-center">
                                                <div><p className="text-cyan-300 font-bold text-xs">{p.folio}</p><p className="text-green-300 font-black text-lg">{fmt(p.monto)}</p><p className="text-gray-500 text-xs mt-1">{p.fecha} ? {p.metodoPago}</p></div>
                                                <div className="text-right"><span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-400/20 text-green-300 text-xs font-bold">{p.status}</span><p className="text-gray-500 text-xs mt-1">{p.periodo}</p></div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}

                        {panelTab === "usuarios" && (
                            <>
                                <div className="px-6 py-4 border-b border-cyan-400/10 flex-shrink-0">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Licencias ? {usuarios.length} / {tenantSel.maxUsuarios||1}</p>
                                        {usuarios.length < (tenantSel.maxUsuarios||1) && (
                                            <button onClick={() => { setUserForm({ ...emptyUserForm }); setShowUserModal(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all">
                                                <FaPlus size={10}/> Agregar
                                            </button>
                                        )}
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className={"h-full rounded-full transition-all "+(usuarios.length>=(tenantSel.maxUsuarios||1)?"bg-red-400":"bg-cyan-400")} style={{ width: Math.min(100,(usuarios.length/(tenantSel.maxUsuarios||1))*100)+"%" }} />
                                    </div>
                                    {usuarios.length >= (tenantSel.maxUsuarios||1) && (
                                        <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><FaExclamationTriangle size={10}/> Limite de licencias alcanzado</p>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                                    {usuarios.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Sin usuarios creados</p>}
                                    {usuarios.map((u,i) => (
                                        <motion.div key={u.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.05 }} className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-white font-bold">{u.name}</p>
                                                    <p className="text-gray-400 text-xs">{u.email}</p>
                                                    <span className={"px-2 py-0.5 rounded-full text-xs font-bold mt-1 inline-block "+(u.role==="ADMIN"?"bg-purple-500/20 text-purple-300":u.role==="OPERADOR"?"bg-cyan-500/20 text-cyan-300":"bg-yellow-500/20 text-yellow-300")}>{u.role}</span>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <button onClick={() => toggleUsuario(u)} className={"text-xl "+(u.activo?"text-green-400":"text-gray-600")}>{u.activo?<FaToggleOn />:<FaToggleOff />}</button>
                                                    <button onClick={() => eliminarUsuario(u.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={11}/></button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL NUEVO USUARIO */}
            <AnimatePresence>
                {showUserModal && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
                        <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-md p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div><h2 className="text-2xl font-black text-cyan-300">Nueva Licencia / Usuario</h2><p className="text-gray-400 text-sm mt-1">{tenantSel?.nombre}</p></div>
                                <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="space-y-4">
                                <div><label className="text-gray-400 text-sm mb-2 block">Nombre</label><input value={userForm.name} onChange={setUF("name")} className={inputCls} placeholder="Nombre completo" /></div>
                                <div><label className="text-gray-400 text-sm mb-2 block">Email</label><input type="email" value={userForm.email} onChange={setUF("email")} className={inputCls} placeholder="correo@empresa.com" /></div>
                                <div><label className="text-gray-400 text-sm mb-2 block">Contrasena</label><input type="password" value={userForm.password} onChange={setUF("password")} className={inputCls} placeholder="Minimo 6 caracteres" /></div>
                                <div><label className="text-gray-400 text-sm mb-2 block">Rol</label>
                                    <select value={userForm.role} onChange={setUF("role")} className={selectCls}>
                                        <option value="ADMIN">ADMIN - Acceso total</option>
                                        <option value="OPERADOR">OPERADOR - Lectura y escritura</option>
                                        <option value="REPORTES">REPORTES - Solo lectura</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setShowUserModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={crearUsuario} disabled={loadingUser} className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 flex items-center justify-center gap-3">
                                    <FaCheck /> {loadingUser ? "Creando..." : "Crear Usuario"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL PLANES */}
            <AnimatePresence>
                {showPlanes && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div><h2 className="text-3xl font-black text-cyan-300">Planes y Precios</h2><p className="text-gray-400 mt-1">Precio por licencia (1 usuario) al mes</p></div>
                                <button onClick={() => setShowPlanes(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {planes.map(p => (
                                    <div key={p.id} className={"p-6 rounded-3xl border "+(p.id==="FULL"?"border-cyan-400/40 bg-cyan-500/5":"border-white/10 bg-white/5")}>
                                        {p.id==="FULL" && <div className="flex justify-end mb-2"><span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold">MAS POPULAR</span></div>}
                                        <h3 className="font-black text-white text-2xl mb-1">{p.nombre}</h3>
                                        <p className="text-gray-400 text-sm mb-4">{p.descripcion}</p>
                                        <div className="mb-4">
                                            <span className="text-4xl font-black text-green-300"></span>
                                            <span className="text-gray-400 text-sm ml-2">/ usuario / mes</span>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 mb-4">
                                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Calculadora de Licencias</p>
                                            <table className="w-full text-sm">
                                                <thead><tr className="text-gray-500 text-xs border-b border-white/10"><th className="pb-2 text-left">Usuarios</th><th className="pb-2 text-right">Mensual</th><th className="pb-2 text-right">Anual</th></tr></thead>
                                                <tbody>
                                                    {(p.calculos||[]).map(c => (
                                                        <tr key={c.usuarios} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                                            <td className="py-2 text-white font-bold">{c.usuarios} {c.usuarios===1?"usuario":"usuarios"}</td>
                                                            <td className="py-2 text-right text-green-300 font-bold"></td>
                                                            <td className="py-2 text-right text-gray-400"></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {(p.modulos||[]).slice(0,8).map(m => <span key={m} className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs">{m}</span>)}
                                            {(p.modulos||[]).length>8 && <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-400 text-xs">+{(p.modulos||[]).length-8} mas</span>}
                                        </div>
                                        <button onClick={() => { setShowPlanes(false); openNew(); onPlanChange(p.id); }} className={"w-full py-3 rounded-2xl font-bold transition-all "+(p.id==="FULL"?"bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30":"bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10")}>
                                            Contratar {p.nombre}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-400/20 text-yellow-300 text-sm text-center">
                                El precio se calcula automaticamente segun el numero de licencias (usuarios) al registrar un cliente.
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL NUEVO/EDITAR TENANT */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }} className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">{editando?"Editar Cliente":"Nuevo Cliente"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Nombre de la Empresa *</label><input value={form.nombre} onChange={setF("nombre")} className={inputCls} placeholder="Transportes ABC S.A. de C.V." /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">RFC *</label><input value={form.rfc} onChange={setF("rfc")} className={inputCls} placeholder="TAB010101ABC" /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Email</label><input type="email" value={form.email} onChange={setF("email")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Telefono</label><input value={form.telefono} onChange={setF("telefono")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Contacto</label><input value={form.contacto} onChange={setF("contacto")} className={inputCls} /></div>
                                </div>
                                <div><label className="text-gray-400 text-sm mb-2 block">Plan</label>
                                    <select value={form.plan} onChange={e => onPlanChange(e.target.value)} className={selectCls}>
                                        {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} ? /usuario/mes</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-gray-400 text-sm mb-2 block">Status</label>
                                        <select value={form.status} onChange={setF("status")} className={selectCls}>
                                            {["PRUEBA","ACTIVO","VENCIDO","SUSPENDIDO"].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Numero de Licencias (Usuarios)</label>
                                        <input type="number" value={form.maxUsuarios} onChange={onUsuariosChange} className={inputCls} min="1" />
                                        {form.maxUsuarios && form.precioMensual && (
                                            <p className="text-green-300 text-xs mt-1 font-bold">Total mensual: {fmt(form.precioMensual)}</p>
                                        )}
                                    </div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Fecha Inicio</label><input type="date" value={form.fechaInicio} onChange={setF("fechaInicio")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Fecha Vencimiento</label><input type="date" value={form.fechaVencimiento} onChange={setF("fechaVencimiento")} className={inputCls} /></div>
                                    <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Precio Mensual Total ($)</label><input type="number" value={form.precioMensual} onChange={setF("precioMensual")} className={inputCls} placeholder="Se calcula automaticamente" /></div>
                                </div>
                                <div><label className="text-gray-400 text-sm mb-2 block">Notas</label><input value={form.notas} onChange={setF("notas")} className={inputCls} /></div>
                            </div>
                            <div className="flex gap-4 p-8 pt-0 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={handleSubmit} disabled={loading} className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 flex items-center justify-center gap-3">
                                    <FaCheck /> {loading?"Guardando...":editando?"Actualizar":"Registrar Cliente"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}