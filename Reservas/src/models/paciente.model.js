import mongoose from "mongoose";

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
    email: {
        type: String,
    },
    estado: {
        type: Boolean,
        default: true,
    },
});

const Paciente = mongoose.model("Paciente", PacienteSchema);
export default Paciente;