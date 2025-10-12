import React, { useEffect, useState } from 'react';
import {
	AppBar,
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Container,
	Divider,
	Grid,
	Stack,
	Toolbar,
	Typography,
	useMediaQuery,
	MenuItem,
	Select,
	InputLabel,
	FormControl,
	TextField,
	Modal,
	Snackbar,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LoginModal from '../components/LoginModal';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../context/authContext';
import { useReserva } from '../context/reservaContext';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ModalPerfilProfesional from '../components/Surcursales/ModalPerfilProfesional';
import ModalReservarCita from '../components/Surcursales/ModalReservarCita';
import DescargarICSModal from '../components/Modales/DescargarICSModal';
import { generateICS } from '../utils/icalendar';
import Logo from '../assets/LOGO.png';
import { ASSETS_BASE } from '../config';

// Simple, static homepage design. No business logic or data fetching.
export default function HomePageNew() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const location = useLocation();
	const navigate = useNavigate();

	dayjs.locale('es');

	// Logic from original HomePage
	const { getAllUsers, obtenerHorasDisponibles } = useAuth();
	const { getFeriados, updateReserva } = useReserva();
	const [profesionales, setProfesionales] = useState([]);
	const [especialidades, setEspecialidades] = useState([]);
	const [filtro, setFiltro] = useState({ nombre: '', especialidad: '', ubicacion: '' });
	const [feriados, setFeriados] = useState([]);
	const [seleccion, setSeleccion] = useState({});
	const [modalOpen, setModalOpen] = useState(false);
	const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
	const [modalReservaOpen, setModalReservaOpen] = useState(false);
	const [datosPreseleccionados, setDatosPreseleccionados] = useState({});
	const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
	const [icsModalOpen, setIcsModalOpen] = useState(false);
	const [icsData, setIcsData] = useState(null);
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
	const [paymentResult, setPaymentResult] = useState(null);

	const [loginAnchorEl, setLoginAnchorEl] = useState(null);

	const openLogin = (event) => setLoginAnchorEl(event.currentTarget);
	const closeLogin = () => setLoginAnchorEl(null);

			// (Removed Feature and Step helpers to simplify page)

		// Effects and handlers from original HomePage
		useEffect(() => {
			if (location?.state?.paymentResult) {
				setPaymentResult(location.state.paymentResult);
				setPaymentDialogOpen(true);
				navigate(location.pathname, { replace: true, state: {} });
			}
		}, [location, navigate]);

		useEffect(() => {
			const fetchData = async () => {
				const users = await getAllUsers();
				setProfesionales(users);
				setEspecialidades([...new Set(users.map(u => u.especialidad).filter(Boolean))]);
				const feriadosRes = await getFeriados();
				setFeriados(Array.isArray(feriadosRes) ? feriadosRes : (feriadosRes?.data || []));
			};
			fetchData();
		}, [getAllUsers, getFeriados]);

		const profesionalesFiltrados = profesionales.filter(prof => {
			const nombreOk = prof.username.toLowerCase().includes(filtro.nombre.toLowerCase());
			const espOk = filtro.especialidad ? prof.especialidad === filtro.especialidad : true;
			return nombreOk && espOk;
		});

		const getDiasDisponibles = (timetable) => {
			return [...new Set((timetable || []).flatMap(b => b.days || []))];
		};

		const esFeriado = (fecha) => {
			return feriados.some(f => f.date && dayjs(f.date).isSame(fecha, 'day'));
		};

		const handleFechaChange = async (profId, fecha, timetable) => {
			setSeleccion(prev => ({
				...prev,
				[profId]: { ...prev[profId], fecha, horasDisponibles: [], horaSeleccionada: undefined }
			}));
			if (fecha) {
				const res = await obtenerHorasDisponibles(profId, dayjs(fecha).format('YYYY-MM-DD'));
				setSeleccion(prev => ({
					...prev,
					[profId]: { ...prev[profId], fecha, horasDisponibles: res.times || [], horaSeleccionada: undefined }
				}));
			}
		};

		const handleOpenPerfil = (profesional) => {
			setProfesionalSeleccionado(profesional);
			setModalOpen(true);
		};

		const handleAbrirReserva = (prof, seleccionState) => {
			setDatosPreseleccionados({
				profesional: prof,
				fecha: seleccionState[prof._id]?.fecha,
				hora: seleccionState[prof._id]?.horaSeleccionada,
				modalidad: seleccionState[prof._id]?.modalidad,
				publicFlow: true
			});
			setModalReservaOpen(true);
		};

		const handleReservaFinalizada = async (paciente, error = null) => {
			setModalReservaOpen(false);
			setSeleccion(prev => {
				const updated = { ...prev };
				Object.keys(updated).forEach(key => {
					updated[key] = { fecha: null, horasDisponibles: [], horaSeleccionada: undefined, modalidad: undefined };
				});
				return updated;
			});
			setSnackbar({
				open: true,
				message: error ? 'No se pudo crear la reserva. Intenta nuevamente.' : '¡Reserva realizada con éxito!',
				severity: error ? 'error' : 'success'
			});
			if (!error) {
				const profesional = datosPreseleccionados.profesional;
				const fechaStr = dayjs(datosPreseleccionados.fecha).format('YYYY-MM-DD');
				const horaInicio = datosPreseleccionados.hora;
				const [hora, minuto] = horaInicio.split(':');
				const horaFin = `${String(parseInt(hora) + 1).padStart(2, '0')}:${minuto}`;
				const start = new Date(`${fechaStr}T${horaInicio}:00-04:00`);
				const end = new Date(`${fechaStr}T${horaFin}:00-04:00`);
				setIcsData({
					summary: `Cita médica`,
					description: `Cita con ${profesional?.username || 'profesional'}`,
					start,
					end,
					location: profesional?.sucursal?.nombre || '',
					attendees: [paciente.email]
				});
				setIcsModalOpen(true);
			}
		};

		const handleDescargarICS = () => {
			if (!icsData) return;
			const icsContent = generateICS(icsData);
			const blob = new Blob([icsContent], { type: 'text/calendar' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `cita-${dayjs(icsData.start).format('YYYYMMDD-HHmm')}.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			setIcsModalOpen(false);
		};

		const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

	return (
		<Box sx={{ bgcolor: '#f7fbfd', minHeight: '100vh' }}>
			{/* Top bar */}
			<AppBar
				position="sticky"
				elevation={0}
				sx={{
					background: 'transparent',
					color: 'inherit',
					borderBottom: '1px solid #e3f2fd',
					backdropFilter: 'blur(8px)',
				}}
			>
				<Toolbar sx={{ py: 1 }}>
					<Stack direction="row" alignItems="center" spacing={1} component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
						<img src={Logo} alt="Sessionly Logo" style={{ width: 150, height: 40 }} />
					</Stack>

					<Box sx={{ flex: 1 }} />

											<Stack direction="row" spacing={1} alignItems="center">
						<Button color="inherit" component={RouterLink} to="/front-users">¿Eres profesional?</Button>
					</Stack>
				</Toolbar>
			</AppBar>

			{/* Hero */}
			<Box
				sx={{
					position: 'relative',
					overflow: 'hidden',
					background: 'linear-gradient(120deg, #e3f7ff 0%, #f7fbfd 50%)',
				}}
			>
				<Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
					<Grid container spacing={4} alignItems="center">
						<Grid item xs={12} md={7}>
							<Stack spacing={2}>
								<Typography variant={isMobile ? 'h4' : 'h3'} fontWeight={900} lineHeight={1.15}>
									Agenda tus citas médicas en minutos
								</Typography>
								<Typography color="text.secondary" sx={{ maxWidth: 640 }}>
									Encuentra profesionales, compara disponibilidad y te recordaremos tu cita para que puedas también confirmar tu asistencia. Sin llamadas, sin esperas.
								</Typography>


												<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
									<Stack direction="row" spacing={1} alignItems="center">
										<CheckCircleIcon sx={{ color: '#2596be' }} />
										<Typography variant="body2">Te recordamos tu cita</Typography>
									</Stack>
									<Stack direction="row" spacing={1} alignItems="center">
										<SecurityIcon sx={{ color: '#2596be' }} />
										<Typography variant="body2">Datos protegidos</Typography>
									</Stack>
									<Stack direction="row" spacing={1} alignItems="center">
										<VideoCallIcon sx={{ color: '#2596be' }} />
										<Typography variant="body2">Telemedicina disponible</Typography>
									</Stack>
								</Stack>
							</Stack>
						</Grid>
						<Grid item xs={12} md={5}>
							<Box
								sx={{
									p: 3,
									borderRadius: 3,
									background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
									color: '#fff',
									boxShadow: 4,
								}}
							>
								<Stack spacing={2}>
									<Typography variant="h6" fontWeight={800}>Agenda en 3 pasos</Typography>
									<Divider sx={{ borderColor: 'rgba(255,255,255,0.25)' }} />
									<Stack direction="row" spacing={2} alignItems="flex-start">
										<Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>1</Avatar>
										<Box>
											<Typography fontWeight={700}>
												Elige tu profesional
											</Typography>
											<Typography variant="body2" sx={{ opacity: 0.9 }}>
												Filtra por especialidad, ubicación y modalidad.
											</Typography>
										</Box>
									</Stack>
									<Stack direction="row" spacing={2} alignItems="flex-start">
										<Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>2</Avatar>
										<Box>
											<Typography fontWeight={700}>Selecciona un horario</Typography>
											<Typography variant="body2" sx={{ opacity: 0.9 }}>
												Visualiza rápidamente la disponibilidad.
											</Typography>
										</Box>
									</Stack>
									<Stack direction="row" spacing={2} alignItems="flex-start">
										<Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>3</Avatar>
										<Box>
											<Typography fontWeight={700}>Confirma tu reserva</Typography>
											<Typography variant="body2" sx={{ opacity: 0.9 }}>
												Recibe un recordatorio por WhatsApp y confirma, cancela o reprograma tu cita.
											</Typography>
										</Box>
									</Stack>
													{/* Sin registro para pacientes */}
								</Stack>
							</Box>
						</Grid>
					</Grid>
				</Container>
			</Box>

					{/* Search & booking section (logic integrated) */}
					<Container id="buscar" maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
						<Grid container spacing={3}>
							{/* Filtros */}
							<Grid item xs={12} md={4}>
								<Card
									sx={{
										border: '2px solid #e3f2fd',
										'&:hover': { boxShadow: 3, borderColor: '#2596be' },
										borderRadius: 3,
									}}
								>
									<CardContent>
										<Typography variant="h6" fontWeight={800} gutterBottom>
											Buscar profesional
										</Typography>
										<Box mb={2}>
											<TextField
												label="Nombre del profesional"
												value={filtro.nombre}
												onChange={e => setFiltro({ ...filtro, nombre: e.target.value })}
												InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} /> }}
												fullWidth
												size="small"
											/>
										</Box>
										<Box mb={2}>
											<FormControl fullWidth size="small">
												<InputLabel>Especialidad</InputLabel>
												<Select
													value={filtro.especialidad}
													label="Especialidad"
													onChange={e => setFiltro({ ...filtro, especialidad: e.target.value })}
												>
													<MenuItem value="">Todas</MenuItem>
													{especialidades.map(esp => (
														<MenuItem key={esp} value={esp}>{esp}</MenuItem>
													))}
												</Select>
											</FormControl>
										</Box>
										<Typography variant="body2" color="text.secondary">
											Resultados ({profesionalesFiltrados.length})
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							{/* Resultados */}
							<Grid item xs={12} md={8}>
								<Stack spacing={3}>
									{profesionalesFiltrados.map(prof => (
										<Card
											key={prof._id}
											sx={{
												border: '2px solid #e3f2fd',
												'&:hover': { boxShadow: 3, borderColor: '#2596be' },
												borderRadius: 3,
											}}
										>
											<CardContent>
												<Grid container>
													{/* Info profesional */}
													<Grid item xs={12} md={4}
														sx={{
															borderRight: { md: '1px solid #eee' },
															background: 'linear-gradient(90deg, #2596be 60%, #21cbe6 100%)',
														}}
													>
														<Box p={2} display="flex" flexDirection="column" alignItems="center">
																											<Avatar src={prof.fotoPerfil ? `${ASSETS_BASE}${prof.fotoPerfil}` : undefined} sx={{ width: 80, height: 80, mb: 1 }} />
															<Typography fontWeight={600} color='white'>{prof.username}</Typography>
															<Typography color="white" fontSize={14}>{prof.especialidad}</Typography>
															<Box display="flex" alignItems="center" mt={1} fontSize={13}>
																<ApartmentIcon sx={{ fontSize: 16, mr: 0.5, color:'white' }} />
																<Typography color="white">{prof.sucursal?.nombre || 'Independiente'}</Typography>
															</Box>
															<Box display="flex" alignItems="center" mt={1} fontSize={13}>
																<PhoneIphoneIcon sx={{ fontSize: 16, mr: 0.5, color:'white' }} />
																<Typography color="white">{prof.celular || 'Sin datos'}</Typography>
															</Box>
															<Button sx={{ mt: 2, bgcolor: 'white', color: 'black' }} fullWidth onClick={() => handleOpenPerfil(prof)}>
																Ver perfil completo
															</Button>
														</Box>
													</Grid>
													{/* Horarios y acciones */}
													<Grid item xs={12} md={8}>
														<Box p={2}>
															<Typography fontWeight={500} mb={1}>Selecciona fecha</Typography>
															<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
																<DatePicker
																	label="Fecha"
																	value={seleccion[prof._id]?.fecha || null}
																	onChange={v => handleFechaChange(prof._id, (v && typeof v.isValid === 'function' && v.isValid()) ? v : null, prof.timetable)}
																	shouldDisableDate={date => {
																		const today = dayjs().startOf('day');
																		if (dayjs(date).isBefore(today, 'day')) return true;
																		const dia = diasSemana[date.day()];
																		const diasDisponibles = getDiasDisponibles(prof.timetable);
																		return !diasDisponibles.includes(dia) || esFeriado(date);
																	}}
																	minDate={dayjs().startOf('day')}
																	slotProps={{ textField: { size: 'small', fullWidth: true, inputProps: { readOnly: true } } }}
																/>
															</LocalizationProvider>
															<Box mt={2}>
																<Typography fontWeight={500} mb={1}><strong>Horas disponibles para la fecha seleccionada</strong></Typography>
																<Box display="flex" gap={1} flexWrap="wrap">
																	{(seleccion[prof._id]?.horasDisponibles || []).length === 0 && (
																		<Typography color="text.secondary" fontSize={14}>Selecciona una fecha</Typography>
																	)}
																	{(seleccion[prof._id]?.horasDisponibles || []).map(hora => (
																		<Button
																			key={hora}
																			variant={seleccion[prof._id]?.horaSeleccionada === hora ? 'contained' : 'outlined'}
																			size="small"
																			startIcon={<AccessTimeIcon />}
																			sx={{
																				color: seleccion[prof._id]?.horaSeleccionada === hora ? 'white' : '#2596be',
																				bgcolor: seleccion[prof._id]?.horaSeleccionada === hora ? '#2596be' : 'transparent',
																				borderColor: '#2596be',
																				fontWeight: seleccion[prof._id]?.horaSeleccionada === hora ? 700 : 400,
																				boxShadow: seleccion[prof._id]?.horaSeleccionada === hora ? 2 : 0,
																			}}
																			onClick={() => {
																				setSeleccion(prev => ({
																					...prev,
																					[prof._id]: {
																						...prev[prof._id],
																						horaSeleccionada: hora,
																					},
																				}));
																			}}
																		>
																			{hora}
																		</Button>
																	))}
																</Box>
															</Box>
															<Box mt={2} display="flex" gap={1} alignItems="center">
																<Typography fontWeight={500} mb={1}><strong>Modalidad de atención: </strong></Typography>
																<Button
																	startIcon={<PersonPinCircleIcon />}
																	variant={seleccion[prof._id]?.modalidad === 'Presencial' ? 'contained' : 'outlined'}
																	size="small"
																	sx={{
																		color: seleccion[prof._id]?.modalidad === 'Presencial' ? 'white' : (prof.cita_presencial ? '#2596be' : 'grey.500'),
																		bgcolor: seleccion[prof._id]?.modalidad === 'Presencial' ? '#2596be' : 'transparent',
																		borderColor: prof.cita_presencial ? '#2596be' : 'grey.400',
																		opacity: prof.cita_presencial ? 1 : 0.5,
																		pointerEvents: prof.cita_presencial ? 'auto' : 'none',
																		fontWeight: seleccion[prof._id]?.modalidad === 'Presencial' ? 700 : 400,
																	}}
																	onClick={() => {
																		if (prof.cita_presencial) {
																			setSeleccion(prev => ({
																				...prev,
																				[prof._id]: { ...prev[prof._id], modalidad: 'Presencial' },
																			}));
																		}
																	}}
																>
																	Presencial
																</Button>
																<Button
																	startIcon={<VideoCallIcon />}
																	variant={seleccion[prof._id]?.modalidad === 'Telemedicina' ? 'contained' : 'outlined'}
																	size="small"
																	sx={{
																		color: seleccion[prof._id]?.modalidad === 'Telemedicina' ? 'white' : (prof.cita_virtual ? '#21cbe6' : 'grey.500'),
																		bgcolor: seleccion[prof._id]?.modalidad === 'Telemedicina' ? '#21cbe6' : 'transparent',
																		borderColor: prof.cita_virtual ? '#21cbe6' : 'grey.400',
																		opacity: prof.cita_virtual ? 1 : 0.5,
																		pointerEvents: prof.cita_virtual ? 'auto' : 'none',
																		fontWeight: seleccion[prof._id]?.modalidad === 'Telemedicina' ? 700 : 400,
																	}}
																	onClick={() => {
																		if (prof.cita_virtual) {
																			setSeleccion(prev => ({
																				...prev,
																				[prof._id]: { ...prev[prof._id], modalidad: 'Telemedicina' },
																			}));
																		}
																	}}
																>
																	Telemedicina
																</Button>
															</Box>
															<Button
																sx={{
																	mt: 2,
																	bgcolor:
																		seleccion[prof._id]?.fecha &&
																		seleccion[prof._id]?.horaSeleccionada &&
																		seleccion[prof._id]?.modalidad
																			? '#2596be'
																			: 'grey.400',
																	color: 'white',
																	opacity:
																		seleccion[prof._id]?.fecha &&
																		seleccion[prof._id]?.horaSeleccionada &&
																		seleccion[prof._id]?.modalidad
																			? 1
																			: 0.6,
																	pointerEvents:
																		seleccion[prof._id]?.fecha &&
																		seleccion[prof._id]?.horaSeleccionada &&
																		seleccion[prof._id]?.modalidad
																			? 'auto'
																			: 'none',
																}}
																fullWidth
																onClick={() => handleAbrirReserva(prof, seleccion)}
															>
																Reservar cita
															</Button>
														</Box>
													</Grid>
												</Grid>
											</CardContent>
										</Card>
									))}
								</Stack>
							</Grid>
						</Grid>
					</Container>

					{/* Auth modal */}
			<LoginModal open={Boolean(loginAnchorEl)} onClose={closeLogin} anchorEl={loginAnchorEl} />

					{/* Perfil y Reserva modals */}
					<Modal
						open={modalOpen}
						onClose={() => setModalOpen(false)}
						aria-labelledby="modal-perfil-profesional"
						aria-describedby="modal-detalle-profesional"
					>
						<Box>
							<ModalPerfilProfesional
								open={modalOpen}
								onClose={() => setModalOpen(false)}
								profesional={profesionalSeleccionado}
							/>
						</Box>
					</Modal>

					<ModalReservarCita
						open={modalReservaOpen}
						onClose={() => setModalReservaOpen(false)}
						onReserva={handleReservaFinalizada}
						datosPreseleccionados={datosPreseleccionados}
					/>

					<Snackbar
						open={snackbar.open}
						autoHideDuration={4000}
						onClose={() => setSnackbar({ ...snackbar, open: false })}
						anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
						sx={{ color: 'white' }}
					>
						<Alert
							onClose={() => setSnackbar({ ...snackbar, open: false })}
							severity={snackbar.severity}
							sx={{
								width: '100%',
								color: 'white',
								backgroundColor: snackbar.severity === 'error' ? '#f44336' : '#4caf50',
								'& .MuiAlert-icon': { color: 'white' },
							}}
						>
							{snackbar.message}
						</Alert>
					</Snackbar>

					<DescargarICSModal
						open={icsModalOpen}
						onClose={() => setIcsModalOpen(false)}
						onDescargar={handleDescargarICS}
					/>

					{/* Payment result dialog */}
					<Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} fullWidth maxWidth="sm">
						<DialogTitle>
							{paymentResult?.success ? 'Pago Exitoso' : (paymentResult ? 'Pago Fallido' : 'Estado de Pago')}
						</DialogTitle>
						<DialogContent dividers>
							{paymentResult ? (
								paymentResult.success ? (
									<Box textAlign="center">
										<CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
										<Typography mt={2}>{paymentResult.message || 'El pago fue procesado correctamente.'}</Typography>
										{paymentResult.transaction && (
											<Box mt={2} textAlign="left">
												<Typography variant="subtitle2">Detalles:</Typography>
												<Typography variant="body2">Código autorización: {paymentResult.transaction.authorization_code}</Typography>
												<Typography variant="body2">Monto: ${paymentResult.transaction.amount?.toLocaleString()}</Typography>
												<Typography variant="body2">Fecha: {new Date(paymentResult.transaction.transaction_date).toLocaleString()}</Typography>
											</Box>
										)}
									</Box>
								) : (
									<Box textAlign="center">
										<ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
										<Typography mt={2}>{paymentResult.message || 'Hubo un problema procesando el pago.'}</Typography>
									</Box>
								)
							) : (
								<Box display="flex" alignItems="center" justifyContent="center" p={3}><CircularProgress /></Box>
							)}
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setPaymentDialogOpen(false)} variant="contained">Cerrar</Button>
						</DialogActions>
					</Dialog>
		</Box>
	);
}

