import mongoose from "mongoose";

const suscriptionPlanSchema = new mongoose.Schema({

    // Para individuales y por defecto

    name: {
        type: String,
        enum: ["Basic", "Standard", "Teams"],
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        enum: [24900, 34900],
    },
    durationInMonths: {
        type: Number,
        required: true,
    },
    features: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },

    // Para equipos

    maxUsers: {
        type: Number,
        default: 1,
    },
    cantidadAdmins: {
        type: Number,
        default: 1,
    },
    cantidadProfessionals: {
        type: Number,
        default: 0,
    },
    cantidadAssistants: {
        type: Number,
        default: 0,
    },
    basePrice:{
        type: Number,
        default: 39900,
    },
    pricePerAdmin:{
        type: Number,
        default: 14900,
    },
    pricePerProfessional:{
        type: Number,
        default: 9900,
    },
    pricePerAssistant:{
        type: Number,
        default: 4900,
    },

}, { timestamps: true });


export default mongoose.model("SuscriptionPlan", suscriptionPlanSchema);