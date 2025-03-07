import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { PacienteProvider } from "./context/pacienteContext";
import { ReservaProvider } from "./context/reservaContext";
import { AlertProvider } from './context/AlertContext';
import { ProtectedRoute } from "./routes";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { CalendarioPage } from "./pages/CalendarioPage";
import PerfilPage from "./pages/PerfilPage";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createTheme, ThemeProvider } from '@mui/material/styles';

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
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                        <Route path="/calendario" element={<CalendarioPage />} />
                        <Route path="/perfil" element={<PerfilPage />} />
                      </Route>
                    </Routes>
                  </main>
                </BrowserRouter>
              </ReservaProvider>
            </PacienteProvider>
          </AlertProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
