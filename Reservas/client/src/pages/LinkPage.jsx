import React, { useMemo, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, Button, TextField, IconButton, InputAdornment, Alert, Snackbar, useMediaQuery, ToggleButton, ToggleButtonGroup, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { useAuth } from '../context/authContext';
import Template1Img from '../assets/referenciaTemplate/template1.png';
import Template2Img from '../assets/referenciaTemplate/template2.png';
import Template3Img from '../assets/referenciaTemplate/template3.png';

export default function LinkPage() {
		const { user, generateMiEnlace, updatePerfil } = useAuth();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const miEnlace = useMemo(() => user?.miEnlace || '', [user]);
	const [copied, setCopied] = useState(false);
	const [loading, setLoading] = useState(false);
		const [template, setTemplate] = useState(user?.bookingTemplate || 'template1');
	const templatePreview = useMemo(() => ({
		template1: Template1Img,
		template2: Template2Img,
		template3: Template3Img,
	})[template], [template]);

	const handleGenerate = async () => {
		try {
			setLoading(true);
			await generateMiEnlace();
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = async () => {
		try {
			if (!miEnlace) return;
			await navigator.clipboard.writeText(miEnlace);
			setCopied(true);
		} catch (e) {
			// fallback
		}
	};

		const handleTemplateChange = async (_e, value) => {
			if (!value) return; // ignore deselect
			setTemplate(value);
			try {
				if (user?.id || user?._id) {
					await updatePerfil(user.id || user._id, { bookingTemplate: value });
				}
			} catch (e) { /* noop */ }
		};

		return (
			<Box
				display="flex"
				flexDirection="column"
				minHeight="100%"
				backgroundColor="white"
				overflow="visible"
				px={isMobile ? 0.5 : 0}
				pb={isMobile ? 1 : 0}
			>
				{/* Encabezado con gradiente, consistente con otras páginas */}
				<Stack
					p={isMobile ? 1 : 1.5}
					borderRadius={1}
					sx={{
						background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
						flexDirection: isMobile ? 'column' : 'row',
						alignItems: isMobile ? 'stretch' : 'center',
						gap: isMobile ? 1.5 : 0,
						mb: isMobile ? 1 : 0,
					}}
				>
					<Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="white">
						Mi enlace de reservas
					</Typography>
				</Stack>

				{/* Contenido principal en Card */}
				<Card
					sx={{
						mt: isMobile ? 1 : 0,
						borderRadius: isMobile ? 0 : 2,
						boxShadow: isMobile ? 0 : 2,
					}}
				>
					<CardContent sx={{ p: isMobile ? 2 : 3 }}>
						<Stack spacing={2}>
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)', boxShadow: 2 }}>
									<LinkIcon />
								</Box>
								<Box>
									<Typography variant="h6" fontWeight={800}>Comparte tu enlace</Typography>
									<Typography variant="body2" color="text.secondary">Genera un link para que tus pacientes reserven contigo.</Typography>
								</Box>
							</Stack>

										{miEnlace ? (
								<TextField
									label="Enlace público"
									value={miEnlace}
									fullWidth
									InputProps={{
										readOnly: true,
										endAdornment: (
											<InputAdornment position="end">
												<IconButton aria-label="Copiar enlace" onClick={handleCopy} sx={{ color: '#2596be' }}>
													<ContentCopyIcon />
												</IconButton>
											</InputAdornment>
										)
									}}
								/>
							) : (
								<Box>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
										Aún no has generado tu enlace público.
									</Typography>
									<Button
										variant="contained"
										startIcon={<AddLinkIcon />}
										onClick={handleGenerate}
										disabled={loading}
										sx={{ backgroundColor: '#2596be', '&:hover': { backgroundColor: '#1e7fa0' } }}
									>
										{loading ? 'Generando…' : 'Generar link'}
									</Button>
								</Box>
							)}

										<Divider sx={{ my: 2 }} />
										<Typography fontWeight={700}>Plantilla de página pública</Typography>
										<Typography variant="body2" color="text.secondary">Elige cómo verán tu página de agendamiento.</Typography>
										<ToggleButtonGroup
											exclusive
											color="primary"
											value={template}
											onChange={handleTemplateChange}
											sx={{ flexWrap: 'wrap' }}
										>
											<ToggleButton value="template1">Plantilla 1</ToggleButton>
											<ToggleButton value="template2">Plantilla 2</ToggleButton>
											<ToggleButton value="template3">Plantilla 3</ToggleButton>
										</ToggleButtonGroup>

										{/* Vista previa de la plantilla seleccionada */}
										<Box>
											<Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
												Vista previa de la plantilla
											</Typography>
											<Box sx={{
												border: '1px solid #e3f2fd',
												borderRadius: 2,
												overflow: 'hidden',
												boxShadow: '0 8px 24px rgba(37,150,190,0.06)',
												backgroundColor: '#f8fbff',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												p: 1.5,
											}}
											>
												<img
													src={templatePreview}
													alt={`Vista previa ${template}`}
													style={{
														width: '100%',
														height: isMobile ? 220 : 360,
														objectFit: 'contain',
														borderRadius: 8,
													}}
												/>
											</Box>
										</Box>
						</Stack>
					</CardContent>
				</Card>

				<Snackbar
					open={copied}
					autoHideDuration={2000}
					onClose={() => setCopied(false)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				>
					<Alert severity="success" onClose={() => setCopied(false)} sx={{ width: '100%' }}>
						Enlace copiado al portapapeles
					</Alert>
				</Snackbar>
			</Box>
		);
}

