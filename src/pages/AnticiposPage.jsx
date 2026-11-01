import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ChipEstatusAnticipo from "../components/ChipEstatusAnticipo";
import { ESTATUS_ANTICIPO } from "../constants/estatusAnticipo";
import { FaCoins, FaPlus, FaTimes, FaCheck, FaUndo, FaBan, FaLink, FaEdit } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
import { hoyMexico } from "../utils/fechas";
import { etiquetaCliente } from "../utils/clientes";
const API = API_URL;

// Anticipos a operadores (VID-K1): se registran con o sin viaje y nacen por
// autorizar; se ligan después a un viaje y a uno de sus trayectos, y se cancelan
// con motivo, sin borrarse. Solo ADMIN ve «Autorizar» y «Desautorizar» y cancela
// uno autorizado; ocultarlos no es la seguridad: el backend rechaza a los demás.
// Las liquidaciones descuentan los autorizados de sus viajes.

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const VERDE    = "bg-green-500/10 border-green-400/30 text-green-300 hover:bg-green-500/20";
const AMARILLO = "bg-yellow-500/10 border-yellow-400/30 text-yellow-300 hover:bg-yellow-500/20";
const CIAN     = "bg-cyan-500/10 border-cyan-400/20 text-cyan-300 hover:bg-cyan-500/20";
const ROJO     = "bg-red-500/10 border-red-400/20 text-red-400 hover:bg-red-500/20";

const TITULOS = { nuevo: "Nuevo anticipo", editar: "Editar anticipo", ligar: "Ligar a un viaje", cancelar: "Cancelar anticipo" };

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const idOVacio = (v) => (v === "" || v == null ? null : Number(v));

function encabezados() {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
}

// El mensaje del servidor, que viene en {"error": ...}, o uno con el código.
async function mensajeError(res) {
    const data = await res.json().catch(() => null);
    if (data?.error) return data.error;
    return res.status === 403
        ? "No tienes permiso para esta acción o tu sesión expiró."
        : `No se pudo guardar (error ${res.status}).`;
}

// Los datos con que abre la ventana.
function formDe(modo, a) {
    if (modo === "nuevo") {
        return { operadorId: "", monto: "", fecha: hoyMexico(), concepto: "", notas: "", viajeId: "", trayectoId: "" };
    }
    if (modo === "editar") {
        return { operadorId: a.operadorId ?? "", monto: a.monto ?? "", fecha: a.fecha ?? "", concepto: a.concepto ?? "", notas: a.notas ?? "" };
    }
    if (modo === "ligar") {
        return { viajeId: a.viajeId != null ? String(a.viajeId) : "", trayectoId: a.trayectoId ?? "" };
    }
    return { motivo: "" };
}

// La petición que guarda la ventana.
function pedidoDe(modo, a, form) {
    const datos = {
        operadorId: idOVacio(form.operadorId), monto: form.monto, fecha: form.fecha,
        concepto: form.concepto, notas: form.notas,
    };
    const viaje = { viajeId: idOVacio(form.viajeId), trayectoId: idOVacio(form.trayectoId) };
    if (modo === "nuevo")  return { url: `${API}/anticipos`, method: "POST", body: { ...datos, ...viaje } };
    if (modo === "editar") return { url: `${API}/anticipos/${a.id}`, method: "PUT", body: datos };
    if (modo === "ligar")  return { url: `${API}/anticipos/${a.id}/viaje`, method: "PUT", body: viaje };
    return { url: `${API}/anticipos/${a.id}/cancelar`, method: "PUT", body: { motivo: form.motivo } };
}

function mensajeDe(modo, folio) {
    if (modo === "nuevo")    return `Anticipo ${folio} registrado: queda por autorizar.`;
    if (modo === "cancelar") return `Anticipo ${folio} cancelado.`;
    return `Anticipo ${folio} actualizado.`;
}

