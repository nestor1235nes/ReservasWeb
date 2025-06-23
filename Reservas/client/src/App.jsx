import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { PacienteProvider } from "./context/pacienteContext";
import { ReservaProvider } from "./context/reservaContext";
import { AlertProvider } from './context/AlertContext';
import { SucursalProvider } from "./context/sucursalContext";
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
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PatientsPage from "./pages/PatientsPage";
import { ProtectedRoute } from "./routes";
import { PerfilPage } from "./pages/PerfilPage";
import GestionarAsistentes from "./pages/Sucursales/GestionarAsistentes";
import GestionarProfesionales from "./pages/Sucursales/GestionarProfesionales";


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
      gapi.load('client:auth2', initClient);
    }
    start();
  }, []);

  // Oculta sidebar y drawer en la ruta base "/"
  const hideSidebar = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SucursalProvider>
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
                    <Box flexGrow={1} p={{ xs: 1, sm: 3 }}>
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
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route element={<ProtectedRoute />}>
                          <Route path="/calendario" element={<CalendarioPage />} />
                          <Route path="/hoy" element={<TodayPage />} />
                          <Route path="/perfil" element={<PerfilPage />} />
                          <Route path="/pacientes" element={<PatientsPage />} />
                          <Route path="/sucursal/asistentes" element={<GestionarAsistentes />} />
                          <Route path="/sucursal/profesionales" element={<GestionarProfesionales />} />
                        </Route>
                        {/* Agrega aquí más rutas si lo necesitas */}
                      </Routes>
                    </Box>
                  </Box>
                </ReservaProvider>
              </PacienteProvider>
            </AlertProvider>
          </AuthProvider>
        </SucursalProvider>
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