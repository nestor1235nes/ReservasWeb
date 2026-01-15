import mongoose from "mongoose";

/**
 * Modelo para recordatorios programados de citas.
 * 
 * Tipos de recordatorio:
 * - registro_confirmacion: Se envía al crear la reserva si faltan < 24h (con link de confirmación)
 * - registro_informativo: Se envía al crear la reserva si faltan > 24h (solo informativo)
 * - recordatorio_48h: Se envía 48 horas antes de la cita (con link de confirmación)
 * - recordatorio_24h: Se envía 24 horas antes si no ha confirmado (con link de confirmación)
 */
const ScheduledReminderSchema = new mongoose.Schema({
    reserva: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reserva',
        required: true,
        index: true
    },
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: true
    },
    profesional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: [
            'registro_informativo',    // Cita registrada (sin link, > 24h)
            'registro_confirmacion',   // Cita registrada (con link, < 24h)
            'recordatorio_48h',        // Recordatorio 48h antes (con link)
            'recordatorio_24h'         // Recordatorio 24h antes si no confirmó (con link)
        ],
        required: true,
        index: true
    },
    // Fecha programada para enviar el recordatorio
    fechaProgramada: {
        type: Date,
        required: true,
        index: true
    },
    // Datos de la cita para el mensaje
    fechaCita: {
        type: Date,
        required: true
    },
    horaCita: {
        type: String,
        required: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'enviado', 'fallido', 'cancelado', 'omitido'],
        default: 'pendiente',
        index: true
    },
    intentos: {
        type: Number,
        default: 0
    },
    maxIntentos: {
        type: Number,
        default: 3
    },
    ultimoIntento: {
        type: Date
    },
    // Resultado del envío
    resultado: {
        ok: { type: Boolean },
        reason: { type: String },
        detail: { type: mongoose.Schema.Types.Mixed }
    },
    // Log de intentos
    historialIntentos: [{
        fecha: { type: Date, default: Date.now },
        ok: { type: Boolean },
        reason: { type: String },
        detail: { type: mongoose.Schema.Types.Mixed }
    }]
}, {
    timestamps: true
});

// Índice compuesto para buscar recordatorios pendientes a procesar
ScheduledReminderSchema.index({ estado: 1, fechaProgramada: 1 });

// Índice para evitar duplicados del mismo tipo para la misma reserva
ScheduledReminderSchema.index(
    { reserva: 1, tipo: 1 },
    { unique: true, partialFilterExpression: { estado: { $in: ['pendiente', 'enviado'] } } }
);

// Método estático para obtener recordatorios pendientes listos para enviar
ScheduledReminderSchema.statics.findPendingReadyToSend = function() {
    const now = new Date();
    return this.find({
        estado: 'pendiente',
        fechaProgramada: { $lte: now },
        $expr: { $lt: ['$intentos', '$maxIntentos'] }
    })
    .populate('reserva')
    .populate('paciente')
    .populate('profesional')
    .sort({ fechaProgramada: 1 })
    .limit(100); // Procesar en lotes
};

// Método estático para cancelar recordatorios de una reserva
ScheduledReminderSchema.statics.cancelarPorReserva = function(reservaId) {
    return this.updateMany(
        { reserva: reservaId, estado: 'pendiente' },
        { $set: { estado: 'cancelado' } }
    );
};

// Método estático para omitir recordatorio si ya confirmó
ScheduledReminderSchema.statics.omitirSiConfirmado = async function(reservaId, tiposAOmitir) {
    return this.updateMany(
        { 
            reserva: reservaId, 
            estado: 'pendiente',
            tipo: { $in: tiposAOmitir }
        },
        { $set: { estado: 'omitido' } }
    );
};

const ScheduledReminder = mongoose.model("ScheduledReminder", ScheduledReminderSchema);
export default ScheduledReminder;
