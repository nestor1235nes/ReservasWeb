import React, { useEffect, useState } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Button, Drawer, Slide } from '@mui/material';
import '../ui/ModalBuscarPaciente.css';
import { useReserva } from '../../context/reservaContext';
import MotorBusqueda from '../MotorBusqueda';
import DespliegueEventos from '../PanelDespliegue/DespliegueEventos';

const BuscarTodosPacientes = ({ open, onClose }) => {
  const { getReservas } = useReserva();
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    const fetchPacientes = async () => {
      const data = await getReservas();
      const pacientesData = data.map(reserva => reserva.paciente);
      setPacientes(pacientesData);
      setReservas(data);
    };
    if (open) {
      fetchPacientes();
    }
  }, [open, getReservas]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleViewFicha = (paciente) => {
    const event = reservas.find(reserva => reserva.paciente.rut === paciente.rut);
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedEvent(null), 500); // Espera que termine la animación antes de desmontar
  };

  const filteredPacientes = pacientes.filter((paciente) =>
    paciente.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose}>
      <React.Fragment>
        <Box className="modal-box" sx={{ width: window.innerWidth < 600 ? '100%' : '50%', height: '80%', background: '#f1eeee'}}>
          <Typography variant="h6" gutterBottom textAlign="center" backgroundColor="primary.main" borderRadius={1} color="white"> 
            Pacientes Registrados
          </Typography>
          <MotorBusqueda onSearch={handleSearch} />
          <List className="modal-list">
            {filteredPacientes.map((paciente) => (
              <Box sx={{ width: '100%', background:'white', marginBottom:'5px', borderRadius:'5px', boxShadow: '3' }} key={paciente.rut}>
                <ListItem key={paciente.rut}>
                  <ListItemText primary={paciente.nombre} secondary={'Rut: ' + paciente.rut} />
                  <Button variant="contained" color="primary" onClick={() => handleViewFicha(paciente)}>
                    Ver ficha
                  </Button>
                </ListItem>
              </Box>
            ))}
          </List>
          <Box className="modal-footer">
            <Button variant="contained" color="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </Box>
        </Box>
        <Drawer
          anchor={window.innerWidth < 600 ? 'bottom' : 'right'}
          open={drawerOpen}
          onClose={handleCloseDrawer}
          className="drawer-over-modal"
        >
          <Slide
            direction={window.innerWidth < 600 ? 'down' : 'left'}
            in={drawerOpen}
            mountOnEnter
            unmountOnExit
            timeout={500}
          >
            <Box>
              <DespliegueEventos event={selectedEvent} onClose={handleCloseDrawer} fetchReservas={getReservas} />
            </Box>
          </Slide>
        </Drawer>
      </React.Fragment>
    </Modal>
  );
};

export default BuscarTodosPacientes;