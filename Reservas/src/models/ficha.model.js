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
        type: String,
    },
    diagnostico: {
        type: String,
    },
    anamnesis: {
        type: String,
    },
    imagenes: {
        type: [String],
    },
    historial: {
        type: [[{
            fecha: {
                type: Date,
            },
            notas: {
                type: String,
            },
        }]],
        default: [],
    },
});

const Reserva = mongoose.model("Reserva", ReservasSchema);
export default Reserva;