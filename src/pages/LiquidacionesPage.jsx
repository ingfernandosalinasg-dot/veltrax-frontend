import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaMoneyBillWave, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaFilePdf, FaCheckCircle, FaHandHoldingUsd, FaTrophy, FaCalendarAlt, FaLock, FaLockOpen, FaBan, FaUndo, FaListUl } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";

import { API_URL } from "../config/api";
import { hoyMexico } from "../utils/fechas";
import { etiquetaCliente } from "../utils/clientes";
import VistaPreviaEsquema from "../components/VistaPreviaEsquema";
import LiquidacionEsquemaModal from "../components/LiquidacionEsquemaModal";
import LineasLiquidacion from "../components/LineasLiquidacion";
const API = API_URL;

// VID-K1: un anticipo por autorizar o cancelado no entra en la liquidación (el
// backend no lo descuenta); los autorizados y los de antes de VID-K1, sin estatus, sí.
const entraEnLiquidacion = (g) =>
    g.categoria !== "Anticipo" || !g.estatusAnticipo || g.estatusAnticipo === "AUTORIZADO";

// Regla del backend: los anticipos se descuentan; los gastos, si no tienen comprobante,
// salvo los a crédito (VID-K3, DEC-1024-GASTO-CREDITO).
const seDeduceGasto = (g) => g.categoria === "Anticipo" || (!g.comprobado && !g.aCredito);

// VID-M4 (DEC-1024-CICLO-LIQUIDACION): status solo dice si está abierta o cerrada;
// autorizada y pagada son datos aparte, con quién y cuándo. El servidor revisa las
// reglas; los botones solo ofrecen lo que se puede hacer en cada etapa.
const TEXTO_ETAPA = { ABIERTA: "Abierta", CERRADA: "Cerrada", AUTORIZADA: "Autorizada", PAGADA: "Pagada" };

const folioDe = (l) => l.folio || `#${l.id}`;

