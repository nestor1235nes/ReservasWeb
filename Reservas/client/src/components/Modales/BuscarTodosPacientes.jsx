import React, { useEffect, useState } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import '../ui/ModalBuscarPaciente.css';
import { usePaciente } from '../../context/pacienteContext';
import MotorBusqueda from '../MotorBusqueda';

const BuscarTodosPacientes = ({ open, onClose }) => {
  const { getPacientes } = usePaciente();
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPacientes = async () => {
      const data = await getPacientes();
      setPacientes(data);
    };
    if (open) {
      fetchPacientes();
    }
  }, [open, getPacientes]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const filteredPacientes = pacientes.filter((paciente) =>
    paciente.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Box className="modal-box">
        <Typography variant="h6" gutterBottom textAlign="center">
          Pacientes Registrados
        </Typography>
        <MotorBusqueda onSearch={handleSearch} />
        <List className="modal-list">
          {filteredPacientes.map((paciente) => (
            <ListItem key={paciente.rut}>
              <ListItemText primary={paciente.nombre} secondary={'Rut: ' + paciente.rut} />
              <Button variant="contained" color="secondary">
                Ver ficha
              </Button>
            </ListItem>
          ))}
        </List>
        <Box className="modal-footer">
          <Button variant="contained" color="primary" onClick={onClose}>
            Cerrar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default BuscarTodosPacientes;