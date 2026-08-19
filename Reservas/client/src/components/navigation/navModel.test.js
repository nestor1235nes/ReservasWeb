import { describe, it, expect } from 'vitest';
import {
  ROLES, NAV_GROUPS, resolveRole, buildNavForRole, isItemDisabled,
  isPathActive, findActiveItemId, findActiveGroupId,
} from './navModel';

// Contrato de no-regresión: rutas que cada rol ve. Base tomada de la
// implementación previa de SlideBar.jsx, más una adición deliberada:
// /calendario/bloquear, que antes vivía como botón flotante dentro del
// calendario y ahora es un ítem del sidebar. Visible para los mismos 4 roles
// que veían el FAB — que excluía asistentes vía {!esAsistente && ...} —; el
// gating por plan lo cubre isItemDisabled, no este mapa.
// Referencia original:
// implementación previa de SlideBar.jsx (baseMenuItems, assistantMenuItems,
// profesionalSucursalMenuItems y la rama adminSucursal + empresaSubItems).
const EXPECTED_ROUTES = {
  [ROLES.OWNER]: [
    '/hoy', '/calendario', '/calendario/bloquear', '/telemedicina', '/pacientes',
    '/reportes', '/perfil', '/mi-enlace',
  ],
  [ROLES.PROF_SUCURSAL]: [
    '/hoy', '/calendario', '/calendario/bloquear', '/telemedicina', '/pacientes', '/mi-empresa/boxes',
    '/reportes', '/perfil', '/mi-enlace',
  ],
  [ROLES.ASISTENTE]: [
    '/calendario', '/pacientes', '/mi-empresa/boxes', '/perfil',
  ],
  [ROLES.ADMIN_SUCURSAL]: [
    '/hoy', '/calendario', '/calendario/bloquear', '/telemedicina', '/pacientes',
    '/sucursal/profesionales', '/sucursal/asistentes', '/mi-empresa/boxes',
    '/mi-empresa/enlace', '/mi-empresa/configuracion',
    '/reportes', '/mi-empresa/reportes', '/perfil', '/mi-enlace',
  ],
};

const routesOf = (role) =>
  buildNavForRole(role)
    .flatMap((g) => g.items)
    .map((i) => i.path);

describe('resolveRole', () => {
  it('asistente gana sobre cualquier otra condición', () => {
    expect(resolveRole({ esAsistente: true, esAdminSucursal: true, tieneSucursal: true, isTeams: true }))
      .toBe(ROLES.ASISTENTE);
  });

  it('adminSucursal requiere sucursal + admin + Teams', () => {
    expect(resolveRole({ esAsistente: false, esAdminSucursal: true, tieneSucursal: true, isTeams: true }))
      .toBe(ROLES.ADMIN_SUCURSAL);
  });

  it('profSucursal es no-admin con sucursal en Teams', () => {
    expect(resolveRole({ esAsistente: false, esAdminSucursal: false, tieneSucursal: true, isTeams: true }))
      .toBe(ROLES.PROF_SUCURSAL);
  });

  it('sin Teams cae a owner aunque tenga sucursal', () => {
    expect(resolveRole({ esAsistente: false, esAdminSucursal: true, tieneSucursal: true, isTeams: false }))
      .toBe(ROLES.OWNER);
  });

  it('sin sucursal es owner', () => {
    expect(resolveRole({ esAsistente: false, esAdminSucursal: false, tieneSucursal: false, isTeams: false }))
      .toBe(ROLES.OWNER);
  });
});

