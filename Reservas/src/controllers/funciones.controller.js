import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";

/////////////// Obtener todos los pacientes con hora previa y sin sesiones ///////////////

export const obtenerPacientesSinSesiones = async (req, res) => {
  try {
    const pacientesSinSesiones = await Reserva.find({ historial: { $size: 0 } }).populate('paciente');
    const filtro = pacientesSinSesiones.filter(reserva => reserva.paciente.estado === true && !reserva.diagnostico);
    res.status(200).json(filtro.map(reserva => reserva.paciente));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};