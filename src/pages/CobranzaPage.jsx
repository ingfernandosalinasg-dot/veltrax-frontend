import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
    FaMoneyBillWave, FaExclamationTriangle, FaCheckCircle,
    FaClock, FaPlus, FaTimes, FaCheck, FaHistory, FaSearch,
    FaFileInvoiceDollar
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

// Cat谩logos SAT para timbrado
const FORMAS_PAGO_SAT = [
    { clave: "01", desc: "Efectivo" },
    { clave: "02", desc: "Cheque nominativo" },
    { clave: "03", desc: "Transferencia electr贸nica de fondos" },
    { clave: "04", desc: "Tarjeta de cr茅dito" },
    { clave: "05", desc: "Monedero electr贸nico" },
    { clave: "06", desc: "Dinero electr贸nico" },
    { clave: "08", desc: "Vales de despensa" },
    { clave: "12", desc: "Daci贸n en pago" },
    { clave: "13", desc: "Pago por subrogaci贸n" },
    { clave: "14", desc: "Pago por consignaci贸n" },
    { clave: "15", desc: "Condonaci贸n" },
    { clave: "17", desc: "Compensaci贸n" },
    { clave: "23", desc: "Novaci贸n" },
    { clave: "24", desc: "Confusi贸n" },
    { clave: "25", desc: "Remisi贸n de deuda" },
    { clave: "26", desc: "Prescripci贸n o caducidad" },
    { clave: "27", desc: "A satisfacci贸n del acreedor" },
    { clave: "28", desc: "Tarjeta de d茅bito" },
    { clave: "29", desc: "Tarjeta de servicios" },
    { clave: "30", desc: "Aplicaci贸n de anticipos" },
    { clave: "31", desc: "Intermediario pagos" },
    { clave: "99", desc: "Por definir" },
];

