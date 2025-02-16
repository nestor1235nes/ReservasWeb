import { createContext, useContext, useState } from "react";
import { getPacientePorRutRequest, getPacienteRequest, getPacientesRequest, updatePacienteRequest, createPacienteRequest } from "../api/pacientes";

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
      await createPacienteRequest(paciente);
      getPacientes();
    } catch (error) {
      console.error(error);
    }
  }

  const updatePaciente = async (id, paciente) => {
    try {
      await updatePacienteRequest(id, paciente);
      getPacientes();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <PacienteContext.Provider value={{getPacientes, getPaciente, createPaciente, updatePaciente, getPacientePorRut }}>
      {children}
    </PacienteContext.Provider>
  );
};

export default PacienteContext;