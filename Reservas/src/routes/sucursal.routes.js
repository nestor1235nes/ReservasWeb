import  { Router } from 'express';
import { obtenerSucursales, obtenerSucursal, crearSucursal, actualizarSucursal, eliminarSucursal, obtenerReservasSucursal, esAdmin } from '../controllers/sucursal.controller.js';

const router = Router();

////////////////////// Sucursales //////////////////////
router.get('/obtener-sucursales', obtenerSucursales);
router.get('/obtener-reservas-sucursal/:id', obtenerReservasSucursal);
router.get('/obtener-sucursal/:id', obtenerSucursal);
router.post('/crear-sucursal', crearSucursal);
router.put('/actualizar-sucursal/:id', actualizarSucursal);
router.delete('/eliminar-sucursal/:id', eliminarSucursal);
router.get('/es-admin/:id', esAdmin);

export default router;