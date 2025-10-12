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

    // Si el día está bloqueado, no hay horas disponibles (comparación por YYYY-MM-DD, usando UTC para evitar desfase)
    if (Array.isArray(profesional.blockedDays) && fecha) {
      const isBlocked = profesional.blockedDays.some(d => {
        const dt = new Date(d);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dt.getUTCDate()).padStart(2, '0');
        const blockedStr = `${y}-${m}-${dd}`;
        return blockedStr === fecha;
      });
      if (isBlocked) return res.status(200).json({ times: [] });
    }

    // Día de la semana en español (alineado con getDay(): 0=Domingo)
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    // Parseo robusto de fecha 'YYYY-MM-DD' a fecha local para evitar desfases por zona horaria
    const [year, month, day] = (fecha || "").split("-").map(Number);
    const dateLocal = new Date(year, (month || 1) - 1, day || 1);
    const diaSemana = dias[dateLocal.getDay()];

    // Filtra solo los bloques que atienden ese día
    const bloquesDia = profesional.timetable.filter(b => b.days.includes(diaSemana));

    // Helper para generar horas si no están precomputadas en el bloque
    const generateTimes = (fromTime, toTime, breakFrom, breakTo, interval) => {
      if (!fromTime || !toTime || !interval) return [];
      const times = [];
      let currentTime = fromTime;
      const addMinutes = (time, minutes) => {
        const [h, m] = time.split(":").map(Number);
        const total = h * 60 + m + minutes;
        const nh = String(Math.floor(total / 60)).padStart(2, "0");
        const nm = String(total % 60).padStart(2, "0");
        return `${nh}:${nm}`;
      };
      while (currentTime < toTime) {
        if (breakFrom && breakTo && currentTime >= breakFrom && currentTime < breakTo) {
          currentTime = breakTo;
        } else {
          times.push(currentTime);
          currentTime = addMinutes(currentTime, interval);
        }
      }
      return times;
    };

    // Junta todos los times de los bloques de ese día, generándolos si faltan
    let horas = bloquesDia.flatMap(b => {
      if (Array.isArray(b.times) && b.times.length) return b.times;
      return generateTimes(b.fromTime, b.toTime, b.breakFrom, b.breakTo, b.interval || 30);
    });

    // Buscar reservas dentro del rango de fechas
    const startOfDay = new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
    const endOfDay = new Date(year, (month || 1) - 1, day || 1, 23, 59, 59, 999);

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
    const { id, fecha, blockDay } = req.body;
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

    // Si se solicita, bloquear el día para evitar nuevas reservas
    if (blockDay) {
      // Guardar como UTC midnight del día seleccionado para evitar desfases
      const blockDate = new Date(`${fecha}T00:00:00.000Z`);
      const exists = (profesional.blockedDays || []).some(d => {
        const dt = new Date(d);
        return dt.getTime() === blockDate.getTime();
      });
      if (!exists) {
        profesional.blockedDays = [...(profesional.blockedDays || []), blockDate];
        await profesional.save();
      }
    }

    res.status(200).json({ reservasLiberadas });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


//////////////////// Obtener feriados ////////////////////
export const getFeriados = async (req, res) => {
  const { year = new Date().getFullYear(), country = "CL" } = req.query;
  try {
    // Proveedor principal
    try {
      const response = await axios.get(`https://api.boostr.cl/holidays?year=${year}&country=${country}`);
      return res.json(response.data || []);
    } catch (primaryErr) {
      // Fallback a Nager.Date
      try {
        const response2 = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
        // Nager ya entrega objetos con campo 'date'
        return res.json(response2.data || []);
      } catch (secondaryErr) {
        // Como último recurso, devolver arreglo vacío para no romper el frontend
        return res.json([]);
      }
    }
  } catch (error) {
    // No debería entrar aquí por los catches internos, pero por seguridad
    res.json([]);
  }
};

//////////////////// Obtener días bloqueados ////////////////////
export const getBlockedDays = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: 'Falta id de profesional' });
    const user = await User.findById(id).select('blockedDays');
    if (!user) return res.status(404).json({ message: 'Profesional no encontrado' });
    // Devolver como strings ISO de fecha (solo día)
    const days = (user.blockedDays || []).map(d => {
      const dd = new Date(d);
      const y = dd.getUTCFullYear();
      const m = String(dd.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dd.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
    return res.json({ blockedDays: days });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};