describe('buildNavForRole — contrato de no-regresión', () => {
  for (const role of Object.values(ROLES)) {
    it(`${role} ve exactamente las mismas rutas que antes`, () => {
      expect(routesOf(role).sort()).toEqual([...EXPECTED_ROUTES[role]].sort());
    });
  }

  it('los conteos por rol coinciden con la matriz del spec', () => {
    expect(routesOf(ROLES.OWNER)).toHaveLength(8);
    expect(routesOf(ROLES.PROF_SUCURSAL)).toHaveLength(9);
    expect(routesOf(ROLES.ASISTENTE)).toHaveLength(4);
    expect(routesOf(ROLES.ADMIN_SUCURSAL)).toHaveLength(14);
  });

  it('no devuelve grupos vacíos', () => {
    for (const role of Object.values(ROLES)) {
      for (const group of buildNavForRole(role)) {
        expect(group.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('owner no ve el grupo MI EMPRESA y asistente no ve REPORTES', () => {
    const ids = (role) => buildNavForRole(role).map((g) => g.id);
    expect(ids(ROLES.OWNER)).not.toContain('empresa');
    expect(ids(ROLES.ASISTENTE)).not.toContain('reportes');
  });

  it('no hay rutas duplicadas dentro de un mismo rol', () => {
    for (const role of Object.values(ROLES)) {
      const routes = routesOf(role);
      expect(new Set(routes).size).toBe(routes.length);
    }
  });
});

describe('isItemDisabled', () => {
  const activo = { hasActiveSubscription: true, canUseTelemedicina: true, canBlockHours: true };
  const item = (id) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === id);

  it('sin suscripción activa bloquea todo salvo Perfil', () => {
    const caps = { hasActiveSubscription: false, canUseTelemedicina: true };
    expect(isItemDisabled(item('perfil'), caps)).toBe(false);
    expect(isItemDisabled(item('calendario'), caps)).toBe(true);
    expect(isItemDisabled(item('pacientes'), caps)).toBe(true);
    expect(isItemDisabled(item('boxes'), caps)).toBe(true);
  });

  it('bloquea Telemedicina cuando el plan no la permite', () => {
    expect(isItemDisabled(item('telemedicina'), { hasActiveSubscription: true, canUseTelemedicina: false }))
      .toBe(true);
  });

  it('con suscripción activa y plan avanzado no bloquea nada', () => {
    for (const group of NAV_GROUPS) {
      for (const it of group.items) {
        expect(isItemDisabled(it, activo)).toBe(false);
      }
    }
  });
});

describe('isPathActive', () => {
  it('coincide con la ruta exacta', () => {
    expect(isPathActive('/pacientes', '/pacientes')).toBe(true);
  });

  it('coincide con subrutas respetando el límite de segmento', () => {
    expect(isPathActive('/mi-empresa/boxes/123/agenda', '/mi-empresa/boxes')).toBe(true);
    expect(isPathActive('/telemedicina/abc', '/telemedicina')).toBe(true);
  });

  it('no coincide con prefijos parciales de un segmento', () => {
    expect(isPathActive('/mi-empresa/boxes-archivados', '/mi-empresa/boxes')).toBe(false);
  });

  it('no confunde /reportes con /mi-empresa/reportes', () => {
    expect(isPathActive('/mi-empresa/reportes', '/reportes')).toBe(false);
  });

  it('devuelve false con entradas vacías', () => {
    expect(isPathActive('', '/perfil')).toBe(false);
    expect(isPathActive('/perfil', undefined)).toBe(false);
  });
});

describe('findActiveItemId', () => {
  it('resuelve la ruta simple', () => {
    expect(findActiveItemId('/calendario')).toBe('calendario');
  });

  it('la agenda de un box activa Salas de Box', () => {
    expect(findActiveItemId('/mi-empresa/boxes/123/agenda')).toBe('boxes');
  });

  it('prefiere la coincidencia más específica', () => {
    expect(findActiveItemId('/mi-empresa/reportes')).toBe('reportesEmpresa');
    expect(findActiveItemId('/reportes')).toBe('graficos');
  });

  it('devuelve null en una ruta desconocida', () => {
    expect(findActiveItemId('/ruta-que-no-existe')).toBe(null);
  });
});

describe("findActiveGroupId", () => {
  it("devuelve el grupo del item activo", () => {
    expect(findActiveGroupId("/calendario")).toBe("agenda");
    expect(findActiveGroupId("/pacientes")).toBe("pacientes");
    expect(findActiveGroupId("/perfil")).toBe("configuracion");
  });

  it("la agenda de un box resuelve al grupo MI EMPRESA", () => {
    expect(findActiveGroupId("/mi-empresa/boxes/123/agenda")).toBe("empresa");
  });

  it("los reportes de empresa viven en REPORTES, no en MI EMPRESA", () => {
    expect(findActiveGroupId("/mi-empresa/reportes")).toBe("reportes");
  });

  it("una ruta fuera del menu cae al fallback agenda", () => {
    expect(findActiveGroupId("/template-builder")).toBe("agenda");
    expect(findActiveGroupId("/admin/planes")).toBe("agenda");
    expect(findActiveGroupId("/")).toBe("agenda");
  });
});
describe('bloquear días — ítem migrado desde el botón flotante', () => {
  it('la ruta más específica gana sobre /calendario', () => {
    expect(findActiveItemId('/calendario/bloquear')).toBe('bloquearDias');
    expect(findActiveItemId('/calendario')).toBe('calendario');
  });

  it('vive en el grupo AGENDA', () => {
    expect(findActiveGroupId('/calendario/bloquear')).toBe('agenda');
  });

  it('replica el gating por plan que tenía el botón flotante', () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === 'bloquearDias');
    expect(isItemDisabled(item, { hasActiveSubscription: true, canBlockHours: false })).toBe(true);
    expect(isItemDisabled(item, { hasActiveSubscription: true, canBlockHours: true })).toBe(false);
  });

  it('lo ven los mismos roles que veían el botón flotante, que excluía asistentes', () => {
    for (const role of [ROLES.OWNER, ROLES.PROF_SUCURSAL, ROLES.ADMIN_SUCURSAL]) {
      expect(routesOf(role)).toContain('/calendario/bloquear');
    }
    expect(routesOf(ROLES.ASISTENTE)).not.toContain('/calendario/bloquear');
  });
});
