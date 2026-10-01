// URL base del backend (Veltrax API).
//
// Se toma EXCLUSIVAMENTE de la variable de entorno VITE_API_URL:
//   - npm run dev   -> .env.development  (http://localhost:8081)
//   - npm run build -> .env.production   (https://veltrax-api-production.up.railway.app)
//
// No hay URL de respaldo a propósito: si la variable falta, es mejor que la
// app falle con un mensaje claro que conectarse sin avisar al servidor
// equivocado (por ejemplo, a producción mientras se prueba en local).
const url = import.meta.env.VITE_API_URL;

if (!url) {
    throw new Error(
        "Falta la variable de entorno VITE_API_URL. " +
        "Revisa .env.development (local) o .env.production (producción). " +
        "Ver .env.example."
    );
}

export const API_URL = url.replace(/\/+$/, "");
