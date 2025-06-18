import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useAuth } from '../context/authContext';

const ProfesionalBusquedaHoras = ({ formData, setFormData, obtenerHorasDisponibles }) => {
  const { user } = useAuth();
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (user && formData.siguienteCita) {
        const response = await obtenerHorasDisponibles(user.id, formData.siguienteCita);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
    };
    fetchHorasDisponibles();
  }, [user, formData.siguienteCita, obtenerHorasDisponibles]);

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <DatePicker
        label="Fecha de Cita"
        value={formData.siguienteCita ? dayjs(formData.siguienteCita) : null}
        onChange={(newValue) => {
          setFormData({ ...formData, siguienteCita: newValue ? newValue.format('YYYY-MM-DD') : '' });
        }}
        shouldDisableDate={(date) => {
          const dayName = date.format('dddd');
          const translatedDays = {
            Monday: "Lunes",
            Tuesday: "Martes",
            Wednesday: "Miércoles",
            Thursday: "Jueves",
            Friday: "Viernes",
            Saturday: "Sábado",
            Sunday: "Domingo",
          };
          const translatedDayName = translatedDays[dayName];
          console.log('Validando día:', translatedDayName, 'en:', diasDeTrabajo); // Debug
          return !diasDeTrabajo.includes(translatedDayName);
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
    </div>
  );
};

export default ProfesionalBusquedaHoras;