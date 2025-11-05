import mongoose from 'mongoose';

const PaymentIntentSchema = new mongoose.Schema(
  {
    token: { type: String, index: true },
    buyOrder: { type: String },
    sessionId: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    // Datos mínimos del paciente (aún no creado)
    patient: {
      nombre: String,
      rut: String,
      telefono: String,
      email: String,
    },
    // Detalles de la reserva a crear al completar el pago
    reserva: {
      profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      siguienteCita: Date,
      hora: String,
      modalidad: String,
      servicio: String,
    },
  createdReserva: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentIntent', PaymentIntentSchema);
