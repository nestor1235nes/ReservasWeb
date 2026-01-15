import mongoose from "mongoose";

/**
 * Modelo de Lista de Espera
 * 
 * La lista de espera funciona como una cola FIFO (First In, First Out).
 * Cuando un paciente cancela su cita, se notifica al primer paciente en la lista
 * para ese profesional específico. Si no acepta en 20 minutos, se pasa al siguiente.
 */
const WaitlistSchema = new mongoose.Schema({
    // Paciente en la lista de espera
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: true,
    },
    // Profesional al que el paciente quiere atenderse
    profesional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Reserva actual del paciente (para moverla si acepta una hora liberada)
    reservaActual: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reserva',
    },
    // Sucursal (opcional, para contexto en Teams)
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
    },
    // Fecha y hora en que se unió a la lista (para ordenar FIFO)
    fechaIngreso: {
        type: Date,
        default: Date.now,
        index: true,
    },
    // Estado del registro en la lista de espera
    estado: {
        type: String,
        enum: [
            'activo',           // En la lista esperando oportunidad
            'ofertado',         // Se le ofreció una hora y está esperando respuesta
            'aceptado',         // Aceptó una hora liberada
            'rechazado',        // Rechazó la oferta (decidió quedarse en la lista)
            'expirado',         // No respondió a tiempo y se pasó al siguiente
            'removido'          // Se removió de la lista manualmente
        ],
        default: 'activo',
        index: true,
    },
    // Token para aceptar la hora ofertada (hash para seguridad)
    ofertaTokenHash: {
        type: String,
        index: true,
    },
    // Fecha de expiración del token de oferta (20 minutos)
    ofertaTokenExpires: {
        type: Date,
    },
    // Datos de la hora ofertada (cita cancelada)
    horaOfertada: {
        reservaCancelada: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reserva',
        },
        fecha: {
            type: Date,
        },
        hora: {
            type: String,
        },
        servicio: {
            type: String,
        },
        modalidad: {
            type: String,
        },
    },
    // Historial de ofertas recibidas
    historialOfertas: [{
        fecha: { type: Date, default: Date.now },
        accion: { type: String }, // 'ofertado', 'aceptado', 'rechazado', 'expirado'
        horaOfertada: {
            fecha: Date,
            hora: String,
        },
        meta: { type: Object }
    }],
    // Teléfono del paciente (para envío de WhatsApp, se guarda para no depender de populate)
    telefonoPaciente: {
        type: String,
    },
    // Nombre del paciente (para mensaje WhatsApp)
    nombrePaciente: {
        type: String,
    },
}, { timestamps: true });

// Índice compuesto para buscar pacientes en lista de espera activa por profesional (FIFO)
WaitlistSchema.index({ profesional: 1, estado: 1, fechaIngreso: 1 });

// Índice para buscar ofertas pendientes que pueden expirar
WaitlistSchema.index({ estado: 1, ofertaTokenExpires: 1 });

// Prevenir duplicados: un paciente solo puede estar activo una vez por profesional
WaitlistSchema.index({ paciente: 1, profesional: 1, estado: 1 }, { 
    unique: true,
    partialFilterExpression: { estado: 'activo' }
});

const Waitlist = mongoose.model("Waitlist", WaitlistSchema);

export default Waitlist;
