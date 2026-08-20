import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaRoute, FaPlus, FaTruck, FaCheckCircle, FaClock, FaTrash, FaTimes,
         FaFileAlt, FaMoneyBillWave, FaEdit, FaCamera, FaSignature,
         FaHistory, FaArrowRight, FaChartLine, FaFileInvoiceDollar, FaHandHoldingUsd } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const FLUJO = ["PENDIENTE", "ASIGNADO", "EN_RUTA", "ENTREGADO", "FACTURADO", "COBRADO"];

const normalizar = (s) => (s || "").toUpperCase().replace(/\s+/g, "_").replace(/\s/g, "_");

const statusColor = (s) => {
    if (!s) return "text-gray-300 bg-white/5 border-white/10";
    const m = normalizar(s);
    if (m === "PENDIENTE")  return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
    if (m === "ASIGNADO")   return "text-blue-300 bg-blue-500/10 border-blue-400/30";
    if (m === "EN_RUTA")    return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
    if (m === "ENTREGADO")  return "text-green-300 bg-green-500/10 border-green-400/30";
    if (m === "FACTURADO")  return "text-purple-300 bg-purple-500/10 border-purple-400/30";
    if (m === "COBRADO")    return "text-emerald-300 bg-emerald-500/10 border-emerald-400/30";
    if (m === "CANCELADO")  return "text-red-300 bg-red-500/10 border-red-400/30";
    return "text-gray-300 bg-white/5 border-white/10";
};

const siguienteStatus = (actual) => {
    const idx = FLUJO.indexOf(normalizar(actual));
    return idx >= 0 && idx < FLUJO.length - 1 ? FLUJO[idx + 1] : null;
};

const emptyForm = {
    clienteId: "", rutaId: "", driverId: "", vehicleId: "",
    date: "", cost: "", status: "PENDIENTE", notas: ""
};

const emptyGasto = {
    tipo: "Anticipo operador", categoria: "Anticipo",
    descripcion: "", monto: "", fecha: "", status: "Pendiente", notas: ""
};

const TIPOS = ["Anticipo operador", "Casetas", "Gasolina", "Comida", "Mecánico", "Hospedaje", "Otro"];

const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

