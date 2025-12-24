import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import Sucursal from "../models/sucursal.model.js";
import User from "../models/user.model.js";
import crypto from 'crypto';
import axios from 'axios';
import { FRONTEND_URL } from "../config.js";

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

// Helpers para token de confirmación
const TOKEN_BYTES = 24; // ~32 chars base64url
const TOKEN_TTL_HOURS = 48;
const base64UrlEncode = (buf) => buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Enviar WhatsApp (Green API) usando credenciales del profesional para notificar registro de cita
// Si la reserva no tiene token de confirmación vigente, se genera uno automáticamente
async function enviarWhatsAppRegistroCita({ profesional, paciente, reserva }) {
    try {
        if (!profesional?.idInstance || !profesional?.apiTokenInstance) return { ok: false, reason: 'missing_credentials' };
        const rawPhone = paciente?.telefono;
        const phone = normalizarTelefono(rawPhone);
        if (!/^569\d{8}$/.test(String(phone))) return { ok: false, reason: 'invalid_phone' };

        // Formatear fecha a DD-MM-YYYY evitando desfase por UTC (cuando llega como YYYY-MM-DD o T00:00:00Z)
        const formatFecha = (fecha) => {
            try {
                if (!fecha) return '';
                let y, m, d;
                if (typeof fecha === 'string') {
                    // Caso fecha solo con día: "YYYY-MM-DD"
                    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                        const parts = fecha.split('-').map(Number);
                        [y, m, d] = parts;
                        // Construir usando zona local
                        const local = new Date(y, m - 1, d);
                        y = local.getFullYear();
                        m = local.getMonth() + 1;
                        d = local.getDate();
                    } else if (fecha.endsWith('Z') && fecha.includes('T00:00:00')) {
                        // Medianoche UTC => tomar solo la parte de fecha y construir local
                        const [yy, mm, dd] = fecha.slice(0, 10).split('-').map(Number);
                        const local = new Date(yy, mm - 1, dd);
                        y = local.getFullYear();
                        m = local.getMonth() + 1;
                        d = local.getDate();
                    } else {
                        const dt = new Date(fecha);
                        if (isNaN(dt.getTime())) return '';
                        y = dt.getFullYear();
                        m = dt.getMonth() + 1;
                        d = dt.getDate();
                    }
                } else if (fecha instanceof Date) {
                    // Si ya es Date, usar componentes locales
                    y = fecha.getFullYear();
                    m = fecha.getMonth() + 1;
                    d = fecha.getDate();
                } else {
                    const dt = new Date(fecha);
                    if (isNaN(dt.getTime())) return '';
                    y = dt.getFullYear();
                    m = dt.getMonth() + 1;
                    d = dt.getDate();
                }
                const ddStr = String(d).padStart(2, '0');
                const mmStr = String(m).padStart(2, '0');
                const yyyyStr = String(y);
                return `${ddStr}-${mmStr}-${yyyyStr}`;
            } catch { return ''; }
        };

        const fecha = formatFecha(reserva?.siguienteCita || reserva?.diaPrimeraCita);
        const hora = reserva?.hora || '';
        const nombre = paciente?.nombre || '';
        const profesionalNombre = profesional?.username || '';

        // Asegurar link de confirmación (token nuevo si no hay o expiró)
        let tokenRaw = null;
        const now = new Date();
        const expired = !reserva.confirmTokenExpires || reserva.confirmTokenExpires < now;
        if (!reserva.confirmTokenHash || expired) {
            tokenRaw = base64UrlEncode(crypto.randomBytes(TOKEN_BYTES));
            reserva.confirmTokenHash = hashToken(tokenRaw);
            reserva.confirmTokenExpires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
            // Mantener o establecer estado pendiente si estaba cancelada
            if (reserva.confirmStatus === 'cancelled' || !reserva.confirmStatus) {
                reserva.confirmStatus = 'pending';
            }
            await reserva.save();
        }
        // Si ya existía y seguía vigente, no generamos otro; construimos link con el token actual no disponible en claro
        // Para esto, cuando no generamos token nuevo, no conocemos el valor raw; en ese caso regeneramos de forma segura
        if (!tokenRaw) {
            // Cuando solo tenemos el hash no es posible recuperar el token original; preferimos regenerar uno nuevo para enviar
            tokenRaw = base64UrlEncode(crypto.randomBytes(TOKEN_BYTES));
            reserva.confirmTokenHash = hashToken(tokenRaw);
            reserva.confirmTokenExpires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
            await reserva.save();
        }

        const baseUrl = (process.env.FRONTEND_BASE_URL || FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const confirmLink = `${baseUrl}/confirmacion/${tokenRaw}`;

        const message = (
            `Hola ${nombre}, hemos registrado su cita para el ${fecha} a las ${hora} con ${profesionalNombre}.

Puede confirmar su asistencia ahora a través del siguiente enlace:
${confirmLink}

Además, se le recordará su cita agendada 24 horas antes. Gracias por su preferencia.`
        ).trim();

        const url = `https://api.green-api.com/waInstance${profesional.idInstance}/sendMessage/${profesional.apiTokenInstance}`;
        const data = { chatId: `${phone}@c.us`, message };
        const resp = await axios.post(url, data);
        if (resp?.status >= 200 && resp?.status < 300) return { ok: true };
        return { ok: false, reason: `http_${resp?.status}` };
    } catch (e) {
        return { ok: false, reason: 'request_error', detail: e?.response?.data || e?.message || String(e) };
    }
}

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

        // Verificar si el paciente ya existe (idempotente). Si existe, retornarlo y asociar profesional.
        const pacienteExistente = await Paciente.findOne({ rut });
        if (pacienteExistente) {
            // Asegurar que el profesional actual quede asociado en la lista multi-atención
            await Paciente.updateOne({ _id: pacienteExistente._id }, { $addToSet: { profesionales: req.user.id } });

            // Asociar a sucursal o profesional como en el flujo normal
            const userId = req.user.id;
            const user = await User.findById(userId);
            if (user.sucursal) {
                await Sucursal.findByIdAndUpdate(
                    user.sucursal,
                    { $addToSet: { pacientes: pacienteExistente._id } }
                );
            } else {
                await User.findByIdAndUpdate(
                    userId,
                    { $addToSet: { pacientes: pacienteExistente._id } }
                );
            }

            return res.status(200).json(pacienteExistente);
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
            profesional: req.user.id, // legacy principal profesional
            profesionales: [req.user.id], // inicializar lista de profesionales
            diaPrimeraCita: new Date() // fecha de registro
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

        // Añadir profesional a lista de profesionales del paciente (multi-atención)
        await Paciente.updateOne({ _id: paciente._id }, { $addToSet: { profesionales: profesionalId } });

        // Normalizador de fechas de solo día (evita desfase UTC)
        const normalizeDateField = (val) => {
            if (!val) return val;
            if (typeof val === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m, d] = val.split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
                if (val.endsWith('Z') && val.includes('T00:00:00')) {
                    const [y, m, d] = val.slice(0, 10).split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
            }
            return val;
        };

        const rawHistorial = Array.isArray(req.body.historial)
            ? (Array.isArray(req.body.historial[0]) ? req.body.historial.flat() : req.body.historial)
            : [];
        const hasClinicalData = [req.body.diagnostico, req.body.anamnesis].some(
            (value) => typeof value === 'string' && value.trim().length > 0
        ) || rawHistorial.length > 0;

        const normalizeLegacySessions = (historialVal) => {
            try {
                if (!historialVal) return [];
                if (Array.isArray(historialVal)) {
                    // Puede venir como [[...]] o como [...]
                    if (historialVal.length > 0 && Array.isArray(historialVal[0])) return historialVal.flat();
                    return historialVal;
                }
                return [];
            } catch {
                return [];
            }
        };

        // Determinar diaPrimeraCita solo cuando existe información clínica registrada
        let diaPrimeraCitaValue = null;
        if (hasClinicalData) {
            diaPrimeraCitaValue = req.body.diaPrimeraCita;
            if (!diaPrimeraCitaValue) {
                const reservasPrevias = await Reserva.find({ paciente: paciente._id }).limit(1);
                const esPrimera = reservasPrevias.length === 0;
                if (esPrimera) {
                    diaPrimeraCitaValue = req.body.siguienteCita ? req.body.siguienteCita : new Date();
                }
            }
            diaPrimeraCitaValue = normalizeDateField(diaPrimeraCitaValue);
        }
        const siguienteCitaNorm = normalizeDateField(req.body.siguienteCita);

        // Pago: permitir indicar si la cita se cobra o es exenta.
        // Si no viene, no tocar (mantener defaults del modelo o valores existentes).
        const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);
        const requiresPayment = has('requiresPayment') ? Boolean(req.body.requiresPayment) : undefined;
        const paymentStatusFromRequires = (requiresPayment === undefined)
            ? undefined
            : (requiresPayment ? 'not_initiated' : 'waived');

        // Si ya existe una reserva para este paciente y profesional en la misma fecha y hora, actualizar en lugar de crear
        let reservaExistente = null;
        if (siguienteCitaNorm && req.body.hora) {
            reservaExistente = await Reserva.findOne({
                paciente: paciente._id,
                profesional: profesionalId,
                siguienteCita: siguienteCitaNorm,
                hora: req.body.hora
            });
        }

        let nuevaReserva;
        if (reservaExistente) {
            reservaExistente.mensajePaciente = req.body.mensajePaciente || reservaExistente.mensajePaciente;
            reservaExistente.diagnostico = req.body.diagnostico || reservaExistente.diagnostico;
            reservaExistente.anamnesis = req.body.anamnesis || reservaExistente.anamnesis;
            reservaExistente.historial = req.body.historial || reservaExistente.historial;
            reservaExistente.eventId = req.body.eventId || reservaExistente.eventId;
            reservaExistente.modalidad = req.body.modalidad || reservaExistente.modalidad || 'Presencial';
            reservaExistente.servicio = req.body.servicio || reservaExistente.servicio || 'Consulta';
            if (requiresPayment !== undefined) {
                reservaExistente.requiresPayment = requiresPayment;
                reservaExistente.paymentStatus = paymentStatusFromRequires;
            }

            // Si llega información clínica, registrar/actualizar en casos clínicos.
            if (hasClinicalData) {
                const startNewClinicalCase = req.body.startNewClinicalCase === true || req.body.startNewClinicalCase === 'true' || req.body.startNewClinicalCase === 1 || req.body.startNewClinicalCase === '1';
                const legacySesiones = normalizeLegacySessions(req.body.historial);

                const shouldCreateCase = startNewClinicalCase || !reservaExistente.activeClinicalCaseId || !Array.isArray(reservaExistente.clinicalCases) || reservaExistente.clinicalCases.length === 0;
                if (shouldCreateCase) {
                    reservaExistente.clinicalCases = Array.isArray(reservaExistente.clinicalCases) ? reservaExistente.clinicalCases : [];
                    reservaExistente.clinicalCases.push({
                        diagnostico: req.body.diagnostico || '',
                        anamnesis: req.body.anamnesis || '',
                        createdAt: diaPrimeraCitaValue || new Date(),
                        sesiones: legacySesiones.map((s) => ({
                            fecha: s?.fecha ? new Date(s.fecha) : undefined,
                            notas: s?.notas || '',
                            sucursal: reservaExistente.sucursal,
                            profesional: reservaExistente.profesional,
                        }))
                    });
                    const lastCase = reservaExistente.clinicalCases[reservaExistente.clinicalCases.length - 1];
                    reservaExistente.activeClinicalCaseId = lastCase?._id;
                } else {
                    // Actualizar datos clínicos en caso activo
                    const active = reservaExistente.clinicalCases.id(reservaExistente.activeClinicalCaseId);
                    if (active) {
                        if (typeof req.body.diagnostico === 'string') active.diagnostico = req.body.diagnostico;
                        if (typeof req.body.anamnesis === 'string') active.anamnesis = req.body.anamnesis;
                        // Si llega historial legacy, anexarlo como sesiones del caso activo
                        const legacySesiones2 = normalizeLegacySessions(req.body.historial);
                        legacySesiones2.forEach((s) => {
                            active.sesiones.push({
                                fecha: s?.fecha ? new Date(s.fecha) : undefined,
                                notas: s?.notas || '',
                                sucursal: reservaExistente.sucursal,
                                profesional: reservaExistente.profesional,
                            });
                        });
                    }
                }
            }
            // Actualizar diaPrimeraCita si se envía y no estaba
            if (diaPrimeraCitaValue && !reservaExistente.diaPrimeraCita) {
                reservaExistente.diaPrimeraCita = diaPrimeraCitaValue;
            }
            await reservaExistente.save();
            nuevaReserva = reservaExistente;
        } else {
            const reservaPayload = {
                paciente: paciente._id,
                siguienteCita: siguienteCitaNorm,
                hora: req.body.hora,
                mensajePaciente: req.body.mensajePaciente,
                profesional: profesionalId,
                diagnostico: req.body.diagnostico,
                anamnesis: req.body.anamnesis,
                historial: req.body.historial,
                eventId: req.body.eventId,
                modalidad: req.body.modalidad || 'Presencial', // Valor por defecto
                servicio: req.body.servicio || 'Consulta', // Valor por defecto
            };
            if (requiresPayment !== undefined) {
                reservaPayload.requiresPayment = requiresPayment;
                reservaPayload.paymentStatus = paymentStatusFromRequires;
            }
            if (diaPrimeraCitaValue) {
                reservaPayload.diaPrimeraCita = diaPrimeraCitaValue;
            }
            nuevaReserva = new Reserva(reservaPayload);
            if (sucursalId) {
                nuevaReserva.sucursal = sucursalId;
            }

            // Si llega información clínica al crear la reserva, crear el primer caso clínico.
            if (hasClinicalData) {
                const legacySesiones = normalizeLegacySessions(req.body.historial);
                nuevaReserva.clinicalCases = Array.isArray(nuevaReserva.clinicalCases) ? nuevaReserva.clinicalCases : [];
                nuevaReserva.clinicalCases.push({
                    diagnostico: req.body.diagnostico || '',
                    anamnesis: req.body.anamnesis || '',
                    createdAt: diaPrimeraCitaValue || new Date(),
                    sesiones: legacySesiones.map((s) => ({
                        fecha: s?.fecha ? new Date(s.fecha) : undefined,
                        notas: s?.notas || '',
                        sucursal: nuevaReserva.sucursal,
                        profesional: nuevaReserva.profesional,
                    }))
                });
                nuevaReserva.activeClinicalCaseId = nuevaReserva.clinicalCases[0]?._id;
            }
            await nuevaReserva.save();
        }

                // Enviar WhatsApp de confirmación de registro si el profesional tiene credenciales Green API
                try {
                    const profesional = await User.findById(profesionalId);
                    const pacienteCompleto = await Paciente.findById(paciente._id);
                    const result = await enviarWhatsAppRegistroCita({ profesional, paciente: pacienteCompleto, reserva: nuevaReserva });
                    if (!result.ok) {
                        console.warn('No se pudo enviar WhatsApp de registro de cita:', result);
                    }
                } catch (e) {
                    console.warn('Error enviando WhatsApp de registro (createReserva):', e?.message || e);
                }

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
        // Determinar a qué reserva queremos aplicar la actualización
        // Prioridad: profesionalOriginal (cuando se reasigna), luego req.user.id (profesional actual)
        const profesionalFiltro = req.body.profesionalOriginal || req.user.id;
        let reserva = await Reserva.findOne({ paciente: paciente._id, profesional: profesionalFiltro }).sort({ createdAt: -1 });
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found for this professional" });
        }
        
        const normalizeDateField = (val) => {
            if (!val) return val;
            if (typeof val === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m, d] = val.split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
                if (val.endsWith('Z') && val.includes('T00:00:00')) {
                    const [y, m, d] = val.slice(0, 10).split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
            }
            return val;
        };

        // Construir update de forma segura: solo actualizar campos presentes.
        // Esto permite setear explícitamente null para limpiar valores (p.ej. cerrar ciclo).
        const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);
        const datosReserva = {};
        if (has('diaPrimeraCita')) datosReserva.diaPrimeraCita = normalizeDateField(req.body.diaPrimeraCita);
        if (has('siguienteCita')) datosReserva.siguienteCita = normalizeDateField(req.body.siguienteCita);
        if (has('hora')) datosReserva.hora = req.body.hora;
        if (has('mensajePaciente')) datosReserva.mensajePaciente = req.body.mensajePaciente;
        if (has('profesional')) datosReserva.profesional = req.body.profesional;
        // Campos legacy (se mantienen por compatibilidad), pero la fuente de verdad pasa a ser clinicalCases.
        if (has('diagnostico')) datosReserva.diagnostico = req.body.diagnostico;
        if (has('anamnesis')) datosReserva.anamnesis = req.body.anamnesis;
        if (has('historial')) datosReserva.historial = req.body.historial;
        if (has('imagenes')) datosReserva.imagenes = req.body.imagenes;
        if (has('eventId')) datosReserva.eventId = req.body.eventId;

        // --- Casos clínicos ---
        const startNewClinicalCaseRaw = req.body.startNewClinicalCase;
        const startNewClinicalCase = startNewClinicalCaseRaw === true || startNewClinicalCaseRaw === 'true' || startNewClinicalCaseRaw === 1 || startNewClinicalCaseRaw === '1';
        const hasClinicalUpdate = has('diagnostico') || has('anamnesis');

        const ensureActiveCase = () => {
            reserva.clinicalCases = Array.isArray(reserva.clinicalCases) ? reserva.clinicalCases : [];
            if (!reserva.activeClinicalCaseId || reserva.clinicalCases.length === 0) {
                // Migración suave: si hay datos legacy, crear caso a partir de ellos.
                const legacyDiagnostico = typeof reserva.diagnostico === 'string' ? reserva.diagnostico : '';
                const legacyAnamnesis = typeof reserva.anamnesis === 'string' ? reserva.anamnesis : '';
                reserva.clinicalCases.push({
                    diagnostico: legacyDiagnostico,
                    anamnesis: legacyAnamnesis,
                    createdAt: reserva.diaPrimeraCita || reserva.createdAt || new Date(),
                    sesiones: []
                });
                reserva.activeClinicalCaseId = reserva.clinicalCases[0]._id;
            }
            let active = reserva.clinicalCases.id(reserva.activeClinicalCaseId);
            if (!active) {
                // Si el id no existe, activar el último caso
                active = reserva.clinicalCases[reserva.clinicalCases.length - 1];
                reserva.activeClinicalCaseId = active?._id;
            }
            return active;
        };

        // Permitir iniciar un nuevo caso clínico aunque NO vengan diagnostico/anamnesis.
        // Esto se usa para "Iniciar nuevo diagnóstico" desde el frontend.
        if (startNewClinicalCase) {
            const activePrev = ensureActiveCase();
            if (activePrev && !activePrev.closedAt) {
                activePrev.closedAt = new Date();
            }
            reserva.clinicalCases = Array.isArray(reserva.clinicalCases) ? reserva.clinicalCases : [];
            reserva.clinicalCases.push({
                diagnostico: (typeof req.body.diagnostico === 'string') ? req.body.diagnostico : '',
                anamnesis: (typeof req.body.anamnesis === 'string') ? req.body.anamnesis : '',
                createdAt: new Date(),
                sesiones: []
            });
            const lastCase = reserva.clinicalCases[reserva.clinicalCases.length - 1];
            reserva.activeClinicalCaseId = lastCase?._id;
        } else if (hasClinicalUpdate) {
            const active = ensureActiveCase();
            if (active) {
                if (has('diagnostico') && typeof req.body.diagnostico === 'string') active.diagnostico = req.body.diagnostico;
                if (has('anamnesis') && typeof req.body.anamnesis === 'string') active.anamnesis = req.body.anamnesis;
            }
        }

        // Cerrar caso cuando se limpia explícitamente la próxima cita (cierre de ciclo)
        const isClosingCycle = has('siguienteCita') && req.body.siguienteCita === null && has('hora') && req.body.hora === null;
        if (isClosingCycle) {
            const active = ensureActiveCase();
            if (active && !active.closedAt) {
                active.closedAt = new Date();
            }
        }

        // --- Lógica de pagos para "nueva cita" ---
        // Cuando el profesional registra una sesión y agenda una NUEVA cita (cita aparte),
        // el pago debe resetearse (o marcarse como exento si así lo decide).
        const resetFlagRaw = req.body.resetPaymentForNextAppointment;
        const resetPaymentForNextAppointment = resetFlagRaw === true || resetFlagRaw === 'true' || resetFlagRaw === 1 || resetFlagRaw === '1';

        // Resolver el "próximo estado" de fecha/hora tras aplicar el update.
        const nextSiguienteCita = has('siguienteCita') ? normalizeDateField(req.body.siguienteCita) : reserva.siguienteCita;
        const nextHora = has('hora') ? req.body.hora : reserva.hora;
        const isSchedulingNextAppointment = Boolean(nextSiguienteCita) && Boolean(nextHora);

        // Permitir que frontend indique si se cobrará la nueva cita.
        // Por defecto (si no viene) asumimos que SÍ se cobra.
        const wantsCharge = has('requiresPayment') ? Boolean(req.body.requiresPayment) : true;

        const unset = {};
        if (resetPaymentForNextAppointment && isSchedulingNextAppointment) {
            datosReserva.requiresPayment = wantsCharge;
            datosReserva.paymentStatus = wantsCharge ? 'not_initiated' : 'waived';
            // Limpiar token/datos de pago anteriores para evitar reuso
            unset.paymentToken = 1;
            unset.buyOrder = 1;
            unset.paymentAmount = 1;
            unset.paymentDueDate = 1;
            unset.paymentData = 1;
        }

        const updateOp = {};
        if (Object.keys(datosReserva).length > 0) updateOp.$set = datosReserva;
        if (Object.keys(unset).length > 0) updateOp.$unset = unset;

        if (Object.keys(updateOp).length > 0) {
            await Reserva.findByIdAndUpdate(reserva._id, updateOp, { new: true });
        }

        // Persistir cambios de casos clínicos si hubo modificaciones
        if (hasClinicalUpdate || startNewClinicalCase || isClosingCycle) {
            await reserva.save();
        }
        // Mantener relación multi-profesional al actualizar (si se cambia profesional)
        if (req.body.profesional) {
            await Paciente.updateOne({ _id: paciente._id }, { $addToSet: { profesionales: req.body.profesional } });
        }

                // Email notifications deprecated: ignoring notifyEmailMessage/Subject intentionally

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
        // Por defecto devolver historial para el profesional autenticado.
        // Para asistentes se puede consultar por profesional usando ?profesional=<id>
        const profesionalFiltro = req.query?.profesional || req.user.id;
        const reserva = await Reserva.findOne({ paciente: paciente._id, profesional: profesionalFiltro }).sort({ createdAt: -1 });
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found" });
        }

        // Migración suave: si aún no hay clinicalCases, construir uno desde legacy.
        const normalizeLegacySessions = (historialVal) => {
            try {
                if (!historialVal) return [];
                if (Array.isArray(historialVal)) {
                    if (historialVal.length > 0 && Array.isArray(historialVal[0])) return historialVal.flat();
                    return historialVal;
                }
                return [];
            } catch {
                return [];
            }
        };

        let clinicalCases = Array.isArray(reserva.clinicalCases) ? reserva.clinicalCases : [];
        if (clinicalCases.length === 0) {
            const legacySesiones = normalizeLegacySessions(reserva.historial);
            clinicalCases = [
                {
                    _id: reserva._id,
                    diagnostico: reserva.diagnostico || '',
                    anamnesis: reserva.anamnesis || '',
                    createdAt: reserva.diaPrimeraCita || reserva.createdAt,
                    closedAt: null,
                    sesiones: legacySesiones
                }
            ];
        }

        // Responder solo lo necesario para el frontend
        res.json({
            activeClinicalCaseId: reserva.activeClinicalCaseId,
            clinicalCases: clinicalCases.map((c) => ({
                _id: c._id,
                diagnostico: c.diagnostico || '',
                anamnesis: c.anamnesis || '',
                createdAt: c.createdAt,
                closedAt: c.closedAt,
                sesiones: Array.isArray(c.sesiones) ? c.sesiones : []
            }))
        });
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
        // Adjuntar historial a la reserva del profesional actual (o al indicado en profesionalOriginal)
        const profesionalFiltro = req.body.profesionalOriginal || req.user.id;
        const reserva = await Reserva.findOne({ paciente : paciente._id, profesional: profesionalFiltro }).sort({ createdAt: -1 });
        if (!reserva) {
            return res.status(404).json({ message: "Reserva not found for this professional" });
        }

        // Asegurar que la fecha sea un objeto Date válido
        const normalizeDateField = (val) => {
            if (!val) return val;
            if (typeof val === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m, d] = val.split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
                if (val.endsWith('Z') && val.includes('T00:00:00')) {
                    const [y, m, d] = val.slice(0, 10).split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
            }
            return new Date(val);
        };

        const fechaSesion = req.body.fecha ? normalizeDateField(req.body.fecha) : new Date();
        const siguienteCitaDate = req.body.siguienteCita ? normalizeDateField(req.body.siguienteCita) : null;

        const newHistorialEntry = {
            fecha: fechaSesion,
            notas: req.body.notas || '',
            sucursal: reserva.sucursal,
            profesional: reserva.profesional,
        };

        // --- Guardar sesión en el caso clínico activo ---
        reserva.clinicalCases = Array.isArray(reserva.clinicalCases) ? reserva.clinicalCases : [];
        if (!reserva.activeClinicalCaseId || reserva.clinicalCases.length === 0) {
            // Crear caso por defecto si no existe
            reserva.clinicalCases.push({
                diagnostico: typeof reserva.diagnostico === 'string' ? reserva.diagnostico : '',
                anamnesis: typeof reserva.anamnesis === 'string' ? reserva.anamnesis : '',
                createdAt: reserva.diaPrimeraCita || reserva.createdAt || new Date(),
                sesiones: []
            });
            reserva.activeClinicalCaseId = reserva.clinicalCases[0]._id;
        }
        let activeCase = reserva.clinicalCases.id(reserva.activeClinicalCaseId);
        if (!activeCase) {
            activeCase = reserva.clinicalCases[reserva.clinicalCases.length - 1];
            reserva.activeClinicalCaseId = activeCase?._id;
        }
        if (activeCase) {
            activeCase.sesiones = Array.isArray(activeCase.sesiones) ? activeCase.sesiones : [];
            activeCase.sesiones.push(newHistorialEntry);
        }

        if (!reserva.diaPrimeraCita) {
            reserva.diaPrimeraCita = fechaSesion;
        }
        
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

        // Reconciliación: incluir pacientes derivados de reservas y también asociaciones directas (user.pacientes o sucursal.pacientes)
        let pacienteIdsSet = new Set();

        if (user.sucursal) {
            const sucursal = await Sucursal.findById(user.sucursal);
            if (sucursal) {
                // Si es asistente de la sucursal: ver todos los pacientes de la sucursal
                const esAsistente = sucursal.asistentes?.some(a => a.equals(userId));
                if (esAsistente) {
                    const reservasSucursal = await Reserva.find({ sucursal: sucursal._id }).select('paciente');
                    reservasSucursal.forEach(r => pacienteIdsSet.add(r.paciente.toString()));
                    // Unir con pacientes asociados directamente a la sucursal
                    (sucursal.pacientes || []).forEach(p => pacienteIdsSet.add(p.toString()));
                } else {
                    // Profesional de sucursal: ver solo sus pacientes
                    const reservasProfesional = await Reserva.find({ profesional: userId }).select('paciente');
                    reservasProfesional.forEach(r => pacienteIdsSet.add(r.paciente.toString()));
                    // Unir con pacientes asociados directamente al profesional (no toda la sucursal para evitar fugas)
                    const userDoc = await User.findById(userId).select('pacientes');
                    (userDoc?.pacientes || []).forEach(p => pacienteIdsSet.add(p.toString()));
                }
            }
        } else {
            // Profesional independiente
            const reservasProfesional = await Reserva.find({ profesional: userId }).select('paciente');
            reservasProfesional.forEach(r => pacienteIdsSet.add(r.paciente.toString()));
            const userDoc = await User.findById(userId).select('pacientes');
            (userDoc?.pacientes || []).forEach(p => pacienteIdsSet.add(p.toString()));
        }

        const pacienteIds = Array.from(pacienteIdsSet);
        const pacientes = await Paciente.find({ _id: { $in: pacienteIds } })
            .populate({ path: 'profesionales', select: 'username email' });

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
                // Asegurar asociación multi-profesional cuando ya existía
                await Paciente.updateOne({ _id: existente._id }, { $addToSet: { profesionales: profesionalId } });
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
            profesional: profesionalId, // legacy
                profesionales: [profesionalId], // inicializar lista de profesionales
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

        // Añadir profesional a lista multi-atención
        await Paciente.updateOne({ _id: paciente._id }, { $addToSet: { profesionales: profesionalId } });

        // Normalizador de fechas de solo día (evita desfase UTC)
        const normalizeDateField = (val) => {
            if (!val) return val;
            if (typeof val === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m, d] = val.split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
                if (val.endsWith('Z') && val.includes('T00:00:00')) {
                    const [y, m, d] = val.slice(0, 10).split('-').map(Number);
                    return new Date(y, m - 1, d);
                }
            }
            return val;
        };

        const rawHistorial = Array.isArray(historial)
            ? (Array.isArray(historial[0]) ? historial.flat() : historial)
            : [];
        const hasClinicalData = [diagnostico, anamnesis].some(
            (value) => typeof value === 'string' && value.trim().length > 0
        ) || rawHistorial.length > 0;

        // Determinar diaPrimeraCita solo cuando existe información clínica registrada
        let diaPrimeraCitaValue = null;
        if (hasClinicalData) {
            diaPrimeraCitaValue = diaPrimeraCita;
            if (!diaPrimeraCitaValue) {
                const reservasPrevias = await Reserva.find({ paciente: paciente._id }).limit(1);
                const esPrimera = reservasPrevias.length === 0;
                if (esPrimera) {
                    diaPrimeraCitaValue = siguienteCita ? siguienteCita : new Date();
                }
            }
            diaPrimeraCitaValue = normalizeDateField(diaPrimeraCitaValue);
        }
        const siguienteCitaNorm = normalizeDateField(siguienteCita);

        // Deduplicar en flujo público también
        let reservaExistente = null;
        if (siguienteCitaNorm && hora) {
            reservaExistente = await Reserva.findOne({
                paciente: paciente._id,
                profesional: profesionalId,
                siguienteCita: siguienteCitaNorm,
                hora
            });
        }

        let nuevaReserva;
        if (reservaExistente) {
            reservaExistente.mensajePaciente = mensajePaciente || reservaExistente.mensajePaciente;
            reservaExistente.diagnostico = diagnostico || reservaExistente.diagnostico;
            reservaExistente.anamnesis = anamnesis || reservaExistente.anamnesis;
            reservaExistente.historial = historial || reservaExistente.historial;
            reservaExistente.eventId = eventId || reservaExistente.eventId;
            reservaExistente.modalidad = modalidad || reservaExistente.modalidad || 'Presencial';
            reservaExistente.servicio = servicio || reservaExistente.servicio || 'Consulta';
            if (diaPrimeraCitaValue && !reservaExistente.diaPrimeraCita) {
                reservaExistente.diaPrimeraCita = diaPrimeraCitaValue;
            }
            await reservaExistente.save();
            nuevaReserva = reservaExistente;
        } else {
            const reservaPayload = {
                paciente: paciente._id,
                siguienteCita: siguienteCitaNorm,
                hora,
                mensajePaciente,
                profesional: profesionalId,
                diagnostico,
                anamnesis,
                historial,
                eventId,
                modalidad: modalidad || 'Presencial',
                servicio: servicio || 'Consulta',
            };
            if (diaPrimeraCitaValue) {
                reservaPayload.diaPrimeraCita = diaPrimeraCitaValue;
            }
            nuevaReserva = new Reserva(reservaPayload);
            if (sucursalId) nuevaReserva.sucursal = sucursalId;
            await nuevaReserva.save();
        }

                // Enviar WhatsApp de confirmación de registro usando credenciales del profesional (flujo público)
                try {
                    const profesionalDoc = await User.findById(profesionalId);
                    const pacienteCompleto = await Paciente.findById(paciente._id);
                    const result = await enviarWhatsAppRegistroCita({ profesional: profesionalDoc, paciente: pacienteCompleto, reserva: nuevaReserva });
                    if (!result.ok) {
                        console.warn('No se pudo enviar WhatsApp de registro de cita (public):', result);
                    }
                } catch (e) {
                    console.warn('Error enviando WhatsApp de registro (publicCreateReserva):', e?.message || e);
                }

                res.status(201).json(nuevaReserva);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};