import React, { useEffect, useRef, useState } from "react";
import {
  Modal, Box, Card, CardContent, CardHeader, Typography, Tabs, Tab, Button, Stack, TextField, Select, MenuItem, InputLabel, FormControl, Checkbox, FormControlLabel, Paper, Divider, Chip, Switch as MuiSwitch, IconButton
} from "@mui/material";
import { useAuth } from "../context/authContext";
import { useSucursal } from "../context/sucursalContext";
import FotoPerfil from "../components/FotoPerfil";
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import PlaceIcon from '@mui/icons-material/Place';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ScheduleIcon from "@mui/icons-material/Schedule";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Tooltip from '@mui/material/Tooltip';
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import ModalPerfilProfesional from '../components/Surcursales/ModalPerfilProfesional';
import PreviewIcon from '@mui/icons-material/Preview';
import SincronizacionCalendarios from '../components/Modales/SincronizacionCalendarios';
import ModalServicio from '../components/Modales/ModalServicio';
import MensajesAutomaticos from "../components/MensajesAutomaticos";
import { useAlert } from "../context/AlertContext";
import { useSubscription } from "../context/subscriptionContext";
import SubscriptionPlansModal from '../components/Modales/SubscriptionPlansModal';

const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const intervals = [10, 15, 30, 60];
const especialidades = [
  "Medicina General", "Cardiología", "Dermatología", "Neurología", "Pediatría"
];

const timeToMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.floor(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const normalizeHHMM = (hhmm) => {
  const mins = timeToMinutes(hhmm);
  return mins === null ? null : minutesToTime(mins);
};

// Retorna tramos efectivos de atención para comparar solapamientos.
// Si hay descanso válido dentro del rango, divide en 2 segmentos.
const getWorkingSegments = (schedule) => {
  const from = timeToMinutes(schedule?.fromTime);
  const to = timeToMinutes(schedule?.toTime);
  if (from === null || to === null || from >= to) return [];

  const breakFrom = timeToMinutes(schedule?.breakFrom);
  const breakTo = timeToMinutes(schedule?.breakTo);

  const hasValidBreak =
    breakFrom !== null &&
    breakTo !== null &&
    breakFrom < breakTo &&
    from < breakTo &&
    breakFrom < to;

  if (!hasValidBreak) return [[from, to]];

  const leftEnd = Math.max(from, Math.min(breakFrom, to));
  const rightStart = Math.min(to, Math.max(breakTo, from));

  const segments = [];
  if (from < leftEnd) segments.push([from, leftEnd]);
  if (rightStart < to) segments.push([rightStart, to]);
  return segments;
};

const findTimetableOverlaps = (timetable) => {
  const overlaps = [];
  const byDay = new Map(); // day -> array of { index, start, end }

  (timetable || []).forEach((schedule, index) => {
    const days = Array.isArray(schedule?.days) ? schedule.days : [];
    const segments = getWorkingSegments(schedule);
    if (days.length === 0 || segments.length === 0) return;

    days.forEach((day) => {
      if (!byDay.has(day)) byDay.set(day, []);
      const existing = byDay.get(day);

      segments.forEach(([start, end]) => {
        existing.forEach((prev) => {
          const overlapStart = Math.max(start, prev.start);
          const overlapEnd = Math.min(end, prev.end);
          if (overlapStart < overlapEnd) {
            overlaps.push({
              day,
              aIndex: prev.index,
              bIndex: index,
              start: overlapStart,
              end: overlapEnd,
            });
          }
        });
        existing.push({ index, start, end });
      });
    });
  });

  // Deduplicar (por si un bloque tiene 2 segmentos y genera múltiples cruces)
  const seen = new Set();
  return overlaps.filter((o) => {
    const a = Math.min(o.aIndex, o.bIndex);
    const b = Math.max(o.aIndex, o.bIndex);
    const key = `${o.day}|${a}|${b}|${o.start}|${o.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Normaliza los bloques de horario para asegurar que todos los campos existen
const normalizeTimetable = (timetable) =>
  (timetable || []).map(t => ({
    days: t.days || [],
    times: t.times || [],
    fromTime: t.fromTime || "",
    toTime: t.toTime || "",
    interval: t.interval || 30,
    slotCapacity: typeof t.slotCapacity === 'number' && t.slotCapacity > 0 ? t.slotCapacity : 1,
    slotCapacityOverrides: (t && typeof t.slotCapacityOverrides === 'object' && !Array.isArray(t.slotCapacityOverrides) && t.slotCapacityOverrides)
      ? t.slotCapacityOverrides
      : {},
    breakFrom: t.breakFrom || "",
    breakTo: t.breakTo || ""
  }));

const computeTotalSlotsForSchedule = (schedule) => {
  const baseCapRaw = Number(schedule?.slotCapacity);
  const baseCap = Number.isFinite(baseCapRaw) && baseCapRaw >= 1 ? Math.floor(baseCapRaw) : 1;
  const overrides = (schedule && typeof schedule.slotCapacityOverrides === 'object' && !Array.isArray(schedule.slotCapacityOverrides))
    ? schedule.slotCapacityOverrides
    : {};
  const times = Array.isArray(schedule?.times) ? schedule.times : [];
  if (times.length === 0) return 0;

  return times.reduce((acc, t) => {
    const norm = normalizeHHMM(t) || t;
    const oNum = Number(overrides?.[norm]);
    const cap = Number.isFinite(oNum) && oNum >= 1 ? Math.floor(oNum) : baseCap;
    return acc + cap;
  }, 0);
};

// Componente visual para cada bloque de horario
const ScheduleBlock = ({ schedule, index, isEditing, onEdit, onDelete, overlaps = [], shouldFlash = false }) => {
  const formatDays = (days) => {
    if (!days || days.length === 0) return "Sin días configurados";
    return days.join(", ");
  };
  const formatTimeRange = (fromTime, toTime, breakFrom, breakTo) => {
    let timeStr = `${fromTime || "--:--"} - ${toTime || "--:--"}`;
    if (breakFrom && breakTo) {
      timeStr += ` (Descanso: ${breakFrom} - ${breakTo})`;
    }
    return timeStr;
  };
  const overrides = (schedule && typeof schedule.slotCapacityOverrides === 'object' && !Array.isArray(schedule.slotCapacityOverrides))
    ? schedule.slotCapacityOverrides
    : {};
  const overrideEntries = Object.entries(overrides)
    .map(([k, v]) => [normalizeHHMM(k) || k, v])
    .filter(([k, v]) => !!k && Number.isFinite(Number(v)) && Number(v) >= 1)
    .sort((a, b) => (timeToMinutes(a[0]) ?? 0) - (timeToMinutes(b[0]) ?? 0));
  const hasOverlap = overlaps.length > 0;
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: "2px solid #e3f2fd",
        "&:hover": {
          boxShadow: 3,
          borderColor: "#2596be",
        },
        transition: "all 0.3s ease",
        ...(shouldFlash
          ? {
              animation: 'overlapFlash 1.2s ease-in-out 1',
              '@keyframes overlapFlash': {
                '0%': { boxShadow: 'none' },
                '15%': { boxShadow: '0 0 0 4px rgba(211, 47, 47, 0.35)' },
                '30%': { boxShadow: 'none' },
                '45%': { boxShadow: '0 0 0 4px rgba(211, 47, 47, 0.35)' },
                '60%': { boxShadow: 'none' },
                '100%': { boxShadow: 'none' },
              },
            }
          : null),
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        {hasOverlap && (
          <Box mb={2}>
            <Typography variant="body2" color="error" fontWeight={700}>
              Solapamiento detectado
            </Typography>
            <Typography variant="caption" color="error">
              {overlaps
                .slice(0, 3)
                .map((o) => {
                  const other = o.aIndex === index ? o.bIndex : o.aIndex;
                  return `${o.day}: se cruza con Bloque ${other + 1} (${minutesToTime(o.start)}–${minutesToTime(o.end)})`;
                })
                .join(' | ')}
            </Typography>
          </Box>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon sx={{color:'#2596be'}} />
            <Typography variant="h6" fontWeight={600}>
              Bloque de Horario {index + 1}
            </Typography>
          </Box>
          {!isEditing && (
            <Box display="flex" gap={1}>
              <IconButton size="small" onClick={() => onEdit(index)} sx={{ color: "#1976d2" }}>
                <EditIcon />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(index)} sx={{ color: "#d32f2f" }}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
        <Box display="flex" flexWrap="wrap" gap={3}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CalendarTodayIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                Días de atención:
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight={500}>
              {formatDays(schedule.days)}
            </Typography>
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                Horario:
              </Typography>
            </Box>
            <Typography variant="body1" fontWeight={500}>
              {formatTimeRange(schedule.fromTime, schedule.toTime, schedule.breakFrom, schedule.breakTo)}
            </Typography>
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="body2" color="textSecondary">
                Intervalo entre citas:
              </Typography>
            </Box>
            <Chip label={`${schedule.interval || 30} minutos`} size="small" color="primary" variant="outlined" />
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body2" color="textSecondary">
                Cupos por hora:
              </Typography>
            </Box>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip label={`Base: ${schedule.slotCapacity || 1}`} size="small" color="info" variant="outlined" />
              {overrideEntries.length > 0 && (
                <Chip label={`Overrides: ${overrideEntries.length}`} size="small" color="info" variant="outlined" />
              )}
            </Box>
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body2" color="textSecondary">
                Citas disponibles:
              </Typography>
            </Box>
            <Chip
              label={`${computeTotalSlotsForSchedule(schedule)} cupos`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
        </Box>

        {overrideEntries.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Sobrecupo por hora específica:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {overrideEntries.slice(0, 12).map(([hhmm, cap]) => (
                <Chip key={hhmm} label={`${hhmm} → ${Math.floor(Number(cap))}`} size="small" variant="outlined" color="info" />
              ))}
              {overrideEntries.length > 12 && (
                <Chip label={`+${overrideEntries.length - 12} más`} size="small" color="primary" />
              )}
            </Box>
          </Box>
        )}
        {schedule.times && schedule.times.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Horarios específicos disponibles:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {schedule.times.slice(0, 20).map((time, idx) => (
                <Chip key={idx} label={time} size="small" variant="outlined" />
              ))}
              {schedule.times.length > 20 && (
                <Chip label={`+${schedule.times.length - 20} más`} size="small" color="primary" />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Editor visual para cada bloque de horario
const ScheduleEditor = ({ schedule, index, onChange, onSave, onCancel, overlaps = [], shouldFlash = false, canUseOverbooking = false }) => {
  const handleChange = (field, value) => {
    onChange(index, field, value);
  };

  const getPreviewTimes = () => {
    const existing = Array.isArray(schedule?.times) ? schedule.times : [];
    if (existing.length > 0) return existing;

    const fromTime = schedule?.fromTime || '';
    const toTime = schedule?.toTime || '';
    const interval = Number(schedule?.interval || 30);
    if (!fromTime || !toTime || !interval || fromTime === toTime) return [];

    const breakFrom = schedule?.breakFrom || '';
    const breakTo = schedule?.breakTo || '';

    const addMinutes = (time, minutes) => {
      const [hours, mins] = time.split(":").map(Number);
      const totalMinutes = hours * 60 + mins + minutes;
      const newHours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
      const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");
      return `${newHours}:${newMinutes}`;
    };

    const times = [];
    let currentTime = fromTime;
    while (currentTime < toTime) {
      if (breakFrom && breakTo && currentTime >= breakFrom && currentTime < breakTo) {
        currentTime = breakTo;
      } else {
        times.push(currentTime);
        currentTime = addMinutes(currentTime, interval);
      }
    }
    return times;
  };

  const previewTimes = getPreviewTimes();
  const overrides = (schedule && typeof schedule.slotCapacityOverrides === 'object' && !Array.isArray(schedule.slotCapacityOverrides))
    ? schedule.slotCapacityOverrides
    : {};

  const baseCapRaw = Number(schedule?.slotCapacity);
  const baseCap = Number.isFinite(baseCapRaw) && baseCapRaw >= 1 ? Math.floor(baseCapRaw) : 1;
  const hasOverrides = Object.keys(overrides || {}).length > 0;
  const [overbookingEnabled, setOverbookingEnabled] = useState(baseCap > 1 || hasOverrides);
  const [overbookingMode, setOverbookingMode] = useState(hasOverrides ? 'specific' : 'all');

  const [allCapInput, setAllCapInput] = useState(Math.max(2, baseCap || 2));
  const [specificCapInput, setSpecificCapInput] = useState(2);
  const [selectedSpecificTimes, setSelectedSpecificTimes] = useState([]);

  useEffect(() => {
    // Si viene algo persistido, sincronizar switch y modo inicial.
    if (baseCap > 1 || hasOverrides) {
      setOverbookingEnabled(true);
      setOverbookingMode(hasOverrides ? 'specific' : 'all');
      if (!hasOverrides) setAllCapInput(Math.max(2, baseCap || 2));
    }
  }, [baseCap, hasOverrides]);

  const handleToggleOverbooking = (enabled) => {
    setOverbookingEnabled(enabled);
    setSelectedSpecificTimes([]);

    if (!enabled) {
      handleChange('slotCapacityOverrides', {});
      handleChange('slotCapacity', 1);
      return;
    }

    const nextMode = overbookingMode || 'all';
    setOverbookingMode(nextMode);
    if (nextMode === 'all') {
      const cap = Math.max(2, Math.floor(Number(allCapInput) || 2));
      handleChange('slotCapacityOverrides', {});
      handleChange('slotCapacity', cap);
    } else {
      handleChange('slotCapacity', 1);
      handleChange('slotCapacityOverrides', overrides || {});
    }
  };

  const handleSelectMode = (mode) => {
    setOverbookingMode(mode);
    setSelectedSpecificTimes([]);

    if (mode === 'all') {
      const cap = Math.max(2, Math.floor(Number(allCapInput) || 2));
      handleChange('slotCapacityOverrides', {});
      handleChange('slotCapacity', cap);
    } else {
      handleChange('slotCapacity', 1);
      handleChange('slotCapacityOverrides', overrides || {});
    }
  };

  const toggleSpecificTime = (hhmm) => {
    const norm = normalizeHHMM(hhmm) || hhmm;
    setSelectedSpecificTimes((prev) => {
      const set = new Set(prev);
      if (set.has(norm)) set.delete(norm);
      else set.add(norm);
      return [...set];
    });
  };

  const applySpecificOverrides = () => {
    const capNum = Number(specificCapInput);
    const cap = Number.isFinite(capNum) && capNum >= 1 ? Math.floor(capNum) : null;
    if (!cap) return;
    if (!selectedSpecificTimes || selectedSpecificTimes.length === 0) return;

    const next = { ...(overrides || {}) };
    selectedSpecificTimes.forEach((t) => {
      next[t] = cap;
    });
    handleChange('slotCapacityOverrides', next);
    // asegurar modo específico
    handleChange('slotCapacity', 1);
    setSelectedSpecificTimes([]);
  };

  const removeSpecificOverride = (hhmm) => {
    const norm = normalizeHHMM(hhmm) || hhmm;
    const next = { ...(overrides || {}) };
    delete next[norm];
    handleChange('slotCapacityOverrides', next);
    setSelectedSpecificTimes((prev) => prev.filter((t) => t !== norm));
  };

  const handleDayToggle = (day) => {
    const currentDays = schedule.days || [];
    const newDays = currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day];
    handleChange("days", newDays);
  };
  const hasOverlap = overlaps.length > 0;
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        border: "2px solid #4caf50",
        backgroundColor: "#f8fff8",
        ...(shouldFlash
          ? {
              animation: 'overlapFlash 1.2s ease-in-out 1',
              '@keyframes overlapFlash': {
                '0%': { boxShadow: 'none' },
                '15%': { boxShadow: '0 0 0 4px rgba(211, 47, 47, 0.35)' },
                '30%': { boxShadow: 'none' },
                '45%': { boxShadow: '0 0 0 4px rgba(211, 47, 47, 0.35)' },
                '60%': { boxShadow: 'none' },
                '100%': { boxShadow: 'none' },
              },
            }
          : null),
      }}
    >
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon sx={{ color: "#2596d3" }} />
            <Typography variant="h6">Editando Bloque {index + 1}</Typography>
          </Box>
        }
        action={
          <Box display="flex" gap={1}>
            <Button variant="contained" sx={{ color: "#ffffffff", backgroundColor: "#2596d3" }} size="small" startIcon={<SaveIcon />} onClick={onSave}>
              Guardar
            </Button>
            <Button variant="outlined" sx={{ color: "#2596d3" }} size="small" startIcon={<CancelIcon />} onClick={onCancel}>
              Cancelar
            </Button>
          </Box>
        }
      />
      <CardContent>
        {hasOverlap && (
          <Box mb={2}>
            <Typography variant="body2" color="error" fontWeight={700}>
              Solapamiento detectado
            </Typography>
            <Typography variant="caption" color="error">
              {overlaps
                .slice(0, 3)
                .map((o) => {
                  const other = o.aIndex === index ? o.bIndex : o.aIndex;
                  return `${o.day}: se cruza con Bloque ${other + 1} (${minutesToTime(o.start)}–${minutesToTime(o.end)})`;
                })
                .join(' | ')}
            </Typography>
          </Box>
        )}
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <Box minWidth={220} flex={1}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600} sx={{ color: "#2596d3" }}>
              Horarios de Atención
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Hora de inicio"
                name="fromTime"
                type="time"
                value={schedule.fromTime || ""}
                onChange={(e) => handleChange("fromTime", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hora de fin"
                name="toTime"
                type="time"
                value={schedule.toTime || ""}
                onChange={(e) => handleChange("toTime", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>Intervalo entre citas</InputLabel>
                <Select value={schedule.interval || 30} onChange={(e) => handleChange("interval", e.target.value)}>
                  {intervals.map((interval) => (
                    <MenuItem key={interval} value={interval}>
                      {interval} minutos
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ color: "#2596d3" }}>
                  Sobrecupo
                </Typography>

                {canUseOverbooking ? (
                  <>
                    <FormControlLabel
                      control={
                        <MuiSwitch
                          checked={overbookingEnabled}
                          onChange={(e) => handleToggleOverbooking(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#2596d3',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#2596d3',
                              opacity: 1,
                            },
                          }}
                        />
                      }
                      label="Permitir sobrecupo"
                    />

                    {overbookingEnabled && (
                      <Box mt={1}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={overbookingMode === 'all'}
                              onChange={() => handleSelectMode('all')}
                              sx={{ '&.Mui-checked': { color: '#2596d3' } }}
                            />
                          }
                          label="Todas las horas del horario con sobrecupo"
                        />

                        {overbookingMode === 'all' && (
                          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ ml: 4, mt: 1 }}>
                            <TextField
                              label="Cupos por hora"
                              type="number"
                              value={allCapInput}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const parsed = raw === '' ? '' : Number(raw);
                                if (raw === '') return setAllCapInput('');
                                if (!Number.isFinite(parsed)) return;
                                const nextCap = Math.max(2, Math.floor(parsed));
                                setAllCapInput(nextCap);
                                handleChange('slotCapacity', nextCap);
                              }}
                              inputProps={{ min: 2, step: 1 }}
                              sx={{ width: 180 }}
                              helperText="2 = dos reservas en la misma hora."
                            />
                          </Box>
                        )}

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={overbookingMode === 'specific'}
                              onChange={() => handleSelectMode('specific')}
                              sx={{ '&.Mui-checked': { color: '#2596d3' } }}
                            />
                          }
                          label="Sobrecupo a horas específicas"
                        />

                        {overbookingMode === 'specific' && (
                          <Box sx={{ ml: 4, mt: 1 }}>
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ mb: 1 }}>
                              <TextField
                                label="Cupos para hora seleccionada"
                                type="number"
                                value={specificCapInput}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const parsed = raw === '' ? '' : Number(raw);
                                  if (raw === '') return setSpecificCapInput('');
                                  if (!Number.isFinite(parsed)) return;
                                  setSpecificCapInput(Math.max(2, Math.floor(parsed)));
                                }}
                                inputProps={{ min: 2, step: 1 }}
                                sx={{ width: 240 }}
                              />
                              <Button
                                variant="outlined"
                                sx={{ color: "#2596d3" }}
                                onClick={applySpecificOverrides}
                                disabled={!selectedSpecificTimes || selectedSpecificTimes.length === 0}
                              >
                                Aplicar a seleccionadas
                              </Button>
                            </Box>

                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                              Selecciona horas y asigna el cupo para esas horas.
                            </Typography>

                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {(previewTimes || []).map((t) => {
                                const norm = normalizeHHMM(t) || t;
                                const selected = (selectedSpecificTimes || []).includes(norm);
                                const cap = overrides?.[norm];
                                const label = cap ? `${norm} (${Math.floor(Number(cap))})` : norm;
                                return (
                                  <Chip
                                    key={norm}
                                    label={label}
                                    size="small"
                                    color={selected ? 'primary' : 'default'}
                                    variant={selected ? 'filled' : 'outlined'}
                                    onClick={() => toggleSpecificTime(norm)}
                                    onDelete={cap ? () => removeSpecificOverride(norm) : undefined}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Disponible solo en Plan Avanzado.
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>
          <Box minWidth={220} flex={1}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600} sx={{ color: "#2596d3" }}>
              Horario de Almuerzo/Descanso
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              (Opcional)
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Inicio del descanso"
                name="breakFrom"
                type="time"
                value={schedule.breakFrom || ""}
                onChange={(e) => handleChange("breakFrom", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Fin del descanso"
                name="breakTo"
                type="time"
                value={schedule.breakTo || ""}
                onChange={(e) => handleChange("breakTo", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Box>
          <Box minWidth={220} flex={2}>
            <Typography variant="subtitle1" gutterBottom fontWeight={600} sx={{ color: "#2596d3" }}>
              Días de Atención
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {daysOfWeek.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={(schedule.days || []).includes(day)}
                      onChange={() => handleDayToggle(day)}
                      sx={{
                        '&.Mui-checked': {
                          color: '#2596d3',
                        },
                      }}
                    />
                  }
                  label={day}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    px: 1,
                    mr: 0,
                    backgroundColor: (schedule.days || []).includes(day) ? "#e3f2fd" : "white",
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export function PerfilPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user, updatePerfil, deleteBloqueHorario, esAdminSucursal, esAsistente, deleteServicio } = useAuth();
  const [tab, setTab] = useState(0);
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState(null);
  const scheduleRefs = useRef({});
  const [pendingScrollScheduleIndex, setPendingScrollScheduleIndex] = useState(null);
  const { agregarProfesional, quitarProfesional } = useSucursal();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSyncOpen, setModalSyncOpen] = useState(false);
  const [modalServicioOpen, setModalServicioOpen] = useState(false);
  const [servicioEditing, setServicioEditing] = useState(null);
  const [servicioEditingIndex, setServicioEditingIndex] = useState(null);
  const [deletingServicioIndex, setDeletingServicioIndex] = useState(null);
  const fotoPerfilRef = useRef(null);
  const showAlert = useAlert();
  const {
    planName: activePlanName,
    planLevel,
    hasActiveSubscription,
    canSyncCalendar,
    canUseTelemedicina,
    scope: subscriptionScope,
    loading: loadingSubscription,
  } = useSubscription();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const noSubscription = !hasActiveSubscription;
  const isSucursalScope = subscriptionScope === 'SUCURSAL';
  const canSeePlanChip = !loadingSubscription && (!isSucursalScope || esAdminSucursal);
  const canUseOverbooking = planLevel === 'advanced' || planLevel === 'teams';

  const isSucursalMember = !!(user?.sucursal?._id || user?.sucursal);
  // Regla UX: solo admin de sucursal o profesional independiente ven "Mensajes".
  const canSeeMensajesTab = !esAsistente && (!isSucursalMember || esAdminSucursal);

  useEffect(() => {
    if (tab === 4 && !canSeeMensajesTab) setTab(0);
  }, [tab, canSeeMensajesTab]);


  const handleOpenPerfil = (profesional) => {
    setProfesionalSeleccionado(profesional);
    setModalOpen(true);
  };


  // Estado inicial normalizado
  const [formData, setFormData] = useState({
    username: user.username || "",
    celular: user.celular || "",
    direccion: user.direccion || user.sucursal?.direccion || "",
    descripcion: user.descripcion || "",
    especialidad: user.especialidad || "",
    especialidad_principal: user.especialidad_principal || "",
    experiencia: user.experiencia || "",
    cita_presencial: user.cita_presencial || false,
    cita_virtual: user.cita_virtual || false,
    cita_domicilio: user.cita_domicilio || false,
    email: user.email || "",
    googleEmail: user.googleEmail || "",
    timetable: normalizeTimetable(user.timetable),
    adminAtiendePersonas: user.adminAtiendePersonas || false,
    // Campos WhatsApp / Green API
    idInstance: user.idInstance || "",
    apiTokenInstance: user.apiTokenInstance || "",
    defaultMessage: user.defaultMessage || "",
    reminderMessage: user.reminderMessage || ""
  });

  const timetableOverlaps = findTimetableOverlaps(formData.timetable);
  const overlapsByIndex = timetableOverlaps.reduce((acc, o) => {
    if (!acc[o.aIndex]) acc[o.aIndex] = [];
    if (!acc[o.bIndex]) acc[o.bIndex] = [];
    acc[o.aIndex].push(o);
    acc[o.bIndex].push(o);
    return acc;
  }, {});

  const [flashScheduleIndices, setFlashScheduleIndices] = useState({});
  const prevOverlappedRef = useRef(new Set());
  const overlapKey = timetableOverlaps
    .map((o) => `${o.day}|${o.aIndex}|${o.bIndex}|${o.start}|${o.end}`)
    .join('~');

  useEffect(() => {
    const current = new Set(
      Object.keys(overlapsByIndex)
        .map(Number)
        .filter((i) => (overlapsByIndex[i] || []).length > 0),
    );
    const prev = prevOverlappedRef.current;
    const newly = [...current].filter((i) => !prev.has(i));

    if (newly.length > 0) {
      setFlashScheduleIndices((prevMap) => {
        const next = { ...prevMap };
        newly.forEach((i) => {
          next[i] = true;
        });
        return next;
      });

      // 1.2s = 2 pulsos dentro del keyframe overlapFlash
      setTimeout(() => {
        setFlashScheduleIndices((prevMap) => {
          const next = { ...prevMap };
          newly.forEach((i) => {
            delete next[i];
          });
          return next;
        });
      }, 1300);
    }

    prevOverlappedRef.current = current;
  }, [overlapKey]);

  useEffect(() => {
    if (pendingScrollScheduleIndex === null) return;
    if (editingScheduleIndex !== pendingScrollScheduleIndex) return;

    const el = scheduleRefs.current?.[pendingScrollScheduleIndex];
    if (!el) return;

    // Espera un tick para asegurar layout/render antes de scrollear
    setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {
        // noop
      }
    }, 0);

    setPendingScrollScheduleIndex(null);
  }, [pendingScrollScheduleIndex, editingScheduleIndex]);

  // Handlers
  const handleEditProfileClick = () => {
    if (noSubscription) {
      if (typeof showAlert === 'function') {
        showAlert('info', 'Debes contratar un plan para editar tu perfil.');
      }
      return;
    }

    // Si pertenece a una sucursal y no tiene dirección propia, precargar la dirección de la sucursal
    if (!formData.direccion && user.sucursal?.direccion) {
      setFormData((prev) => ({ ...prev, direccion: user.sucursal.direccion }));
    }

    setEditProfileMode(true);
  };
  const handleSaveProfileClick = async () => {
    try {
      // Detecta si cambió el valor del switch
      const prevValue = user.adminAtiendePersonas || false;
      const newValue = formData.adminAtiendePersonas || false;

      const overlaps = findTimetableOverlaps(formData.timetable);
      if (overlaps.length > 0) {
        const detail = overlaps
          .slice(0, 5)
          .map(
            (o) =>
              `${o.day}: Bloque ${o.aIndex + 1} y Bloque ${o.bIndex + 1} se cruzan (${minutesToTime(o.start)}–${minutesToTime(o.end)})`
          )
          .join(' | ');
        showAlert('error', `Hay solapamiento de horarios. Ajusta las horas para que no se crucen. ${detail}`);
        return;
      }
      const isSucursalMember = !!(user?.sucursal?._id || user?.sucursal);
      const payload = { ...formData };
      if (isSucursalMember) {
        delete payload.idInstance;
        delete payload.apiTokenInstance;
        delete payload.defaultMessage;
        delete payload.reminderMessage;
      }

      await updatePerfil(user.id || user._id, payload);


    // Solo si es admin y cambió el valor, actualiza la sucursal
      if (esAdminSucursal && user.sucursal && user.id && prevValue !== newValue) {
        if (newValue) {
          await agregarProfesional(user.sucursal._id, user.id);
        } else {
          await quitarProfesional(user.sucursal._id, user.id);
        }
      }

      setEditProfileMode(false);
      showAlert('success', 'Perfil actualizado correctamente.');
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      const message = error?.response?.data?.message || 'No se pudo actualizar el perfil.';
      showAlert('error', message);
    }
  };
  const handleCancelProfileClick = () => {
    setFormData({
      username: user.username || "",
      celular: user.celular || "",
      direccion: user.direccion || user.sucursal?.direccion || "",
      descripcion: user.descripcion || "",
      especialidad: user.especialidad || "",
      especialidad_principal: user.especialidad_principal || "",
      experiencia: user.experiencia || "",
      cita_presencial: user.cita_presencial || false,
      cita_virtual: user.cita_virtual || false,
      cita_domicilio: user.cita_domicilio || false,
      email: user.email || "",
      googleEmail: user.googleEmail || "",
      timetable: normalizeTimetable(user.timetable),
      adminAtiendePersonas: user.adminAtiendePersonas || false,
      idInstance: user.idInstance || "",
      apiTokenInstance: user.apiTokenInstance || "",
      defaultMessage: user.defaultMessage || "",
      reminderMessage: user.reminderMessage || ""
    });
    setEditProfileMode(false);
    showAlert('info', 'Cambios descartados.');
  };

  // Horarios
  const handleAddSchedule = () => {
    const newIndex = (formData.timetable || []).length;
    setFormData({
      ...formData,
      timetable: [
        ...formData.timetable,
        { fromTime: "", toTime: "", days: [], interval: 30, slotCapacity: 1, slotCapacityOverrides: {}, breakFrom: "", breakTo: "", times: [] }
      ]
    });
    setEditingScheduleIndex(newIndex);
    setPendingScrollScheduleIndex(newIndex);
  };

  // Servicios
  const handleAddServicio = () => {
    try {
      setServicioEditing(null);
      setServicioEditingIndex(null);
      setModalServicioOpen(true);
    } catch (error) {
      console.error('Error al agregar servicio:', error);
      const message = error?.response?.data?.message || 'No se pudo agregar el servicio.';
      showAlert('error', message);
    }
  };

  const handleEditServicio = (servicio, index) => {
    setServicioEditing(servicio);
    setServicioEditingIndex(index);
    setModalServicioOpen(true);
  };

  const handleDeleteServicio = async (index) => {
    try {
      setDeletingServicioIndex(index);
      await deleteServicio(index);
      showAlert('success', 'Servicio eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      const message = error?.response?.data?.message || 'No se pudo eliminar el servicio.';
      showAlert('error', message);
    } finally {
      setDeletingServicioIndex(null);
    }
  };

  const handleCloseModalServicio = () => {
    setModalServicioOpen(false);
    setServicioEditing(null);
    setServicioEditingIndex(null);
  };

  // Horarios
  const handleEditSchedule = (index) => setEditingScheduleIndex(index);
  const handleDeleteSchedule = async (index) => {
    try {
      await deleteBloqueHorario(user.id || user._id, index);
      setFormData((prev) => ({
        ...prev,
        timetable: prev.timetable.filter((_, i) => i !== index)
      }));
      showAlert('success', 'Bloque de horario eliminado.');
    } catch (error) {
      console.error('Error al eliminar bloque de horario:', error);
      const message = error?.response?.data?.message || 'No se pudo eliminar el bloque de horario.';
      showAlert('error', message);
    }
  };
  const handleScheduleChange = (index, field, value) => {
      const newTimetable = [...formData.timetable];
      newTimetable[index][field] = value;
      setFormData({ ...formData, timetable: newTimetable });
    };
    const handleSaveSchedule = async () => {
    const updatedTimetable = formData.timetable.map((time) => {
      // Solo genera times si todos los campos requeridos están presentes
      const {
        fromTime = "",
        toTime = "",
        breakFrom = "",
        breakTo = "",
        interval = 30,
        slotCapacity,
        slotCapacityOverrides,
        days = [],
      } = time;

      
      let times = [];
      if (fromTime && toTime && interval && fromTime !== toTime) {
        
        times = generateTimes(fromTime, toTime, breakFrom, breakTo, interval);
      }

      const capNum = Number(slotCapacity);
      const safeCapacity = Number.isFinite(capNum) && capNum >= 1 ? Math.floor(capNum) : 1;

      const rawOverrides = (slotCapacityOverrides && typeof slotCapacityOverrides === 'object' && !Array.isArray(slotCapacityOverrides))
        ? slotCapacityOverrides
        : {};

      const cleanedOverrides = {};
      Object.entries(rawOverrides).forEach(([k, v]) => {
        const normK = normalizeHHMM(k) || k;
        const n = Number(v);
        if (!normK) return;
        if (!Number.isFinite(n) || n < 1) return;
        cleanedOverrides[normK] = Math.floor(n);
      });

      // Si tenemos lista de horas calculadas, prunea overrides que ya no existan
      let finalOverrides = cleanedOverrides;
      if (Array.isArray(times) && times.length > 0) {
        const timeSet = new Set(times.map(t => normalizeHHMM(t) || t));
        finalOverrides = {};
        Object.entries(cleanedOverrides).forEach(([k, v]) => {
          if (timeSet.has(k)) finalOverrides[k] = v;
        });
      }

      return { ...time, fromTime, toTime, breakFrom, breakTo, interval, slotCapacity: safeCapacity, slotCapacityOverrides: finalOverrides, days, times };
    });
    setFormData({
      ...formData,
      timetable: updatedTimetable,
    });

    const overlaps = findTimetableOverlaps(updatedTimetable);
    if (overlaps.length > 0) {
      const detail = overlaps
        .slice(0, 5)
        .map(
          (o) =>
            `${o.day}: Bloque ${o.aIndex + 1} y Bloque ${o.bIndex + 1} se cruzan (${minutesToTime(o.start)}–${minutesToTime(o.end)})`
        )
        .join(' | ');
      showAlert('error', `Hay solapamiento de horarios. Ajusta las horas para que no se crucen. ${detail}`);
      return;
    }

    try {
      await updatePerfil(user.id || user._id, { ...formData, timetable: updatedTimetable });
      setEditingScheduleIndex(null);
      showAlert('success', 'Horario actualizado correctamente.');
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      const message = error?.response?.data?.message || 'No se pudo actualizar el horario.';
      showAlert('error', message);
    }
  };
  const handleCancelScheduleEdit = () => {
    setEditingScheduleIndex(null);
    setFormData({
      ...formData,
      timetable: normalizeTimetable(user.timetable)
    });
  };

  const generateTimes = (fromTime, toTime, breakFrom, breakTo, interval) => {
    if (!fromTime || !toTime || !interval) return [];
    const times = [];
    let currentTime = fromTime;
    while (currentTime < toTime) {
      if (breakFrom && breakTo && currentTime >= breakFrom && currentTime < breakTo) {
        currentTime = breakTo;
      } else {
        times.push(currentTime);
        currentTime = addMinutes(currentTime, interval);
      }
    }
    return times;
  };
  const addMinutes = (time, minutes) => {
    const [hours, mins] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const newMinutes = (totalMinutes % 60).toString().padStart(2, "0");
    return `${newHours}:${newMinutes}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  if (!user) return <Typography>Cargando perfil...</Typography>;

  return (
    <Box
      maxWidth={"100%"}
      px={{ xs: 1, sm: 2 }}
      py={{ xs: 1, sm: 2 }}
      sx={{
        overflowX: "hidden",
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        spacing={2}
        p={2}
        borderRadius={1}
        mb={2}
        sx={{
          background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)",
          color: "white",
          boxShadow: 3,
        }}
      >
        <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} color="white">
          {esAsistente ? "Mi Perfil Personal" : "Mi Perfil Profesional"}
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
          {canSeePlanChip && (
            <Chip
              label={
                hasActiveSubscription
                  ? `Plan activo: ${activePlanName}${planLevel === 'teams' ? ' (Equipo)' : ''}`
                  : 'Sin suscripción activa'
              }
              color={hasActiveSubscription ? 'success' : 'default'}
              variant="filled"
              clickable
              onClick={() => {
                setSubscriptionModalOpen(true);
              }}
              sx={{
                mr: 1,
                backgroundColor: hasActiveSubscription ? '#2ecc71' : 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: 'pointer',
                border: '1px solid white',
              }}
            />
          )}
          {!esAsistente && (
            <Button startIcon={<PreviewIcon />} variant="contained" sx={{ background: 'white', color: '#2596be' }} onClick={() => setModalOpen(true)}>
              Vista previa
            </Button>
          )}
          {editProfileMode ? (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveProfileClick}
                sx={{ mr: 1, background: "#2ecc71", color: "white" }}
              >
                Guardar cambios
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCancelProfileClick}
                sx={{ background: "#e74c3c", color: "white" }}
              >
                Cancelar
              </Button>
            </>
          ) : (
            (esAsistente ? tab === 0 : (tab === 0 || tab === 1)) && (
              <Button
                variant="contained"
                startIcon={<ManageAccountsIcon />}
                onClick={handleEditProfileClick}
                sx={{ background: "white", color: "#2596be" }}
              >
                Configurar perfil
              </Button>
            )
          )}
        </Box>
      </Stack>
      <Box
        sx={{
          minWidth: isMobile ? "100%" : "100%",
          display: 'flex',
          justifyContent: 'center',
          mt: -2,
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          mb: 0,
          overflowX: 'auto'
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => {
            if (noSubscription) return;
            setTab(v);
          }}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          aria-label="tabs"
          sx={{ width: '100%', maxWidth: '100%' }}
        >
          <Tab label="Información Personal" disabled={noSubscription} />
          {!esAsistente && <Tab label="Información Profesional" disabled={noSubscription} />}
          {!esAsistente && <Tab label="Horarios" disabled={noSubscription} />}
          {!esAsistente && <Tab label="Servicios" disabled={noSubscription} />}
          <Tab label="Mensajes" disabled={noSubscription} sx={{ display: canSeeMensajesTab ? 'flex' : 'none' }} />
        </Tabs>
      </Box>

      {/* Información Personal */}
      {tab === 0 && (
  <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2} flexWrap="wrap" mt={2}>
          <Card 
            sx={{ 
              flex: 1, 
              width: isMobile ? "100%" : 400, 
              mb: isMobile ? 2 : 0,
              border: "2px solid #e3f2fd",
              "&:hover": {
                boxShadow: 3,
                borderColor: "#2596be",
              }, }}>
            <CardHeader title="Foto de Perfil" subheader={esAsistente ? "Tu imagen de perfil personal" : "Esta imagen será visible para tus pacientes"} />
            <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box mb={2}>
                <FotoPerfil ref={fotoPerfilRef} size={isMobile ? 200 : 240} />
              </Box>
            </CardContent>
          </Card>
          <Card 
            sx={{ 
              flex: 2,
              width: '100%',
              border: "2px solid #e3f2fd",
              "&:hover": {
                boxShadow: 3,
                borderColor: "#2596be",
              },
            }}>
            <CardHeader title="Datos Personales" subheader="Información básica de contacto" />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Nombre"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  fullWidth
                  disabled={!editProfileMode}
                />
                <TextField
                  label="Celular"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  fullWidth
                  disabled={!editProfileMode}
                />
                {!esAsistente && (
                  <TextField
                    label="Dirección"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    fullWidth
                    disabled={!editProfileMode}
                  />
                )}
                <TextField
                  label="Correo electrónico"
                  name="email"
                  value={user.email}
                  onChange={handleChange}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Correo para Google Calendar"
                  name="googleEmail"
                  value={formData.googleEmail}
                  onChange={handleChange}
                  fullWidth
                  disabled={!editProfileMode}
                  helperText="Usaremos este correo para sincronizar con Google Calendar"
                />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Información Profesional */}
      {!esAsistente && !noSubscription && tab === 1 && (
  <Box display="flex" flexDirection={isMobile ? "column" : "row"} gap={2} flexWrap="wrap" mt={2}>
          <Card 
          sx={{ flex: 1,
           width: isMobile ? "100%" : "auto", 
           mb: isMobile ? 2 : 0,
           border: "2px solid #e3f2fd",
            "&:hover": {
              boxShadow: 3,
              borderColor: "#2596be",
            },
           }}>
            <CardHeader title="Información Profesional" subheader="Detalles sobre tu especialidad y experiencia" />
            <CardContent>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <TextField
                    label="Título Profesional"
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    disabled={!editProfileMode}
                  >
                    {especialidades.map((esp) => (
                      <MenuItem key={esp} value={esp}>{esp}</MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth>
                  <TextField
                    label="Especialidad"
                    name="especialidad_principal"
                    value={formData.especialidad_principal}
                    onChange={handleChange}
                    disabled={!editProfileMode}
                  >
                    {especialidades.map((esp) => (
                      <MenuItem key={esp} value={esp}>{esp}</MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth>
                  <TextField
                    label="Años de experiencia"
                    name="experiencia"
                    value={formData.experiencia}
                    onChange={handleChange}
                    type="number"
                    disabled={!editProfileMode}
                  />
                </FormControl>
              </Stack>
              {esAdminSucursal && (
                <FormControlLabel
                  control={
                    <MuiSwitch
                      checked={!!formData.adminAtiendePersonas}
                      onChange={e =>
                        setFormData({ ...formData, adminAtiendePersonas: e.target.checked })
                      }
                      disabled={!editProfileMode}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      Como administrador atenderé personas
                      <Tooltip title="Se sugiere actualizar la página si cambias este parámetro y necesitas volver a cambiarlo" arrow>
                        <HelpOutlineIcon fontSize="small" sx={{ ml: 1, color: 'grey.600', cursor: 'pointer' }} />
                      </Tooltip>
                    </Box>
                  }
                />
              )}
            </CardContent>
          </Card>
          <Card 
          sx={{ flex: 1, 
            width: '100%',
            border: "2px solid #e3f2fd",
            "&:hover": {
              boxShadow: 3,
              borderColor: "#2596be",
            }, }}>
            <CardHeader title="Biografía Profesional" subheader="Esta información será visible en tu perfil público" />
            <CardContent>
              <TextField
                label="Biografía"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                fullWidth
                multiline
                minRows={6}
                disabled={!editProfileMode}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Modalidades de atención</Typography>
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={!!formData.cita_presencial}
                    onChange={e =>
                      setFormData({ ...formData, cita_presencial: e.target.checked })
                    }
                    disabled={!editProfileMode}
                  />
                }
                label={<><PlaceIcon sx={{ mr: 1 }} />Presencial</>}
              />
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={!!formData.cita_virtual}
                    onChange={e =>
                      setFormData({ ...formData, cita_virtual: e.target.checked })
                    }
                    disabled={!editProfileMode}
                  />
                }
                label={<><VideoCameraFrontIcon sx={{ mr: 1 }} />Telemedicina</>}
                disabled={!editProfileMode || !canUseTelemedicina}
              />
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={!!formData.cita_domicilio}
                    onChange={e =>
                      setFormData({ ...formData, cita_domicilio: e.target.checked })
                    }
                    disabled={!editProfileMode}
                  />
                }
                label={<><HomeWorkIcon sx={{ mr: 1 }} />Domicilio</>}
              />
              {!canUseTelemedicina && (
                <Typography variant="caption" color="textSecondary">
                  La videoconsulta está disponible en el Plan Avanzado y Teams.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Horarios */}
      {/* Horarios */}
      {!esAsistente && !noSubscription && tab === 2 && (
        <Box mt={2}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EditCalendarIcon sx={{color:'#2596be'}} />
                  <Typography variant="h5" fontWeight={600}>
                    Gestión de Horarios de Atención
                  </Typography>
                </Box>
              }
              subheader="Configura tus bloques de horarios de atención. Puedes tener múltiples bloques con diferentes configuraciones."
              action={
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddSchedule}
                  sx={{
                    background: "#2596be",
                    color: "white",
                  }}
                >
                  Agregar Horario
                </Button>
              }
            />
          </Card>
          {formData.timetable.length === 0 ? (
            <Card sx={{ textAlign: "center", py: 6 }}>
              <CardContent>
                <EditCalendarIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No tienes horarios configurados
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3}>
                  Agrega tu primer bloque de horarios para que los pacientes puedan agendar citas contigo.
                </Typography>
                <Button variant="contained" sx={{backgroundColor:'#2596be', color:'white'}} startIcon={<AddIcon />} onClick={handleAddSchedule} size="large">
                  Crear Primer Horario
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              {formData.timetable.map((schedule, index) => (
                <Box
                  key={index}
                  ref={(el) => {
                    if (el) scheduleRefs.current[index] = el;
                  }}
                >
                  {editingScheduleIndex === index ? (
                    <ScheduleEditor
                      schedule={schedule}
                      index={index}
                      onChange={handleScheduleChange}
                      onSave={handleSaveSchedule}
                      onCancel={handleCancelScheduleEdit}
                      overlaps={overlapsByIndex[index] || []}
                      shouldFlash={!!flashScheduleIndices[index]}
                      canUseOverbooking={canUseOverbooking}
                    />
                  ) : (
                    <ScheduleBlock
                      schedule={schedule}
                      index={index}
                      isEditing={editingScheduleIndex !== null}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                      overlaps={overlapsByIndex[index] || []}
                      shouldFlash={!!flashScheduleIndices[index]}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
          {/* Resumen de horarios */}
          {formData.timetable.length > 0 && (
            <Card sx={{ mt: 3, background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)", overflow: 'hidden' }}>
              <CardContent>
                <Typography variant="h6" color="white" gutterBottom>
                  📊 Resumen de Disponibilidad
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={{ xs: 2, sm: 4 }}>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {formData.timetable.length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Bloques de horario
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {formData.timetable.reduce(
                        (total, schedule) => total + computeTotalSlotsForSchedule(schedule),
                        0,
                      )}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Total de horas disponibles
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {[...new Set(formData.timetable.flatMap((s) => s.days || []))].length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Días únicos de atención
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {formData.timetable.length > 0
                        ? Math.min(...formData.timetable.map((s) => s.interval || 30))
                        : 0}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Min. intervalo (min)
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Sincroniza tu calendario con Google Calendar o ICalendar (Plan Avanzado / Teams)" arrow>
                  <Box mt={3} display="flex" justifyContent="center" gap={2}>
                    {canSyncCalendar ? (
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<CalendarTodayIcon />}
                        onClick={() => setModalSyncOpen(true)}
                      >
                        Sincronizar con calendarios externos
                      </Button>
                    ) : (
                      <Typography variant="body2" color="rgba(255,255,255,0.9)">
                        Sincronización de calendarios disponible en Plan Avanzado y Teams.
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Servicios */}
      {!esAsistente && !noSubscription && tab === 3 && (
        <Box mt={2}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <EditIcon sx={{color:'#2596be'}} />
                  <Typography variant="h5" fontWeight={600}>
                    Gestión de Servicios y Tarifas
                  </Typography>
                </Box>
              }
              subheader="Define los servicios que ofreces, sus precios y modalidades de atención para que los pacientes conozcan tu oferta."
              action={
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={handleAddServicio}
                  sx={{
                    background: "#2596be",
                    color: "white",
                  }}
                >
                  Agregar Servicio
                </Button>
              }
            />
          </Card>
          
          {user.servicios && user.servicios.length === 0 ? (
            <Card sx={{ textAlign: "center", py: 6 }}>
              <CardContent>
                <EditIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No tienes servicios configurados
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3}>
                  Agrega los servicios que ofreces para que los pacientes puedan conocer tus tarifas y modalidades de atención.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddServicio} 
                  size="large"
                  sx={{backgroundColor:'#2596be', color:'white'}}
                >
                  Crear Primer Servicio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Box>
              {user.servicios.map((servicio, index) => (
                <Card 
                  key={index} 
                  variant="outlined" 
                  sx={{ 
                    mb: 2,
                    border: "2px solid #e3f2fd",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "#2596be",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  <CardContent sx={{ pb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <EditIcon sx={{color:'#2596be'}} />
                        <Typography variant="h6" fontWeight={600}>
                          {servicio.tipo}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditServicio(servicio, index)} 
                          sx={{ color: "#1976d2" }}
                          disabled={deletingServicioIndex === index}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteServicio(index)} 
                          sx={{ color: "#d32f2f" }}
                          disabled={deletingServicioIndex === index}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {servicio.descripcion && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {servicio.descripcion}
                      </Typography>
                    )}
                    
                    <Box display="flex" flexWrap="wrap" gap={3}>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="textSecondary">
                            Duración:
                          </Typography>
                        </Box>
                        <Chip label={servicio.duracion} size="small" color="primary" variant="outlined" />
                      </Box>
                      
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="textSecondary">
                            💰 Precio:
                          </Typography>
                        </Box>
                        <Chip label={`$${servicio.precio}`} size="small" color="success" variant="outlined" />
                      </Box>
                      
                      <Box>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2" color="textSecondary">
                            Modalidad:
                          </Typography>
                        </Box>
                        <Chip 
                          icon={(() => {
                            const m = (servicio?.modalidad || '').toString();
                            const hasPres = m.includes('Presencial');
                            const hasTele = m.includes('Telemedicina');
                            const hasDom = m.includes('Domicilio');
                            const count = [hasPres, hasTele, hasDom].filter(Boolean).length;
                            if (count >= 2) return <EditIcon />;
                            if (hasPres) return <PlaceIcon />;
                            if (hasTele) return <VideoCameraFrontIcon />;
                            if (hasDom) return <HomeWorkIcon />;
                            return <EditIcon />;
                          })()} 
                          label={servicio.modalidad} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          
          {/* Resumen de servicios */}
          {user.servicios && user.servicios.length > 0 && (
            <Card sx={{ mt: 3, background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)", overflow: 'hidden' }}>
              <CardContent>
                <Typography variant="h6" color="white" gutterBottom>
                  📋 Resumen de Servicios
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={{ xs: 2, sm: 4 }}>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {user.servicios.length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Servicios disponibles
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      ${Math.min(...user.servicios.map(s => parseInt(s.precio) || 0)).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Precio mínimo
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {[...new Set(user.servicios.map(s => s.modalidad))].length}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Modalidades únicas
                    </Typography>
                  </Box>
                  <Box textAlign="center" flex={1} sx={{ minWidth: 0 }}>
                    <Typography variant="h4" color="white" fontWeight="bold">
                      {Math.round(user.servicios.reduce((acc, s) => {
                        const minutes = parseInt(s.duracion.match(/\d+/)?.[0]) || 60;
                        return acc + minutes;
                      }, 0) / user.servicios.length)}
                    </Typography>
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Duración promedio (min)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      <SubscriptionPlansModal
        open={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
      />

      {!esAsistente && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          aria-labelledby="modal-perfil-profesional"
          aria-describedby="modal-detalle-profesional"
        >
          <Box>
            <ModalPerfilProfesional
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              profesional={user}
            />
          </Box>
        </Modal>
      )}

      {!esAsistente && (
        <SincronizacionCalendarios
          open={modalSyncOpen}
          onClose={() => setModalSyncOpen(false)}
          user={user}
          onSynced={(email) => {
            try {
              setFormData(prev => ({ ...(prev || {}), googleEmail: email }));
              if (typeof showAlert === 'function') showAlert('success', `Correo de Google sincronizado: ${email}`);
            } catch(_) {}
          }}
        />
      )}

      {/* Mensajes Automáticos */}
      {canSeeMensajesTab && tab === 4 && (
        <MensajesAutomaticos
          formData={formData}
          onChange={handleChange}
          editProfileMode={editProfileMode}
          isMobile={isMobile}
        />
      )}

      {/* Modal de Servicios */}
      <ModalServicio
        open={modalServicioOpen}
        onClose={handleCloseModalServicio}
        servicio={servicioEditing}
        index={servicioEditingIndex}
        isEditing={servicioEditing !== null}
      />
    </Box>
  );
}

export default PerfilPage;