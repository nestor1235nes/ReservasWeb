import React, { useEffect, useState } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Button, ListItemSecondaryAction } from '@mui/material';
import { useReserva } from '../../context/reservaContext';
import AgregarPaciente from './AgregarPaciente';
import '../ui/ModalBuscarPaciente.css';

const BuscarPacientes = ({ open, onClose, fetchReservas }) => {
  const { pacientesSinSesiones } = useReserva();
  const [pacientes, setPacientes] = useState([]);
  const [openAgregarPaciente, setOpenAgregarPaciente] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  useEffect(() => {
    const fetchPacientes = async () => {
      const data = await pacientesSinSesiones();
      setPacientes(data);
      console.log(data);
    };
    if (open) {
      fetchPacientes();
    }
  }, [open, pacientesSinSesiones]);

  const handleRegistrarClick = (paciente) => {
    setSelectedPaciente(paciente);
    setOpenAgregarPaciente(true);
  };

  const handleCloseAgregarPaciente = () => {
    setOpenAgregarPaciente(false);
    setSelectedPaciente(null);
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box className="modal-box">
          <Typography variant="h6" gutterBottom textAlign="center">
            Pacientes sin registrar
          </Typography>
          <List className="modal-list">
            {pacientes.map((paciente) => (
              <ListItem
                key={paciente.rut}
                secondaryAction={
                  <Button variant="contained" color="secondary" onClick={() => handleRegistrarClick(paciente)}>
                    Registrar
                  </Button>
                }
              >
                <ListItemText primary={paciente.nombre} secondary={'Rut: ' + paciente.rut} />
              </ListItem>
            ))}
          </List>
          <Button variant="contained" color="primary" onClick={onClose}>
            Cerrar
          </Button>
        </Box>
      </Modal>
      {selectedPaciente && (
        <AgregarPaciente
          open={openAgregarPaciente}
          onClose={() => {
            handleCloseAgregarPaciente();
            onClose();
          }}
          data={selectedPaciente}
          fetchReservas={fetchReservas}
        />
      )}
    </>
  );
};

export default BuscarPacientes;