import  { Router } from 'express';
import { 
    obtenerSucursales, 
    obtenerSucursalUsuario, 
    crearSucursal, 
    actualizarSucursal, 
    eliminarSucursal, 
    obtenerReservasSucursal, 
    esAdmin, 
    agregarAsistente, 
    eliminarAsistente,
    obtenerAsistentesSucursal,
    agregarProfesional,
    obtenerProfesionalesSucursal,
    esAsistente,
    quitarProfesional,
    obtenerPacientesSucursal
} from '../controllers/sucursal.controller.js';
import { auth } from '../middlewares/auth.middleware.js';


const router = Router();

////////////////////// Sucursales //////////////////////
// PÚBLICA: la página pública de sucursal lista las sucursales (sin login).
router.get('/obtener-sucursales', obtenerSucursales);
// Protegida: contiene reservas (PII). Solo páginas autenticadas (calendario/reportes).
router.get('/obtener-reservas-sucursal/:id', auth, obtenerReservasSucursal);
router.get('/obtener-sucursal-usuario', auth, obtenerSucursalUsuario);
router.get('/obtener-asistentes-sucursal/:id', auth, obtenerAsistentesSucursal);
// PÚBLICA (intencional): usada por el registro de EMPRESA antes de iniciar sesión.
// TODO Fase 2: reestructurar el registro para crear la sucursal ya autenticado.
router.post('/crear-sucursal', crearSucursal);
// PÚBLICA (intencional): el registro vincula el admin a la sucursal recién creada
// antes del login. TODO Fase 2: mover este vínculo a un endpoint autenticado.
router.put('/actualizar-sucursal/:id', actualizarSucursal);
// Protegida: borrado de sucursal (destructivo).
router.delete('/eliminar-sucursal/:id', auth, eliminarSucursal);
router.get('/es-admin/:id', esAdmin);
// Protegida: alta/baja de asistentes (evita escalada de privilegios).
router.post("/sucursal/:id/asistentes", auth, agregarAsistente);
router.delete("/sucursal/:id/asistentes/:asistenteId", auth, eliminarAsistente);
// Protegida: alta de profesionales (evita escalada de privilegios).
router.post("/sucursal/:id/profesionales", auth, agregarProfesional);
// PÚBLICA: la página pública de sucursal lista los profesionales (sin login).
router.get("/sucursal/:id/profesionales", obtenerProfesionalesSucursal);
router.get('/es-asistente/:id', esAsistente);
router.delete("/sucursal/:id/profesionales", auth, quitarProfesional);
// Protegida: lista de pacientes de la sucursal (PII).
router.get("/sucursal/:id/pacientes", auth, obtenerPacientesSucursal);

export default router;