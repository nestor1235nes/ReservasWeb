import { createContext, useContext, useState } from "react";
import { getHistorialRequest, getReservaRequest, getReservasRequest, updateReservaRequest, deleteReservaRequest, createReservaRequest, addHistorialRequest, obtenerPacientesSinSesionesRequest } from "../api/reservas";

const ReservaContext = createContext();

export const useReserva = () => {
  const context = useContext(ReservaContext);
  if (!context) throw new Error("useReserva must be used within a PacienteProvider");
  return context;
}

export const ReservaProvider = ({ children }) => {
  
  const getReservas = async () => {
    try {
      const response = await getReservasRequest();
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const getReserva = async (rut) => {
    try {
      const response = await getReservaRequest(rut);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const createReserva = async (rut, reserva) => {
    try {
      await createReservaRequest(rut, reserva);
      
      return getReservas();
    } catch (error) {
      console.error(error);
    }
  }

  const deleteReserva = async (id) => {
    try {
      await deleteReservaRequest(id);
      getReservas();
    } catch (error) {
      console.error(error);
    }
  }

  const updateReserva = async (rut, reserva) => {
    try {
      await updateReservaRequest(rut, reserva);
      await getReservas();
    } catch (error) {
      console.error(error);
    }
  }

  const getHistorial = async (rut) => {
    try {
      const response = await getHistorialRequest(rut);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const addHistorial = async (rut, data) => {
    try {
      console.log(rut, data);
      await addHistorialRequest(rut, data);
      return getReservas();
    } catch (error) {
      console.error(error);
    }
  }

  // funciones

  const pacientesSinSesiones = async () => {
    try {
      const response = await obtenerPacientesSinSesionesRequest();
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <ReservaContext.Provider value={{getReservas, getReserva, createReserva, deleteReserva, updateReserva, getHistorial, addHistorial, pacientesSinSesiones }}>
      {children}
    </ReservaContext.Provider>
  );
};

export default ReservaContext;