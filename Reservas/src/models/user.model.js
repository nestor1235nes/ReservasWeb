import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
    days: [String],
    times: [String],
    // Cantidad de cupos disponibles por cada bloque horario (sobrecupo).
    // Ej: 1 = normal, 2 = permite 2 reservas en la misma hora.
    slotCapacity: { type: Number, default: 1, min: 1 },
    // Overrides de cupos por hora específica. Ej: { "10:00": 3 }.
    // Si existe para una hora, prima sobre slotCapacity.
    slotCapacityOverrides: {
        type: Map,
        of: { type: Number, min: 1 },
        default: {},
    },
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
        default: "Estimado {nombre}, le recordarmos que mañana {fecha} a las {hora} tiene una hora agendada. Por favor de no poder asistir contáctese con nosotros o bien reagende su cita en nuestro sitio web https://agendavitalink.vercel.app/"
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

    // Horarios bloqueados por día (no se puede agendar en esas horas)
    blockedHours: {
        type: [
            new mongoose.Schema(
                {
                    // Fecha a medianoche UTC (para comparar por YYYY-MM-DD)
                    date: { type: Date, required: true },
                    // Lista de horas en formato 'HH:mm'
                    times: { type: [String], default: [] },
                },
                { _id: false }
            ),
        ],
        default: [],
    },

    // Suscripción
    suscriptionPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SuscriptionPlan',
    },
    suscriptionStartDate: {
        type: Date,
    },
    suscriptionEndDate: {
        type: Date,
    },
    externalCustomerId: {
        type: String,
    },

}, { timestamps: true });

export default mongoose.model('User', userSchema);