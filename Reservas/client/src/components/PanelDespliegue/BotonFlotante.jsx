import React, { useState, useEffect } from 'react';
import { Fab, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AlarmOffIcon from '@mui/icons-material/AlarmOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import AgregarPaciente from '../Modales/AgregarPaciente';
import BuscarTodosPacientes from '../Modales/BuscarTodosPacientes';
import LiberarHoras from '../Modales/LiberarHoras';
import { useSucursal } from '../../context/sucursalContext';
import { useAuth } from '../../context/authContext';


const BotonFlotante = ({ onClick, fetchReservas, gapi }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openAgregarPacienteSin, setOpenAgregarPacienteSin] = useState(false);
  const [openBuscarTodosLosPacientes, setOpenBuscarTodosLosPacientes] = useState(false);
  const [openLiberarHoras, setOpenLiberarHoras] = useState(false);
  const [sucursal, setSucursal] = useState(null);
  const { esAdmin } = useSucursal();
  const { user } = useAuth();

  useEffect(() => {
    const fetchEsAdmin = async () => {
      const res = await esAdmin(user.id);
      setSucursal(res);
      console.log(res);
    }
    fetchEsAdmin();
  }, [user.id, esAdmin]);

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
    } else if( option === 'Registrar nuevo empleado') {
      onClick();
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
        {sucursal && (
          <MenuItem onClick={() => handleMenuItemClick('Registrar nuevo empleado')}>
            <ListItemIcon>
              <PersonAddIcon />
            </ListItemIcon>
            <ListItemText primary="Registrar nuevo empleado" />
          </MenuItem>
        )}
      </Menu>
      
      <AgregarPaciente open={openAgregarPacienteSin} onClose={() => setOpenAgregarPacienteSin(false)} fetchReservas={fetchReservas} gapi={gapi}/>
      <BuscarTodosPacientes open={openBuscarTodosLosPacientes} onClose={() => setOpenBuscarTodosLosPacientes(false)} />
      <LiberarHoras open={openLiberarHoras} onClose={() => setOpenLiberarHoras(false)} fetchReservas={fetchReservas} gapi={gapi} />
    </>
  );
};

export default BotonFlotante;