import React, { useState } from 'react';
import { TextField, Box } from '@mui/material';

const Rutificador = ({ onRutValidated, onValidChange, exampleText }) => {
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
    const inputRut = (e.target.value || '').toString().trim();
    setRut(inputRut);

    // No mostrar error mientras el usuario escribe hasta que tenga formato completo NNNNNNNN-D
    if (inputRut === '') {
      setError('');
      onValidChange && onValidChange(false);
      return;
    }

    // Si aún no completa el dígito verificador, no marcar error
    const partialPattern = /^[0-9]+-?[0-9kK]?$/;
    if (!partialPattern.test(inputRut)) {
      // Caracteres no permitidos: aún no mostrar error para no molestar mientras escribe
      setError('');
      onValidChange && onValidChange(false);
      return;
    }

    // Validar solo cuando coincide el patrón completo NNNNNNNN-DV
    const fullPattern = /^[0-9]+-[0-9kK]$/;
    if (!fullPattern.test(inputRut)) {
      setError('');
      onValidChange && onValidChange(false);
      return;
    }

    if (validateRut(inputRut)) {
      setError('');
      onValidChange && onValidChange(true);
      onRutValidated(inputRut);
    } else {
      setError('El RUT ingresado no es válido.');
      onValidChange && onValidChange(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400, margin: 'auto', padding: 2 }}>
      <TextField
        label="Ingrese RUT (sin puntos y con guion)"
        value={rut}
        onChange={handleChange}
        fullWidth
        margin="normal"
        error={!!error}
        helperText={error || exampleText}
      />
    </Box>
  );
};

export default Rutificador;