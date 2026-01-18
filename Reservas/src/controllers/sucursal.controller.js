import Sucursal from "../models/sucursal.model.js";
import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import User from "../models/user.model.js";

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));

const slugify = (value) => {
    return (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
};

const buildUniqueSucursalSlug = async ({ base, currentId }) => {
    let candidate = slugify(base);
    if (!candidate) candidate = 'sucursal';

    let suffix = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const slug = suffix === 0 ? candidate : `${candidate}-${suffix + 1}`;
        const existing = await Sucursal.findOne({ slug }).select('_id').lean();
        if (!existing) return slug;
        if (currentId && existing._id?.toString() === currentId.toString()) return slug;
        suffix += 1;
    }
};

/////////////// Obtener todas las sucursales ///////////////

export const obtenerSucursales = async (req, res) => {
    try {
        const sucursales = await Sucursal.find();

        // Backfill: generar slug si falta (mantener compatibilidad, evitar tareas manuales)
        for (const s of sucursales) {
            if (!s?.slug) {
                const slug = await buildUniqueSucursalSlug({ base: s?.nombre, currentId: s?._id });
                s.slug = slug;
                await s.save();
            }
        }
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

        if (!user.sucursal.slug) {
            const slug = await buildUniqueSucursalSlug({ base: user.sucursal.nombre, currentId: user.sucursal._id });
            user.sucursal.slug = slug;
            await user.sucursal.save();
        }
        res.status(200).json(user.sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/////////////// Crear una nueva sucursal ///////////////

export const crearSucursal = async (req, res) => {
    try {
        const payload = { ...(req.body || {}) };
        if (!payload.slug) {
            payload.slug = await buildUniqueSucursalSlug({ base: payload.nombre, currentId: null });
        }
        const sucursal = await Sucursal.create(payload);
        res.status(201).json(sucursal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/////////////// Actualizar una sucursal ///////////////

export const actualizarSucursal = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await Sucursal.findById(id).populate('suscriptionPlan');
        if (!existing) return res.status(404).json({ message: "Sucursal no encontrada" });

        const payload = { ...(req.body || {}) };

        const isTryingToEditMessages =
            Object.prototype.hasOwnProperty.call(payload, 'defaultMessage') ||
            Object.prototype.hasOwnProperty.call(payload, 'messageTemplates');

        // Restricción por plan: en plan Basic no se permite editar mensajes automáticos.
        const hasActiveSubscription = !!existing?.suscriptionEndDate && existing.suscriptionEndDate > new Date();
        const planName = existing?.suscriptionPlan?.name || null;
        const isBasicActive = hasActiveSubscription && planName === 'Basic';
        if (isBasicActive && isTryingToEditMessages) {
            return res.status(403).json({
                message: 'La edición de mensajes automáticos está disponible desde Plan Standard y Teams.',
            });
        }

        // Desde ahora las credenciales GreenAPI son globales (plataforma) y no se editan por sucursal.
        delete payload.idInstance;
        delete payload.apiTokenInstance;
        // Mantener slug estable: solo generarlo si aún no existe
        if (!existing.slug) {
            payload.slug = await buildUniqueSucursalSlug({ base: payload.nombre || existing.nombre, currentId: id });
        }

        const sucursal = await Sucursal.findByIdAndUpdate(id, payload, { new: true });

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
        const key = req.params.id;
        const query = isObjectId(key) ? { _id: key } : { slug: key };
        const sucursal = await Sucursal.findOne(query)
            .populate('profesionales')
            .populate('administradores');
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });

        const profesionales = Array.isArray(sucursal.profesionales) ? sucursal.profesionales : [];
        const admins = Array.isArray(sucursal.administradores) ? sucursal.administradores : [];

        // Si el administrador marcó que también atiende pacientes, debe aparecer como profesional.
        const adminsQueAtienden = admins.filter((u) => !!u?.adminAtiendePersonas);

        const byId = new Map();
        for (const p of [...profesionales, ...adminsQueAtienden]) {
            if (!p?._id) continue;
            byId.set(p._id.toString(), p);
        }

        res.status(200).json(Array.from(byId.values()));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Obtener pacientes de una sucursal
export const obtenerPacientesSucursal = async (req, res) => {
    try {
        const { id } = req.params; // id de la sucursal
        // Opción A: popular directamente
        const sucursal = await Sucursal.findById(id).populate('pacientes');
        if (!sucursal) return res.status(404).json({ message: "Sucursal no encontrada" });
        // Retornar solo la lista de pacientes
        res.status(200).json(sucursal.pacientes || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};