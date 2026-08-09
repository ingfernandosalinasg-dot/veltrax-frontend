import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { FaBuilding, FaSave, FaKey, FaPlug, FaUpload, FaFileAlt, FaTrash } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "https://veltrax-api-production.up.railway.app";
const inputCls = "w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";
const selectCls = "w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all text-sm";

const PACS = [
    { id: "DETECNO",   label: "Detecno",    color: "text-blue-300" },
    { id: "FACTURAMA", label: "Facturama",  color: "text-green-300" },
    { id: "SW_SAPIEN", label: "SW Sapien",  color: "text-purple-300" },
    { id: "FINKOK",    label: "Finkok",     color: "text-yellow-300" },
];

export default function EmpresaPage() {
    const [empresa, setEmpresa] = useState({
        razonSocial: "", rfc: "", regimenFiscal: "", codigoPostal: "",
        direccion: "", ciudad: "", estado: "", pais: "Mexico",
        telefono: "", email: "", sitioWeb: "",
        cerPath: "", keyPath: "", csdPassword: "",
        cerFileName: "", keyFileName: "",
        cerRawFile: null, keyRawFile: null,
        pacActivo: "",
        facturamaUsuario: "", facturamaPassword: "", facturamaAmbiente: "sandbox",
        swSapienToken: "", swSapienUrl: "", swSapienAmbiente: "demo",
        finokUsuario: "", finokPassword: "", finokAmbiente: "demo",
        detecnoToken: "", detecnoUrl: "", detecnoAmbiente: "pruebas",
        logoUrl: "",
    });
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [tab, setTab] = useState("datos");

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) };

    useEffect(() => {
        fetch(API + "/api/empresa", { headers })
            .then(r => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(data => {
                if (data) {
                    setEmpresa(e => ({ ...e, ...data }));
                }
            })
            .catch(() => {});
    }, []);

    const setF = k => e => setEmpresa(p => ({ ...p, [k]: e.target.value }));
    const showMsg = (ok, txt) => { setMsg({ ok, txt }); setTimeout(() => setMsg(null), 5000); };

    // Manejar la selección de archivos locales (.cer y .key)
    const handleFileChange = (tipo) => (e) => {
        const file = e.target.files[0];
        if (file) {
            const extension = file.name.split('.').pop().toLowerCase();
            if (tipo === "cer" && extension !== "cer") {
                showMsg(false, "El archivo seleccionado debe ser de extensión .cer");
                return;
            }
            if (tipo === "key" && extension !== "key") {
                showMsg(false, "El archivo seleccionado debe ser de extensión .key");
                return;
            }

            setEmpresa(prev => ({
                ...prev,
                [`${tipo}RawFile`]: file,       // Guardamos el binario para Spring Boot
                [`${tipo}FileName`]: file.name  // Nombre del archivo para la interfaz gráfica
            }));
        }
    };

    const removerArchivo = (tipo) => () => {
        setEmpresa(prev => ({
            ...prev,
            [`${tipo}RawFile`]: null,
            [`${tipo}FileName`]: "",
            [`${tipo}Path`]: ""
        }));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showMsg(false, "El logo debe pesar menos de 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEmpresa(prev => ({ ...prev, logoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const eliminarLogo = () => {
        setEmpresa(prev => ({ ...prev, logoUrl: "" }));
    };

    // Lógica para enviar datos generales y archivos CSD binarios al Servidor
    const guardar = async () => {
        setLoading(true);
        try {
            // PARTE 1: Guardar los datos del formulario de la empresa
            const urlEmpresa = API + "/api/empresa";
            const resEmpresa = await fetch(urlEmpresa, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(empresa)
            });

            if (!resEmpresa.ok) {
                throw new Error("Error al guardar las configuraciones fiscales.");
            }

            const dataEmpresa = await resEmpresa.json();
            setEmpresa(e => ({ ...e, ...dataEmpresa }));

            // PARTE 2: Si el usuario cargó archivos CSD reales desde sus documentos, los enviamos mediante Multipart
            if (empresa.cerRawFile && empresa.keyRawFile) {
                const formData = new FormData();
                formData.append("cer", empresa.cerRawFile);
                formData.append("key", empresa.keyRawFile);
                formData.append("password", empresa.csdPassword || "");

                const resCsd = await fetch(API + "/api/empresa/csd", {
                    method: "POST",
                    headers: { ...(token && { Authorization: "Bearer " + token }) }, // No incluir Content-Type aquí
                    body: formData
                });

                if (!resCsd.ok) {
                    const errorTxt = await resCsd.text();
                    throw new Error("Los datos fiscales se guardaron, pero ocurrió un problema con los archivos CSD: " + errorTxt);
                }
            }

            showMsg(true, "Configuración y llaves CSD guardadas de manera exitosa en el servidor");
        } catch (err) {
            showMsg(false, err.message || "Error de red: No se pudo establecer conexión con el backend");
        }
        setLoading(false);
    };

    const TABS = [
        { id: "datos", label: "Datos Fiscales", icon: <FaBuilding /> },
        { id: "csd",   label: "CSD / Sello",    icon: <FaKey /> },
        { id: "pac",   label: "Configuración PAC", icon: <FaPlug /> },
    ];

    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-10 overflow-auto">
                <Topbar />
                <div className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-6xl font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">EMPRESA</h1>
                        <p className="text-gray-400 mt-4 text-xl">Configuración fiscal y credenciales de PAC para el timbrado de CFDI</p>
                    </div>
                    {empresa.logoUrl && (
                        <img src={empresa.logoUrl} alt="Logo Empresa" className="h-20 w-auto object-contain rounded-2xl border border-cyan-500/30 p-2 bg-white/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]" />
                    )}
                </div>

                {msg && (
                    <div className={"mb-6 px-5 py-3 rounded-xl text-sm font-bold " + (msg.ok ? "bg-green-500/10 border border-green-400/30 text-green-300" : "bg-red-500/10 border border-red-400/30 text-red-300")}>
                        {msg.txt}
                    </div>
                )}

                <div className="flex gap-3 mb-8">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={"flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all border " + (tab === t.id ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300" : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10")}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 p-8">

                    {/* DATOS FISCALES */}
                    {tab === "datos" && (
                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Logo Corporativo</p>
                                <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/5 border border-cyan-500/10">
                                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-cyan-500/30 flex items-center justify-center bg-black/30 overflow-hidden relative group">
                                        {empresa.logoUrl ? (
                                            <img src={empresa.logoUrl} alt="Preview" className="h-full w-full object-contain p-1" />
                                        ) : (
                                            <FaBuilding className="text-3xl text-cyan-500/40" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 transition-all text-xs font-bold">
                                                <FaUpload /> Subir Logo
                                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                            </label>
                                            {empresa.logoUrl && (
                                                <button type="button" onClick={eliminarLogo} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold">
                                                    <FaTrash /> Eliminar
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs">Soporta formatos JPG, PNG. Tamaño máximo recomendado: 2MB.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2"><p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4 mt-4">Identificación Fiscal</p></div>
                            <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Razon Social (Sin régimen societario para CFDI 4.0)</label><input value={empresa.razonSocial || ""} onChange={setF("razonSocial")} className={inputCls} placeholder="MI EMPRESA" /></div>
                            <div><label className="text-gray-400 text-sm mb-2 block">RFC</label><input value={empresa.rfc || ""} onChange={setF("rfc")} className={inputCls} placeholder="MEM010101ABC" /></div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Régimen Fiscal (Clave SAT)</label>
                                <select value={empresa.regimenFiscal || ""} onChange={setF("regimenFiscal")} className={selectCls}>
                                    <option value="">Selecciona una opción...</option>
                                    <option value="601">601 - General de Ley Personas Morales</option>
                                    <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                                    <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                                </select>
                            </div>
                            <div><label className="text-gray-400 text-sm mb-2 block">Código Postal Fiscal</label><input value={empresa.codigoPostal || ""} onChange={setF("codigoPostal")} className={inputCls} placeholder="64000" /></div>
                            <div><label className="text-gray-400 text-sm mb-2 block">Ciudad</label><input value={empresa.ciudad || ""} onChange={setF("ciudad")} className={inputCls} /></div>
                            <div><label className="text-gray-400 text-sm mb-2 block">Estado</label><input value={empresa.estado || ""} onChange={setF("estado")} className={inputCls} /></div>
                            <div><label className="text-gray-400 text-sm mb-2 block">País</label><input value={empresa.pais || ""} onChange={setF("pais")} className={inputCls} /></div>
                            <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Dirección Completa</label><input value={empresa.direccion || ""} onChange={setF("direccion")} className={inputCls} /></div>
                            
                            <div className="col-span-2"><p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4 mt-4">Contacto Administrativo</p></div>
                            <div><label className="text-gray-400 text-sm mb-2 block">Teléfono</label><input value={empresa.telefono || ""} onChange={setF("telefono")} className={inputCls} /></div>
                            <div><label className="text-gray-400 text-sm mb-2 block">Email de Notificaciones</label><input value={empresa.email || ""} onChange={setF("email")} className={inputCls} /></div>
                            <div className="col-span-2"><label className="text-gray-400 text-sm mb-2 block">Sitio Web</label><input value={empresa.sitioWeb || ""} onChange={setF("sitioWeb")} className={inputCls} /></div>
                        </div>
                    )}

                    {/* TABLA DE CARGA DE ARCHIVOS CSD */}
                    {tab === "csd" && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-yellow-500/5 border border-yellow-400/20 text-yellow-300 text-sm">
                                El Certificado de Sello Digital (CSD) es único y obligatorio para el timbrado. Selecciona los archivos correspondientes cargados directamente desde tus documentos.
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* SECTOR ARCHIVO CER */}
                                <div className="space-y-2">
                                    <label className="text-gray-400 text-sm block font-semibold">Archivo de Certificado (.cer)</label>
                                    <div className="border border-dashed border-cyan-400/20 rounded-2xl p-6 bg-white/5 flex flex-col items-center justify-center text-center gap-3">
                                        <FaFileAlt className="text-3xl text-cyan-400/60" />
                                        {empresa.cerFileName ? (
                                            <div className="w-full">
                                                <p className="text-xs text-white font-mono truncate max-w-[250px] mx-auto mb-2">{empresa.cerFileName}</p>
                                                <button type="button" onClick={removerArchivo("cer")} className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 mx-auto">
                                                    <FaTrash /> Remover
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                                                Buscar .cer
                                                <input type="file" accept=".cer" onChange={handleFileChange("cer")} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* SECTOR ARCHIVO KEY */}
                                <div className="space-y-2">
                                    <label className="text-gray-400 text-sm block font-semibold">Archivo de Llave Privada (.key)</label>
                                    <div className="border border-dashed border-cyan-400/20 rounded-2xl p-6 bg-white/5 flex flex-col items-center justify-center text-center gap-3">
                                        <FaKey className="text-3xl text-cyan-400/60" />
                                        {empresa.keyFileName ? (
                                            <div className="w-full">
                                                <p className="text-xs text-white font-mono truncate max-w-[250px] mx-auto mb-2">{empresa.keyFileName}</p>
                                                <button type="button" onClick={removerArchivo("key")} className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 mx-auto">
                                                    <FaTrash /> Remover
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                                                Buscar .key
                                                <input type="file" accept=".key" onChange={handleFileChange("key")} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="text-gray-400 text-sm mb-2 block font-semibold">Contraseña de la Clave Privada (CSD)</label>
                                <input 
                                    type="password" 
                                    value={empresa.csdPassword || ""} 
                                    onChange={setF("csdPassword")} 
                                    className={inputCls} 
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    )}

                    {/* PAC TIMBRADO */}
                    {tab === "pac" && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">Proveedor Autorizado Activo</p>
                                <div className="grid grid-cols-4 gap-3 mb-6">
                                    {PACS.map(p => (
                                        <button key={p.id} type="button" onClick={() => setEmpresa(e => ({ ...e, pacActivo: p.id }))}
                                            className={"p-4 rounded-2xl border font-bold text-sm transition-all " + (empresa.pacActivo === p.id ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")}>
                                            {p.label}
                                            {empresa.pacActivo === p.id && <p className="text-xs text-cyan-400 mt-1">SELECCIONADO</p>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {empresa.pacActivo === "DETECNO" && (
                                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-400/20 space-y-4">
                                    <p className="text-blue-300 font-bold">Configuración Detecno</p>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Token API</label><input type="password" value={empresa.detecnoToken || ""} onChange={setF("detecnoToken")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">URL Base</label><input value={empresa.detecnoUrl || ""} onChange={setF("detecnoUrl")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Ambiente</label>
                                        <select value={empresa.detecnoAmbiente || "pruebas"} onChange={setF("detecnoAmbiente")} className={selectCls}>
                                            <option value="pruebas">Pruebas</option>
                                            <option value="produccion">Producción</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {empresa.pacActivo === "FACTURAMA" && (
                                <div className="p-6 rounded-2xl bg-green-500/5 border border-green-400/20 space-y-4">
                                    <p className="text-green-300 font-bold">Configuración Facturama</p>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Usuario</label><input value={empresa.facturamaUsuario || ""} onChange={setF("facturamaUsuario")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Password</label><input type="password" value={empresa.facturamaPassword || ""} onChange={setF("facturamaPassword")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Ambiente</label>
                                        <select value={empresa.facturamaAmbiente || "sandbox"} onChange={setF("facturamaAmbiente")} className={selectCls}>
                                            <option value="sandbox">Sandbox (Pruebas)</option>
                                            <option value="production">Producción</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {empresa.pacActivo === "SW_SAPIEN" && (
                                <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-400/20 space-y-4">
                                    <p className="text-purple-300 font-bold">Configuración SW Sapien</p>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Token</label><input type="password" value={empresa.swSapienToken || ""} onChange={setF("swSapienToken")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">URL</label><input value={empresa.swSapienUrl || ""} onChange={setF("swSapienUrl")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Ambiente</label>
                                        <select value={empresa.swSapienAmbiente || "demo"} onChange={setF("swSapienAmbiente")} className={selectCls}>
                                            <option value="demo">Demo (Pruebas)</option>
                                            <option value="production">Producción</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {empresa.pacActivo === "FINKOK" && (
                                <div className="p-6 rounded-2xl bg-yellow-500/5 border border-yellow-400/20 space-y-4">
                                    <p className="text-yellow-300 font-bold">Configuración Finkok</p>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Usuario</label><input value={empresa.finokUsuario || ""} onChange={setF("finokUsuario")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Password</label><input type="password" value={empresa.finokPassword || ""} onChange={setF("finokPassword")} className={inputCls} /></div>
                                    <div><label className="text-gray-400 text-sm mb-2 block">Ambiente</label>
                                        <select value={empresa.finokAmbiente || "demo"} onChange={setF("finokAmbiente")} className={selectCls}>
                                            <option value="demo">Demo (Pruebas)</option>
                                            <option value="production">Producción</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {!empresa.pacActivo && (
                                <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-400/20 text-gray-400 text-sm text-center">
                                    Selecciona un PAC para configurar los accesos de timbrado oficial
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button onClick={guardar} disabled={loading}
                    className="mt-6 flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50">
                    <FaSave /> {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
            </div>
        </div>
    );
}








