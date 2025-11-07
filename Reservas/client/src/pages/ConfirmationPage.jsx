import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { resolveToken, confirmByToken, cancelByToken, requestReschedule } from '../api/confirmation.js';
import { Box, Card, CardContent, Typography, Button, Stack, TextField, Alert, Chip, Divider } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import TopAppBar from '../components/ui/TopAppBar';
import SiteFooter from '../components/ui/SiteFooter';

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

		// Formateo robusto de fecha para evitar desfase de un día cuando llega como "YYYY-MM-DD" o "T00:00:00Z"
		const fechaLabel = useMemo(() => {
			if (!info?.fecha) return '—';
			const f = info.fecha;
			if (typeof f === 'string') {
				if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
					const [y, m, d] = f.split('-');
					return `${d}/${m}/${y}`;
				}
				if (f.endsWith('Z') && f.includes('T00:00:00')) {
					const [y, m, d] = f.slice(0,10).split('-');
					return `${d}/${m}/${y}`;
				}
			}
			try {
				return new Date(f).toLocaleDateString('es-CL');
			} catch {
				return '—';
			}
		}, [info]);

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

	if (loading) return <Typography sx={{ p: 2 }}>Cargando...</Typography>;
	if (error) return <Alert severity='error' sx={{ m: 2 }}>{error}</Alert>;
	if (!info) return <Alert severity='warning' sx={{ m: 2 }}>No se encontró información de la cita.</Alert>;

	return (
			<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#ffffff 0%, #f0fbff 100%)' }}>
				<TopAppBar hideProLink />
						<Box display='flex' justifyContent='center' mt={6} px={2} sx={{ flex: 1, pb: 6 }}>
					<Card sx={{ maxWidth: 700, width: '100%', border: '1px solid #e3f2fd', boxShadow: '0 8px 24px rgba(37,150,190,0.10)', borderRadius: 4 }}>
						<CardContent>
							<Stack direction='row' spacing={1.5} alignItems='center' mb={1.5}>
								<EventAvailableIcon sx={{ color: '#2596be' }} />
								<Typography variant='h5' fontWeight={900} sx={{ background: 'linear-gradient(135deg,#2596be,#21cbe6)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
									Confirmación de Cita
								</Typography>
							</Stack>
							<Divider sx={{ mb: 2 }} />
							{actionMsg && <Alert severity='success' sx={{ mb:2 }}>{actionMsg}</Alert>}
							<Stack spacing={1.5} mb={3}>
								<Stack direction='row' spacing={1} alignItems='center'>
									<PersonIcon sx={{ color: '#2596be' }} />
									<Typography><strong>Paciente:</strong> {info.paciente}</Typography>
								</Stack>
								<Typography><strong>Servicio:</strong> {info.servicio}</Typography>
								<Stack direction='row' spacing={1} alignItems='center'>
									<EventAvailableIcon sx={{ color: '#2596be' }} />
									<Typography><strong>Fecha:</strong> {fechaLabel}</Typography>
								</Stack>
								<Stack direction='row' spacing={1} alignItems='center'>
									<AccessTimeIcon sx={{ color: '#2596be' }} />
									<Typography><strong>Hora:</strong> {info.hora || '—'}</Typography>
								</Stack>
								<Stack direction='row' spacing={1} alignItems='center'>
									<Typography><strong>Estado:</strong></Typography>
									<Chip
										size='small'
										label={info.status}
										sx={(() => {
											if (info.status === 'pending') return { borderColor: '#2596be', color: '#2596be', backgroundColor: 'rgba(37,150,190,0.06)' };
											if (info.status === 'confirmed') return { background: 'linear-gradient(135deg,#2596be,#21cbe6)', color: '#fff' };
											if (info.status === 'cancelled') return { backgroundColor: '#fdecea', color: '#d32f2f' };
											if (info.status === 'reschedule_requested') return { backgroundColor: '#fff4e5', color: '#b26a00' };
											return {};
										})()}
										variant={info.status === 'pending' ? 'outlined' : 'filled'}
									/>
								</Stack>
							</Stack>
							{info.status === 'pending' && !rescheduleMode && (
								<Stack direction='row' spacing={1.5} flexWrap='wrap'>
									<Button
										variant='contained'
										onClick={handleConfirm}
										startIcon={<CheckCircleOutlineIcon />}
										sx={{
											textTransform: 'none',
											borderRadius: 3,
											px: 3,
											fontWeight: 600,
											background: 'linear-gradient(135deg,#2596be,#21cbe6)',
											boxShadow: '0 4px 12px rgba(37,150,190,0.35)',
											'&:hover': { background: 'linear-gradient(135deg,#1e7fa0,#1ab9d3)' }
										}}
									>
										Confirmar Cita
									</Button>
									<Button
										variant='outlined'
										onClick={handleCancel}
										startIcon={<CancelOutlinedIcon />}
										sx={{
											textTransform: 'none',
											borderRadius: 3,
											px: 3,
											fontWeight: 600,
											borderColor: '#d32f2f',
											color: '#d32f2f',
											'&:hover': { backgroundColor: 'rgba(211,47,47,0.06)', borderColor: '#b71c1c' }
										}}
									>
										Cancelar Cita
									</Button>
								</Stack>
							)}
							{info.status === 'confirmed' && <Alert severity='info'>La cita ya está confirmada. Si necesitas cambiar, solicita un ajuste.</Alert>}
							{info.status === 'cancelled' && <Alert severity='warning'>La cita fue cancelada.</Alert>}
						</CardContent>
					</Card>
				</Box>
				<SiteFooter />
			</Box>
	);
};

export default ConfirmationPage;
