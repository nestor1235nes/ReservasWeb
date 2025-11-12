import mongoose from 'mongoose';

const TeleSessionSchema = new mongoose.Schema(
  {
    shareId: { type: String, index: true, unique: true },
    roomName: { type: String, required: true },
    roomUrl: { type: String, required: true },
    professional: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    passwordHash: { type: String, required: true },
    durationMinutes: { type: Number, default: 30 },
    expiresAt: { type: Date, required: true, index: true },
    maxPatientJoins: { type: Number, default: 1 },
    patientJoins: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index (automatic deletion after expiresAt) - only works if background TTL monitor runs
TeleSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TeleSession = mongoose.model('TeleSession', TeleSessionSchema);
export default TeleSession;
