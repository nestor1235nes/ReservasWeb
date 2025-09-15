import React, { useState } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import GiteIcon from '@mui/icons-material/Gite';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const baseMenuItems = [
  { label: 'Día Actual', icon: <TodayIcon />, path: '/hoy' },
  { label: 'Calendario', icon: <CalendarMonthIcon />, path: '/calendario' },
  { label: 'Pacientes', icon: <PeopleIcon />, path: '/pacientes' },
  { label: 'Telemedicina', icon: <VideoCallIcon />, path: '/telemedicina' },
  { label: 'Gráficos y Reportes', icon: <BarChartIcon />, path: '/reportes' },
  { label: 'Perfil', icon: <AccountCircleIcon />, path: '/perfil' },
  { label: 'Cerrar sesión', icon: <LogoutIcon />, logout: true },
];

// Opciones desplegables de "Mi empresa"
const empresaSubItems = [
  { label: 'Gestionar asistentes', icon: <GroupAddIcon />, path: '/sucursal/asistentes' },
  { label: 'Gestionar profesionales', icon: <MedicalServicesIcon />, path: '/sucursal/profesionales' },
  { label: 'Reportes', icon: <AssessmentIcon />, path: '/mi-empresa/reportes' },
];

// Opciones para asistentes
const assistantMenuItems = [
  { label: 'Calendario', icon: <CalendarMonthIcon />, path: '/calendario' },
  { label: 'Pacientes', icon: <PeopleIcon />, path: '/pacientes' },
  { label: 'Perfil', icon: <AccountCircleIcon />, path: '/perfil' },
  { label: 'Cerrar sesión', icon: <LogoutIcon />, logout: true },
];

const SlideBar = ({ selected, onSelect }) => {
  const navigate = useNavigate();
  const { logout, user, esAdminSucursal, esAsistente } = useAuth();
  const [empresaOpen, setEmpresaOpen] = useState(false);

  let menuItems;
  if (esAsistente) {
    menuItems = assistantMenuItems;
  } else if (user?.sucursal && esAdminSucursal) {
    menuItems = [
      ...baseMenuItems.slice(0, 6),
      { label: 'Mi empresa', icon: <GiteIcon />, isEmpresa: true },
      baseMenuItems[6],
    ];
  } else {
    menuItems = baseMenuItems;
  }

  const handleClick = async (item) => {
    onSelect(item.label);
    if (item.isEmpresa) {
      setEmpresaOpen((prev) => !prev);
    } else if (item.logout) {
      await logout();
      navigate('/login');
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleSubItemClick = (subItem) => {
    onSelect(subItem.label);
    navigate(subItem.path);
  };

  return (
    <Box
      width={250}
      bgcolor="#fff"
      p={2}
      display="flex"
      flexDirection="column"
      height="100vh"
      borderRight={1}
      borderColor="#0d9488"
      sx={{
        position: { xs: 'relative', sm: 'fixed' },
        top: 0,
        left: 0,
        zIndex: 1200,
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" color="#2596be" fontWeight="bold" mb={3}>
        Sessionly
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List>
        {menuItems.map((item) => (
          <React.Fragment key={item.label}>
            <ListItemButton
              selected={selected === item.label}
              onClick={() => handleClick(item)}
              sx={{
                borderRadius: 2,
                mb: 1,
                color: selected === item.label ? '#2596be' : 'inherit',
                fontWeight: selected === item.label ? 'bold' : 'normal',
              }}
            >
              <ListItemIcon sx={{ color: selected === item.label ? '#2596be' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
              {item.isEmpresa &&
                (empresaOpen ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
            {item.isEmpresa && (
              <Collapse in={empresaOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {empresaSubItems.map((subItem) => (
                    <ListItemButton
                      key={subItem.label}
                      sx={{
                        pl: 4,
                        borderRadius: 2,
                        mb: 1,
                        color: selected === subItem.label ? '#2596be' : 'inherit',
                        fontWeight: selected === subItem.label ? 'bold' : 'normal',
                      }}
                      selected={selected === subItem.label}
                      onClick={() => handleSubItemClick(subItem)}
                    >
                      <ListItemIcon sx={{ color: selected === subItem.label ? '#2596be' : 'inherit' }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText primary={subItem.label} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default SlideBar;