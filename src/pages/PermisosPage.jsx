import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaShieldAlt, FaCheck, FaSave, FaSync } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const MODULO_LABELS = {
    VIAJES: "Viajes", CARTAS_PORTE: "Cartas Porte", FACTURAS: "Facturas",
    COBRANZA: "Cobranza", CAJAS: "Cajas", LICITACIONES: "Licitaciones",
    LIQUIDACIONES: "Liquidaciones", CLIENTES: "Clientes", OPERADORES: "Operadores",
    VEHICULOS: "Vehiculos", REMITENTES: "Remitentes", DESTINATARIOS: "Destinatarios",
    RUTAS: "Rutas", PROVEEDORES: "Proveedores", REPORTES_MOD: "Reportes",
    BITACORA: "Bitacora", EMPRESA: "Empresa", USUARIOS: "Usuarios y Permisos",
};

const ROLE_COLORS = {
    ADMIN:    "text-purple-300 border-purple-400/30 bg-purple-500/10",
    OPERADOR: "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
    REPORTES: "text-yellow-300 border-yellow-400/30 bg-yellow-500/10",
};

const ACCIONES = [
    { key: "ver",      label: "Ver" },
    { key: "crear",    label: "Crear" },
    { key: "editar",   label: "Editar" },
    { key: "eliminar", label: "Eliminar" },
];

export default function PermisosPage() {
    const [permisos,  setPermisos]  = useState([]);
    const [roles,     setRoles]     = useState([]);
    const [modulos,   setModulos]   = useState([]);
    const [rolActivo, setRolActivo] = useState("ADMIN");
    const [loading,   setLoading]   = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState(null);
    const [dirty,     setDirty]     = useState(false);

    const token = localStorage.getItem("token");
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) };

    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3000); };

    const cargarPermisos = async () => {
        const data = await fetch(API+"/api/permisos", { headers }).then(r => r.json()).catch(() => []);
        setPermisos(Array.isArray(data) ? data : []);
        return Array.isArray(data) ? data : [];
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const meta = await fetch(API+"/api/permisos/metadata", { headers }).then(r => r.json()).catch(() => ({}));
            setRoles(meta.roles || []);
            setModulos(meta.modulos || []);
            const perms = await cargarPermisos();
            if (perms.length === 0) {
                await fetch(API+"/api/permisos/inicializar", { method:"POST", headers });
                await cargarPermisos();
                showMsg(true, "Matriz de permisos inicializada");
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const reinicializar = async () => {
        await fetch(API+"/api/permisos/inicializar", { method:"POST", headers });
        await cargarPermisos();
        showMsg(true, "Permisos reinicializados");
        setDirty(false);
    };

    const getPermiso = (rol, modulo) => permisos.find(p => p.rol === rol && p.modulo === modulo);

    const toggle = (rol, modulo, accion) => {
        setPermisos(ps => ps.map(p => {
            if (p.rol === rol && p.modulo === modulo) {
                const updated = { ...p, [accion]: !p[accion] };
                if (accion === "ver" && !updated.ver) {
                    updated.crear = false;
                    updated.editar = false;
                    updated.eliminar = false;
                }
                if (accion !== "ver" && updated[accion]) {
                    updated.ver = true;
                }
                return updated;
            }
            return p;
        }));
        setDirty(true);
    };

    const guardar = async () => {
        setSaving(true);
        try {
            const res = await fetch(API+"/api/permisos/lote", {
                method:"PUT", headers, body: JSON.stringify(permisos)
            });
            if (res.ok) {
                showMsg(true, "Permisos guardados");
                setDirty(false);
            } else {
                showMsg(false, "Error al guardar");
            }
        } catch(e) { showMsg(false, "Error de conexion"); }
        setSaving(false);
    };

    const esAdmin = rolActivo === "ADMIN";

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />
                <div className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">PERMISOS</h1>
                        <p className="text-gray-400 mt-4 text-xl">Control de acceso por rol y modulo</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={reinicializar} className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all text-sm font-bold">
                            <FaSync /> Reinicializar
                        </button>
                        <button onClick={guardar} disabled={saving || !dirty} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-40">
                            <FaSave /> {saving ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </div>

                {msg && (
                    <div className={"mb-4 px-5 py-3 rounded-xl text-sm font-bold "+(msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300")}>
                        {msg.txt}
                    </div>
                )}

                <div className="flex gap-3 mb-6">
                    {roles.map(rol => (
                        <button key={rol} onClick={() => setRolActivo(rol)}
                            className={"px-6 py-3 rounded-2xl font-bold text-sm transition-all border "+(rolActivo === rol ? (ROLE_COLORS[rol]||"text-cyan-300 border-cyan-400/30 bg-cyan-500/10") : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10")}>
                            {rol}
                        </button>
                    ))}
                </div>

                {esAdmin && (
                    <div className="mb-6 px-5 py-3 rounded-xl bg-purple-500/10 border border-purple-400/20 text-purple-300 text-sm font-bold flex items-center gap-2">
                        <FaShieldAlt /> El rol ADMIN siempre tiene acceso total y no se puede modificar.
                    </div>
                )}

                {loading ? (
                    <p className="text-gray-500 text-center py-10">Cargando permisos...</p>
                ) : (
                    <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    <th className="pb-4 pr-4">Modulo</th>
                                    {ACCIONES.map(a => <th key={a.key} className="pb-4 px-4 text-center">{a.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {modulos.map(modulo => {
                                    const p = getPermiso(rolActivo, modulo);
                                    if (!p) return null;
                                    return (
                                        <tr key={modulo} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                            <td className="py-4 pr-4 font-bold text-white">{MODULO_LABELS[modulo] || modulo}</td>
                                            {ACCIONES.map(a => (
                                                <td key={a.key} className="py-4 px-4 text-center">
                                                    <button
                                                        disabled={esAdmin}
                                                        onClick={() => toggle(rolActivo, modulo, a.key)}
                                                        className={"w-8 h-8 rounded-lg border flex items-center justify-center mx-auto transition-all "+(p[a.key] ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300" : "bg-white/5 border-white/10 text-transparent hover:border-white/20")+" "+(esAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}>
                                                        <FaCheck size={12} />
                                                    </button>
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}










