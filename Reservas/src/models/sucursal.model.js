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
    // Slug único para URL pública (ej: /sucursal-publica/clinica-mi-salud)
    slug: {
        type: String,
        trim: true,
        index: true,
        unique: true,
        sparse: true,
    },
    logo: {
        type: String,
        default: "",
        trim: true,
    },
    // Colores para personalizar la página pública de la sucursal
    publicBrand: {
        primary: { type: String, default: '#2596be' },
        secondary: { type: String, default: '#21cbe6' },
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

    // Ubicación normalizada de Google Maps (Places)
    googleMaps: {
        placeId: { type: String, default: '' },
        formattedAddress: { type: String, default: '' },
        lat: { type: Number },
        lng: { type: Number },
        url: { type: String, default: '' },
    },

    // Ubicación normalizada (Mapbox / proveedor genérico)
    maps: {
        provider: { type: String, default: '' },
        placeId: { type: String, default: '' },
        formattedAddress: { type: String, default: '' },
        lat: { type: Number },
        lng: { type: Number },
        url: { type: String, default: '' },
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