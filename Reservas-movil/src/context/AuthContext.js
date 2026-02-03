import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { 
  loginRequest, 
  registerRequest, 
  verifyTokenRequest, 
  logoutRequest,
  updatePerfilRequest 
} from '../api/auth';
import { getMeRequest, updateMeRequest } from '../api/profile';
import { useAlert } from './AlertContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const { showAlert } = useAlert();

  // Limpiar errores después de 5 segundos
  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        setErrors([]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  // Verificar token al iniciar la app
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          // verifyToken valida token; luego traemos perfil completo
          await verifyTokenRequest();
          const me = await getMeRequest();
          if (me.data) {
            setUser(me.data);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.log('Token verification failed:', error);
        await SecureStore.deleteItemAsync('auth_token');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const refreshProfile = async () => {
    const me = await getMeRequest();
    if (me.data) setUser(me.data);
    return me.data;
  };

  const signup = async (userData) => {
    try {
      const res = await registerRequest(userData);
      if (res.status === 200) {
        if (res.data.token) {
          await SecureStore.setItemAsync('auth_token', res.data.token);
        }
        // marcar sesión como iniciada inmediatamente; luego intentamos cargar perfil completo
        setUser(res.data?.user || res.data);
        setIsAuthenticated(true);
        showAlert('Cuenta creada exitosamente', 'success');

        try {
          const me = await getMeRequest();
          if (me.data) setUser(me.data);
        } catch (e) {
          console.log('Profile fetch after signup failed:', e);
        }

        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al crear cuenta';
      setErrors(Array.isArray(errorMessage) ? errorMessage : [errorMessage]);
      showAlert(errorMessage, 'error');
      throw error;
    }
  };

  const signin = async (credentials) => {
    try {
      const res = await loginRequest(credentials);
      if (res.data) {
        if (res.data.token) {
          await SecureStore.setItemAsync('auth_token', res.data.token);
        }
        // marcar sesión como iniciada inmediatamente; luego intentamos cargar perfil completo
        setUser(res.data?.user || res.data);
        setIsAuthenticated(true);
        showAlert('Sesión iniciada correctamente', 'success');

        try {
          const me = await getMeRequest();
          if (me.data) setUser(me.data);
        } catch (e) {
          console.log('Profile fetch after signin failed:', e);
        }

        return res.data;
      }
    } catch (error) {
      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;
      const networkDetail = error?.code || error?.message;
      const where = error?.__where;
      const stackLines = typeof error?.stack === 'string' ? error.stack.split('\n').slice(0, 4) : [];
      const stackBlock = stackLines.length ? `\n${stackLines.join('\n')}` : '';
      const fallback = status
        ? `Error al iniciar sesión (HTTP ${status})`
        : (
            networkDetail
              ? `Error de conexión con el servidor (${networkDetail})${where ? `\n${where}` : ''}${stackBlock}`
              : `Error de conexión con el servidor${where ? `\n${where}` : ''}${stackBlock}`
          );
      const errorMessage = backendMessage || fallback;
      setErrors(Array.isArray(errorMessage) ? errorMessage : [errorMessage]);
      showAlert(errorMessage, 'error');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.log('Logout request failed:', error);
    } finally {
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      showAlert('Sesión cerrada', 'info');
    }
  };

  const updatePerfil = async (id, data) => {
    try {
      const res = await updatePerfilRequest(id, data);
      if (res.data) {
        setUser({ ...user, ...res.data });
        showAlert('Perfil actualizado', 'success');
        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar perfil';
      showAlert(errorMessage, 'error');
      throw error;
    }
  };

  const updateMyProfile = async (data) => {
    try {
      const res = await updateMeRequest(data);
      if (res.data) {
        setUser(res.data);
        showAlert('Perfil actualizado', 'success');
        return res.data;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar perfil';
      showAlert(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage, 'error');
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        setUser,
        isAuthenticated,
        loading,
        errors,
        signup,
        signin,
        logout,
        updatePerfil,
        updateMyProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
