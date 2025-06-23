import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SinDatos = ({ open }) => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/perfil');
  };

  return (
    <Modal
      open={open}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="50vh"
        bgcolor="white"
        width="50%"
        margin={'auto'}
        marginTop={'20vh'}
        p={4}
        borderRadius={2}
        boxShadow={24}
      >
        <Typography id="modal-title" variant="h6" component="h2" gutterBottom>
          Actualización de Datos Requerida
        </Typography>
        <Typography id="modal-description" variant="body1" gutterBottom>
          Por favor, actualice su horario para continuar utilizando la aplicación.
        </Typography>
        <Button variant="contained" sx={{background:'#2596be', color:'white'}} onClick={handleRedirect}>
          Actualizar Datos
        </Button>
      </Box>
    </Modal>
  );
};
export default SinDatos;