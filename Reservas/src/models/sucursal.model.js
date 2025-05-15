import mongoose from "mongoose";

const SucursalSchema = new mongoose.Schema({
    ///////////////Datos de la sucursal/////////////
    nombre: {
        type: String,
        required: true,
    },
    administrador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    direccion: {
        type: String,
    },
    celular: {
        type: String,
    }, 
    telefono: {
        type: String,
    },
    email: {
        type: String,
    },
    empleados: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    descripcion: {
        type: String,
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