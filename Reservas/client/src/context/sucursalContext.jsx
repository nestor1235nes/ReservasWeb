import { createContext, useContext } from "react";
import { 
  getSucursalesRequest, 
  getSucursalRequest, 
  createSucursalRequest, 
  deleteSucursalRequest, 
  updateSucursalRequest, 
  getReservasSucursalRequest, 
  esAdminRequest,
  agregarAsistenteRequest,
  eliminarAsistenteRequest,
  getAsistentesSucursalRequest,
  agregarProfesionalRequest,
  getProfesionalesSucursalRequest,
  quitarProfesionalRequest
 } from "../api/sucursales";

const SucursalContext = createContext();

export const useSucursal = () => {
  const context = useContext(SucursalContext);
  if (!context) throw new Error("useSucursal must be used within a SucursalProvider");
  return context;
}

export const SucursalProvider = ({ children }) => {
  const getSucursales = async () => {
    try {
      const response = await getSucursalesRequest();
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const getSucursal = async () => {
    try {
      const response = await getSucursalRequest();
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const createSucursal = async (sucursal) => {
    try {
      await createSucursalRequest(sucursal);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  }

  const updateSucursal = async (id, sucursal) => {
    try {
      await updateSucursalRequest(id, sucursal);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  }

  const deleteSucursal = async (id) => {
    try {
      await deleteSucursalRequest(id);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  }

  const getReservasSucursal = async (id) => {
    try {
      const response = await getReservasSucursalRequest(id);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const getAsistentesSucursal = async (id) => {
    try {
      const response = await getAsistentesSucursalRequest(id);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  const esAdmin = async (id) => {
    try {
      const response = await esAdminRequest(id);
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  const agregarAsistente = async (sucursalId, asistenteId) => {
    try {
      await agregarAsistenteRequest(sucursalId, asistenteId);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarAsistente = async (sucursalId, asistenteId) => {
    try {
      await eliminarAsistenteRequest(sucursalId, asistenteId);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  };

  const agregarProfesional = async (sucursalId, profesionalId) => {
    try {
      await agregarProfesionalRequest(sucursalId, profesionalId);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  }

  const quitarProfesional = async (sucursalId, profesionalId) => {
    try {
      await quitarProfesionalRequest(sucursalId, profesionalId);
      getSucursales();
    } catch (error) {
      console.error(error);
    }
  };

  const getProfesionalesSucursal = async (sucursalId) => {
    try {
      const response = await getProfesionalesSucursalRequest(sucursalId);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <SucursalContext.Provider value={{ 
        getSucursales, 
        getSucursal, 
        createSucursal, 
        updateSucursal,
        getReservasSucursal, 
        deleteSucursal,
        esAdmin,
        agregarAsistente,
        eliminarAsistente,
        getAsistentesSucursal,
        agregarProfesional,
        getProfesionalesSucursal,
        quitarProfesional
        }}>
      {children}
    </SucursalContext.Provider>
  );
}