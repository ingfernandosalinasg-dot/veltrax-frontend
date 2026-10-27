// Fechas en la zona de la Ciudad de México (TEC-FECHA-LOCAL), la misma que usa
// el backend, sin depender de la zona de la computadora. toISOString() da la
// fecha en UTC: desde las 18:00 de México proponía la del día siguiente.
export const ZONA_NEGOCIO = "America/Mexico_City";

const formato = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_NEGOCIO, year: "numeric", month: "2-digit", day: "2-digit",
});

// "AAAA-MM-DD" de ese momento (por defecto, ahora) en la Ciudad de México.
export function fechaMexico(momento = new Date()) {
    const partes = Object.fromEntries(formato.formatToParts(momento).map(p => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day}`;
}

// Hoy en la Ciudad de México, "AAAA-MM-DD".
export const hoyMexico = () => fechaMexico();

// El mes en curso en la Ciudad de México, "AAAA-MM".
export const mesMexico = () => fechaMexico().slice(0, 7);
