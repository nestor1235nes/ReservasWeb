import mongoose from "mongoose";

const BoxOcupacionSchema = new mongoose.Schema({
  box: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Box",
    required: true,
    index: true,
  },
  sucursal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sucursal",
    required: true,
    index: true,
  },
  // Quién solicita/ocupa el box (profesional o asistente)
  solicitadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
    index: true,
  },
  horaInicio: {
    type: String,
    required: true, // formato "HH:mm"
  },
  horaFin: {
    type: String,
    required: true, // formato "HH:mm"
  },
  // Tipo de uso del box
  tipo: {
    type: String,
    enum: ["atencion", "reunion", "mantenimiento", "capacitacion", "otro"],
    default: "atencion",
  },
  // Estado del bloque
  estado: {
    type: String,
    enum: ["reservado", "en_curso", "completado", "cancelado"],
    default: "reservado",
  },
  // Paciente asociado (opcional, solo en atenciones)
  paciente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paciente",
    default: null,
  },
  motivo: {
    type: String,
    trim: true,
    default: "",
  },
  notas: {
    type: String,
    trim: true,
    default: "",
  },
}, { timestamps: true });

// Índice compuesto para buscar conflictos eficientemente
BoxOcupacionSchema.index({ box: 1, fecha: 1, estado: 1 });

const BoxOcupacion = mongoose.model("BoxOcupacion", BoxOcupacionSchema);

export default BoxOcupacion;
