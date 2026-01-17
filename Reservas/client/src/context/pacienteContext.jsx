import { createContext, useContext, useState } from "react";
import { getPacientePorRutRequest, 
  getPacienteRequest, 
  getPacientesRequest, 
  updatePacienteRequest, 
  createPacienteRequest,
  getPacientesUsuarioRequest,
  updatePacientePublicPorRutRequest
 } from "../api/pacientes";
import { getPacientesSucursalRequest } from "../api/sucursales";

const PacienteContext = createContext();

export const usePaciente = () => {
  const context = useContext(PacienteContext);
  if (!context) throw new Error("usePaciente must be used within a PacienteProvider");
  return context;
}

export const PacienteProvider = ({ children }) => {
  
  const getPacientePorRut = async (rut, token) => {
    try {
      const response = await getPacientePorRutRequest(rut, token);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const getPacientes = async () => {
    try {
      const response = await getPacientesRequest();
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const getPaciente = async (id) => {
    try {
      const response = await getPacienteRequest(id);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const createPaciente = async (paciente) => {
    try {
      const response = await createPacienteRequest(paciente);
      // Debug: Respuesta de createPaciente en contexto
      getPacientes();
      return response.data; // Asegurar que se retorne la data
    } catch (error) {
      console.error('Error en createPaciente:', error);
      throw error; // Re-throw para que el componente pueda manejarlo
    }
  }

  const updatePaciente = async (rut, paciente) => {
    try {
      await updatePacienteRequest(rut, paciente);
      getPacientes();
    } catch (error) {
      console.error(error);
    }
  }

  // Actualización pública para portal del paciente (por RUT)
  const updatePacientePublicPorRut = async (rut, data, token) => {
    try {
      const response = await updatePacientePublicPorRutRequest(rut, data, token);
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const getPacientesUsuario = async () => {
    try {
      const response = await getPacientesUsuarioRequest();
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  const getPacientesSucursal = async (sucursalId) => {
    try {
      const response = await getPacientesSucursalRequest(sucursalId);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PacienteContext.Provider value={{
      getPacientes, 
      getPaciente, 
      createPaciente, 
      updatePaciente, 
      getPacientePorRut,
      getPacientesUsuario,
      getPacientesSucursal,
      updatePacientePublicPorRut
       }}>
      {children}
    </PacienteContext.Provider>
  );
};

export default PacienteContext;