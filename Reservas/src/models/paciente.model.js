import mongoose from "mongoose";

const comportamientoSchema = new mongoose.Schema({
    asistencia: {
        type: String,
        enum: ["Asistió y confirmó", "Asistió y no confirmó", "Confirmó y no asistió", "No Asistió y no avisó", "No Asistió y reagendó"],
        default: "No Asistió y no avisó",
    },
    fecha: {
        type: Date,
        default: Date.now,
    },
    cantidadCitas: {
        type: Number,
        default: 0,
    },
    asistenciasTotales: {
        type: Number,
        default: 0,
    },
    inasistenciasTotales: {
        type: Number,
        default: 0,
    },
    reagendamientosTotales: {
        type: Number,
        default: 0,
    },
    motivoInasistencia: {
        type: String,
        enum: ["Me he sentido mejor", "Problemas personales", "Trabajo", "Horario", "Otro"],
        default: "Otro",
    },

}, { _id: false });

const PacienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
    },
    rut: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    telefono: {
        type: String,
        required: true,
        trim: true,
    },
    direccion: {
        type: String,
    },
    edad: {
        type: String,
    },
    email: {
        type: String,
    },
    estado: {
        type: String,
        enum: ["Confirmada", "Pendiente", "Cancelada", "Modificada"],
        default: "Pendiente",
    },
    eventId: {
        type: String,
    },

    // Datos de comportamiento
    comportamiento: {
        type: [comportamientoSchema],
        default: [],
    },
});

const Paciente = mongoose.model("Paciente", PacienteSchema);
export default Paciente;