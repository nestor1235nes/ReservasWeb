import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/authContext";
import CalendarioPage from "./pages/CalendarioPage";
import TodayPage from "./pages/TodayPage";
import CalendarioAsistentePage from "./pages/CalendarioAsistentePage";

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <h1>Loading...</h1>;
  if (!isAuthenticated && !loading) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export const CalendarioRoute = () => {
  const { user } = useAuth();

  if(user.especialidad === "ASISTENTE" || user.especialidad === "SECRETARIO"){
    return <CalendarioAsistentePage />;
  }
  return <TodayPage />;
}
