import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import {
    FaFileAlt, FaPlus, FaTrash, FaEdit, FaFilePdf, FaTimes, FaCheck,
    FaExclamationTriangle, FaTruck, FaMapMarkerAlt, FaUser, FaBox, FaSearch
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const estadoColor = {
    "Activa":      "text-cyan-300 bg-cyan-500/10 border-cyan-400/30",
    "En Tr谩nsito": "text-blue-300 bg-blue-500/10 border-blue-400/30",
    "Entregada":   "text-green-300 bg-green-500/10 border-green-400/30",
    "Cancelada":   "text-red-300 bg-red-500/10 border-red-400/30",
};

const TIPOS_CARTA  = ["CMR - Carretera Internacional","CIM - Ferroviario","AWB - A茅reo","Bill of Lading - Mar铆timo","Nacional"];
const FORMAS_PAGO  = ["Contado","Cr茅dito 30 d铆as","Cr茅dito 60 d铆as","Contra entrega"];
const MONEDAS      = ["MXN","USD","EUR"];
const ESTADOS_MERC = ["Bueno","Regular","Con da帽os visibles"];

const TABS = [
    { id:"encabezado",    label:"Encabezado",    icon:<FaFileAlt /> },
    { id:"remitente",     label:"Remitente",     icon:<FaUser /> },
    { id:"destinatario",  label:"Destinatario",  icon:<FaMapMarkerAlt /> },
    { id:"transportista", label:"Transportista", icon:<FaTruck /> },
    { id:"ruta",          label:"Ruta",          icon:<FaMapMarkerAlt /> },
    { id:"mercancias",    label:"Mercanc铆as",    icon:<FaBox /> },
    { id:"condiciones",   label:"Condiciones",   icon:<FaFileAlt /> },
    { id:"obs",           label:"Observaciones", icon:<FaFileAlt /> },
];

const emptyMerc = {
    descripcion:"", claveProdServ:"", claveProdServDesc:"",
    cantidad:"", claveUnidad:"", claveUnidadDesc:"", peso:"", volumen:"",
    valor:"", marcas:"", claveEmbalaje:"", claveEmbalajeDesc:"",
    estadoMercancia:"Bueno", esPeligrosa:false, claseONU:"",
};

const emptyForm = {
    folio:"", tipoCarta:"CMR - Carretera Internacional", fechaEmision:"", lugarEmision:"", moneda:"MXN",
    remitenteId:"",
    remitenteNombre:"", remitenteRFC:"", remitenteDireccion:"", remitenteCiudad:"",
    remitenteEstado:"", remitentePais:"M茅xico", remitenteTelefono:"", remitenteEmail:"",
    destinatarioId:"",
    destinatarioNombre:"", destinatarioRFC:"", destinatarioDireccion:"", destinatarioCiudad:"",
    destinatarioEstado:"", destinatarioPais:"M茅xico", destinatarioTelefono:"", destinatarioEmail:"",
    transportistaNombre:"", transportistaLicencia:"",
    configAutotransporte:"", configAutotransporteDesc:"",
    tipoPermiso:"", tipoPermisoDesc:"",
    figuraTransporte:"", figuraTransporteDesc:"",
    vehiculoTipo:"", vehiculoPlacas:"", conductorNombre:"", conductorLicencia:"",
    lugarCarga:"", direccionCarga:"", fechaCarga:"", horaCarga:"",
    lugarDescarga:"", direccionDescarga:"", fechaDescarga:"", horaDescarga:"",
    rutaDescripcion:"",
    precioTransporte:"", formaPago:"Contado", plazoEntrega:"",
    instruccionesEspeciales:"", seguroValor:"", seguroPoliza:"",
    observaciones:"", reservas:"",
    status:"Activa",
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

// Buscador de cat谩logos SAT en tiempo real
function SatPicker({ label, tipo, value, valueDesc, onChange, placeholder, span2 = false }) {
    const [query,     setQuery]     = useState(value ? `${value} -${valueDesc || ""}` : "");
    const [results,   setResults]   = useState([]);
    const [open,      setOpen]      = useState(false);
    const [loading,   setLoading]   = useState(false);
    const debounceRef = useRef(null);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const buscar = useCallback(async (q) => {
        if (!q || q.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/catalogos-sat/${tipo}?q=${encodeURIComponent(q)}&limit=30`, { headers });
            const data = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (e) { setResults([]); }
        setLoading(false);
    }, [tipo]);

    const handleInput = (e) => {
        const q = e.target.value;
        setQuery(q);
        setOpen(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => buscar(q), 300);
    };

    const seleccionar = (item) => {
        setQuery(`${item.clave} -${item.descripcion}`);
        setOpen(false);
        setResults([]);
        onChange(item.clave, item.descripcion);
    };

    const limpiar = () => {
        setQuery("");
        setResults([]);
        setOpen(false);
        onChange("", "");
    };

    return (
        <div className={span2 ? "col-span-2" : ""}>
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            <div className="relative">
                <div className="relative flex items-center">
                    <FaSearch className="absolute left-4 text-gray-500 text-xs pointer-events-none" />
                    <input
                        value={query}
                        onChange={handleInput}
                        onFocus={() => { if (query.length >= 2) setOpen(true); }}
                        placeholder={placeholder || `Buscar en ${tipo}...`}
                        className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-10 pr-10 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm"
                    />
                    {value && (
                        <button onClick={limpiar} className="absolute right-3 text-gray-500 hover:text-red-400 transition-colors text-xs">
                            <FaTimes />
                        </button>
                    )}
                </div>

                {value && (
                    <div className="mt-1 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-xs text-cyan-300 flex items-center gap-2">
                        <span className="font-mono font-bold">{value}</span>
                        <span className="text-gray-400"></span>
                        <span className="truncate">{valueDesc}</span>
                    </div>
                )}

                {open && (query.length >= 2) && (
                    <div className="absolute z-50 w-full mt-1 bg-[#080d1a] border border-cyan-400/20 rounded-2xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
                        {loading && <p className="text-gray-500 text-sm text-center py-4">Buscando...</p>}
                        {!loading && results.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">Sin resultados para "{query}"</p>
                        )}
                        {results.map(r => (
                            <button key={r.id} type="button" onClick={() => seleccionar(r)}
                                className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 transition-all border-b border-white/5 last:border-0">
                                <span className="font-mono text-cyan-300 text-xs font-bold mr-2">{r.clave}</span>
                                <span className="text-gray-300 text-xs">{r.descripcion}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Selector de cat谩logo de remitentes/destinatarios (sin cambios)
function CatalogPicker({ label, placeholder, items, selectedId, onSelect, onClear }) {
    const [open,  setOpen]  = useState(false);
    const [query, setQuery] = useState("");
    const safeItems = Array.isArray(items) ? items : [];
    const selected = safeItems.find(i => String(i.id) === String(selectedId));
    const filtered = safeItems.filter(i =>
        i.nombre?.toLowerCase().includes(query.toLowerCase()) ||
        i.rfc?.toLowerCase().includes(query.toLowerCase()) ||
        i.ciudad?.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="col-span-2 relative">
            <label className="text-gray-400 text-sm mb-2 block">{label}</label>
            <button type="button" onClick={() => setOpen(o => !o)}
                className={`w-full text-left px-5 py-3 rounded-xl border transition-all flex items-center justify-between
                    ${selected ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-200" : "bg-white/5 border-cyan-400/10 text-gray-400 hover:border-cyan-400/30"}`}>
                <span className="flex items-center gap-3">
                    <FaSearch className="text-xs opacity-50" />
                    {selected
                        ? <><span className="font-bold">{selected.nombre}</span><span className="text-xs opacity-60 ml-2">{[selected.rfc, selected.ciudad, selected.estado].filter(Boolean).join(" 路 ")}</span></>
                        : placeholder}
                </span>
                {selected && (
                    <span onClick={e => { e.stopPropagation(); onClear(); setOpen(false); }}
                        className="text-xs text-gray-500 hover:text-red-400 border border-white/10 rounded px-2 py-0.5 transition-colors">
                        
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute z-50 w-full mt-2 bg-[#080d1a] border border-cyan-400/20 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-3 border-b border-cyan-400/10">
                        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-white/5 border border-cyan-400/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-cyan-400/30" />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {filtered.length === 0
                            ? <p className="text-gray-500 text-sm text-center py-8">Sin resultados</p>
                            : filtered.map(item => (
                                <button key={item.id} type="button"
                                    onClick={() => { setOpen(false); setQuery(""); setTimeout(() => onSelect(item), 0); }}
                                    className="w-full text-left px-5 py-3 hover:bg-cyan-500/10 transition-all border-b border-white/5 last:border-0">
                                    <p className="text-white font-semibold text-sm">{item.nombre}</p>
                                    <p className="text-gray-500 text-xs mt-0.5">{[item.rfc, item.ciudad, item.estado, item.telefono].filter(Boolean).join(" 路 ")}</p>
                                </button>
                            ))
                        }
                    </div>
                    <div className="p-2 border-t border-cyan-400/10">
                        <button type="button" onClick={() => setOpen(false)}
                            className="w-full text-center text-xs text-gray-600 hover:text-gray-400 py-1">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function generarPDF(carta, mercancias = []) {
    const filas = mercancias.map((m, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${m.claveProdServ ? `<span style="font-family:monospace;color:#0891b2">${m.claveProdServ}</span><br/>` : ""}${m.descripcion}</td>
            <td>${m.cantidad} ${m.claveUnidad || ""}</td>
            <td>${m.peso} kg</td><td>${m.volumen||"-"} m鲁</td>
            <td>$${Number(m.valor||0).toLocaleString()} ${carta.moneda}</td>
            <td>${m.claveEmbalaje ? m.claveEmbalaje+" -" : ""}${m.claveEmbalajeDesc||"-"}</td>
            <td>${m.marcas||"-"}</td><td>${m.estadoMercancia}</td>
            <td>${m.esPeligrosa ? "鈿狅笍 "+m.claseONU : "No"}</td>
        </tr>`).join("");

    const html = `<html><head><meta charset="UTF-8"/><title>Carta Porte ${carta.folio}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0891b2;padding-bottom:18px;margin-bottom:24px}
    .logo{font-size:28px;font-weight:900;color:#0891b2;letter-spacing:4px}
    .titulo{text-align:center;font-size:18px;font-weight:bold;margin-bottom:24px;text-transform:uppercase;letter-spacing:2px;color:#0891b2}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:18px}
    .sec{border:1px solid #ddd;border-radius:6px;padding:12px}
    .sec h3{font-size:11px;color:#0891b2;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:5px}
    .campo{margin-bottom:6px}.campo label{font-size:10px;color:#888;display:block}.campo span{font-size:13px;font-weight:bold}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#e0f7fa;color:#0891b2;padding:7px;text-align:left;font-size:11px;text-transform:uppercase}
    td{padding:7px;border-bottom:1px solid #f0f0f0;font-size:12px}
    .estado{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:12px;background:#e0f7fa;color:#0891b2}
    .footer{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px;border-top:2px solid #eee;padding-top:20px}
    .firma{text-align:center}.firma .linea{border-top:1px solid #333;margin-bottom:6px;margin-top:50px}.firma p{font-size:11px;color:#555}
    </style></head><body>
    <div class="header"><div class="logo">VELTRAX</div><div>
        <div style="font-size:16px;font-weight:bold">Folio: ${carta.folio}</div>
        <div style="color:#888">Tipo: ${carta.tipoCarta} &nbsp;|&nbsp; Emisi贸n: ${carta.fechaEmision} &nbsp;${carta.lugarEmision||""}</div>
        <div style="margin-top:6px"><span class="estado">${carta.status}</span></div>
    </div></div>
    <div class="titulo">Carta de Porte -Documento de Transporte</div>
    <div class="grid2">
        <div class="sec"><h3>Remitente</h3>
            <div class="campo"><label>Nombre/Empresa</label><span>${carta.remitenteNombre||"-"}</span></div>
            <div class="campo"><label>RFC</label><span>${carta.remitenteRFC||"-"}</span></div>
            <div class="campo"><label>Direcci贸n</label><span>${[carta.remitenteDireccion,carta.remitenteCiudad,carta.remitenteEstado,carta.remitentePais].filter(Boolean).join(", ")}</span></div>
        </div>
        <div class="sec"><h3>Destinatario</h3>
            <div class="campo"><label>Nombre/Empresa</label><span>${carta.destinatarioNombre||"-"}</span></div>
            <div class="campo"><label>RFC</label><span>${carta.destinatarioRFC||"-"}</span></div>
            <div class="campo"><label>Direcci贸n</label><span>${[carta.destinatarioDireccion,carta.destinatarioCiudad,carta.destinatarioEstado,carta.destinatarioPais].filter(Boolean).join(", ")}</span></div>
        </div>
    </div>
    <div class="grid2">
        <div class="sec"><h3>Transportista / Conductor</h3>
            <div class="campo"><label>Empresa</label><span>${carta.transportistaNombre||"-"}</span></div>
            <div class="campo"><label>Conductor</label><span>${carta.conductorNombre||"-"}</span></div>
            <div class="campo"><label>Licencia</label><span>${carta.conductorLicencia||"-"}</span></div>
            <div class="campo"><label>Veh铆culo / Placas</label><span>${[carta.vehiculoTipo,carta.vehiculoPlacas].filter(Boolean).join(" -")}</span></div>
            ${carta.configAutotransporte ? `<div class="campo"><label>Config. Autotransporte (SAT)</label><span style="font-family:monospace;color:#0891b2">${carta.configAutotransporte}</span> ${carta.configAutotransporteDesc||""}</div>` : ""}
            ${carta.tipoPermiso ? `<div class="campo"><label>Tipo Permiso SCT (SAT)</label><span style="font-family:monospace;color:#0891b2">${carta.tipoPermiso}</span> ${carta.tipoPermisoDesc||""}</div>` : ""}
            ${carta.figuraTransporte ? `<div class="campo"><label>Figura Transporte (SAT)</label><span style="font-family:monospace;color:#0891b2">${carta.figuraTransporte}</span> ${carta.figuraTransporteDesc||""}</div>` : ""}
        </div>
        <div class="sec"><h3>Ruta</h3>
            <div class="campo"><label>Origen</label><span>${carta.lugarCarga||"-"} ${carta.fechaCarga ? "-"+carta.fechaCarga : ""}</span></div>
            <div class="campo"><label>Destino</label><span>${carta.lugarDescarga||"-"} ${carta.fechaDescarga ? "-"+carta.fechaDescarga : ""}</span></div>
        </div>
    </div>
    <div class="sec" style="margin-bottom:18px"><h3>Mercanc铆as</h3>
        <table><thead><tr><th>#</th><th>Descripci贸n / Clave SAT</th><th>Cantidad</th><th>Peso</th><th>Volumen</th><th>Valor</th><th>Embalaje</th><th>Marcas</th><th>Estado</th><th>Peligrosa</th></tr></thead>
        <tbody>${filas}</tbody></table>
    </div>
    <div class="grid3">
        <div class="sec"><h3>Condiciones</h3>
            <div class="campo"><label>Precio</label><span>${carta.moneda} $${Number(carta.precioTransporte||0).toLocaleString()}</span></div>
            <div class="campo"><label>Pago</label><span>${carta.formaPago||"-"}</span></div>
        </div>
        <div class="sec"><h3>Seguro</h3>
            <div class="campo"><label>Valor asegurado</label><span>${carta.moneda} $${Number(carta.seguroValor||0).toLocaleString()}</span></div>
            <div class="campo"><label>P贸liza</label><span>${carta.seguroPoliza||"-"}</span></div>
        </div>
        <div class="sec"><h3>Instrucciones</h3><p>${carta.instruccionesEspeciales||"Ninguna"}</p></div>
    </div>
    <div class="footer">
        <div class="firma"><div class="linea"></div><p>Firma Remitente</p><p style="font-weight:bold">${carta.remitenteNombre||""}</p></div>
        <div class="firma"><div class="linea"></div><p>Firma Conductor</p><p style="font-weight:bold">${carta.conductorNombre||""}</p></div>
        <div class="firma"><div class="linea"></div><p>Firma Destinatario</p><p style="font-weight:bold">${carta.destinatarioNombre||""}</p></div>
    </div></body></html>`;

    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
}

export default function CartaPortePage() {
    const [cartas,        setCartas]        = useState([]);
    const [remitentes,    setRemitentes]    = useState([]);
    const [destinatarios, setDestinatarios] = useState([]);
    const [vehiculos,     setVehiculos]     = useState([]);
    const [operadores,    setOperadores]    = useState([]);
    const [showModal,     setShowModal]     = useState(false);
    const [editando,      setEditando]      = useState(null);
    const [form,          setForm]          = useState(emptyForm);
    const [mercancias,    setMercancias]    = useState([{ ...emptyMerc }]);
    const [activeTab,     setActiveTab]     = useState("encabezado");
    const [loading,       setLoading]       = useState(false);
    const [filtroStatus,  setFiltroStatus]  = useState("");
    const [filtroBusq,    setFiltroBusq]    = useState("");
    const [filtroFecha,   setFiltroFecha]   = useState("");

    const token = localStorage.getItem("token");
    const headers = { "Content-Type":"application/json", ...(token && { Authorization:`Bearer ${token}` }) };

    const fetchAll = async () => {
        try {
            const [rRes, dRes, cpRes, vRes, oRes] = await Promise.all([
                fetch(`${API}/remitentes`,    { headers }),
                fetch(`${API}/destinatarios`, { headers }),
                fetch(`${API}/cartas-porte`,  { headers }),
                fetch(`${API}/vehicles`,      { headers }),
                fetch(`${API}/drivers`,       { headers }),
            ]);
            const [r, d, cp, v, o] = await Promise.all([rRes.json(), dRes.json(), cpRes.json(), vRes.json(), oRes.json()]);
            setRemitentes(Array.isArray(r) ? r : []);
            setDestinatarios(Array.isArray(d) ? d : []);
            setCartas(Array.isArray(cp) ? cp : []);
            setVehiculos(Array.isArray(v) ? v : []);
            setOperadores(Array.isArray(o) ? o : []);
        } catch(e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const cartasFiltradas = cartas.filter(c => {
        const matchStatus = !filtroStatus || c.status === filtroStatus;
        const matchFecha  = !filtroFecha  || c.fechaEmision?.startsWith(filtroFecha);
        const matchBusq   = !filtroBusq   ||
            c.folio?.toLowerCase().includes(filtroBusq.toLowerCase()) ||
            c.remitenteNombre?.toLowerCase().includes(filtroBusq.toLowerCase()) ||
            c.destinatarioNombre?.toLowerCase().includes(filtroBusq.toLowerCase()) ||
            c.conductorNombre?.toLowerCase().includes(filtroBusq.toLowerCase());
        return matchStatus && matchFecha && matchBusq;
    });

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
    const setSat = (claveField, descField) => (clave, desc) =>
        setForm(f => ({ ...f, [claveField]: clave, [descField]: desc }));

    // Auto-llena las claves SAT del veh铆culo seleccionado
    const aplicarVehiculo = (v) => {
        if (!v) {
            setForm(f => ({ ...f,
                vehiculoTipo: "", vehiculoPlacas: "",
                configAutotransporte: "", configAutotransporteDesc: "",
                tipoPermiso: "", tipoPermisoDesc: "",
                transportistaLicencia: "",
            }));
            return;
        }
        setForm(f => ({ ...f,
            vehiculoTipo:              `${v.brand || ""} ${v.model || ""} ${v.year || ""}`.trim(),
            vehiculoPlacas:            v.plate || "",
            configAutotransporte:      v.configAutotransporte || f.configAutotransporte,
            configAutotransporteDesc:  v.configAutotransporteDesc || f.configAutotransporteDesc,
            tipoPermiso:               v.tipoPermiso || f.tipoPermiso,
            tipoPermisoDesc:           v.tipoPermisoDesc || f.tipoPermisoDesc,
            transportistaLicencia:     v.numPermisoSct || f.transportistaLicencia,
        }));
    };

    // Auto-llena los datos del operador seleccionado
    const aplicarOperador = (o) => {
        if (!o) {
            setForm(f => ({ ...f,
                conductorNombre: "", conductorLicencia: "",
                figuraTransporte: "", figuraTransporteDesc: "",
            }));
            return;
        }
        setForm(f => ({ ...f,
            conductorNombre:       `${o.name || ""} ${o.apellidos || ""}`.trim(),
            conductorLicencia:     o.licenseNumber || "",
            figuraTransporte:      o.figuraTransporte || f.figuraTransporte,
            figuraTransporteDesc:  o.figuraTransporteDesc || f.figuraTransporteDesc,
        }));
    };

    const aplicarRemitente = (rem) => {
        if (!rem) {
            setForm(f => ({ ...f, remitenteId:"", remitenteNombre:"", remitenteRFC:"",
                remitenteDireccion:"", remitenteCiudad:"", remitenteEstado:"",
                remitentePais:"M茅xico", remitenteTelefono:"", remitenteEmail:"" }));
            return;
        }
        setForm(f => ({ ...f,
            remitenteId: rem.id, remitenteNombre: rem.nombre||"", remitenteRFC: rem.rfc||"",
            remitenteDireccion: rem.direccion||"", remitenteCiudad: rem.ciudad||"",
            remitenteEstado: rem.estado||"", remitentePais: rem.pais||"M茅xico",
            remitenteTelefono: rem.telefono||"", remitenteEmail: rem.email||"",
            lugarCarga: rem.ciudad ? `${rem.ciudad}${rem.estado ? ", "+rem.estado : ""}` : f.lugarCarga,
            direccionCarga: rem.direccion || f.direccionCarga,
        }));
    };

    const aplicarDestinatario = (dest) => {
        if (!dest) {
            setForm(f => ({ ...f, destinatarioId:"", destinatarioNombre:"", destinatarioRFC:"",
                destinatarioDireccion:"", destinatarioCiudad:"", destinatarioEstado:"",
                destinatarioPais:"M茅xico", destinatarioTelefono:"", destinatarioEmail:"" }));
            return;
        }
        setForm(f => ({ ...f,
            destinatarioId: dest.id, destinatarioNombre: dest.nombre||"", destinatarioRFC: dest.rfc||"",
            destinatarioDireccion: dest.direccion||"", destinatarioCiudad: dest.ciudad||"",
            destinatarioEstado: dest.estado||"", destinatarioPais: dest.pais||"M茅xico",
            destinatarioTelefono: dest.telefono||"", destinatarioEmail: dest.email||"",
            lugarDescarga: dest.ciudad ? `${dest.ciudad}${dest.estado ? ", "+dest.estado : ""}` : f.lugarDescarga,
            direccionDescarga: dest.direccion || f.direccionDescarga,
        }));
    };

    const setMerc = (idx, field) => (e) => {
        const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setMercancias(ms => ms.map((m, i) => i === idx ? { ...m, [field]: val } : m));
    };

    const setMercSat = (idx, claveField, descField) => (clave, desc) => {
        setMercancias(ms => ms.map((m, i) => i === idx ? { ...m, [claveField]: clave, [descField]: desc } : m));
    };

    const openNew = () => {
        setEditando(null);
        setForm({ ...emptyForm, folio:`CP-${Date.now().toString().slice(-6)}`, fechaEmision: new Date().toISOString().split("T")[0] });
        setMercancias([{ ...emptyMerc }]);
        setActiveTab("encabezado");
        setShowModal(true);
    };

    const openEdit = (carta) => {
        setEditando(carta.id);
        setForm({ ...emptyForm, ...carta });
        setMercancias(carta.mercancias?.length ? carta.mercancias : [{ ...emptyMerc }]);
        setActiveTab("encabezado");
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = { ...form, mercancias, precioTransporte: Number(form.precioTransporte)||0, seguroValor: Number(form.seguroValor)||0 };
            const url    = editando ? `${API}/cartas-porte/${editando}` : `${API}/cartas-porte`;
            const method = editando ? "PUT" : "POST";
            await fetch(url, { method, headers, body: JSON.stringify(payload) });
            setShowModal(false);
            fetchAll();
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("驴Eliminar esta Carta Porte?")) return;
        try { await fetch(`${API}/cartas-porte/${id}`, { method:"DELETE", headers }); fetchAll(); }
        catch(e) { console.error(e); }
    };

    const activas    = cartas.filter(c => c.status === "Activa").length;
    const enTransito = cartas.filter(c => c.status === "En Tr谩nsito").length;
    const entregadas = cartas.filter(c => c.status === "Entregada").length;

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto relative">
                <Topbar />

                <div className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">CARTAS PORTE</h1>
                        <p className="text-gray-400 mt-4 text-xl">Documentos de transporte con claves SAT</p>
                    </div>
                    <button onClick={openNew}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold text-lg hover:bg-cyan-500/20 transition-all">
                        <FaPlus /> Nueva Carta Porte
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label:"Total",       value:cartas.length, color:"text-cyan-400",  border:"border-cyan-500/20" },
                        { label:"Activas",     value:activas,       color:"text-cyan-300",  border:"border-cyan-500/20" },
                        { label:"En Tr谩nsito", value:enTransito,    color:"text-blue-400",  border:"border-blue-500/20" },
                        { label:"Entregadas",  value:entregadas,    color:"text-green-400", border:"border-green-500/20" },
                    ].map((s, i) => (
                        <div key={i} className={`rounded-3xl bg-white/5 border ${s.border} p-6 flex items-center gap-5`}>
                            <FaFileAlt className={`text-4xl ${s.color}`} />
                            <div><p className="text-gray-400">{s.label}</p><h2 className={`text-4xl font-black ${s.color}`}>{s.value}</h2></div>
                        </div>
                    ))}
                </div>

                <div className="mb-6 flex flex-wrap gap-4">
                    <input value={filtroBusq} onChange={e => setFiltroBusq(e.target.value)}
                        placeholder="Buscar por folio, remitente, destinatario..."
                        className="flex-1 min-w-[250px] bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                        className="bg-[#020617] border border-cyan-400/10 rounded-2xl px-5 py-3 text-white outline-none">
                        <option value="">Todos los estados</option>
                        <option>Activa</option><option>En Tr谩nsito</option><option>Entregada</option><option>Cancelada</option>
                    </select>
                    <input type="month" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
                        className="bg-[#020617] border border-cyan-400/10 rounded-2xl px-5 py-3 text-white outline-none" />
                    {(filtroStatus || filtroBusq || filtroFecha) && (
                        <button onClick={() => { setFiltroStatus(""); setFiltroBusq(""); setFiltroFecha(""); }}
                            className="px-5 py-3 rounded-2xl border border-red-400/20 text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold">
                             filtros
                        </button>
                    )}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">
                    <h2 className="text-3xl font-black text-cyan-300 mb-2 flex items-center gap-3"><FaFileAlt /> Cartas Porte Registradas</h2>
                    <p className="text-gray-500 text-sm mb-8">Mostrando {cartasFiltradas.length} de {cartas.length}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-cyan-400/10 text-sm">
                                    {["Folio","Tipo","Remitente","Destinatario","Ruta","Conductor","Veh铆culo","Emisi贸n","Entrega","Estado","Acciones"]
                                        .map(h => <th key={h} className="pb-4 pr-4">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {cartasFiltradas.length === 0 && (
                                    <tr><td colSpan={11} className="py-10 text-center text-gray-500">
                                        {cartas.length === 0 ? "No hay cartas porte registradas" : "No hay resultados"}
                                    </td></tr>
                                )}
                                {cartasFiltradas.map(c => (
                                    <tr key={c.id} className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                        <td className="py-4 pr-4 font-bold text-cyan-300">{c.folio}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-xs">{c.tipoCarta?.split(" ")[0]|| "-"}</td>
                                        <td className="py-4 pr-4">{c.remitenteNombre|| "-"}</td>
                                        <td className="py-4 pr-4">{c.destinatarioNombre|| "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400 text-sm">{c.lugarCarga|| "-"} 鈫?{c.lugarDescarga|| "-"}</td>
                                        <td className="py-4 pr-4">{c.conductorNombre|| "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400">{c.vehiculoPlacas|| "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400">{c.fechaEmision|| "-"}</td>
                                        <td className="py-4 pr-4 text-gray-400">{c.fechaDescarga|| "-"}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 rounded-full border text-sm font-bold ${estadoColor[c.status]||"text-gray-300 bg-white/5 border-white/10"}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => generarPDF(c, c.mercancias||[])}
                                                    className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-400 hover:bg-blue-500/20 transition-all"><FaFilePdf /></button>
                                                <button onClick={() => openEdit(c)}
                                                    className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/20 transition-all"><FaEdit /></button>
                                                <button onClick={() => handleDelete(c.id)}
                                                    className="p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-400 hover:bg-red-500/20 transition-all"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-[#020617] border border-cyan-400/20 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                        <div className="flex justify-between items-center p-8 pb-0 flex-shrink-0">
                            <h2 className="text-3xl font-black text-cyan-300">
                                {editando ? "Editar Carta Porte" : "Nueva Carta Porte"}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl"><FaTimes /></button>
                        </div>

                        <div className="flex gap-1 px-8 pt-6 pb-1 overflow-x-auto flex-shrink-0">
                            {TABS.map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all
                                        ${activeTab===t.id ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-300" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-6">

                            {activeTab === "encabezado" && (
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Folio" span2>
                                        <input value={form.folio} onChange={set("folio")} className={inputCls} />
                                    </Field>
                                    <Field label="Tipo de Carta de Porte">
                                        <select value={form.tipoCarta} onChange={set("tipoCarta")} className={selectCls}>
                                            {TIPOS_CARTA.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Moneda">
                                        <select value={form.moneda} onChange={set("moneda")} className={selectCls}>
                                            {MONEDAS.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Fecha de Emisi贸n">
                                        <input type="date" value={form.fechaEmision} onChange={set("fechaEmision")} className={inputCls} />
                                    </Field>
                                    <Field label="Lugar de Emisi贸n">
                                        <input value={form.lugarEmision} onChange={set("lugarEmision")} placeholder="Ciudad, Pa铆s" className={inputCls} />
                                    </Field>
                                    <Field label="Estado">
                                        <select value={form.status} onChange={set("status")} className={selectCls}>
                                            <option>Activa</option><option>En Tr谩nsito</option><option>Entregada</option><option>Cancelada</option>
                                        </select>
                                    </Field>
                                </div>
                            )}

                            {activeTab === "remitente" && (
                                <div className="grid grid-cols-2 gap-5">
                                    <CatalogPicker label="馃摝 Seleccionar del cat谩logo de Remitentes" placeholder="Buscar remitente registrado..."
                                        items={remitentes.filter(r => r.status === "Activo")} selectedId={form.remitenteId}
                                        onSelect={aplicarRemitente} onClear={() => aplicarRemitente(null)} />
                                    <div className="col-span-2 border-t border-cyan-400/10 pt-4">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Datos del remitente</p>
                                    </div>
                                    <Field label="Nombre / Raz贸n Social">
                                        <input value={form.remitenteNombre} onChange={set("remitenteNombre")} placeholder="Empresa S.A. de C.V." className={inputCls} />
                                    </Field>
                                    <Field label="RFC / NIF">
                                        <input value={form.remitenteRFC} onChange={set("remitenteRFC")} placeholder="RFC000000XXX" className={inputCls} />
                                    </Field>
                                    <Field label="Direcci贸n">
                                        <input value={form.remitenteDireccion} onChange={set("remitenteDireccion")} className={inputCls} />
                                    </Field>
                                    <Field label="Ciudad">
                                        <input value={form.remitenteCiudad} onChange={set("remitenteCiudad")} className={inputCls} />
                                    </Field>
                                    <Field label="Estado">
                                        <input value={form.remitenteEstado} onChange={set("remitenteEstado")} className={inputCls} />
                                    </Field>
                                    <Field label="Pa铆s">
                                        <input value={form.remitentePais} onChange={set("remitentePais")} className={inputCls} />
                                    </Field>
                                    <Field label="Tel茅fono">
                                        <input value={form.remitenteTelefono} onChange={set("remitenteTelefono")} className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.remitenteEmail} onChange={set("remitenteEmail")} className={inputCls} />
                                    </Field>
                                </div>
                            )}

                            {activeTab === "destinatario" && (
                                <div className="grid grid-cols-2 gap-5">
                                    <CatalogPicker label="馃搷 Seleccionar del cat谩logo de Destinatarios" placeholder="Buscar destinatario registrado..."
                                        items={destinatarios.filter(d => d.status === "Activo")} selectedId={form.destinatarioId}
                                        onSelect={aplicarDestinatario} onClear={() => aplicarDestinatario(null)} />
                                    <div className="col-span-2 border-t border-cyan-400/10 pt-4">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Datos del destinatario</p>
                                    </div>
                                    <Field label="Nombre / Raz贸n Social">
                                        <input value={form.destinatarioNombre} onChange={set("destinatarioNombre")} className={inputCls} />
                                    </Field>
                                    <Field label="RFC / NIF">
                                        <input value={form.destinatarioRFC} onChange={set("destinatarioRFC")} className={inputCls} />
                                    </Field>
                                    <Field label="Direcci贸n">
                                        <input value={form.destinatarioDireccion} onChange={set("destinatarioDireccion")} className={inputCls} />
                                    </Field>
                                    <Field label="Ciudad">
                                        <input value={form.destinatarioCiudad} onChange={set("destinatarioCiudad")} className={inputCls} />
                                    </Field>
                                    <Field label="Estado">
                                        <input value={form.destinatarioEstado} onChange={set("destinatarioEstado")} className={inputCls} />
                                    </Field>
                                    <Field label="Pa铆s">
                                        <input value={form.destinatarioPais} onChange={set("destinatarioPais")} className={inputCls} />
                                    </Field>
                                    <Field label="Tel茅fono">
                                        <input value={form.destinatarioTelefono} onChange={set("destinatarioTelefono")} className={inputCls} />
                                    </Field>
                                    <Field label="Email">
                                        <input type="email" value={form.destinatarioEmail} onChange={set("destinatarioEmail")} className={inputCls} />
                                    </Field>
                                </div>
                            )}

                            {activeTab === "transportista" && (
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Empresa Transportista" span2>
                                        <input value={form.transportistaNombre} onChange={set("transportistaNombre")} placeholder="Transportes S.A. de C.V." className={inputCls} />
                                    </Field>

                                    {/* Selector de veh铆culo del cat谩logo */}
                                    <div className="col-span-2 p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">馃殯 Seleccionar veh铆culo del cat谩logo</p>
                                        <select onChange={e => {
                                            const v = vehiculos.find(x => String(x.id) === e.target.value);
                                            aplicarVehiculo(v || null);
                                        }} className={selectCls} defaultValue="">
                                            <option value="">Seleccionar veh铆culo registrado...</option>
                                            {vehiculos.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.plate} -{v.brand} {v.model} {v.year}
                                                    {v.configAutotransporte ? ` | Config: ${v.configAutotransporte}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-gray-600 text-xs mt-2">Al seleccionar un veh铆culo se llenan autom谩ticamente las placas y claves SAT registradas.</p>
                                    </div>

                                    {/* Selector de operador del cat谩logo */}
                                    <div className="col-span-2 p-4 rounded-2xl bg-white/5 border border-cyan-400/10">
                                        <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">馃懁 Seleccionar operador del cat谩logo</p>
                                        <select onChange={e => {
                                            const o = operadores.find(x => String(x.id) === e.target.value);
                                            aplicarOperador(o || null);
                                        }} className={selectCls} defaultValue="">
                                            <option value="">Seleccionar operador registrado...</option>
                                            {operadores.map(o => (
                                                <option key={o.id} value={o.id}>
                                                    {o.name} {o.apellidos} -Lic: {o.licenseNumber || "-"}
                                                    {o.figuraTransporte ? ` | Figura: ${o.figuraTransporte}` : ""}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-gray-600 text-xs mt-2">Al seleccionar un operador se llenan autom谩ticamente el nombre, licencia y figura transporte SAT.</p>
                                    </div>

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-1">Claves SAT del transportista</p>

                                    <SatPicker label="Configuraci贸n Autotransporte (SAT)" tipo="c_ConfigAutotransporte"
                                        value={form.configAutotransporte} valueDesc={form.configAutotransporteDesc}
                                        onChange={setSat("configAutotransporte","configAutotransporteDesc")}
                                        placeholder="Ej: C2, C3, T3S2..." />
                                    <SatPicker label="Tipo de Permiso SCT (SAT)" tipo="c_TipoPermiso"
                                        value={form.tipoPermiso} valueDesc={form.tipoPermisoDesc}
                                        onChange={setSat("tipoPermiso","tipoPermisoDesc")}
                                        placeholder="Ej: TPAF01..." />
                                    <SatPicker label="Figura Transporte (SAT)" tipo="c_FiguraTransporte"
                                        value={form.figuraTransporte} valueDesc={form.figuraTransporteDesc}
                                        onChange={setSat("figuraTransporte","figuraTransporteDesc")}
                                        placeholder="Ej: 01 Operador..." span2={false} />

                                    <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest pt-3">Datos del conductor y veh铆culo</p>

                                    <Field label="Nombre del Conductor">
                                        <input value={form.conductorNombre} onChange={set("conductorNombre")} placeholder="Juan P茅rez Garc铆a" className={inputCls} />
                                    </Field>
                                    <Field label="Licencia de Conducir">
                                        <input value={form.conductorLicencia} onChange={set("conductorLicencia")} placeholder="D00001234" className={inputCls} />
                                    </Field>
                                    <Field label="Tipo / Modelo de Veh铆culo">
                                        <input value={form.vehiculoTipo} onChange={set("vehiculoTipo")} placeholder="Torton 3 ejes, Trailer..." className={inputCls} />
                                    </Field>
                                    <Field label="Placas del Veh铆culo">
                                        <input value={form.vehiculoPlacas} onChange={set("vehiculoPlacas")} placeholder="ABC-1234" className={inputCls} />
                                    </Field>
                                    <Field label="Licencia / Permiso SCT (texto libre)">
                                        <input value={form.transportistaLicencia} onChange={set("transportistaLicencia")} placeholder="TFDP-0000" className={inputCls} />
                                    </Field>
                                </div>
                            )}

                            {activeTab === "ruta" && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
                                        <p className="col-span-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">Origen -Punto de Carga</p>
                                        <Field label="Lugar de Carga">
                                            <input value={form.lugarCarga} onChange={set("lugarCarga")} placeholder="Ciudad de origen" className={inputCls} />
                                        </Field>
                                        <Field label="Direcci贸n Exacta">
                                            <input value={form.direccionCarga} onChange={set("direccionCarga")} placeholder="Calle, No., Col., CP" className={inputCls} />
                                        </Field>
                                        <Field label="Fecha de Carga">
                                            <input type="date" value={form.fechaCarga} onChange={set("fechaCarga")} className={inputCls} />
                                        </Field>
                                        <Field label="Hora de Carga">
                                            <input type="time" value={form.horaCarga} onChange={set("horaCarga")} className={inputCls} />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl border border-green-500/20 bg-green-500/5">
                                        <p className="col-span-2 text-green-400 text-xs font-bold uppercase tracking-widest">Destino -Punto de Descarga</p>
                                        <Field label="Lugar de Descarga">
                                            <input value={form.lugarDescarga} onChange={set("lugarDescarga")} placeholder="Ciudad de destino" className={inputCls} />
                                        </Field>
                                        <Field label="Direcci贸n Exacta">
                                            <input value={form.direccionDescarga} onChange={set("direccionDescarga")} placeholder="Calle, No., Col., CP" className={inputCls} />
                                        </Field>
                                        <Field label="Fecha de Entrega">
                                            <input type="date" value={form.fechaDescarga} onChange={set("fechaDescarga")} className={inputCls} />
                                        </Field>
                                        <Field label="Hora Estimada">
                                            <input type="time" value={form.horaDescarga} onChange={set("horaDescarga")} className={inputCls} />
                                        </Field>
                                    </div>
                                    <Field label="Descripci贸n de la Ruta">
                                        <textarea value={form.rutaDescripcion} onChange={set("rutaDescripcion")}
                                            placeholder="Ruta a seguir, aduanas, puntos de parada..." rows={3}
                                            className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            )}

                            {activeTab === "mercancias" && (
                                <div className="space-y-5">
                                    {mercancias.map((m, idx) => (
                                        <div key={idx} className="p-5 rounded-2xl border border-cyan-400/10 bg-white/5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-cyan-300 font-bold text-sm flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-xs">{idx+1}</span>
                                                    Mercanc铆a #{idx+1}{m.descripcion ? ` -${m.descripcion}` : ""}
                                                </span>
                                                {mercancias.length > 1 && (
                                                    <button onClick={() => setMercancias(ms => ms.filter((_,i) => i !== idx))}
                                                        className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-400/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                                                        
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">

                                                {/* Clave producto/servicio SAT */}
                                                <SatPicker
                                                    label="Clave Producto/Servicio (SAT) *"
                                                    tipo="c_ClaveProdServCP"
                                                    value={m.claveProdServ}
                                                    valueDesc={m.claveProdServDesc}
                                                    onChange={setMercSat(idx, "claveProdServ", "claveProdServDesc")}
                                                    placeholder="Buscar clave SAT... ej: transporte"
                                                    span2={true}
                                                />

                                                <Field label="Descripci贸n adicional" span2>
                                                    <input value={m.descripcion} onChange={setMerc(idx,"descripcion")} placeholder="Descripci贸n complementaria" className={inputCls} />
                                                </Field>

                                                <Field label="Cantidad">
                                                    <input type="number" value={m.cantidad} onChange={setMerc(idx,"cantidad")} placeholder="0" className={inputCls} />
                                                </Field>

                                                {/* Clave unidad de peso SAT */}
                                                <SatPicker
                                                    label="Unidad de Medida (SAT)"
                                                    tipo="c_ClaveUnidadPeso"
                                                    value={m.claveUnidad}
                                                    valueDesc={m.claveUnidadDesc}
                                                    onChange={setMercSat(idx, "claveUnidad", "claveUnidadDesc")}
                                                    placeholder="Buscar unidad... ej: kilogramo"
                                                />

                                                <Field label="Peso (kg)">
                                                    <input type="number" value={m.peso} onChange={setMerc(idx,"peso")} placeholder="0.00" className={inputCls} />
                                                </Field>
                                                <Field label="Volumen (m鲁)">
                                                    <input type="number" value={m.volumen} onChange={setMerc(idx,"volumen")} placeholder="0.00" className={inputCls} />
                                                </Field>
                                                <Field label="Valor Declarado ($)">
                                                    <input type="number" value={m.valor} onChange={setMerc(idx,"valor")} placeholder="0.00" className={inputCls} />
                                                </Field>

                                                {/* Tipo embalaje SAT */}
                                                <SatPicker
                                                    label="Tipo de Embalaje (SAT)"
                                                    tipo="c_TipoEmbalaje"
                                                    value={m.claveEmbalaje}
                                                    valueDesc={m.claveEmbalajeDesc}
                                                    onChange={setMercSat(idx, "claveEmbalaje", "claveEmbalajeDesc")}
                                                    placeholder="Buscar embalaje..."
                                                />

                                                <Field label="Marcas Identificativas">
                                                    <input value={m.marcas} onChange={setMerc(idx,"marcas")} placeholder="Ref., lote, c贸digo..." className={inputCls} />
                                                </Field>
                                                <Field label="Estado de la Mercanc铆a">
                                                    <select value={m.estadoMercancia} onChange={setMerc(idx,"estadoMercancia")} className={selectCls}>
                                                        {ESTADOS_MERC.map(e => <option key={e}>{e}</option>)}
                                                    </select>
                                                </Field>

                                                <div className="col-span-2">
                                                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all
                                                        ${m.esPeligrosa ? "border-yellow-500/40 bg-yellow-500/10" : "border-cyan-400/10 bg-white/5"}`}>
                                                        <input type="checkbox" checked={m.esPeligrosa} onChange={setMerc(idx,"esPeligrosa")} className="w-4 h-4 cursor-pointer" />
                                                        <span className={`text-sm font-bold ${m.esPeligrosa ? "text-yellow-300" : "text-gray-400"}`}>
                                                            <FaExclamationTriangle className="inline mr-2" />
                                                            Mercanc铆a peligrosa (requiere documentaci贸n ADR)
                                                        </span>
                                                    </label>
                                                </div>
                                                {m.esPeligrosa && (
                                                    <Field label="Clase / N煤mero ONU" span2>
                                                        <input value={m.claseONU} onChange={setMerc(idx,"claseONU")}
                                                            placeholder="Ej: Clase 3 -L铆quidos inflamables, UN1203" className={inputCls} />
                                                    </Field>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => setMercancias(ms => [...ms, { ...emptyMerc }])}
                                        className="w-full py-3 rounded-2xl border-2 border-dashed border-cyan-400/20 text-gray-500 hover:border-cyan-400/40 hover:text-cyan-400 transition-all font-bold text-sm">
                                        + Agregar otra mercanc铆a
                                    </button>
                                </div>
                            )}

                            {activeTab === "condiciones" && (
                                <div className="grid grid-cols-2 gap-5">
                                    <Field label="Precio del Transporte">
                                        <input type="number" value={form.precioTransporte} onChange={set("precioTransporte")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="Moneda">
                                        <select value={form.moneda} onChange={set("moneda")} className={selectCls}>
                                            {MONEDAS.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Forma de Pago">
                                        <select value={form.formaPago} onChange={set("formaPago")} className={selectCls}>
                                            {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Plazo de Entrega (d铆as)">
                                        <input type="number" value={form.plazoEntrega} onChange={set("plazoEntrega")} placeholder="1" className={inputCls} />
                                    </Field>
                                    <Field label="Valor Asegurado">
                                        <input type="number" value={form.seguroValor} onChange={set("seguroValor")} placeholder="0.00" className={inputCls} />
                                    </Field>
                                    <Field label="N煤mero de P贸liza de Seguro">
                                        <input value={form.seguroPoliza} onChange={set("seguroPoliza")} placeholder="POL-2026-XXXXX" className={inputCls} />
                                    </Field>
                                    <Field label="Instrucciones Especiales" span2>
                                        <textarea value={form.instruccionesEspeciales} onChange={set("instruccionesEspeciales")}
                                            placeholder="Temperatura requerida, fr谩gil, no apilar..." rows={3}
                                            className={inputCls + " resize-none"} />
                                    </Field>
                                </div>
                            )}

                            {activeTab === "obs" && (
                                <div className="space-y-5">
                                    <Field label="Observaciones Generales">
                                        <textarea value={form.observaciones} onChange={set("observaciones")} rows={5} className={inputCls + " resize-none"} />
                                    </Field>
                                    <Field label="Reservas del Transportista">
                                        <textarea value={form.reservas} onChange={set("reservas")} rows={4} className={inputCls + " resize-none"} />
                                    </Field>
                                    <div className="p-5 rounded-2xl border border-cyan-400/10 bg-white/5 grid grid-cols-3 gap-4">
                                        {[
                                            { label:"Folio",        value: form.folio||"-" },
                                            { label:"Remitente",    value: form.remitenteNombre||"-" },
                                            { label:"Destinatario", value: form.destinatarioNombre||"-" },
                                            { label:"Origen",       value: form.lugarCarga||"-" },
                                            { label:"Destino",      value: form.lugarDescarga||"-" },
                                            { label:"Mercanc铆as",   value: `${mercancias.length} partida(s)` },
                                        ].map(s => (
                                            <div key={s.label}>
                                                <p className="text-gray-500 text-xs uppercase tracking-widest">{s.label}</p>
                                                <p className="text-cyan-300 font-bold mt-1">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 p-8 pt-4 flex-shrink-0">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 transition-all font-bold">
                                Cancelar
                            </button>
                            <button onClick={handleSubmit} disabled={loading}
                                className="flex-1 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-3">
                                <FaCheck />
                                {loading ? "Guardando..." : editando ? "Actualizar Carta Porte" : "Guardar Carta Porte"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}




