import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import OrdersPage from "./pages/OrdersPage";
import TrackingPage from "./pages/TrackingPage";
import ViajesPage from "./pages/ViajesPage";
import CartaPortePage from "./pages/CartaPortePage";
import ProtectedRoute from "./components/ProtectedRoute";
import ClientesPage from "./pages/ClientesPage";
import OperadoresPage from "./pages/OperadoresPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import RemitentesPage from "./pages/RemitentesPage";
import DestinatariosPage from "./pages/DestinatariosPage";
import RutasPage from "./pages/RutasPage";
import LiquidacionesPage from "./pages/LiquidacionesPage";
import ReportesPage from "./pages/ReportesPage";
import FacturasPage from "./pages/FacturasPage";
import EmpresaPage from "./pages/EmpresaPage";
import CajasPage from "./pages/CajasPage";
import BitacoraPage from "./pages/BitacoraPage";
import LicitacionesPage from "./pages/LicitacionesPage";
import CobranzaPage from "./pages/CobranzaPage";
import PrestamosPage from "./pages/PrestamosPage";
import UmbralesPage from "./pages/UmbralesPage";
import CatalogoArticulosPage from "./pages/CatalogoArticulosPage";
import OrdenesCompraPage from "./pages/OrdenesCompraPage";
import CatalogosSatPage from "./pages/CatalogosSatPage";
import LicenciasPage from "./pages/LicenciasPage";
import UsuariosPage from "./pages/UsuariosPage";
import PermisosPage from "./pages/PermisosPage";
import ReportesFallaPage from "./pages/ReportesFallaPage";
import OrdenesServicioPage from "./pages/OrdenesServicioPage";
import ServiciosCompletadosPage from "./pages/ServiciosCompletadosPage";
import MantenimientosPage from "./pages/MantenimientosPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/viajes"             element={<ProtectedRoute><ViajesPage /></ProtectedRoute>} />
        <Route path="/vehicles"           element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
        <Route path="/orders"             element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/tracking"           element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
        <Route path="/cartas-porte"       element={<ProtectedRoute><CartaPortePage /></ProtectedRoute>} />
        <Route path="/clientes"           element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
        <Route path="/operadores"         element={<ProtectedRoute><OperadoresPage /></ProtectedRoute>} />
        <Route path="/proveedores"        element={<ProtectedRoute><ProveedoresPage /></ProtectedRoute>} />
        <Route path="/remitentes"         element={<ProtectedRoute><RemitentesPage /></ProtectedRoute>} />
        <Route path="/destinatarios"      element={<ProtectedRoute><DestinatariosPage /></ProtectedRoute>} />
        <Route path="/rutas"              element={<ProtectedRoute><RutasPage /></ProtectedRoute>} />
        <Route path="/liquidaciones"      element={<ProtectedRoute><LiquidacionesPage /></ProtectedRoute>} />
        <Route path="/reportes"           element={<ProtectedRoute><ReportesPage /></ProtectedRoute>} />
        <Route path="/facturas"           element={<ProtectedRoute><FacturasPage /></ProtectedRoute>} />
        <Route path="/empresa"            element={<ProtectedRoute><EmpresaPage /></ProtectedRoute>} />
        <Route path="/cajas"              element={<ProtectedRoute><CajasPage /></ProtectedRoute>} />
        <Route path="/bitacora"           element={<ProtectedRoute><BitacoraPage /></ProtectedRoute>} />
        <Route path="/licitaciones"       element={<ProtectedRoute><LicitacionesPage /></ProtectedRoute>} />
        <Route path="/cobranza"           element={<ProtectedRoute><CobranzaPage /></ProtectedRoute>} />
        <Route path="/prestamos"          element={<ProtectedRoute><PrestamosPage /></ProtectedRoute>} />
        <Route path="/umbrales"           element={<ProtectedRoute><UmbralesPage /></ProtectedRoute>} />
        <Route path="/catalogo-articulos" element={<ProtectedRoute><CatalogoArticulosPage /></ProtectedRoute>} />
        <Route path="/ordenes-compra"     element={<ProtectedRoute><OrdenesCompraPage /></ProtectedRoute>} />
        <Route path="/catalogos-sat"      element={<ProtectedRoute><CatalogosSatPage /></ProtectedRoute>} />
        <Route path="/licencias"          element={<ProtectedRoute><LicenciasPage /></ProtectedRoute>} />
        <Route path="/usuarios"           element={<ProtectedRoute><UsuariosPage /></ProtectedRoute>} />
        <Route path="/permisos"           element={<ProtectedRoute><PermisosPage /></ProtectedRoute>} />
        <Route path="/reportes-falla"        element={<ProtectedRoute><ReportesFallaPage /></ProtectedRoute>} />
        <Route path="/ordenes-servicio"      element={<ProtectedRoute><OrdenesServicioPage /></ProtectedRoute>} />
        <Route path="/servicios-completados" element={<ProtectedRoute><ServiciosCompletadosPage /></ProtectedRoute>} />
        <Route path="/mantenimientos"        element={<ProtectedRoute><MantenimientosPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
