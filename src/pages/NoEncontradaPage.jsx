import { Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

// Una dirección que no corresponde a ninguna pantalla (la ruta comodín de
// App.jsx): lo dice y lleva al inicio, en lugar de dejar la pantalla vacía.
export default function NoEncontradaPage() {
    const { pathname } = useLocation();
    return (
        <div className="flex min-h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar />
            <div className="flex-1 p-5 md:p-10 flex items-center justify-center">
                <div className="rounded-3xl bg-white/5 border border-cyan-400/10 backdrop-blur-xl p-10 text-center max-w-lg">
                    <h1 className="text-3xl md:text-5xl font-black text-cyan-300">Página no encontrada</h1>
                    <p className="text-gray-400 mt-4">
                        La dirección <span className="font-mono text-gray-300 break-all">{pathname}</span> no corresponde a ninguna pantalla.
                    </p>
                    <Link to="/dashboard"
                        className="inline-block mt-8 px-8 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20 transition-all">
                        Ir al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
