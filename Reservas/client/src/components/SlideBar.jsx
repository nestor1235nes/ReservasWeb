import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, Typography,
  Divider, Collapse, Stack, Toolbar, IconButton, Badge, Avatar, Tooltip,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AddLinkIcon from '@mui/icons-material/AddLink';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../context/authContext';
import { useSubscription } from '../context/subscriptionContext';
import { getUnreadCountRequest, getNotificationsRequest, markAsReadRequest } from '../api/notifications';
import VentanaNotificaciones from './VentanaNotificaciones';
import { resolveAssetUrl } from '../utils/resolveAssetUrl';
import { resolveRole, buildNavForRole, isItemDisabled, findActiveItemId, findActiveGroupId } from './navigation/navModel';
import Logo from '../assets/LOGO.png';

// navModel guarda el NOMBRE del icono para poder testearse sin React.
const ICONS = {
  Today: TodayIcon,
  CalendarMonth: CalendarMonthIcon,
  People: PeopleIcon,
  VideoCall: VideoCallIcon,
  BarChart: BarChartIcon,
  AccountCircle: AccountCircleIcon,
  AddLink: AddLinkIcon,
  GroupAdd: GroupAddIcon,
  MedicalServices: MedicalServicesIcon,
  Assessment: AssessmentIcon,
  Settings: SettingsIcon,
  MeetingRoom: MeetingRoomIcon,
  EventBusy: EventBusyIcon,
};

const inicialesUsuario = (nombre) =>
  String(nombre || '')
    .trim()
    .split(/s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

const NavIcon = ({ name }) => {
  const Cmp = ICONS[name];
  return Cmp ? <Cmp /> : null;
};

const SlideBar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, esAdminSucursal, esAsistente } = useAuth();
  const { canUseTelemedicina, canBlockHours, hasActiveSubscription, isTeams } = useSubscription();

  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const countRes = await getUnreadCountRequest();
      setUnreadCount(countRes?.data?.count || 0);

      const notifRes = await getNotificationsRequest({ limit: 10, unreadOnly: false });
      setNotifications(notifRes?.data?.notifications || []);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = (event) => setNotificationAnchorEl(event.currentTarget);

  const handleNotificationClose = async () => {
    setNotificationAnchorEl(null);
    if (unreadCount > 0) {
      try {
        await markAsReadRequest([]);
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (error) {
        console.error('Error marcando notificaciones:', error);
      }
    }
  };

  const role = resolveRole({
    esAsistente,
    esAdminSucursal,
    tieneSucursal: !!user?.sucursal,
    isTeams,
  });
  const groups = buildNavForRole(role);
  const caps = { hasActiveSubscription, canUseTelemedicina, canBlockHours };
  const activeId = findActiveItemId(location.pathname);

  const activeGroupId = findActiveGroupId(location.pathname);

  // Arranca con un solo grupo abierto: el de la pagina actual. Tras el login eso
  // es AGENDA, porque el login aterriza en /calendario.
  const [openGroups, setOpenGroups] = useState(() => ({ [activeGroupId]: true }));

  // Al navegar, el grupo de la pagina actual se abre solo, para no esconder nunca
  // el item activo dentro de un grupo cerrado. Los demas quedan como los dejo el usuario.
  useEffect(() => {
    setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  const toggleGroup = (id) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleClick = async (item) => {
    if (isItemDisabled(item, caps)) return;
    if (item.path) {
      navigate(item.path);
    }
    if (onNavigate) onNavigate();
  };

  // Cerrar sesion siempre disponible, sin importar plan ni suscripcion.
  const handleLogout = async () => {
    await logout();
    navigate('/front-users');
    if (onNavigate) onNavigate();
  };

  return (
    <Box
      width={250}
      bgcolor="#fff"
      p={2}
      display="flex"
      flexDirection="column"
      height="100vh"
      sx={{
        position: { xs: 'relative', sm: 'fixed' },
        top: 0,
        left: 0,
        zIndex: 1200,
        overflow: 'hidden',
        borderRight: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      <Toolbar sx={{ py: 1, px: '0 !important' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          component={RouterLink}
          to="/"
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <img src={Logo} alt="VitaLink" style={{ width: 150, height: 40 }} />
        </Stack>

        <Box sx={{ flex: 1 }} />

        <IconButton
          sx={{ color: 'primary.main' }}
          onClick={handleNotificationClick}
          aria-label="notificaciones"
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Toolbar>

      <VentanaNotificaciones
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        notifications={notifications}
        onRefresh={() => fetchNotifications()}
      />

      <Divider sx={{ mb: 1 }} />

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      {groups.map((group) => {
        const isOpen = Boolean(openGroups[group.id]);
        return (
          <Box key={group.id} sx={{ mb: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              onClick={() => toggleGroup(group.id)}
              sx={{
                px: 1.5,
                py: 0.75,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6 }}
              >
                {group.label}
              </Typography>
              {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Stack>

            <Collapse in={isOpen} timeout="auto" unmountOnExit={false}>
              <List disablePadding>
                {group.items.map((item) => {
                  const disabled = isItemDisabled(item, caps);
                  const active = activeId === item.id;
                  return (
                    <ListItemButton
                      key={item.id}
                      selected={active}
                      disabled={disabled}
                      onClick={() => handleClick(item)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        py: 0.75,
                        color: active ? 'primary.contrastText' : 'text.primary',
                        bgcolor: active ? 'primary.main' : 'transparent',
                        '&.Mui-selected': { bgcolor: 'primary.main' },
                        '&.Mui-selected:hover': { bgcolor: 'primary.dark' },
                        '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 40,
                          color: active ? 'primary.contrastText' : 'text.secondary',
                        }}
                      >
                        <NavIcon name={item.icon} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        );
      })}
      </Box>
      <Divider sx={{ mt: 1 }} />

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={(t) => ({
          mt: 1.5,
          p: 1.25,
          borderRadius: 2,
          bgcolor: t.palette.custom.tint[100],
        })}
      >
        <Avatar
          src={user?.fotoPerfil ? resolveAssetUrl(user.fotoPerfil) : undefined}
          sx={(t) => ({
            width: 40,
            height: 40,
            bgcolor: t.palette.primary.main,
            color: t.palette.primary.contrastText,
            fontWeight: 700,
            fontSize: 14,
          })}
        >
          {inicialesUsuario(user?.username)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
            {user?.username || 'Mi cuenta'}
          </Typography>
          {user?.sucursal?.nombre && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {user.sucursal.nombre}
            </Typography>
          )}
        </Box>

        <Tooltip title="Cerrar sesión">
          <IconButton
            size="small"
            onClick={handleLogout}
            aria-label="cerrar sesión"
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default SlideBar;
