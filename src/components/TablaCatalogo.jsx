import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaSort, FaSortUp, FaSortDown, FaFileCsv } from "react-icons/fa";
import { hoyMexico } from "../utils/fechas";

// Tabla reutilizable para catálogos (Fase 0, D5). Todo ocurre en el navegador
// sobre `filas`: búsqueda general, filtro y orden por columna, paginación
// (25/50/100), "Únicamente activos" opcional, columna de acciones y exportación
// CSV de los registros filtrados (todas las páginas).
//
// Props:
// - columnas: [{ clave, titulo, valor?, render?, filtrable?, ordenable? }]
//     valor(fila): texto para buscar, filtrar, ordenar y exportar (por omisión, fila[clave]).
//     render(fila): contenido de la celda (por omisión, el valor).
//     filtrable y ordenable: true por omisión.
// - filas: registros a mostrar.
// - claveFila(fila): clave única de cada fila (por omisión, fila.id).
// - acciones(fila): botones de la columna "Acciones" (no se filtra, ordena ni exporta).
// - esActivo(fila): si se indica, aparece la casilla "Únicamente activos".
// - nombreArchivo: prefijo del archivo CSV.
// - vacio: texto cuando no hay registros.

const TAMANOS = [25, 50, 100];

// Una hoja de cálculo interpreta como fórmula la celda que empieza con estos
// caracteres (inyección CSV): al exportar se les antepone un apóstrofo.
const INICIOS_PELIGROSOS = ["=", "+", "-", "@", "\t", "\r"];

const comoTexto = (valor) => (valor === null || valor === undefined ? "" : String(valor));
const sinAcentos = (valor) => comoTexto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const valorDe = (columna, fila) => comoTexto(columna.valor ? columna.valor(fila) : fila[columna.clave]);

function celdaCsv(valor) {
    let texto = comoTexto(valor);
    if (INICIOS_PELIGROSOS.some(inicio => texto.startsWith(inicio))) texto = "'" + texto;
    return `"${texto.replace(/"/g, '""')}"`;
}

const botonPagina = "px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed";

