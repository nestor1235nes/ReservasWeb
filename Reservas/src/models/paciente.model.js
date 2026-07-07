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

const alergiaSchema = new mongoose.Schema({
    nombre: { type: String, trim: true, default: '' },
    severidad: { type: String, enum: ['alta', 'media', 'baja'], default: 'baja' },
}, { _id: false });

const medicamentoActivoSchema = new mongoose.Schema({
    nombre: { type: String, trim: true, default: '' },
    dosis: { type: String, trim: true, default: '' },
    frecuencia: { type: String, trim: true, default: '' },
}, { _id: false });

const contactoEmergenciaSchema = new mongoose.Schema({
    nombre: { type: String, trim: true, default: '' },
    relacion: { type: String, trim: true, default: '' },
    telefono: { type: String, trim: true, default: '' },
}, { _id: false });

const signosVitalesSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    presionArterial: { type: String, trim: true, default: '' },
    frecuenciaCardiaca: { type: String, trim: true, default: '' },
    pesoKg: { type: String, trim: true, default: '' },
    tallaCm: { type: String, trim: true, default: '' },
    temperaturaC: { type: String, trim: true, default: '' },
    saturacionO2: { type: String, trim: true, default: '' },
    glucosaMgDl: { type: String, trim: true, default: '' },
}, { _id: false });

const documentoSchema = new mongoose.Schema({
    nombre: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const notaClinicaSchema = new mongoose.Schema({
    fecha: { type: Date, default: Date.now },
    autor: { type: String, trim: true, default: '' },
    titulo: { type: String, trim: true, default: '' },
    contenido: { type: String, trim: true, default: '' },
}, { _id: false });

const PacienteSchema = new mongoose.Schema({
    // Nombre siempre normalizado a MAYÚSCULAS (setter aplica en save y en updates).
    nombre: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    rut: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    telefono: {
        type: String,
        trim: true,
    },
    direccion: {
        type: String,
    },
    edad: {
        type: String,
    },
    fechaNacimiento: {
        type: Date,
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
    // Profesional "principal" histórico (legacy). No usar para lógica nueva.
    profesional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    // NUEVO: lista de profesionales que han atendido al paciente
    profesionales: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    diaPrimeraCita: {
        type: Date,
        default: Date.now,
    },

    // --- Datos personales ampliados (para portal del paciente) ---
    codigoPaciente: {
        type: String,
        trim: true,
    },
    fotoPerfil: {
        type: String,
        trim: true,
    },
    sexo: {
        type: String,
        enum: ['Masculino', 'Femenino', 'Otro', 'No especifica'],
        default: 'No especifica',
    },
    tipoSangre: {
        type: String,
        trim: true,
        default: '',
    },
    prevision: {
        type: String,
        trim: true,
        default: '',
    },
    alergias: {
        type: [alergiaSchema],
        default: [],
    },
    medicamentosActivos: {
        type: [medicamentoActivoSchema],
        default: [],
    },
    contactoEmergencia: {
        type: contactoEmergenciaSchema,
        default: () => ({}),
    },
    signosVitales: {
        type: [signosVitalesSchema],
        default: [],
    },
    documentos: {
        type: [documentoSchema],
        default: [],
    },
    notasClinicas: {
        type: [notaClinicaSchema],
        default: [],
    },

    // Datos de comportamiento
    comportamiento: {
        type: [comportamientoSchema],
        default: [],
    },
});

const Paciente = mongoose.model("Paciente", PacienteSchema);
export default Paciente;