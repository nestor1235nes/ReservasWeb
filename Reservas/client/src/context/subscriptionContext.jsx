import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getPlansRequest,
  getCurrentSubscriptionRequest,
  subscribeRequest,
  changePlanRequest,
  unsubscribeRequest,
  renewSubscriptionRequest,
  calculatePriceRequest,
} from "../api/subscriptions";

const SubscriptionContext = createContext(null);

export const useSubscription = () => useContext(SubscriptionContext);

export function SubscriptionProvider({ children }) {
  const [plans, setPlans] = useState([]);
  console.log('Planes de suscripción disponibles:', plans);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPlans = async () => {
    const res = await getPlansRequest();
    setPlans(res.data || []);
  };

  const loadCurrent = async () => {
    try {
      setLoading(true);
      const res = await getCurrentSubscriptionRequest();
      setCurrent(res.data || null);
    } catch {
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async (payload) => {
    const res = await calculatePriceRequest(payload);
    return res.data;
  };

  const subscribe = async (payload) => {
    const res = await subscribeRequest(payload);
    await loadCurrent();
    return res.data;
  };

  const changePlan = async (payload) => {
    const res = await changePlanRequest(payload);
    await loadCurrent();
    return res.data;
  };

  const unsubscribe = async () => {
    const res = await unsubscribeRequest();
    await loadCurrent();
    return res.data;
  };

  const renew = async (payload) => {
    const res = await renewSubscriptionRequest(payload);
    await loadCurrent();
    return res.data;
  };

  const clearSubscription = () => {
    setCurrent(null);
  };

  // Helpers derivados según plan actual
  const activePlan = current?.subscription?.plan || null;
  const planName = activePlan?.name || null; // "Basic" | "Standard" | "Teams" | null
  const hasActiveSubscription = !!current?.hasSubscription && !!current?.isActive;

  const scope = current?.scope || null; // "USER" | "SUCURSAL" | null
  const teamConfig = current?.subscription?.teamConfig || null;

  const planLevel = hasActiveSubscription
    ? planName === "Teams"
      ? "teams"
      : planName === "Standard"
        ? "advanced"
        : planName === "Basic"
          ? "basic"
          : "basic"
    : "none";

  const isBasic = planLevel === "basic";
  const isAdvanced = planLevel === "advanced";
  const isTeams = planLevel === "teams";

  const canUseAdvancedFeatures = isAdvanced || isTeams;

  const capabilities = {
    scope,
    planName,
    planLevel,
    hasActiveSubscription,
    isBasic,
    isAdvanced,
    isTeams,
    teamConfig,
    // Funcionalidades avanzadas
    canUploadExamImages: canUseAdvancedFeatures,
    canSyncCalendar: canUseAdvancedFeatures,
    canUseTelemedicina: canUseAdvancedFeatures,
    canUsePayments: canUseAdvancedFeatures,
    canViewAdvancedReports: canUseAdvancedFeatures,
  };

  useEffect(() => {
    loadPlans();
    // no llamo loadCurrent aquí si el usuario no está logeado; puedes llamar
    // explícitamente desde authContext cuando haya login correcto.
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plans,
        current,
        loading,
        ...capabilities,
        loadPlans,
        loadCurrent,
        clearSubscription,
        calculatePrice,
        subscribe,
        changePlan,
        unsubscribe,
        renew,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}