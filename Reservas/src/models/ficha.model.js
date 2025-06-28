import mongoose from "mongoose";

const ReservasSchema = new mongoose.Schema({
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: true,
    },
    diaPrimeraCita: {
        type: Date,
    },
    siguienteCita: {
        type: Date,
    },
    hora: {
        type: String,
    },
    mensajePaciente: {
        type: String,
    },
    profesional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    diagnostico: {
        type: String,
    },
    anamnesis: {
        type: String,
    },
    imagenes: {
        type: [String],
        default: [],
    },
    modalidad: {
        type: String,
    },
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
    },
    eventId: {
        type: String,
    },
    historial: {
        type: [[{
            fecha: {
                type: Date,
            },
            notas: {
                type: String,
            },
            sucursal:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Sucursal',
            },
            profesional: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        }]],
        default: [],
    },
});

const Reserva = mongoose.model("Reserva", ReservasSchema);
export default Reserva;