import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema({
    fromTime: {
        type: String,
        required: true,
    },
    toTime: {
        type: String,
        required: true,
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    celular: {
        type: String,
    },
    fotoPerfil: {
        type: String,
    },
    especialidad: {
        type: String,
    },
    descripcion: {
        type: String,
    },
    timetable: {
        type: [timetableSchema],
        default: []
    }
});

export default mongoose.model('User', userSchema);
