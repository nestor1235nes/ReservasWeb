export const ROLES = Object.freeze({
  OWNER: 'owner',
  PROF_SUCURSAL: 'profSucursal',
  ASISTENTE: 'asistente',
  ADMIN_SUCURSAL: 'adminSucursal',
});

const { OWNER, PROF_SUCURSAL, ASISTENTE, ADMIN_SUCURSAL } = ROLES;
const TODOS = [OWNER, PROF_SUCURSAL, ASISTENTE, ADMIN_SUCURSAL];

// `icon` es el nombre del icono, no un elemento React: este módulo debe poder
// importarse y testearse sin React ni MUI. SlideBar lo mapea a un componente
// concreto en su propio ICONS.
export const NAV_GROUPS = Object.freeze([
  {
    id: 'agenda',
    label: 'AGENDA',
    items: [
      { id: 'hoy', label: 'Día Actual', path: '/hoy', icon: 'Today',
        roles: [OWNER, PROF_SUCURSAL, ADMIN_SUCURSAL] },
      { id: 'calendario', label: 'Calendario', path: '/calendario', icon: 'CalendarMonth',
        roles: TODOS },
      { id: 'bloquearDias', label: 'Bloquear días', path: '/calendario/bloquear',
        icon: 'EventBusy', roles: [OWNER, PROF_SUCURSAL, ADMIN_SUCURSAL], requires: 'canBlockHours' },
      { id: 'telemedicina', label: 'Telemedicina', path: '/telemedicina', icon: 'VideoCall',
        roles: [OWNER, PROF_SUCURSAL, ADMIN_SUCURSAL], requires: 'canUseTelemedicina' },
    ],
  },
  {
    id: 'pacientes',
    label: 'PACIENTES',
    items: [
      { id: 'pacientes', label: 'Pacientes', path: '/pacientes', icon: 'People',
        roles: TODOS },
    ],
  },
  {
    id: 'empresa',
    label: 'MI EMPRESA',
    
    items: [
      { id: 'profesionales', label: 'Profesionales', path: '/sucursal/profesionales',
        icon: 'MedicalServices', roles: [ADMIN_SUCURSAL] },
      { id: 'asistentes', label: 'Asistentes', path: '/sucursal/asistentes',
        icon: 'GroupAdd', roles: [ADMIN_SUCURSAL] },
      { id: 'boxes', label: 'Salas de Box', path: '/mi-empresa/boxes',
        icon: 'MeetingRoom', roles: [PROF_SUCURSAL, ASISTENTE, ADMIN_SUCURSAL] },
      { id: 'enlaceSucursal', label: 'Enlace de sucursal', path: '/mi-empresa/enlace',
        icon: 'AddLink', roles: [ADMIN_SUCURSAL] },
      { id: 'configEmpresa', label: 'Configuración', path: '/mi-empresa/configuracion',
        icon: 'Settings', roles: [ADMIN_SUCURSAL] },
    ],
  },
  {
    id: 'reportes',
    label: 'REPORTES',
    items: [
      { id: 'graficos', label: 'Gráficos y Reportes', path: '/reportes', icon: 'BarChart',
        roles: [OWNER, PROF_SUCURSAL, ADMIN_SUCURSAL] },
      { id: 'reportesEmpresa', label: 'Reportes de empresa', path: '/mi-empresa/reportes',
        icon: 'Assessment', roles: [ADMIN_SUCURSAL] },
    ],
  },
  {
    id: 'configuracion',
    label: 'CONFIGURACIÓN',
    items: [
      { id: 'perfil', label: 'Mi Perfil', path: '/perfil', icon: 'AccountCircle',
        roles: TODOS },
      { id: 'miEnlace', label: 'Mi Enlace', path: '/mi-enlace', icon: 'AddLink',
        roles: [OWNER, PROF_SUCURSAL, ADMIN_SUCURSAL] },
    ],
  },
]);

// Mismo orden de evaluación que el if/else original de SlideBar.jsx:
// asistente, luego profesional de sucursal, luego admin de sucursal, luego owner.
export function resolveRole({ esAsistente, esAdminSucursal, tieneSucursal, isTeams }) {
  if (esAsistente) return ASISTENTE;
  if (!esAdminSucursal && !esAsistente && tieneSucursal && isTeams) return PROF_SUCURSAL;
  if (tieneSucursal && esAdminSucursal && isTeams) return ADMIN_SUCURSAL;
  return OWNER;
}

export function buildNavForRole(role) {
  return NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((i) => i.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}

// Equivalente exacto del isItemDisabled original. Se compara por `id` y no por
// label porque el label de Perfil cambió de 'Perfil' a 'Mi Perfil'.
export function isItemDisabled(item, caps) {
  if (!caps.hasActiveSubscription && item.id !== 'perfil') return true;
  if (item.requires && !caps[item.requires]) return true;
  return false;
}

// Coincidencia por límite de segmento: '/mi-empresa/boxes' activa
// '/mi-empresa/boxes/123/agenda' pero no '/mi-empresa/boxes-archivados'.
export function isPathActive(pathname, itemPath) {
  if (!pathname || !itemPath) return false;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

// Gana la coincidencia más larga, para que '/mi-empresa/reportes' resuelva a
// 'reportesEmpresa' y no a un prefijo más corto.
export function findActiveItemId(pathname) {
  const matches = NAV_GROUPS
    .flatMap((g) => g.items)
    .filter((i) => i.path && isPathActive(pathname, i.path));

  if (matches.length === 0) return null;
  return matches.reduce((best, i) => (i.path.length > best.path.length ? i : best)).id;
}

// El grupo que contiene el item activo. El sidebar lo usa para abrir solo ese
// grupo y no esconder nunca la pagina en la que estas. Sin coincidencia cae a
// la agenda, que es donde aterriza el login.
export function findActiveGroupId(pathname) {
  const activeId = findActiveItemId(pathname);
  if (activeId) {
    const group = NAV_GROUPS.find((g) => g.items.some((i) => i.id === activeId));
    if (group) return group.id;
  }
  return "agenda";
}
