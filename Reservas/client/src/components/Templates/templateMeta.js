const DAYS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const DAY_SHORT = {
  Lunes: 'Lun',
  Martes: 'Mar',
  Miércoles: 'Mié',
  Jueves: 'Jue',
  Viernes: 'Vie',
  Sábado: 'Sáb',
  Domingo: 'Dom',
};

export const getUniqueDays = (timetable) => {
  const set = new Set();
  (timetable || []).forEach((b) => (b?.days || []).forEach((d) => d && set.add(d)));
  return [...set].sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));
};

export const formatDaysShort = (days) => {
  const arr = (days || []).filter(Boolean);
  if (arr.length === 0) return '';

  const sorted = [...new Set(arr)].sort((a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b));
  const short = sorted.map((d) => DAY_SHORT[d] || d);

  const weekday = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const hasWeekday = weekday.every((d) => sorted.includes(d));
  const hasSat = sorted.includes('Sábado');
  const hasSun = sorted.includes('Domingo');

  if (sorted.length === 7) return 'Todos los días';
  if (hasWeekday && !hasSat && !hasSun && sorted.length === 5) return 'Lun–Vie';
  if (hasWeekday && hasSat && !hasSun && sorted.length === 6) return 'Lun–Sáb';
  if (hasWeekday && !hasSat && hasSun && sorted.length === 6) return 'Lun–Vie + Dom';

  return short.join(' · ');
};

export const formatBlockTime = (block) => {
  const from = block?.fromTime;
  const to = block?.toTime;
  if (from && to) {
    const bf = block?.breakFrom;
    const bt = block?.breakTo;
    const hasBreak = bf && bt;
    return hasBreak ? `${from}–${to} (colación ${bf}–${bt})` : `${from}–${to}`;
  }
  const times = Array.isArray(block?.times) ? block.times : [];
  if (times.length > 0) return `${times[0]}–${times[times.length - 1]}`;
  return '';
};

export const getTimetableSummary = (timetable) => {
  const days = getUniqueDays(timetable);
  const ranges = new Set();
  (timetable || []).forEach((b) => {
    const label = formatBlockTime(b);
    if (label) ranges.add(label);
  });

  const hours = [...ranges];
  return { days, hours };
};

export const extractExperienceYears = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') {
    const n = Math.floor(value);
    return Number.isFinite(n) && n >= 0 && n <= 80 ? n : null;
  }
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 80 ? n : null;
};

export const getExperienceLabel = (prof) => {
  const years = extractExperienceYears(prof?.experiencia);
  if (years == null) return '';
  return `${years} año${years === 1 ? '' : 's'} de experiencia`;
};

export const getSpecialtyLabel = (prof) => {
  const specialty = prof?.especialidad_principal || prof?.especialidad;
  return specialty ? String(specialty).trim() : '';
};

const normalizeToWaMeDigitsCL = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';

  // Chile default
  if (digits.startsWith('56')) return digits;
  if (digits.length <= 9) return `56${digits}`;
  return digits;
};

export const buildWhatsAppHref = ({ phone, message }) => {
  const digits = normalizeToWaMeDigitsCL(phone);
  if (!digits) return '';
  const text = message ? `?text=${encodeURIComponent(String(message))}` : '';
  return `https://wa.me/${digits}${text}`;
};
