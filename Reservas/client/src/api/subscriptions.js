import axios from "./axios";

// Sin auth
export const getPlansRequest = () => axios.get("/subscription/plans");
export const calculatePriceRequest = (data) =>
  axios.post("/subscription/calculate-price", data);

// Con auth (necesitan token, igual que el resto de tu API)
export const getCurrentSubscriptionRequest = () =>
  axios.get("/subscription/getsubscription");

export const subscribeRequest = (data) =>
  axios.post("/subscription/subscribe", data);

export const changePlanRequest = (data) =>
  axios.post("/subscription/change-plan", data);

export const unsubscribeRequest = () =>
  axios.post("/subscription/unsubscribe");

export const renewSubscriptionRequest = (data) =>
  axios.post("/subscription/renew", data);

export const checkSubscriptionStatusRequest = () =>
  axios.get("/subscription/check-status");

export const getSubscriptionHistoryRequest = () =>
  axios.get("/subscription/history");

// Admin / mantenimiento manual de planes
export const updatePlanRequest = (id, data) =>
  axios.put(`/subscription/plans/${id}`, data);

export const createPlanRequest = (data) =>
  axios.post("/subscription/plans", data);