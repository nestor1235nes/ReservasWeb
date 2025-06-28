import { createContext, useContext, useState } from "react";
import { getPacientePorRutRequest, 
  getPacienteRequest, 
  getPacientesRequest, 
  updatePacienteRequest, 
  createPacienteRequest,
  getPacientesUsuarioRequest
 } from "../api/pacientes";

const PacienteContext = createContext();

export const usePaciente = () => {
  const context = useContext(PacienteContext);
  if (!context) throw new Error("usePaciente must be used within a PacienteProvider");
  return context;
}

export const PacienteProvider = ({ children }) => {
  
  const getPacientePorRut = async (rut) => {
    try {
      const response = await getPacientePorRutRequest(rut);
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
      console.log('Respuesta de createPaciente en contexto:', response); // Debug
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

  const getPacientesUsuario = async () => {
    try {
      const response = await getPacientesUsuarioRequest();
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
      getPacientesUsuario
       }}>
      {children}
    </PacienteContext.Provider>
  );
};

export default PacienteContext;