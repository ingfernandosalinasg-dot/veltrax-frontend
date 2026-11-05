// Logo de Empresa (TEC-LOGO-DOCUMENTOS): lo sube el ADMIN en Datos Fiscales y lo lee
// cualquier sesión con GET /api/empresa/logo (el archivo no es público). Va en la
// vista previa de Empresa y en los impresos de Cartas Porte y Liquidaciones; la
// factura PDF lo pone el backend.
import { API_URL } from "../config/api";

const DATA_URL_LOGO = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

// El logo como data URL, o null si no hay logo, no hay sesión o no se pudo leer.
export async function logoEmpresa() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/api/empresa/logo`, {
            headers: token ? { Authorization: "Bearer " + token } : {},
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        const url = await new Promise(resolve => {
            const lector = new FileReader();
            lector.onloadend = () => resolve(typeof lector.result === "string" ? lector.result : null);
            lector.readAsDataURL(blob);
        });
        return url && DATA_URL_LOGO.test(url) ? url : null;
    } catch {
        return null;
    }
}

// Abre la pestaña del impreso antes de esperar al servidor, para que el navegador no
// la bloquee, y escribe el documento que arma armar(encabezado): el logo o, sin logo,
// el texto «VELTRAX» de siempre (con la clase .logo de cada impreso).
export async function imprimirConLogo(armar) {
    const w = window.open("", "_blank");
    if (!w) return;
    const logo = await logoEmpresa();
    const encabezado = logo
        ? `<img src="${logo}" alt="Logo" style="max-height:60px;max-width:200px;object-fit:contain"/>`
        : `<div class="logo">VELTRAX</div>`;
    w.document.write(armar(encabezado));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
}
