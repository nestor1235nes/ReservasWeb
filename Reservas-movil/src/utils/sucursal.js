// Helpers de sucursal (empresa) para la app móvil.

// getMe devuelve la sucursal populada con `administradores` como array de ids.
// Detectamos admin comparando el id del usuario contra ese array (sin request extra).
export const esAdminDeSucursal = (user) => {
  const sucursal = user?.sucursal;
  if (!sucursal) return false;
  const admins = Array.isArray(sucursal.administradores) ? sucursal.administradores : [];
  const uid = String(user?._id || user?.id || '');
  if (!uid) return false;
  return admins.some((a) => String(a?._id || a) === uid);
};

export const hasActiveSubscription = (end) => !!end && new Date(end) > new Date();

// Plan efectivo de la sucursal (para gating de features como Boxes → Teams).
export const sucursalPlanName = (user) => {
  const suc = user?.sucursal;
  if (!suc) return null;
  if (!hasActiveSubscription(suc?.suscriptionEndDate)) return null;
  return suc?.suscriptionPlan?.name || null;
};
