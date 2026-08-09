import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaShoppingCart, FaCheck, FaTimes, FaTrash, FaEye,
         FaLock, FaFileAlt, FaSearch, FaGavel, FaBoxOpen,
         FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";
const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

function fmxn(n) { if (n == null) return "-"; return "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 }); }
function fnum(n) { if (n == null) return "-"; return Number(n).toLocaleString("es-MX"); }

const OC_STATUS_COLORS = {
    PENDIENTE:  "text-yellow-300 bg-yellow-500/10 border-yellow-400/30",
    AUTORIZADA: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    ENVIADA:    "text-blue-300 bg-blue-500/10 border-blue-400/30",
    ENTREGADA:  "text-green-300 bg-green-500/10 border-green-400/30",
    CANCELADA:  "text-red-300 bg-red-500/10 border-red-400/30",
};

const FLUJO_OC = ["PENDIENTE", "AUTORIZADA", "ENVIADA", "ENTREGADA"];

export default function OrdenesCompraPage() {
    const [ordenes,      setOrdenes]      = useState([]);
    const [resumen,      setResumen]      = useState({});
    const [licitaciones, setLicitaciones] = useState([]);
    const [partidas,     setPartidas]     = useState([]);
    const [proveedores,  setProveedores]  = useState([]);
    const [articulos,    setArticulos]    = useState([]);
    const [showModal,    setShowModal]    = useState(false);
    const [showDetalle,  setShowDetalle]  = useState(false);
    const [ocDetalle,    setOcDetalle]    = useState(null);
    const [busqueda,     setBusqueda]     = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");
    const [filtroLic,    setFiltroLic]    = useState("");
    const [loading,      setLoading]      = useState(false);
    const [msg,          setMsg]          = useState(null);

    // Form nueva OC
    const [form, setForm] = useState({
        licitacionId: "", partidaId: "", proveedorId: "",
        cantidad: "", precioUnitario: "", notas: ""
    });
    const [saldoDisp,  setSaldoDisp]  = useState(null);
    const [errForm,    setErrForm]    = useState(null);
    const [partidasLic, setPartidasLic] = useState([]);

    const token   = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario") || "Sistema";
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3500); };

    const fetchAll = async () => {
        const [o, r, l, p, a] = await Promise.all([
            fetch(`${API}/api/ordenes-compra`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API}/api/ordenes-compra/resumen`, { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
            fetch(`${API}/api/licitaciones`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API}/api/proveedores`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`${API}/api/articulos`, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        setOrdenes(Array.isArray(o) ? o : []);
        setResumen(r || {});
        setLicitaciones((Array.isArray(l) ? l : []).filter(l => l.status === "GANADA"));
        setProveedores(Array.isArray(p) ? p : []);
        setArticulos(Array.isArray(a) ? a : []);
    };

    useEffect(() => { fetchAll(); }, []);

    // Cuando cambia la licitaci贸n en el form, cargar sus partidas
    useEffect(() => {
        if (!form.licitacionId) { setPartidasLic([]); return; }
        fetch(`${API}/api/licitaciones/${form.licitacionId}/partidas`, { headers })
            .then(r => r.ok ? r.json() : []).then(setPartidasLic).catch(() => setPartidasLic([]));
    }, [form.licitacionId]);

    // Cuando cambia la partida, calcular saldo disponible
    useEffect(() => {
        if (!form.partidaId || !form.licitacionId) { setSaldoDisp(null); return; }
        const partida = partidasLic.find(p => String(p.id) === String(form.partidaId));
        if (!partida) { setSaldoDisp(null); return; }
        const consumido = ordenes
            .filter(o => o.partidaId === partida.id && o.licitacionId === Number(form.licitacionId) && o.status !== "CANCELADA")
            .reduce((s, o) => s + (o.cantidad || 0), 0);
        setSaldoDisp({ partida, consumido, disponible: partida.cantidadMaxima - consumido });
        // Pre-llenar precio con el de la partida
        if (partida.precioUnitario) setForm(f => ({ ...f, precioUnitario: String(partida.precioUnitario) }));
    }, [form.partidaId, partidasLic]);

    const setF = k => e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrForm(null); };

    const validar = () => {
        if (!form.licitacionId) return "Selecciona una licitaci贸n";
        if (!form.partidaId)    return "Selecciona una partida";
        if (!form.proveedorId)  return "Selecciona un proveedor";
        const cant = Number(form.cantidad);
        if (!cant || cant <= 0) return "Ingresa una cantidad v谩lida";
        if (saldoDisp && cant > saldoDisp.disponible) return `鉀?Excede el saldo disponible (${fnum(saldoDisp.disponible)} ${saldoDisp.partida?.unidad || ""})`;
        if (!form.precioUnitario || Number(form.precioUnitario) <= 0) return "Ingresa el precio unitario";
        return null;
    };

    const crearOC = async () => {
        const err = validar();
        if (err) { setErrForm(err); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/licitaciones/${form.licitacionId}/ordenes-compra`, {
                method: "POST", headers,
                body: JSON.stringify({
                    partidaId:      Number(form.partidaId),
                    proveedorId:    Number(form.proveedorId),
                    cantidad:       Number(form.cantidad),
                    precioUnitario: Number(form.precioUnitario),
                    notas:          form.notas,
                    usuario
                })
            });
            if (res.ok) {
                showMsg(true, "Orden de compra creada");setShowModal(false);
                setForm({ licitacionId:"", partidaId:"", proveedorId:"", cantidad:"", precioUnitario:"", notas:"" });
                fetchAll();
            } else {
                const e = await res.json().catch(() => ({}));
                setErrForm(e.message || "Error al crear la orden");
            }
        } catch { setErrForm("Error de conexi贸n"); }
        setLoading(false);
    };

    const avanzarStatus = async (oc) => {
        const idx = FLUJO_OC.indexOf(oc.status);
        if (idx < 0 || idx >= FLUJO_OC.length - 1) return;
        const nuevoStatus = FLUJO_OC[idx + 1];
        await fetch(`${API}/api/ordenes-compra/${oc.id}/status?status=${nuevoStatus}`, { method: "PUT", headers });
        fetchAll();
        if (ocDetalle?.id === oc.id) setOcDetalle(prev => ({ ...prev, status: nuevoStatus }));
    };

    const cancelarOC = async (id) => {
        if (!confirm("驴Cancelar esta orden de compra?")) return;
        await fetch(`${API}/api/licitaciones/ordenes-compra/${id}/cancelar`, { method: "PUT", headers });
        showMsg(true, "Orden cancelada");
        fetchAll();
        if (showDetalle) setShowDetalle(false);
    };

    const filtradas = ordenes.filter(o => {
        const matchB = !busqueda ||
            o.folio?.toLowerCase().includes(busqueda.toLowerCase()) ||
            o.partidaDescripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
            o.proveedorNombre?.toLowerCase().includes(busqueda.toLowerCase());
        const matchS = !filtroStatus || o.status === filtroStatus;
        const matchL = !filtroLic || String(o.licitacionId) === filtroLic;
        return matchB && matchS && matchL;
    });

    const totalActivo = filtradas.filter(o => o.status !== "CANCELADA").reduce((s, o) => s + (o.total || 0), 0);

    const calc = form.cantidad && form.precioUnitario && Number(form.cantidad) > 0 && Number(form.precioUnitario) > 0
        ? { sub: Number(form.cantidad) * Number(form.precioUnitario), iva: Number(form.cantidad) * Number(form.precioUnitario) * 0.16, total: Number(form.cantidad) * Number(form.precioUnitario) * 1.16 }
        : null;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-8 overflow-auto">
                <Topbar />

                {msg && (
                    <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-bold ${msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                        {msg.txt}
                    </div>
                )}

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">脫RDENES DE COMPRA</h1>
                        <p className="text-gray-400 mt-2">Todas las OC ligadas a fallos de licitaciones ganadas</p>
                    </div>
                    <button onClick={() => { setShowModal(true); setErrForm(null); }}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva OC
                    </button>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label: "Total OC",      value: ordenes.length,                                                    color: "text-white" },
                        { label: "Pendientes",    value: ordenes.filter(o => o.status === "PENDIENTE").length,              color: "text-yellow-400" },
                        { label: "Autorizadas",   value: ordenes.filter(o => o.status === "AUTORIZADA").length,             color: "text-cyan-400" },
                        { label: "Entregadas",    value: ordenes.filter(o => o.status === "ENTREGADA").length,              color: "text-green-400" },
                        { label: "Total activo",  value: `$${(ordenes.filter(o => o.status !== "CANCELADA").reduce((s, o) => s + (o.total || 0), 0) / 1000000).toFixed(2)}M`, color: "text-purple-400" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="rounded-2xl bg-white/5 border border-cyan-400/10 p-4">
                            <p className="text-gray-400 text-xs">{s.label}</p>
                            <h2 className={`text-2xl font-black ${s.color}`}>{s.value}</h2>
                        </motion.div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex gap-3 mb-5 flex-wrap">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por folio, partida, proveedor..."
                            className="bg-white/5 border border-cyan-400/10 rounded-xl pl-8 pr-4 py-2 text-white outline-none text-sm w-80" />
                    </div>
                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                        className="bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm">
                        <option value="">Todos los status</option>
                        {Object.keys(OC_STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select value={filtroLic} onChange={e => setFiltroLic(e.target.value)}
                        className="bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm">
                        <option value="">Todas las licitaciones</option>
                        {licitaciones.map(l => <option key={l.id} value={l.id}>{l.folio} -{l.titulo}</option>)}
                    </select>
                    <span className="text-gray-500 text-sm self-center">{filtradas.length} OC 路 {fmxn(totalActivo)}</span>
                </div>

                {/* Tabla */}
                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10">
                                {["# OC", "Licitaci贸n", "Partida", "Proveedor", "Cantidad", "Precio U.", "Total", "Status", "Avanzar", "Acciones"].map(h => (
                                    <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtradas.length === 0 && (
                                <tr><td colSpan={10} className="py-16 text-center text-gray-500">
                                    <FaShoppingCart className="mx-auto mb-3 text-3xl" />
                                    <p>No hay 贸rdenes de compra</p>
                                    <p className="text-xs mt-1">Crea una OC desde una licitaci贸n GANADA o desde el bot贸n "Nueva OC"</p>
                                </td></tr>
                            )}
                            {filtradas.map((oc, i) => {
                                const idx = FLUJO_OC.indexOf(oc.status);
                                const siguiente = idx >= 0 && idx < FLUJO_OC.length - 1 ? FLUJO_OC[idx + 1] : null;
                                return (
                                    <motion.tr key={oc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                        className={`border-b border-white/5 hover:bg-cyan-500/5 transition-all ${oc.status === "CANCELADA" ? "opacity-40" : ""}`}>
                                        <td className="px-4 py-3 font-black text-cyan-300 whitespace-nowrap">
                                            <button onClick={() => { setOcDetalle(oc); setShowDetalle(true); }} className="hover:underline">
                                                {oc.folio || `OC-${oc.id}`}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-cyan-300 font-black text-xs">{oc.licitacionFolio || "-"}</p>
                                            <p className="text-gray-400 text-xs truncate max-w-xs">{oc.licitacionTitulo || ""}</p>
                                        </td>
                                        <td className="px-4 py-3 text-white max-w-xs">
                                            <p className="font-bold truncate">{oc.partidaDescripcion || "-"}</p>
                                            {oc.partidaClave && <p className="text-gray-500 text-xs">{oc.partidaClave}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{oc.proveedorNombre || "-"}</td>
                                        <td className="px-4 py-3 text-white font-bold text-right whitespace-nowrap">{fnum(oc.cantidad)} {oc.unidad}</td>
                                        <td className="px-4 py-3 text-white text-right whitespace-nowrap">{fmxn(oc.precioUnitario)}</td>
                                        <td className="px-4 py-3 text-green-300 font-black text-right whitespace-nowrap">{fmxn(oc.total)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${OC_STATUS_COLORS[oc.status] || "text-gray-300 bg-white/5 border-white/10"}`}>
                                                {oc.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {siguiente && oc.status !== "CANCELADA" && (
                                                <button onClick={() => avanzarStatus(oc)}
                                                    className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all whitespace-nowrap">
                                                    鈫?{siguiente}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => { setOcDetalle(oc); setShowDetalle(true); }}
                                                    className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-500/20 transition-all">
                                                    <FaEye size={11} />
                                                </button>
                                                {oc.status !== "CANCELADA" && (
                                                    <button onClick={() => cancelarOC(oc.id)}
                                                        className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                        <FaTrash size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                        {filtradas.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-cyan-400/20">
                                    <td colSpan={6} className="px-4 pt-3 text-right text-gray-400 font-bold">TOTAL ACTIVO:</td>
                                    <td className="px-4 pt-3 text-right font-black text-cyan-300 whitespace-nowrap">{fmxn(totalActivo)}</td>
                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* 鈹€鈹€ Modal Nueva OC 鈹€鈹€ */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-black text-cyan-300">Nueva Orden de Compra</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>

                            {errForm && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-bold flex items-center gap-2">
                                    <FaLock size={12} /> {errForm}
                                </div>
                            )}

                            <div className="space-y-3">
                                {/* Licitaci贸n */}
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Licitaci贸n (GANADA) *</label>
                                    <select value={form.licitacionId} onChange={setF("licitacionId")} className={selectCls}>
                                        <option value="">-Seleccionar licitaci贸n </option>
                                        {licitaciones.map(l => <option key={l.id} value={l.id}>{l.folio} -{l.titulo}</option>)}
                                    </select>
                                </div>

                                {/* Partida */}
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Partida del fallo *</label>
                                    <select value={form.partidaId} onChange={setF("partidaId")} className={selectCls} disabled={!form.licitacionId}>
                                        <option value="">-Seleccionar partida </option>
                                        {partidasLic.map(p => <option key={p.id} value={p.id}>{p.clave ? `[${p.clave}] ` : ""}{p.descripcion}</option>)}
                                    </select>
                                </div>

                                {/* Saldo disponible */}
                                {saldoDisp && (
                                    <div className={`px-4 py-3 rounded-xl border text-sm ${saldoDisp.disponible <= 0 ? "bg-red-500/10 border-red-400/30 text-red-300" : "bg-cyan-500/5 border-cyan-400/20 text-cyan-300"}`}>
                                        <div className="flex justify-between">
                                            <span>M谩ximo adjudicado: <strong>{fnum(saldoDisp.partida.cantidadMaxima)}</strong></span>
                                            <span>Consumido: <strong>{fnum(saldoDisp.consumido)}</strong></span>
                                            <span className="font-black">Disponible: <strong>{fnum(saldoDisp.disponible)}</strong></span>
                                        </div>
                                        {saldoDisp.disponible <= 0 && <p className="mt-1 text-xs flex items-center gap-1"><FaLock size={10}/> Esta partida est谩 agotada</p>}
                                    </div>
                                )}

                                {/* Proveedor */}
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Proveedor *</label>
                                    <select value={form.proveedorId} onChange={setF("proveedorId")} className={selectCls}>
                                        <option value="">-Seleccionar proveedor </option>
                                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre || p.razonSocial}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cantidad *</label>
                                        <input type="number" value={form.cantidad} onChange={setF("cantidad")}
                                            className={inputCls}
                                            placeholder={saldoDisp ? `M谩x ${fnum(saldoDisp.disponible)}` : "0"}
                                            max={saldoDisp?.disponible} min={1} />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Precio Unitario ($) *</label>
                                        <input type="number" value={form.precioUnitario} onChange={setF("precioUnitario")} className={inputCls} placeholder="0.00" />
                                    </div>
                                </div>

                                {calc && (
                                    <div className="bg-white/5 border border-cyan-400/10 rounded-xl p-3 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white">{fmxn(calc.sub)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">IVA 16%</span><span className="text-white">{fmxn(calc.iva)}</span></div>
                                        <div className="flex justify-between font-black border-t border-white/10 pt-2 mt-2">
                                            <span className="text-cyan-300">Total OC</span>
                                            <span className="text-cyan-300">{fmxn(calc.total)}</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Notas</label>
                                    <input value={form.notas} onChange={setF("notas")} className={inputCls} placeholder="Observaciones de la orden..." />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={crearOC} disabled={loading || (saldoDisp && saldoDisp.disponible <= 0)}
                                    className="flex-1 py-3 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <FaShoppingCart /> {loading ? "Creando..." : "Crear Orden de Compra"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 鈹€鈹€ Modal Detalle OC 鈹€鈹€ */}
            <AnimatePresence>
                {showDetalle && ocDetalle && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg p-6">
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h2 className="text-xl font-black text-cyan-300">{ocDetalle.folio || `OC-${ocDetalle.id}`}</h2>
                                    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${OC_STATUS_COLORS[ocDetalle.status]}`}>{ocDetalle.status}</span>
                                </div>
                                <button onClick={() => setShowDetalle(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                            </div>

                            <div className="space-y-2 mb-5">
                                {[
                                    { label: "Licitaci贸n",     value: `${ocDetalle.licitacionFolio || ""} ${ocDetalle.licitacionTitulo || ""}` },
                                    { label: "Partida",        value: ocDetalle.partidaDescripcion },
                                    { label: "Clave partida",  value: ocDetalle.partidaClave },
                                    { label: "Proveedor",      value: ocDetalle.proveedorNombre },
                                    { label: "Cantidad",       value: `${fnum(ocDetalle.cantidad)} ${ocDetalle.unidad || ""}` },
                                    { label: "Precio unitario",value: fmxn(ocDetalle.precioUnitario) },
                                    { label: "Notas",          value: ocDetalle.notas },
                                ].map((item, i) => item.value && (
                                    <div key={i} className="flex gap-2 py-2 border-b border-white/5">
                                        <span className="text-gray-400 text-xs w-36 flex-shrink-0 pt-0.5">{item.label}</span>
                                        <span className="text-white text-sm font-bold">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-cyan-500/5 border border-cyan-400/20 rounded-xl p-4 mb-5">
                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Subtotal</span><span className="text-white">{fmxn((ocDetalle.total || 0) / 1.16)}</span></div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">IVA 16%</span><span className="text-white">{fmxn((ocDetalle.total || 0) - (ocDetalle.total || 0) / 1.16)}</span></div>
                                <div className="flex justify-between font-black text-lg border-t border-cyan-400/20 pt-3 mt-3">
                                    <span className="text-cyan-300">TOTAL</span>
                                    <span className="text-cyan-300">{fmxn(ocDetalle.total)}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {(() => {
                                    const idx = FLUJO_OC.indexOf(ocDetalle.status);
                                    const sig = idx >= 0 && idx < FLUJO_OC.length - 1 ? FLUJO_OC[idx + 1] : null;
                                    return sig && ocDetalle.status !== "CANCELADA" ? (
                                        <button onClick={() => { avanzarStatus(ocDetalle); setOcDetalle(prev => ({ ...prev, status: sig })); }}
                                            className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30">
                                            鈫?Marcar como {sig}
                                        </button>
                                    ) : null;
                                })()}
                                {ocDetalle.status !== "CANCELADA" && (
                                    <button onClick={() => cancelarOC(ocDetalle.id)}
                                        className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 font-bold">
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}







