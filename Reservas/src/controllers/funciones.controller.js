import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import User from "../models/user.model.js";

/////////////// Obtener todos los pacientes con hora previa y sin sesiones ///////////////

export const obtenerPacientesSinSesiones = async (req, res) => {
  try {
    const profesionalId = req.user.id;
    const pacientesSinSesiones = await Reserva.find({ historial: { $size: 0 }, profesional: profesionalId }).populate('paciente');
    const filtro = pacientesSinSesiones.filter(reserva => reserva.paciente.estado === true && !reserva.diagnostico);
    res.status(200).json(filtro.map(reserva => reserva.paciente));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/////////////// Obtener horas disponibles para ver a un especialista en un día específico ///////////////

export const obtenerHorasDisponibles = async (req, res) => {
  try {
    const { id, fecha } = req.query;
    const profesional = await User.findById(id);
    if (!profesional) {
      return res.status(400).json({ message: "Profesional no encontrado" });
    }

    // Crear un rango de fechas para el día especificado
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar reservas dentro del rango de fechas
    const reservas = await Reserva.find({
      profesional: id,
      siguienteCita: { $gte: startOfDay, $lte: endOfDay }
    });

    if (reservas.length === 0) {
      const times = profesional.timetable.map(slot => slot.times).flat();
      return res.status(200).json({ times });
    }
    const reservedTimes = reservas.map(reserva => reserva.hora); // Asumiendo que la hora está almacenada en el campo 'hora'

    const availableTimes = profesional.timetable
      .map(slot => slot.times)
      .flat()
      .filter(time => !reservedTimes.includes(time));

    return res.status(200).json({ times: availableTimes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//////////////////// Liberar horas de un profesional en un día especifico ////////////////////

export const liberarHoras = async (req, res) => {
  try {
    const { id, fecha } = req.body;
    const profesional = await User.findById(id);

    if (!profesional) {
      return res.status(400).json({ message: "Profesional no encontrado" });
    }

    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const reservasLiberadas = await Reserva.find({
      profesional: id,
      siguienteCita: { $gte: startOfDay, $lte: endOfDay }
    }).populate('paciente');

    await Reserva.updateMany(
      {
        profesional: id,
        siguienteCita: { $gte: startOfDay, $lte: endOfDay }
      },
      {
        $unset: { siguienteCita: "" }
      }
    );

    res.status(200).json({ reservasLiberadas });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