function Field({ label, children, span2 = false }) {
    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

function Accion({ onClick, color, icono, children }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold whitespace-nowrap transition-all ${color}`}>
            {icono} {children}
        </button>
    );
}

export default function AnticiposPage() {
    const [esAdmin]        = useState(() => localStorage.getItem("role") === "ADMIN");
    const [anticipos,      setAnticipos]      = useState([]);
    const [operadores,     setOperadores]     = useState([]);
    const [viajes,         setViajes]         = useState([]);
    const [errorCarga,     setErrorCarga]     = useState("");
    const [version,        setVersion]        = useState(0);
    const [filtroEstatus,  setFiltroEstatus]  = useState("");
    const [filtroOperador, setFiltroOperador] = useState("");
    const [soloSinViaje,   setSoloSinViaje]   = useState(false);
    const [msg,            setMsg]            = useState(null);
    const [ventana,        setVentana]        = useState(null); // { modo, anticipo }
    const [form,           setForm]           = useState({});
    const [trayectos,      setTrayectos]      = useState({ viajeId: "", lista: [] });
    const [errorVentana,   setErrorVentana]   = useState("");
    const [avisoVentana,   setAvisoVentana]   = useState("");
    const [guardando,      setGuardando]      = useState(false);

    // version cambia para volver a cargar tras un cambio. Sin operadores o viajes
    // (por permisos), los anticipos se muestran igual.
    useEffect(() => {
        let vigente = true;
        const lista = (ruta) => fetch(`${API}${ruta}`, { headers: encabezados() })
            .then(res => (res.ok ? res.json() : []))
            .catch(() => []);
        fetch(`${API}/anticipos`, { headers: encabezados() })
            .then(async (res) => {
                if (!res.ok) {
                    const mensaje = await mensajeError(res);
                    if (vigente) setErrorCarga(mensaje);
                    return;
                }
                const data = await res.json();
                if (!vigente) return;
                setAnticipos(Array.isArray(data) ? data : []);
                setErrorCarga("");
            })
            .catch(() => { if (vigente) setErrorCarga("No se pudo conectar con el servidor."); });
        Promise.all([lista("/drivers"), lista("/orders")]).then(([d, v]) => {
            if (!vigente) return;
            setOperadores(Array.isArray(d) ? d : []);
            setViajes(Array.isArray(v) ? v : []);
        });
        return () => { vigente = false; };
    }, [version]);

    // Los trayectos del viaje elegido en la ventana.
    useEffect(() => {
        if (!form.viajeId) return;
        let vigente = true;
        fetch(`${API}/orders/${form.viajeId}/trayectos`, { headers: encabezados() })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
            .then(data => { if (vigente) setTrayectos({ viajeId: form.viajeId, lista: data?.trayectos || [] }); });
        return () => { vigente = false; };
    }, [form.viajeId]);
    const trayectosDelViaje = trayectos.viajeId === form.viajeId ? trayectos.lista : [];

    const recargar = () => setVersion(v => v + 1);
    const avisar   = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 4000); };
    const set      = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));
    const setViaje = (e) => setForm(f => ({ ...f, viajeId: e.target.value, trayectoId: "" }));

    const abrir = (modo, anticipo = null) => {
        setForm(formDe(modo, anticipo));
        setErrorVentana("");
        setAvisoVentana("");
        setVentana({ modo, anticipo });
    };
    const cerrar = () => { setVentana(null); setAvisoVentana(""); };

    // Un rechazo se muestra en la ventana. Si el servidor devuelve un aviso, la
    // ventana sigue abierta con él en amarillo y solo «Cerrar», para que se vea.
    const guardar = async () => {
        const { modo, anticipo } = ventana;
        const pedido = pedidoDe(modo, anticipo, form);
        setGuardando(true);
        setErrorVentana("");
        try {
            const res = await fetch(pedido.url, { method: pedido.method, headers: encabezados(), body: JSON.stringify(pedido.body) });
            if (!res.ok) {
                setErrorVentana(await mensajeError(res));
                return;
            }
            const data = await res.json().catch(() => null);
            recargar();
            if (data?.aviso) {
                setAvisoVentana(data.aviso);
                return;
            }
            cerrar();
            avisar(true, mensajeDe(modo, (data?.anticipo || data)?.folio));
        } catch (e) {
            console.error(e);
            setErrorVentana("No se pudo conectar con el servidor. Intenta de nuevo.");
        } finally {
            setGuardando(false);
        }
    };

    // Solo ADMIN (SecurityConfig). No crea ninguna operación bancaria.
    const cambiarAutorizacion = async (a, accion) => {
        const pregunta = accion === "autorizar" ? "Autorizar" : "Desautorizar";
        if (!confirm(`¿${pregunta} el anticipo ${a.folio} de ${fmt(a.monto)} a ${a.operador}?`)) return;
        try {
            const res = await fetch(`${API}/anticipos/${a.id}/${accion}`, { method: "PUT", headers: encabezados() });
            if (!res.ok) {
                avisar(false, await mensajeError(res));
                return;
            }
            avisar(true, `Anticipo ${a.folio} ${accion === "autorizar" ? "autorizado" : "desautorizado"}.`);
            recargar();
        } catch (e) {
            console.error(e);
            avisar(false, "No se pudo conectar con el servidor. Intenta de nuevo.");
        }
    };

    const cuantosEn = (clave) => anticipos.filter(a => a.estatus === clave).length;
    const visibles = anticipos.filter(a =>
        (!filtroEstatus || a.estatus === filtroEstatus)
        && (!filtroOperador || String(a.operadorId) === filtroOperador)
        && (!soloSinViaje || a.viajeId == null));
    // Los viajes más recientes primero; a uno cancelado no se liga nada.
    const viajesParaLigar = [...viajes].reverse().filter(v => (v.status || "").toUpperCase() !== "CANCELADO");

    const camposViaje = (
        <>
            <Field label="Viaje (opcional)" span2>
                <select value={form.viajeId ?? ""} onChange={setViaje} disabled={Boolean(avisoVentana)} className={`${selectCls} disabled:opacity-50`}>
                    <option value="">Sin viaje</option>
                    {viajesParaLigar.map(v => (
                        <option key={v.id} value={v.id}>
                            {v.folio || `#${v.id}`} · {etiquetaCliente(v.cliente) || "Sin cliente"}{v.driver ? ` · ${v.driver.name} ${v.driver.apellidos || ""}` : ""}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Trayecto (opcional)" span2>
                <select value={form.trayectoId ?? ""} onChange={set("trayectoId")} disabled={!form.viajeId || Boolean(avisoVentana)} className={`${selectCls} disabled:opacity-50`}>
                    <option value="">Sin trayecto</option>
                    {trayectosDelViaje.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.secuencia}: {t.origen || "?"} → {t.destino || "?"}{t.operador ? ` · ${t.operador}` : ""}
                        </option>
                    ))}
                </select>
            </Field>
        </>
    );

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative">
                <Topbar />

                {msg && (
                    <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-bold ${msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300"}`}>
                        {msg.txt}
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">ANTICIPOS</h1>
                        <p className="text-gray-400 mt-4 text-xl">Registro y autorización de anticipos a operadores</p>
                    </div>
                    <button onClick={() => abrir("nuevo")}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all whitespace-nowrap">
                        <FaPlus /> Nuevo anticipo
                    </button>
                </motion.div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-6 flex items-center gap-3"><FaCoins /> Anticipos registrados</h2>

                    {errorCarga && (
                        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-400/30 text-red-300">{errorCarga}</div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        {[{ clave: "", descripcion: "Todos" }, ...ESTATUS_ANTICIPO].map(e => (
                            <button key={e.clave || "TODOS"} onClick={() => setFiltroEstatus(e.clave)}
                                className={`px-3 py-1 rounded-full border text-xs font-bold transition-all
                                    ${e.color ? "" : "text-cyan-300 bg-cyan-500/10 border-cyan-400/30"}
                                    ${filtroEstatus === e.clave ? "ring-2 ring-white/40" : "opacity-60 hover:opacity-100"}`}
                                style={e.color ? { color: e.color, backgroundColor: `${e.color}1a`, borderColor: `${e.color}4d` } : undefined}>
                                {e.descripcion} ({e.clave ? cuantosEn(e.clave) : anticipos.length})
                            </button>
                        ))}
                        <select value={filtroOperador} onChange={e => setFiltroOperador(e.target.value)}
                            className="bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-400/40">
                            <option value="">Todos los operadores</option>
                            {operadores.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                            <input type="checkbox" checked={soloSinViaje} onChange={e => setSoloSinViaje(e.target.checked)} />
                            Solo sin viaje
                        </label>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio", "Fecha", "Operador", "Monto", "Concepto", "Viaje", "Estatus", "Autorización", "Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.length === 0 && (
                                    <tr><td colSpan={9} className="py-10 text-center text-gray-500">
                                        {anticipos.length === 0 ? "No hay anticipos registrados" : "Ningún anticipo con estos filtros"}
                                    </td></tr>
                                )}
                                {visibles.map(a => (
                                    <tr key={a.id} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all align-top">
                                        <td className="py-4 pr-4 font-black text-cyan-300 text-sm whitespace-nowrap">{a.folio}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm whitespace-nowrap">{a.fecha}</td>
                                        <td className="py-4 pr-4 text-sm">{a.operador}</td>
                                        <td className={`py-4 pr-4 font-bold whitespace-nowrap ${a.estatus === "CANCELADO" ? "text-gray-500 line-through" : "text-green-300"}`}>{fmt(a.monto)}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">{a.concepto || "-"}</td>
                                        <td className="py-4 pr-4 text-sm">
                                            {a.viaje
                                                ? <><p className="text-gray-300 whitespace-nowrap">{a.viaje}</p>{a.trayecto && <p className="text-gray-500 text-xs">Trayecto {a.trayecto}</p>}</>
                                                : <span className="text-yellow-300">Sin viaje</span>}
                                        </td>
                                        <td className="py-4 pr-4"><ChipEstatusAnticipo clave={a.estatus} /></td>
                                        <td className="py-4 pr-4 text-gray-400 text-xs">
                                            {a.estatus === "AUTORIZADO" && <p>{a.autorizadoPor} · {a.autorizadoEn}</p>}
                                            {a.estatus === "CANCELADO" && <><p>{a.canceladoPor} · {a.canceladoEn}</p><p className="text-red-300">{a.motivoCancelacion}</p></>}
                                            {a.estatus === "POR_AUTORIZAR" && <p>Registró {a.registradoPor}</p>}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {esAdmin && a.estatus === "POR_AUTORIZAR" && (
                                                    <Accion color={VERDE} icono={<FaCheck size={10} />} onClick={() => cambiarAutorizacion(a, "autorizar")}>Autorizar</Accion>
                                                )}
                                                {esAdmin && a.estatus === "AUTORIZADO" && (
                                                    <Accion color={AMARILLO} icono={<FaUndo size={10} />} onClick={() => cambiarAutorizacion(a, "desautorizar")}>Desautorizar</Accion>
                                                )}
                                                {a.estatus === "POR_AUTORIZAR" && (
                                                    <Accion color={CIAN} icono={<FaEdit size={10} />} onClick={() => abrir("editar", a)}>Editar</Accion>
                                                )}
                                                {a.estatus !== "CANCELADO" && (
                                                    <Accion color={CIAN} icono={<FaLink size={10} />} onClick={() => abrir("ligar", a)}>Ligar</Accion>
                                                )}
                                                {(a.estatus === "POR_AUTORIZAR" || (esAdmin && a.estatus === "AUTORIZADO")) && (
                                                    <Accion color={ROJO} icono={<FaBan size={10} />} onClick={() => abrir("cancelar", a)}>Cancelar</Accion>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {ventana && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center p-6 pb-0 flex-shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-cyan-300">{TITULOS[ventana.modo]}</h2>
                                    {ventana.anticipo && (
                                        <p className="text-gray-400 text-sm">{ventana.anticipo.folio} · {ventana.anticipo.operador} · {fmt(ventana.anticipo.monto)}</p>
                                    )}
                                </div>
                                <button onClick={cerrar} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="px-6 py-5 grid grid-cols-2 gap-4 overflow-y-auto">
                                {(ventana.modo === "nuevo" || ventana.modo === "editar") && (
                                    <>
                                        <Field label="Operador *" span2>
                                            <select value={form.operadorId ?? ""} onChange={set("operadorId")} disabled={Boolean(avisoVentana)} className={`${selectCls} disabled:opacity-50`}>
                                                <option value="">Seleccionar operador...</option>
                                                {operadores.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ""}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Monto ($) *">
                                            <input type="number" min="0" step="any" value={form.monto ?? ""} onChange={set("monto")} disabled={Boolean(avisoVentana)} className={`${inputCls} disabled:opacity-50`} />
                                        </Field>
                                        <Field label="Fecha *">
                                            <input type="date" value={form.fecha ?? ""} onChange={set("fecha")} disabled={Boolean(avisoVentana)} className={`${inputCls} disabled:opacity-50`} />
                                        </Field>
                                        <Field label="Concepto" span2>
                                            <input value={form.concepto ?? ""} onChange={set("concepto")} maxLength={255} disabled={Boolean(avisoVentana)} placeholder="Detalle..." className={`${inputCls} disabled:opacity-50`} />
                                        </Field>
                                        <Field label="Notas" span2>
                                            <input value={form.notas ?? ""} onChange={set("notas")} maxLength={255} disabled={Boolean(avisoVentana)} placeholder="Observaciones..." className={`${inputCls} disabled:opacity-50`} />
                                        </Field>
                                    </>
                                )}
                                {(ventana.modo === "nuevo" || ventana.modo === "ligar") && camposViaje}
                                {ventana.modo === "ligar" && (
                                    <p className="col-span-2 text-gray-500 text-xs -mt-2">Sin viaje, el anticipo no entra en ninguna liquidación.</p>
                                )}
                                {ventana.modo === "cancelar" && (
                                    <Field label="Motivo de la cancelación *" span2>
                                        <textarea value={form.motivo ?? ""} onChange={set("motivo")} maxLength={500} rows={3} className={inputCls} />
                                    </Field>
                                )}
                            </div>
                            {errorVentana && (
                                <div className="mx-6 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-400/30 text-red-300 flex-shrink-0">{errorVentana}</div>
                            )}
                            {avisoVentana && (
                                <div className="mx-6 px-4 py-3 rounded-xl text-sm bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 flex-shrink-0">Guardado. {avisoVentana}</div>
                            )}
                            <div className="flex gap-4 p-6 flex-shrink-0">
                                {avisoVentana ? (
                                    <button onClick={cerrar}
                                        className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                        Cerrar
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={cerrar} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">
                                            {ventana.modo === "cancelar" ? "Volver" : "Cancelar"}
                                        </button>
                                        <button onClick={guardar} disabled={guardando}
                                            className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-40">
                                            {guardando ? "Guardando..." : ventana.modo === "cancelar" ? "Cancelar anticipo" : "Guardar"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
