import axios from "./axios";

export const getCalendarsSync = async (userId) => {
  const res = await axios.get(`/calendarsync/${userId}`);
  return res.data;
};

export const setCalendarSync = async (userId, type, email) => {
  await axios.post(`/calendarsync/${userId}`, { type, email });
};