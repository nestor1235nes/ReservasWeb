import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
    days: [String],
    times: [String],
    fromTime: { type: String, default: "" },
    toTime: { type: String, default: "" },
    interval: { type: Number, default: 30 },
    breakFrom: { type: String, default: "" },
    breakTo: { type: String, default: "" }
}, { _id: false });

const serviciosSchema = new mongoose.Schema({
    tipo: {
        type: String,
    },
    duracion: {
        type: String,
    },
    precio: {
        type: String,
    },
    modalidad: {
        type: String,
    },
    descripcion: {
        type: String,
    },
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    // Correo dedicado a sincronización (Google Calendar)
    googleEmail: {
        type: String,
        trim: true,
        default: "",
    },
    password: {
        type: String,
        required: true,
    },
    celular: {
        type: String,
    },
    direccion: {
        type: String,
    },
    fotoPerfil: {
        type: String,
    },
    especialidad: {
        type: String,
    },
    especialidad_principal: {
        type: String,
    },
    experiencia: {
        type: String,
    },
    timetable: {
        type: [timetableSchema],
        default: []
    },
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
    },
    pacientes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Paciente',
    },
    adminAtiendePersonas: {
        type: Boolean,
        default: false,
    },

    ///////////Configuracion de la cuenta/////////////
    cita_presencial: {
        type: Boolean,
        default: false,
    },
    cita_virtual: {
        type: Boolean,
        default: false,
    },
    descripcion: {
        type: String,
    },
    servicios: {
        type: [serviciosSchema],
        default: []
    },
    ///Notificaciones
    notifications: {
        type: [String],
        default: []
    },



    ///////////Configuracion de wsp/////////////
    idInstance: {
        type: String,
    },
    apiTokenInstance: {
        type: String,
    },
    defaultMessage: {
        type: String,
    },
    reminderMessage: {
        type: String,
        default: "Estimado (nombre paciente), le recordarmos que mañana (fecha) a las (hora) tiene una hora agendada. Por favor de no poder asistir contáctese con nosotros o bien reagende su cita en nuestro sitio web www.siotioweb.cl."
    },
    // Enlace público de reservas del profesional/clinica
    miEnlace: {
        type: String,
        default: "",
        trim: true,
    },
    // Slug único para identificar el enlace público
    slug: {
        type: String,
        trim: true,
        index: true,
        unique: true,
        sparse: true,
    },
    // Plantilla de página pública de reservas
    bookingTemplate: {
        type: String,
        enum: ['template1', 'template2', 'template3'],
        default: 'template1'
    },
    // Días bloqueados (no se puede agendar)
    blockedDays: {
        type: [Date],
        default: [],
    },
});

export default mongoose.model('User', userSchema);