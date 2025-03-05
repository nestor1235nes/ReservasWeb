import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { StaticDatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../../context/authContext';
import { useAlert } from '../../context/AlertContext';

dayjs.locale('es');

const LiberarHoras = ({ open, onClose, fetchReservas }) => {
    const [fecha, setFecha] = useState('');
    const { user, liberarHoras } = useAuth();
    const showAlert = useAlert();
    const [diasDeTrabajo, setDiasDeTrabajo] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleFechaChange = (newValue) => {
        setFecha(newValue ? newValue.format('YYYY-MM-DD') : '');
    };

    const handleLiberarHoras = async () => {
        try {
            const data = {
                id: user.id,
                fecha,
            };
            await liberarHoras(data);
            showAlert('success', 'Horas liberadas correctamente');
            fetchReservas();
            onClose();
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
        if (user && user.timetable) {
            const dias = user.timetable[0].days;
            setDiasDeTrabajo(dias);
        }
    }, [user]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box
                p={3}
                bgcolor="#eeee"
                borderRadius={2}
                boxShadow={3}
                width={window.innerWidth < 600 ? '90%' : 530}
                minHeight={window.innerHeight < 600 ? '90%' : 500}
                overflow="auto"
                mx="auto"
                my="1.5%"
            >
                <Box backgroundColor="primary.main" borderRadius={'5px'} color={"white"} p={0.5} mb={0}>
                    <Typography variant="h6" textAlign={'center'} gutterBottom>Liberar Horas</Typography>
                </Box>
                
                <Box backgroundColor="white" borderRadius={'5px'} p={1} mb={0}>
                    <Box p={1} mb={1}>
                        <Typography variant="body1" gutterBottom>
                            Seleccione el día que desea liberar horas
                        </Typography>
                    </Box>
                    <Box p={1} mb={1}>
                        <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4 }}>
                            Nota:
                            Al liberar las horas de un día, se eliminarán todas las reservas agendadas para ese día, pero debe estar atento si despues un paciente agenda ese dia, ya que las horas estarán liberadas.
                        </Typography>
                        <Typography variant="body2" gutterBottom style={{ fontWeight: 'bold', opacity: 0.4 }}>
                            Las reservas del dia eliminado no aparecerán en el calendario, pero si en 'Buscar Paciente'. Se sugiere que el profesional se comunique con los pacientes para reagendar las citas.
                        </Typography>
                    </Box>
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
                    <Button variant="contained" color="primary" onClick={handleConfirmOpen} fullWidth>
                        Enviar día
                    </Button>
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