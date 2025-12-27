import pkg from 'transbank-sdk';
const { WebpayPlus, Options, Environment } = pkg;
import Reserva from '../models/ficha.model.js';
import Paciente from '../models/paciente.model.js';
import User from '../models/user.model.js';
import Sucursal from '../models/sucursal.model.js';
import PaymentIntent from '../models/paymentIntent.model.js';
import SuscriptionPlan from '../models/suscriptionPlan.model.js';

const isTeamsPlan = (plan) => plan?.name === 'Teams';

// Regla Teams: basePrice incluye 1 admin; se cobra desde el 2do admin
const calculateTeamsPrice = (plan, cantidadAdmins = 0, cantidadProfessionals = 0, cantidadAssistants = 0) => {
  const admins = Number.isFinite(Number(cantidadAdmins)) ? Number(cantidadAdmins) : 0;
  const pros = Number.isFinite(Number(cantidadProfessionals)) ? Number(cantidadProfessionals) : 0;
  const asists = Number.isFinite(Number(cantidadAssistants)) ? Number(cantidadAssistants) : 0;
  const extraAdmins = Math.max(0, admins - 1);

  return (
    (plan?.basePrice || 0) +
    extraAdmins * (plan?.pricePerAdmin || 0) +
    pros * (plan?.pricePerProfessional || 0) +
    asists * (plan?.pricePerAssistant || 0)
  );
};

// Opciones de integración
const webpayOptions = new Options(
  process.env.WEBPAY_COMMERCE_CODE || '597055555532',
  process.env.WEBPAY_API_KEY || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
  Environment.Integration // Usa Environment.Production para producción
);

// Crear transacción
export const createTransaction = async (req, res) => {
  try {
    const { reservaId, amount, patientRut } = req.body;

    const reserva = await Reserva.findById(reservaId).populate('paciente');
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Si la cita está exenta o ya pagada, no iniciar un nuevo cobro
    if (reserva.paymentStatus === 'waived') {
      return res.status(400).json({ message: 'Esta cita está marcada como exenta (no requiere pago).' });
    }
    if (reserva.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Esta cita ya está pagada.' });
    }

    const shortReservaId = String(reservaId).slice(-10); // últimos 10 caracteres
    const shortTimestamp = String(Date.now()).slice(-8); // últimos 8 dígitos
    const buyOrder = `R${shortReservaId}${shortTimestamp}`.slice(0, 26);
    const sessionId = `${patientRut}-${Date.now()}`;
  // El frontend de React se ejecuta por defecto en el puerto 5173 (Vite).
  // Asegúrate de definir FRONTEND_URL en .env si usas otro puerto.
  const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/payment/confirm`;

    // Depuración: revisar valores antes de llamar al SDK
    console.log('Creating Webpay transaction with:', {
      buyOrder,
      sessionId,
      amount,
      returnUrl,
      environment: webpayOptions?.environment
    });

    // Ahora se pasan las opciones aquí
    const response = await new WebpayPlus.Transaction(webpayOptions).create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    );

    // Guardar estado pendiente (no registrar en paymentHistory hasta confirmación)
    await Reserva.findByIdAndUpdate(reservaId, {
      $set: {
        paymentStatus: 'pending',
        paymentToken: response.token,
        paymentAmount: amount,
        buyOrder: buyOrder,
        requiresPayment: true
      }
    });

    res.json({
      token: response.token,
      url: response.url
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Error al crear la transacción' });
  }
};

// Crear transacción PÚBLICA (sin crear paciente ni reserva aún)
export const createTransactionPublic = async (req, res) => {
  try {
    const { amount, patient, reserva } = req.body; // patient: {nombre,rut,telefono,email}, reserva: {profesional,siguienteCita,hora,modalidad,servicio}

    if (!amount || !patient?.rut || !reserva?.profesional || !reserva?.siguienteCita || !reserva?.hora) {
      return res.status(400).json({ message: 'Datos insuficientes para iniciar el pago' });
    }

    // Armar buyOrder/sessionId sin necesidad de reserva previa
    const shortRut = String(patient.rut).replace(/\D/g, '').slice(-10) || 'RUT';
    const shortTimestamp = String(Date.now()).slice(-8);
    const buyOrder = `P${shortRut}${shortTimestamp}`.slice(0, 26);
    const sessionId = `${patient.rut}-${Date.now()}`;

    const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/payment/confirm`;

    const tx = new WebpayPlus.Transaction(webpayOptions);
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);

    // Guardar intent pendiente con datos para crear entidades tras confirmación
    await PaymentIntent.create({
      token: response.token,
      buyOrder,
      sessionId,
      amount,
      status: 'pending',
      purpose: 'public_reserva',
      patient: {
        nombre: patient.nombre || '',
        rut: patient.rut,
        telefono: patient.telefono || '',
        email: patient.email || '',
      },
      reserva: {
        profesional: reserva.profesional,
        siguienteCita: reserva.siguienteCita,
        hora: reserva.hora,
        modalidad: reserva.modalidad || 'Presencial',
        servicio: reserva.servicio || 'Consulta',
      },
    });

    return res.json({ token: response.token, url: response.url });
  } catch (error) {
    console.error('Error creating public transaction:', error);
    res.status(500).json({ message: 'Error al crear la transacción pública' });
  }
};

