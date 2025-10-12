import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import localeData from 'dayjs/plugin/localeData';
import { useAuth } from '../context/authContext';
import { getBlockedDaysRequest } from '../api/funcion';

dayjs.extend(localeData);
dayjs.locale('es');

const ProfesionalBusquedaHoras = ({ formData, setFormData, obtenerHorasDisponibles }) => {
  const { user } = useAuth();
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (user && formData.diaPrimeraCita) {
        const response = await obtenerHorasDisponibles(user.id, formData.diaPrimeraCita);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
    };
    fetchHorasDisponibles();
  }, [user, formData.diaPrimeraCita, obtenerHorasDisponibles]);

  useEffect(() => {
    if (user && user.timetable) {
      // Consolidar todos los días de todos los bloques de horario
      const todosLosDias = user.timetable.flatMap(bloque => bloque.days);
      // Eliminar duplicados usando Set
      const diasUnicos = [...new Set(todosLosDias)];
      setDiasDeTrabajo(diasUnicos);
      console.log('Días de trabajo:', diasUnicos); // Debug
    }
  }, [user]);

  // Cargar días bloqueados del profesional
  useEffect(() => {
    const loadBlocked = async () => {
      if (!user?.id && !user?._id) return;
      try {
        const res = await getBlockedDaysRequest(user.id || user._id);
        setBlockedDays(res?.data?.blockedDays || []);
      } catch (e) {
        setBlockedDays([]);
      }
    };
    loadBlocked();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Traducción de días en inglés a español para comparación
  const diasSemana = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <DatePicker
        label="Fecha de Cita"
        value={formData.diaPrimeraCita ? dayjs(formData.diaPrimeraCita) : null}
        onChange={(newValue) => {
          const valid = newValue && typeof newValue.isValid === 'function' && newValue.isValid();
          setFormData({ ...formData, diaPrimeraCita: valid ? newValue.format('YYYY-MM-DD') : '' });
        }}
        minDate={dayjs().startOf('day')}
        shouldDisableDate={(date) => {
          // Bloquear días pasados
          if (dayjs(date).isBefore(dayjs().startOf('day'), 'day')) return true;
          const dayName = diasSemana[date.day()];
          // Bloquear días no laborables
          const notWorking = !diasDeTrabajo.includes(dayName);
          // Bloquear días bloqueados por el profesional
          const dateStr = dayjs(date).format('YYYY-MM-DD');
          const isBlocked = blockedDays.includes(dateStr);
          return notWorking || isBlocked;
        }}
        slotProps={{
          textField: {
            fullWidth: true,
            margin: 'normal',
            required: true,
            inputProps: { readOnly: true }
          }
        }}
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Hora de Cita</InputLabel>
        <Select
          name="hora"
          value={formData.hora}
          onChange={handleChange}
        >
          {horasDisponibles.map((hora) => (
            <MenuItem key={hora} value={hora}>
              {hora}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Mensaje"
        name="mensajePaciente"
        value={formData.mensajePaciente}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
    </LocalizationProvider>
  );
};

export default ProfesionalBusquedaHoras;