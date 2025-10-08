import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import Sucursal from "../models/sucursal.model.js";
import User from "../models/user.model.js";

// Función helper para normalizar el teléfono al formato 569XXXXXXXX
const normalizarTelefono = (telefono) => {
  if (!telefono) return '';
  
  let tel = telefono.toString().replace(/\D/g, ''); // Solo números
  
  // Si ya está en formato correcto (569XXXXXXXX), lo dejamos
  if (tel.length === 11 && tel.startsWith('569')) {
    return tel;
  }
  
  // Si tiene 9 dígitos y empieza con 9 (912345678), agregamos 56
  if (tel.length === 9 && tel.startsWith('9')) {
    return '56' + tel;
  }
  
  // Si tiene 8 dígitos (12345678), agregamos 569
  if (tel.length === 8) {
    return '569' + tel;
  }
  
  // Si empieza con 56 pero no con 569, lo corregimos
  if (tel.startsWith('56') && !tel.startsWith('569')) {
    return '569' + tel.slice(2);
  }
  
  // Si no cumple ningún caso, lo dejamos vacío
  return '';
};

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
    try {
        const { nombre, rut, telefono, direccion, edad, email, estado, eventId } = req.body;

        // Verificar si el paciente ya existe
        const pacienteExistente = await Paciente.findOne({ rut });
        if (pacienteExistente) {
            return res.status(400).json({ message: "El paciente con este RUT ya existe" });
        }

        // Normalizar teléfono
        const telefonoNormalizado = normalizarTelefono(telefono);

        const newPaciente = new Paciente({
            nombre,
            rut,
            telefono: telefonoNormalizado,
            direccion,
            edad,
            email,
            estado: estado || "Pendiente",
            eventId,
            profesional: req.user.id, // Asignar el profesional que lo creó
            diaPrimeraCita: new Date() // Siempre asignar la fecha actual como fecha de registro
            // No inicializar comportamiento aquí, se queda como array vacío por defecto
        });

        const pacienteGuardado = await newPaciente.save();

        // Asociar el paciente al usuario logueado
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        if (user.sucursal) {
            // Si el usuario pertenece a una sucursal, agregar el paciente a la sucursal
            await Sucursal.findByIdAndUpdate(
                user.sucursal,
                { $addToSet: { pacientes: pacienteGuardado._id } }
            );
        } else {
            // Si es un profesional independiente, agregar el paciente al usuario
            await User.findByIdAndUpdate(
                userId,
                { $addToSet: { pacientes: pacienteGuardado._id } }
            );
        }

        res.status(201).json(pacienteGuardado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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
        
        // Buscar por ID en lugar de RUT
        const paciente = await Paciente.findById(req.params.id);
        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }

        // Normalizar el teléfono
        if (req.body.telefono) {
            const telefonoNormalizado = normalizarTelefono(req.body.telefono);
            req.body.telefono = telefonoNormalizado;
        }

        const updatedPaciente = await Paciente.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        
        res.json(updatedPaciente);
    } catch (error) {
        console.error('Error actualizando paciente:', error);
        res.status(500).json({ message: error.message });
    }
}

