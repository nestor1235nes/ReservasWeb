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
        default: "Estimado (nombre paciente), le recordarmos que mañana (fecha) a las (hora) tiene una hora agendada. Por favor de no poder asistir contáctese con nosotros o bien reagende su cita en nuestro sitio web www.siotioweb.cl."
    },
});

const Sucursal = mongoose.model("Sucursal", SucursalSchema);

export default Sucursal;