// VID-M1 (entrega 3): las nuevas son por esquema (ESQUEMA); las de antes, por viaje o período.
const TEXTO_MODO = { ESQUEMA: "Esquema", PERIODO: "Período", VIAJE: "Viaje" };
const COLOR_MODO = {
    ESQUEMA: "bg-green-500/10 text-green-300",
    PERIODO: "bg-purple-500/10 text-purple-300",
    VIAJE: "bg-cyan-500/10 text-cyan-300",
};
const conSigno = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n || 0).toLocaleString()}`;
const escaparHtml = (t) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const rechazo = (res, data) => data?.error || (res.status === 403
    ? "No tienes permiso para esta acción o tu sesión expiró."
    : `No se pudo completar la acción (error ${res.status}).`);

// El viaje en el selector: folio, cliente, origen → destino y costo. La ruta, como en Viajes.
const etiquetaViaje = (v) => {
    const origen  = v.ruta?.origenTexto  || v.ruta?.remitente?.ciudad    || "?";
    const destino = v.ruta?.destinoTexto || v.ruta?.destinatario?.ciudad || "?";
    return `${v.folio || `#${v.id}`} - ${etiquetaCliente(v.cliente) || "Sin cliente"} | ${origen} → ${destino} | $${(v.cost || 0).toLocaleString()}`;
};

const emptyForm = {
    modo: "VIAJE", // VIAJE | PERIODO
    orderId: "", driverId: "", esquemaPago: "VIAJE_FIJO",
    periodoInicio: "", periodoFin: "",
    kmRecorridos: "", tarifaKm: "",
    millasRecorridas: "", tarifaMilla: "",
    porcentajeFlete: "", montoFijo: "",
    bonoCarga: "", bonoDescarga: "", bonoManiobras: "", bonoProductividad: "",
    prestamoId: "", montoDescuentoPrestamo: "",
    fechaLiquidacion: "", notas: ""
};

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

// Quién y cuándo, para las columnas Autorizada y Pagada.
function QuienYCuando({ por, en, sinDato = "-" }) {
    if (!en) return <span className="text-gray-500 text-sm">{sinDato}</span>;
    return (
        <div className="text-xs whitespace-nowrap">
            <p className="text-gray-200 font-bold">{por}</p>
            <p className="text-gray-400">{en}</p>
        </div>
    );
}

// VID-M1 (entrega 3): el PDF de una liquidación por esquema, con sus líneas. Entrega 4:
// un trayecto pagado muestra su importe y de dónde salieron su base y su tasa.
function generarPDFEsquema(liq) {
    const carga = { CARGADO: "cargado", VACIO: "vacío", SIN_MARCA: "sin marca" };
    const filas = (liq.lineas || []).map(x => `
        <tr${x.tipo === "TRAYECTO" ? ' style="color:#666"' : ""}>
            <td>${x.orden}</td>
            <td>${escaparHtml(x.tipo)}</td>
            <td${x.tipo === "TRAYECTO" ? ' style="padding-left:20px"' : ""}>${escaparHtml(x.concepto)}${x.tipo === "TRAYECTO"
                ? ` · ${x.km ?? 0} km, ${carga[x.carga] || x.carga}${x.liquidable === false ? ", no liquidable" : x.cuenta ? ", cuenta" : ", no cuenta"}` : ""}${x.fuente
                ? `<div style="font-size:10px;color:#888">${escaparHtml(x.fuente)}</div>` : ""}</td>
            <td style="text-align:right;color:${x.importe < 0 ? "red" : "#111"}">${x.tipo === "TRAYECTO" && !x.importe ? "" : conSigno(x.importe)}</td>
        </tr>`).join("");
    const html = `<html><head><meta charset="UTF-8"/>
    <title>Liquidación ${escaparHtml(folioDe(liq))}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; padding:32px; color:#111; font-size:13px; }
        .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0891b2; padding-bottom:18px; margin-bottom:24px; }
        .logo { font-size:28px; font-weight:900; color:#0891b2; letter-spacing:4px; }
        .sec { border:1px solid #ddd; border-radius:6px; padding:12px; margin-bottom:18px; }
        .sec h3 { font-size:11px; color:#0891b2; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
        table { width:100%; border-collapse:collapse; }
        th { background:#e0f7fa; color:#0891b2; padding:7px; text-align:left; font-size:11px; text-transform:uppercase; }
        td { padding:6px 7px; border-bottom:1px solid #f0f0f0; font-size:12px; }
        .total-final { display:flex; justify-content:space-between; padding:12px 0; font-size:18px; font-weight:900; color:#0891b2; border-top:2px solid #0891b2; margin-top:10px; }
        .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:12px; background:#e0f7fa; color:#0891b2; }
        .footer { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:40px; }
        .firma { text-align:center; }
        .firma .linea { border-top:1px solid #333; margin-bottom:6px; margin-top:50px; }
        .firma p { font-size:11px; color:#555; }
    </style></head><body>
    <div class="header">
        <div class="logo">VELTRAX</div>
        <div>
            <div style="font-size:16px;font-weight:bold">Liquidación ${escaparHtml(folioDe(liq))}</div>
            <div style="color:#888">Fecha: ${escaparHtml(liq.fechaLiquidacion || "-")}</div>
            <div style="margin-top:6px"><span class="badge">${TEXTO_ETAPA[liq.etapa] || liq.etapa || "-"}</span></div>
        </div>
    </div>
    <div class="sec"><h3>Operador y periodo</h3>
        <p><b>${escaparHtml(liq.driverNombre || "-")}</b> · semana del ${escaparHtml(liq.periodoInicio)} al ${escaparHtml(liq.periodoFin)} · esquema ${escaparHtml(liq.esquemaNombre || "-")}</p>
    </div>
    <div class="sec"><h3>Líneas</h3>
        <table><thead><tr><th>#</th><th>Tipo</th><th>Concepto</th><th style="text-align:right">Importe</th></tr></thead>
        <tbody>${filas}</tbody></table>
        <div class="total-final"><span>NETO ${liq.netoAPagar < 0 ? "(NEGATIVO: NO SE PAGA)" : "A PAGAR AL OPERADOR"}</span><span>${conSigno(liq.netoAPagar)}</span></div>
    </div>
    ${liq.notas ? `<div class="sec"><h3>Notas</h3><p>${escaparHtml(liq.notas)}</p></div>` : ""}
    ${liq.pagadaEn ? `<div class="sec"><h3>Datos de pago</h3><p>${escaparHtml(liq.fechaPago || "-")} · ${escaparHtml(liq.formaPago || "-")}${liq.referenciaPago ? ` · ${escaparHtml(liq.referenciaPago)}` : ""}</p></div>` : ""}
    <div class="footer">
        <div class="firma"><div class="linea"></div><p>Firma Operador</p><p style="font-weight:bold">${escaparHtml(liq.driverNombre || "")}</p></div>
        <div class="firma"><div class="linea"></div><p>Firma Administración</p><p style="font-weight:bold">Veltrax Logistics</p></div>
    </div>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
}

function generarPDFLiquidacion(liq, gastos) {
    const gastosCobrados   = gastos.filter(seDeduceGasto);
    const gastosAbsorbidos = gastos.filter(g => !seDeduceGasto(g));

    const filaGastos = gastosCobrados.map((g, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${g.categoria || "-"}</td>
            <td>${g.tipo || "-"}</td>
            <td>${g.descripcion || "-"}</td>
            <td>${g.fecha || "-"}</td>
            <td style="color:red">-$${(g.monto || 0).toLocaleString()}</td>
            <td>${g.status || "-"}</td>
        </tr>`).join("");

    const filaAbsorbidos = gastosAbsorbidos.map((g, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${g.tipo || "-"}</td>
            <td>${g.descripcion || "-"}</td>
            <td>${g.fecha || "-"}</td>
            <td style="color:#16a34a">$${(g.monto || 0).toLocaleString()}</td>
        </tr>`).join("");

    const esquemaTexto = {
        POR_KM:      `${liq.kmRecorridos} km × $${liq.tarifaKm}/km`,
        POR_MILLA:   `${liq.millasRecorridas} millas × $${liq.tarifaMilla}/milla`,
        PORCENTAJE:  `${liq.porcentajeFlete}% del flete ($${liq.ordenCosto?.toLocaleString()})`,
        VIAJE_FIJO:  `Viaje fijo acordado`,
    }[liq.esquemaPago] || "-";

    const esPeriodo = liq.modo === "PERIODO";

    const html = `<html><head><meta charset="UTF-8"/>
    <title>Liquidación ${folioDe(liq)}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,sans-serif; padding:32px; color:#111; font-size:13px; }
        .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0891b2; padding-bottom:18px; margin-bottom:24px; }
        .logo { font-size:28px; font-weight:900; color:#0891b2; letter-spacing:4px; }
        .titulo { text-align:center; font-size:20px; font-weight:bold; margin-bottom:24px; text-transform:uppercase; letter-spacing:2px; color:#0891b2; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px; }
        .sec { border:1px solid #ddd; border-radius:6px; padding:12px; }
        .sec h3 { font-size:11px; color:#0891b2; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px; }
        .campo { margin-bottom:6px; }
        .campo label { font-size:10px; color:#888; display:block; }
        .campo span { font-size:13px; font-weight:bold; }
        table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        th { background:#e0f7fa; color:#0891b2; padding:7px; text-align:left; font-size:11px; text-transform:uppercase; }
        td { padding:7px; border-bottom:1px solid #f0f0f0; font-size:12px; }
        .total-box { border:2px solid #0891b2; border-radius:8px; padding:16px; margin-top:20px; }
        .total-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee; }
        .total-final { display:flex; justify-content:space-between; padding:10px 0; font-size:18px; font-weight:900; color:#0891b2; }
        .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:12px; background:#e0f7fa; color:#0891b2; }
        .footer { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:40px; border-top:2px solid #eee; padding-top:20px; }
        .firma { text-align:center; }
        .firma .linea { border-top:1px solid #333; margin-bottom:6px; margin-top:50px; }
        .firma p { font-size:11px; color:#555; }
    </style></head><body>
    <div class="header">
        <div class="logo">VELTRAX</div>
        <div>
            <div style="font-size:16px;font-weight:bold">Liquidación ${folioDe(liq)}</div>
            <div style="color:#888">Fecha: ${liq.fechaLiquidacion || "-"}</div>
            <div style="margin-top:6px"><span class="badge">${TEXTO_ETAPA[liq.etapa] || liq.etapa || "-"}</span></div>
        </div>
    </div>
    <div class="titulo">Liquidación de Operador${esPeriodo ? " - Por Período" : ""}</div>
    <div class="grid2">
        <div class="sec"><h3>Operador</h3>
            <div class="campo"><label>Nombre</label><span>${liq.driverNombre || "-"}</span></div>
        </div>
        ${esPeriodo ? `
        <div class="sec"><h3>Período</h3>
            <div class="campo"><label>Del</label><span>${liq.periodoInicio || "-"}</span></div>
            <div class="campo"><label>Al</label><span>${liq.periodoFin || "-"}</span></div>
        </div>` : `
        <div class="sec"><h3>Viaje</h3>
            <div class="campo"><label>Folio</label><span>${liq.orderFolio || `#${liq.orderId || "-"}`}</span></div>
            <div class="campo"><label>Cliente</label><span>${liq.clienteNombre || "-"}</span></div>
            <div class="campo"><label>Ruta</label><span>${liq.ordenOrigen || "-"} → ${liq.ordenDestino || "-"}</span></div>
            <div class="campo"><label>Costo flete</label><span>$${(liq.ordenCosto || 0).toLocaleString()}</span></div>
        </div>`}
    </div>
    <div class="sec" style="margin-bottom:18px"><h3>Esquema de Pago</h3>
        <div class="campo"><label>Tipo</label><span>${liq.esquemaPago}</span></div>
        ${!esPeriodo ? `<div class="campo"><label>Detalle</label><span>${esquemaTexto}</span></div>` : ""}
        <div class="campo"><label>Ingreso base</label><span style="color:#0891b2;font-size:16px">$${(liq.totalIngreso || 0).toLocaleString()}</span></div>
    </div>
    ${gastosCobrados.length > 0 ? `
    <div class="sec" style="margin-bottom:18px"><h3>Deducciones (Anticipos y Gastos SIN Comprobar)</h3>
        <table><thead><tr><th>#</th><th>Categoría</th><th>Tipo</th><th>Descripción</th><th>Fecha</th><th>Monto</th><th>Status</th></tr></thead>
        <tbody>${filaGastos}</tbody></table>
    </div>` : ""}
    ${gastosAbsorbidos.length > 0 ? `
    <div class="sec" style="margin-bottom:18px; border-color:#16a34a"><h3 style="color:#16a34a">🧾 Gastos Comprobados o a Crédito (Absorbidos por la Empresa - NO se descuentan)</h3>
        <table><thead><tr><th>#</th><th>Tipo</th><th>Descripción</th><th>Fecha</th><th>Monto</th></tr></thead>
        <tbody>${filaAbsorbidos}</tbody></table>
    </div>` : ""}
    ${liq.montoDescuentoPrestamo ? `
    <div class="sec" style="margin-bottom:18px"><h3>Descuento de Préstamo</h3>
        <div class="campo"><label>Folio préstamo</label><span>${liq.prestamoFolio || "-"}</span></div>
        <div class="campo"><label>Monto descontado</label><span style="color:red">-$${liq.montoDescuentoPrestamo.toLocaleString()}</span></div>
    </div>` : ""}
    ${(liq.bonoCarga || liq.bonoDescarga || liq.bonoManiobras || liq.bonoProductividad || liq.bonoUmbrales) ? `
    <div class="sec" style="margin-bottom:18px"><h3>Bonos y Extras</h3>
        ${liq.bonoCarga        ? `<div class="campo"><label>Bono camión cargado</label><span style="color:green">+$${liq.bonoCarga.toLocaleString()}</span></div>` : ""}
        ${liq.bonoDescarga     ? `<div class="campo"><label>Bono por descarga</label><span style="color:green">+$${liq.bonoDescarga.toLocaleString()}</span></div>` : ""}
        ${liq.bonoManiobras    ? `<div class="campo"><label>Bono maniobras</label><span style="color:green">+$${liq.bonoManiobras.toLocaleString()}</span></div>` : ""}
        ${liq.bonoProductividad? `<div class="campo"><label>Bono productividad</label><span style="color:green">+$${liq.bonoProductividad.toLocaleString()}</span></div>` : ""}
        ${liq.bonoUmbrales     ? `<div class="campo"><label>Bono por rendimiento (umbral)</label><span style="color:green">+$${liq.bonoUmbrales.toLocaleString()}</span></div>` : ""}
    </div>` : ""}
    <div class="total-box">
        <div class="total-row"><span>Ingreso base (${liq.esquemaPago})</span><span>$${(liq.totalIngreso || 0).toLocaleString()}</span></div>
        <div class="total-row"><span>Bonos y extras</span><span style="color:green">+$${(liq.totalExtras || 0).toLocaleString()}</span></div>
        <div class="total-row"><span>Deducciones (anticipos + gastos + préstamo)</span><span style="color:red">-$${(liq.totalDeducciones || 0).toLocaleString()}</span></div>
        <div class="total-final"><span>NETO A PAGAR AL OPERADOR</span><span>$${(liq.netoAPagar || 0).toLocaleString()}</span></div>
    </div>
    ${liq.notas ? `<div class="sec" style="margin-top:18px"><h3>Notas</h3><p>${liq.notas}</p></div>` : ""}
    ${liq.pagadaEn ? `
    <div class="sec" style="margin-top:18px; border-color:#16a34a"><h3 style="color:#16a34a">Datos de Pago</h3>
        <div class="campo"><label>Fecha de pago</label><span>${liq.fechaPago || "-"}</span></div>
        <div class="campo"><label>Forma de pago</label><span>${liq.formaPago || "-"}</span></div>
        ${liq.referenciaPago ? `<div class="campo"><label>Referencia</label><span>${liq.referenciaPago}</span></div>` : ""}
    </div>` : ""}
    <div class="footer">
        <div class="firma"><div class="linea"></div><p>Firma Operador</p><p style="font-weight:bold">${liq.driverNombre || ""}</p></div>
        <div class="firma"><div class="linea"></div><p>Firma Administración</p><p style="font-weight:bold">Veltrax Logistics</p></div>
    </div>
    </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
}

export default function LiquidacionesPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [liquidaciones, setLiquidaciones] = useState([]);
    const [viajes,        setViajes]        = useState([]);
    const [drivers,       setDrivers]       = useState([]);
    const [prestamos,     setPrestamos]     = useState([]); // préstamos activos del driver seleccionado
    const [showModal,     setShowModal]     = useState(false);
    const [editando,      setEditando]      = useState(null);
    const [form,          setForm]          = useState(emptyForm);
    const [loading,       setLoading]       = useState(false);
    const [gastosPorViaje, setGastosPorViaje] = useState([]);
    const [periodoPreview, setPeriodoPreview] = useState(null); // métricas + bonos de umbral para modo período
    const [formError,     setFormError]      = useState("");
    const [pendientes,    setPendientes]     = useState({ driverId: "", sinViaje: [], porAutorizar: [] }); // VID-K1

    // ── Pago al operador ──
    const [showPagoModal,     setShowPagoModal]     = useState(false);
    const [liquidacionActiva, setLiquidacionActiva] = useState(null);
    const [formPago,          setFormPago]          = useState({ fechaPago: "", formaPago: "Transferencia", referenciaPago: "" });
    const [loadingPago,       setLoadingPago]       = useState(false);

    // ── Ciclo (VID-M4) ──
    const [esAdmin]                             = useState(() => localStorage.getItem("role") === "ADMIN");
    const [cancelandoPago,    setCancelandoPago]    = useState(null);
    const [motivoCancelacion, setMotivoCancelacion] = useState("");
    const [errorCancelacion,  setErrorCancelacion]  = useState("");
    const [loadingCancelacion, setLoadingCancelacion] = useState(false);
    const [showVistaEsquema,  setShowVistaEsquema]  = useState(false); // VID-M1 E2
    // VID-M1 E3: la liquidación por esquema (nueva o editar), sus líneas, y los
    // avisos dentro de la pantalla en lugar de alertas del navegador (nota 2).
    const [esquemaModal,      setEsquemaModal]      = useState(null); // { liquidacion, driverInicial }
    const [lineasDe,          setLineasDe]          = useState(null);
    const [aviso,             setAviso]             = useState(null); // { tipo: "error" | "ok", texto }
    const [errorPago,         setErrorPago]         = useState("");

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [l, v, d] = await Promise.all([
                fetch(`${API}/liquidaciones`, { headers }).then(r => r.json()),
                fetch(`${API}/orders`, { headers }).then(r => r.json()),
                fetch(`${API}/drivers`, { headers }).then(r => r.json()),
            ]);
            setLiquidaciones(Array.isArray(l) ? l : []);
            setViajes(Array.isArray(v) ? v : []);
            setDrivers(Array.isArray(d) ? d : []);
        } catch (e) { console.error(e); }
    };

    const fetchGastos = async (orderId) => {
        try {
            const res  = await fetch(`${API}/gastos-viaje/viaje/${orderId}`, { headers });
            const data = await res.json();
            setGastosPorViaje(Array.isArray(data) ? data.filter(entraEnLiquidacion) : []);
        } catch (e) { console.error(e); }
    };

    const fetchPrestamosActivos = async (driverId) => {
        try {
            const res  = await fetch(`${API}/prestamos/driver/${driverId}/activos`, { headers });
            const data = await res.json();
            setPrestamos(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); setPrestamos([]); }
    };

    const fetchPreviewPeriodo = async (driverId, inicio, fin) => {
        try {
            const url = `${API}/liquidaciones/preview-periodo?driverId=${driverId}&fechaInicio=${inicio}&fechaFin=${fin}`;
            const res  = await fetch(url, { headers });
            const data = await res.json();
            setPeriodoPreview(data);
        } catch (e) { console.error(e); setPeriodoPreview(null); }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Llegada automática desde el panel de Viajes (?orderId=&driverId=) ──
    // Cuando el usuario da clic en "Generar Liquidación" dentro del detalle de
    // un viaje, aterriza aquí con el viaje y el operador ya preseleccionados.
    // Esto dispara fetchGastos automáticamente vía el useEffect de abajo, así
    // que los anticipos/gastos del viaje se desglosan solos en la vista previa.
    useEffect(() => {
        // VID-M1 (entrega 3): las nuevas son por esquema y semana: se abre con el operador.
        const orderIdParam  = searchParams.get("orderId");
        const driverIdParam = searchParams.get("driverId");
        if (orderIdParam) {
            setEsquemaModal({ liquidacion: null, driverInicial: driverIdParam || "" });
            // Limpiamos los query params para que un refresh no reabra el modal solo
            setSearchParams({}, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (form.modo === "VIAJE" && form.orderId) fetchGastos(form.orderId);
        else setGastosPorViaje([]);
    }, [form.orderId, form.modo]);

    useEffect(() => {
        if (form.driverId) fetchPrestamosActivos(form.driverId);
        else { setPrestamos([]); }
    }, [form.driverId]);

    // VID-K1: los anticipos del operador que todavía no se descuentan: los
    // autorizados que no están en ningún viaje, hasta ligarlos, y los por autorizar
    // ya ligados a sus viajes, hasta autorizarlos. El formulario los avisa.
    useEffect(() => {
        if (!form.driverId) return;
        let vigente = true;
        const sesion = localStorage.getItem("token");
        const lista = (cuales) => fetch(`${API}/liquidaciones/driver/${form.driverId}/${cuales}`, { headers: sesion ? { Authorization: `Bearer ${sesion}` } : {} })
            .then(res => (res.ok ? res.json() : []))
            .catch(() => [])
            .then(data => (Array.isArray(data) ? data : []));
        Promise.all([lista("anticipos-sin-viaje"), lista("anticipos-por-autorizar")]).then(([sinViaje, porAutorizar]) => {
            if (vigente) setPendientes({ driverId: form.driverId, sinViaje, porAutorizar });
        });
        return () => { vigente = false; };
    }, [form.driverId]);
    const anticiposSinViaje     = pendientes.driverId === form.driverId ? pendientes.sinViaje : [];
    const anticiposPorAutorizar = pendientes.driverId === form.driverId ? pendientes.porAutorizar : [];

    useEffect(() => {
        if (form.modo === "PERIODO" && form.driverId && form.periodoInicio && form.periodoFin) {
            fetchPreviewPeriodo(form.driverId, form.periodoInicio, form.periodoFin);
        } else {
            setPeriodoPreview(null);
        }
    }, [form.modo, form.driverId, form.periodoInicio, form.periodoFin]);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

    const openNew = () => {
        setAviso(null);
        setEsquemaModal({ liquidacion: null, driverInicial: "" });
    };

    const guardadaPorEsquema = (data) => {
        setEsquemaModal(null);
        const avisos = data?.avisos || [];
        setAviso({ tipo: "ok", texto: `${folioDe(data)} guardada con neto de ${conSigno(data?.netoAPagar)}.${avisos.length ? ` Avisos: ${avisos.map(a => a.texto).join(" ")}` : ""}` });
        fetchAll();
    };

    const openEdit = (l) => {
        setAviso(null);
        if (l.modo === "ESQUEMA") {
            setEsquemaModal({ liquidacion: l, driverInicial: "" });
            return;
        }
        setEditando(l.id);
        setForm({ ...emptyForm, ...l, modo: l.modo || "VIAJE" });
        setFormError("");
        setShowModal(true);
    };

    const validarFormulario = () => {
        if (!form.driverId) return "Selecciona un operador.";

        if (form.modo === "VIAJE") {
            if (!form.orderId) return "Selecciona un viaje.";
        } else {
            if (!form.periodoInicio || !form.periodoFin) return "Selecciona la fecha de inicio y fin del período.";
            if (form.periodoInicio > form.periodoFin) return "La fecha de inicio no puede ser posterior a la fecha de fin.";
        }

        switch (form.esquemaPago) {
            case "POR_KM":
                if (!form.kmRecorridos || Number(form.kmRecorridos) <= 0) return "Ingresa los kilómetros recorridos (mayor a 0).";
                if (!form.tarifaKm || Number(form.tarifaKm) <= 0) return "Ingresa la tarifa por kilómetro (mayor a 0).";
                break;
            case "POR_MILLA":
                if (!form.millasRecorridas || Number(form.millasRecorridas) <= 0) return "Ingresa las millas recorridas (mayor a 0).";
                if (!form.tarifaMilla || Number(form.tarifaMilla) <= 0) return "Ingresa la tarifa por milla (mayor a 0).";
                break;
            case "PORCENTAJE":
                if (!form.porcentajeFlete || Number(form.porcentajeFlete) <= 0) return "Ingresa el porcentaje del flete (mayor a 0).";
                break;
            case "VIAJE_FIJO":
                if (form.modo !== "VIAJE") return "El esquema de viaje fijo solo aplica en modo Por Viaje.";
                if (!form.montoFijo || Number(form.montoFijo) <= 0) return "Ingresa el monto fijo acordado (mayor a 0).";
                break;
            default:
                break;
        }

        if (form.prestamoId && (!form.montoDescuentoPrestamo || Number(form.montoDescuentoPrestamo) <= 0)) {
            return "Seleccionaste un préstamo: ingresa el monto a descontar (mayor a 0).";
        }

        return null; // sin errores
    };

    const handleSubmit = async () => {
        const error = validarFormulario();
        if (error) {
            setFormError(error);
            return;
        }
        setFormError("");
        setLoading(true);
        try {
            const body = {
                ...form,
                orderId:          form.orderId ? Number(form.orderId) : null,
                driverId:         form.driverId ? Number(form.driverId) : null,
                kmRecorridos:     form.kmRecorridos ? Number(form.kmRecorridos) : null,
                tarifaKm:         form.tarifaKm ? Number(form.tarifaKm) : null,
                millasRecorridas: form.millasRecorridas ? Number(form.millasRecorridas) : null,
                tarifaMilla:      form.tarifaMilla ? Number(form.tarifaMilla) : null,
                porcentajeFlete:  form.porcentajeFlete ? Number(form.porcentajeFlete) : null,
                montoFijo:        form.montoFijo ? Number(form.montoFijo) : null,
                bonoCarga:        form.bonoCarga ? Number(form.bonoCarga) : null,
                bonoDescarga:     form.bonoDescarga ? Number(form.bonoDescarga) : null,
                bonoManiobras:    form.bonoManiobras ? Number(form.bonoManiobras) : null,
                bonoProductividad:form.bonoProductividad ? Number(form.bonoProductividad) : null,
                prestamoId:       form.prestamoId ? Number(form.prestamoId) : null,
                montoDescuentoPrestamo: form.montoDescuentoPrestamo ? Number(form.montoDescuentoPrestamo) : null,
                bonoUmbrales:     form.modo === "PERIODO" && periodoPreview ? periodoPreview.bonoTotal : null,
            };
            const url    = editando ? `${API}/liquidaciones/${editando}` : `${API}/liquidaciones`;
            const method = editando ? "PUT" : "POST";
            const res    = await fetch(url, { method, headers, body: JSON.stringify(body) });
            if (!res.ok) {
                setFormError(rechazo(res, await res.json().catch(() => null)));
                return;
            }
            setShowModal(false);
            fetchAll();
        } catch (e) {
            console.error(e);
            setFormError("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar esta liquidación?")) return;
        setAviso(null);
        try {
            const res = await fetch(`${API}/liquidaciones/${id}`, { method: "DELETE", headers });
            if (!res.ok) setAviso({ tipo: "error", texto: rechazo(res, await res.json().catch(() => null)) });
            fetchAll();
        } catch (e) {
            console.error(e);
            setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Intenta de nuevo." });
        }
    };

    // VID-M4: cerrar, reabrir, autorizar y desautorizar. Al cerrar, el servidor
    // recalcula; si el neto cambió, se avisa para que no pase inadvertido.
    const accionCiclo = async (l, accion, pregunta) => {
        if (!confirm(pregunta)) return;
        setAviso(null);
        try {
            const res  = await fetch(`${API}/liquidaciones/${l.id}/${accion}`, { method: "PUT", headers });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setAviso({ tipo: "error", texto: rechazo(res, data) });
            } else if (accion === "cerrar" && Math.abs((data?.netoAPagar || 0) - (l.netoAPagar || 0)) >= 0.005) {
                setAviso({ tipo: "ok", texto: `${folioDe(l)} cerrada. Al recalcular, el neto pasó de ${conSigno(l.netoAPagar)} a ${conSigno(data?.netoAPagar)}.` });
            }
            fetchAll();
        } catch (e) {
            console.error(e);
            setAviso({ tipo: "error", texto: "No se pudo conectar con el servidor. Intenta de nuevo." });
        }
    };

    const abrirCancelarPago = (l) => {
        setCancelandoPago(l);
        setMotivoCancelacion("");
        setErrorCancelacion("");
    };

    const confirmarCancelarPago = async () => {
        setLoadingCancelacion(true);
        setErrorCancelacion("");
        try {
            const res = await fetch(`${API}/liquidaciones/${cancelandoPago.id}/cancelar-pago`, {
                method: "PUT", headers, body: JSON.stringify({ motivo: motivoCancelacion })
            });
            if (!res.ok) {
                setErrorCancelacion(rechazo(res, await res.json().catch(() => null)));
                return;
            }
            setCancelandoPago(null);
            fetchAll();
        } catch (e) {
            console.error(e);
            setErrorCancelacion("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setLoadingCancelacion(false);
        }
    };

    const abrirPago = (liq) => {
        setLiquidacionActiva(liq);
        setFormPago({ fechaPago: hoyMexico(), formaPago: "Transferencia", referenciaPago: "" });
        setErrorPago("");
        setShowPagoModal(true);
    };

    const setPagoField = (f) => (e) => setFormPago(prev => ({ ...prev, [f]: e.target.value }));

    const registrarPagoOperador = async () => {
        if (!liquidacionActiva) return;
        setLoadingPago(true);
        setErrorPago("");
        try {
            const res = await fetch(`${API}/liquidaciones/${liquidacionActiva.id}/pagar`, {
                method: "POST", headers, body: JSON.stringify(formPago)
            });
            if (res.ok) {
                setShowPagoModal(false);
                fetchAll();
            } else {
                setErrorPago(rechazo(res, await res.json().catch(() => null)));
            }
        } catch (e) {
            console.error(e);
            setErrorPago("No se pudo conectar con el servidor. Intenta de nuevo.");
        }
        setLoadingPago(false);
    };

    const handlePDF = async (liq) => {
        if (liq.modo === "ESQUEMA") {
            generarPDFEsquema(liq);
            return;
        }
        let gastos = [];
        if (liq.modo !== "PERIODO" && liq.orderId) {
            const res  = await fetch(`${API}/gastos-viaje/viaje/${liq.orderId}`, { headers });
            const data = await res.json();
            gastos = Array.isArray(data) ? data.filter(entraEnLiquidacion) : [];
        }
        generarPDFLiquidacion(liq, gastos);
    };

    // Calcular preview en tiempo real
    const viajeSeleccionado = viajes.find(v => String(v.id) === String(form.orderId));
    const prestamoSeleccionado = prestamos.find(p => String(p.id) === String(form.prestamoId));

    let previewIngreso = 0;
    if (form.modo === "PERIODO") {
        const ingresoViajesPeriodo = periodoPreview?.ingresoTotal || 0;
        if (form.esquemaPago === "POR_KM" && form.kmRecorridos && form.tarifaKm)
            previewIngreso = Number(form.kmRecorridos) * Number(form.tarifaKm);
        else if (form.esquemaPago === "POR_MILLA" && form.millasRecorridas && form.tarifaMilla)
            previewIngreso = Number(form.millasRecorridas) * Number(form.tarifaMilla);
        else if (form.esquemaPago === "PORCENTAJE" && form.porcentajeFlete)
            previewIngreso = ingresoViajesPeriodo * (Number(form.porcentajeFlete) / 100);
        else
            previewIngreso = ingresoViajesPeriodo;
    } else {
        if (form.esquemaPago === "POR_KM" && form.kmRecorridos && form.tarifaKm)
            previewIngreso = Number(form.kmRecorridos) * Number(form.tarifaKm);
        else if (form.esquemaPago === "POR_MILLA" && form.millasRecorridas && form.tarifaMilla)
            previewIngreso = Number(form.millasRecorridas) * Number(form.tarifaMilla);
        else if (form.esquemaPago === "PORCENTAJE" && form.porcentajeFlete && viajeSeleccionado?.cost)
            previewIngreso = viajeSeleccionado.cost * (Number(form.porcentajeFlete) / 100);
        else if (form.esquemaPago === "VIAJE_FIJO" && form.montoFijo)
            previewIngreso = Number(form.montoFijo);
    }

    const previewBonoUmbral = form.modo === "PERIODO" && periodoPreview ? (periodoPreview.bonoTotal || 0) : 0;
    const previewExtras = (Number(form.bonoCarga) || 0) + (Number(form.bonoDescarga) || 0) +
        (Number(form.bonoManiobras) || 0) + (Number(form.bonoProductividad) || 0) + previewBonoUmbral;

    // Regla: Anticipos siempre se descuentan (ya se entregó el efectivo).
    // Gastos con ticket comprobado NO se descuentan (la empresa los absorbe).
    // Gastos sin ticket SÍ se descuentan (se le cobran al operador).
    const previewDeduccionesGastos = form.modo === "PERIODO" ? 0 :
        gastosPorViaje.reduce((s, g) => s + (seDeduceGasto(g) ? (g.monto || 0) : 0), 0);
    const totalAbsorbidoEmpresa = form.modo === "PERIODO" ? 0 :
        gastosPorViaje.reduce((s, g) => s + (!seDeduceGasto(g) ? (g.monto || 0) : 0), 0);
    const gastosADeducir = gastosPorViaje.filter(seDeduceGasto).length;
    const previewDescuentoPrestamo = Number(form.montoDescuentoPrestamo) || 0;
    const previewDeducciones = previewDeduccionesGastos + previewDescuentoPrestamo;
    const previewNeto = previewIngreso + previewExtras - previewDeducciones;

    const autorizadas = liquidaciones.filter(l => l.autorizadaEn && !l.pagadaEn).length;
    const pagadas     = liquidaciones.filter(l => l.pagadaEn).length;
    const porPagar    = liquidaciones.filter(l => !l.pagadaEn).reduce((s, l) => s + (l.netoAPagar || 0), 0);

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">LIQUIDACIONES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Control de pagos a operadores</p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-end">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowVistaEsquema(true)}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-purple-500/10 border border-purple-400/30 text-purple-300 font-bold text-lg hover:bg-purple-500/20 transition-all">
                            <FaCalendarAlt /> Vista previa (esquema)
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                            <FaPlus /> Nueva Liquidación
                        </motion.button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Total",     value: liquidaciones.length, color: "text-cyan-400",   border: "border-cyan-500/20" },
                        { label: "Autorizadas", value: autorizadas,        color: "text-blue-400",   border: "border-blue-500/20" },
                        { label: "Pagadas",   value: pagadas,              color: "text-green-400",  border: "border-green-500/20" },
                        { label: "Por pagar", value: `$${porPagar.toLocaleString()}`, color: "text-yellow-400", border: "border-yellow-500/20" },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`rounded-3xl bg-white/5 border ${s.border} backdrop-blur-xl p-6 flex items-center gap-5`}>
                            <FaMoneyBillWave className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-3xl font-black ${s.color}`}>{s.value}</h2></div>
                        </motion.div>
                    ))}
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaMoneyBillWave /> Liquidaciones Registradas</h2>
                    {aviso && (
                        <div className={`mb-6 px-5 py-3 rounded-xl text-sm font-semibold flex justify-between items-start gap-4 border ${
                            aviso.tipo === "error"
                                ? "bg-red-500/10 border-red-400/30 text-red-300"
                                : "bg-cyan-500/10 border-cyan-400/30 text-cyan-200"}`}>
                            <span>{aviso.texto}</span>
                            <button onClick={() => setAviso(null)} className="text-gray-400 hover:text-white flex-shrink-0" title="Cerrar aviso"><FaTimes /></button>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio", "Operador", "Modo", "Viaje/Período", "Cliente", "Esquema", "Ingreso", "Deducciones", "Neto a Pagar", "Situación", "Autorizada", "Pagada", "Fecha de pago", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {liquidaciones.length === 0 && (
                                    <tr><td colSpan={14} className="py-10 text-center text-gray-500">No hay liquidaciones registradas</td></tr>
                                )}
                                {liquidaciones.map((l, i) => (
                                    <motion.tr key={l.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300 whitespace-nowrap">{folioDe(l)}</td>
                                        <td className="py-4 pr-4 font-bold">{l.driverNombre || "-"}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${COLOR_MODO[l.modo] || COLOR_MODO.VIAJE}`}>
                                                {TEXTO_MODO[l.modo] || "Viaje"}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">
                                            {l.modo === "PERIODO" || l.modo === "ESQUEMA" ? `${l.periodoInicio || "-"} → ${l.periodoFin || "-"}` : (l.orderFolio || `#${l.orderId || "-"}`)}
                                        </td>
                                        <td className="py-4 pr-4 text-gray-300">{l.clienteNombre || "-"}</td>
                                        <td className="py-4 pr-4">
                                            <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-bold">
                                                {l.modo === "ESQUEMA" ? (l.esquemaNombre || "-") : l.esquemaPago}
                                            </span>
                                        </td>
                                        {/* VID-M1 (entrega 4): el ingreso suma los bonos, para que Ingreso − Deducciones = Neto. */}
                                        <td className="py-4 pr-4 text-green-300 font-bold">${((l.totalIngreso || 0) + (l.totalExtras || 0)).toLocaleString()}</td>
                                        <td className="py-4 pr-4 text-red-300">{conSigno(-(l.totalDeducciones || 0))}</td>
                                        <td className={`py-4 pr-4 font-black text-lg ${l.netoAPagar < 0 ? "text-red-300" : "text-yellow-300"}`}>{conSigno(l.netoAPagar)}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                                l.status === "CERRADA"
                                                    ? "text-cyan-300 bg-cyan-500/10 border-cyan-400/30"
                                                    : "text-yellow-300 bg-yellow-500/10 border-yellow-400/30"}`}>
                                                {TEXTO_ETAPA[l.status] || l.status}
                                            </span>
                                        </td>
                                        {/* Una pagada de antes de VID-M4 puede no tener autorización: no se inventa. */}
                                        <td className="py-4 pr-4"><QuienYCuando por={l.autorizadaPor} en={l.autorizadaEn} sinDato={l.pagadaEn ? "No consta" : "-"} /></td>
                                        <td className="py-4 pr-4"><QuienYCuando por={l.pagadaPor} en={l.pagadaEn} /></td>
                                        <td className="py-4 pr-4 text-gray-300 text-sm whitespace-nowrap">{l.fechaPago || "-"}</td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                {l.modo === "ESQUEMA" && (
                                                    <button onClick={() => setLineasDe(l)} className="p-3 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all" title="Líneas"><FaListUl /></button>
                                                )}
                                                {l.status === "ABIERTA" && (
                                                    <button onClick={() => accionCiclo(l, "cerrar", l.modo === "ESQUEMA"
                                                        ? `¿Cerrar ${folioDe(l)}? Se recalcula por última vez y sus líneas quedan fijas. Hasta reabrirla no se podrán cambiar los trayectos, la evidencia, el estatus, los gastos ni los anticipos de sus viajes.`
                                                        : `¿Cerrar ${folioDe(l)}? Se recalcula con los gastos y anticipos actuales. Hasta reabrirla no se podrá editar ni cambiar los trayectos, la evidencia, el estatus, los gastos ni los anticipos de sus viajes.`)} className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20 transition-all" title="Cerrar"><FaLock /></button>
                                                )}
                                                {l.status === "CERRADA" && !l.autorizadaEn && !l.pagadaEn && (
                                                    <button onClick={() => accionCiclo(l, "reabrir", `¿Reabrir ${folioDe(l)}?`)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-300 hover:bg-yellow-500/20 transition-all" title="Reabrir"><FaLockOpen /></button>
                                                )}
                                                {esAdmin && l.status === "CERRADA" && !l.autorizadaEn && !l.pagadaEn && (
                                                    <button onClick={() => accionCiclo(l, "autorizar", `¿Autorizar ${folioDe(l)} por $${(l.netoAPagar || 0).toLocaleString()}?`)} className="p-3 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all" title="Autorizar"><FaCheckCircle /></button>
                                                )}
                                                {esAdmin && l.autorizadaEn && !l.pagadaEn && (
                                                    <button onClick={() => accionCiclo(l, "desautorizar", `¿Desautorizar ${folioDe(l)}?`)} className="p-3 rounded-xl bg-orange-500/10 border border-orange-400/20 text-orange-300 hover:bg-orange-500/20 transition-all" title="Desautorizar"><FaBan /></button>
                                                )}
                                                {l.autorizadaEn && !l.pagadaEn && l.netoAPagar >= 0 && (
                                                    <button onClick={() => abrirPago(l)} className="p-3 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all" title="Registrar pago al operador"><FaHandHoldingUsd /></button>
                                                )}
                                                {l.autorizadaEn && !l.pagadaEn && l.netoAPagar < 0 && (
                                                    <button disabled className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed" title="Neto negativo: no se paga hasta que exista el saldo del operador"><FaHandHoldingUsd /></button>
                                                )}
                                                {esAdmin && l.pagadaEn && (
                                                    <button onClick={() => abrirCancelarPago(l)} className="p-3 rounded-xl bg-orange-500/10 border border-orange-400/20 text-orange-300 hover:bg-orange-500/20 transition-all" title="Cancelar pago"><FaUndo /></button>
                                                )}
                                                <button onClick={() => handlePDF(l)} className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-400 hover:bg-blue-500/20 transition-all" title="PDF"><FaFilePdf /></button>
                                                {l.status === "ABIERTA" && (
                                                    <>
                                                        <button onClick={() => openEdit(l)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all" title="Editar"><FaEdit /></button>
                                                        <button onClick={() => handleDelete(l.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all" title="Eliminar"><FaTrash /></button>
                                                    </>
                                                )}
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
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-3xl font-black text-cyan-300">Editar Liquidación ({form.modo === "PERIODO" ? "por período" : "por viaje"}, de antes)</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                    {/* VID-M1 (entrega 3): solo se editan las de antes; su modo no cambia. */}
                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                                        {form.modo === "PERIODO" ? "Datos del período" : "Datos del viaje"}
                                    </p>

                                    {form.modo === "VIAJE" ? (
                                        <Field label="Viaje" span2>
                                            <select value={form.orderId} onChange={set("orderId")} className={selectCls}>
                                                <option value="">Seleccionar viaje...</option>
                                                {viajes.map(v => <option key={v.id} value={v.id}>{etiquetaViaje(v)}</option>)}
                                            </select>
                                        </Field>
                                    ) : (
                                        <>
                                            <Field label="Desde">
                                                <input type="date" value={form.periodoInicio} onChange={set("periodoInicio")} className={inputCls} />
                                            </Field>
                                            <Field label="Hasta">
                                                <input type="date" value={form.periodoFin} onChange={set("periodoFin")} className={inputCls} />
                                            </Field>
                                        </>
                                    )}

                                    <Field label="Operador" span2>
                                        <select value={form.driverId} onChange={set("driverId")} className={selectCls}>
                                            <option value="">Seleccionar operador...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                                        </select>
                                    </Field>

                                    {/* VID-K1: anticipos autorizados sin viaje: todavía no se descuentan */}
                                    {anticiposSinViaje.length > 0 && (
                                        <div className="col-span-1 sm:col-span-2 px-4 py-3 rounded-xl text-sm bg-yellow-500/10 border border-yellow-400/30 text-yellow-300">
                                            <p className="font-bold">Este operador tiene anticipos autorizados sin viaje. No se descuentan hasta ligarlos a un viaje en Anticipos:</p>
                                            <ul className="mt-1 list-disc pl-5">
                                                {anticiposSinViaje.map(a => <li key={a.id}>{a.folio}: ${(a.monto || 0).toLocaleString()}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {/* VID-K1: anticipos por autorizar ya ligados a viajes del operador: tampoco se descuentan */}
                                    {anticiposPorAutorizar.length > 0 && (
                                        <div className="col-span-1 sm:col-span-2 px-4 py-3 rounded-xl text-sm bg-yellow-500/10 border border-yellow-400/30 text-yellow-300">
                                            <p className="font-bold">Hay anticipos por autorizar en viajes de este operador. No se descuentan hasta autorizarlos en Anticipos:</p>
                                            <ul className="mt-1 list-disc pl-5">
                                                {anticiposPorAutorizar.map(a => <li key={a.id}>{a.folio}: ${(a.monto || 0).toLocaleString()} · {a.viaje}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {form.modo === "PERIODO" && periodoPreview && (
                                        <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-400/20">
                                            <div className="text-center">
                                                <p className="text-gray-400 text-xs">Viajes en período</p>
                                                <p className="text-purple-300 font-black text-xl">{periodoPreview.numViajes}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-400 text-xs">Ingreso generado</p>
                                                <p className="text-green-300 font-black text-xl">${(periodoPreview.ingresoTotal || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-400 text-xs">Bono por rendimiento</p>
                                                <p className="text-yellow-300 font-black text-xl">+${(periodoPreview.bonoTotal || 0).toLocaleString()}</p>
                                            </div>
                                            {periodoPreview.umbralesAplicados?.length > 0 && (
                                                <div className="col-span-3 mt-2 space-y-1">
                                                    {periodoPreview.umbralesAplicados.map(u => (
                                                        <div key={u.umbralId} className="flex items-center gap-2 text-xs text-gray-300">
                                                            <FaTrophy className="text-yellow-400 flex-shrink-0" />
                                                            <span>{u.nombre}: +${u.bonoCalculado.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Esquema de pago</p>
                                    <Field label="Tipo de esquema" span2>
                                        <select value={form.esquemaPago} onChange={set("esquemaPago")} className={selectCls}>
                                            {form.modo === "VIAJE" && <option value="VIAJE_FIJO">Viaje fijo (precio acordado)</option>}
                                            <option value="POR_KM">Por kilómetro recorrido</option>
                                            <option value="POR_MILLA">Por milla recorrida</option>
                                            <option value="PORCENTAJE">Porcentaje del flete</option>
                                            {form.modo === "PERIODO" && <option value="SUMA_VIAJES">Suma de fletes del período</option>}
                                        </select>
                                    </Field>

                                    {form.esquemaPago === "VIAJE_FIJO" && form.modo === "VIAJE" && (
                                        <Field label="Monto fijo acordado ($)" span2>
                                            <input type="number" value={form.montoFijo} onChange={set("montoFijo")} placeholder="0.00" className={inputCls} />
                                        </Field>
                                    )}
                                    {form.esquemaPago === "POR_KM" && (<>
                                        <Field label="Kilómetros recorridos">
                                            <input type="number" value={form.kmRecorridos} onChange={set("kmRecorridos")} placeholder="850" className={inputCls} />
                                        </Field>
                                        <Field label="Tarifa por km ($)">
                                            <input type="number" value={form.tarifaKm} onChange={set("tarifaKm")} placeholder="8.50" className={inputCls} />
                                        </Field>
                                    </>)}
                                    {form.esquemaPago === "POR_MILLA" && (<>
                                        <Field label="Millas recorridas">
                                            <input type="number" value={form.millasRecorridas} onChange={set("millasRecorridas")} placeholder="528" className={inputCls} />
                                        </Field>
                                        <Field label="Tarifa por milla ($)">
                                            <input type="number" value={form.tarifaMilla} onChange={set("tarifaMilla")} placeholder="13.50" className={inputCls} />
                                        </Field>
                                    </>)}
                                    {form.esquemaPago === "PORCENTAJE" && (
                                        <Field label="Porcentaje del flete (%)" span2>
                                            <input type="number" value={form.porcentajeFlete} onChange={set("porcentajeFlete")} placeholder="12" className={inputCls} />
                                            {form.modo === "VIAJE" && viajeSeleccionado?.cost && <p className="text-gray-500 text-xs mt-1">Flete: ${viajeSeleccionado.cost.toLocaleString()}</p>}
                                            {form.modo === "PERIODO" && periodoPreview && <p className="text-gray-500 text-xs mt-1">Flete total del período: ${(periodoPreview.ingresoTotal || 0).toLocaleString()}</p>}
                                        </Field>
                                    )}

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Bonos y extras manuales</p>
                                    <Field label="Bono camión cargado ($)">
                                        <input type="number" value={form.bonoCarga} onChange={set("bonoCarga")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="Bono por descarga ($)">
                                        <input type="number" value={form.bonoDescarga} onChange={set("bonoDescarga")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="Bono maniobras ($)">
                                        <input type="number" value={form.bonoManiobras} onChange={set("bonoManiobras")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="Bono productividad ($)">
                                        <input type="number" value={form.bonoProductividad} onChange={set("bonoProductividad")} placeholder="0.00" className={inputCls} />
                                    </Field>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2 flex items-center gap-2">
                                        <FaHandHoldingUsd /> Descuento de préstamo
                                    </p>
                                    <Field label="Préstamo activo del operador" span2>
                                        <select value={form.prestamoId} onChange={set("prestamoId")} className={selectCls} disabled={!form.driverId}>
                                            <option value="">Sin préstamo / no aplicar</option>
                                            {prestamos.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.folio} - Saldo: ${(p.saldoPendiente || 0).toLocaleString()} ({p.motivo || "sin motivo"})
                                                </option>
                                            ))}
                                        </select>
                                        {form.driverId && prestamos.length === 0 && (
                                            <p className="text-gray-500 text-xs mt-1">Este operador no tiene préstamos activos.</p>
                                        )}
                                    </Field>
                                    {form.prestamoId && (
                                        <Field label="Monto a descontar en esta liquidación ($)" span2>
                                            <input type="number" value={form.montoDescuentoPrestamo} onChange={set("montoDescuentoPrestamo")} placeholder="0.00" className={inputCls} />
                                            {prestamoSeleccionado && (
                                                <p className="text-gray-500 text-xs mt-1">Saldo pendiente del préstamo: ${(prestamoSeleccionado.saldoPendiente || 0).toLocaleString()}</p>
                                            )}
                                        </Field>
                                    )}

                                    <Field label="Fecha de liquidación">
                                        <input type="date" value={form.fechaLiquidacion} onChange={set("fechaLiquidacion")} className={inputCls} />
                                    </Field>
                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={2} placeholder="Observaciones..." className={inputCls + " resize-none"} />
                                    </Field>
                                </div>

                                {/* Preview de cálculo */}
                                <div className="mt-6 p-5 rounded-2xl bg-cyan-500/5 border border-cyan-400/20">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Vista previa de liquidación</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Ingreso base ({form.esquemaPago})</span>
                                            <span className="text-green-300 font-bold">${previewIngreso.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Bonos y extras{previewBonoUmbral > 0 ? " (incluye rendimiento)" : ""}</span>
                                            <span className="text-green-300">+${previewExtras.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">
                                                Deducciones {form.modo === "VIAJE" ? `(${gastosADeducir} ${gastosADeducir === 1 ? "gasto" : "gastos"}` : "(gastos"}
                                                {previewDescuentoPrestamo > 0 ? " + préstamo)" : ")"}
                                            </span>
                                            <span className="text-red-300">-${previewDeducciones.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-cyan-400/20 pt-2 mt-2">
                                            <span className="text-white font-bold">NETO A PAGAR</span>
                                            <span className="text-yellow-300 font-black text-xl">${previewNeto.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {form.modo === "VIAJE" && gastosPorViaje.length > 0 && (
                                        <div className="mt-3 space-y-1">
                                            <p className="text-gray-500 text-xs font-bold uppercase">Gastos del viaje:</p>
                                            {gastosPorViaje.map(g => {
                                                const deduce = seDeduceGasto(g);
                                                return (
                                                    <div key={g.id} className="flex justify-between items-center text-xs text-gray-400">
                                                        <span className="flex items-center gap-2">
                                                            {g.tipo}{g.descripcion ? ` - ${g.descripcion}` : ""}
                                                            {g.categoria !== "Anticipo" && (
                                                                g.comprobado
                                                                    ? <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] font-bold">🧾 comprobado</span>
                                                                    : <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">sin comprobar</span>
                                                            )}
                                                            {g.aCredito && <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">a crédito</span>}
                                                        </span>
                                                        <span className={deduce ? "text-red-300" : "text-green-300"}>
                                                            {deduce ? `-$${(g.monto || 0).toLocaleString()}` : "absorbido por empresa"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {totalAbsorbidoEmpresa > 0 && (
                                                <p className="text-green-400 text-xs pt-1">
                                                    La empresa absorbe ${totalAbsorbidoEmpresa.toLocaleString()} en gastos comprobados o a crédito.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {formError && (
                                <div className="px-8 pb-2 flex-shrink-0">
                                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-semibold">
                                        <FaTimes className="flex-shrink-0" /> {formError}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Liquidación"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL CANCELAR PAGO (VID-M4) */}
            <AnimatePresence>
                {cancelandoPago && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-orange-400/20 rounded-3xl w-full max-w-md flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-orange-300">Cancelar Pago</h2>
                                    <p className="text-gray-400 text-sm mt-1">{folioDe(cancelandoPago)} - {cancelandoPago.driverNombre}</p>
                                </div>
                                <button onClick={() => setCancelandoPago(null)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>

                            <div className="px-6 pt-5">
                                <p className="text-gray-400 text-sm mb-4">
                                    {cancelandoPago.autorizadaEn
                                        ? "La liquidación regresa a autorizada y se quitan los datos del pago; quedan en la bitácora."
                                        : "Esta liquidación no tiene autorización registrada: regresa a cerrada, para autorizarla o reabrirla. Los datos del pago se quitan y quedan en la bitácora."}
                                </p>
                                <Field label="Motivo de la cancelación *">
                                    <textarea value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} maxLength={200} rows={3} className={inputCls + " resize-none"} />
                                </Field>
                                {errorCancelacion && (
                                    <div className="mt-4 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-400/30 text-red-300">{errorCancelacion}</div>
                                )}
                            </div>

                            <div className="flex gap-4 p-6">
                                <button onClick={() => setCancelandoPago(null)}
                                    className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Volver</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={confirmarCancelarPago} disabled={loadingCancelacion}
                                    className="flex-1 py-3 rounded-2xl bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2">
                                    <FaUndo /> {loadingCancelacion ? "Cancelando..." : "Cancelar Pago"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LIQUIDACIÓN POR ESQUEMA (VID-M1 E3): nueva o editar una abierta */}
            <AnimatePresence>
                {esquemaModal && (
                    <LiquidacionEsquemaModal drivers={drivers} liquidacion={esquemaModal.liquidacion}
                        driverInicial={esquemaModal.driverInicial}
                        onClose={() => setEsquemaModal(null)} onGuardada={guardadaPorEsquema} />
                )}
            </AnimatePresence>

            {/* LÍNEAS DE UNA LIQUIDACIÓN POR ESQUEMA (VID-M1 E3) */}
            <AnimatePresence>
                {lineasDe && <LineasLiquidacion liquidacion={lineasDe} onClose={() => setLineasDe(null)} onCambio={fetchAll} />}
            </AnimatePresence>

            {/* VISTA PREVIA CON EL ESQUEMA DE PAGO (VID-M1 E2): no guarda nada */}
            <AnimatePresence>
                {showVistaEsquema && <VistaPreviaEsquema drivers={drivers} onClose={() => setShowVistaEsquema(false)} />}
            </AnimatePresence>

            {/* MODAL REGISTRAR PAGO AL OPERADOR */}
            <AnimatePresence>
                {showPagoModal && liquidacionActiva && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-green-400/20 rounded-3xl w-full max-w-md flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-green-300">Registrar Pago</h2>
                                    <p className="text-gray-400 text-sm mt-1">{liquidacionActiva.folio} - {liquidacionActiva.driverNombre}</p>
                                </div>
                                <button onClick={() => setShowPagoModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>

                            <div className="mx-6 my-5 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-400/20 text-center">
                                <p className="text-gray-400 text-xs uppercase font-bold">Neto a pagar</p>
                                <p className="text-yellow-300 font-black text-3xl">${(liquidacionActiva.netoAPagar || 0).toLocaleString()}</p>
                            </div>
                            {errorPago && (
                                <div className="mx-6 mb-4 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-400/30 text-red-300">{errorPago}</div>
                            )}

                            <div className="px-6 space-y-4">
                                <Field label="Fecha de pago">
                                    <input type="date" value={formPago.fechaPago} onChange={setPagoField("fechaPago")} className={inputCls} />
                                </Field>
                                <Field label="Forma de pago">
                                    <select value={formPago.formaPago} onChange={setPagoField("formaPago")} className={selectCls}>
                                        <option>Transferencia</option>
                                        <option>Efectivo</option>
                                        <option>Cheque</option>
                                        <option>Depósito</option>
                                    </select>
                                </Field>
                                <Field label="Referencia / No. de transferencia">
                                    <input value={formPago.referenciaPago} onChange={setPagoField("referenciaPago")} placeholder="REF-000001" className={inputCls} />
                                </Field>
                            </div>

                            <div className="flex gap-4 p-6 pt-6">
                                <button onClick={() => setShowPagoModal(false)}
                                    className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={registrarPagoOperador} disabled={loadingPago}
                                    className="flex-1 py-3 rounded-2xl bg-green-500/20 border border-green-400/30 text-green-300 font-bold hover:bg-green-500/30 transition-all flex items-center justify-center gap-2">
                                    <FaCheck /> {loadingPago ? "Registrando..." : "Confirmar Pago"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}









