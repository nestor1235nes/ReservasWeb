import mongoose from 'mongoose';

const PatientOtpSchema = new mongoose.Schema(
  {
    rut: { type: String, required: true, index: true, trim: true },
    phone: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// TTL: Mongo will delete documents after expiresAt
PatientOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PatientOtpSchema.index({ rut: 1, createdAt: -1 });

export default mongoose.model('PatientOtp', PatientOtpSchema);
