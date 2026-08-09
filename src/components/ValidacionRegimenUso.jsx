import { useState, useEffect } from "react";
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

/**
 * ValidacionRegimenUso
 *
 * Muestra una advertencia (sin bloquear el guardado) si la combinaci贸n
 * de R茅gimen Fiscal + Uso de CFDI no est谩 en la matriz oficial del SAT.
 *
 * Props:
 *   regimen - clave del r茅gimen fiscal (ej. "601")
 *   uso     - clave del uso de CFDI (ej. "G03")
 *
 * Uso:
 *   <ValidacionRegimenUso regimen={form.regimenFiscal} uso={form.usoCfdi} />
 *   (col贸calo justo debajo de los selects de R茅gimen Fiscal y Uso CFDI)
 */
export default function ValidacionRegimenUso({ regimen, uso }) {
    const [estado, setEstado] = useState(null); // null = sin verificar, true = v谩lido, false = inv谩lido
    const [verificando, setVerificando] = useState(false);
    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!regimen || !uso) {
            setEstado(null);
            return;
        }

        let cancelado = false;
        setVerificando(true);

        const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
        fetch(`${API}/catalogos-sat/regimen-uso/validar?regimen=${regimen}&uso=${uso}`, { headers })
            .then(r => r.json())
            .then(data => { if (!cancelado) setEstado(data.valido); })
            .catch(() => { if (!cancelado) setEstado(null); })
            .finally(() => { if (!cancelado) setVerificando(false); });

        return () => { cancelado = true; };
    }, [regimen, uso, token]);

    if (!regimen || !uso || verificando || estado === null) return null;

    if (estado === true) {
        return (
            <div className="col-span-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 text-xs">
                <FaCheckCircle /> Combinaci贸n v谩lida seg煤n el cat谩logo del SAT.
            </div>
        );
    }

    return (
        <div className="col-span-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 text-xs">
            <FaExclamationTriangle />
            El Uso de CFDI "{uso}" no est谩 listado como v谩lido para el R茅gimen Fiscal "{regimen}" seg煤n el cat谩logo del SAT.
            Puedes guardar de todas formas, pero verifica antes de timbrar.
        </div>
    );
}






