import { useEffect } from "react";
import { createContext, useContext, useState } from "react";
import { 
  loginRequest, 
  registerRequest, 
  verifyTokenRequest, 
  updatePerfilRequest, 
  getAllUsersRequest, 
  deleteNotificationsRequest, 
  deleteBloqueHorarioRequest, 
  registerUserOnlyRequest,
  deleteUserRequest,
  addServicioRequest,
  updateServicioRequest,
  deleteServicioRequest
 } from "../api/auth";
import { logoutRequest } from "../api/auth";
import { generateEnlaceRequest } from "../api/auth";
import { obtenerHorasDisponiblesRequest, liberarHorasRequest } from "../api/funcion";
import { updateNotificationsRequest } from '../api/auth';
import Cookies from "js-cookie";
import { esAdminRequest, esAsistenteRequest } from "../api/sucursales"; 

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within a AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [esAdminSucursal, setEsAdminSucursal] = useState(false);
  const [esAsistente, setEsAsistente] = useState(false);


  // clear errors after 5 seconds
  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        setErrors([]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  const signup = async (user) => {
    try {
      const res = await registerRequest(user);
      if (res.status === 200) {
        setUser(res.data);
        setIsAuthenticated(true);
        return res.data;
      }
    } catch (error) {
      console.log(error.response.data);
      setErrors(error.response.data.message);
    }
  };

  const signin = async (user) => {
    try {
      const res = await loginRequest(user);
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.log(error);
      setErrors(error.response.data.message);
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch (e) {
      // ignora errores de red aquí
    } finally {
      Cookies.remove("token"); // por si existiera una cookie no httpOnly en ambientes antiguos
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updatePerfil = async (id, data) => {
    try {
      const res = await updatePerfilRequest(id, data);
      setUser(res.data);
    } catch (error) {
      console.log(error);
      setErrors(error.response.data.message);
    }
  }

  const deleteBloqueHorario = async (id, index) => {
    try {
      const res = await deleteBloqueHorarioRequest(id, index);
      return res.data;
    } catch (error) {
      console.log(error);
      setErrors(error.response.data.message);
    }
  }

  const obtenerHorasDisponibles = async (id, fecha) => {
    try {
      const res = await obtenerHorasDisponiblesRequest(id, fecha);
      return res.data;
    } catch (error) {
      console.log(error);
      setErrors(error.response.data.message);
    }
  }

  const liberarHoras = async (data) => {
    try {
      const response = await liberarHorasRequest(data);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  };

  const addNotification = async (id, data) => {
    try {
        const response = await updateNotificationsRequest(id, { data });
        return response.data;
    } catch (error) {
        console.error(error);
    }
  }

  const deleteNotifications = async (id) => {
    try {
        const response = await deleteNotificationsRequest(id);
        setUser(response.data);
        return response.data;
    } catch (error) {
        console.error(error);
    }
  }

  const getAllUsers = async () => {
    try {
      const res = await getAllUsersRequest();
      return res.data;
    } catch (error) {
      console.log(error);
      setErrors(error.response.data.message);
    }
  }

  const checkEsAdmin = async (userId) => {
    try {
      const res = await esAdminRequest(userId);
      setEsAdminSucursal(res.data.esAdmin === true || Array.isArray(res.data));
    } catch (e) {
      setEsAdminSucursal(false);
    }
  };

  const checkEsAsistente = async (userId) => {
    try {
      const res = await esAsistenteRequest(userId);
      setEsAsistente(res.data.esAsistente === true || Array.isArray(res.data));
    } catch (e) {
      setEsAsistente(false);
    }
  }

  const registerUserOnly = async (user) => {
    try {
      const res = await registerUserOnlyRequest(user);
      return res.data;
    } catch (error) {
      setErrors(error.response.data.message);
      throw error;
    }
  };

  const deleteUser = async (id) => {
    try {
      const res = await deleteUserRequest(id);
      return res.data;
    }
    catch (error) {
      console.log(error.response.data);
      setErrors(error.response.data.message);
    }
  };

  // Funciones para manejar servicios
  const addServicio = async (servicioData) => {
    try {
      const res = await addServicioRequest(user.id || user._id, servicioData);
      setUser(res.data);
      return res.data;
    } catch (error) {
      setErrors(error.response?.data?.message || "Error al agregar servicio");
      throw error;
    }
  };

  const updateServicio = async (index, servicioData) => {
    try {
      const res = await updateServicioRequest(user.id || user._id, index, servicioData);
      setUser(res.data);
      return res.data;
    } catch (error) {
      setErrors(error.response?.data?.message || "Error al actualizar servicio");
      throw error;
    }
  };

  const deleteServicio = async (index) => {
    try {
      const res = await deleteServicioRequest(user.id || user._id, index);
      setUser(res.data);
      return res.data;
    } catch (error) {
      setErrors(error.response?.data?.message || "Error al eliminar servicio");
      throw error;
    }
  };

  const generateMiEnlace = async () => {
    try {
      const uid = user?.id || user?._id;
      if (!uid) throw new Error("Usuario no autenticado");
      const res = await generateEnlaceRequest(uid);
      const miEnlace = res.data?.miEnlace;
      if (miEnlace) {
        setUser(prev => ({ ...(prev || {}), miEnlace }));
      }
      return miEnlace;
    } catch (error) {
      setErrors(error.response?.data?.message || "Error al generar enlace");
      throw error;
    }
  };

  useEffect(() => {
    if (user && user.id) {
      checkEsAdmin(user.id);
      checkEsAsistente(user.id);
    }
  }, [user]);

  useEffect(() => {
    const rehydrate = async () => {
      try {
        // No pasamos token; el servidor lo lee de la cookie httpOnly si withCredentials=true
        const res = await verifyTokenRequest();
        if (res?.data) {
          setUser(res.data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    rehydrate();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        addNotification,
        deleteNotifications,
        signup,
        signin,
        logout,
        isAuthenticated,
        errors,
        loading,
        updatePerfil,
        deleteBloqueHorario,
        obtenerHorasDisponibles,
        getAllUsers,
        liberarHoras,
        checkEsAdmin,
        esAdminSucursal,
        registerUserOnly,
        deleteUser,
        checkEsAsistente,
        esAsistente,
        addServicio,
        updateServicio,
        deleteServicio,
        generateMiEnlace,

      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
