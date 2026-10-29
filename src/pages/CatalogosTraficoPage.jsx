import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TablaCatalogo from "../components/TablaCatalogo";
import ChipEvento from "../components/ChipEvento";
import { CATALOGOS_TRAFICO } from "../constants/catalogosTrafico";
import { FaTags, FaPlus, FaTrash, FaEdit, FaTimes, FaCheck } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { API_URL } from "../config/api";
const API = API_URL;

// Catálogos de tráfico (Fase 1): tipos y clasificaciones de viaje, grupos de
// clientes, grupos de unidades y eventos de viaje (VID-J5: con abreviación y
// color). Todos los roles consultan; solo ADMIN ve los
// controles de escritura. Ocultarlos no es la seguridad: SecurityConfig
// rechaza en el backend cualquier escritura que no sea de ADMIN.

// VID-J5: el color que propone el alta de un evento de viaje.
const COLOR_INICIAL = "#06B6D4";
const formVacio = { clave: "", descripcion: "", activo: true, abreviacion: "", color: COLOR_INICIAL };

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const statusCls = (activo) => activo
    ? "text-green-300 bg-green-500/10 border-green-400/30"
    : "text-red-300 bg-red-500/10 border-red-400/30";

function encabezados() {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
}

// Para 400, 404 y 409 el backend explica el problema en {"error": ...};
// para cualquier otra respuesta se muestra un mensaje genérico.
async function mensajeError(res) {
    if ([400, 404, 409].includes(res.status)) {
        try {
            const data = await res.json();
            if (data && data.error) return data.error;
        } catch {
            // Respuesta sin cuerpo JSON.
        }
    }
    return `No se pudo completar la operación (error ${res.status}).`;
}

