import React from 'react';
import { Box, Typography, Menu, MenuItem, Divider, Tooltip } from '@mui/material';
import { useAuth } from '../context/authContext';
import DeleteIcon from '@mui/icons-material/Delete';

const VentanaNotificaciones = ({ anchorEl, open, onClose, notifications }) => {
    const { deleteNotifications, user } = useAuth();

    const handleDeleteNotifications = async () => {
        console.log(user);
        await deleteNotifications(user._id || user.id);
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            PaperProps={{
                elevation: 4,
                sx: {
                    width: 400,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transform: 'translateX(-20px)', 
                },
                transform: 'translateX(-20px)',
            }}
        >
            <Box p={2} bgcolor="#f5f5f5" display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight="bold" color="primary" >
                    Notificaciones
                </Typography>
                <Tooltip title="Eliminar todas las notificaciones">
                    <DeleteIcon fontSize="small" color="primary" onClick={handleDeleteNotifications} style={{ cursor: 'pointer' }} />
                </Tooltip>
            </Box>
            <Divider />
            <Box maxHeight={300} overflow="auto">
                {notifications.length === 0 ? (
                    <Typography p={2} textAlign="center" color="text.secondary">
                        No hay notificaciones
                    </Typography>
                ) : (
                    notifications.slice(0, 6).map((notification, index) => (
                        <MenuItem
                            key={index}
                            sx={{
                                '&:hover': { bgcolor: '#f0f0f0' },
                                whiteSpace: 'normal', 
                                wordBreak: 'break-word', 
                                maxWidth: '400px',  
                                borderBottom: '1px solid rgb(227, 227, 227)',
                            }}
                        >
                            {notification}
                        </MenuItem>
                    ))
                )}
            </Box>
        </Menu>
    );
};

export default VentanaNotificaciones;
