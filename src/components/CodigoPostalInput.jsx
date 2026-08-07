import { useState, useEffect, useCallback, useRef } from "react";
import { FaMapMarkerAlt, FaSpinner } from "react-icons/fa";

const API = "http://localhost:8081";

export default function CodigoPostalInput({ value, onChange, disabled = false }) {
    const [colonias, setColonias] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const token = localStorage.getItem("token");
    const debounceRef = useRef(null);

    const buscarCp = useCallback(async (cp) => {
        setError("");
        setColonias([]);

        if (cp.length !== 5) return;

        setCargando(true);
        try {
            const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
            const res = await fetch(`${API}/catalogos-sat/codigos-postales/${cp}`, { headers });

            if (res.status === 404) {
                setError("Codigo postal no encontrado.");
                onChange({ ...value, cp, estado: "", municipio: "", localidad: "", colonia: "" });
                setCargando(false);
                return;
            }
            if (!res.ok) throw new Error("Error al consultar el codigo postal");

            const data = await res.json();
            setColonias(data.colonias || []);
            onChange({
                ...value,
                cp,
                estado: data.estado || "",
                municipio: data.municipio || "",
                localidad: data.localidad || "",
                colonia: data.colonias?.length === 1 ? data.colonias[0] : "",
            });
        } catch (e) {
            console.error(e);
            setError("No se pudo consultar el codigo postal.");
        }
        setCargando(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleCpChange = (e) => {
        const cp = e.target.value.replace(/\D/g, "").slice(0, 5);
        onChange({ ...value, cp, estado: "", municipio: "", localidad: "", colonia: "" });

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => buscarCp(cp), 350);
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
                <label className="block text-xs font-bold text-gray-400 mb-1">Codigo Postal</label>
                <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                    <input
                        value={value.cp || ""}
                        onChange={handleCpChange}
                        disabled={disabled}
                        maxLength={5}
                        inputMode="numeric"
                        placeholder="Ej. 64000"
                        className="w-full bg-white/5 border border-cyan-400/10 rounded-xl pl-11 pr-10 py-3 text-white outline-none focus:border-cyan-400/40 transition-all disabled:opacity-50"
                    />
                    {cargando && (
                        <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 text-sm animate-spin" />
                    )}
                </div>
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Colonia</label>
                <select
                    value={value.colonia || ""}
                    onChange={(e) => onChange({ ...value, colonia: e.target.value })}
                    disabled={disabled || colonias.length === 0}
                    className="w-full bg-[#020617] border border-cyan-400/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400/40 transition-all disabled:opacity-50"
                >
                    <option value="">
                        {colonias.length === 0 ? "Ingresa un codigo postal valido" : "Selecciona una colonia"}
                    </option>
                    {colonias.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Estado</label>
                <input
                    value={value.estado || ""}
                    readOnly
                    placeholder="Se completa automaticamente"
                    className="w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-gray-300 outline-none cursor-not-allowed"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Municipio</label>
                <input
                    value={value.municipio || ""}
                    readOnly
                    placeholder="Se completa automaticamente"
                    className="w-full bg-white/5 border border-cyan-400/10 rounded-xl px-4 py-3 text-gray-300 outline-none cursor-not-allowed"
                />
            </div>
        </div>
    );
}