export default function ViajesPage() {
    const [viajes,         setViajes]         = useState([]);
    const [clientes,       setClientes]       = useState([]);
    const [todasRutas,     setTodasRutas]     = useState([]);
    const [rutasFiltradas, setRutasFiltradas] = useState([]);
    const [drivers,        setDrivers]        = useState([]);
    const [vehicles,       setVehicles]       = useState([]);
    const [showModal,      setShowModal]      = useState(false);
    const [form,           setForm]           = useState(emptyForm);
    const [loading,        setLoading]        = useState(false);
    const [msg,            setMsg]            = useState(null);

    const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
    const [gastos,            setGastos]            = useState([]);
    const [showPanelGastos,   setShowPanelGastos]   = useState(false);
    const [tabPanel,          setTabPanel]          = useState("gastos"); // gastos | timeline | rentabilidad
    const [showGastoModal,    setShowGastoModal]     = useState(false);
    const [editandoGasto,     setEditandoGasto]      = useState(null);
    const [gastoForm,         setGastoForm]          = useState(emptyGasto);
    const [loadingGasto,      setLoadingGasto]       = useState(false);
    const [ticketFile,        setTicketFile]         = useState(null);
    const [gastoActivo,       setGastoActivo]        = useState(null); // gasto completo que se está editando (para saber si ya tiene ticket)

    const [timelineEventos,   setTimelineEventos]   = useState([]);
    const [loadingTimeline,   setLoadingTimeline]   = useState(false);

    const [rentabilidad,      setRentabilidad]      = useState(null);
    const [loadingRent,       setLoadingRent]       = useState(false);

    const [showEvidencia,     setShowEvidencia]     = useState(false);
    const [viajeEvidencia,    setViajeEvidencia]    = useState(null);
    const [fotoFile,          setFotoFile]          = useState(null);
    const [fotoPreview,       setFotoPreview]       = useState(null);
    const [firmaDataUrl,      setFirmaDataUrl]      = useState(null);
    const [dibujando,         setDibujando]         = useState(false);
    const [receptorNombre,    setReceptorNombre]    = useState("");
    const [receptorPuesto,    setReceptorPuesto]    = useState("");
    const [comentarioEv,      setComentarioEv]      = useState("");
    const [loadingEv,         setLoadingEv]         = useState(false);
    const canvasRef = useRef(null);
    const ctxRef    = useRef(null);

    const navigate = useNavigate();
    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
    const usuario = localStorage.getItem("usuario") || "Sistema";

    const fetchAll = async () => {
        try {
            const [v, c, r, d, vh] = await Promise.all([
                fetch(`${API}/orders`, { headers }).then(r => r.json()),
                fetch(`${API}/clients`, { headers }).then(r => r.json()),
                fetch(`${API}/rutas`, { headers }).then(r => r.json()),
                fetch(`${API}/drivers`, { headers }).then(r => r.json()),
                fetch(`${API}/vehicles`, { headers }).then(r => r.json()),
            ]);
            setViajes(Array.isArray(v) ? v : []);
            setClientes(Array.isArray(c) ? c : []);
            setTodasRutas(Array.isArray(r) ? r : []);
            setDrivers(Array.isArray(d) ? d : []);
            setVehicles(Array.isArray(vh) ? vh : []);
        } catch (e) { console.error(e); }
    };

    const fetchGastos = async (orderId) => {
        try {
            const res  = await fetch(`${API}/gastos-viaje/viaje/${orderId}`, { headers });
            const data = await res.json();
            setGastos(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchTimeline = async (viaje) => {
        setLoadingTimeline(true);
        try {
            const res  = await fetch(`${API}/api/bitacora`, { headers });
            const data = await res.json();
            const todos = Array.isArray(data) ? data : [];
            const folio = viaje.folio;
            const eventos = todos
                .filter(e => e.modulo === "VIAJE" && (e.folioReferencia === folio || e.referenciaId === viaje.id))
                .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
            setTimelineEventos(eventos);
        } catch (e) { console.error(e); setTimelineEventos([]); }
        setLoadingTimeline(false);
    };

    const fetchRentabilidad = async (viajeId) => {
        setLoadingRent(true);
        try {
            const res  = await fetch(`${API}/orders/${viajeId}/rentabilidad`, { headers });
            const data = await res.json();
            setRentabilidad(data);
        } catch (e) { console.error(e); setRentabilidad(null); }
        setLoadingRent(false);
    };

    useEffect(() => { fetchAll(); }, []);

    useEffect(() => {
        if (form.clienteId) {
            const filtradas = todasRutas.filter(r => r.cliente?.id === Number(form.clienteId));
            setRutasFiltradas(filtradas);
            setForm(prev => ({ ...prev, rutaId: "" }));
        } else {
            setRutasFiltradas([]);
        }
    }, [form.clienteId, todasRutas]);

    const set  = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
    const setG = (f) => (e) => setGastoForm(prev => ({ ...prev, [f]: e.target.value }));

    const showMsgFn = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3000); };

    const cambiarStatus = async (viaje, nuevoStatus) => {
        if (nuevoStatus === "ENTREGADO") {
            setViajeEvidencia(viaje);
            setShowEvidencia(true);
            return;
        }
        try {
            const res = await fetch(`${API}/orders/${viaje.id}/status?status=${nuevoStatus}`, {
                method: "PUT",
                headers: { ...headers, "X-Usuario": usuario }
            });
            if (res.ok) {
                showMsgFn(true, `Status actualizado a ${nuevoStatus}`);                fetchAll();
            } else {
                const txt = await res.text();
                showMsgFn(false, txt);
            }
        } catch (e) { showMsgFn(false, "Error de conexión"); }
    };

    const iniciarCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth   = 2;
        ctx.lineCap     = "round";
        ctxRef.current  = ctx;
    };

    useEffect(() => {
        if (showEvidencia) setTimeout(iniciarCanvas, 100);
    }, [showEvidencia]);

    const startDraw = (e) => {
        setDibujando(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(x, y);
    };

    const draw = (e) => {
        if (!dibujando) return;
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        ctxRef.current.lineTo(x, y);
        ctxRef.current.stroke();
    };

    const stopDraw = () => {
        setDibujando(false);
        if (canvasRef.current) setFirmaDataUrl(canvasRef.current.toDataURL());
    };

    const limpiarFirma = () => {
        const canvas = canvasRef.current;
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        setFirmaDataUrl(null);
    };

    const onFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFotoFile(file);
        setFotoPreview(URL.createObjectURL(file));
    };

    const guardarEvidencia = async () => {
        if (!fotoFile && !firmaDataUrl) {
            showMsgFn(false, "Agrega al menos una foto o firma");
            return;
        }
        setLoadingEv(true);
        try {
            const fd = new FormData();
            if (fotoFile) fd.append("foto", fotoFile);
            if (firmaDataUrl) {
                const blob = await (await fetch(firmaDataUrl)).blob();
                fd.append("firma", blob, "firma.png");
            }
            if (receptorNombre) fd.append("receptorNombre", receptorNombre);
            if (receptorPuesto) fd.append("receptorPuesto", receptorPuesto);
            if (comentarioEv)   fd.append("comentario", comentarioEv);
            if (viajeEvidencia.driver?.id) fd.append("driverId", viajeEvidencia.driver.id);

            const res = await fetch(`${API}/api/evidencias/order/${viajeEvidencia.id}`, {
                method: "POST",
                headers: { ...(token && { Authorization: `Bearer ${token}` }), "X-Usuario": usuario },
                body: fd
            });

            if (res.ok) {
                showMsgFn(true, "Evidencia guardada y viaje marcado como ENTREGADO");setShowEvidencia(false);
                setFotoFile(null); setFotoPreview(null); setFirmaDataUrl(null);
                setReceptorNombre(""); setReceptorPuesto(""); setComentarioEv("");
                fetchAll();
            } else {
                await fetch(`${API}/orders/${viajeEvidencia.id}/status?status=ENTREGADO`, {
                    method: "PUT", headers: { ...headers, "X-Usuario": usuario }
                });
                showMsgFn(true, "Viaje marcado como ENTREGADO");setShowEvidencia(false);
                setFotoFile(null); setFotoPreview(null); setFirmaDataUrl(null);
                setReceptorNombre(""); setReceptorPuesto(""); setComentarioEv("");
                fetchAll();
            }
        } catch (e) {
            try {
                await fetch(`${API}/orders/${viajeEvidencia.id}/status?status=ENTREGADO`, {
                    method: "PUT", headers: { ...headers, "X-Usuario": usuario }
                });
                showMsgFn(true, "Viaje marcado como ENTREGADO");setShowEvidencia(false);
                fetchAll();
            } catch { showMsgFn(false, "Error de conexión"); }
        }
        setLoadingEv(false);
    };

    const openNew = () => { setForm(emptyForm); setShowModal(true); };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = {
                clienteId: Number(form.clienteId),
                rutaId:    Number(form.rutaId),
                driverId:  form.driverId  ? Number(form.driverId)  : null,
                vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
                date:      form.date,
                cost:      form.cost ? Number(form.cost) : null,
                status:    "PENDIENTE",
                notas:     form.notas,
            };
            await fetch(`${API}/orders`, {
                method: "POST", headers: { ...headers, "X-Usuario": usuario },
                body: JSON.stringify(body)
            });
            setShowModal(false);
            setForm(emptyForm);
            fetchAll();
            showMsgFn(true, "Viaje creado");} catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar este viaje?")) return;
        await fetch(`${API}/orders/${id}`, {
            method: "DELETE", headers: { ...headers, "X-Usuario": usuario }
        });
        fetchAll();
    };

    const abrirPanelGastos = (viaje, tab = "gastos") => {
        setViajeSeleccionado(viaje);
        setTabPanel(tab);
        fetchGastos(viaje.id);
        if (tab === "timeline")     fetchTimeline(viaje);
        if (tab === "rentabilidad") fetchRentabilidad(viaje.id);
        setShowPanelGastos(true);
    };

    const cambiarTabPanel = (tab) => {
        setTabPanel(tab);
        if (tab === "timeline" && timelineEventos.length === 0)     fetchTimeline(viajeSeleccionado);
        if (tab === "rentabilidad" && !rentabilidad)                fetchRentabilidad(viajeSeleccionado.id);
    };

    const irAFacturar = () => {
        if (!viajeSeleccionado) return;
        navigate(`/facturas?orderId=${viajeSeleccionado.id}&clienteId=${viajeSeleccionado.cliente?.id || ""}&monto=${viajeSeleccionado.cost || ""}`);
    };

    // Manda a Liquidaciones con el viaje y el operador YA preseleccionados,
    // para que los anticipos/gastos de este viaje se desglosen solos en la
    // vista previa de la liquidación (ver LiquidacionesPage →fetchGastos).
    const irALiquidacion = () => {
        if (!viajeSeleccionado) return;
        const driverId = viajeSeleccionado.driver?.id || "";
        navigate(`/liquidaciones?orderId=${viajeSeleccionado.id}&driverId=${driverId}`);
    };

    const openNuevoGasto = () => {
        setEditandoGasto(null);
        setGastoActivo(null);
        setTicketFile(null);
        setGastoForm({ ...emptyGasto, fecha: new Date().toISOString().split("T")[0] });
        setShowGastoModal(true);
    };

    const openEditarGasto = (g) => {
        setEditandoGasto(g.id);
        setGastoActivo(g);
        setTicketFile(null);
        setGastoForm({ ...emptyGasto, ...g });
        setShowGastoModal(true);
    };

    const handleGuardarGasto = async () => {
        setLoadingGasto(true);
        try {
            const body = {
                ...gastoForm,
                orderId:   viajeSeleccionado.id,
                monto:     gastoForm.monto ? Number(gastoForm.monto) : null,
                categoria: gastoForm.tipo === "Anticipo operador" ? "Anticipo" : "Gasto",
            };
            const url    = editandoGasto ? `${API}/gastos-viaje/${editandoGasto}` : `${API}/gastos-viaje`;
            const method = editandoGasto ? "PUT" : "POST";
            const res    = await fetch(url, { method, headers, body: JSON.stringify(body) });
            const saved  = await res.json();

            // Si se eligió una foto de ticket, la subimos aparte (multipart).
            // Esto marca el gasto como "comprobado" en el backend, lo que hace
            // que NO se le cobre al operador en su liquidación.
            if (ticketFile && saved?.id) {
                const fd = new FormData();
                fd.append("ticket", ticketFile);
                await fetch(`${API}/gastos-viaje/${saved.id}/ticket`, {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: fd
                });
            }

            setShowGastoModal(false);
            setTicketFile(null);
            fetchGastos(viajeSeleccionado.id);
        } catch (e) { console.error(e); }
        setLoadingGasto(false);
    };

    const handleQuitarTicket = async () => {
        if (!gastoActivo?.id) return;
        if (!confirm("¿Quitar el ticket de este gasto? Volverá a descontarse del operador.")) return;
        try {
            await fetch(`${API}/gastos-viaje/${gastoActivo.id}/ticket`, { method: "DELETE", headers });
            setGastoActivo(prev => prev ? { ...prev, comprobado: false, ticketPath: null } : prev);
            fetchGastos(viajeSeleccionado.id);
        } catch (e) { console.error(e); }
    };

    const handleEliminarGasto = async (id) => {
        if (!confirm("¿Eliminar este registro?")) return;
        await fetch(`${API}/gastos-viaje/${id}`, { method: "DELETE", headers });
        fetchGastos(viajeSeleccionado.id);
    };

    const enRuta     = viajes.filter(v => normalizar(v.status) === "EN_RUTA").length;
    const completado = viajes.filter(v => ["ENTREGADO","COBRADO","FACTURADO"].includes(normalizar(v.status))).length;
    const pendiente  = viajes.filter(v => normalizar(v.status) === "PENDIENTE").length;

    const totalGastos    = gastos.filter(g => g.categoria === "Gasto").reduce((s, g) => s + (g.monto || 0), 0);
    const totalAnticipos = gastos.filter(g => g.categoria === "Anticipo").reduce((s, g) => s + (g.monto || 0), 0);

    const fmt = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                {msg && (
                    <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-bold ${msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                        {msg.txt}
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">GESTIÓN DE VIAJES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Control de rutas y operadores</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Viaje
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    {[
                        { label: "En Ruta",     value: enRuta,     icon: <FaTruck /> },
                        { label: "Completados", value: completado, icon: <FaCheckCircle /> },
                        { label: "Pendientes",  value: pendiente,  icon: <FaClock /> },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-6 flex items-center gap-5">
                            <div className="text-4xl text-cyan-300">{s.icon}</div>
                            <div><p className="text-gray-400">{s.label}</p><h2 className="text-4xl font-black">{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaRoute /> Viajes Registrados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio","Cliente","Origen","Destino","Conductor","Fecha","Costo","Estado","Avanzar","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {viajes.length === 0 && (
                                    <tr><td colSpan={10} className="py-10 text-center text-gray-500">No hay viajes registrados</td></tr>
                                )}
                                {viajes.map((v, i) => {
                                    const siguiente = siguienteStatus(v.status);
                                    return (
                                        <motion.tr key={v.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-4 pr-4 font-black text-cyan-300 text-sm">{v.folio || `#${v.id}`}</td>
                                            <td className="py-4 pr-4">{v.cliente?.name || v.clienteNombre || "-"}</td>
                                            <td className="py-4 pr-4 text-gray-300 text-sm">{v.origen || v.ruta?.remitente?.ciudad || "-"}</td>
                                            <td className="py-4 pr-4 text-gray-300 text-sm">{v.destino || v.ruta?.destinatario?.ciudad || "-"}</td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {v.driver ? `${v.driver.name} ${v.driver.apellidos || ""}` : v.driverNombre || "-"}
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">{v.date || "-"}</td>
                                            <td className="py-4 pr-4 text-green-300 font-bold">
                                                {v.cost ? `$${v.cost.toLocaleString()}` : "-"}
                                            </td>
                                            <td className="py-4 pr-4">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusColor(v.status)}`}>
                                                    {v.status || "-"}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4">
                                                {siguiente && (
                                                    <button onClick={() => cambiarStatus(v, siguiente)}
                                                        className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-bold transition-all
                                                            ${siguiente === "ENTREGADO"
                                                                ? "bg-green-500/10 border-green-400/30 text-green-300 hover:bg-green-500/20"
                                                                : "bg-cyan-500/10 border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20"}`}>
                                                        <FaArrowRight size={10} /> {siguiente}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => abrirPanelGastos(v, "gastos")}
                                                        className="p-2 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all"
                                                        title="Gastos">
                                                        <FaMoneyBillWave size={12} />
                                                    </button>
                                                    <button onClick={() => abrirPanelGastos(v, "timeline")}
                                                        className="p-2 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-300 hover:bg-blue-500/20 transition-all"
                                                        title="Timeline">
                                                        <FaHistory size={12} />
                                                    </button>
                                                    <button onClick={() => abrirPanelGastos(v, "rentabilidad")}
                                                        className="p-2 rounded-xl bg-purple-500/10 border border-purple-400/20 text-purple-300 hover:bg-purple-500/20 transition-all"
                                                        title="Rentabilidad">
                                                        <FaChartLine size={12} />
                                                    </button>
                                                    {v.cartaPorteId && (
                                                        <button onClick={() => navigate(`/cartas-porte?id=${v.cartaPorteId}`)}
                                                            className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20 transition-all"
                                                            title="Carta Porte">
                                                            <FaFileAlt size={12} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(v.id)}
                                                        className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                        <FaTrash size={12} />
                                                    </button>
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

            {/* PANEL VIAJE -GASTOS / TIMELINE / RENTABILIDAD */}
            <AnimatePresence>
                {showPanelGastos && viajeSeleccionado && (
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25 }}
                        className="fixed right-0 top-0 h-full w-[480px] bg-[#020617] border-l border-cyan-400/20 z-50 flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-cyan-400/10 flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-cyan-300">{viajeSeleccionado.folio || `#${viajeSeleccionado.id}`}</h2>
                                <p className="text-gray-400 text-sm mt-1">{viajeSeleccionado.cliente?.name || viajeSeleccionado.clienteNombre || "Sin cliente"}</p>
                            </div>
                            <button onClick={() => setShowPanelGastos(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                        </div>

                        {/* TABS */}
                        <div className="flex gap-1 px-4 pt-4 pb-2 flex-shrink-0">
                            {[
                                { id: "gastos",       label: "Gastos",       icon: <FaMoneyBillWave size={11} /> },
                                { id: "timeline",     label: "Timeline",     icon: <FaHistory size={11} /> },
                                { id: "rentabilidad", label: "Rentabilidad", icon: <FaChartLine size={11} /> },
                            ].map(t => (
                                <button key={t.id} onClick={() => cambiarTabPanel(t.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all
                                        ${tabPanel === t.id ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB: GASTOS / ANTICIPOS */}
                        {tabPanel === "gastos" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 flex-shrink-0">
                                    <div className="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-4">
                                        <p className="text-yellow-400 text-xs font-bold uppercase">Anticipos</p>
                                        <p className="text-2xl font-black text-yellow-300 mt-1">${totalAnticipos.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4">
                                        <p className="text-red-400 text-xs font-bold uppercase">Gastos</p>
                                        <p className="text-2xl font-black text-red-300 mt-1">${totalGastos.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="px-4 pb-3 flex-shrink-0">
                                    <button onClick={openNuevoGasto}
                                        className="w-full py-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2">
                                        <FaPlus /> Agregar Anticipo / Gasto
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                                    {gastos.length === 0 && (
                                        <p className="text-center text-gray-500 py-10">No hay anticipos ni gastos registrados</p>
                                    )}
                                    {gastos.map((g, i) => (
                                        <motion.div key={g.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`p-4 rounded-2xl border ${g.categoria === "Anticipo" ? "bg-yellow-500/5 border-yellow-400/20" : "bg-white/5 border-cyan-400/10"}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.categoria === "Anticipo" ? "bg-yellow-500/20 text-yellow-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                                                            {g.categoria}
                                                        </span>
                                                        <span className="text-white font-bold text-sm">{g.tipo}</span>
                                                        {g.categoria !== "Anticipo" && (
                                                            g.comprobado ? (
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-300">🧾 Comprobado</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300">Sin comprobar</span>
                                                            )
                                                        )}
                                                    </div>
                                                    {g.descripcion && <p className="text-gray-400 text-xs mb-1">{g.descripcion}</p>}
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-green-300 font-black">${(g.monto || 0).toLocaleString()}</p>
                                                        <p className="text-gray-500 text-xs">{g.fecha}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 ml-3">
                                                    <button onClick={() => openEditarGasto(g)} className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                    <button onClick={() => handleEliminarGasto(g.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* TAB: TIMELINE */}
                        {tabPanel === "timeline" && (
                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                {loadingTimeline ? (
                                    <p className="text-center text-gray-500 py-10">Cargando timeline...</p>
                                ) : timelineEventos.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">No hay eventos registrados para este viaje</p>
                                ) : (
                                    <div className="relative pl-6">
                                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-cyan-400/20" />
                                        {timelineEventos.map((e, i) => (
                                            <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.06 }}
                                                className="relative mb-5 last:mb-0">
                                                <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                                                    i === timelineEventos.length - 1 ? "bg-cyan-400 border-cyan-300" : "bg-[#020617] border-cyan-400/40"
                                                }`} />
                                                <div className="bg-white/5 border border-cyan-400/10 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(e.statusNuevo)}`}>
                                                            {e.statusNuevo || e.accion}
                                                        </span>
                                                        <span className="text-gray-500 text-xs">{e.fecha} {e.hora}</span>
                                                    </div>
                                                    <p className="text-gray-300 text-sm">{e.descripcion}</p>
                                                    <p className="text-gray-600 text-xs mt-1">por {e.usuario}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB: RENTABILIDAD */}
                        {tabPanel === "rentabilidad" && (
                            <div className="flex-1 overflow-y-auto px-4 py-4">
                                {loadingRent ? (
                                    <p className="text-center text-gray-500 py-10">Calculando rentabilidad...</p>
                                ) : !rentabilidad ? (
                                    <p className="text-center text-gray-500 py-10">No se pudo cargar la rentabilidad</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-2xl bg-green-500/10 border border-green-400/20 p-4">
                                                <p className="text-green-400 text-xs font-bold uppercase">Ingreso</p>
                                                <p className="text-2xl font-black text-green-300 mt-1">{fmt(rentabilidad.ingreso)}</p>
                                            </div>
                                            <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4">
                                                <p className="text-red-400 text-xs font-bold uppercase">Gastos Totales</p>
                                                <p className="text-2xl font-black text-red-300 mt-1">{fmt(rentabilidad.totalGastos)}</p>
                                            </div>
                                        </div>

                                        <div className={`rounded-2xl border p-5 ${rentabilidad.utilidad >= 0 ? "bg-cyan-500/10 border-cyan-400/30" : "bg-red-500/10 border-red-400/30"}`}>
                                            <p className="text-gray-400 text-xs font-bold uppercase">Utilidad Neta</p>
                                            <p className={`text-3xl font-black mt-1 ${rentabilidad.utilidad >= 0 ? "text-cyan-300" : "text-red-300"}`}>
                                                {fmt(rentabilidad.utilidad)}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                Margen: {rentabilidad.margenPct?.toFixed(1) || 0}%
                                            </p>
                                        </div>

                                        {rentabilidad.totalAnticipos > 0 && (
                                            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-4">
                                                <p className="text-yellow-400 text-xs font-bold uppercase">Anticipos Pagados</p>
                                                <p className="text-xl font-black text-yellow-300 mt-1">{fmt(rentabilidad.totalAnticipos)}</p>
                                            </div>
                                        )}

                                        {rentabilidad.porCategoria && Object.keys(rentabilidad.porCategoria).length > 0 && (
                                            <div>
                                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Desglose por Categoría</p>
                                                <div className="space-y-2">
                                                    {Object.entries(rentabilidad.porCategoria).map(([cat, monto]) => (
                                                        <div key={cat} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                                                            <span className="text-gray-300 text-sm">{cat}</span>
                                                            <span className="text-white font-bold">{fmt(monto)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <button onClick={irAFacturar}
                                            className="w-full py-3 rounded-2xl bg-purple-500/10 border border-purple-400/30 text-purple-300 font-bold hover:bg-purple-500/20 transition-all flex items-center justify-center gap-2">
                                            <FaFileInvoiceDollar /> Facturar este Viaje
                                        </button>

                                        <button onClick={irALiquidacion}
                                            className="w-full py-3 rounded-2xl bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 font-bold hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-2">
                                            <FaHandHoldingUsd /> Generar Liquidación del Operador
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL EVIDENCIA */}
            <AnimatePresence>
                {showEvidencia && viajeEvidencia && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-green-400/20 rounded-3xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-green-300">Evidencia de Entrega</h2>
                                    <p className="text-gray-400 text-sm">{viajeEvidencia.folio || `#${viajeEvidencia.id}`}</p>
                                </div>
                                <button onClick={() => setShowEvidencia(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Nombre de quien recibe</label>
                                        <input value={receptorNombre} onChange={e => setReceptorNombre(e.target.value)} className={inputCls} placeholder="Juan Pérez" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Puesto</label>
                                        <input value={receptorPuesto} onChange={e => setReceptorPuesto(e.target.value)} className={inputCls} placeholder="Almacenista" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-gray-400 text-xs mb-1 block">Comentarios</label>
                                        <input value={comentarioEv} onChange={e => setComentarioEv(e.target.value)} className={inputCls} placeholder="Mercancía entregada en buen estado..." />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-2 block flex items-center gap-2"><FaCamera /> Foto de entrega</label>
                                    <input type="file" accept="image/*" capture="environment" onChange={onFotoChange}
                                        className="text-gray-400 text-sm bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 w-full" />
                                    {fotoPreview && (
                                        <div className="mt-3 relative">
                                            <img src={fotoPreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl border border-green-400/20" />
                                            <button onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                                                className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 text-white"><FaTimes size={10} /></button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-gray-400 text-xs flex items-center gap-2"><FaSignature /> Firma digital</label>
                                        <button onClick={limpiarFirma} className="text-xs text-gray-500 hover:text-white">→Limpiar</button>
                                    </div>
                                    <div className="relative w-full h-36 bg-white/5 border border-cyan-400/20 rounded-xl overflow-hidden touch-none">
                                        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair"
                                            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                                            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                                        {!firmaDataUrl && (
                                            <p className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm pointer-events-none">Firma aquí</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 p-6 pt-0 flex-shrink-0">
                                <button onClick={() => setShowEvidencia(false)}
                                    className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={guardarEvidencia} disabled={loadingEv}
                                    className="flex-1 py-3 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 flex items-center justify-center gap-2">
                                    <FaCheckCircle /> {loadingEv ? "Guardando..." : "Confirmar Entrega"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL NUEVO VIAJE */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-3xl font-black text-cyan-300">Nuevo Viaje</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Asignación</p>
                                    <Field label="Cliente" span2>
                                        <select value={form.clienteId} onChange={set("clienteId")} className={selectCls}>
                                            <option value="">Seleccionar cliente...</option>
                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.name} -{c.company}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Ruta" span2>
                                        <select value={form.rutaId} onChange={set("rutaId")} className={selectCls} disabled={!form.clienteId}>
                                            <option value="">{form.clienteId ? "Seleccionar ruta..." : "Primero selecciona un cliente"}</option>
                                            {rutasFiltradas.map(r => (
                                                <option key={r.id} value={r.id}>
                                                    {r.remitente?.ciudad || "?"} →{r.destinatario?.ciudad || "?"} {r.distanciaKm ? `(${r.distanciaKm} km)` : ""}
                                                </option>
                                            ))}
                                        </select>
                                        {form.clienteId && rutasFiltradas.length === 0 && (
                                            <p className="text-yellow-400 text-xs mt-1">Sin rutas. <a href="/rutas" className="underline">Agregar ruta</a></p>
                                        )}
                                    </Field>
                                    <Field label="Conductor">
                                        <select value={form.driverId} onChange={set("driverId")} className={selectCls}>
                                            <option value="">Seleccionar conductor...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Vehículo">
                                        <select value={form.vehicleId} onChange={set("vehicleId")} className={selectCls}>
                                            <option value="">Seleccionar vehículo...</option>
                                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} -{v.brand} {v.model}</option>)}
                                        </select>
                                    </Field>
                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Detalles</p>
                                    <Field label="Fecha salida">
                                        <input type="date" value={form.date} onChange={set("date")} className={inputCls} />
                                    </Field>
                                    <Field label="Costo ($)">
                                        <input type="number" value={form.cost} onChange={set("cost")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="Notas" span2>
                                        <input value={form.notas} onChange={set("notas")} placeholder="Observaciones..." className={inputCls} />
                                    </Field>
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    {loading ? "Guardando..." : "Guardar Viaje"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL GASTO */}
            <AnimatePresence>
                {showGastoModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-md flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">{editandoGasto ? "Editar" : "Nuevo"} Anticipo / Gasto</h2>
                                <button onClick={() => setShowGastoModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Tipo</label>
                                    <select value={gastoForm.tipo} onChange={setG("tipo")} className={selectCls}>
                                        {TIPOS.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Categoría</label>
                                    <select value={gastoForm.categoria} onChange={setG("categoria")} className={selectCls}>
                                        <option>Anticipo</option>
                                        <option>Gasto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Descripción</label>
                                    <input value={gastoForm.descripcion} onChange={setG("descripcion")} placeholder="Detalle..." className={inputCls} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Monto ($)</label>
                                        <input type="number" value={gastoForm.monto} onChange={setG("monto")} placeholder="0.00" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Fecha</label>
                                        <input type="date" value={gastoForm.fecha} onChange={setG("fecha")} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Status</label>
                                    <select value={gastoForm.status} onChange={setG("status")} className={selectCls}>
                                        <option>Pendiente</option>
                                        <option>Pagado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Notas</label>
                                    <input value={gastoForm.notas} onChange={setG("notas")} placeholder="Observaciones..." className={inputCls} />
                                </div>

                                {/* Ticket comprobatorio: con foto, la empresa absorbe el gasto y no se le cobra al operador */}
                                <div className="rounded-2xl border border-cyan-400/10 bg-white/5 p-4">
                                    <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                                        🧾 Ticket / comprobante
                                    </label>
                                    {gastoActivo?.comprobado ? (
                                        <div className="flex items-center justify-between">
                                            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/20 text-green-300">
                                                 tiene ticket -no se cobra al operador
                                            </span>
                                            <button onClick={handleQuitarTicket} type="button"
                                                className="text-xs text-red-400 hover:text-red-300 font-bold">
                                                Quitar ticket
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input type="file" accept="image/*,application/pdf"
                                                onChange={e => setTicketFile(e.target.files[0] || null)}
                                                className="text-gray-400 text-sm bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 w-full" />
                                            <p className="text-gray-500 text-xs mt-2">
                                                Sin ticket, este gasto se descuenta del pago del operador. Con ticket, lo absorbe la empresa.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4 p-6 pt-0">
                                <button onClick={() => setShowGastoModal(false)}
                                    className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleGuardarGasto} disabled={loadingGasto}
                                    className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                    {loadingGasto ? "Guardando..." : editandoGasto ? "Actualizar" : "Guardar"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}











