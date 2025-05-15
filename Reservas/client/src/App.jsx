import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/authContext"; // Importa useAuth
import { PacienteProvider } from "./context/pacienteContext";
import { ReservaProvider } from "./context/reservaContext";
import { AlertProvider } from './context/AlertContext';
import { ProtectedRoute, CalendarioRoute } from "./routes";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { CalendarioPage } from "./pages/CalendarioPage";
import { SucursalProvider } from "./context/sucursalContext";
import PerfilPage from "./pages/PerfilPage";
import CalendarioAsistentePage from "./pages/CalendarioAsistentePage";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useEffect } from 'react';
import { gapi } from 'gapi-script';
import { initClient } from './googleCalendarConfig';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {

  useEffect(() => {
    function start() {
      gapi.load('client:auth2', initClient);
    }
    start();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SucursalProvider>
          <AuthProvider>
            <AlertProvider>
              <PacienteProvider>
                <ReservaProvider>
                  <BrowserRouter>
                    <main className="container content-container mx-auto px-10 md:px-0">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route element={<ProtectedRoute />}>
                          {/* Verifica la especialidad del usuario */}
                          <Route path="/calendario" element={<CalendarioRoute />} />
                          <Route path="/perfil" element={<PerfilPage />} />
                        </Route>
                      </Routes>
                    </main>
                  </BrowserRouter>
                </ReservaProvider>
              </PacienteProvider>
            </AlertProvider>
          </AuthProvider>
        </SucursalProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;