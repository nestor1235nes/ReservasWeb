import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppBar, Toolbar, Box, Button, Container, Grid, Typography, Stack, Card, CardContent, useMediaQuery, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, ListItemIcon, Avatar, Chip, Snackbar, Alert } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useTheme } from '@mui/material/styles';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MessageIcon from '@mui/icons-material/Message';
import BarChartIcon from '@mui/icons-material/BarChart';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import GroupsIcon from '@mui/icons-material/Groups';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import LoginIcon from '@mui/icons-material/Login';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecurityIcon from '@mui/icons-material/Security';
import Ilustracion from '../assets/ilustracion4.png';
import Logo from '../assets/logopng.png';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../context/authContext';
import { useReserva } from '../context/reservaContext';
import { getUserBySlugRequest } from '../api/auth';
import PersonPinCircleIcon from '@mui/icons-material/PersonPinCircle';
import ModalReservarCita from '../components/Surcursales/ModalReservarCita';
import Template1 from '../components/Templates/Template1';
import Template2 from '../components/Templates/Template2';
import Template3 from '../components/Templates/Template3';
import { generateICS } from '../utils/icalendar';

export default function FrontUsers() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('md'));
	const primary = '#2596be';
	dayjs.locale('es');

	const [loginOpen, setLoginOpen] = useState(false);
	const [anchorEl, setAnchorEl] = useState(null);
	const loginButtonRef = useRef(null);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [searchParams] = useSearchParams();
	const slug = searchParams.get('u');
	const { obtenerHorasDisponibles } = useAuth();
	const { getFeriados } = useReserva();
	const [prof, setProf] = useState(null);
	const [feriados, setFeriados] = useState([]);
	const [seleccion, setSeleccion] = useState({ fecha: null, horasDisponibles: [], horaSeleccionada: undefined, modalidad: undefined });
	const [modalReservaOpen, setModalReservaOpen] = useState(false);
	const [datosPreseleccionados, setDatosPreseleccionados] = useState({});
	const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

	const features = [
		{ icon: <CalendarTodayIcon />, title: 'Gestión de Agenda', description: 'Sincroniza tu calendario y libera horas en un clic.' },
		{ icon: <MessageIcon />, title: 'Recordatorios automáticos', description: 'Reduce el ausentismo con avisos por WhatsApp.' },
		{ icon: <VideoCameraFrontIcon />, title: 'Telemedicina', description: 'Videoconsultas seguras desde cualquier dispositivo.' },
		{ icon: <CreditCardIcon />, title: 'Cobros online', description: 'WebPay integrado para pagos simples y seguros.' },
		{ icon: <BarChartIcon />, title: 'Reportes y métricas', description: 'Monitorea asistencia, ingresos y tendencias.' },
		{ icon: <GroupsIcon />, title: 'Perfiles profesionales', description: 'Destaca tu experiencia y servicios.' },
	];

	// Personalized booking: fetch professional by slug and feriados
	useEffect(() => {
		const load = async () => {
			if (!slug) return;
			try {
				const res = await getUserBySlugRequest(slug);
				setProf(res.data);
				const fer = await getFeriados();
				setFeriados(fer.data || []);
			} catch (e) {
				setProf(null);
			}
		};
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slug]);

	const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
	const getDiasDisponibles = (timetable) => [...new Set((timetable || []).flatMap(b => b.days || []))];
	const esFeriado = (fecha) => feriados.some(f => f.date && dayjs(f.date).isSame(fecha, 'day'));

	const handleFechaChange = async (fecha) => {
		setSeleccion(prev => ({ ...prev, fecha, horasDisponibles: [], horaSeleccionada: undefined }));
		if (fecha && prof?._id) {
			const res = await obtenerHorasDisponibles(prof._id, dayjs(fecha).format('YYYY-MM-DD'));
			setSeleccion(prev => ({ ...prev, fecha, horasDisponibles: res.times || [], horaSeleccionada: undefined }));
		}
	};

		const handleAbrirReserva = () => {
			setDatosPreseleccionados({
				profesional: prof,
				fecha: seleccion.fecha,
				hora: seleccion.horaSeleccionada,
				modalidad: seleccion.modalidad,
				publicFlow: true,
			});
			setModalReservaOpen(true);
		};

		const shouldDisableDate = (date) => {
			const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
			const dia = diasSemana[date.day()];
			const diasDisponibles = getDiasDisponibles(prof?.timetable);
			return !diasDisponibles.includes(dia) || esFeriado(date);
		};

	const handleReservaFinalizada = async (paciente, error = null) => {
		setModalReservaOpen(false);
		setSeleccion({ fecha: null, horasDisponibles: [], horaSeleccionada: undefined, modalidad: undefined });
		setSnackbar({ open: true, message: error ? 'No se pudo crear la reserva. Intenta nuevamente.' : '¡Reserva realizada con éxito!', severity: error ? 'error' : 'success' });
	};

	// If slug present and prof loaded, render personalized booking view
	if (slug && prof) {
		const tpl = prof.bookingTemplate || 'template1';

		// Template 2: perfil arriba, widget abajo
			if (tpl === 'template2') {
				return (
					<>
						<Template2
							prof={prof}
							seleccion={seleccion}
							onFechaChange={handleFechaChange}
							onHoraSelect={(hora) => setSeleccion(prev => ({ ...prev, horaSeleccionada: hora }))}
							onModalidadSelect={(mod) => setSeleccion(prev => ({ ...prev, modalidad: mod }))}
							onReservar={handleAbrirReserva}
							shouldDisableDate={shouldDisableDate}
						/>
						<ModalReservarCita open={modalReservaOpen} onClose={() => setModalReservaOpen(false)} onReserva={handleReservaFinalizada} datosPreseleccionados={datosPreseleccionados} />
					</>
				);
			}

		// Template 3: perfil ancho + widget sticky
			if (tpl === 'template3') {
				return (
					<>
						<Template3
							prof={prof}
							seleccion={seleccion}
							onFechaChange={handleFechaChange}
							onHoraSelect={(hora) => setSeleccion(prev => ({ ...prev, horaSeleccionada: hora }))}
							onModalidadSelect={(mod) => setSeleccion(prev => ({ ...prev, modalidad: mod }))}
							onReservar={handleAbrirReserva}
							shouldDisableDate={shouldDisableDate}
						/>
						<ModalReservarCita open={modalReservaOpen} onClose={() => setModalReservaOpen(false)} onReserva={handleReservaFinalizada} datosPreseleccionados={datosPreseleccionados} />
					</>
				);
			}

		// Template 1 (por defecto): panel izq perfil + derecha booking
			return (
				<>
					<Template1
						prof={prof}
						seleccion={seleccion}
						onFechaChange={handleFechaChange}
						onHoraSelect={(hora) => setSeleccion(prev => ({ ...prev, horaSeleccionada: hora }))}
						onModalidadSelect={(mod) => setSeleccion(prev => ({ ...prev, modalidad: mod }))}
						onReservar={handleAbrirReserva}
						shouldDisableDate={shouldDisableDate}
					/>
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
				</>
			);
	}

	// Default marketing page when no slug
	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f7fbfd' }}>
			{/* Header (sticky like HomePageNew) */}
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
					<Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<Stack direction="row" alignItems="center" spacing={1}>
							<img src={Logo} alt="Sessionly Logo" style={{ width: 150, height: 40 }} />
						</Stack>

						{/* Desktop actions */}
						<Stack direction="row" spacing={2} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
							<Button startIcon={<LoginIcon />} ref={loginButtonRef} onClick={(e) => { setAnchorEl(e.currentTarget); setLoginOpen(true); }} variant="outlined" sx={{ borderColor: '#2596be', color: '#2596be' }}><strong>Iniciar sesión</strong></Button>
							<Button component={RouterLink} to="/register" variant="contained" sx={{ backgroundColor: '#2596be', color: 'white', '&:hover': { backgroundColor: '#1e7fa0' } }}>Crear cuenta</Button>
						</Stack>

						{/* Mobile menu */}
						<Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
							<IconButton onClick={() => setMobileOpen(true)}>
								<MenuIcon />
							</IconButton>
						</Box>
					</Container>
				</Toolbar>
			</AppBar>

				<Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
					<Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }} role="presentation">
						{/* Header */}
						<Box sx={{ p: 2, background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Avatar sx={{ bgcolor: 'white', color: '#2596be', width: 34, height: 34 }}>
									<CalendarTodayIcon />
								</Avatar>
								<Typography variant="subtitle1" fontWeight={700} color="white">Sessionly</Typography>
							</Stack>
							<IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'white' }}>
								<CloseIcon />
							</IconButton>
						</Box>

						{/* Content */}
						<Box sx={{ p: 2, flex: 1, backgroundColor: '#f7fbfd' }}>
							<List>
								<ListItem disablePadding>
									<ListItemButton onClick={() => { setAnchorEl(null); setLoginOpen(true); setMobileOpen(false); }} sx={{ borderRadius: 1, mb: 1 }}>
										<ListItemIcon sx={{ minWidth: 40 }}>
											<LoginIcon sx={{ color: '#2596be' }} />
										</ListItemIcon>
										<ListItemText primary="Iniciar sesión" />
									</ListItemButton>
								</ListItem>

								<ListItem disablePadding>
									<ListItemButton component={RouterLink} to="/register" sx={{ borderRadius: 1 }}>
										<ListItemIcon sx={{ minWidth: 40 }}>
											<PersonAddIcon sx={{ color: '#2596be' }} />
										</ListItemIcon>
										<ListItemText primary="Registrarse" />
									</ListItemButton>
								</ListItem>
							</List>
						</Box>

						{/* Footer action */}
						<Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
							<Button component={RouterLink} to="/register" variant="contained" fullWidth sx={{ backgroundColor: '#2596be', color: 'white' }}>Crear cuenta</Button>
						</Box>
					</Box>
				</Drawer>

			{/* Hero */}
			<Box sx={{ width: '100%', py: isMobile ? 6 : 12, background: 'linear-gradient(180deg, #ffffff 0%, #f0fbff 100%)' }}>
				<Container maxWidth="lg">
					<Grid container spacing={4} alignItems="center">
						<Grid item xs={12} md={6}>
							<Chip label="Para profesionales de la salud" sx={{ bgcolor: 'rgba(37,150,190,0.12)', color: primary, fontWeight: 700, mb: 1 }} />
							<Typography variant={isMobile ? 'h4' : 'h3'} fontWeight={900} gutterBottom>
								La forma más simple de gestionar tu consulta
							</Typography>
							<Typography color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
								Sincroniza tu agenda, reduce el ausentismo con recordatorios y ofrece telemedicina. Todo en un solo lugar.
							</Typography>
							<Stack direction={isMobile ? 'column' : 'row'} spacing={1.5} sx={{ mb: 2 }}>
								<Stack direction="row" spacing={1} alignItems="center">
									<AccessTimeIcon sx={{ color: primary }} />
									<Typography variant="body2">Agenda sincronizada</Typography>
								</Stack>
								<Stack direction="row" spacing={1} alignItems="center">
									<MessageIcon sx={{ color: primary }} />
									<Typography variant="body2">Recordatorios automáticos</Typography>
								</Stack>
								<Stack direction="row" spacing={1} alignItems="center">
									<SecurityIcon sx={{ color: primary }} />
									<Typography variant="body2">Datos seguros</Typography>
								</Stack>
							</Stack>
							<Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
								<Button fullWidth={isMobile} component={RouterLink} to="/register" variant="contained" sx={{ backgroundColor: primary, '&:hover': { backgroundColor: '#1e7fa0' } }}>Crear cuenta</Button>
								<Button fullWidth={isMobile} startIcon={<LoginIcon />} onClick={(e) => { setAnchorEl(e.currentTarget); setLoginOpen(true); }} variant="outlined" sx={{ borderColor: primary, color: primary }}>Iniciar sesión</Button>
							</Stack>
						</Grid>
						<Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
							<Box sx={{ width: isMobile ? 300 : 420, height: isMobile ? 240 : 320, backgroundColor: '#eaf7fb', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 3 }}>
								<img src={Ilustracion} alt="Sessionly ilustracion" style={{ width: '80%', height: 'auto' }} />
							</Box>
						</Grid>
					</Grid>
				</Container>
			</Box>

			{/* Features */}
			<Box id="features" sx={{ py: 8 }}>
				<Container maxWidth="lg">
					<Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
						<Chip label="Características" sx={{ bgcolor: 'rgba(37,150,190,0.12)', color: primary, fontWeight: 700 }} />
						<Typography variant="h4" fontWeight={900} textAlign="center">Todo lo que necesitas</Typography>
						<Typography align="center" color="text.secondary" sx={{ maxWidth: 900 }}>
							Optimiza tu consulta, reduce no-shows y mejora la experiencia del paciente.
						</Typography>
					</Stack>
					<Grid container spacing={2}>
						{features.map((f, i) => (
							<Grid key={i} item xs={12} sm={6} md={4}>
								<Card elevation={0} sx={{ border: '1px solid #e3f2fd', height: '100%', borderRadius: 3 }}>
									<CardContent>
										<Stack direction="row" spacing={2}>
											<Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)', boxShadow: 2, flexShrink: 0 }}>
												{f.icon}
											</Box>
											<Box>
												<Typography fontWeight={800} gutterBottom>{f.title}</Typography>
												<Typography color="text.secondary" variant="body2">{f.description}</Typography>
											</Box>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</Container>
			</Box>

			{/* How it works */}
			<Box id="como-funciona" sx={{ py: 8, backgroundColor: '#ffffff' }}>
				<Container maxWidth="lg">
					<Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
						<Chip label="¿Cómo funciona?" sx={{ bgcolor: 'rgba(37,150,190,0.12)', color: primary, fontWeight: 700 }} />
						<Typography variant="h4" fontWeight={900} textAlign="center">Ponte en marcha en minutos</Typography>
						<Typography color="text.secondary" textAlign="center" sx={{ maxWidth: 720 }}>
							Configura tu perfil, define horarios y empieza a recibir reservas al instante.
						</Typography>
					</Stack>
					<Grid container spacing={2}>
						{[
							{ n: 1, t: 'Crea tu cuenta', d: 'Regístrate y completa tu perfil profesional.' },
							{ n: 2, t: 'Configura tu agenda', d: 'Define tus horarios y modalidades de atención.' },
							{ n: 3, t: 'Recibe reservas', d: 'Comparte tu enlace y confirma citas fácilmente.' },
						].map(s => (
							<Grid item xs={12} md={4} key={s.n}>
								<Card elevation={0} sx={{ border: '1px solid #e3f2fd', borderRadius: 3, height: '100%' }}>
									<CardContent>
										<Stack spacing={1.5}>
											<Chip label={`Paso ${s.n}`} sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(37,150,190,0.12)', color: primary, fontWeight: 700 }} />
											<Typography variant="h6" fontWeight={800}>{s.t}</Typography>
											<Typography variant="body2" color="text.secondary">{s.d}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</Container>
			</Box>

			
			{/* Footer */}
			<Box component="footer" sx={{ py: 4, borderTop: '1px solid #e3f2fd', bgcolor: '#fff' }}>
				<Container maxWidth="lg">
					<Grid container spacing={3} alignItems="center" justifyContent="space-between">
						<Grid item>
							<Stack direction="row" spacing={1} alignItems="center">
								<Box sx={{ width: 28, height: 28, borderRadius: 1, background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)' }} />
								<Typography fontWeight={700}>Sessionly</Typography>
							</Stack>
						</Grid>
						<Grid item>
							<Typography variant="body2" color="text.secondary">© {new Date().getFullYear()} Sessionly. Todos los derechos reservados.</Typography>
						</Grid>
					</Grid>
				</Container>
			</Box>

			{/* Login modal */}
			<LoginModal open={loginOpen} anchorEl={anchorEl} onClose={() => { setLoginOpen(false); setAnchorEl(null); }} />
		</Box>
	);
}
