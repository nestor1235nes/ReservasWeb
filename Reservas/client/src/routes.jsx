import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/authContext";

export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <h1>Loading...</h1>;
  if (!isAuthenticated && !loading) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// Guard simple para vistas del paciente (por ahora login solo por RUT).
export const PatientProtectedRoute = () => {
  const rut = typeof window !== 'undefined' ? localStorage.getItem('patient_rut') : null;
  if (!rut) return <Navigate to="/paciente/login" replace />;
  return <Outlet />;
};
