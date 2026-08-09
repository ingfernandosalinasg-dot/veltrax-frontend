import {
    FaTruck, FaClipboardList, FaUserTie, FaChartBar,
    FaMapMarkedAlt, FaSignOutAlt, FaRoute, FaFileAlt,
    FaAddressBook, FaMapMarkerAlt, FaUsers, FaMoneyBillWave,
    FaFileDownload, FaBoxOpen, FaShoppingCart, FaTags
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaFileInvoiceDollar, FaBuilding } from "react-icons/fa";
import { FaBox } from "react-icons/fa";
import { FaHistory } from "react-icons/fa";
import { FaGavel } from "react-icons/fa";
import { FaUserShield, FaShieldAlt } from "react-icons/fa";
import { FaHandHoldingUsd, FaTrophy } from "react-icons/fa";
import { FaPills } from "react-icons/fa";
import { FaExclamationTriangle, FaTools, FaClipboardCheck, FaWrench } from "react-icons/fa";

function Sidebar() {
    const location = useLocation();

    // 鈹€鈹€ GIRO TRANSPORTE 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
    const transporte = [
        { name: "Dashboard",      path: "/dashboard",       icon: <FaChartBar /> },
        { name: "Viajes",         path: "/viajes",         icon: <FaRoute /> },
        { name: "Liquidaciones",  path: "/liquidaciones",  icon: <FaMoneyBillWave /> },
        { name: "Pr茅stamos",      path: "/prestamos",      icon: <FaHandHoldingUsd /> },
        { name: "Umbrales",       path: "/umbrales",       icon: <FaTrophy /> },
        { name: "Cartas Porte",   path: "/cartas-porte",   icon: <FaFileAlt /> },
        { name: "Tracking GPS",   path: "/tracking",       icon: <FaMapMarkedAlt /> },
        { name: "Cobranza",       path: "/cobranza",       icon: <FaMoneyBillWave /> },
        { name: "Facturas",       path: "/facturas",       icon: <FaFileInvoiceDollar /> },
        { name: "Cajas",          path: "/cajas",          icon: <FaBox /> },
        { name: "Reportes",       path: "/reportes",       icon: <FaFileDownload /> },
    ];

    const catalogosTransporte = [
        { name: "Clientes",       path: "/clientes",       icon: <FaUsers /> },
        { name: "Operadores",     path: "/operadores",     icon: <FaUserTie /> },
        { name: "Veh铆culos",      path: "/vehicles",       icon: <FaTruck /> },
        { name: "Rutas",          path: "/rutas",          icon: <FaRoute /> },
        { name: "Remitentes",     path: "/remitentes",     icon: <FaAddressBook /> },
        { name: "Destinatarios",  path: "/destinatarios",  icon: <FaMapMarkerAlt /> },
    ];

    // 鈹€鈹€ MANTENIMIENTO 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
    const mantenimiento = [
        { name: "Reportes de Falla",      path: "/reportes-falla",         icon: <FaExclamationTriangle /> },
        { name: "Mantenimientos",         path: "/mantenimientos",         icon: <FaWrench /> },
        { name: "脫rdenes de Servicio",    path: "/ordenes-servicio",       icon: <FaTools /> },
        { name: "Servicios Completados",  path: "/servicios-completados",  icon: <FaClipboardCheck /> },
    ];

    // 鈹€鈹€ GIRO BIENES Y SERVICIOS 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
    const bienesServicios = [
        { name: "Licitaciones",   path: "/licitaciones",        icon: <FaGavel /> },
        { name: "脫rdenes Compra", path: "/ordenes-compra",      icon: <FaShoppingCart /> },
        { name: "Cat谩logo",       path: "/catalogo-articulos",  icon: <FaPills /> },
    ];

    // 鈹€鈹€ COMPARTIDO 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
    const compartido = [
        { name: "Proveedores",     path: "/proveedores",     icon: <FaTruck /> },
        { name: "Cat谩logos SAT",   path: "/catalogos-sat",   icon: <FaTags /> },
        { name: "Empresa",         path: "/empresa",         icon: <FaBuilding /> },
        { name: "Bit谩cora",        path: "/bitacora",        icon: <FaHistory /> },
        { name: "脫rdenes",         path: "/orders",          icon: <FaClipboardList /> },
    ];

    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    const NavItem = ({ item, index }) => (
        <motion.div key={item.path} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
            <Link to={item.path} className={`
                relative flex items-center gap-4 px-6 py-3 rounded-2xl
                transition-all duration-300 overflow-hidden
                ${location.pathname === item.path
                    ? "bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                    : "bg-white/5 border border-white/5 text-gray-300 hover:bg-cyan-500/10 hover:border-cyan-400/20 hover:text-cyan-300"
                }`}>
                {location.pathname === item.path && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-cyan-300" />
                )}
                <div className="text-lg">{item.icon}</div>
                <span className="font-semibold text-sm">{item.name}</span>
            </Link>
        </motion.div>
    );

    const SectionTitle = ({ label, color = "text-gray-500" }) => (
        <p className={`${color} text-xs font-black uppercase tracking-widest px-2 mb-2 mt-4`}>{label}</p>
    );

    const isAdmin = localStorage.getItem("role") === "ADMIN";

    return (
        <div className="w-[260px] h-screen flex flex-col justify-between p-4 bg-[#020617] border-r border-cyan-500/10 backdrop-blur-xl relative h-screen overflow-y-auto">
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle at top,#06b6d4,transparent 60%)" }} />

            <div>
                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 mt-2">
                    <h1 className="text-center text-4xl font-black tracking-widest text-cyan-300 drop-shadow-[0_0_25px_rgba(0,255,255,0.5)]">
                        VELTRAX
                    </h1>
                    <div className="mt-2 flex justify-center">
                        <span className="px-4 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs tracking-[4px]">
                            LOGISTICS ERP AI
                        </span>
                    </div>
                </motion.div>

                {/* GIRO TRANSPORTE */}
                <div className="mb-1">
                    <div className="flex items-center gap-2 px-2 mb-2 mt-2">
                        <div className="h-px flex-1 bg-cyan-400/20" />
                        <p className="text-cyan-400 text-xs font-black uppercase tracking-widest">馃殯 Transporte</p>
                        <div className="h-px flex-1 bg-cyan-400/20" />
                    </div>
                    <div className="space-y-1">
                        {transporte.map((item, i) => <NavItem key={item.path} item={item} index={i} />)}
                    </div>
                </div>

                {/* Cat谩logos Transporte */}
                <div className="mb-1">
                    <SectionTitle label="Cat谩logos Transporte" />
                    <div className="space-y-1">
                        {catalogosTransporte.map((item, i) => <NavItem key={item.path} item={item} index={i} />)}
                    </div>
                </div>

                {/* MANTENIMIENTO */}
                <div className="mb-1">
                    <div className="flex items-center gap-2 px-2 mb-2 mt-4">
                        <div className="h-px flex-1 bg-orange-400/20" />
                        <p className="text-orange-400 text-xs font-black uppercase tracking-widest">馃敡 Mantenimiento</p>
                        <div className="h-px flex-1 bg-orange-400/20" />
                    </div>
                    <div className="space-y-1">
                        {mantenimiento.map((item, i) => <NavItem key={item.path} item={item} index={i} />)}
                    </div>
                </div>

                {/* GIRO BIENES Y SERVICIOS */}
                <div className="mb-1">
                    <div className="flex items-center gap-2 px-2 mb-2 mt-4">
                        <div className="h-px flex-1 bg-purple-400/20" />
                        <p className="text-purple-400 text-xs font-black uppercase tracking-widest">馃拪 Bienes y Servicios</p>
                        <div className="h-px flex-1 bg-purple-400/20" />
                    </div>
                    <div className="space-y-1">
                        {bienesServicios.map((item, i) => <NavItem key={item.path} item={item} index={i} />)}
                    </div>
                </div>

                {/* COMPARTIDO */}
                <div className="mb-1">
                    <SectionTitle label="General" />
                    <div className="space-y-1">
                        {compartido.map((item, i) => <NavItem key={item.path} item={item} index={i} />)}
                    </div>
                </div>

                {/* ADMINISTRACI脫N */}
                {isAdmin && (
                    <div className="mb-1">
                        <SectionTitle label="Administraci贸n" color="text-yellow-500/70" />
                        <div className="space-y-1">
                            {[
                                { name: "Usuarios", path: "/usuarios", icon: <FaUserShield /> },
                                { name: "Permisos", path: "/permisos", icon: <FaShieldAlt /> },
                                { name: "Licencias", path: "/licencias", icon: <FaTrophy /> }
                            ].map((item, i) => (
                                <NavItem key={item.path} item={item} index={i} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4">
                <div className="mb-3 rounded-2xl p-3 bg-cyan-500/5 border border-cyan-500/10">
                    <p className="text-gray-400 text-xs">Sistema</p>
                    <h3 className="text-cyan-300 font-bold text-sm mt-0.5">Veltrax ERP v2.0</h3>
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={logout}
                    className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all text-sm">
                    <FaSignOutAlt /> Cerrar Sesión
                </motion.button>
            </div>
        </div>
    );
}

export default Sidebar;