const COLUMNAS = [
    { clave: "clave", titulo: "Clave", render: r => <span className="text-cyan-300 font-mono text-sm">{r.clave}</span> },
    { clave: "descripcion", titulo: "Descripción", render: r => <span className="font-bold text-white">{r.descripcion}</span> },
    {
        clave: "activo", titulo: "Status",
        valor: r => (r.activo ? "Activo" : "Inactivo"),
        render: r => <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusCls(r.activo)}`}>{r.activo ? "Activo" : "Inactivo"}</span>,
    },
];

// VID-J5: los eventos de viaje muestran además su abreviación, en su color.
const COLUMNAS_EVENTOS = [
    COLUMNAS[0],
    { clave: "abreviacion", titulo: "Abreviación", render: r => <ChipEvento abreviacion={r.abreviacion} color={r.color} /> },
    ...COLUMNAS.slice(1),
];

function Field({ label, children }) {
    return (
        <div>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            {children}
        </div>
    );
}

export default function CatalogosTraficoPage() {
    const [esAdmin]     = useState(() => localStorage.getItem("role") === "ADMIN");
    const [tipo,        setTipo]        = useState(CATALOGOS_TRAFICO[0].slug);
    const [registros,   setRegistros]   = useState([]);
    const [errorCarga,  setErrorCarga]  = useState("");
    const [version,     setVersion]     = useState(0);
    const [showModal,   setShowModal]   = useState(false);
    const [editando,    setEditando]    = useState(null);
    const [form,        setForm]        = useState(formVacio);
    const [guardando,   setGuardando]   = useState(false);
    const [errorForm,   setErrorForm]   = useState("");
    const [aviso,       setAviso]       = useState("");

    // Carga el catálogo elegido; version cambia para volver a cargarlo tras guardar o eliminar.
    useEffect(() => {
        let vigente = true;
        fetch(`${API}/api/catalogos-trafico/${tipo}`, { headers: encabezados() })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    if (!vigente) return;
                    setRegistros(Array.isArray(data) ? data : []);
                    setErrorCarga("");
                } else {
                    const mensaje = await mensajeError(res);
                    if (!vigente) return;
                    setRegistros([]);
                    setErrorCarga(mensaje);
                }
            })
            .catch(() => {
                if (!vigente) return;
                setRegistros([]);
                setErrorCarga("No se pudo conectar con el servidor.");
            });
        return () => { vigente = false; };
    }, [tipo, version]);

    const catalogo = CATALOGOS_TRAFICO.find(c => c.slug === tipo);
    const recargar = () => setVersion(v => v + 1);

    const cambiarTipo = (slug) => {
        setTipo(slug);
        setRegistros([]);
        setErrorCarga("");
        setAviso("");
    };

    const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

    const abrirNuevo = () => { setEditando(null); setForm(formVacio); setErrorForm(""); setShowModal(true); };
    const abrirEdicion = (r) => {
        setEditando(r.id);
        setForm({ clave: r.clave ?? "", descripcion: r.descripcion ?? "", activo: r.activo !== false,
            abreviacion: r.abreviacion ?? "", color: r.color ?? COLOR_INICIAL });
        setErrorForm("");
        setShowModal(true);
    };

    const guardar = async () => {
        setGuardando(true);
        setErrorForm("");
        // En el alta no se envía activo: el backend siempre crea el registro activo.
        // La abreviación y el color solo van en los eventos de viaje (VID-J5).
        const extra = catalogo?.abreviacionYColor ? { abreviacion: form.abreviacion, color: form.color } : {};
        const cuerpo = editando
            ? { clave: form.clave, descripcion: form.descripcion, activo: form.activo, ...extra }
            : { clave: form.clave, descripcion: form.descripcion, ...extra };
        try {
            const url = editando ? `${API}/api/catalogos-trafico/${tipo}/${editando}` : `${API}/api/catalogos-trafico/${tipo}`;
            const res = await fetch(url, { method: editando ? "PUT" : "POST", headers: encabezados(), body: JSON.stringify(cuerpo) });
            if (res.ok) {
                setShowModal(false);
                recargar();
            } else {
                setErrorForm(await mensajeError(res));
            }
        } catch {
            setErrorForm("No se pudo conectar con el servidor.");
        }
        setGuardando(false);
    };

    const eliminar = async (r) => {
        if (!confirm(`¿Eliminar «${r.descripcion}» del catálogo?`)) return;
        setAviso("");
        try {
            const res = await fetch(`${API}/api/catalogos-trafico/${tipo}/${r.id}`, { method: "DELETE", headers: encabezados() });
            if (!res.ok) setAviso(await mensajeError(res));
            recargar();
        } catch {
            setAviso("No se pudo conectar con el servidor.");
        }
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 overflow-auto relative w-full min-w-0">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CATÁLOGOS DE TRÁFICO</h1>
                        <p className="text-gray-400 mt-4 text-xl">Tipos y clasificaciones de viaje, grupos de clientes y de unidades, y eventos de viaje</p>
                    </div>
                    {esAdmin && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={abrirNuevo}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                            <FaPlus /> Nuevo registro
                        </motion.button>
                    )}
                </motion.div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {CATALOGOS_TRAFICO.map(c => (
                        <button key={c.slug} onClick={() => cambiarTipo(c.slug)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${tipo === c.slug
                                ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300"
                                : "border-white/10 text-gray-500 hover:text-gray-300"}`}>
                            {c.nombre}
                        </button>
                    ))}
                </div>

                {(aviso || errorCarga) && (
                    <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300 px-6 py-4">
                        <p>{aviso || errorCarga}</p>
                        {aviso && (
                            <button onClick={() => setAviso("")} aria-label="Cerrar aviso" className="text-red-300 hover:text-white"><FaTimes /></button>
                        )}
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-8 flex items-center gap-3"><FaTags /> {catalogo?.nombre}</h2>
                    <TablaCatalogo
                        key={tipo}
                        columnas={catalogo?.abreviacionYColor ? COLUMNAS_EVENTOS : COLUMNAS}
                        filas={registros}
                        esActivo={r => r.activo}
                        nombreArchivo={`catalogo_${tipo}`}
                        vacio="No hay registros en este catálogo"
                        acciones={esAdmin ? (r => (
                            <div className="flex gap-2">
                                <button onClick={() => abrirEdicion(r)} aria-label="Editar registro" className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                <button onClick={() => eliminar(r)} aria-label="Eliminar registro" className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                            </div>
                        )) : undefined}
                    />
                </motion.div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-3xl font-black text-cyan-300">{editando ? "Editar registro" : "Nuevo registro"}</h2>
                                <button onClick={() => setShowModal(false)} aria-label="Cerrar" className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-5">{catalogo?.nombre}</p>
                                <div className="grid gap-5">
                                    <Field label={editando ? "Clave *" : "Clave"}>
                                        <input value={form.clave} onChange={set("clave")} maxLength={20}
                                            placeholder={editando ? "" : "Vacía = siguiente número"} className={inputCls} />
                                    </Field>
                                    <Field label="Descripción *">
                                        <input value={form.descripcion} onChange={set("descripcion")} maxLength={120} className={inputCls} />
                                    </Field>
                                    {catalogo?.abreviacionYColor && (
                                        <div className="grid grid-cols-2 gap-5">
                                            <Field label="Abreviación *">
                                                <input value={form.abreviacion} onChange={set("abreviacion")} maxLength={10}
                                                    placeholder="Por ejemplo LLC" className={inputCls} />
                                            </Field>
                                            <Field label="Color *">
                                                <div className="flex items-center gap-3">
                                                    <input type="color" value={form.color} onChange={set("color")} aria-label="Color del evento"
                                                        className="h-12 w-16 rounded-xl bg-transparent border border-cyan-400/10 cursor-pointer" />
                                                    <ChipEvento abreviacion={form.abreviacion || "ABC"} color={form.color} />
                                                </div>
                                            </Field>
                                        </div>
                                    )}
                                    {editando && (
                                        <Field label="Status">
                                            <select value={form.activo ? "true" : "false"}
                                                onChange={e => setForm(f => ({ ...f, activo: e.target.value === "true" }))} className={selectCls}>
                                                <option value="true">Activo</option>
                                                <option value="false">Inactivo</option>
                                            </select>
                                        </Field>
                                    )}
                                </div>
                            </div>
                            {errorForm && (
                                <div className="mx-8 rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm flex-shrink-0">
                                    {errorForm}
                                </div>
                            )}
                            <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={guardar} disabled={guardando}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {guardando ? "Guardando..." : editando ? "Actualizar" : "Guardar"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
