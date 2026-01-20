// Utilidades compartidas

// Formatear RUT chileno
export const formatRut = (rut) => {
  if (!rut) return '';
  
  // Eliminar puntos y guiones
  let value = rut.replace(/\./g, '').replace(/-/g, '');
  
  // Si tiene más de 1 caracter, agregar guión antes del último
  if (value.length > 1) {
    const dv = value.slice(-1);
    const body = value.slice(0, -1);
    
    // Agregar puntos cada 3 dígitos
    let formatted = '';
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
      if (j > 0 && j % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = body[i] + formatted;
    }
    
    return formatted + '-' + dv;
  }
  
  return value;
};

// Validar RUT chileno
export const validateRut = (rut) => {
  if (!rut) return false;
  
  // Eliminar puntos y guiones
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');
  
  if (cleanRut.length < 2) return false;
  
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDv = 11 - (sum % 11);
  let calculatedDv;
  
  if (expectedDv === 11) calculatedDv = '0';
  else if (expectedDv === 10) calculatedDv = 'K';
  else calculatedDv = expectedDv.toString();
  
  return dv === calculatedDv;
};

// Formatear fecha para mostrar
export const formatDisplayDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Formatear hora
export const formatTime = (time) => {
  if (!time) return '';
  // Si es una fecha completa, extraer la hora
  if (time instanceof Date || time.includes('T')) {
    const d = new Date(time);
    return d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return time;
};

// Capitalizar texto
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Obtener iniciales de un nombre
export const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Truncar texto
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// --- Reservas / agenda ---

// YYYY-MM-DD en hora local
export const toYmdLocal = (date) => {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return '';
  }
};

// Normaliza reserva.siguienteCita a YYYY-MM-DD (evita shift de zona para strings tipo T00:00:00Z)
export const getReservaDateKey = (siguienteCita) => {
  if (!siguienteCita) return '';
  if (typeof siguienteCita === 'string') {
    const val = siguienteCita.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (val.endsWith('Z') && val.includes('T00:00:00')) return val.slice(0, 10);
  }
  return toYmdLocal(siguienteCita);
};

// Suma minutos a un string HH:mm
export const addMinutesToHHMM = (hhmm, minutesToAdd) => {
  try {
    if (!hhmm) return '';
    const [hStr, mStr] = String(hhmm).split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';
    const total = (h * 60 + m + (minutesToAdd || 0) + 24 * 60) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
};

// Construye Date local desde fecha (YYYY-MM-DD o ISO) + hora (HH:mm)
export const buildLocalStart = (fecha, horaStr) => {
  try {
    if (!fecha || !horaStr) return null;
    const [hours, minutes] = String(horaStr).split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    if (typeof fecha === 'string') {
      const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
      const zMidnight = fecha.includes('T00:00:00') && fecha.endsWith('Z');
      if (dateOnlyMatch || zMidnight) {
        const [y, m, d] = fecha.substring(0, 10).split('-').map(Number);
        return new Date(y, m - 1, d, hours, minutes, 0, 0);
      }
    }

    const base = new Date(fecha);
    if (Number.isNaN(base.getTime())) return null;
    base.setHours(hours, minutes, 0, 0);
    return base;
  } catch {
    return null;
  }
};
