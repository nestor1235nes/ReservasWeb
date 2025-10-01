import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolveToken, confirmByToken, cancelByToken, requestReschedule } from '../api/confirmation.js';
import { Box, Card, CardContent, Typography, Button, Stack, TextField, Alert } from '@mui/material';

const ConfirmationPage = () => {
	const { token } = useParams();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [info, setInfo] = useState(null);
	const [rescheduleMode, setRescheduleMode] = useState(false);
	const [newDate, setNewDate] = useState('');
	const [newTime, setNewTime] = useState('');
	const [reason, setReason] = useState('');
	const [actionMsg, setActionMsg] = useState(null);

	useEffect(() => {
		const load = async () => {
			try {
				const data = await resolveToken(token);
				setInfo(data);
			} catch (e) {
				setError(e.response?.data?.message || 'No se pudo cargar la información');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [token]);

	const handleConfirm = async () => {
		setActionMsg(null);
		try {
			const r = await confirmByToken(token);
			setActionMsg(r.message);
			setInfo(prev => ({ ...prev, status: 'confirmed' }));
		} catch (e) {
			setError(e.response?.data?.message || 'Error confirmando');
		}
	};

	const handleCancel = async () => {
		setActionMsg(null);
		try {
			const r = await cancelByToken(token);
			setActionMsg(r.message);
			setInfo(prev => ({ ...prev, status: 'cancelled' }));
		} catch (e) {
			setError(e.response?.data?.message || 'Error cancelando');
		}
	};

	const handleReschedule = async () => {
		setActionMsg(null);
		try {
			const r = await requestReschedule(token, { newDate, newTime, reason });
			setActionMsg(r.message);
			setInfo(prev => ({ ...prev, status: 'reschedule_requested' }));
			setRescheduleMode(false);
		} catch (e) {
			setError(e.response?.data?.message || 'Error solicitando cambio');
		}
	};

	if (loading) return <Typography>Cargando...</Typography>;
	if (error) return <Alert severity='error'>{error}</Alert>;
	if (!info) return <Alert severity='warning'>No se encontró información de la cita.</Alert>;

	return (
		<Box display='flex' justifyContent='center' mt={4} px={2}>
			<Card sx={{ maxWidth: 600, width: '100%' }}>
				<CardContent>
					<Typography variant='h5' fontWeight={600} gutterBottom>
						Confirmación de Cita
					</Typography>
					{actionMsg && <Alert severity='success' sx={{ mb:2 }}>{actionMsg}</Alert>}
					<Stack spacing={1} mb={2}>
						<Typography><strong>Paciente:</strong> {info.paciente}</Typography>
						<Typography><strong>Servicio:</strong> {info.servicio}</Typography>
						<Typography><strong>Fecha:</strong> {info.fecha ? new Date(info.fecha).toLocaleDateString() : '—'}</Typography>
						<Typography><strong>Hora:</strong> {info.hora || '—'}</Typography>
						<Typography><strong>Estado:</strong> {info.status}</Typography>
					</Stack>
					{info.status === 'pending' && !rescheduleMode && (
						<Stack direction='row' spacing={2} flexWrap='wrap'>
							<Button variant='contained' color='success' onClick={handleConfirm}>Confirmar</Button>
							<Button variant='outlined' color='error' onClick={handleCancel}>Cancelar</Button>
							<Button variant='text' onClick={() => setRescheduleMode(true)}>Solicitar cambio horario</Button>
						</Stack>
					)}
					{info.status === 'confirmed' && <Alert severity='info'>La cita ya está confirmada. Si necesitas cambiar, solicita un ajuste.</Alert>}
					{info.status === 'cancelled' && <Alert severity='warning'>La cita fue cancelada.</Alert>}
					{info.status === 'reschedule_requested' && <Alert severity='info'>Solicitud de cambio enviada. El centro se contactará contigo.</Alert>}
					{rescheduleMode && info.status === 'pending' && (
						<Box mt={3}>
							<Typography variant='subtitle1' fontWeight={600}>Solicitar nuevo horario</Typography>
							<Stack spacing={2} mt={1}>
								<TextField type='date' label='Nueva fecha' InputLabelProps={{ shrink: true }} value={newDate} onChange={e=>setNewDate(e.target.value)} />
								<TextField type='time' label='Nueva hora' InputLabelProps={{ shrink: true }} value={newTime} onChange={e=>setNewTime(e.target.value)} />
								<TextField label='Motivo o comentario' multiline minRows={2} value={reason} onChange={e=>setReason(e.target.value)} />
								<Stack direction='row' spacing={2}>
									<Button variant='contained' onClick={handleReschedule} disabled={!newDate || !newTime}>Enviar</Button>
									<Button variant='text' onClick={()=>setRescheduleMode(false)}>Cancelar</Button>
								</Stack>
							</Stack>
						</Box>
					)}
				</CardContent>
			</Card>
		</Box>
	);
};

export default ConfirmationPage;
