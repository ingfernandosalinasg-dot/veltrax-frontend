// La abreviación de un evento de viaje en su color (VID-J5), en Catálogos de
// tráfico y en la pestaña «Eventos» del viaje. Sin un color válido, en gris.
export default function ChipEvento({ abreviacion, color }) {
    const tono = /^#[0-9A-Fa-f]{6}$/.test(color || "") ? color : "#94A3B8";
    return (
        <span className="px-2 py-0.5 rounded-lg border text-xs font-black font-mono whitespace-nowrap"
            style={{ color: tono, borderColor: tono, backgroundColor: `${tono}26` }}>
            {abreviacion || "—"}
        </span>
    );
}