const METODOS_PAGO_SAT = [
    { clave: "PUE", desc: "Pago en una sola exhibici贸n" },
    { clave: "PPD", desc: "Pago en parcialidades o diferido" },
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

function statusColor(status) {
    switch (status) {
        case "Pagada":   return "text-green-300 bg-green-500/10 border-green-400/30";
        case "Parcial":  return "text-yellow-300 bg-yellow-500/10 border-yellow-400/30";
        case "Vencida":  return "text-red-300 bg-red-500/10 border-red-400/30";
        default:         return "text-cyan-300 bg-cyan-500/10 border-cyan-400/30";
    }
}

function diasVencimiento(fecha) {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function CobranzaPage() {
    const [facturas,    setFacturas]    = useState([]);
    const [resumen,     setResumen]     = useState(null);
    const [pagos,       setPagos]       = useState([]);
    const [showPagoModal,  setShowPagoModal]  = useState(false);
    const [showPagosModal, setShowPagosModal] = useState(false);
    const [facturaActiva,  setFacturaActiva]  = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [busqueda,    setBusqueda]    = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");
    const [formPago,    setFormPago]    = useState({
        monto: "", fecha: new Date().toISOString().split("T")[0],
        formaPago: "03", metodoPago: "PUE",
        referencia: "", notas: "",
    });

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchFacturas = async () => {
        try {
            const res  = await fetch(`${API}/api/cobranza/facturas`, { headers });
            const data = await res.json();
            setFacturas(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchResumen = async () => {
        try {
            const res  = await fetch(`${API}/api/cobranza/resumen`, { headers });
            const data = await res.json();
            setResumen(data);
        } catch (e) { console.error(e); }
    };

    const fetchPagos = async (facturaId) => {
        try {
            const res  = await fetch(`${API}/api/cobranza/facturas/${facturaId}/pagos`, { headers });
            const data = await res.json();
            setPagos(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchFacturas();
        fetchResumen();
    }, []);

    const setP = (f) => (e) => setFormPago(prev => ({ ...prev, [f]: e.target.value }));

    const abrirPago = (factura) => {
        setFacturaActiva(factura);
        setFormPago({
            monto: "", fecha: new Date().toISOString().split("T")[0],
            formaPago: "03", metodoPago: "PUE",
            referencia: "", notas: "",
        });
        setShowPagoModal(true);
    };

    const abrirHistorial = async (factura) => {
        setFacturaActiva(factura);
        await fetchPagos(factura.id);
        setShowPagosModal(true);
    };

    const registrarPago = async () => {
        if (!facturaActiva) return;
        setLoading(true);
        try {
            const body = {
                monto:      Number(formPago.monto),
                fecha:      formPago.fecha,
                formaPago:  formPago.formaPago,
                metodoPago: formPago.metodoPago,
                referencia: formPago.referencia,
                notas:      formPago.notas,
            };
            const res = await fetch(`${API}/api/cobranza/facturas/${facturaActiva.id}/pagos`, {
                method: "POST", headers, body: JSON.stringify(body)
            });
            if (res.ok) {
                setShowPagoModal(false);
                fetchFacturas();
                fetchResumen();
            } else {
                const err = await res.text();
                alert("Error: " + err);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const facturasFiltradas = facturas.filter(f => {
        const matchBusq = !busqueda ||
            f.folio?.toLowerCase().includes(busqueda.toLowerCase()) ||
            f.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            f.rfc?.toLowerCase().includes(busqueda.toLowerCase());
        const matchStatus = !filtroStatus || f.status === filtroStatus;
        return matchBusq && matchStatus;
    });

    const saldoPendiente = (f) => (f.total || 0) - (f.pagado || 0);

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">COBRANZA</h1>
                    <p className="text-gray-400 mt-4 text-xl">Control de cuentas por cobrar y registro de pagos</p>
                </motion.div>

                {/* Stats del resumen */}
                {resumen && (
                    <div className="grid grid-cols-4 gap-6 mb-10">
                        {[
                            { label: "Total por cobrar", value: `$${(resumen.totalPorCobrar||0).toLocaleString()}`, color: "text-cyan-400",   border: "border-cyan-500/20",   icon: <FaMoneyBillWave /> },
                            { label: "Vencido",          value: `$${(resumen.totalVencido||0).toLocaleString()}`,   color: "text-red-400",    border: "border-red-500/20",    icon: <FaExclamationTriangle /> },
                            { label: "Vigente",          value: `$${(resumen.totalVigente||0).toLocaleString()}`,   color: "text-yellow-400", border: "border-yellow-500/20", icon: <FaClock /> },
                            { label: "Cobrado este mes", value: `$${(resumen.cobradoMes||0).toLocaleString()}`,     color: "text-green-400",  border: "border-green-500/20",  icon: <FaCheckCircle /> },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                                <div className={`text-4xl ${s.color}`}>{s.icon}</div>
                                <div><p className="text-gray-400 text-sm">{s.label}</p><h2 className={`text-2xl font-black ${s.color}`}>{s.value}</h2></div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Filtros */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por folio, cliente o RFC..."
                            className="w-full bg-white/5 border border-cyan-400/10 rounded-2xl pl-11 pr-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                    </div>
                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                        className="bg-[#020617] border border-cyan-400/10 rounded-2xl px-5 py-3 text-white outline-none">
                        <option value="">Todos los estados</option>
                        <option>Pendiente</option>
                        <option>Parcial</option>
                        <option>Vencida</option>
                        <option>Pagada</option>
                    </select>
                </div>

                {/* Tabla de facturas/cuentas por cobrar */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3">
                        <FaFileInvoiceDollar /> Cuentas por Cobrar
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio","Cliente","RFC","Total","Pagado","Saldo","Vencimiento","D铆as","Status","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {facturasFiltradas.length === 0 && (
                                    <tr><td colSpan={10} className="py-10 text-center text-gray-500">
                                        No hay facturas por cobrar
                                    </td></tr>
                                )}
                                {facturasFiltradas.map((f, i) => {
                                    const saldo = saldoPendiente(f);
                                    const dias  = diasVencimiento(f.fechaVencimiento);
                                    const diasColor = dias === null ? "text-gray-400" : dias < 0 ? "text-red-400 font-bold" : dias <= 7 ? "text-yellow-400 font-bold" : "text-gray-400";
                                    return (
                                        <motion.tr key={f.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                                            className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-4 pr-4 font-bold text-cyan-300">{f.folio}</td>
                                            <td className="py-4 pr-4 font-bold">{f.clienteNombre || "-"}</td>
                                            <td className="py-4 pr-4 text-gray-400 font-mono text-xs">{f.rfc || "-"}</td>
                                            <td className="py-4 pr-4 text-white font-bold">${(f.total||0).toLocaleString()}</td>
                                            <td className="py-4 pr-4 text-green-300">${(f.pagado||0).toLocaleString()}</td>
                                            <td className="py-4 pr-4 text-yellow-300 font-black">${saldo.toLocaleString()}</td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">{f.fechaVencimiento || "-"}</td>
                                            <td className={`py-4 pr-4 text-sm ${diasColor}`}>
                                                {dias === null ? "-" : dias < 0 ? `${Math.abs(dias)}d vencida` : `${dias}d`}
                                            </td>
                                            <td className="py-4 pr-4">
                                                <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusColor(f.status)}`}>
                                                    {f.status}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex gap-2">
                                                    {saldo > 0.01 && (
                                                        <button onClick={() => abrirPago(f)}
                                                            className="p-3 rounded-xl bg-green-500/10 border border-green-400/20 text-green-400 hover:bg-green-500/20 transition-all" title="Registrar pago">
                                                            <FaPlus />
                                                        </button>
                                                    )}
                                                    <button onClick={() => abrirHistorial(f)}
                                                        className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-400 hover:bg-blue-500/20 transition-all" title="Ver historial de pagos">
                                                        <FaHistory />
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

            {/* Modal registrar pago */}
            <AnimatePresence>
                {showPagoModal && facturaActiva && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-cyan-300">Registrar Pago</h2>
                                    <p className="text-gray-400 text-sm mt-1">{facturaActiva.folio} -{facturaActiva.clienteNombre}</p>
                                </div>
                                <button onClick={() => setShowPagoModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            {/* Resumen de la factura */}
                            <div className="mx-8 mb-6 p-4 rounded-2xl bg-white/5 border border-cyan-400/10 grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-gray-500 text-xs">TOTAL</p>
                                    <p className="text-white font-black">${(facturaActiva.total||0).toLocaleString()}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-gray-500 text-xs">PAGADO</p>
                                    <p className="text-green-300 font-black">${(facturaActiva.pagado||0).toLocaleString()}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-gray-500 text-xs">SALDO</p>
                                    <p className="text-yellow-300 font-black">${saldoPendiente(facturaActiva).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 pb-2 grid grid-cols-2 gap-5">
                                <Field label="Monto del pago ($)" span2>
                                    <input type="number" value={formPago.monto} onChange={setP("monto")}
                                        placeholder={`M谩ximo: $${saldoPendiente(facturaActiva).toLocaleString()}`}
                                        className={inputCls} />
                                </Field>
                                <Field label="Fecha de pago">
                                    <input type="date" value={formPago.fecha} onChange={setP("fecha")} className={inputCls} />
                                </Field>
                                <Field label="Referencia / No. transferencia">
                                    <input value={formPago.referencia} onChange={setP("referencia")} placeholder="REF-000001" className={inputCls} />
                                </Field>

                                {/* Claves SAT para timbrado */}
                                <div className="col-span-2 p-4 rounded-2xl bg-purple-500/5 border border-purple-400/20">
                                    <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">Claves SAT para timbrado CFDI</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Forma de Pago (SAT)" span2>
                                            <select value={formPago.formaPago} onChange={setP("formaPago")} className={selectCls}>
                                                {FORMAS_PAGO_SAT.map(f => (
                                                    <option key={f.clave} value={f.clave}>{f.clave} -{f.desc}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="M茅todo de Pago (SAT)" span2>
                                            <select value={formPago.metodoPago} onChange={setP("metodoPago")} className={selectCls}>
                                                {METODOS_PAGO_SAT.map(m => (
                                                    <option key={m.clave} value={m.clave}>{m.clave} -{m.desc}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                </div>

                                <Field label="Notas" span2>
                                    <textarea value={formPago.notas} onChange={setP("notas")} rows={2}
                                        placeholder="Observaciones del pago..." className={inputCls + " resize-none"} />
                                </Field>
                            </div>

                            <div className="flex gap-4 p-8 pt-4">
                                <button onClick={() => setShowPagoModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">
                                    Cancelar
                                </button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={registrarPago} disabled={loading || !formPago.monto}
                                    className="flex-1 py-4 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Registrando..." : "Registrar Pago"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal historial de pagos */}
            <AnimatePresence>
                {showPagosModal && facturaActiva && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-xl">
                            <div className="flex justify-between items-center p-8 pb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-cyan-300 flex items-center gap-3"><FaHistory /> Historial de Pagos</h2>
                                    <p className="text-gray-400 text-sm mt-1">{facturaActiva.folio} -{facturaActiva.clienteNombre}</p>
                                </div>
                                <button onClick={() => setShowPagosModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="px-8 pb-8 space-y-3 max-h-[60vh] overflow-y-auto">
                                {pagos.length === 0 && (
                                    <p className="text-gray-500 text-center py-8">Sin pagos registrados a煤n.</p>
                                )}
                                {pagos.map(p => (
                                    <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-white font-black text-lg">${(p.monto||0).toLocaleString()}</p>
                                                <p className="text-gray-400 text-sm">{p.fecha} {p.referencia ? `路 ${p.referencia}` : ""}</p>
                                                {p.notas && <p className="text-gray-500 text-xs mt-1">{p.notas}</p>}
                                            </div>
                                            <div className="text-right">
                                                {p.formaPago && (
                                                    <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-mono font-bold">
                                                        {FORMAS_PAGO_SAT.find(f => f.clave === p.formaPago)?.clave || p.formaPago}
                                                    </span>
                                                )}
                                                {p.metodoPago && (
                                                    <div className="mt-1 text-xs text-gray-500">{p.metodoPago}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}







