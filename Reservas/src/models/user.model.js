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
    password: {
        type: String,
        required: true,
    },
    celular: {
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
    descripcion: {
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

    ///////////Configuracion de la cuenta/////////////
    cita_presencial: {
        type: Boolean,
        default: false,
    },
    cita_virtual: {
        type: Boolean,
        default: false,
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
});

export default mongoose.model('User', userSchema);