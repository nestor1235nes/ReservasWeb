import mongoose from 'mongoose';

const WhatsAppPlatformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'default', index: true },
    idInstance: { type: String, default: '' },
    apiTokenInstance: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('WhatsAppPlatformConfig', WhatsAppPlatformConfigSchema);
