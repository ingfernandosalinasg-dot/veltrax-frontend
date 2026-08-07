import { useState } from "react";
import { FaSearch, FaBell, FaUserCircle } from "react-icons/fa";
import { motion } from "framer-motion";

function Topbar() {

    const [search, setSearch] = useState("");

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="
                flex
                justify-between
                items-center
                mb-10
                px-6
                py-4
                rounded-2xl
                bg-white/5
                border
                border-cyan-400/10
                backdrop-blur-xl
            "
        >
            {/* BUSCADOR */}
            <div className="flex items-center gap-3 bg-black/20 px-5 py-3 rounded-xl border border-cyan-400/10 w-80">
                <FaSearch className="text-cyan-400" />
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent outline-none text-white placeholder-gray-500 w-full text-lg"
                />
            </div>

            {/* DERECHA */}
            <div className="flex items-center gap-6">

                {/* ESTADO */}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(0,255,0,0.8)]" />
                    <span className="text-green-400 font-semibold">Sistema Online</span>
                </div>

                {/* NOTIFICACIONES */}
                <div className="relative cursor-pointer">
                    <FaBell className="text-2xl text-gray-400 hover:text-cyan-300 transition-all" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full text-xs flex items-center justify-center text-black font-bold">
                        3
                    </span>
                </div>

                {/* USUARIO */}
                <div className="flex items-center gap-3 cursor-pointer">
                    <FaUserCircle className="text-4xl text-cyan-300" />
                    <div>
                        <p className="text-white font-bold text-sm">Admin</p>
                        <p className="text-gray-400 text-xs">Veltrax ERP</p>
                    </div>
                </div>

            </div>

        </motion.div>
    );
}

export default Topbar;