export default function TablaCatalogo({
    columnas, filas, claveFila = (fila) => fila.id, acciones, esActivo,
    nombreArchivo = "catalogo", vacio = "No hay registros",
}) {
    const [busqueda,    setBusqueda]    = useState("");
    const [filtros,     setFiltros]     = useState({});
    const [orden,       setOrden]       = useState({ clave: null, ascendente: true });
    const [tamano,      setTamano]      = useState(TAMANOS[0]);
    const [pagina,      setPagina]      = useState(1);
    const [soloActivos, setSoloActivos] = useState(false);

    const hayFilas = Array.isArray(filas) && filas.length > 0;

    const visibles = useMemo(() => {
        const lista = Array.isArray(filas) ? filas : [];
        const q = sinAcentos(busqueda.trim());
        const filtradas = lista.filter(fila => {
            if (soloActivos && esActivo && !esActivo(fila)) return false;
            if (q && !columnas.some(c => sinAcentos(valorDe(c, fila)).includes(q))) return false;
            return columnas.every(c => {
                const filtro = sinAcentos((filtros[c.clave] || "").trim());
                return !filtro || sinAcentos(valorDe(c, fila)).includes(filtro);
            });
        });
        const columna = columnas.find(c => c.clave === orden.clave);
        if (!columna) return filtradas;
        return [...filtradas].sort((a, b) => {
            const r = valorDe(columna, a).localeCompare(valorDe(columna, b), "es", { numeric: true, sensitivity: "base" });
            return orden.ascendente ? r : -r;
        });
    }, [filas, columnas, busqueda, filtros, orden, soloActivos, esActivo]);

    const total   = visibles.length;
    const paginas = Math.max(1, Math.ceil(total / tamano));
    const actual  = Math.min(pagina, paginas);
    const inicio  = (actual - 1) * tamano;
    const enPagina = visibles.slice(inicio, inicio + tamano);
    const desde   = total === 0 ? 0 : inicio + 1;
    const hasta   = Math.min(inicio + tamano, total);

    // Ascendente → descendente → sin orden.
    const ordenarPor = (clave) => {
        setOrden(o => o.clave !== clave ? { clave, ascendente: true }
            : o.ascendente ? { clave, ascendente: false } : { clave: null, ascendente: true });
    };

    const cambiarFiltro = (clave, valor) => {
        setFiltros(f => ({ ...f, [clave]: valor }));
        setPagina(1);
    };

    const exportar = () => {
        const lineas = [columnas.map(c => celdaCsv(c.titulo)).join(",")];
        visibles.forEach(fila => lineas.push(columnas.map(c => celdaCsv(valorDe(c, fila))).join(",")));
        // El BOM hace que Excel abra el archivo como UTF-8 y conserve los acentos.
        const blob = new Blob(["\ufeff" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `${nombreArchivo}_${hoyMexico()}.csv`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    };

    const iconoOrden = (clave) => orden.clave !== clave ? <FaSort className="opacity-40" />
        : orden.ascendente ? <FaSortUp /> : <FaSortDown />;

    const columnasTotales = columnas.length + (acciones ? 1 : 0);

    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
                    placeholder="Buscar..." aria-label="Buscar en la tabla"
                    className="flex-1 min-w-[200px] max-w-md bg-white/5 border border-cyan-400/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-cyan-400/40 transition-all" />
                {esActivo && (
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                        <input type="checkbox" checked={soloActivos}
                            onChange={e => { setSoloActivos(e.target.checked); setPagina(1); }}
                            className="w-4 h-4 accent-cyan-400" />
                        Únicamente activos
                    </label>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-400">
                    Mostrar
                    <select value={tamano} onChange={e => { setTamano(Number(e.target.value)); setPagina(1); }}
                        aria-label="Registros por página"
                        className="bg-[#020617] border border-cyan-400/10 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400/40 transition-all">
                        {TAMANOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
                <button type="button" onClick={exportar} disabled={total === 0}
                    title="Exporta los registros filtrados (todas las páginas)"
                    className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-400/30 text-green-300 font-bold text-sm hover:bg-green-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <FaFileCsv /> Exportar CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-gray-400 text-sm">
                            {columnas.map(c => (
                                <th key={c.clave} className="pb-2 pr-6 align-bottom">
                                    {c.ordenable === false ? c.titulo : (
                                        <button type="button" onClick={() => ordenarPor(c.clave)}
                                            aria-label={`Ordenar por ${c.titulo}`}
                                            className="flex items-center gap-1 hover:text-cyan-300 transition-all">
                                            {c.titulo} <span className="text-xs">{iconoOrden(c.clave)}</span>
                                        </button>
                                    )}
                                </th>
                            ))}
                            {acciones && <th className="pb-2">Acciones</th>}
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                            {columnas.map(c => (
                                <th key={c.clave} className="pb-3 pr-6 font-normal">
                                    {c.filtrable !== false && (
                                        <input value={filtros[c.clave] || ""} onChange={e => cambiarFiltro(c.clave, e.target.value)}
                                            placeholder="Filtrar" aria-label={`Filtrar ${c.titulo}`}
                                            className="w-full min-w-[80px] bg-white/5 border border-cyan-400/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/40 transition-all" />
                                    )}
                                </th>
                            ))}
                            {acciones && <th />}
                        </tr>
                    </thead>
                    <tbody>
                        {enPagina.length === 0 && (
                            <tr>
                                <td colSpan={columnasTotales} className="py-10 text-center text-gray-500">
                                    {hayFilas ? "Ningún registro coincide con la búsqueda" : vacio}
                                </td>
                            </tr>
                        )}
                        {enPagina.map((fila, i) => (
                            <motion.tr key={claveFila(fila)} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                className="border-b border-cyan-400/5 hover:bg-cyan-500/5 transition-all">
                                {columnas.map(c => (
                                    <td key={c.clave} className="py-4 pr-6">{c.render ? c.render(fila) : valorDe(c, fila)}</td>
                                ))}
                                {acciones && <td className="py-4">{acciones(fila)}</td>}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 text-sm text-gray-400">
                <p>Mostrando registros del {desde} al {hasta} de {total}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setPagina(1)} disabled={actual === 1} className={botonPagina}>Primero</button>
                    <button type="button" onClick={() => setPagina(actual - 1)} disabled={actual === 1} className={botonPagina}>Anterior</button>
                    <span className="px-2">Página {actual} de {paginas}</span>
                    <button type="button" onClick={() => setPagina(actual + 1)} disabled={actual === paginas} className={botonPagina}>Siguiente</button>
                    <button type="button" onClick={() => setPagina(paginas)} disabled={actual === paginas} className={botonPagina}>Último</button>
                </div>
            </div>
        </div>
    );
}
