import mongoose from "mongoose";

const contactoSchema = new mongoose.Schema({
    celulares: {
        type: [String],
        default: [],
    },
    telefonos: {
        type: [String],
        default: [],
    },
    email: {
        type: String,    
    },
    instagram: {
        type: String,
        default: "",
    },
    facebook: {
        type: String,
        default: "",
    },
    twitter: {
        type: String,
        default: "",
    },
    linkedin: {
        type: String,
        default: "",
    },
}, { _id: false });


const SucursalSchema = new mongoose.Schema({
    ///////////////Datos de la sucursal/////////////
    nombre: {
        type: String,
        required: true,
    },
    administradores: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
    },
    profesionales: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
    },
    asistentes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "User",
    },
    pacientes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Paciente",
    },
    direccion: {
        type: String,
    },
    
    descripcion: {
        type: String,
    },
    contacto: {
        type: contactoSchema,
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

    // Suscripción
    suscriptionPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SuscriptionPlan",
    },
    suscriptionStartDate: {
        type: Date,
    },
    suscriptionEndDate: {
        type: Date,
    },
    teamConfig: {
        cantidadAdmins: {
            type: Number,
            default: 1,
        },
        cantidadProfessionals: {
            type: Number,
            default: 0,
        },
        cantidadAssistants: {
            type: Number,
            default: 0,
        },
        maxUsers: {
            type: Number,
            default: 1,
        },
    },
}, { timestamps: true });

const Sucursal = mongoose.model("Sucursal", SucursalSchema);

export default Sucursal;