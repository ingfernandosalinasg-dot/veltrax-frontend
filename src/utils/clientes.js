// Cómo se muestra un cliente en las pantallas: «número de cliente · nombre».
// El nombre es el fiscal, el corto o los de antes (name, company), el primero
// que exista; sin número ni nombre, «Cliente #id». Donde el backend manda el
// nombre ya armado (Cobranza, Liquidaciones, historiales) usa la misma regla.

const texto = (v) => (v == null ? "" : String(v).trim());

// El nombre, sin número: el fiscal primero. "" si no hay cliente o no tiene nombre.
export function nombreCliente(c) {
    if (!c) return "";
    return [c.nombre, c.razonSocial, c.name, c.company].map(texto).find(Boolean) || "";
}

// «número · nombre», o lo que exista de los dos. "" si no hay cliente.
export function etiquetaCliente(c) {
    if (!c) return "";
    const nombre = nombreCliente(c);
    const numero = texto(c.numeroCliente);
    if (!nombre && !numero) return c.id != null ? `Cliente #${c.id}` : "";
    return [numero, nombre].filter(Boolean).join(" · ");
}
