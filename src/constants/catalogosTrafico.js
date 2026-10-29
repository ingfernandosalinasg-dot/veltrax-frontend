// Catálogos de tráfico (Fase 1). El slug es el de la ruta del backend
// /api/catalogos-trafico/{slug} y coincide con TipoCatalogoTrafico.java.
export const CATALOGOS_TRAFICO = [
    { slug: "tipos-viaje",           nombre: "Tipos de viaje" },
    { slug: "clasificaciones-viaje", nombre: "Clasificaciones de viaje" },
    { slug: "grupos-clientes",       nombre: "Grupos de clientes" },
    { slug: "grupos-unidades",       nombre: "Grupos de unidades" },
    // VID-J5: los eventos de viaje llevan además abreviación y color.
    { slug: "eventos-viaje",         nombre: "Eventos de viaje", abreviacionYColor: true },
];