export const getReservas = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    let reservas = [];

    if (user.sucursal) {
      // Busca la sucursal y revisa si el usuario es asistente
      const sucursal = await Sucursal.findById(user.sucursal);
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        // Es asistente: obtiene TODAS las reservas de la sucursal
        reservas = await Reserva.find({ sucursal: sucursal._id })
          .populate('paciente')
          .populate('profesional');
      } else {
        // Es profesional (de sucursal o independiente): solo sus reservas
        
        reservas = await Reserva.find({ profesional: userId })
          .populate('paciente')
          .populate('profesional');
      }
    } else {
      // Profesional independiente (sin sucursal): solo sus reservas
      reservas = await Reserva.find({ profesional: userId })
        .populate('paciente')
        .populate('profesional');
    }

        // Enviar fechas tal cual (ISO de Mongo) para evitar desfaces por UTC; el frontend hará el parseo local

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

        // Usar el usuario autenticado como profesional
        const profesionalId = req.body.profesional || req.user.id;
        
        // Buscar sucursal donde el profesional trabaja
        const sucursal = await Sucursal.findOne({ profesionales: profesionalId });

        let sucursalId = null;
        if (sucursal) {
            sucursalId = sucursal._id;
            // Agregar paciente a la sucursal si no está
            if (!sucursal.pacientes.includes(paciente._id)) {
                sucursal.pacientes.push(paciente._id);
                await sucursal.save();
            }
        } else {
            // Profesional independiente: agregar paciente al profesional
            const profesional = await User.findById(profesionalId);
            if (profesional && !profesional.pacientes.includes(paciente._id)) {
                profesional.pacientes.push(paciente._id);
                await profesional.save();
            }
        }

        // Determinar diaPrimeraCita según reglas de negocio
        // - Si no viene en el body y es la primera reserva del paciente, usar siguienteCita si existe; si no, hoy
        // - Si viene, respetarlo
        let diaPrimeraCitaValue = req.body.diaPrimeraCita;
        if (!diaPrimeraCitaValue) {
            const reservasPrevias = await Reserva.find({ paciente: paciente._id }).limit(1);
            const esPrimera = reservasPrevias.length === 0;
            if (esPrimera) {
                diaPrimeraCitaValue = req.body.siguienteCita ? req.body.siguienteCita : new Date();
            }
        }

        const nuevaReserva = new Reserva({
            paciente: paciente._id,
            diaPrimeraCita: diaPrimeraCitaValue,
            siguienteCita: req.body.siguienteCita,
            hora: req.body.hora,
            mensajePaciente: req.body.mensajePaciente,
            profesional: profesionalId,
            diagnostico: req.body.diagnostico,
            anamnesis: req.body.anamnesis,
            historial: req.body.historial,
            eventId: req.body.eventId,
            modalidad: req.body.modalidad || 'Presencial', // Valor por defecto
            servicio: req.body.servicio || 'Consulta', // Valor por defecto
        });
        
        if (sucursalId) {
            nuevaReserva.sucursal = sucursalId;
        }

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
            imagenes: req.body.imagenes,
            eventId: req.body.eventId, 
        }
        await Reserva.findByIdAndUpdate(reserva._id, datosReserva, { new: true });

        const updatedReservas = await Reserva.find().populate('paciente');
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

        // Asegurar que la fecha sea un objeto Date válido
        const fechaSesion = req.body.fecha ? new Date(req.body.fecha) : new Date();
        const siguienteCitaDate = req.body.siguienteCita ? new Date(req.body.siguienteCita) : null;

        const newHistorialEntry = {
            fecha: fechaSesion,
            notas: req.body.notas || '',
            sucursal: reserva.sucursal,
            profesional: reserva.profesional,
        };

        reserva.historial.push(newHistorialEntry);
        
        // Solo actualizar siguienteCita y hora si se proporcionan
        if (siguienteCitaDate) {
            reserva.siguienteCita = siguienteCitaDate;
        }
        if (req.body.hora) {
            reserva.hora = req.body.hora;
        }

        await reserva.save();

        res.status(200).json(reserva);
    } catch (error) {
        console.error('Error en addHistorial:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getPacientesUsuario = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    let pacientes = [];
    if (user.sucursal) {
        // Buscar pacientes de la sucursal
        const sucursal = await Sucursal.findById(user.sucursal).populate({
          path: 'pacientes',
          populate: {
            path: 'profesional',
            select: 'username email'
          }
        });
        if (sucursal) {
            pacientes = sucursal.pacientes;
        }
    } else {
      // Buscar pacientes del profesional
        const userWithPacientes = await User.findById(userId).populate({
          path: 'pacientes',
          populate: {
            path: 'profesional',
            select: 'username email'
          }
        });
        pacientes = userWithPacientes.pacientes;

    }
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Nueva función: obtener todas las reservas de un paciente por RUT
export const getReservasPorRut = async (req, res) => {
  try {
    const paciente = await Paciente.findOne({ rut: req.params.rut });
    if (!paciente) {
            // Si no existe el paciente, devolver lista vacía para no romper flujos públicos
            return res.status(200).json([]);
    }
    const reservas = await Reserva.find({ paciente: paciente._id }).populate('paciente').populate('profesional');
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Nueva función: obtener reservas del profesional para exportación ICS
export const getReservasParaExportacion = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    let reservas = [];

    if (user.sucursal) {
      // Busca la sucursal y revisa si el usuario es asistente
      const sucursal = await Sucursal.findById(user.sucursal);
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        // Es asistente: obtiene TODAS las reservas de la sucursal
        reservas = await Reserva.find({ sucursal: sucursal._id })
          .populate('paciente')
          .populate('profesional');
      } else {
        // Es profesional de sucursal: solo sus reservas
        reservas = await Reserva.find({ 
          profesional: userId,
          sucursal: sucursal._id 
        })
          .populate('paciente')
          .populate('profesional');
      }
    } else {
      // Profesional independiente (sin sucursal): solo sus reservas
      reservas = await Reserva.find({ profesional: userId })
        .populate('paciente')
        .populate('profesional');
    }

    // Filtrar solo reservas con fechas válidas para el ICS
    const reservasValidas = reservas.filter(reserva => {
      return (reserva.diaPrimeraCita || reserva.siguienteCita) && reserva.hora;
    });

    res.json(reservasValidas);
  } catch (error) {
    console.error('Error obteniendo reservas para exportación:', error);
    res.status(500).json({ message: error.message });
  }
};

// Crear paciente desde flujo público (sin req.user)
export const publicCreatePaciente = async (req, res) => {
    try {
        const { nombre, rut, telefono, direccion, edad, email, estado, eventId, profesional: profesionalId } = req.body;

        if (!rut || !nombre || !profesionalId) {
            return res.status(400).json({ message: "Datos insuficientes (rut, nombre y profesional requeridos)" });
        }

        // Si existe, devolver existente (idempotente)
        const existente = await Paciente.findOne({ rut });
        if (existente) {
            return res.status(200).json(existente);
        }

        // Validar profesional
        const profesional = await User.findById(profesionalId);
        if (!profesional) {
            return res.status(400).json({ message: "Profesional inválido" });
        }

        const telefonoNormalizado = normalizarTelefono(telefono);

        const newPaciente = new Paciente({
            nombre,
            rut,
            telefono: telefonoNormalizado,
            direccion,
            edad,
            email,
            estado: estado || "Pendiente",
            eventId,
            profesional: profesionalId,
            diaPrimeraCita: new Date()
        });

        const pacienteGuardado = await newPaciente.save();

        // Asociar a sucursal o al profesional independiente
        if (profesional.sucursal) {
            await Sucursal.findByIdAndUpdate(
                profesional.sucursal,
                { $addToSet: { pacientes: pacienteGuardado._id } }
            );
        } else {
            await User.findByIdAndUpdate(
                profesionalId,
                { $addToSet: { pacientes: pacienteGuardado._id } }
            );
        }

        res.status(201).json(pacienteGuardado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear reserva desde flujo público (sin autenticación)
export const publicCreateReserva = async (req, res) => {
    try {
        const { rut, profesional: profesionalId, diaPrimeraCita, siguienteCita, hora, mensajePaciente, diagnostico, anamnesis, historial, eventId, modalidad, servicio } = req.body;

        if (!rut || !profesionalId || !siguienteCita || !hora) {
            return res.status(400).json({ message: "Datos insuficientes para crear la reserva" });
        }

        const paciente = await Paciente.findOne({ rut });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente not found" });
        }

        const profesional = await User.findById(profesionalId);
        if (!profesional) {
            return res.status(400).json({ message: "Profesional inválido" });
        }

        // Buscar sucursal del profesional (si aplica)
        const sucursal = await Sucursal.findOne({ profesionales: profesionalId });
        let sucursalId = null;
        if (sucursal) {
            sucursalId = sucursal._id;
            if (!sucursal.pacientes.includes(paciente._id)) {
                sucursal.pacientes.push(paciente._id);
                await sucursal.save();
            }
        } else {
            if (!profesional.pacientes.includes(paciente._id)) {
                profesional.pacientes.push(paciente._id);
                await profesional.save();
            }
        }

        // Determinar diaPrimeraCita si viene vacío: si es la primera reserva del paciente, usar siguienteCita o hoy
        let diaPrimeraCitaValue = diaPrimeraCita;
        if (!diaPrimeraCitaValue) {
            const reservasPrevias = await Reserva.find({ paciente: paciente._id }).limit(1);
            const esPrimera = reservasPrevias.length === 0;
            if (esPrimera) {
                diaPrimeraCitaValue = siguienteCita ? siguienteCita : new Date();
            }
        }

        const nuevaReserva = new Reserva({
            paciente: paciente._id,
            diaPrimeraCita: diaPrimeraCitaValue,
            siguienteCita,
            hora,
            mensajePaciente,
            profesional: profesionalId,
            diagnostico,
            anamnesis,
            historial,
            eventId,
            modalidad: modalidad || 'Presencial',
            servicio: servicio || 'Consulta',
        });

        if (sucursalId) nuevaReserva.sucursal = sucursalId;

        await nuevaReserva.save();

        res.status(201).json(nuevaReserva);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};