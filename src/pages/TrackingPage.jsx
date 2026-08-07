import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaSatellite, FaTruck, FaRoute, FaWifi, FaPlus, FaTimes, FaMapMarkerAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:8081";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const truckIcon = L.divIcon({
    className: "",
    html: `<div style="background:#06b6d4;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 15px rgba(6,182,212,0.8)">🚛</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18]
});

const origenIcon = L.divIcon({
    className: "",
    html: `<div style="background:#22c55e;border:3px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 10px rgba(34,197,94,0.8)">📦</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15]
});

const destinoIcon = L.divIcon({
    className: "",
    html: `<div style="background:#f59e0b;border:3px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 10px rgba(245,158,11,0.8)">🏁</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15]
});

function DraggableMarker({ position, icon, label, onDrag }) {
    const markerRef = useRef(null);
    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker) {
                const pos = marker.getLatLng();
                onDrag([pos.lat, pos.lng]);
            }
        }
    };
    return (
        <Marker position={position} icon={icon} draggable={true} eventHandlers={eventHandlers} ref={markerRef}>
            <Popup>{label}</Popup>
        </Marker>
    );
}

function RutaLinea({ origen, destino }) {
    if (!origen || !destino) return null;
    return <Polyline positions={[origen, destino]} color="#06b6d4" weight={5} opacity={0.8} dashArray="10, 5" />;
}

const emptyForm = { vehicleId: "", latitude: "", longitude: "", speed: "", status: "En ruta" };

export default function TrackingPage() {
    const [locations,  setLocations]  = useState([]);
    const [viajes,     setViajes]     = useState([]);
    const [vehicles,   setVehicles]   = useState([]);
    const [showModal,  setShowModal]  = useState(false);
    const [form,       setForm]       = useState(emptyForm);
    const [loading,    setLoading]    = useState(false);
    const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
    const [origenPos,  setOrigenPos]  = useState(null);
    const [destinoPos, setDestinoPos] = useState(null);

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [loc, vj, vh] = await Promise.all([
                fetch(`${API}/ubicaciones`, { headers }).then(r => r.json()),
                fetch(`${API}/orders`, { headers }).then(r => r.json()),
                fetch(`${API}/vehicles`, { headers }).then(r => r.json()),
            ]);
            setLocations(Array.isArray(loc) ? loc : []);
            setViajes(Array.isArray(vj) ? vj : []);
            setVehicles(Array.isArray(vh) ? vh : []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 5000);
        return () => clearInterval(interval);
    }, []);

    const seleccionarViaje = (viaje) => {
        setViajeSeleccionado(viaje);
        setOrigenPos([25.6866, -100.3161]);
        setDestinoPos([25.4232, -100.9963]);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const vehiculo = vehicles.find(v => String(v.id) === String(form.vehicleId));
            await fetch(`${API}/ubicaciones`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ...form,
                    vehicleId:   Number(form.vehicleId),
                    vehicleName: vehiculo ? `${vehiculo.plate} — ${vehiculo.brand}` : "",
                    latitude:    Number(form.latitude),
                    longitude:   Number(form.longitude),
                    speed:       Number(form.speed),
                }),
            });
            setShowModal(false);
            setForm(emptyForm);
            fetchAll();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const enRuta     = locations.filter(l => l.status === "En ruta").length;
    const disponible = locations.filter(l => l.status === "Disponible").length;
    const center     = origenPos || (locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [25.6866, -100.3161]);

    return (
        <div className="flex bg-[#020617] min-h-screen text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
                <Topbar />

                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">TRACKING GPS</h1>
                        <p className="text-gray-400 mt-3 text-xl">Monitoreo logístico en tiempo real</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowModal(true)}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Agregar Vehículo GPS
                    </motion.button>
                </motion.div>

                <div className="grid grid-cols-4 gap-6 mb-8">
                    {[
                        { label: "Total",        value: locations.length, icon: <FaTruck /> },
                        { label: "En Ruta",      value: enRuta,           icon: <FaRoute /> },
                        { label: "Disponibles",  value: disponible,       icon: <FaSatellite /> },
                        { label: "Conectividad", value: "98%",            icon: <FaWifi /> },
                    ].map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className="bg-white/5 border border-cyan-500/20 rounded-3xl p-6 flex items-center gap-4">
                            <div className="text-cyan-400 text-3xl">{k.icon}</div>
                            <div><p className="text-gray-400 text-sm">{k.label}</p><p className="text-4xl font-black text-cyan-400">{k.value}</p></div>
                        </motion.div>
                    ))}
                </div>

                {/* Selector de viaje */}
                <div className="mb-6 flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-gray-400 text-sm mb-2 block">Ver ruta de viaje en el mapa:</label>
                        <select onChange={e => {
                            const v = viajes.find(vj => String(vj.id) === e.target.value);
                            if (v) seleccionarViaje(v);
                            else { setViajeSeleccionado(null); setOrigenPos(null); setDestinoPos(null); }
                        }}
                            className="w-full bg-[#020617] border border-cyan-400/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all">
                            <option value="">Seleccionar viaje...</option>
                            {viajes.map(v => (
                                <option key={v.id} value={v.id}>
                                    #{v.id} — {v.clienteNombre || "Sin cliente"} | {v.origen || "?"} → {v.destino || "?"}
                                </option>
                            ))}
                        </select>
                    </div>
                    {viajeSeleccionado && (
                        <div className="flex gap-4 text-sm pb-1">
                            <span className="text-green-400">📦 Origen: arrastrable</span>
                            <span className="text-yellow-400">🏁 Destino: arrastrable</span>
                            <span className="text-cyan-400">〰️ Ruta: línea directa</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-8">
                    {/* MAPA */}
                    <div className="col-span-2 bg-white/5 border border-cyan-500/20 rounded-3xl overflow-hidden h-[600px]">
                        <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© OpenStreetMap contributors' />

                            {/* Vehículos en tiempo real */}
                            {locations.map(loc =>
                                loc.latitude && loc.longitude &&
                                <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={truckIcon}>
                                    <Popup>
                                        <div style={{ color: "#000", minWidth: "150px" }}>
                                            <strong>🚛 {loc.vehicleName}</strong><br />
                                            Estado: {loc.status}<br />
                                            Velocidad: {loc.speed} km/h<br />
                                            <span style={{ fontSize: "11px", color: "#666" }}>
                                                {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                                            </span>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            {/* Marcadores arrastrables */}
                            {origenPos && (
                                <DraggableMarker
                                    position={origenPos}
                                    icon={origenIcon}
                                    label={`📦 Origen: ${viajeSeleccionado?.origen || ""}`}
                                    onDrag={setOrigenPos}
                                />
                            )}
                            {destinoPos && (
                                <DraggableMarker
                                    position={destinoPos}
                                    icon={destinoIcon}
                                    label={`🏁 Destino: ${viajeSeleccionado?.destino || ""}`}
                                    onDrag={setDestinoPos}
                                />
                            )}

                            {/* Línea de ruta */}
                            <RutaLinea origen={origenPos} destino={destinoPos} />
                        </MapContainer>
                    </div>

                    {/* PANEL LATERAL */}
                    <div className="bg-white/5 border border-cyan-500/20 rounded-3xl p-6 overflow-auto h-[600px]">
                        <h2 className="text-2xl font-black text-cyan-300 mb-6 flex items-center gap-2">
                            <FaMapMarkerAlt /> Vehículos Activos
                        </h2>

                        {viajeSeleccionado && (
                            <div className="mb-4 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/20">
                                <p className="text-cyan-300 font-bold text-sm">Viaje #{viajeSeleccionado.id}</p>
                                <p className="text-gray-400 text-xs">{viajeSeleccionado.clienteNombre}</p>
                                <p className="text-gray-300 text-xs mt-1">{viajeSeleccionado.origen} → {viajeSeleccionado.destino}</p>
                                <p className="text-gray-500 text-xs mt-1">{viajeSeleccionado.driverNombre} | {viajeSeleccionado.vehiclePlacas}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            {locations.length === 0 && (
                                <p className="text-gray-500 text-center mt-10">Sin vehículos en tracking</p>
                            )}
                            {locations.map(loc => (
                                <motion.div key={loc.id} whileHover={{ scale: 1.02 }}
                                    className="p-4 rounded-2xl bg-black/20 border border-cyan-400/10">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold">🚛 {loc.vehicleName}</h3>
                                            <p className="text-gray-400 text-sm mt-1">{loc.speed} km/h</p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                            loc.status === "En ruta"
                                                ? "text-cyan-300 bg-cyan-500/10 border-cyan-400/30"
                                                : "text-green-300 bg-green-500/10 border-green-400/30"
                                        }`}>{loc.status}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-6">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-[#020617] border border-cyan-400/20 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-cyan-300">Agregar Vehículo GPS</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl"><FaTimes /></button>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Vehículo del catálogo</label>
                                    <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                                        className="w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none">
                                        <option value="">Seleccionar vehículo...</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                                    </select>
                                </div>
                                {[
                                    { label: "Latitud",        key: "latitude",  placeholder: "25.6866" },
                                    { label: "Longitud",       key: "longitude", placeholder: "-100.3161" },
                                    { label: "Velocidad km/h", key: "speed",     placeholder: "80" },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="text-gray-400 text-sm mb-2 block">{f.label}</label>
                                        <input type="number" value={form[f.key]} placeholder={f.placeholder}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            className="w-full bg-white/5 border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                                    </div>
                                ))}
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Estado</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-5 py-3 text-white outline-none">
                                        <option>En ruta</option>
                                        <option>Disponible</option>
                                        <option>Detenido</option>
                                    </select>
                                </div>
                                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-400/10">
                                    <p className="text-cyan-400 text-xs">💡 Tip: Abre Google Maps, haz clic derecho en el punto y copia las coordenadas.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">Cancelar</button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                                    className="flex-1 py-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all">
                                    {loading ? "Guardando..." : "Guardar"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}