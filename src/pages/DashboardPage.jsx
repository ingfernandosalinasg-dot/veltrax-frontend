import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaRoute, FaTruck, FaMoneyBillWave, FaBox, FaGavel,
         FaShoppingCart, FaFileInvoiceDollar, FaCrown,
         FaChartLine, FaExclamationTriangle, FaCheckCircle,
         FaClock, FaBolt, FaUsers } from "react-icons/fa";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
         ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";
const fmt  = n => "$"+Number(n||0).toLocaleString("es-MX", { minimumFractionDigits:2 });
const fmtM = n => "$"+Number(n||0).toLocaleString("es-MX", { maximumFractionDigits:0 });

const COLORS = ["#06b6d4","#8b5cf6","#10b981","#f59e0b","#ef4444"];

export default function DashboardPage() {
    const [viajes,       setViajes]       = useState([]);
    const [cobranza,     setCobranza]     = useState({});
    const [cajas,        setCajas]        = useState({});
    const [licitaciones, setLicitaciones] = useState([]);
    const [ordenes,      setOrdenes]      = useState({});
    const [facturas,     setFacturas]     = useState([]);
    const [tenants,      setTenants]      = useState({});
    const [bitacora,     setBitacora]     = useState([]);
    const [loading,      setLoading]      = useState(true);

    const token   = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario") || "Admin";
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) };

    const fetchJson = async (url) => {
        try { 
            const r = await fetch(url, { headers }); 
            if (!r.ok) return null; 
            return await r.json(); 
        } catch (error) { 
            console.error(`Error en fetch a ${url}:`, error);
            return null; 
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [v, c, ca, l, oc, f, t, b] = await Promise.all([
                fetchJson(API+"/orders"),
                fetchJson(API+"/api/cobranza/resumen"),
                fetchJson(API+"/api/cajas/resumen"),
                fetchJson(API+"/api/licitaciones/resumen"),
                fetchJson(API+"/api/ordenes-compra/resumen"),
                fetchJson(API+"/api/facturas"),
                fetchJson(API+"/api/tenants/resumen"),
                fetchJson(API+"/api/bitacora"),
            ]);
            setViajes(Array.isArray(v) ? v : []);
            setCobranza(c || {});
            setCajas(ca || {});
            setLicitaciones(Array.isArray(l) ? l : []);
            setOrdenes(oc || {});
            setFacturas(Array.isArray(f) ? f : []);
            setTenants(t || {});
            setBitacora(Array.isArray(b) ? b.slice(0,6) : []);
            setLoading(false);
        };
        load();
    }, []);

    const enRuta     = viajes.filter(v => v?.status === "EN_RUTA").length;
    const pendientes = viajes.filter(v => v?.status === "PENDIENTE").length;
    const entregados = viajes.filter(v => ["ENTREGADO","COBRADO","FACTURADO"].includes(v?.status)).length;
    const ingresoMes = viajes.filter(v => v?.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,v) => s+(v?.cost||0), 0);

    const viajesChartData = [
        { name:"Pendiente", value: viajes.filter(v=>v?.status==="PENDIENTE").length },
        { name:"Asignado",  value: viajes.filter(v=>v?.status==="ASIGNADO").length },
        { name:"En Ruta",   value: viajes.filter(v=>v?.status==="EN_RUTA").length },
        { name:"Entregado", value: viajes.filter(v=>v?.status==="ENTREGADO").length },
        { name:"Facturado", value: viajes.filter(v=>v?.status==="FACTURADO").length },
        { name:"Cobrado",   value: viajes.filter(v=>v?.status==="COBRADO").length },
    ].filter(d => d.value > 0);

    const mesesData = Array.from({ length:6 }, (_, i) => {
        const d    = new Date();
        d.setMonth(d.getMonth() - (5-i));
        const key  = d.toISOString().slice(0,7);
        const mes  = d.toLocaleString("es-MX", { month:"short" });
        const ing  = viajes.filter(v => v?.date?.startsWith(key)).reduce((s,v) => s+(v?.cost||0), 0);
        return { mes, ingreso: ing || 0 };
    });

    const licsGanadas   = licitaciones.filter(l => l?.status==="GANADA").length;
    const licsPipeline  = licitaciones.filter(l => ["PROSPECTO","EN_PROCESO","PRESENTADA"].includes(l?.status)).length;
    const montoPipeline = licitaciones.filter(l => ["PROSPECTO","EN_PROCESO","PRESENTADA"].includes(l?.status)).reduce((s,l) => s+(l?.montoEstimado||0), 0);

    const licsChartData = [
        { name:"Prospecto",  value: licitaciones.filter(l=>l?.status==="PROSPECTO").length },
        { name:"En Proceso", value: licitaciones.filter(l=>l?.status==="EN_PROCESO").length },
        { name:"Presentada", value: licitaciones.filter(l=>l?.status==="PRESENTADA").length },
        { name:"Ganada",     value: licitaciones.filter(l=>l?.status==="GANADA").length },
        { name:"Perdida",    value: licitaciones.filter(l=>l?.status==="PERDIDA").length },
    ].filter(d => d.value > 0);

    const factTimbradas  = facturas.filter(f => f?.status==="Timbrada").length;
    const factBorradores = facturas.filter(f => f?.status==="Borrador").length;
    const totalFacturado = facturas.filter(f => f?.status==="Timbrada").reduce((s,f) => s+(f?.total||0), 0);

    const iconoBitacora = (modulo) => {
        const map = { VIAJE:"\uD83D\uDE9B", FACTURA:"\uD83D\uDCC4", CARTA_PORTE:"\uD83D\uDCCB", CAJA:"\uD83D\uDCE6", LICITACION:"\u2696\uFE0F", PAGO:"\uD83D\uDDE3" };
        return map[modulo] || "\uD83D\uDCCC";
    };

    if (loading) return (
        <div className="flex min-h-screen bg-[#020617] text-white">
            <Sidebar />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Cargando dashboard...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity:0, y:-30 }} animate={{ opacity:1, y:0 }} className="mb-10">
                    <div className="flex items-end gap-4">
                        <div>
                            <p className="text-gray-400 text-lg">Bienvenido de vuelta,</p>
                            <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">{usuario}</h1>
                        </div>
                        <div className="mb-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-400/20 text-green-300 text-sm flex items-center gap-2">
                            <FaBolt /> Sistema Online
                        </div>
                    </div>
                </motion.div>

                <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-cyan-400/20" />
                    <p className="text-cyan-400 text-xs font-black uppercase tracking-widest">Transporte</p>
                    <div className="h-px flex-1 bg-cyan-400/20" />
                </div>

                <div className="grid grid-cols-4 gap-5 mb-8">
                    {[
                        { label:"En Ruta",     value:enRuta,          sub:"viajes activos",  color:"text-cyan-300",   icon:<FaTruck />,          bg:"bg-cyan-500/10 border-cyan-400/20" },
                        { label:"Pendientes",  value:pendientes,       sub:"por asignar",     color:"text-yellow-300", icon:<FaClock />,          bg:"bg-yellow-500/10 border-yellow-400/20" },
                        { label:"Completados", value:entregados,       sub:"este periodo",    color:"text-green-300",  icon:<FaCheckCircle />,   bg:"bg-green-500/10 border-green-400/20" },
                        { label:"Ingreso Mes", value:fmtM(ingresoMes), sub:"total del mes",   color:"text-green-300",  icon:<FaMoneyBillWave />, bg:"bg-green-500/10 border-green-400/20" },
                    ].map((s,i) => (
                        <motion.div key={i} initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }}
                            className={"rounded-3xl border backdrop-blur-xl p-6 flex items-center gap-5 "+s.bg}>
                            <div className={"text-4xl "+s.color}>{s.icon}</div>
                            <div>
                                <p className="text-gray-400 text-sm">{s.label}</p>
                                <h2 className={"text-3xl font-black "+s.color}>{s.value}</h2>
                                <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }}
                        className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                        <h3 className="text-cyan-300 font-black mb-4">Ingresos Ultimos 6 Meses</h3>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={mesesData}>
                                <XAxis dataKey="mes" stroke="#4b5563" tick={{ fill:"#9ca3af", fontSize:12 }} />
                                <YAxis stroke="#4b5563" tick={{ fill:"#9ca3af", fontSize:12 }} tickFormatter={v => "$"+Number(v/1000).toFixed(0)+"k"} />
                                <Tooltip formatter={v => fmt(v)} contentStyle={{ background:"#020617", border:"1px solid #06b6d4", borderRadius:"12px", color:"#fff" }} />
                                <Line type="monotone" dataKey="ingreso" stroke="#06b6d4" strokeWidth={3} dot={{ fill:"#06b6d4", r:4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </motion.div>

                    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }}
                        className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                        <h3 className="text-cyan-300 font-black mb-4">Viajes por Status</h3>
                        {viajesChartData.length === 0 ? (
                            <p className="text-gray-500 text-center py-16">Sin viajes registrados</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={viajesChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                                        {viajesChartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background:"#020617", border:"1px solid #06b6d4", borderRadius:"12px", color:"#fff" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {viajesChartData.map((d,i) => (
                                <span key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ background:COLORS[i%COLORS.length] }} />
                                    {d.name} ({d.value})
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
                        className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                        <h3 className="text-cyan-300 font-black mb-4 flex items-center gap-2"><FaMoneyBillWave /> Cartera de Cobranza</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label:"Por Cobrar",  value:fmt(cobranza?.totalPorCobrar),  color:"text-white" },
                                { label:"Vencido",     value:fmt(cobranza?.totalVencido),   color:"text-red-300" },
                                { label:"Vigente",     value:fmt(cobranza?.totalVigente),   color:"text-green-300" },
                                { label:"Cobrado Mes", value:fmt(cobranza?.cobradoMes),       color:"text-cyan-300" },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-gray-500 text-xs">{s.label}</p>
                                    <p className={"font-black text-lg "+s.color}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
                        className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                        <h3 className="text-cyan-300 font-black mb-4 flex items-center gap-2"><FaBox /> Cajas en Circulacion</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label:"Total",         value:cajas?.total||0,              color:"text-white" },
                                { label:"Disponibles",   value:cajas?.disponibles||0,        color:"text-green-300" },
                                { label:"En Transito",   value:cajas?.enCliente||0,          color:"text-yellow-300" },
                                { label:"Val. Retenido", value:fmt(cajas?.valorRetenido||0), color:"text-cyan-300" },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-gray-500 text-xs">{s.label}</p>
                                    <p className={"font-black text-lg "+s.color}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-purple-400/20" />
                    <p className="text-purple-400 text-xs font-black uppercase tracking-widest">Bienes y Servicios</p>
                    <div className="h-px flex-1 bg-purple-400/20" />
                </div>

                <div className="grid grid-cols-4 gap-5 mb-8">
                    {[
                        { label:"Lics. Ganadas",   value:licsGanadas,          sub:"adjudicadas",    color:"text-green-300",  icon:<FaGavel />,       bg:"bg-green-500/10 border-green-400/20" },
                        { label:"En Pipeline",     value:licsPipeline,          sub:"en proceso",     color:"text-yellow-300", icon:<FaChartLine />,   bg:"bg-yellow-500/10 border-yellow-400/20" },
                        { label:"Monto Pipeline",  value:fmtM(montoPipeline),  sub:"estimado total", color:"text-purple-300", icon:<FaMoneyBillWave />,bg:"bg-purple-500/10 border-purple-400/20" },
                        { label:"OC Pendientes",   value:ordenes?.pendientes||0,sub:"por autorizar",  color:"text-orange-300", icon:<FaShoppingCart />, bg:"bg-orange-500/10 border-orange-400/20" },
                    ].map((s,i) => (
                        <motion.div key={i} initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1+0.5 }}
                            className={"rounded-3xl border backdrop-blur-xl p-6 flex items-center gap-5 "+s.bg}>
                            <div className={"text-4xl "+s.color}>{s.icon}</div>
                            <div>
                                <p className="text-gray-400 text-sm">{s.label}</p>
                                <h2 className={"text-3xl font-black "+s.color}>{s.value}</h2>
                                <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                    <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.6 }}
                        className="rounded-3xl bg-white/5 border border-purple-400/10 p-6">
                        <h3 className="text-purple-300 font-black mb-4">Licitaciones por Status</h3>
                        {licsChartData.length === 0 ? (
                            <p className="text-gray-500 text-center py-16">Sin licitaciones registradas</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={licsChartData}>
                                    <XAxis dataKey="name" stroke="#4b5563" tick={{ fill:"#9ca3af", fontSize:11 }} />
                                    <YAxis stroke="#4b5563" tick={{ fill:"#9ca3af", fontSize:11 }} />
                                    <Tooltip contentStyle={{ background:"#020617", border:"1px solid #8b5cf6", borderRadius:"12px", color:"#fff" }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[6,6,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </motion.div>

                    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.6 }}
                        className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                        <h3 className="text-cyan-300 font-black mb-4 flex items-center gap-2"><FaFileInvoiceDollar /> Facturacion CFDI</h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                                { label:"Timbradas",    value:factTimbradas,        color:"text-green-300" },
                                { label:"Borradores",   value:factBorradores,       color:"text-yellow-300" },
                                { label:"Total",        value:facturas.length,      color:"text-white" },
                                { label:"Facturado",    value:fmtM(totalFacturado), color:"text-cyan-300" },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-gray-500 text-xs">{s.label}</p>
                                    <p className={"font-black text-lg "+s.color}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-yellow-400/20" />
                    <p className="text-yellow-400 text-xs font-black uppercase tracking-widest">SaaS</p>
                    <div className="h-px flex-1 bg-yellow-400/20" />
                </div>

                <div className="grid grid-cols-4 gap-5 mb-10">
                    {[
                        { label:"Clientes Activos", value:tenants?.activos||0,    sub:"con licencia vigente", color:"text-green-300",  icon:<FaUsers />,  bg:"bg-green-500/10 border-green-400/20" },
                        { label:"En Prueba",        value:tenants?.prueba||0,     sub:"periodo de prueba",    color:"text-cyan-300",   icon:<FaCrown />,  bg:"bg-cyan-500/10 border-cyan-400/20" },
                        { label:"Por Vencer",       value:tenants?.porVencer||0,  sub:"menos de 7 dias",      color:"text-yellow-300", icon:<FaClock />,  bg:"bg-yellow-500/10 border-yellow-400/20" },
                        { label:"MRR",              value:fmtM(tenants?.mrr||0),  sub:"ingreso mensual recurrente", color:"text-purple-300", icon:<FaMoneyBillWave />, bg:"bg-purple-500/10 border-purple-400/20" },
                    ].map((s,i) => (
                        <motion.div key={i} initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1+0.7 }}
                            className={"rounded-3xl border backdrop-blur-xl p-6 flex items-center gap-5 "+s.bg}>
                            <div className={"text-4xl "+s.color}>{s.icon}</div>
                            <div>
                                <p className="text-gray-400 text-sm">{s.label}</p>
                                <h2 className={"text-3xl font-black "+s.color}>{s.value}</h2>
                                <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.8 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                    <h3 className="text-cyan-300 font-black mb-4">Actividad Reciente</h3>
                    {bitacora.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Sin actividad reciente</p>}
                    <div className="space-y-2">
                        {bitacora.map((e,i) => (
                            <motion.div key={e?.id||i} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05+0.8 }}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                                <span className="text-xl">{iconoBitacora(e?.modulo)}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold truncate">{e?.descripcion}</p>
                                    <p className="text-gray-500 text-xs">{e?.modulo} 路 {e?.usuario}</p>
                                </div>
                                <p className="text-gray-500 text-xs flex-shrink-0">{e?.fecha} {e?.hora}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}







