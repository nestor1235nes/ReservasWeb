import React, { useState } from 'react';
import { TextField, Box } from '@mui/material';

const Rutificador = ({ onRutValidated }) => {
  const [rut, setRut] = useState('');
  const [error, setError] = useState('');

  const validateRut = (rut) => {
    const regex = /^[0-9]+-[0-9kK]{1}$/;
    if (!regex.test(rut)) {
      return false;
    }
    const [number, verifier] = rut.split('-');
    let sum = 0;
    let multiplier = 2;
    for (let i = number.length - 1; i >= 0; i--) {
      sum += multiplier * parseInt(number.charAt(i), 10);
      multiplier = multiplier < 7 ? multiplier + 1 : 2;
    }
    const dv = 11 - (sum % 11);
    const dvStr = dv === 11 ? '0' : dv === 10 ? 'K' : dv.toString();
    return dvStr.toUpperCase() === verifier.toUpperCase();
  };

  const handleChange = (e) => {
    const inputRut = e.target.value;
    setRut(inputRut);
    if (validateRut(inputRut)) {
      setError('');
      onRutValidated(inputRut);
    } else {
      setError('El RUT ingresado no es válido.');
    }
  };

  return (
    <Box>
      <TextField
        label="Ingrese RUT (sin puntos y con guion)"
        value={rut}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!error}
        helperText={error}
      />
    </Box>
  );
};

export default Rutificador;