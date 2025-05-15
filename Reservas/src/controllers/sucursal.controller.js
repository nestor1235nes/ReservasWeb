import Sucursal from "../models/sucursal.model.js";
import Reserva from "../models/ficha.model.js";
import User from "../models/user.model.js";

/////////////// Obtener todas las sucursales ///////////////

export const obtenerSucursales = async (req, res) => {
    try {
        const sucursales = await Sucursal.find();
        res.status(200).json(sucursales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/////////////// Obtener una sucursal ///////////////

export const obtenerSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const sucursal = await Sucursal.findById(id);
        res.status(200).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

/////////////// Crear una nueva sucursal ///////////////

export const crearSucursal = async (req, res) => {
    try {
        const sucursal = await Sucursal.create(req.body);
        res.status(201).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/////////////// Actualizar una sucursal ///////////////

export const actualizarSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const sucursal = await Sucursal.findByIdAndUpdate(id, req.body, { new: true });

        if(req.body.empleado) {
            sucursal.empleados.push(req.body.empleado);
            await sucursal.save();
        }

        res.status(200).json(sucursal);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/////////////// Eliminar una sucursal ///////////////////

export const eliminarSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        await Sucursal.findByIdAndDelete(id);
        res.status(204).json();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/////////////// Verificar si un usuario es administrador de una sucursal ///////////////

export const esAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        const sucursal = await Sucursal.find( { administrador: user._id } );

        if (sucursal.length === 0) {
            res.status(200).json({ esAdmin: false });
        } else {
            console.log(sucursal);
            res.status(200).json( sucursal );
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/////////////// Sección del asistente o secretario/a ///////////////
/////////////// Obtener todas las reservas de una sucursal ///////////////

export const obtenerReservasSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const reservas = await Reserva.find({ sucursal: id });
        res.status(200).json(reservas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

