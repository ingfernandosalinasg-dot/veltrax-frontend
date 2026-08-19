import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaPlus, FaTimes, FaCheck, FaTrash, FaEdit, FaPills } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";
const inputCls  = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const CATEGORIAS = ["Medicamento","Material de Curacion","Equipo Medico","Laboratorio","Consumible","Otro"];
const UNIDADES   = ["Pieza","Caja","Frasco","Ampolleta","Tableta","Capsula","Litro","Kilogramo","Paquete","Kit"];

const emptyForm = { clave:"", descripcion:"", marca:"", categoria:"Medicamento", unidad:"Pieza", precioReferencia:"", registroSanitario:"", notas:"" };

export default function CatalogoArticulosPage() {
    const [articulos,  setArticulos]  = useState([]);
    const [showModal,  setShowModal]  = useState(false);
    const [editando,   setEditando]   = useState(null);
    const [form,       setForm]       = useState({ ...emptyForm });
    const [loading,    setLoading]    = useState(false);
    const [msg,        setMsg]        = useState(null);
    const [busqueda,   setBusqueda]   = useState("");
    const [filtCat,    setFiltCat]    = useState("");

    const token   = localStorage.getItem("token");
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:"Bearer "+token }) };

    const fetchAll = async () => {
        try {
            const data = await fetch(API+"/api/articulos", { headers }).then(r => r.json());
            setArticulos(Array.isArray(data) ? data : []);
        } catch(e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3000); };
    const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const openNew = () => { setEditando(null); setForm({ ...emptyForm }); setShowModal(true); };

    const openEdit = (a) => {
        setEditando(a.id);
        setForm({ clave:a.clave||"", descripcion:a.descripcion||"", marca:a.marca||"", categoria:a.categoria||"Medicamento", unidad:a.unidad||"Pieza", precioReferencia:a.precioReferencia||"", registroSanitario:a.registroSanitario||"", notas:a.notas||"" });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.descripcion) { showMsg(false, "La descripcion es requerida"); return; }
        setLoading(true);
        try {
            const url    = editando ? API+"/api/articulos/"+editando : API+"/api/articulos";
            const method = editando ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify({ ...form, precioReferencia: form.precioReferencia ? Number(form.precioReferencia) : null }) });
            if (res.ok) {
                showMsg(true, editando ? "Articulo actualizado" : "Articulo registrado");
                setShowModal(false);
                fetchAll();
            } else showMsg(false, "Error al guardar");
        } catch { showMsg(false, "Error de conexion"); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Eliminar este articulo?")) return;
        await fetch(API+"/api/articulos/"+id, { method:"DELETE", headers });
        fetchAll();
    };

    const filtrados = articulos
        .filter(a => !filtCat || a.categoria === filtCat)
        .filter(a => !busqueda ||
            a.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.clave?.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.marca?.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.registroSanitario?.toLowerCase().includes(busqueda.toLowerCase()));

    const fmt = n => n ? "$"+Number(n).toLocaleString("es-MX", { minimumFractionDigits:2 }) : "-";

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />

                <div className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CATALOGO</h1>
                        <p className="text-gray-400 mt-4 text-xl">Articulos para licitaciones y ordenes de compra</p>
                    </div>
                    <button onClick={openNew} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Articulo
                    </button>
                </div>

                {msg && <div className={"mb-4 px-5 py-3 rounded-xl text-sm font-bold "+(msg.ok?"bg-green-500/10 border border-green-400/30 text-green-300":"bg-red-500/10 border border-red-400/30 text-red-300")}>{msg.txt}</div>}

                <div className="grid grid-cols-4 gap-4 mb-8">
                    {CATEGORIAS.slice(0,4).map(cat => (
                        <motion.div key={cat} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                            className="rounded-2xl bg-white/5 border border-cyan-400/10 p-5 flex items-center gap-4">
                            <FaPills className="text-3xl text-purple-300" />
                            <div>
                                <p className="text-gray-400 text-xs">{cat}</p>
                                <h2 className="text-2xl font-black text-white">{articulos.filter(a => a.categoria===cat).length}</h2>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex gap-3 mb-6 flex-wrap">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar por descripcion, clave, marca, registro..."
                        className="bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm w-80" />
                    <select value={filtCat} onChange={e => setFiltCat(e.target.value)} className="bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2 text-white outline-none text-sm">
                        <option value="">Todas las categorias</option>
                        {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                {["Clave","Descripcion","Marca","Categoria","Unidad","Precio Ref.","Reg. Sanitario","Acciones"].map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-500">No hay articulos registrados</td></tr>}
                            {filtrados.map((a,i) => (
                                <motion.tr key={a.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                                    className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                    <td className="py-4 pr-4 font-mono text-cyan-300 text-sm">{a.clave||"-"}</td>
                                    <td className="py-4 pr-4 text-white font-bold max-w-xs"><p className="truncate">{a.descripcion}</p></td>
                                    <td className="py-4 pr-4 text-gray-300 text-sm">{a.marca||"-"}</td>
                                    <td className="py-4 pr-4">
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/20 text-purple-300 text-xs font-bold">{a.categoria||"-"}</span>
                                    </td>
                                    <td className="py-4 pr-4 text-gray-400 text-sm">{a.unidad||"-"}</td>
                                    <td className="py-4 pr-4 text-green-300 font-bold">{fmt(a.precioReferencia)}</td>
                                    <td className="py-4 pr-4 text-gray-400 text-sm font-mono">{a.registroSanitario||"-"}</td>
                                    <td className="py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(a)} className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit size={12}/></button>
                                            <button onClick={() => handleDelete(a.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash size={12}/></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                                <h2 className="text-2xl font-black text-cyan-300">{editando ? "Editar Articulo" : "Nuevo Articulo"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-gray-400 text-sm mb-2 block">Clave</label><input value={form.clave} onChange={setF("clave")} className={inputCls} placeholder="MED-001" /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Categoria</label>
                                        <select value={form.categoria} onChange={setF("categoria")} className={selectCls}>
                                            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Descripcion *</label><input value={form.descripcion} onChange={setF("descripcion")} className={inputCls} placeholder="Nombre completo del articulo" /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Marca</label><input value={form.marca} onChange={setF("marca")} className={inputCls} placeholder="Laboratorio o fabricante" /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Unidad</label>
                                        <select value={form.unidad} onChange={setF("unidad")} className={selectCls}>
                                            {UNIDADES.map(u => <option key={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Precio de Referencia ($)</label><input type="number" value={form.precioReferencia} onChange={setF("precioReferencia")} className={inputCls} placeholder="0.00" /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Registro Sanitario</label><input value={form.registroSanitario} onChange={setF("registroSanitario")} className={inputCls} placeholder="COFEPRIS-XXXX" /></div>
                                    <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Notas</label><input value={form.notas} onChange={setF("notas")} className={inputCls} placeholder="Observaciones, presentacion, concentracion..." /></div>
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-0 flex-shrink-0">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-bold">Cancelar</button>
                                <button onClick={handleSubmit} disabled={loading} className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? "Guardando..." : editando ? "Actualizar" : "Registrar"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}









