import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import localeData from 'dayjs/plugin/localeData';
import { useReserva } from '../context/reservaContext';

dayjs.extend(localeData);
dayjs.locale('es');

const BusquedaHoras = ({ formData, setFormData, profesionales, obtenerHorasDisponibles }) => {
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const { getFeriados } = useReserva();


  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (formData.profesional && formData.diaPrimeraCita) {
        const response = await obtenerHorasDisponibles(formData.profesional, formData.diaPrimeraCita);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
      const feriados = await getFeriados();
      setFeriados(feriados.data);
      console.log('Feriados:', feriados.data);  
    };
    fetchHorasDisponibles();
  }, [formData.profesional, formData.diaPrimeraCita, obtenerHorasDisponibles]);

  const handleProfesionalChange = (e) => {
    const profesionalId = e.target.value;
    setFormData({ ...formData, profesional: profesionalId });

    const profesionalSeleccionado = profesionales.find((prof) => prof._id === profesionalId);

    if (profesionalSeleccionado && profesionalSeleccionado.timetable) {
      // Junta todos los días de todos los bloques y elimina duplicados
      const dias = [
        ...new Set(
          profesionalSeleccionado.timetable.flatMap((bloque) => bloque.days || [])
        ),
      ];
      setDiasDeTrabajo(dias);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Traducción de días en inglés a español para comparación
  const diasSemana = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <FormControl fullWidth margin="normal">
        <InputLabel>Profesional</InputLabel>
        <Select
          name="profesional"
          value={formData.profesional}
          onChange={handleProfesionalChange}
        >
          {profesionales.map((profesional) => (
            <MenuItem key={profesional._id} value={profesional._id}>
              {profesional.username}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <DatePicker
        label="Fecha de Cita"
        value={formData.diaPrimeraCita ? dayjs(formData.diaPrimeraCita) : null}
        onChange={(newValue) => {
          setFormData({ ...formData, diaPrimeraCita: newValue ? newValue.format('YYYY-MM-DD') : '' });
        }}
        shouldDisableDate={(date) => {
          const dayName = diasSemana[date.day()];
          // Verifica si el día no es de trabajo
          const noTrabaja = !diasDeTrabajo.includes(dayName);
          // Verifica si la fecha está en feriados (usando f.date)
          const esFeriado = feriados.some(f => f.date && dayjs(f.date).isSame(date, 'day'));
          return noTrabaja || esFeriado;
        }}
        renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
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

export default BusquedaHoras;