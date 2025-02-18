import React, { useState } from 'react';
import { Fab, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AlarmOnIcon from '@mui/icons-material/AlarmOn';
import AlarmOffIcon from '@mui/icons-material/AlarmOff';
import SearchIcon from '@mui/icons-material/Search';
import AgregarPaciente from '../Modales/AgregarPaciente';
import BuscarPacientes from '../Modales/BuscarPacientesCon';
import BuscarTodosPacientes from '../Modales/BuscarTodosPacientes';

const BotonFlotante = ({ onClick, fetchReservas }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openAgregarPacienteSin, setOpenAgregarPacienteSin] = useState(false);
  const [openBuscarPacientes, setOpenBuscarPacientes] = useState(false);
  const [openBuscarTodosLosPacientes, setOpenBuscarTodosLosPacientes] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (option) => {
    if (option === 'Agregar paciente sin hora previa') {
      setOpenAgregarPacienteSin(true);
    } else if (option === 'Agregar paciente con hora previa') {
      setOpenBuscarPacientes(true);
    } else if (option === 'Buscar paciente') {
      setOpenBuscarTodosLosPacientes(true);
    }
    handleClose();
  };

  return (
    <>
      <Tooltip title="Desplegar opciones" placement="top">
        <Fab color="primary" aria-label="add" style={{ bottom: '50px', right: '30px' }} onClick={handleClick}>
          <AddIcon />
        </Fab>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        style={{ top: '-90px', right: '10px' }}
      >
        <MenuItem onClick={() => handleMenuItemClick('Agregar paciente con hora previa')}>
          <ListItemIcon>
            <AlarmOnIcon />
          </ListItemIcon>
          <ListItemText primary="Agregar paciente con hora previa" />
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick('Agregar paciente sin hora previa')}>
          <ListItemIcon>
            <AlarmOffIcon />
          </ListItemIcon>
          <ListItemText primary="Agregar paciente sin hora previa" />
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick('Buscar paciente')}>
          <ListItemIcon>
            <SearchIcon />
          </ListItemIcon>
          <ListItemText primary="Buscar paciente" />
        </MenuItem>
      </Menu>
      <AgregarPaciente open={openAgregarPacienteSin} onClose={() => setOpenAgregarPacienteSin(false)} fetchReservas={fetchReservas}/>
      <BuscarPacientes open={openBuscarPacientes} onClose={() => setOpenBuscarPacientes(false)} />
      <BuscarTodosPacientes open={openBuscarTodosLosPacientes} onClose={() => setOpenBuscarTodosLosPacientes(false)} />
    </>
  );
};

export default BotonFlotante;