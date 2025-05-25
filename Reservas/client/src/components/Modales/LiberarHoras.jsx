import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { StaticDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../../context/authContext';
import { useAlert } from '../../context/AlertContext';
import sendWhatsAppMessage from '../../sendWhatsAppMessage';
import { CSSTransition } from 'react-transition-group';
import '../ui/LiberarHoras.css';

dayjs.locale('es');

const LiberarHoras = ({ open, onClose, fetchReservas, gapi }) => {
    const [fecha, setFecha] = useState('');
    const { user, liberarHoras } = useAuth();
    const showAlert = useAlert();
    const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [showCalendar, setShowCalendar] = useState(true);
    const [customMessage, setCustomMessage] = useState('');

    const handleFechaChange = (newValue) => {
        setFecha(newValue ? newValue.format('YYYY-MM-DD') : '');
        setShowCalendar(false);
    };

    const handleLiberarHoras = async () => {
        try {
            const data = {
                id: user.id || user._id,
                fecha,
            };
            const reservasLiberadas = await liberarHoras(data);
            showAlert('success', 'Horas liberadas correctamente');
            fetchReservas();
            onClose();
            console.log(user);
    
            // Eliminar eventos en Google Calendar
            
            if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                for (const reserva of reservasLiberadas.reservasLiberadas) {
                    if (reserva.paciente.eventId) {
                        console.log(reserva);
                        const request = gapi.client.calendar.events.delete({
                            calendarId: 'primary',
                            eventId: reserva.paciente.eventId,
                        });
    
                        request.execute((response) => {
                            if (response.error) {
                                console.error('Error deleting event: ', response.error);
                            } else {
                                console.log('Event deleted: ', reserva.paciente.eventId);
                            }
                        });
                    }
                }
            }
    
            if (user.idInstance) {
                if(user.defaultMessage === '' && customMessage === '') {
                    showAlert('error', 'No hay mensaje por defecto ni mensaje personalizado. No se enviará mensaje a los pacientes.');
                    return;
                }
                if(customMessage){
                    await sendWhatsAppMessage(reservasLiberadas.reservasLiberadas, customMessage, user);
                    showAlert('success', 'Horas liberadas y mensaje enviado a los pacientes');
                    return;
                }
                else{
                    const message = user.defaultMessage;
                    await sendWhatsAppMessage(reservasLiberadas.reservasLiberadas, message, user);
                    showAlert('success', 'Horas liberadas y mensaje enviado a los pacientes');
                    return;
                }
            }
        } catch (error) {
            console.error(error);
            showAlert('error', 'Error al liberar las horas');
        }
    };

    const handleConfirmOpen = () => {
        setConfirmOpen(true);
    };

    const handleConfirmClose = (confirmed) => {
        setConfirmOpen(false);
        if (confirmed) {
            handleLiberarHoras();
        }
    };

    useEffect(() => {
        if (user && user.timetable && user.timetable.length > 0) {
            const dias = user.timetable[0].days;
            setDiasDeTrabajo(dias);
        }
    }, [user]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                p={1}
                bgcolor="#eeee"
                borderRadius={2}
                boxShadow={3}
                width={window.innerWidth < 600 ? '90%' : 530}
                minHeight={window.innerHeight < 600 ? '90%' : 600}
                maxheight={window.innerHeight < 600 ? '90%' : 670}
                overflow="auto"
                mx="auto"
                my="1%"
            >
                <Box backgroundColor="primary.main" borderRadius={'5px'} color={"white"} p={0.5} mb={0}>
                    <Typography variant="h6" textAlign={'center'} gutterBottom>Liberar Horas</Typography>
                </Box>
                
                <Box backgroundColor="white" borderRadius={'5px'} p={1} mb={0}>
                    <Box p={1} mb={0}>
                        <Typography variant="body1" gutterBottom>
                            Seleccione el día que desea liberar horas
                        </Typography>
                    </Box>
                    <Box p={1} mb={1}>
                        {(user && user.idInstance) ? (
                            <Box>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4 }}>
                                    ¡Importante!
                                </Typography>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4 }}>
                                    - Se les notificará a través de un mensaje por WhatsApp a cada paciente que se le liberó su hora.
                                </Typography>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4 }}>
                                    - Las reservas del dia eliminado no aparecerán en el calendario, pero si en 'Buscar Paciente'.
                                </Typography>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4 }}>
                                    - Al seleccionar un dia, se eliminarán todas las reservas agendadas para ese día. Deberá estar atento si un paciente agenda nuevamente para ese día, ya que las horas estarán liberadas.
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4}}>
                                    ¡Importante!
                                </Typography>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4, textDecoration: 'line-through' }}>
                                    - Se les notificará a través de un mensaje por WhatsApp a cada paciente que se le liberó su hora.
                                </Typography>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4}}>
                                    - Las reservas del dia eliminado no aparecerán en el calendario, pero si en 'Buscar Paciente'.
                                </Typography>
                                <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4}}>
                                    - Al seleccionar un dia, se eliminarán todas las reservas agendadas para ese día. Deberá estar atento si un paciente agenda nuevamente para ese día, ya que las horas estarán liberadas.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <CSSTransition
                        in={showCalendar}
                        timeout={300}
                        classNames="fade"
                        unmountOnExit
                    >
                        <LocalizationProvider dateAdapter={AdapterDayjs} locale="es">
                            <StaticDatePicker
                                displayStaticWrapperAs="desktop"
                                label="Fecha"
                                value={fecha ? dayjs(fecha) : null}
                                onChange={handleFechaChange}
                                shouldDisableDate={(date) => {
                                    const dayName = date.format('dddd');
                                    const translatedDays = {
                                        Monday: "Lunes",
                                        Tuesday: "Martes",
                                        Wednesday: "Miércoles",
                                        Thursday: "Jueves",
                                        Friday: "Viernes",
                                        Saturday: "Sábado",
                                        Sunday: "Domingo",
                                    };
                                    const translatedDayName = translatedDays[dayName];
                                    return !diasDeTrabajo.includes(translatedDayName);
                                }}
                                renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
                            />
                        </LocalizationProvider>
                    </CSSTransition>
                    <CSSTransition
                        in={!showCalendar}
                        timeout={300}
                        classNames="fade"
                        unmountOnExit
                    >
                        <Box>
                            <TextField
                                label={(user && user.idInstance) ? "Mensaje personalizado (al dejar vacio se enviará el mensaje por defecto)" : "Sin autorización"}
                                multiline
                                rows={8}
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                fullWidth
                                margin="normal"
                                disabled={!(user && user.idInstance)}
                            />
                            <Button variant="contained" color="primary" onClick={handleConfirmOpen} fullWidth>
                                Enviar día
                            </Button>
                        </Box>
                    </CSSTransition>
                </Box>
                <Dialog
                    open={confirmOpen}
                    onClose={() => handleConfirmClose(false)}
                >
                    <DialogTitle>Confirmar Liberación de Horas</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            ¿Está seguro que desea liberar las horas del día seleccionado?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => handleConfirmClose(false)} sx={{ backgroundColor: 'secondary.main', color:'white' }}>
                            Cancelar
                        </Button>
                        <Button onClick={() => handleConfirmClose(true)} sx={{ backgroundColor: 'primary.main', color:'white' }}>
                            Confirmar
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Modal>
    );
};

export default LiberarHoras;