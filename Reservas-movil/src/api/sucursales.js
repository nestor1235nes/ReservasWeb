import api from './axios';

// Sucursal del usuario autenticado (sanitizada: sin apiTokenInstance en claro).
export const getSucursalUsuarioRequest = async () => api.get('/obtener-sucursal-usuario');

// Actualiza la sucursal. IMPORTANTE: para guardar solo plantillas/datos generales,
// NO incluir las claves whatsappNumber/idInstance/apiTokenInstance en el payload —
// el backend valida credenciales solo si alguna de esas claves viene presente.
export const updateSucursalRequest = async (id, payload) =>
  api.put(`/actualizar-sucursal/${id}`, payload);
