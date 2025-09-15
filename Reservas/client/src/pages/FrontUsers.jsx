import React, { useState, useRef } from 'react';
import { Box, Button, Container, Grid, Typography, Stack, Card, CardContent, useMediaQuery, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider, ListItemIcon, Avatar } from '@mui/material';
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
import { Link as RouterLink } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import LoginIcon from '@mui/icons-material/Login';

export default function FrontUsers() {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('md'));
	const primary = '#2596be';

	const [loginOpen, setLoginOpen] = useState(false);
	const [anchorEl, setAnchorEl] = useState(null);
	const loginButtonRef = useRef(null);
	const [mobileOpen, setMobileOpen] = useState(false);

	const features = [
		{ icon: <CalendarTodayIcon sx={{ fontSize: 40, color: primary }} />, title: 'Gestión de Agenda', description: 'Sincroniza con Google Calendar y gestiona tus citas fácilmente.' },
		{ icon: <MessageIcon sx={{ fontSize: 40, color: primary }} />, title: 'Recordatorios', description: 'Envía recordatorios automáticos por WhatsApp.' },
		{ icon: <BarChartIcon sx={{ fontSize: 40, color: primary }} />, title: 'Reportes', description: 'Gráficos e informes para analizar tu consulta.' },
		{ icon: <VideoCameraFrontIcon sx={{ fontSize: 40, color: primary }} />, title: 'Telemedicina', description: 'Consulta online mediante videollamadas integradas.' },
		{ icon: <CreditCardIcon sx={{ fontSize: 40, color: primary }} />, title: 'Pagos Online', description: 'Integración con WebPay para cobros simples y seguros.' },
		{ icon: <GroupsIcon sx={{ fontSize: 40, color: primary }} />, title: 'Perfiles', description: 'Perfiles profesionales personalizables.' }
	];

	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
			{/* Header */}
				<Box component="header" borderRadius={1} sx={{ background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)' }}>
					<Container maxWidth="lg" sx={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<Stack direction="row" alignItems="center" spacing={1}>
							<CalendarTodayIcon sx={{ color: 'white' }} />
							<Typography variant="h6" fontWeight={700} color="white">Sessionly</Typography>
						</Stack>
						{/* Desktop actions */}
						<Stack direction="row" spacing={2} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
							<Button startIcon={<LoginIcon />} ref={loginButtonRef} onClick={(e) => { setAnchorEl(e.currentTarget); setLoginOpen(true); }} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', border: '2px solid rgba(255, 255, 255)' }}><strong>Iniciar sesión</strong></Button>
							<Button component={RouterLink} to="/register" variant="contained" sx={{ backgroundColor: 'white', color: '#2596be', '&:hover': { backgroundColor: '#ffffffff' } }}>Registrarse</Button>
						</Stack>
						{/* Mobile menu */}
						<Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
							<IconButton onClick={() => setMobileOpen(true)} sx={{ color: 'white' }}>
								<MenuIcon />
							</IconButton>
						</Box>
					</Container>
				</Box>

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
									<ListItemButton onClick={(e) => { setAnchorEl(loginButtonRef.current); setLoginOpen(true); }} sx={{ borderRadius: 1, mb: 1 }}>
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
							<Typography variant={isMobile ? 'h4' : 'h3'} fontWeight={800} gutterBottom>
								Gestiona tus citas médicas de forma eficiente
							</Typography>
							<Typography color="text.secondary" sx={{ mb: 3 }}>
								Plataforma para profesionales y clínicas que optimiza la gestión de citas, reduce el ausentismo y mejora la experiencia del paciente.
							</Typography>
							<Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
								<Button fullWidth={isMobile} component={RouterLink} to="/register" variant="contained" sx={{ backgroundColor: primary, '&:hover': { backgroundColor: '#1e7fa0' } }}>Comenzar ahora</Button>
							</Stack>
						</Grid>
						<Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
							<Box sx={{ width: isMobile ? 300 : 420, height: isMobile ? 240 : 320, backgroundColor: '#eaf7fb', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 3 }}>
								<img src="/vite.svg" alt="dashboard" style={{ width: '80%', height: 'auto' }} />
							</Box>
						</Grid>
					</Grid>
				</Container>
			</Box>

			{/* Features */}
			<Box sx={{ py: 8 }}>
				<Container maxWidth="lg">
					<Typography variant="h5" align="center" fontWeight={700} sx={{ mb: 3 }}>Características</Typography>
					<Typography align="center" color="text.secondary" sx={{ maxWidth: 900, mx: 'auto', mb: 4 }}>Todas las herramientas para optimizar la gestión de tu consulta y la experiencia del paciente.</Typography>
					<Grid container spacing={2}>
						{features.map((f, i) => (
							<Grid key={i} item xs={12} sm={6} md={4}>
								<Card variant="outlined" sx={{ height: '100%' }}>
									<CardContent>
										<Stack spacing={2} alignItems="center" textAlign="center">
											{f.icon}
											<Typography fontWeight={700}>{f.title}</Typography>
											<Typography color="text.secondary">{f.description}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</Container>
			</Box>

			{/* CTA */}
			<Box sx={{ py: 8, backgroundColor: primary, color: '#fff' }}>
				<Container maxWidth="lg" sx={{ textAlign: 'center' }}>
					<Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Comienza a optimizar tu consulta hoy mismo</Typography>
					<Typography sx={{ mb: 3, color: 'rgba(255,255,255,0.85)' }}>Regístrate ahora y obtén 14 días de prueba gratuita. Sin compromisos.</Typography>
					<Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="center">
						<Button component={RouterLink} to="/register" variant="contained" sx={{ backgroundColor: '#fff', color: primary, '&:hover': { backgroundColor: '#f3f3f3' } }}>Comenzar ahora</Button>
						<Button component={RouterLink} to="/contact" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.6)', color: '#fff' }}>Contactar con ventas</Button>
					</Stack>
				</Container>
			</Box>

			<LoginModal open={loginOpen} anchorEl={anchorEl} onClose={() => { setLoginOpen(false); setAnchorEl(null); }} />

			{/* Footer */}
			<Box component="footer" sx={{ py: 4, backgroundColor: '#f5f5f5' }}>
				<Container maxWidth="lg">
					<Grid container spacing={3} alignItems="flex-start">
						<Grid item xs={12} md={4}>
							<Stack direction="row" spacing={1} alignItems="center">
								<CalendarTodayIcon sx={{ color: primary }} />
								<Typography fontWeight={700}>Sessionly</Typography>
							</Stack>
							<Typography color="text.secondary" sx={{ mt: 1 }}>Plataforma de gestión de citas médicas para profesionales y clínicas.</Typography>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Typography fontWeight={700}>Producto</Typography>
							<Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, mt: 1 }}>
								<li><RouterLink to="#features" style={{ textDecoration: 'none', color: 'inherit' }}>Características</RouterLink></li>
								<li><RouterLink to="#contact" style={{ textDecoration: 'none', color: 'inherit' }}>Contacto</RouterLink></li>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Typography fontWeight={700}>Empresa</Typography>
							<Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, mt: 1 }}>
								<li><RouterLink to="/about" style={{ textDecoration: 'none', color: 'inherit' }}>Sobre nosotros</RouterLink></li>
								<li><RouterLink to="/blog" style={{ textDecoration: 'none', color: 'inherit' }}>Blog</RouterLink></li>
							</Stack>
						</Grid>
						<Grid item xs={12} sm={4} md={4}>
							<Typography fontWeight={700}>Legal</Typography>
							<Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, mt: 1 }}>
								<li><RouterLink to="/privacy" style={{ textDecoration: 'none', color: 'inherit' }}>Política de privacidad</RouterLink></li>
								<li><RouterLink to="/terms" style={{ textDecoration: 'none', color: 'inherit' }}>Términos de servicio</RouterLink></li>
							</Stack>
						</Grid>
					</Grid>
				</Container>
			</Box>
		</Box>
	);
}
