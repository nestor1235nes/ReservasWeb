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


/////////////// Obtener una sucursal de un usuario ///////////////

export const obtenerSucursalUsuario = async (req, res) => {
    try {
        // Usa el id del usuario autenticado
        const userId = req.user.id;
        const user = await User.findById(userId).populate('sucursal');
        if (!user || !user.sucursal) {
            return res.status(404).json({ message: "Usuario o sucursal no encontrada" });
        }
        res.status(200).json(user.sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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

        // Si se pasa un administrador, agrégalo al array de administradores
        if(req.body.administrador) {
            if (!sucursal.administradores.includes(req.body.administrador)) {
                sucursal.administradores.push(req.body.administrador);
                await sucursal.save();
            }
        }
        // Si se pasa un empleado, agrégalo al array de profesionales o asistentes según lógica
        if(req.body.empleado) {
            // Aquí puedes decidir a qué array agregarlo, por ejemplo:
            if (!sucursal.profesionales.includes(req.body.empleado)) {
                sucursal.profesionales.push(req.body.empleado);
                await sucursal.save();
            }
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
        const sucursal = await Sucursal.find({ administradores: user._id });

        if (sucursal.length === 0) {
            res.status(200).json({ esAdmin: false });
        } else {
            res.status(200).json(sucursal);
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//////////////// Verificar si un usuario es asistente de una sucursal ///////////////
export const esAsistente = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        const sucursal = await Sucursal.find({ asistentes: user._id });
        if (sucursal.length === 0) {
            res.status(200).json({ esAsistente: false });
        } else {
            res.status(200).json(sucursal);
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/////////////// Sección del asistente o secretario/a ///////////////
/////////////// Obtener todas las reservas de una sucursal ///////////////

export const obtenerReservasSucursal = async (req, res) => {
    try {
        const { id } = req.params; // id de la sucursal
        const reservas = await Reserva.find({ sucursal: id }).populate('paciente').populate('profesional').sort({ fecha: -1 });
        if (!reservas) return res.status(404).json({ message: "No se encontraron reservas para esta sucursal" });
        res.status(200).json(reservas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Agregar asistente a una sucursal
export const agregarAsistente = async (req, res) => {
    try {
        const { id } = req.params;
        const { asistenteId } = req.body; 
        const sucursal = await Sucursal.findById(id);
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });

        if (!sucursal.asistentes.includes(asistenteId)) {
            sucursal.asistentes.push(asistenteId);
            await sucursal.save();
        }

        // Actualiza el campo sucursal del usuario asistente
        await User.findByIdAndUpdate(asistenteId, { sucursal: id });

        res.status(200).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar asistente de una sucursal
export const eliminarAsistente = async (req, res) => {
    try {
        const { id, asistenteId } = req.params; // id de la sucursal y del asistente
        const sucursal = await Sucursal.findById(id);
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });

        sucursal.asistentes = sucursal.asistentes.filter(a => a.toString() !== asistenteId);
        await sucursal.save();
        res.status(200).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const obtenerAsistentesSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const sucursal = await Sucursal.findById(id).populate('asistentes');
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });
        res.status(200).json(sucursal.asistentes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const agregarProfesional = async (req, res) => {
    try {
        const { id } = req.params; // id de la sucursal
        const { profesionalId } = req.body; // id del usuario profesional
        const sucursal = await Sucursal.findById(id);
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });

        if (!sucursal.profesionales.includes(profesionalId)) {
            sucursal.profesionales.push(profesionalId);
            await sucursal.save();
        }
        // Actualiza el campo sucursal del usuario profesional
        await User.findByIdAndUpdate(profesionalId, { sucursal: id });

        res.status(200).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const quitarProfesional = async (req, res) => {
    try {
        const { id } = req.params; // id de la sucursal
        const { profesionalId } = req.body;
        const sucursal = await Sucursal.findById(id);
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });

        sucursal.profesionales = sucursal.profesionales.filter(
            (prof) => prof.toString() !== profesionalId
        );
        await sucursal.save();
        res.status(200).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const obtenerProfesionalesSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const sucursal = await Sucursal.findById(id).populate('profesionales');
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });
        res.status(200).json(sucursal.profesionales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}