import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaMoneyBillWave, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck, FaFilePdf, FaTruck, FaCheckCircle, FaHandHoldingUsd, FaTrophy, FaCalendarAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const emptyForm = {
    modo: "VIAJE", // VIAJE | PERIODO
    orderId: "", driverId: "", esquemaPago: "VIAJE_FIJO",
    periodoInicio: "", periodoFin: "",
    kmRecorridos: "", tarifaKm: "",
    millasRecorridas: "", tarifaMilla: "",
    porcentajeFlete: "", montoFijo: "",
    bonoCarga: "", bonoDescarga: "", bonoManiobras: "", bonoProductividad: "",
    prestamoId: "", montoDescuentoPrestamo: "",
    fechaLiquidacion: "", status: "Borrador", notas: ""
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

// 鈹€鈹€ Datos de la secci贸n "showcase" del m贸dulo 鈹€鈹€
const featuresModulo = [
    "C谩lculo autom谩tico",
    "Percepciones y deducciones configurables",
    "Descuento de pr茅stamos",
    "Liquidaci贸n por per铆odo",
    "Exportaci贸n a PDF y Excel",
    "Umbrales de rendimiento",
];

const pantallasModulo = [
    "Generador de liquidaciones",
    "Detalle con desglose completo",
    "Exportaci贸n y vista de impresi贸n",
];

function ModuloShowcase() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8 mb-10"
        >
            <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
                    <FaMoneyBillWave className="text-2xl text-cyan-300" />
                </div>
                <h2 className="text-2xl font-black text-cyan-300">Liquidaciones</h2>
            </div>
            <p className="text-gray-400 max-w-2xl mb-8">
                Calcula percepciones, deducciones, anticipos y pr茅stamos al cierre de cada per铆odo autom谩ticamente.
            </p>

            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Qu茅 puedes hacer</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {featuresModulo.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                        <FaCheckCircle className="text-cyan-400 flex-shrink-0" />
                        <span className="text-gray-200">{f}</span>
                    </div>
                ))}
            </div>

            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Pantallas del m贸dulo</p>
            <div className="space-y-3">
                {pantallasModulo.map((p) => (
                    <div
                        key={p}
                        className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.03] border border-cyan-400/10"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                        <span className="text-gray-300">{p}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
// 鈹€鈹€ Fin secci贸n showcase 鈹€鈹€

function generarPDFLiquidacion(liq, gastos) {
    const seDeduceGasto = (g) => g.categoria === "Anticipo" || !g.comprobado;
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
        POR_KM:      `${liq.kmRecorridos} km 脳 $${liq.tarifaKm}/km`,
        POR_MILLA:   `${liq.millasRecorridas} millas 脳 $${liq.tarifaMilla}/milla`,
        PORCENTAJE:  `${liq.porcentajeFlete}% del flete ($${liq.ordenCosto?.toLocaleString()})`,
        VIAJE_FIJO:  `Viaje fijo acordado`,
    }[liq.esquemaPago] || "-";

    const esPeriodo = liq.modo === "PERIODO";

    const html = `<html><head><meta charset="UTF-8"/>
    <title>Liquidaci贸n #${liq.id}</title>
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
            <div style="font-size:16px;font-weight:bold">Liquidaci贸n #${liq.id}</div>
            <div style="color:#888">Fecha: ${liq.fechaLiquidacion || "-"}</div>
            <div style="margin-top:6px"><span class="badge">${liq.status}</span></div>
        </div>
    </div>
    <div class="titulo">Liquidaci贸n de Operador${esPeriodo ? " -Por Per铆odo" : ""}</div>
    <div class="grid2">
        <div class="sec"><h3>Operador</h3>
            <div class="campo"><label>Nombre</label><span>${liq.driverNombre || "-"}</span></div>
        </div>
        ${esPeriodo ? `
        <div class="sec"><h3>Per铆odo</h3>
            <div class="campo"><label>Del</label><span>${liq.periodoInicio || "-"}</span></div>
            <div class="campo"><label>Al</label><span>${liq.periodoFin || "-"}</span></div>
        </div>` : `
        <div class="sec"><h3>Viaje</h3>
            <div class="campo"><label>ID</label><span>#${liq.orderId || "-"}</span></div>
            <div class="campo"><label>Cliente</label><span>${liq.clienteNombre || "-"}</span></div>
            <div class="campo"><label>Ruta</label><span>${liq.ordenOrigen || "-"} 鈫?${liq.ordenDestino || "-"}</span></div>
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
        <table><thead><tr><th>#</th><th>Categor铆a</th><th>Tipo</th><th>Descripci贸n</th><th>Fecha</th><th>Monto</th><th>Status</th></tr></thead>
        <tbody>${filaGastos}</tbody></table>
    </div>` : ""}
    ${gastosAbsorbidos.length > 0 ? `
    <div class="sec" style="margin-bottom:18px; border-color:#16a34a"><h3 style="color:#16a34a">馃Ь Gastos Comprobados (Absorbidos por la Empresa -NO se descuentan)</h3>
        <table><thead><tr><th>#</th><th>Tipo</th><th>Descripci贸n</th><th>Fecha</th><th>Monto</th></tr></thead>
        <tbody>${filaAbsorbidos}</tbody></table>
    </div>` : ""}
    ${liq.montoDescuentoPrestamo ? `
    <div class="sec" style="margin-bottom:18px"><h3>Descuento de Pr茅stamo</h3>
        <div class="campo"><label>Folio pr茅stamo</label><span>${liq.prestamoFolio || "-"}</span></div>
        <div class="campo"><label>Monto descontado</label><span style="color:red">-$${liq.montoDescuentoPrestamo.toLocaleString()}</span></div>
    </div>` : ""}
    ${(liq.bonoCarga || liq.bonoDescarga || liq.bonoManiobras || liq.bonoProductividad || liq.bonoUmbrales) ? `
    <div class="sec" style="margin-bottom:18px"><h3>Bonos y Extras</h3>
        ${liq.bonoCarga        ? `<div class="campo"><label>Bono cami贸n cargado</label><span style="color:green">+$${liq.bonoCarga.toLocaleString()}</span></div>` : ""}
        ${liq.bonoDescarga     ? `<div class="campo"><label>Bono por descarga</label><span style="color:green">+$${liq.bonoDescarga.toLocaleString()}</span></div>` : ""}
        ${liq.bonoManiobras    ? `<div class="campo"><label>Bono maniobras</label><span style="color:green">+$${liq.bonoManiobras.toLocaleString()}</span></div>` : ""}
        ${liq.bonoProductividad? `<div class="campo"><label>Bono productividad</label><span style="color:green">+$${liq.bonoProductividad.toLocaleString()}</span></div>` : ""}
        ${liq.bonoUmbrales     ? `<div class="campo"><label>Bono por rendimiento (umbral)</label><span style="color:green">+$${liq.bonoUmbrales.toLocaleString()}</span></div>` : ""}
    </div>` : ""}
    <div class="total-box">
        <div class="total-row"><span>Ingreso base (${liq.esquemaPago})</span><span>$${(liq.totalIngreso || 0).toLocaleString()}</span></div>
        <div class="total-row"><span>Bonos y extras</span><span style="color:green">+$${(liq.totalExtras || 0).toLocaleString()}</span></div>
        <div class="total-row"><span>Deducciones (anticipos + gastos + pr茅stamo)</span><span style="color:red">-$${(liq.totalDeducciones || 0).toLocaleString()}</span></div>
        <div class="total-final"><span>NETO A PAGAR AL OPERADOR</span><span>$${(liq.netoAPagar || 0).toLocaleString()}</span></div>
    </div>
    ${liq.notas ? `<div class="sec" style="margin-top:18px"><h3>Notas</h3><p>${liq.notas}</p></div>` : ""}
    ${liq.status === "Pagada" ? `
    <div class="sec" style="margin-top:18px; border-color:#16a34a"><h3 style="color:#16a34a"> de Pago</h3>
        <div class="campo"><label>Fecha de pago</label><span>${liq.fechaPago || "-"}</span></div>
        <div class="campo"><label>Forma de pago</label><span>${liq.formaPago || "-"}</span></div>
        ${liq.referenciaPago ? `<div class="campo"><label>Referencia</label><span>${liq.referenciaPago}</span></div>` : ""}
    </div>` : ""}
    <div class="footer">
        <div class="firma"><div class="linea"></div><p>Firma Operador</p><p style="font-weight:bold">${liq.driverNombre || ""}</p></div>
        <div class="firma"><div class="linea"></div><p>Firma Administraci贸n</p><p style="font-weight:bold">Veltrax Logistics</p></div>
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
    const [prestamos,     setPrestamos]     = useState([]); // pr茅stamos activos del driver seleccionado
    const [showModal,     setShowModal]     = useState(false);
    const [editando,      setEditando]      = useState(null);
    const [form,          setForm]          = useState(emptyForm);
    const [loading,       setLoading]       = useState(false);
    const [gastosPorViaje, setGastosPorViaje] = useState([]);
    const [periodoPreview, setPeriodoPreview] = useState(null); // m茅tricas + bonos de umbral para modo per铆odo
    const [formError,     setFormError]      = useState("");

    // 鈹€鈹€ Pago al operador 鈹€鈹€
    const [showPagoModal,     setShowPagoModal]     = useState(false);
    const [liquidacionActiva, setLiquidacionActiva] = useState(null);
    const [formPago,          setFormPago]          = useState({ fechaPago: "", formaPago: "Transferencia", referenciaPago: "" });
    const [loadingPago,       setLoadingPago]       = useState(false);

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
            setGastosPorViaje(Array.isArray(data) ? data : []);
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

    // 鈹€鈹€ Llegada autom谩tica desde el panel de Viajes (?orderId=&driverId=) 鈹€鈹€
    // Cuando el usuario da clic en "Generar Liquidaci贸n" dentro del detalle de
    // un viaje, aterriza aqu铆 con el viaje y el operador ya preseleccionados.
    // Esto dispara fetchGastos autom谩ticamente v铆a el useEffect de abajo, as铆
    // que los anticipos/gastos del viaje se desglosan solos en la vista previa.
    useEffect(() => {
        const orderIdParam  = searchParams.get("orderId");
        const driverIdParam = searchParams.get("driverId");
        if (orderIdParam) {
            setEditando(null);
            setForm({
                ...emptyForm,
                modo: "VIAJE",
                orderId: orderIdParam,
                driverId: driverIdParam || "",
                fechaLiquidacion: new Date().toISOString().split("T")[0],
            });
            setFormError("");
            setShowModal(true);
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

    useEffect(() => {
        if (form.modo === "PERIODO" && form.driverId && form.periodoInicio && form.periodoFin) {
            fetchPreviewPeriodo(form.driverId, form.periodoInicio, form.periodoFin);
        } else {
            setPeriodoPreview(null);
        }
    }, [form.modo, form.driverId, form.periodoInicio, form.periodoFin]);

    const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

    const openNew = () => {
        setEditando(null);
        setForm({ ...emptyForm, fechaLiquidacion: new Date().toISOString().split("T")[0] });
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (l) => {
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
            if (!form.periodoInicio || !form.periodoFin) return "Selecciona la fecha de inicio y fin del per铆odo.";
            if (form.periodoInicio > form.periodoFin) return "La fecha de inicio no puede ser posterior a la fecha de fin.";
        }

        switch (form.esquemaPago) {
            case "POR_KM":
                if (!form.kmRecorridos || Number(form.kmRecorridos) <= 0) return "Ingresa los kil贸metros recorridos (mayor a 0).";
                if (!form.tarifaKm || Number(form.tarifaKm) <= 0) return "Ingresa la tarifa por kil贸metro (mayor a 0).";
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
            return "Seleccionaste un pr茅stamo: ingresa el monto a descontar (mayor a 0).";
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
            await fetch(url, { method, headers, body: JSON.stringify(body) });
            setShowModal(false);
            fetchAll();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("驴Eliminar esta liquidaci贸n?")) return;
        try { await fetch(`${API}/liquidaciones/${id}`, { method: "DELETE", headers }); fetchAll(); }
        catch (e) { console.error(e); }
    };

    const abrirPago = (liq) => {
        setLiquidacionActiva(liq);
        setFormPago({ fechaPago: new Date().toISOString().split("T")[0], formaPago: "Transferencia", referenciaPago: "" });
        setShowPagoModal(true);
    };

    const setPagoField = (f) => (e) => setFormPago(prev => ({ ...prev, [f]: e.target.value }));

    const registrarPagoOperador = async () => {
        if (!liquidacionActiva) return;
        setLoadingPago(true);
        try {
            const res = await fetch(`${API}/liquidaciones/${liquidacionActiva.id}/pagar`, {
                method: "POST", headers, body: JSON.stringify(formPago)
            });
            if (res.ok) {
                setShowPagoModal(false);
                fetchAll();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Error al registrar el pago");
            }
        } catch (e) { console.error(e); }
        setLoadingPago(false);
    };

    const handlePDF = async (liq) => {
        let gastos = [];
        if (liq.modo !== "PERIODO" && liq.orderId) {
            const res  = await fetch(`${API}/gastos-viaje/viaje/${liq.orderId}`, { headers });
            const data = await res.json();
            gastos = Array.isArray(data) ? data : [];
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

    // Regla: Anticipos siempre se descuentan (ya se entreg贸 el efectivo).
    // Gastos con ticket comprobado NO se descuentan (la empresa los absorbe).
    // Gastos sin ticket S脥 se descuentan (se le cobran al operador).
    const seDeduceGasto = (g) => g.categoria === "Anticipo" || !g.comprobado;
    const previewDeduccionesGastos = form.modo === "PERIODO" ? 0 :
        gastosPorViaje.reduce((s, g) => s + (seDeduceGasto(g) ? (g.monto || 0) : 0), 0);
    const totalAbsorbidoEmpresa = form.modo === "PERIODO" ? 0 :
        gastosPorViaje.reduce((s, g) => s + (!seDeduceGasto(g) ? (g.monto || 0) : 0), 0);
    const previewDescuentoPrestamo = Number(form.montoDescuentoPrestamo) || 0;
    const previewDeducciones = previewDeduccionesGastos + previewDescuentoPrestamo;
    const previewNeto = previewIngreso + previewExtras - previewDeducciones;

    const aprobadas = liquidaciones.filter(l => l.status === "Aprobada").length;
    const pagadas   = liquidaciones.filter(l => l.status === "Pagada").length;
    const totalNeto = liquidaciones.reduce((s, l) => s + (l.netoAPagar || 0), 0);

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">LIQUIDACIONES</h1>
                        <p className="text-gray-400 mt-4 text-xl">Control de pagos a operadores</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Liquidaci贸n
                    </motion.button>
                </motion.div>

                {/* Secci贸n agregada: qu茅 hace el m贸dulo y sus pantallas */}
                <ModuloShowcase />

                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label: "Total",     value: liquidaciones.length, color: "text-cyan-400",   border: "border-cyan-500/20" },
                        { label: "Aprobadas", value: aprobadas,            color: "text-blue-400",   border: "border-blue-500/20" },
                        { label: "Pagadas",   value: pagadas,              color: "text-green-400",  border: "border-green-500/20" },
                        { label: "Por pagar", value: `$${totalNeto.toLocaleString()}`, color: "text-yellow-400", border: "border-yellow-500/20" },
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["#", "Operador", "Modo", "Viaje/Per铆odo", "Cliente", "Esquema", "Ingreso", "Deducciones", "Neto a Pagar", "Status", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {liquidaciones.length === 0 && (
                                    <tr><td colSpan={11} className="py-10 text-center text-gray-500">No hay liquidaciones registradas</td></tr>
                                )}
                                {liquidaciones.map((l, i) => (
                                    <motion.tr key={l.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                        className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300">#{l.id}</td>
                                        <td className="py-4 pr-4 font-bold">{l.driverNombre || "-"}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${l.modo === "PERIODO" ? "bg-purple-500/10 text-purple-300" : "bg-cyan-500/10 text-cyan-300"}`}>
                                                {l.modo === "PERIODO" ? "Per铆odo" : "Viaje"}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">
                                            {l.modo === "PERIODO" ? `${l.periodoInicio || "-"} 鈫?${l.periodoFin || "-"}` : `#${l.orderId || "-"}`}
                                        </td>
                                        <td className="py-4 pr-4 text-gray-300">{l.clienteNombre || "-"}</td>
                                        <td className="py-4 pr-4">
                                            <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-bold">
                                                {l.esquemaPago}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-green-300 font-bold">${(l.totalIngreso || 0).toLocaleString()}</td>
                                        <td className="py-4 pr-4 text-red-300">-${(l.totalDeducciones || 0).toLocaleString()}</td>
                                        <td className="py-4 pr-4 text-yellow-300 font-black text-lg">${(l.netoAPagar || 0).toLocaleString()}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${
                                                l.status === "Pagada"   ? "text-green-300 bg-green-500/10 border-green-400/30" :
                                                l.status === "Aprobada" ? "text-blue-300 bg-blue-500/10 border-blue-400/30" :
                                                "text-yellow-300 bg-yellow-500/10 border-yellow-400/30"}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                {l.status !== "Pagada" && (
                                                    <button onClick={() => abrirPago(l)} className="p-3 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all" title="Registrar pago al operador"><FaHandHoldingUsd /></button>
                                                )}
                                                <button onClick={() => handlePDF(l)} className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-400 hover:bg-blue-500/20 transition-all" title="PDF"><FaFilePdf /></button>
                                                <button onClick={() => openEdit(l)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all" title="Editar"><FaEdit /></button>
                                                <button onClick={() => handleDelete(l.id)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all" title="Eliminar"><FaTrash /></button>
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
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar Liquidaci贸n" : "Nueva Liquidaci贸n"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <div className="grid grid-cols-2 gap-5">

                                    {/* Toggle modo VIAJE / PERIODO */}
                                    <div className="col-span-2 flex gap-3 mb-2">
                                        <button
                                            onClick={() => setForm(prev => ({ ...prev, modo: "VIAJE" }))}
                                            className={`flex-1 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                                                form.modo === "VIAJE"
                                                    ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                                                    : "bg-white/5 border-cyan-400/10 text-gray-400 hover:bg-white/10"}`}>
                                            <FaTruck /> Por Viaje
                                        </button>
                                        <button
                                            onClick={() => setForm(prev => ({ ...prev, modo: "PERIODO" }))}
                                            className={`flex-1 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                                                form.modo === "PERIODO"
                                                    ? "bg-purple-500/20 border-purple-400/40 text-purple-300"
                                                    : "bg-white/5 border-cyan-400/10 text-gray-400 hover:bg-white/10"}`}>
                                            <FaCalendarAlt /> Por Per铆odo
                                        </button>
                                    </div>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                                        {form.modo === "PERIODO" ? "Datos del per铆odo" : "Datos del viaje"}
                                    </p>

                                    {form.modo === "VIAJE" ? (
                                        <Field label="Viaje" span2>
                                            <select value={form.orderId} onChange={set("orderId")} className={selectCls}>
                                                <option value="">Seleccionar viaje...</option>
                                                {viajes.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        #{v.id} -{v.clienteNombre || "Sin cliente"} | {v.origen || "?"} 鈫?{v.destino || "?"} | ${(v.cost || 0).toLocaleString()}
                                                    </option>
                                                ))}
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

                                    {form.modo === "PERIODO" && periodoPreview && (
                                        <div className="col-span-2 grid grid-cols-3 gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-400/20">
                                            <div className="text-center">
                                                <p className="text-gray-400 text-xs">Viajes en per铆odo</p>
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
                                            <option value="POR_KM">Por kil贸metro recorrido</option>
                                            <option value="POR_MILLA">Por milla recorrida</option>
                                            <option value="PORCENTAJE">Porcentaje del flete</option>
                                            {form.modo === "PERIODO" && <option value="SUMA_VIAJES">Suma de fletes del per铆odo</option>}
                                        </select>
                                    </Field>

                                    {form.esquemaPago === "VIAJE_FIJO" && form.modo === "VIAJE" && (
                                        <Field label="Monto fijo acordado ($)" span2>
                                            <input type="number" value={form.montoFijo} onChange={set("montoFijo")} placeholder="0.00" className={inputCls} />
                                        </Field>
                                    )}
                                    {form.esquemaPago === "POR_KM" && (<>
                                        <Field label="Kil贸metros recorridos">
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
                                            {form.modo === "PERIODO" && periodoPreview && <p className="text-gray-500 text-xs mt-1">Flete total del per铆odo: ${(periodoPreview.ingresoTotal || 0).toLocaleString()}</p>}
                                        </Field>
                                    )}

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-2">Bonos y extras manuales</p>
                                    <Field label="Bono cami贸n cargado ($)">
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
                                        <FaHandHoldingUsd /> Descuento de pr茅stamo
                                    </p>
                                    <Field label="Pr茅stamo activo del operador" span2>
                                        <select value={form.prestamoId} onChange={set("prestamoId")} className={selectCls} disabled={!form.driverId}>
                                            <option value="">Sin pr茅stamo / no aplicar</option>
                                            {prestamos.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.folio} -Saldo: ${(p.saldoPendiente || 0).toLocaleString()} ({p.motivo || "sin motivo"})
                                                </option>
                                            ))}
                                        </select>
                                        {form.driverId && prestamos.length === 0 && (
                                            <p className="text-gray-500 text-xs mt-1">Este operador no tiene pr茅stamos activos.</p>
                                        )}
                                    </Field>
                                    {form.prestamoId && (
                                        <Field label="Monto a descontar en esta liquidaci贸n ($)" span2>
                                            <input type="number" value={form.montoDescuentoPrestamo} onChange={set("montoDescuentoPrestamo")} placeholder="0.00" className={inputCls} />
                                            {prestamoSeleccionado && (
                                                <p className="text-gray-500 text-xs mt-1">Saldo pendiente del pr茅stamo: ${(prestamoSeleccionado.saldoPendiente || 0).toLocaleString()}</p>
                                            )}
                                        </Field>
                                    )}

                                    <Field label="Fecha de liquidaci贸n">
                                        <input type="date" value={form.fechaLiquidacion} onChange={set("fechaLiquidacion")} className={inputCls} />
                                    </Field>
                                    <Field label="Status">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Borrador</option>
                                            <option>Aprobada</option>
                                            <option>Pagada</option>
                                        </select>
                                    </Field>
                                    <Field label="Notas" span2>
                                        <textarea value={form.notas} onChange={set("notas")} rows={2} placeholder="Observaciones..." className={inputCls + " resize-none"} />
                                    </Field>
                                </div>

                                {/* Preview de c谩lculo */}
                                <div className="mt-6 p-5 rounded-2xl bg-cyan-500/5 border border-cyan-400/20">
                                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Vista previa de liquidaci贸n</p>
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
                                                Deducciones {form.modo === "VIAJE" ? `(${gastosPorViaje.length} gastos` : "(gastos"}
                                                {previewDescuentoPrestamo > 0 ? " + pr茅stamo)" : ")"}
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
                                                            {g.tipo} -{g.descripcion}
                                                            {g.categoria !== "Anticipo" && (
                                                                g.comprobado
                                                                    ? <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] font-bold">馃Ь comprobado</span>
                                                                    : <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">sin comprobar</span>
                                                            )}
                                                        </span>
                                                        <span className={deduce ? "text-red-300" : "text-green-300"}>
                                                            {deduce ? `-$${(g.monto || 0).toLocaleString()}` : "absorbido por empresa"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {totalAbsorbidoEmpresa > 0 && (
                                                <p className="text-green-400 text-xs pt-1">
                                                    La empresa absorbe ${totalAbsorbidoEmpresa.toLocaleString()} en gastos comprobados.
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
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Guardar Liquidaci贸n"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
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
                                    <p className="text-gray-400 text-sm mt-1">{liquidacionActiva.folio} -{liquidacionActiva.driverNombre}</p>
                                </div>
                                <button onClick={() => setShowPagoModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>

                            <div className="mx-6 my-5 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-400/20 text-center">
                                <p className="text-gray-400 text-xs uppercase font-bold">Neto a pagar</p>
                                <p className="text-yellow-300 font-black text-3xl">${(liquidacionActiva.netoAPagar || 0).toLocaleString()}</p>
                            </div>

                            <div className="px-6 space-y-4">
                                <Field label="Fecha de pago">
                                    <input type="date" value={formPago.fechaPago} onChange={setPagoField("fechaPago")} className={inputCls} />
                                </Field>
                                <Field label="Forma de pago">
                                    <select value={formPago.formaPago} onChange={setPagoField("formaPago")} className={selectCls}>
                                        <option>Transferencia</option>
                                        <option>Efectivo</option>
                                        <option>Cheque</option>
                                        <option>Dep贸sito</option>
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





