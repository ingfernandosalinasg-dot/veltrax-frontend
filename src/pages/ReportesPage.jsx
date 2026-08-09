import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaFilePdf, FaFileExcel, FaFilter, FaSyncAlt } from "react-icons/fa";
import { motion } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const MODULOS = [
    {
        key: "orders", label: "Viajes", icon: "馃殯",
        filtros: ["fecha", "status", "cliente"],
        statusOptions: ["Pendiente", "En ruta", "Completado"],
    },
    {
        key: "cartas-porte", label: "Cartas Porte", icon: "馃搫",
        filtros: ["fecha", "status"],
        statusOptions: ["Activa", "En Tr谩nsito", "Entregada", "Cancelada"],
    },
    {
        key: "liquidaciones", label: "Liquidaciones", icon: "馃挵",
        filtros: ["fecha", "driver"],
        statusOptions: [],
    },
];

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

export default function ReportesPage() {
    const [moduloActivo, setModuloActivo] = useState(MODULOS[0]);
    const [filtros, setFiltros] = useState({ fechaInicio: "", fechaFin: "", status: "", clienteId: "", driverId: "" });
    const [clientes,  setClientes]  = useState([]);
    const [drivers,   setDrivers]   = useState([]);
    const [loading,   setLoading]   = useState(null);
    const [mensaje,   setMensaje]   = useState(null);
    const [preview,   setPreview]   = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    useEffect(() => {
        Promise.all([
            fetch(`${API}/clients`,  { headers }).then(r => r.json()),
            fetch(`${API}/drivers`,  { headers }).then(r => r.json()),
        ]).then(([c, d]) => {
            setClientes(Array.isArray(c) ? c : []);
            setDrivers(Array.isArray(d) ? d : []);
        }).catch(() => {});
    }, []);

    useEffect(() => { cargarPreview(); }, [moduloActivo, filtros]);

    const buildQuery = () => {
        const params = new URLSearchParams();
        if (filtros.fechaInicio) params.append("fechaInicio", filtros.fechaInicio);
        if (filtros.fechaFin)    params.append("fechaFin",    filtros.fechaFin);
        if (filtros.status)      params.append("status",      filtros.status);
        if (filtros.clienteId && moduloActivo.key === "orders")        params.append("clienteId", filtros.clienteId);
        if (filtros.driverId  && moduloActivo.key === "liquidaciones") params.append("driverId",  filtros.driverId);
        return params.toString();
    };

    const cargarPreview = async () => {
        setLoadingPreview(true);
        try {
            const query = buildQuery();
            const url   = `${API}/${moduloActivo.key}${query ? "?" + query : ""}`;
            const res   = await fetch(url, { headers });
            const data  = await res.json();
            setPreview(Array.isArray(data) ? data.slice(0, 5) : []);
        } catch { setPreview([]); }
        setLoadingPreview(false);
    };

    const exportarPDF = () => {
        const modulo = moduloActivo;
        const datos  = preview;

        if (datos.length === 0) {
            setMensaje({ tipo: "error", texto: "No hay datos para exportar" });
            return;
        }

        const filas = datos.map((item, i) => {
            if (modulo.key === "orders") {
                return `<tr>
                    <td>${i + 1}</td>
                    <td>#${item.id}</td>
                    <td>${item.clienteNombre || "-"}</td>
                    <td>${item.origen || "-"} 鈫?${item.destino || "-"}</td>
                    <td>${item.driverNombre || "-"}</td>
                    <td>${item.date || "-"}</td>
                    <td>$${(item.cost || 0).toLocaleString()}</td>
                    <td>${item.status || "-"}</td>
                </tr>`;
            } else if (modulo.key === "cartas-porte") {
                return `<tr>
                    <td>${i + 1}</td>
                    <td>${item.folio || "-"}</td>
                    <td>${item.remitenteNombre || "-"}</td>
                    <td>${item.destinatarioNombre || "-"}</td>
                    <td>${item.lugarCarga || "-"} 鈫?${item.lugarDescarga || "-"}</td>
                    <td>${item.fechaEmision || "-"}</td>
                    <td>${item.status || "-"}</td>
                </tr>`;
            } else {
                return `<tr>
                    <td>${i + 1}</td>
                    <td>#${item.id}</td>
                    <td>${item.driverNombre || "-"}</td>
                    <td>#${item.orderId || "-"}</td>
                    <td>${item.esquemaPago || "-"}</td>
                    <td>$${(item.totalIngreso || 0).toLocaleString()}</td>
                    <td>-$${(item.totalDeducciones || 0).toLocaleString()}</td>
                    <td>$${(item.netoAPagar || 0).toLocaleString()}</td>
                    <td>${item.status || "-"}</td>
                </tr>`;
            }
        }).join("");

        const headers_tabla = {
            "orders":        ["#", "ID", "Cliente", "Ruta", "Conductor", "Fecha", "Costo", "Status"],
            "cartas-porte":  ["#", "Folio", "Remitente", "Destinatario", "Ruta", "Emisi贸n", "Status"],
            "liquidaciones": ["#", "ID", "Operador", "Viaje", "Esquema", "Ingreso", "Deducciones", "Neto", "Status"],
        }[modulo.key];

        const html = `<html><head><meta charset="UTF-8"/>
        <title>Reporte ${modulo.label}</title>
        <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:Arial,sans-serif; padding:32px; color:#111; font-size:12px; }
            .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0891b2; padding-bottom:18px; margin-bottom:24px; }
            .logo { font-size:24px; font-weight:900; color:#0891b2; letter-spacing:4px; }
            .titulo { text-align:center; font-size:18px; font-weight:bold; margin-bottom:20px; color:#0891b2; text-transform:uppercase; }
            .filtros { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px; margin-bottom:20px; font-size:11px; color:#0369a1; }
            table { width:100%; border-collapse:collapse; }
            th { background:#0891b2; color:white; padding:8px; text-align:left; font-size:11px; }
            td { padding:7px 8px; border-bottom:1px solid #f0f0f0; font-size:11px; }
            tr:nth-child(even) { background:#f8fafc; }
            .footer { margin-top:30px; text-align:right; font-size:10px; color:#888; }
        </style></head><body>
        <div class="header">
            <div class="logo">VELTRAX</div>
            <div style="text-align:right">
                <div style="font-size:14px;font-weight:bold">Reporte de ${modulo.label}</div>
                <div style="color:#888;font-size:11px">Generado: ${new Date().toLocaleString("es-MX")}</div>
            </div>
        </div>
        <div class="titulo">${modulo.icon} ${modulo.label}</div>
        <div class="filtros">
            Filtros aplicados:
            ${filtros.fechaInicio ? `Desde: ${filtros.fechaInicio}` : ""}
            ${filtros.fechaFin    ? `| Hasta: ${filtros.fechaFin}`  : ""}
            ${filtros.status      ? `| Status: ${filtros.status}`   : ""}
            ${!filtros.fechaInicio && !filtros.fechaFin && !filtros.status ? "Sin filtros (todos los registros)" : ""}
        </div>
        <table>
            <thead><tr>${headers_tabla.map(h => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${filas}</tbody>
        </table>
        <div class="footer">Veltrax ERP v2.0 -${new Date().toLocaleDateString("es-MX")}</div>
        </body></html>`;

        const w = window.open("", "_blank");
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 500);
        setMensaje({ tipo: "ok", texto: "PDF generado correctamente" });
    };

    const exportarExcel = () => {
        if (preview.length === 0) {
            setMensaje({ tipo: "error", texto: "No hay datos para exportar" });
            return;
        }

        let csv = "";
        if (moduloActivo.key === "orders") {
            csv = "ID,Cliente,Origen,Destino,Conductor,Veh铆culo,Fecha,Costo,Status\n";
            csv += preview.map(v => `${v.id},"${v.clienteNombre||""}","${v.origen||""}","${v.destino||""}","${v.driverNombre||""}","${v.vehiclePlacas||""}","${v.date||""}",${v.cost||0},"${v.status||""}"`).join("\n");
        } else if (moduloActivo.key === "cartas-porte") {
            csv = "Folio,Remitente,Destinatario,Origen,Destino,Conductor,Veh铆culo,Emisi贸n,Status\n";
            csv += preview.map(c => `"${c.folio||""}","${c.remitenteNombre||""}","${c.destinatarioNombre||""}","${c.lugarCarga||""}","${c.lugarDescarga||""}","${c.conductorNombre||""}","${c.vehiculoPlacas||""}","${c.fechaEmision||""}","${c.status||""}"`).join("\n");
        } else {
            csv = "ID,Operador,Viaje,Esquema,Ingreso,Deducciones,Neto,Fecha,Status\n";
            csv += preview.map(l => `${l.id},"${l.driverNombre||""}",${l.orderId||""},"${l.esquemaPago||""}",${l.totalIngreso||0},${l.totalDeducciones||0},${l.netoAPagar||0},"${l.fechaLiquidacion||""}","${l.status||""}"`).join("\n");
        }

        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_${moduloActivo.key}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setMensaje({ tipo: "ok", texto: "Excel exportado correctamente" });
    };

    const resetFiltros = () => {
        setFiltros({ fechaInicio: "", fechaFin: "", status: "", clienteId: "", driverId: "" });
        setMensaje(null);
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">REPORTES</h1>
                    <p className="text-gray-400 mt-4 text-xl">Exporta datos a PDF o Excel con filtros</p>
                </motion.div>

                <div className="grid grid-cols-4 gap-8">
                    {/* Sidebar m贸dulos */}
                    <div className="col-span-1">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">M贸dulo</p>
                        <div className="space-y-3">
                            {MODULOS.map(m => (
                                <motion.button key={m.key} whileHover={{ scale: 1.02 }}
                                    onClick={() => { setModuloActivo(m); resetFiltros(); }}
                                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all font-bold text-left
                                        ${moduloActivo.key === m.key
                                            ? "bg-cyan-500/10 border-cyan-400/30 text-cyan-300"
                                            : "bg-white/5 border-white/5 text-gray-300 hover:bg-cyan-500/5 hover:border-cyan-400/10"
                                        }`}>
                                    <span className="text-2xl">{m.icon}</span>
                                    <span>{m.label}</span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Filtros */}
                        <div className="mt-8 rounded-3xl bg-white/5 border border-cyan-400/10 p-6">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FaFilter /> Filtros
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Fecha inicio</label>
                                    <input type="date" value={filtros.fechaInicio}
                                        onChange={e => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))}
                                        className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Fecha fin</label>
                                    <input type="date" value={filtros.fechaFin}
                                        onChange={e => setFiltros(f => ({ ...f, fechaFin: e.target.value }))}
                                        className={inputCls} />
                                </div>
                                {moduloActivo.statusOptions.length > 0 && (
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Status</label>
                                        <select value={filtros.status}
                                            onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
                                            className={selectCls}>
                                            <option value="">Todos</option>
                                            {moduloActivo.statusOptions.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}
                                {moduloActivo.filtros.includes("cliente") && (
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Cliente</label>
                                        <select value={filtros.clienteId}
                                            onChange={e => setFiltros(f => ({ ...f, clienteId: e.target.value }))}
                                            className={selectCls}>
                                            <option value="">Todos</option>
                                            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {moduloActivo.filtros.includes("driver") && (
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Operador</label>
                                        <select value={filtros.driverId}
                                            onChange={e => setFiltros(f => ({ ...f, driverId: e.target.value }))}
                                            className={selectCls}>
                                            <option value="">Todos</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button onClick={resetFiltros}
                                    className="w-full py-2 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all text-sm flex items-center justify-center gap-2">
                                    <FaSyncAlt /> Limpiar filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="col-span-3">
                        {mensaje && (
                            <div className={`mb-6 px-5 py-3 rounded-xl text-sm font-bold ${mensaje.tipo === "ok" ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                                {mensaje.texto}
                            </div>
                        )}

                        {/* Botones exportar */}
                        <div className="flex gap-4 mb-8">
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={exportarPDF}
                                className="flex-1 py-5 rounded-2xl bg-red-500/10 border border-red-400/30 text-red-300 font-bold text-lg hover:bg-red-500/20 transition-all flex items-center justify-center gap-3">
                                <FaFilePdf className="text-2xl" /> Exportar PDF
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={exportarExcel}
                                className="flex-1 py-5 rounded-2xl bg-green-500/10 border border-green-400/30 text-green-300 font-bold text-lg hover:bg-green-500/20 transition-all flex items-center justify-center gap-3">
                                <FaFileExcel className="text-2xl" /> Exportar Excel (CSV)
                            </motion.button>
                        </div>

                        {/* Preview */}
                        <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                            <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-3">
                                {moduloActivo.icon} Vista Previa -{moduloActivo.label}
                                <span className="text-sm font-normal text-gray-500">(煤ltimos 5 registros)</span>
                            </h2>

                            {loadingPreview ? (
                                <p className="text-gray-500 text-center py-10">Cargando datos...</p>
                            ) : preview.length === 0 ? (
                                <p className="text-gray-500 text-center py-10">No hay registros con los filtros aplicados</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="text-gray-400 border-b border-cyan-400/10">
                                                {moduloActivo.key === "orders" && ["ID","Cliente","Ruta","Conductor","Fecha","Costo","Status"].map(h => <th key={h} className="pb-3 pr-4">{h}</th>)}
                                                {moduloActivo.key === "cartas-porte" && ["Folio","Remitente","Destinatario","Ruta","Emisi贸n","Status"].map(h => <th key={h} className="pb-3 pr-4">{h}</th>)}
                                                {moduloActivo.key === "liquidaciones" && ["ID","Operador","Viaje","Esquema","Ingreso","Neto","Status"].map(h => <th key={h} className="pb-3 pr-4">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.map((item, i) => (
                                                <tr key={i} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                                    {moduloActivo.key === "orders" && <>
                                                        <td className="py-3 pr-4 text-cyan-300 font-bold">#{item.id}</td>
                                                        <td className="py-3 pr-4">{item.clienteNombre || "-"}</td>
                                                        <td className="py-3 pr-4 text-gray-400 text-xs">{item.origen || "-"} 鈫?{item.destino || "-"}</td>
                                                        <td className="py-3 pr-4 text-gray-400">{item.driverNombre || "-"}</td>
                                                        <td className="py-3 pr-4 text-gray-400">{item.date || "-"}</td>
                                                        <td className="py-3 pr-4 text-green-300">${(item.cost || 0).toLocaleString()}</td>
                                                        <td className="py-3 pr-4"><span className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs">{item.status}</span></td>
                                                    </>}
                                                    {moduloActivo.key === "cartas-porte" && <>
                                                        <td className="py-3 pr-4 text-cyan-300 font-bold">{item.folio}</td>
                                                        <td className="py-3 pr-4">{item.remitenteNombre || "-"}</td>
                                                        <td className="py-3 pr-4">{item.destinatarioNombre || "-"}</td>
                                                        <td className="py-3 pr-4 text-gray-400 text-xs">{item.lugarCarga || "-"} 鈫?{item.lugarDescarga || "-"}</td>
                                                        <td className="py-3 pr-4 text-gray-400">{item.fechaEmision || "-"}</td>
                                                        <td className="py-3 pr-4"><span className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs">{item.status}</span></td>
                                                    </>}
                                                    {moduloActivo.key === "liquidaciones" && <>
                                                        <td className="py-3 pr-4 text-cyan-300 font-bold">#{item.id}</td>
                                                        <td className="py-3 pr-4">{item.driverNombre || "-"}</td>
                                                        <td className="py-3 pr-4 text-gray-400">#{item.orderId}</td>
                                                        <td className="py-3 pr-4 text-xs"><span className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300">{item.esquemaPago}</span></td>
                                                        <td className="py-3 pr-4 text-green-300">${(item.totalIngreso || 0).toLocaleString()}</td>
                                                        <td className="py-3 pr-4 text-yellow-300 font-bold">${(item.netoAPagar || 0).toLocaleString()}</td>
                                                        <td className="py-3 pr-4"><span className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs">{item.status}</span></td>
                                                    </>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}










