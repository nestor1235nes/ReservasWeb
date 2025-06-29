import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import User from "../models/user.model.js";
import Sucursal from "../models/sucursal.model.js";
import axios from "axios";

/////////////// Obtener todos los pacientes con hora previa y sin sesiones ///////////////

export const obtenerPacientesSinSesiones = async (req, res) => {
  try {
    const profesionalId = req.user.id;
    const user = await User.findById(profesionalId);
    
    let pacientes = [];
    
    if (user.sucursal) {
      // Buscar pacientes de la sucursal
      const sucursal = await Sucursal.findById(user.sucursal).populate('pacientes');
      if (sucursal) {
        pacientes = sucursal.pacientes;
      }
    } else {
      // Buscar pacientes del profesional
      const userWithPacientes = await User.findById(profesionalId).populate('pacientes');
      pacientes = userWithPacientes.pacientes || [];
    }
    
    // Filtrar pacientes que necesitan registrar primera sesión
    const pacientesSinSesiones = [];
    
    for (const paciente of pacientes) {
      // Buscar si tiene reservas
      const reservas = await Reserva.find({ paciente: paciente._id });
      
      if (reservas.length === 0) {
        // Paciente sin reservas pero tiene diaPrimeraCita en el modelo Paciente
        if (paciente.diaPrimeraCita) {
          pacientesSinSesiones.push(paciente);
        }
      } else {
        // Paciente con reservas pero sin historial ni diagnóstico
        const reservasSinSesion = reservas.filter(reserva => 
          reserva.historial.length === 0 && !reserva.diagnostico
        );
        if (reservasSinSesion.length > 0) {
          pacientesSinSesiones.push(paciente);
        }
      }
    }
    
    res.status(200).json(pacientesSinSesiones);
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