import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getReservasRequest,
  getReservaRequest,
  createReservaRequest,
  updateReservaRequest,
  deleteReservaRequest,
} from '../api/reservas';
import { useAlert } from './AlertContext';

const ReservaContext = createContext();

export const useReserva = () => {
  const context = useContext(ReservaContext);
  if (!context) {
    throw new Error('useReserva must be used within a ReservaProvider');
  }
  return context;
};

export const ReservaProvider = ({ children }) => {
  const [reservas, setReservas] = useState([]);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReservasRequest();
      setReservas(res.data);
      return res.data;
    } catch (error) {
      showAlert('Error al cargar reservas', 'error');
      console.error('Error fetching reservas:', error);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const getReserva = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await getReservaRequest(id);
      setSelectedReserva(res.data);
      return res.data;
    } catch (error) {
      showAlert('Error al cargar la reserva', 'error');
      console.error('Error getting reserva:', error);
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const createReserva = useCallback(async (reservaData) => {
    setLoading(true);
    try {
      const res = await createReservaRequest(reservaData);
      setReservas((prev) => [...prev, res.data]);
      showAlert('Reserva creada exitosamente', 'success');
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al crear la reserva';
      showAlert(errorMessage, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const updateReserva = useCallback(async (id, reservaData) => {
    setLoading(true);
    try {
      const res = await updateReservaRequest(id, reservaData);
      setReservas((prev) => 
        prev.map((r) => (r._id === id ? res.data : r))
      );
      showAlert('Reserva actualizada', 'success');
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar la reserva';
      showAlert(errorMessage, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const deleteReserva = useCallback(async (id) => {
    setLoading(true);
    try {
      await deleteReservaRequest(id);
      setReservas((prev) => prev.filter((r) => r._id !== id));
      showAlert('Reserva eliminada', 'success');
    } catch (error) {
      showAlert('Error al eliminar la reserva', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  return (
    <ReservaContext.Provider
      value={{
        reservas,
        selectedReserva,
        loading,
        fetchReservas,
        getReserva,
        createReserva,
        updateReserva,
        deleteReserva,
        setSelectedReserva,
      }}
    >
      {children}
    </ReservaContext.Provider>
  );
};

export default ReservaContext;
