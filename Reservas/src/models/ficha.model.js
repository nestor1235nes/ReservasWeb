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
    servicio: {
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

    // --- Historial clínico por casos (diagnósticos) ---
    // Cada caso representa una "consulta"/"lesión" distinta y agrupa sus sesiones.
    clinicalCases: {
        type: [
            {
                diagnostico: { type: String, default: '' },
                anamnesis: { type: String, default: '' },
                imagenes: { type: [String], default: [] },
                motivoConsulta: { type: String, default: '' },
                antecedentesPersonales: { type: String, default: '' },
                antecedentesFamiliares: { type: String, default: '' },
                alergias: { type: String, default: '' },
                medicamentosActuales: { type: String, default: '' },
                examenFisico: { type: String, default: '' },
                planTratamiento: { type: String, default: '' },
                indicaciones: { type: String, default: '' },
                signosVitales: {
                    presionArterial: { type: String, default: '' },
                    frecuenciaCardiaca: { type: String, default: '' },
                    pesoKg: { type: String, default: '' },
                    tallaCm: { type: String, default: '' },
                    temperaturaC: { type: String, default: '' },
                    saturacionO2: { type: String, default: '' },
                },
                createdAt: { type: Date, default: Date.now },
                closedAt: { type: Date },
                sesiones: {
                    type: [
                        {
                            fecha: { type: Date },
                            notas: { type: String },
                            sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal' },
                            profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                        }
                    ],
                    default: []
                }
            }
        ],
        default: []
    },
    activeClinicalCaseId: {
        type: mongoose.Schema.Types.ObjectId
    },

    // Campos de pago con Webpay
    paymentStatus: {
        type: String,
        enum: ['not_initiated', 'pending', 'completed', 'failed', 'refunded', 'waived'],
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
    ,
    // --- Confirmación de cita ---
    confirmStatus: {
        type: String,
        enum: ['pending','confirmed','cancelled','reschedule_requested'],
        default: 'pending',
        index: true
    },
    confirmTokenHash: {
        type: String,
        index: true
    },
    confirmTokenExpires: {
        type: Date,
        index: true
    },
    confirmedAt: {
        type: Date
    },
    confirmationLog: [
        {
            action: { type: String }, // generated, confirmed, cancelled, link_resent, reschedule_requested
            at: { type: Date, default: Date.now },
            meta: { type: Object }
        }
    ],
    rescheduleRequest: {
        requestedDate: { type: Date },
        requestedTime: { type: String },
        reason: { type: String },
        status: { type: String, enum: ['open','approved','rejected'], default: 'open' }
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// Índice compuesto para evitar reservas duplicadas exactas por profesional/hora/día
ReservasSchema.index({ profesional: 1, siguienteCita: 1, hora: 1 }, { unique: false });


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
        'refunded': 'Reembolsado',
        'waived': 'Exenta'
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