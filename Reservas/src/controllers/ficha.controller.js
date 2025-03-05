import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";

export const getPacientePorRut = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ rut: req.params.rut });
        res.json(paciente);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

export const getPaciente = async (req, res) => {
    try {
        const paciente = await Paciente.findById(req.params.id);
        res.json(paciente);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

export const getPacientes = async (req, res) => {
    try {
        const pacientes = await Paciente.find();
        res.json(pacientes);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

export const createPaciente = async (req, res) => {
    const paciente = req.body;
    const newPaciente = new Paciente(paciente);
    try {
        await newPaciente.save();
        res.status(201).json(newPaciente);
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
}

export const deletePaciente = async (req, res) => {
    try {
        await Paciente.findByIdAndRemove(req.params.id);
        res.json({ message: "Paciente deleted successfully." });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

export const updatePaciente = async (req, res) => {
    try {
        const updatedPaciente = await Paciente.findByIdAndUpdate
            (req.params.id, req.body, { new: true });
        res.json(updatedPaciente);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

export const getReservas = async (req, res) => {
    try {
      const reservas = await Reserva.find({ profesional: req.user.id }).populate('paciente').populate('profesional');
      reservas.forEach(reserva => {
        if (reserva.diaPrimeraCita) {
          reserva.diaPrimeraCita = new Date(reserva.diaPrimeraCita).toISOString().split('T')[0].replace(/-/g, '/');
        }
        if (reserva.siguienteCita) {
          reserva.siguienteCita = new Date(reserva.siguienteCita).toISOString().split('T')[0].replace(/-/g, '/');
        }
      });
      res.json(reservas);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  };

export const getReserva = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ rut: req.params.rut });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }
        const reserva = await Reserva.findOne({ paciente: paciente._id }).populate('paciente');
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found" });
        }
        res.json(reserva);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const createReserva = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ rut: req.params.rut });

        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }

        const nuevaReserva = new Reserva({
            paciente: paciente._id,
            diaPrimeraCita: req.body.diaPrimeraCita,
            siguienteCita: req.body.siguienteCita,
            hora: req.body.hora,
            mensajePaciente: req.body.mensajePaciente,
            profesional: req.body.profesional,
            diagnostico: req.body.diagnostico,
            anamnesis: req.body.anamnesis,
            historial: req.body.historial,
        });

        await nuevaReserva.save();

        res.status(201).json(nuevaReserva);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteReserva = async (req, res) => {
    try {
        const reserva = await Reserva.findByIdAndDelete(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found" });
        }
        res.json({ message: "Reserva deleted successfully." });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const updateReserva = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ rut: req.params.rut });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }
        
        const reserva = await Reserva.findOne({ paciente: paciente._id });
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found" });
        }        


        const datosReserva = {
            diaPrimeraCita: req.body.diaPrimeraCita,
            siguienteCita: req.body.siguienteCita,
            hora: req.body.hora,
            mensajePaciente: req.body.mensajePaciente,
            profesional: req.body.profesional,
            diagnostico: req.body.diagnostico,
            anamnesis: req.body.anamnesis,
            historial: req.body.historial,
        }
        await Reserva.findByIdAndUpdate(reserva._id, datosReserva, { new: true });

        const updatedReservas = await Reserva.find().populate('paciente');
        updatedReservas.forEach(reserva => {
            if (reserva.diaPrimeraCita) {
                reserva.diaPrimeraCita = new Date(reserva.diaPrimeraCita).toISOString().split('T')[0].replace(/-/g, '/');
            }
            if (reserva.siguienteCita) {
                reserva.siguienteCita = new Date(reserva.siguienteCita).toISOString().split('T')[0].replace(/-/g, '/');
            }
        });

        res.json(updatedReservas);

    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getHistorial = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ rut: req.params.rut });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }
        const reserva = await Reserva.findOne({ paciente: paciente._id });
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found" });
        }
        
        reserva.historial.forEach(historialArray => {
            historialArray.forEach(historial => {
                historial.fecha = new Date(historial.fecha).toISOString().split('T')[0].replace(/-/g, '/');
            });
        });

        res.json(reserva.historial);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const addHistorial = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ rut: req.params.rut });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }
        const reserva = await Reserva.findOne({ paciente : paciente._id });
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found" });
        }

        const newHistorialEntry = {
            fecha: req.body.fecha,
            notas: req.body.notas,
        };

        reserva.historial.push(newHistorialEntry);
        reserva.siguienteCita = req.body.siguienteCita;
        reserva.hora = req.body.hora;

        await reserva.save();

        res.status(200).json(reserva);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};