import { useEffect } from "react";
import { createContext, useContext, useState } from "react";
import { loginRequest, registerRequest, verifyTokenRequest, updatePerfilRequest, getAllUsersRequest } from "../api/auth";
import { obtenerHorasDisponiblesRequest, liberarHorasRequest } from "../api/funcion";
import Cookies from "js-cookie";

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
      // setErrors(error.response.data.message);
    }
  };

  const logout = () => {
    Cookies.remove("token");
    setUser(null);
    setIsAuthenticated(false);
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

  const getAllUsers = async () => {
    try {
      const res = await getAllUsersRequest();
      return res.data;
    } catch (error) {
      console.log(error);
      setErrors(error.response.data.message);
    }
  }

  useEffect(() => {
    const checkLogin = async () => {
      const cookies = Cookies.get();
      if (!cookies.token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const res = await verifyTokenRequest(cookies.token);
        if (!res.data) return setIsAuthenticated(false);
        setIsAuthenticated(true);
        setUser(res.data);
        setLoading(false);
      } catch (error) {
        setIsAuthenticated(false);
        setLoading(false);
      }
    };
    checkLogin();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        signup,
        signin,
        logout,
        isAuthenticated,
        errors,
        loading,
        updatePerfil,
        obtenerHorasDisponibles,
        getAllUsers,
        liberarHoras,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
