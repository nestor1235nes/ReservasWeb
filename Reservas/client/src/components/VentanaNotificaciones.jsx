import React from 'react';
import { Box, Typography, Menu, MenuItem, Divider, Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { deleteAllNotificationsRequest } from '../api/notifications';

const VentanaNotificaciones = ({ anchorEl, open, onClose, notifications, onRefresh }) => {

    const handleDeleteNotifications = async () => {
        try {
            await deleteAllNotificationsRequest();
            if (onRefresh) onRefresh();
            onClose();
        } catch (error) {
            console.error('Error eliminando notificaciones:', error);
        }
    };

    // Determinar icono según tipo de notificación
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'new_appointment':
                return <NotificationsIcon sx={{ fontSize: 20, color: '#2596be', mr: 1 }} />;
            case 'confirmed_appointment':
                return <CheckCircleIcon sx={{ fontSize: 20, color: '#4caf50', mr: 1 }} />;
            case 'cancelled_appointment':
                return <CancelIcon sx={{ fontSize: 20, color: '#f44336', mr: 1 }} />;
            case 'subscription_expiring':
                return <InfoIcon sx={{ fontSize: 20, color: '#ff9800', mr: 1 }} />;
            default:
                return <NotificationsIcon sx={{ fontSize: 20, color: '#666', mr: 1 }} />;
        }
    };

    // Determinar color de fondo según tipo
    const getNotificationBgColor = (type) => {
        switch (type) {
            case 'new_appointment':
                return '#e3f2fd';
            case 'confirmed_appointment':
                return '#e8f5e9';
            case 'cancelled_appointment':
                return '#ffebee';
            case 'subscription_expiring':
                return '#fff3e0';
            default:
                return '#f5f5f5';
        }
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                elevation: 4,
                sx: {
                    width: 420,
                    maxWidth: '95vw',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(37, 150, 190, 0.15)',
                },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
            <Box p={2} bgcolor="#fafafa" display="flex" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="h6" fontWeight="bold" color="#2596be">
                    Notificaciones
                </Typography>
                {notifications.length > 0 && (
                    <Tooltip title="Eliminar todas las notificaciones">
                        <IconButton size="small" onClick={handleDeleteNotifications} sx={{ color: '#2596be' }}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
            <Box maxHeight={400} overflow="auto">
                {notifications.length === 0 ? (
                    <Box p={3} textAlign="center">
                        <NotificationsIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                        <Typography color="text.secondary" fontSize={14}>
                            No hay notificaciones
                        </Typography>
                    </Box>
                ) : (
                    notifications.slice(0, 10).map((notification, index) => (
                        <Box
                            key={notification._id || index}
                            sx={{
                                p: 2,
                                bgcolor: getNotificationBgColor(notification.type),
                                borderBottom: '1px solid #e0e0e0',
                                '&:hover': { 
                                    bgcolor: notification.type === 'new_appointment' ? '#d1ecf7' : 
                                             notification.type === 'confirmed_appointment' ? '#d4edda' :
                                             notification.type === 'cancelled_appointment' ? '#f8d7da' :
                                             notification.type === 'subscription_expiring' ? '#ffe0b2' : '#efefef',
                                    cursor: 'pointer'
                                },
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            <Box display="flex" alignItems="flex-start">
                                {getNotificationIcon(notification.type)}
                                <Box flex={1}>
                                    <Typography 
                                        variant="subtitle2" 
                                        fontWeight="700"
                                        sx={{ 
                                            color: '#1a1a1a',
                                            mb: 0.5 
                                        }}
                                    >
                                        {notification.title}
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: '#666',
                                            lineHeight: 1.4
                                        }}
                                    >
                                        {notification.message}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    ))
                )}
            </Box>
        </Menu>
    );
};

export default VentanaNotificaciones;
