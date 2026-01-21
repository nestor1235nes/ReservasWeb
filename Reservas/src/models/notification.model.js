import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    // Usuario profesional destinatario de la notificación
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Tipo de notificación para filtrado y estilos
    type: {
        type: String,
        enum: [
            'new_appointment',       // Paciente registró nueva cita
            'cancelled_appointment', // Paciente canceló cita
            'subscription_expiring', // Suscripción próxima a vencer
            'confirmed_appointment', // Paciente confirmó cita
            'reschedule_requested',  // Paciente solicitó reagendar
            'system'                 // Notificaciones del sistema
        ],
        required: true,
        index: true
    },
    // Título corto de la notificación
    title: {
        type: String,
        required: true
    },
    // Mensaje/descripción de la notificación
    message: {
        type: String,
        required: true
    },
    // Si ya fue leída por el usuario
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    // Fecha de lectura
    readAt: {
        type: Date
    },
    // Datos adicionales relevantes (ej: ID de reserva, paciente, etc.)
    metadata: {
        reservaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' },
        pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente' },
        pacienteNombre: { type: String },
        fecha: { type: Date },
        hora: { type: String }
    }
}, {
    timestamps: true
});

// Índice compuesto para consultas frecuentes
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// Método estático para obtener notificaciones no leídas
notificationSchema.statics.getUnreadCount = async function(userId) {
    return this.countDocuments({ user: userId, read: false });
};

// Método estático para obtener notificaciones de un usuario
notificationSchema.statics.getForUser = async function(userId, options = {}) {
    const { limit = 20, skip = 0, unreadOnly = false } = options;
    const query = { user: userId };
    if (unreadOnly) query.read = false;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

// Método estático para marcar como leídas
notificationSchema.statics.markAsRead = async function(userId, notificationIds = []) {
    const query = { user: userId };
    if (notificationIds.length > 0) {
        query._id = { $in: notificationIds };
    }
    return this.updateMany(query, { 
        $set: { read: true, readAt: new Date() } 
    });
};

// Método estático para marcar todas como leídas
notificationSchema.statics.markAllAsRead = async function(userId) {
    return this.updateMany(
        { user: userId, read: false },
        { $set: { read: true, readAt: new Date() } }
    );
};

// Método estático para crear notificación
notificationSchema.statics.createNotification = async function(data) {
    const notification = new this(data);
    return notification.save();
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
