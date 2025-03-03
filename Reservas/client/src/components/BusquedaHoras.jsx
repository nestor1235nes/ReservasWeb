import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

const BusquedaHoras = ({ formData, setFormData, profesionales, obtenerHorasDisponibles }) => {
  const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
  const [horasDisponibles, setHorasDisponibles] = useState([]);

  useEffect(() => {
    const fetchHorasDisponibles = async () => {
      if (formData.profesional && formData.diaPrimeraCita) {
        const response = await obtenerHorasDisponibles(formData.profesional, formData.diaPrimeraCita);
        const horas = response.times || [];
        setHorasDisponibles(horas);
      }
    };
    fetchHorasDisponibles();
  }, [formData.profesional, formData.diaPrimeraCita, obtenerHorasDisponibles]);

  const handleProfesionalChange = (e) => {
    const profesionalId = e.target.value;
    setFormData({ ...formData, profesional: profesionalId });

    const profesionalSeleccionado = profesionales.find((prof) => prof._id === profesionalId);

    if (profesionalSeleccionado && profesionalSeleccionado.timetable) {
      const dias = profesionalSeleccionado.timetable[0].days;
      setDiasDeTrabajo(dias);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
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

export default BusquedaHoras;