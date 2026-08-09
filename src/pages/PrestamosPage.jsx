import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { FaPlus, FaTimes, FaCheck, FaTrash, FaEdit, FaMoneyBillWave,
         FaUserTie, FaHistory } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'https://veltrax-api-production.up.railway.app';

const inputCls  = 'w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm';
const selectCls = 'w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm';

const statusColor = s => {
    if (s === 'PAGADO')    return 'text-green-300 bg-green-500/10 border-green-400/30';
    if (s === 'CANCELADO') return 'text-red-300 bg-red-500/10 border-red-400/30';
    return 'text-yellow-300 bg-yellow-500/10 border-yellow-400/30';
};

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const emptyForm = { driverId: '', montoTotal: '', motivo: '', fechaOtorgamiento: '', notas: '' };

export default function PrestamosPage() {
    const [prestamos,  setPrestamos]  = useState([]);
    const [drivers,    setDrivers]    = useState([]);
    const [showModal,  setShowModal]  = useState(false);
    const [editando,   setEditando]   = useState(null);
    const [form,       setForm]       = useState({ ...emptyForm });
    const [loading,    setLoading]    = useState(false);
    const [msg,        setMsg]        = useState(null);

    const [showAbonos,   setShowAbonos]   = useState(false);
    const [prestamoSel,  setPrestamoSel]  = useState(null);
    const [abonos,       setAbonos]       = useState([]);
    const [abonoMonto,   setAbonoMonto]   = useState('');
    const [abonoFecha,   setAbonoFecha]   = useState(new Date().toISOString().slice(0, 10));
    const [loadingAbono, setLoadingAbono] = useState(false);

    const [filtroDriver, setFiltroDriver] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    const token   = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [p, d] = await Promise.all([
                fetch(`${API}/prestamos`, { headers }).then(r => r.json()),
                fetch(`${API}/drivers`, { headers }).then(r => r.json()),
            ]);
            setPrestamos(Array.isArray(p) ? p : []);
            setDrivers(Array.isArray(d) ? d : []);
        } catch(e) { console.error(e); }
    };

    const fetchAbonos = async (id) => {
        try {
            const data = await fetch(`${API}/prestamos/${id}/abonos`, { headers }).then(r => r.json());
            setAbonos(Array.isArray(data) ? data : []);
        } catch(e) { setAbonos([]); }
    };

    useEffect(() => { fetchAll(); }, []);

    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 3000); };
    const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const openNew = () => {
        setEditando(null);
        setForm({ ...emptyForm, fechaOtorgamiento: new Date().toISOString().slice(0, 10) });
        setShowModal(true);
    };

    const openEdit = (p) => {
        setEditando(p.id);
        setForm({ driverId: p.driverId || '', montoTotal: p.montoTotal || '', motivo: p.motivo || '', fechaOtorgamiento: p.fechaOtorgamiento || '', notas: p.notes || '' });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.driverId || !form.montoTotal) { showMsg(false, 'Operador y monto son requeridos'); return; }
        setLoading(true);
        try {
            const url    = editando ? `${API}/prestamos/${editando}` : `${API}/prestamos`;
            const method = editando ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify({ ...form, montoTotal: Number(form.montoTotal) }) });
            if (res.ok) {
                showMsg(true, editando ? 'Préstamo actualizado': 'Préstamo registrado');setShowModal(false);
                fetchAll();
            } else {
                showMsg(false, 'Error al guardar');
            }
        } catch(e) { showMsg(false, 'Error de conexi贸n'); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('驴Eliminar este pr茅stamo?')) return;
        await fetch(`${API}/prestamos/${id}`, { method: 'DELETE', headers });
        fetchAll();
    };

    const abrirAbonos = (p) => {
        setPrestamoSel(p);
        fetchAbonos(p.id);
        setAbonoMonto('');
        setAbonoFecha(new Date().toISOString().slice(0, 10));
        setShowAbonos(true);
    };

    const registrarAbono = async () => {
        if (!abonoMonto || Number(abonoMonto) <= 0) { showMsg(false, 'Ingresa un monto v谩lido'); return; }
        setLoadingAbono(true);
        try {
            const res = await fetch(`${API}/prestamos/${prestamoSel.id}/abonar`, {
                method: 'POST', headers,
                body: JSON.stringify({ monto: Number(abonoMonto), fecha: abonoFecha })
            });
            if (res.ok) {
                showMsg(true, 'Abono registrado');setAbonoMonto('');
                fetchAbonos(prestamoSel.id);
                fetchAll();
            } else { showMsg(false, 'Error al registrar abono'); }
        } catch(e) { showMsg(false, 'Error de conexi贸n'); }
        setLoadingAbono(false);
    };

    const prestFiltrados = prestamos
        .filter(p => filtroStatus === 'TODOS' || p.status === filtroStatus)
        .filter(p => !filtroDriver || String(p.driverId) === filtroDriver);

    const totalPrestado  = prestamos.reduce((s, p) => s + (p.montoTotal || 0), 0);
    const totalPendiente = prestamos.filter(p => p.status === 'ACTIVO').reduce((s, p) => s + (p.saldoPendiente || 0), 0);
    const totalPagado    = prestamos.filter(p => p.status === 'PAGADO').length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />

                <div className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">PR脡STAMOS</h1>
                        <p className="text-gray-400 mt-4 text-xl">Anticipos y pr茅stamos a operadores</p>
                    </div>
                    <button onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nuevo Pr茅stamo
                    </button>
                </div>

                {msg && (
                    <div className={`mb-4 px-5 py-3 rounded-xl text-sm font-bold ${msg.ok ? 'bg-green-500/10 border border-green-400/30 text-green-300' : 'bg-red-500/10 border border-red-400/30 text-red-300'}`}>
                        {msg.txt}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    {[
                        { label: 'Total Prestado',    value: fmt(totalPrestado),  color: 'text-cyan-300',   icon: <FaMoneyBillWave /> },
                        { label: 'Saldo Pendiente',   value: fmt(totalPendiente), color: 'text-yellow-300', icon: <FaMoneyBillWave /> },
                        { label: 'Pr茅stamos Pagados', value: totalPagado,         color: 'text-green-300',  icon: <FaCheck /> },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-3xl bg-white/5 border border-cyan-400/10 p-6 flex items-center gap-5">
                            <div className={`text-4xl ${s.color}`}>{s.icon}</div>
                            <div>
                                <p className="text-gray-400 text-sm">{s.label}</p>
                                <h2 className={`text-2xl font-black ${s.color}`}>{s.value}</h2>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex gap-4 mb-6">
                    <select value={filtroDriver} onChange={e => setFiltroDriver(e.target.value)} className="bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-2 text-white text-sm outline-none">
                        <option value="">Todos los operadores</option>
                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ''}</option>)}
                    </select>
                    {['TODOS','ACTIVO','PAGADO','CANCELADO'].map(s => (
                        <button key={s} onClick={() => setFiltroStatus(s)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filtroStatus === s ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Tabla */}
                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                {['Folio','Operador','Monto Total','Saldo Pendiente','Motivo','Fecha','Status','Acciones']
                                    .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {prestFiltrados.length === 0 && (
                                <tr><td colSpan={8} className="py-10 text-center text-gray-500">No hay pr茅stamos registrados</td></tr>
                            )}
                            {prestFiltrados.map((p, i) => (
                                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                    <td className="py-4 pr-4 font-bold text-cyan-300">{p.folio}</td>
                                    <td className="py-4 pr-4 text-white">
                                        <div className="flex items-center gap-2">
                                            <FaUserTie className="text-cyan-400" />
                                            {p.driverNombre ? p.driverNombre : ''}
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4 text-green-300 font-bold">{fmt(p.montoTotal)}</td>
                                    <td className="py-4 pr-4">
                                        <span className={`font-bold ${p.saldoPendiente > 0 ? 'text-yellow-300' : 'text-green-300'}`}>
                                            {fmt(p.saldoPendiente)}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4 text-gray-300 text-sm">{p.motivo ? p.motivo : ''}</td>
                                    <td className="py-4 pr-4 text-gray-400 text-sm">{p.fechaOtorgamiento ? p.fechaOtorgamiento : ''}</td>
                                    <td className="py-4 pr-4">
                                        <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusColor(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => abrirAbonos(p)}
                                                className="p-2 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 hover:bg-green-500/20 transition-all"
                                                title="Abonos">
                                                <FaHistory size={12} />
                                            </button>
                                            <button onClick={() => openEdit(p)}
                                                className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all">
                                                <FaEdit size={12} />
                                            </button>
                                            <button onClick={() => handleDelete(p.id)}
                                                className="p-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all">
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PANEL ABONOS */}
            <AnimatePresence>
                {showAbonos && prestamoSel && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25 }}
                        className="fixed right-0 top-0 h-full w-[420px] bg-[#020617] border-l border-cyan-400/20 z-50 flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-cyan-400/10 flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-cyan-300">Abonos - {prestamoSel.folio}</h2>
                                <p className="text-gray-400 text-sm mt-1">{prestamoSel.driverNombre}</p>
                                <div className="flex gap-4 mt-2">
                                    <span className="text-xs text-gray-500">Total: <span className="text-white font-bold">{fmt(prestamoSel.montoTotal)}</span></span>
                                    <span className="text-xs text-gray-500">Pendiente: <span className="text-yellow-300 font-bold">{fmt(prestamoSel.saldoPendiente)}</span></span>
                                </div>
                            </div>
                            <button onClick={() => setShowAbonos(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                        </div>

                        {/* Barra de progreso */}
                        <div className="px-6 py-4 flex-shrink-0">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Pagado</span>
                                <span>{Math.round(((prestamoSel.montoTotal - prestamoSel.saldoPendiente) / prestamoSel.montoTotal) * 100)}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((prestamoSel.montoTotal - prestamoSel.saldoPendiente) / prestamoSel.montoTotal) * 100)}%` }} />
                            </div>
                        </div>

                        {/* Nuevo abono */}
                        {prestamoSel.status === 'ACTIVO' && (
                            <div className="px-6 pb-4 flex-shrink-0 space-y-3 border-b border-cyan-400/10">
                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Registrar Abono</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Monto</label>
                                        <input type="number" value={abonoMonto} onChange={e => setAbonoMonto(e.target.value)}
                                            className={inputCls} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Fecha</label>
                                        <input type="date" value={abonoFecha} onChange={e => setAbonoFecha(e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                                <button onClick={registrarAbono} disabled={loadingAbono}
                                    className="w-full py-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2">
                                    <FaCheck /> {loadingAbono ? 'Registrando...' : 'Registrar Abono'}
                                </button>
                            </div>
                        )}

                        {/* Historial */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Historial de Abonos</p>
                            {abonos.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Sin abonos registrados</p>}
                            {abonos.map((a, i) => (
                                <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-green-300 font-black">{fmt(a.monto)}</p>
                                            <p className="text-gray-500 text-xs mt-1">{a.fecha}</p>
                                        </div>
                                        {a.liquidacionFolio && (
                                            <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">
                                                {a.liquidacionFolio}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL NUEVO/EDITAR */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-lg">
                            <div className="flex justify-between items-center p-8 pb-0">
                                <h2 className="text-2xl font-black text-cyan-300">{editando ? 'Editar Pr茅stamo' : 'Nuevo Pr茅stamo'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                            </div>
                            <div className="p-8 space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Operador</label>
                                    <select value={form.driverId} onChange={setF('driverId')} className={selectCls}>
                                        <option value="">Seleccionar operador...</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.apellidos || ''}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Monto Total ($)</label>
                                    <input type="number" value={form.montoTotal} onChange={setF('montoTotal')} className={inputCls} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Motivo</label>
                                    <input value={form.motivo} onChange={setF('motivo')} className={inputCls} placeholder="Anticipo, emergencia, equipo..." />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Fecha de Otorgamiento</label>
                                    <input type="date" value={form.fechaOtorgamiento} onChange={setF('fechaOtorgamiento')} className={inputCls} />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Notas</label>
                                    <input value={form.notas} onChange={setF('notas')} className={inputCls} placeholder="Observaciones..." />
                                </div>
                            </div>
                            <div className="flex gap-4 p-8 pt-0">
                                <button onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <button onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                    <FaCheck /> {loading ? 'Guardando...' : editando ? 'Actualizar' : 'Registrar'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}










