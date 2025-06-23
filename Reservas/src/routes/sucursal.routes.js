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
    quitarProfesional
} from '../controllers/sucursal.controller.js';
import { auth } from '../middlewares/auth.middleware.js';


const router = Router();

////////////////////// Sucursales //////////////////////
router.get('/obtener-sucursales', obtenerSucursales);
router.get('/obtener-reservas-sucursal/:id', obtenerReservasSucursal);
router.get('/obtener-sucursal-usuario', auth, obtenerSucursalUsuario);
router.get('/obtener-asistentes-sucursal/:id', obtenerAsistentesSucursal);
router.post('/crear-sucursal', crearSucursal);
router.put('/actualizar-sucursal/:id', actualizarSucursal);
router.delete('/eliminar-sucursal/:id', eliminarSucursal);
router.get('/es-admin/:id', esAdmin);
router.post("/sucursal/:id/asistentes", agregarAsistente);
router.delete("/sucursal/:id/asistentes/:asistenteId", eliminarAsistente);
router.post("/sucursal/:id/profesionales", agregarProfesional);
router.get("/sucursal/:id/profesionales", obtenerProfesionalesSucursal);
router.get('/es-asistente/:id', esAsistente);
router.delete("/sucursal/:id/profesionales", quitarProfesional);

export default router;