// Crear transacción para COMPRA/RENOVACIÓN de suscripción (usuario logueado)
export const createSubscriptionTransaction = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { planId, billingCycle = 'monthly', cantidadAdmins, cantidadProfessionals, cantidadAssistants } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    if (!planId) {
      return res.status(400).json({ message: 'planId requerido' });
    }

    const plan = await SuscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Plan no encontrado o inactivo' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const durationMonths = cycle === 'yearly' ? 12 : 1;

    let scope = 'USER';
    let amountPerPeriod = plan.price;
    let teamConfig = null;
    let sucursalId = null;

    if (isTeamsPlan(plan)) {
      scope = 'SUCURSAL';
      if (!user.sucursal) {
        return res.status(400).json({ message: 'Para Teams debes tener una sucursal asociada.' });
      }

      const admins = Number.isFinite(Number(cantidadAdmins)) ? Math.max(1, Math.floor(Number(cantidadAdmins))) : 1;
      const pros = Number.isFinite(Number(cantidadProfessionals)) ? Math.max(0, Math.floor(Number(cantidadProfessionals))) : 0;
      const asists = Number.isFinite(Number(cantidadAssistants)) ? Math.max(0, Math.floor(Number(cantidadAssistants))) : 0;

      amountPerPeriod = calculateTeamsPrice(plan, admins, pros, asists);
      teamConfig = {
        cantidadAdmins: admins,
        cantidadProfessionals: pros,
        cantidadAssistants: asists,
        maxUsers: admins + pros + asists,
      };
      sucursalId = user.sucursal;
    }

    const amount = Number(amountPerPeriod || 0) * durationMonths;
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Monto inválido para iniciar el pago' });
    }

    const shortUserId = String(userId).slice(-10);
    const shortTimestamp = String(Date.now()).slice(-8);
    const buyOrder = `S${shortUserId}${shortTimestamp}`.slice(0, 26);
    const sessionId = `SUB-${userId}-${Date.now()}`;

    const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/payment/confirm`;

    const tx = new WebpayPlus.Transaction(webpayOptions);
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);

    await PaymentIntent.create({
      token: response.token,
      buyOrder,
      sessionId,
      amount,
      status: 'pending',
      purpose: 'subscription',
      subscription: {
        user: userId,
        sucursal: sucursalId,
        plan: plan._id,
        scope,
        billingCycle: cycle,
        durationMonths,
        teamConfig,
      },
    });

    return res.json({ token: response.token, url: response.url });
  } catch (error) {
    console.error('Error creating subscription transaction:', error);
    return res.status(500).json({ message: 'Error al crear la transacción de suscripción' });
  }
};

// Confirmar transacción
export const confirmTransaction = async (req, res) => {
  try {
    const { token_ws } = req.body;

    if (!token_ws) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    const isDev = (process.env.NODE_ENV || 'development') !== 'production';

    // Intentar commit. Si falla (token inválido, ya confirmado, error red), intentar modo idempotente.
    let response;
    try {
      response = await new WebpayPlus.Transaction(webpayOptions).commit(token_ws);
    } catch (commitError) {
      console.error('Webpay commit error:', commitError);

      // 1) Si ya existe una reserva completada con este token, devolver éxito
      const reserva = await Reserva.findOne({ paymentToken: token_ws }).populate('paciente');
      if (reserva && reserva.paymentStatus === 'completed') {
        return res.json({
          success: true,
          message: 'Pago ya confirmado',
          transaction: reserva.paymentData,
          reserva,
        });
      }

      // 2) Si es intent de suscripción ya completado, devolver éxito
      const intent = await PaymentIntent.findOne({ token: token_ws }).populate('subscription.plan');
      if (intent && intent.status === 'completed' && (intent.purpose === 'subscription' || intent.subscription?.plan)) {
        const scope = intent.subscription?.scope;
        const plan = intent.subscription?.plan;

        if (scope === 'USER' && intent.subscription?.user) {
          const u = await User.findById(intent.subscription.user);
          return res.json({
            success: true,
            message: 'Pago ya confirmado',
            transaction: { response_code: 0 },
            scope: 'USER',
            subscription: {
              plan: plan?.name || null,
              planId: plan?._id || null,
              startDate: u?.suscriptionStartDate || null,
              endDate: u?.suscriptionEndDate || null,
            },
          });
        }

        if (scope === 'SUCURSAL' && intent.subscription?.sucursal) {
          const s = await Sucursal.findById(intent.subscription.sucursal);
          return res.json({
            success: true,
            message: 'Pago ya confirmado',
            transaction: { response_code: 0 },
            scope: 'SUCURSAL',
            subscription: {
              plan: plan?.name || null,
              planId: plan?._id || null,
              startDate: s?.suscriptionStartDate || null,
              endDate: s?.suscriptionEndDate || null,
              teamConfig: s?.teamConfig || null,
            },
          });
        }
      }

      // 3) No se pudo confirmar y no hay estado persistido
      return res.status(400).json({
        success: false,
        message: 'No fue posible confirmar el pago. Intenta nuevamente.',
        ...(isDev
          ? { debug: { name: commitError?.name, message: commitError?.message } }
          : {}),
      });
    }

    const approved = Number(response?.response_code) === 0;

    let reserva = await Reserva.findOne({ paymentToken: token_ws }).populate('paciente');

    if (approved) {
      // Flujo 1: Reserva ya existía (pago ligado a reserva creada previamente)
      if (reserva) {
        const updatedReserva = await Reserva.findByIdAndUpdate(reserva._id, {
        $set: {
          paymentStatus: 'completed',
          paymentData: {
            authorizationCode: response.authorization_code,
            responseCode: response.response_code,
            transactionDate: response.transaction_date,
            accountingDate: response.accounting_date,
            paymentTypeCode: response.payment_type_code,
            amount: response.amount,
            cardNumber: response.card_detail?.card_number
          }
        },
        $push: {
          paymentHistory: {
            status: 'completed',
            amount: response.amount || reserva.paymentAmount || 0,
            transactionId: response.authorization_code || response.transaction_id || token_ws,
            notes: 'Pago exitoso'
          }
        }
      }, { new: true });

        return res.json({
          success: true,
          message: 'Pago procesado exitosamente',
          transaction: response,
          reserva: updatedReserva
        });
      }

      // Flujo 1.5: Suscripción (intent de suscripción)
      const subscriptionIntent = await PaymentIntent.findOne({
        token: token_ws,
        $or: [
          { purpose: 'subscription' },
          { 'subscription.plan': { $exists: true } },
        ],
      }).populate('subscription.plan');
      if (subscriptionIntent?.subscription?.plan) {
        const plan = subscriptionIntent.subscription.plan;
        const durationMonths = Number(subscriptionIntent.subscription.durationMonths) || 1;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        if (subscriptionIntent.subscription.scope === 'USER') {
          const u = await User.findById(subscriptionIntent.subscription.user);
          if (!u) {
            return res.status(404).json({ message: 'Usuario no encontrado para activar suscripción' });
          }

          u.suscriptionPlan = plan._id;
          u.suscriptionStartDate = startDate;
          u.suscriptionEndDate = endDate;
          await u.save();

          try {
            subscriptionIntent.status = 'completed';
            await subscriptionIntent.save();
          } catch (e) {
            console.warn('Subscription intent status update failed (USER):', e);
          }

          return res.json({
            success: true,
            message: 'Suscripción activada exitosamente',
            transaction: response,
            scope: 'USER',
            subscription: {
              plan: plan.name,
              planId: plan._id,
              startDate,
              endDate,
            },
          });
        }

        if (subscriptionIntent.subscription.scope === 'SUCURSAL') {
          const sucursalId = subscriptionIntent.subscription.sucursal;
          if (!sucursalId) {
            return res.status(400).json({ message: 'Sucursal no definida para activar Teams' });
          }
          const s = await Sucursal.findById(sucursalId);
          if (!s) {
            return res.status(404).json({ message: 'Sucursal no encontrada para activar Teams' });
          }

          s.suscriptionPlan = plan._id;
          s.suscriptionStartDate = startDate;
          s.suscriptionEndDate = endDate;
          if (subscriptionIntent.subscription.teamConfig) {
            s.teamConfig = subscriptionIntent.subscription.teamConfig;
          }
          await s.save();

          try {
            subscriptionIntent.status = 'completed';
            await subscriptionIntent.save();
          } catch (e) {
            console.warn('Subscription intent status update failed (SUCURSAL):', e);
          }

          return res.json({
            success: true,
            message: 'Suscripción Teams activada exitosamente',
            transaction: response,
            scope: 'SUCURSAL',
            subscription: {
              plan: plan.name,
              planId: plan._id,
              startDate,
              endDate,
              teamConfig: subscriptionIntent.subscription.teamConfig || null,
            },
          });
        }
      }

      // Flujo 2: Intento público (no existía reserva): crear paciente y reserva ahora
      const intent = await PaymentIntent.findOne({ token: token_ws });
      if (!intent) {
        return res.status(404).json({ message: 'Intento de pago no encontrado' });
      }

      // Evitar caer en el flujo público si este token corresponde a suscripción
      if (intent?.purpose === 'subscription' || intent?.subscription?.plan) {
        return res.status(400).json({
          success: false,
          message: 'Pago aprobado, pero el intento de suscripción no pudo activarse por datos incompletos.',
          transaction: response,
        });
      }

      // Asegurar paciente (crear si no existe)
      const normalizePhone = (telefono) => {
        try {
          if (!telefono) return '';
          let tel = String(telefono).replace(/\D/g, '');
          if (tel.length === 11 && tel.startsWith('569')) return tel;
          if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
          if (tel.length === 8) return '569' + tel;
          if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
          return '';
        } catch { return ''; }
      };

      if (!intent?.patient?.rut) {
        return res.status(400).json({ message: 'Intento de pago público sin datos de paciente' });
      }

      let pacienteDoc = await Paciente.findOne({ rut: intent.patient.rut });
      if (!pacienteDoc) {
        const profesional = await User.findById(intent.reserva.profesional);
        if (!profesional) {
          return res.status(400).json({ message: 'Profesional inválido en intento de pago' });
        }
        pacienteDoc = await new Paciente({
          nombre: intent.patient.nombre || '',
          rut: intent.patient.rut,
          telefono: normalizePhone(intent.patient.telefono),
          email: intent.patient.email || '',
          estado: 'Pendiente',
          profesional: profesional._id,
          diaPrimeraCita: new Date(),
        }).save();

        // Asociar paciente a sucursal o profesional
        if (profesional.sucursal) {
          await Sucursal.findByIdAndUpdate(
            profesional.sucursal,
            { $addToSet: { pacientes: pacienteDoc._id } }
          );
        } else {
          await User.findByIdAndUpdate(
            profesional._id,
            { $addToSet: { pacientes: pacienteDoc._id } }
          );
        }
      }

      // Normalizar posibles cadenas de fecha (evitar desfase UTC)
      const normalizeDateField = (val) => {
        if (!val) return val;
        if (typeof val === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, d] = val.split('-').map(Number);
            return new Date(y, m - 1, d);
          }
          if (val.endsWith('Z') && val.includes('T00:00:00')) {
            const [y, m, d] = val.slice(0, 10).split('-').map(Number);
            return new Date(y, m - 1, d);
          }
        }
        return new Date(val);
      };

      // Crear reserva ahora con datos del intent
      const nuevaReserva = new Reserva({
        paciente: pacienteDoc._id,
        diaPrimeraCita: new Date(),
        siguienteCita: normalizeDateField(intent.reserva.siguienteCita),
        hora: intent.reserva.hora,
        profesional: intent.reserva.profesional,
        modalidad: intent.reserva.modalidad || 'Presencial',
        servicio: intent.reserva.servicio || 'Consulta',
        paymentStatus: 'completed',
        paymentToken: token_ws,
        paymentAmount: response.amount,
        paymentData: {
          authorizationCode: response.authorization_code,
          responseCode: response.response_code,
          transactionDate: response.transaction_date,
          accountingDate: response.accounting_date,
          paymentTypeCode: response.payment_type_code,
          amount: response.amount,
          cardNumber: response.card_detail?.card_number,
        },
      });
      // Sucursal si corresponde
      const sucursal = await Sucursal.findOne({ profesionales: intent.reserva.profesional });
      if (sucursal) nuevaReserva.sucursal = sucursal._id;
      await nuevaReserva.save();

      // Marcar intent como completado
      intent.status = 'completed';
      intent.createdReserva = nuevaReserva._id;
      await intent.save();

      return res.json({
        success: true,
        message: 'Pago procesado exitosamente',
        transaction: response,
        reserva: nuevaReserva,
      });
    } else {
      // Si había una reserva creada vinculada, marcarla como fallida
      const reservaExistente = await Reserva.findOne({ paymentToken: token_ws });
      if (reservaExistente) {
        const updatedReserva = await Reserva.findByIdAndUpdate(reservaExistente._id, {
          $set: { paymentStatus: 'failed', paymentData: response }
        }, { new: true });
        return res.json({ success: false, message: 'Pago rechazado', transaction: response, reserva: updatedReserva });
      }

      // Caso intento público: marcar intent como fallido y no crear entidades
      const intent = await PaymentIntent.findOne({ token: token_ws });
      if (intent) {
        intent.status = 'failed';
        await intent.save();
      }
      return res.json({ success: false, message: 'Pago rechazado', transaction: response });
    }

  } catch (error) {
    console.error('Error confirming transaction:', error);
    res.status(500).json({ message: 'Error al confirmar la transacción' });
  }
};

// Obtener estado de pago (sin cambios)
export const getPaymentStatus = async (req, res) => {
  try {
    const { reservaId } = req.params;
    
    const reserva = await Reserva.findById(reservaId);
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json({
      paymentStatus: reserva.paymentStatus || 'not_initiated',
      paymentData: reserva.paymentData,
      requiresPayment: reserva.requiresPayment
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ message: 'Error al obtener estado del pago' });
  }
};