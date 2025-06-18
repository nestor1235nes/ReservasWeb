import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import User from "../models/user.model.js";
import axios from "axios";

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

    // Día de la semana en español
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const diaSemana = dias[new Date(fecha).getDay()];

    // Filtra solo los bloques que atienden ese día
    const bloquesDia = profesional.timetable.filter(b => b.days.includes(diaSemana));

    // Junta todos los times de los bloques de ese día
    let horas = bloquesDia.flatMap(b => b.times);

    // Buscar reservas dentro del rango de fechas
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const reservas = await Reserva.find({
      profesional: id,
      siguienteCita: { $gte: startOfDay, $lte: endOfDay }
    });

    const reservedTimes = reservas.map(reserva => reserva.hora);

    // Filtra las horas ya reservadas
    const availableTimes = horas.filter(time => !reservedTimes.includes(time));

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


//////////////////// Obtener feriados ////////////////////
export const getFeriados = async (req, res) => {
  const { year = new Date().getFullYear(), country = "CL" } = req.query;
  try {
    const response = await axios.get(`https://api.boostr.cl/holidays?year=${year}&country=${country}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo feriados" });
  }
};