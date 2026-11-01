import { ESTATUS_ANTICIPO } from "../constants/estatusAnticipo";

// El estatus de un anticipo en su color (VID-K1), en la pantalla Anticipos y en
// la pestaña Gastos del viaje. Un estatus que no está en la lista, en gris.
export default function ChipEstatusAnticipo({ clave }) {
    const estatus = ESTATUS_ANTICIPO.find(e => e.clave === clave);
    const tono = estatus?.color || "#94A3B8";
    return (
        <span className="px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap"
            style={{ color: tono, backgroundColor: `${tono}1a`, borderColor: `${tono}4d` }}>
            {estatus?.descripcion || clave || "-"}
        </span>
    );
}
