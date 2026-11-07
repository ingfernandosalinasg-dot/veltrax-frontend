// TEC-VENCIMIENTOS: lo que calcula el servidor (GET /drivers/vencimientos y
// /vehicles/vencimientos) en texto y color para las pantallas. Cada renglón trae
// documento (LICENCIA o SEGURO), fecha, días y resultado: VENCIDO, NO_VALIDA,
// POR_VENCER (de hoy a 30 días) o VIGENTE.

export const DOCUMENTO = { LICENCIA: "Licencia", SEGURO: "Seguro" };

export const COLOR_VENCIMIENTO = {
    VENCIDO:    "text-red-400",
    NO_VALIDA:  "text-red-300",
    POR_VENCER: "text-yellow-400",
    VIGENTE:    "text-green-400",
};

export function textoVencimiento(r) {
    if (!r) return "";
    let texto;
    if (r.resultado === "NO_VALIDA") texto = "Fecha no válida";
    else if (r.resultado === "VENCIDO") texto = r.dias === -1 ? "Venció ayer" : `Venció hace ${-r.dias} días`;
    else if (r.dias === 0) texto = "Vence hoy";
    else if (r.dias === 1) texto = "Vence mañana";
    else texto = r.resultado === "POR_VENCER" ? `Vence en ${r.dias} días` : `${r.dias} días`;
    return r.datoAnterior ? `${texto} (dato anterior)` : texto;
}

// Los renglones por registro: { [id]: { LICENCIA: renglón, SEGURO: renglón } }.
export function porRegistro(resumen) {
    const mapa = {};
    for (const r of resumen?.renglones || []) {
        (mapa[r.id] ||= {})[r.documento] = r;
    }
    return mapa;
}

// El resumen, o null si no carga (sin permiso, sin conexión): la pantalla sigue
// sin las marcas.
export async function cargarVencimientos(url, headers) {
    try {
        const res = await fetch(url, { headers });
        return res.ok ? await res.json() : null;
    } catch {
        return null;
    }
}
