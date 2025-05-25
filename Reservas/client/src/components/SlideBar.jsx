import React from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const menuItems = [
  { label: 'Día Actual', icon: <TodayIcon />, path: '/hoy' },
  { label: 'Calendario', icon: <CalendarMonthIcon />, path: '/calendario' },
  { label: 'Pacientes', icon: <PeopleIcon />, path: '/pacientes' },
  { label: 'Telemedicina', icon: <VideoCallIcon />, path: '/telemedicina' },
  { label: 'Gráficos y Reportes', icon: <BarChartIcon />, path: '/reportes' },
  { label: 'Perfil', icon: <AccountCircleIcon />, path: '/perfil' },
  { label: 'Cerrar sesión', icon: <LogoutIcon />, logout: true },
];

const SlideBar = ({ selected, onSelect }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleClick = async (item) => {
    onSelect(item.label);
    if (item.logout) {
      await logout();
      navigate('/login');
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <Box
      width={240}
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
        VidaYa
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.label}
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
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default SlideBar;