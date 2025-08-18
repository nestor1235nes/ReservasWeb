import mongoose from "mongoose";

const ReservasSchema = new mongoose.Schema({
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: true,
    },
    diaPrimeraCita: {
        type: Date,
    },
    siguienteCita: {
        type: Date,
    },
    hora: {
        type: String,
    },
    mensajePaciente: {
        type: String,
    },
    profesional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    diagnostico: {
        type: String,
    },
    anamnesis: {
        type: String,
    },
    imagenes: {
        type: [String],
        default: [],
    },
    modalidad: {
        type: String,
    },
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
    },
    eventId: {
        type: String,
    },
    historial: {
        type: [[{
            fecha: {
                type: Date,
            },
            notas: {
                type: String,
            },
            sucursal:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Sucursal',
            },
            profesional: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        }]],
        default: [],
    },

    // Campos de pago con Webpay
    paymentStatus: {
        type: String,
        enum: ['not_initiated', 'pending', 'completed', 'failed', 'refunded'],
        default: 'not_initiated'
    },
    paymentToken: {
        type: String,
        index: true // Para búsquedas rápidas por token
    },
    paymentAmount: {
        type: Number,
        min: 0
    },
    buyOrder: {
        type: String,
        unique: true,
        sparse: true // Permite valores null/undefined sin conflicto de unicidad
    },
    paymentData: {
        authorizationCode: {
            type: String
        },
        responseCode: {
            type: Number
        },
        transactionDate: {
            type: String
        },
        accountingDate: {
            type: String
        },
        paymentTypeCode: {
            type: String
        },
        amount: {
            type: Number
        },
        cardNumber: {
            type: String
        },
        installmentsNumber: {
            type: Number
        }
    },
    paymentHistory: [{
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded']
        },
        amount: {
            type: Number
        },
        date: {
            type: Date,
            default: Date.now
        },
        transactionId: {
            type: String
        },
        notes: {
            type: String
        }
    }],
    
    // Campos adicionales útiles para el manejo de pagos
    requiresPayment: {
        type: Boolean,
        default: false
    },
    paymentDueDate: {
        type: Date
    },
    consultationFee: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Índices para optimizar consultas de pago
ReservasSchema.index({ paymentStatus: 1 });
ReservasSchema.index({ paymentToken: 1 });
ReservasSchema.index({ buyOrder: 1 });
ReservasSchema.index({ 'paymentData.authorizationCode': 1 });

// Middleware pre-save para validaciones de pago
ReservasSchema.pre('save', function(next) {
    // Si se establece un monto de pago, marcar que requiere pago
    if (this.paymentAmount && this.paymentAmount > 0) {
        this.requiresPayment = true;
    }
    
    // Si no hay fecha de vencimiento y requiere pago, establecer una por defecto
    if (this.requiresPayment && !this.paymentDueDate && this.siguienteCita) {
        this.paymentDueDate = new Date(this.siguienteCita);
    }
    
    next();
});

// Métodos del esquema
ReservasSchema.methods.isPaymentOverdue = function() {
    if (!this.requiresPayment || this.paymentStatus === 'completed') {
        return false;
    }
    return this.paymentDueDate && new Date() > this.paymentDueDate;
};

ReservasSchema.methods.getPaymentStatusText = function() {
    const statusMap = {
        'not_initiated': 'Sin iniciar',
        'pending': 'Pendiente',
        'completed': 'Pagado',
        'failed': 'Fallido',
        'refunded': 'Reembolsado'
    };
    return statusMap[this.paymentStatus] || 'Desconocido';
};

ReservasSchema.methods.addPaymentHistoryEntry = function(status, amount, transactionId, notes) {
    this.paymentHistory.push({
        status,
        amount,
        transactionId,
        notes,
        date: new Date()
    });
};

// Método estático para buscar por token de pago
ReservasSchema.statics.findByPaymentToken = function(token) {
    return this.findOne({ paymentToken: token }).populate('paciente').populate('profesional');
};

// Método estático para obtener reservas con pagos pendientes
ReservasSchema.statics.findPendingPayments = function(profesionalId) {
    return this.find({
        profesional: profesionalId,
        requiresPayment: true,
        paymentStatus: { $in: ['not_initiated', 'pending'] }
    }).populate('paciente');
};

const Reserva = mongoose.model("Reserva", ReservasSchema);
export default Reserva;