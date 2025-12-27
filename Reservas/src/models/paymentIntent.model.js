import mongoose from 'mongoose';

const PaymentIntentSchema = new mongoose.Schema(
  {
    token: { type: String, index: true },
    buyOrder: { type: String },
    sessionId: { type: String },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    // Tipo de flujo que originó el pago
    purpose: {
      type: String,
      enum: ['public_reserva', 'subscription'],
      default: 'public_reserva',
      index: true,
    },
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

    // Detalles de suscripción a crear/activar al completar el pago
    subscription: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal' },
      plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SuscriptionPlan' },
      scope: { type: String, enum: ['USER', 'SUCURSAL'] },
      billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
      durationMonths: { type: Number },
      teamConfig: {
        cantidadAdmins: Number,
        cantidadProfessionals: Number,
        cantidadAssistants: Number,
        maxUsers: Number,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentIntent', PaymentIntentSchema);
