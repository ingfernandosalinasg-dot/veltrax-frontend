import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaUserShield, FaPlus, FaTimes, FaCheck, FaTrash, FaEdit, FaToggleOn, FaToggleOff } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";

const ROLE_COLORS = {
    ADMIN:    "text-purple-300 bg-purple-500/10 border-purple-400/30",
    OPERADOR: "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    REPORTES: "text-yellow-300 bg-yellow-500/10 border-yellow-400/30",
};

const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all";

const emptyForm = { name:"", email:"", password:"", role:"OPERADOR", activo:true };

export default function UsuariosPage() {
    const [usuarios,  setUsuarios]  = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editando,  setEditando]  = useState(null);
    const [form,      setForm]      = useState(emptyForm);
    const [loading,   setLoading]   = useState(false);
    const [msg,       setMsg]       = useState(null);

    const token = localStorage.getItem("token");
    const myEmail = localStorage.getItem("email");
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) };

    const fetchAll = async () => {
        try {
            const r = await fetch(API+"/api/usuarios", { headers });
            const data = await r.json();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch(e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3000); };

    const openNew = () => { setEditando(null); setForm(emptyForm); setShowModal(true); };

    const openEdit = (u) => {
        setEditando(u.id);
        setForm({ name: u.name, email: u.email, password: "", role: u.role, activo: u.activo !== false });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.email) { showMsg(false, "Nombre y email son requeridos"); return; }
        if (!editando && (!form.password || form.password.length < 6)) { showMsg(false, "La Contraseña debe tener al menos 6 caracteres"); return; }
        setLoading(true);
        try {
            const url    = editando ? API+"/api/usuarios/"+editando : API+"/api/usuarios";
            const method = editando ? "PUT" : "POST";
            const body = { ...form };
            if (editando && !body.password) delete body.password;
            const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) { showMsg(false, data.error || "Error al guardar"); }
            else { showMsg(true, editando ? "Usuario actualizado" : "Usuario creado"); setShowModal(false); fetchAll(); }
        } catch(e) { showMsg(false, "Error de conexion"); }
        setLoading(false);
    };

    const handleDelete = async (u) => {
        if (u.email === myEmail) { showMsg(false, "No puedes eliminar tu propio usuario"); return; }
        if (!confirm("Eliminar al usuario "+u.name+"?")) return;
        await fetch(API+"/api/usuarios/"+u.id, { method:"DELETE", headers });
        fetchAll();
    };

    const toggleActivo = async (u) => {
        if (u.email === myEmail) { showMsg(false, "No puedes desactivarte a ti mismo"); return; }
        await fetch(API+"/api/usuarios/"+u.id, { method:"PUT", headers, body: JSON.stringify({ activo: !u.activo }) });
        fetchAll();
    };

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />
                <div className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">USUARIOS</h1>
                        <p className="text-gray-400 mt-4 text-xl">Gestion de usuarios y roles del sistema</p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Usuario
                    </button>
                </div>

                {msg && (
                    <div className={"mb-4 px-5 py-3 rounded-xl text-sm font-bold "+(msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300")}>
                        {msg.txt}
                    </div>
                )}

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                {["Nombre","Email","Rol","Status","Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-500">No hay usuarios registrados</td></tr>}
                            {usuarios.map(u => (
                                <tr key={u.id} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                    <td className="py-4 pr-4 font-bold text-white">
                                        <div className="flex items-center gap-2">
                                            <FaUserShield className="text-cyan-400" /> {u.name}
                                            {u.email === myEmail && <span className="text-xs text-gray-500">(tu)</span>}
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4 text-gray-300">{u.email}</td>
                                    <td className="py-4 pr-4">
                                        <span className={"px-3 py-1 rounded-full border text-sm font-bold "+(ROLE_COLORS[u.role]||"text-gray-300 bg-white/5 border-white/10")}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <button onClick={() => toggleActivo(u)} className={"flex items-center gap-2 text-sm font-bold "+(u.activo !== false ? "text-green-300" : "text-gray-500")}>
                                            {u.activo !== false ? <FaToggleOn size={20} /> : <FaToggleOff size={20} />}
                                            {u.activo !== false ? "Activo" : "Inactivo"}
                                        </button>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(u)} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                            <button onClick={() => handleDelete(u)} className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-8 pb-0">
                            <h2 className="text-2xl font-black text-cyan-300">{editando ? "Editar Usuario" : "Nuevo Usuario"}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Nombre</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Nombre completo" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="correo@veltrax.com" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Contraseña {editando && <span className="text-gray-500">(dejar vacio para no cambiar)</span>}</label>
                                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} placeholder={editando ? "..." : "Minimo 6 caracteres"} />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Rol</label>
                                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={selectCls}>
                                    <option value="ADMIN">ADMIN - Acceso total</option>
                                    <option value="OPERADOR">OPERADOR - Lectura y escritura</option>
                                    <option value="REPORTES">REPORTES - Solo lectura</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4" />
                                <span className="text-gray-300">Usuario activo</span>
                            </label>
                        </div>
                        <div className="flex gap-4 p-8 pt-0">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Crear Usuario"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}










