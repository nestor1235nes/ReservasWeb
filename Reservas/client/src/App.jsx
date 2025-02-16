import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { AuthProvider } from "./context/authContext";
import { PacienteProvider } from "./context/pacienteContext";
import { ReservaProvider } from "./context/reservaContext";
import { ProtectedRoute } from "./routes";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";

function App() {
  return (
    <AuthProvider>
      <PacienteProvider>
        <ReservaProvider>
          <BrowserRouter>
            <main className="container content-container mx-auto px-10 md:px-0">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="*" element={<Navbar />} />
                </Route>
              </Routes>
            </main>
          </BrowserRouter>
        </ReservaProvider>
      </PacienteProvider>
    </AuthProvider>
  );
}

export default App;
