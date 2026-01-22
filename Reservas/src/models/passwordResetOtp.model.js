import mongoose from 'mongoose';

const PasswordResetOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true, trim: true, lowercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
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
PasswordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
PasswordResetOtpSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model('PasswordResetOtp', PasswordResetOtpSchema);
