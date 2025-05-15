import { createContext, useContext } from "react";
import { getSucursalesRequest, getSucursalRequest, createSucursalRequest, deleteSucursalRequest, updateSucursalRequest, getReservasSucursalRequest, esAdminRequest } from "../api/sucursales";

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

  const getSucursal = async (id) => {
    try {
      const response = await getSucursalRequest(id);
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

  const esAdmin = async (id) => {
    try {
      const response = await esAdminRequest(id);
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
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
        }}>
      {children}
    </SucursalContext.Provider>
  );
}