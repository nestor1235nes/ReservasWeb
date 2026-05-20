import mongoose from "mongoose";

const BoxSchema = new mongoose.Schema({
  sucursal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sucursal",
    required: true,
    index: true,
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  descripcion: {
    type: String,
    trim: true,
    default: "",
  },
  // Número o código identificador del box (ej: "Box 1", "Sala A", "01")
  codigo: {
    type: String,
    trim: true,
    default: "",
  },
  // Capacidad de pacientes simultáneos
  capacidad: {
    type: Number,
    default: 1,
    min: 1,
  },
  // Piso o ubicación dentro del establecimiento
  piso: {
    type: String,
    trim: true,
    default: "",
  },
  // Equipamiento disponible en el box
  equipamiento: {
    type: [String],
    default: [],
  },
  // Profesionales asignados preferentemente a este box
  profesionalesAsignados: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    default: [],
  },
  activo: {
    type: Boolean,
    default: true,
  },
  // Color para identificación visual en el calendario
  color: {
    type: String,
    default: "#2596be",
  },
  notas: {
    type: String,
    trim: true,
    default: "",
  },
}, { timestamps: true });

const Box = mongoose.model("Box", BoxSchema);

export default Box;
