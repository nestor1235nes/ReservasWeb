import { createContext, useContext } from "react";
import { 
  getEstadisticasGeneralesRequest, 
  getEstadisticasPorPeriodoRequest, 
  getTendenciasMensualesRequest,
  getPagosMensualesRequest
} from "../api/analytics";

const AnalyticsContext = createContext();

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("useAnalytics must be used within an AnalyticsProvider");
  return context;
}

export const AnalyticsProvider = ({ children }) => {
  
  const getEstadisticasGenerales = async () => {
    try {
      const response = await getEstadisticasGeneralesRequest();
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas generales:', error);
      throw error;
    }
  }

  const getEstadisticasPorPeriodo = async (periodo) => {
    try {
      const response = await getEstadisticasPorPeriodoRequest(periodo);
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas por período:', error);
      throw error;
    }
  }

  const getTendenciasMensuales = async () => {
    try {
      const response = await getTendenciasMensualesRequest();
      return response;
    } catch (error) {
      console.error('Error obteniendo tendencias mensuales:', error);
      throw error;
    }
  }

  const getPagosMensuales = async () => {
    try {
      const response = await getPagosMensualesRequest();
      return response;
    } catch (error) {
      console.error('Error obteniendo pagos mensuales:', error);
      throw error;
    }
  }

  return (
    <AnalyticsContext.Provider value={{
      getEstadisticasGenerales,
      getEstadisticasPorPeriodo,
  getTendenciasMensuales,
  getPagosMensuales
    }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsContext;
