import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { PacienteProvider } from "./context/pacienteContext";
import { ReservaProvider } from "./context/reservaContext";
import { AlertProvider } from './context/AlertContext';
import { SucursalProvider } from "./context/sucursalContext";
import { AnalyticsProvider } from "./context/analyticsContext";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createTheme, ThemeProvider, CssBaseline, Box, IconButton, Drawer, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { gapi } from 'gapi-script';
import { initClient } from './googleCalendarConfig';
import CalendarioPage from "./pages/CalendarioPage";
import SlideBar from "./components/SlideBar";
import TodayPage from "./pages/TodayPage";
import HomePage from "./pages/HomePage";
import HomePageNew from "./pages/HomePageNew";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PatientsPage from "./pages/PatientsPage";
import GraphicsPage from "./pages/GraphicsPage";
import PaymentConfirmPage from "./pages/PaymentConfirmPage";
import { ProtectedRoute, PatientProtectedRoute } from "./routes";
import { PerfilPage } from "./pages/PerfilPage";
import GestionarAsistentes from "./pages/Sucursales/GestionarAsistentes";
import GestionarProfesionales from "./pages/Sucursales/GestionarProfesionales";
import ReportesEmpresa from "./pages/Sucursales/ReportesEmpresa";
import ConfiguracionSucursal from "./pages/Sucursales/ConfiguracionSucursal";
import Telemedicina from "./pages/Telemedicina";
import PatientSession from "./pages/PatientSession";
import FrontUsers from "./pages/FrontUsers";
import ConfirmationPage from './pages/ConfirmationPage';
import LinkPage from "./pages/LinkPage";
import TemplateBuilderPage from "./pages/TemplateBuilderPage";
import { SubscriptionProvider } from "./context/subscriptionContext.jsx";
import AdminPlansPage from "./pages/AdminPlansPage.jsx";
import AdminWhatsAppPage from "./pages/AdminWhatsAppPage.jsx";
import PublicSucursalProfesionalesPage from "./pages/PublicSucursalProfesionalesPage.jsx";
import EnlaceSucursal from "./pages/Sucursales/EnlaceSucursal.jsx";
import WaitlistOfferPage from "./pages/WaitlistOfferPage.jsx";
import PacienteLoginPage from "./pages/PacienteLoginPage.jsx";
import PacientePortalPage from "./pages/PacientePortalPageFixed.jsx";


const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },
    secondary: { main: '#f50057' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
  },
});

function AppContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('Día Actual');
  const isMobile = useMediaQuery('(max-width:600px)');
  const location = useLocation();

  useEffect(() => {
    function start() {
      gapi.load('client', initClient);
    }
    start();
  }, []);

  const reservedTopLevel = new Set([
    'login',
    'register',
    'front-users',
    'p',
    'sucursal-publica',
    'confirmacion',
    'lista-espera',
    'telemedicina',
    'payment',
    'paciente',
    'calendario',
    'hoy',
    'perfil',
    'admin',
    'pacientes',
    'mi-enlace',
    'mi-empresa',
    'template-builder',
    'sucursal',
    'reportes',
  ]);

  const pathSegments = (location.pathname || '').split('/').filter(Boolean);
  const isPublicSucursalShort = pathSegments.length === 1 && !reservedTopLevel.has(pathSegments[0]);

  // Oculta sidebar y drawer en la ruta base "/" y en vistas públicas
  const hideSidebar =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/front-users" ||
    location.pathname.startsWith("/paciente/") ||
    location.pathname.startsWith("/confirmacion/") ||
    location.pathname.startsWith("/lista-espera/") ||
    location.pathname.startsWith("/telemedicina/join") ||
    location.pathname.startsWith("/sucursal-publica/") ||
    location.pathname.startsWith("/p/") ||
    isPublicSucursalShort;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SubscriptionProvider>        
          <SucursalProvider>
            <AnalyticsProvider>
              <AuthProvider>
                <AlertProvider>
                  <PacienteProvider>
                    <ReservaProvider>
                    <Box display="flex" bgcolor="#e9f5f9" minHeight="100vh">
                      {/* Sidebar Desktop */}
                      {!hideSidebar && (
                        <Box
                          sx={{
                            display: { xs: 'none', sm: 'block' },
                            width: 240,
                            flexShrink: 0,
                          }}
                        >
                          <SlideBar
                            selected={selectedMenu}
                            onSelect={(menu) => setSelectedMenu(menu)}
                          />
                        </Box>
                      )}
                      {/* Sidebar Mobile (Drawer) */}
                      {!hideSidebar && (
                        <Drawer
                          variant="temporary"
                          open={mobileOpen}
                          onClose={() => setMobileOpen(false)}
                          ModalProps={{ keepMounted: true }}
                          sx={{
                            display: { xs: 'block', sm: 'none' },
                            '& .MuiDrawer-paper': { width: 240 },
                          }}
                        >
                          <SlideBar
                            selected={selectedMenu}
                            onSelect={(menu) => {
                              setSelectedMenu(menu);
                              setMobileOpen(false);
                            }}
                          />
                        </Drawer>
                      )}
                      {/* Main Content */}
                      <Box flexGrow={1} p={hideSidebar ? 0 : { xs: 1, sm: 3 }}>
                        {!hideSidebar && isMobile && (
                          <IconButton
                            color="inherit"
                            edge="start"
                            onClick={() => setMobileOpen(true)}
                            sx={{ display: { sm: 'none' }, mb: 2 }}
                          >
                            <MenuIcon />
                          </IconButton>
                        )}
                        <Routes>
                          <Route path="/" element={<HomePageNew />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/paciente/login" element={<PacienteLoginPage />} />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route path="/front-users" element={<FrontUsers />} />
                          <Route path="/p/:slug" element={<FrontUsers />} />
                          <Route path="/sucursal-publica/:sucursalKey" element={<PublicSucursalProfesionalesPage />} />
                          {/* Ruta pública corta (sin prefijo) para sucursal por slug o id */}
                          <Route path="/:sucursalKey" element={<PublicSucursalProfesionalesPage />} />
                          <Route element={<PatientProtectedRoute />}>
                            <Route path="/paciente/portal" element={<PacientePortalPage />} />
                          </Route>
                          <Route element={<ProtectedRoute />}>
                            <Route path="/calendario" element={<CalendarioPage />} />
                            <Route path="/hoy" element={<TodayPage />} />
                            <Route path="/perfil" element={<PerfilPage />} />
                            <Route path="/admin/planes" element={<AdminPlansPage />} />
                            <Route path="/admin/whatsapp" element={<AdminWhatsAppPage />} />
                            <Route path="/pacientes" element={<PatientsPage />} />
                            <Route path="/mi-enlace" element={<LinkPage />} />
                            <Route path="/mi-empresa/enlace" element={<EnlaceSucursal />} />
                            <Route path="/template-builder" element={<TemplateBuilderPage />} />
                            <Route path="/sucursal/asistentes" element={<GestionarAsistentes />} />
                            <Route path="/sucursal/profesionales" element={<GestionarProfesionales />} />
                            <Route path="/mi-empresa/configuracion" element={<ConfiguracionSucursal />} />
                            <Route path="/mi-empresa/reportes" element={<ReportesEmpresa />} />
                            <Route path="/reportes" element={<GraphicsPage />} />
                            <Route path="/telemedicina/:reservaId?" element={<Telemedicina />} />
                          </Route>
                          <Route path="/telemedicina/join" element={<PatientSession />} />
                          {/* Ruta pública para confirmación de pago desde Webpay */}
                          <Route path="/payment/confirm" element={<PaymentConfirmPage />} />
                          {/* Ruta pública para confirmación de citas */}
                          <Route path="/confirmacion/:token" element={<ConfirmationPage />} />
                          {/* Ruta pública para aceptar hora de lista de espera */}
                          <Route path="/lista-espera/aceptar/:token" element={<WaitlistOfferPage />} />
                          
                        </Routes>
                      </Box>
                    </Box>
                  </ReservaProvider>
                </PacienteProvider>
              </AlertProvider>
            </AuthProvider>
            </AnalyticsProvider>
          </SucursalProvider>
        </SubscriptionProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

                        


function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;