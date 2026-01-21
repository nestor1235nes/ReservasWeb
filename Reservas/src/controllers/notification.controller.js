import Notification from '../models/notification.model.js';

// ========== Funciones para notificaciones in-app ==========

// Obtener notificaciones del usuario autenticado
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;
    
    const notifications = await Notification.getForUser(userId, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      unreadOnly: unreadOnly === 'true'
    });
    
    const unreadCount = await Notification.getUnreadCount(userId);
    
    return res.json({ 
      notifications, 
      unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return res.status(500).json({ message: 'Error obteniendo notificaciones' });
  }
};

// Obtener conteo de no leídas
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);
    return res.json({ count });
  } catch (error) {
    console.error('Error obteniendo conteo:', error);
    return res.status(500).json({ message: 'Error obteniendo conteo de notificaciones' });
  }
};

// Marcar notificaciones como leídas
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body; // Array de IDs o vacío para marcar todas
    
    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await Notification.markAsRead(userId, notificationIds);
    } else {
      await Notification.markAllAsRead(userId);
    }
    
    const unreadCount = await Notification.getUnreadCount(userId);
    return res.json({ message: 'Notificaciones marcadas como leídas', unreadCount });
  } catch (error) {
    console.error('Error marcando notificaciones:', error);
    return res.status(500).json({ message: 'Error marcando notificaciones como leídas' });
  }
};

// Eliminar todas las notificaciones de un usuario
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.deleteMany({ user: userId });
    return res.json({ message: 'Notificaciones eliminadas' });
  } catch (error) {
    console.error('Error eliminando notificaciones:', error);
    return res.status(500).json({ message: 'Error eliminando notificaciones' });
  }
};

// ========== Funciones helper para crear notificaciones desde otros controladores ==========

// Crear notificación de nueva cita
export const createNewAppointmentNotification = async (profesionalId, paciente, reserva) => {
  try {
    const formatFecha = (fecha) => {
      if (!fecha) return '';
      const d = new Date(fecha);
      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    };
    
    const notification = await Notification.createNotification({
      user: profesionalId,
      type: 'new_appointment',
      title: 'Nueva cita agendada',
      message: `${paciente?.nombre || 'Un paciente'} ha agendado una cita para el ${formatFecha(reserva?.siguienteCita)} a las ${reserva?.hora || ''}`,
      metadata: {
        reservaId: reserva?._id,
        pacienteId: paciente?._id,
        pacienteNombre: paciente?.nombre,
        fecha: reserva?.siguienteCita,
        hora: reserva?.hora
      }
    });
    return notification;
  } catch (error) {
    console.error('Error creando notificación de nueva cita:', error);
    return null;
  }
};

// Crear notificación de cita cancelada
export const createCancelledAppointmentNotification = async (profesionalId, paciente, reserva) => {
  try {
    const formatFecha = (fecha) => {
      if (!fecha) return '';
      const d = new Date(fecha);
      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    };
    
    const notification = await Notification.createNotification({
      user: profesionalId,
      type: 'cancelled_appointment',
      title: 'Cita cancelada',
      message: `${paciente?.nombre || 'Un paciente'} ha cancelado su cita del ${formatFecha(reserva?.siguienteCita)} a las ${reserva?.hora || ''}`,
      metadata: {
        reservaId: reserva?._id,
        pacienteId: paciente?._id,
        pacienteNombre: paciente?.nombre,
        fecha: reserva?.siguienteCita,
        hora: reserva?.hora
      }
    });
    return notification;
  } catch (error) {
    console.error('Error creando notificación de cancelación:', error);
    return null;
  }
};

// Crear notificación de suscripción próxima a vencer
export const createSubscriptionExpiringNotification = async (userId, daysRemaining) => {
  try {
    const notification = await Notification.createNotification({
      user: userId,
      type: 'subscription_expiring',
      title: 'Suscripción próxima a vencer',
      message: `Tu suscripción vence en ${daysRemaining} días. Renueva para seguir disfrutando de todos los beneficios.`,
      metadata: {}
    });
    return notification;
  } catch (error) {
    console.error('Error creando notificación de suscripción:', error);
    return null;
  }
};

// Crear notificación de cita confirmada por paciente
export const createConfirmedAppointmentNotification = async (profesionalId, paciente, reserva) => {
  try {
    const formatFecha = (fecha) => {
      if (!fecha) return '';
      const d = new Date(fecha);
      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    };
    
    const notification = await Notification.createNotification({
      user: profesionalId,
      type: 'confirmed_appointment',
      title: 'Cita confirmada',
      message: `${paciente?.nombre || 'Un paciente'} ha confirmado su asistencia para el ${formatFecha(reserva?.siguienteCita)} a las ${reserva?.hora || ''}`,
      metadata: {
        reservaId: reserva?._id,
        pacienteId: paciente?._id,
        pacienteNombre: paciente?.nombre,
        fecha: reserva?.siguienteCita,
        hora: reserva?.hora
      }
    });
    return notification;
  } catch (error) {
    console.error('Error creando notificación de confirmación:', error);
    return null;
  }
};

// Función para verificar suscripciones próximas a vencer y crear notificaciones
// Puede ser llamada por un cron job o scheduler
export const checkExpiringSubscriptions = async () => {
  try {
    const User = (await import('../models/user.model.js')).default;
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Buscar usuarios con suscripción que expire en exactamente 3 días
    // (para evitar notificaciones duplicadas, solo buscamos la ventana de un día)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    const usersExpiring = await User.find({
      suscriptionEndDate: {
        $gte: twoDaysFromNow,
        $lte: threeDaysFromNow
      }
    }).select('_id username email suscriptionEndDate');
    
    let notificationsCreated = 0;
    
    for (const user of usersExpiring) {
      // Verificar si ya existe una notificación de este tipo reciente (últimas 24h)
      const existingNotif = await Notification.findOne({
        user: user._id,
        type: 'subscription_expiring',
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });
      
      if (!existingNotif) {
        const daysRemaining = Math.ceil((new Date(user.suscriptionEndDate) - now) / (24 * 60 * 60 * 1000));
        await createSubscriptionExpiringNotification(user._id, daysRemaining);
        notificationsCreated++;
      }
    }
    
    return { 
      ok: true, 
      checked: usersExpiring.length, 
      notificationsCreated 
    };
  } catch (error) {
    console.error('Error verificando suscripciones:', error);
    return { ok: false, error: error.message };
  }
};

// Endpoint para ejecutar manualmente la verificación de suscripciones (admin)
export const triggerSubscriptionCheck = async (req, res) => {
  try {
    const result = await checkExpiringSubscriptions();
    return res.json(result);
  } catch (error) {
    console.error('Error en trigger de suscripciones:', error);
    return res.status(500).json({ message: 'Error verificando suscripciones' });
  }
};
