import React, { useState } from 'react';
import { Fab, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AlarmOffIcon from '@mui/icons-material/AlarmOff';
import SearchIcon from '@mui/icons-material/Search';
import AgregarPaciente from '../Modales/AgregarPaciente';
import BuscarTodosPacientes from '../Modales/BuscarTodosPacientes';
import LiberarHoras from '../Modales/LiberarHoras';


const BotonFlotante = ({ onClick, fetchReservas }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openAgregarPacienteSin, setOpenAgregarPacienteSin] = useState(false);
  const [openBuscarTodosLosPacientes, setOpenBuscarTodosLosPacientes] = useState(false);
  const [openLiberarHoras, setOpenLiberarHoras] = useState(false);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (option) => {
    if (option === 'Agregar paciente sin hora previa') {
      setOpenAgregarPacienteSin(true);
    } else if (option === 'Buscar paciente') {
      setOpenBuscarTodosLosPacientes(true);
    } else if (option === 'Liberar horas') {
      setOpenLiberarHoras(true);
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
        <MenuItem onClick={() => handleMenuItemClick('Liberar horas')}>
          <ListItemIcon>
            <LockOpenIcon />
          </ListItemIcon>
          <ListItemText primary="Liberar horas" />
        </MenuItem>
      </Menu>
      <AgregarPaciente open={openAgregarPacienteSin} onClose={() => setOpenAgregarPacienteSin(false)} fetchReservas={fetchReservas}/>
      <BuscarTodosPacientes open={openBuscarTodosLosPacientes} onClose={() => setOpenBuscarTodosLosPacientes(false)} />
      <LiberarHoras open={openLiberarHoras} onClose={() => setOpenLiberarHoras(false)} fetchReservas={fetchReservas} />
    </>
  );
};

export default BotonFlotante;