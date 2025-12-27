import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LockIcon from '@mui/icons-material/Lock';
import { useSubscription } from '../../context/subscriptionContext';
import { createSubscriptionPaymentRequest } from '../../api/payment';

const formatPrice = (value) => {
  if (typeof value !== 'number') return '-';
  try {
    return `$${value.toLocaleString('es-CL')}`;
  } catch {
    return `$${value}`;
  }
};

export default function SubscriptionPlansModal({ open, onClose }) {
  const { plans, calculatePrice, loading } = useSubscription();
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [teamsConfigOpen, setTeamsConfigOpen] = useState(false);
  const [teamsCounts, setTeamsCounts] = useState({
    cantidadAdmins: '1',
    cantidadProfessionals: '',
    cantidadAssistants: '',
  });
  const [teamsPrice, setTeamsPrice] = useState(null);
  const [teamsPriceLoading, setTeamsPriceLoading] = useState(false);

  const basicPlan = useMemo(() => plans.find((p) => p.name === 'Basic') || null, [plans]);
  const advancedPlan = useMemo(() => plans.find((p) => p.name === 'Standard') || null, [plans]);
  const teamsPlan = useMemo(() => plans.find((p) => p.name === 'Teams') || null, [plans]);

  console.log({ plans, basicPlan, advancedPlan, teamsPlan });

  const handleClose = () => {
    if (submitting) return;
    setSelectedPlanId(null);
    setTeamsConfigOpen(false);
    setTeamsPrice(null);
    setTeamsCounts({ cantidadAdmins: '1', cantidadProfessionals: '', cantidadAssistants: '' });
    onClose?.();
  };

  const handleSelectPlan = (planId) => {
    setSelectedPlanId(planId);
    if (teamsPlan && planId === teamsPlan._id) {
      setTeamsConfigOpen(true);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlanId || submitting) return;

    try {
      setSubmitting(true);
      const paymentResp = await createSubscriptionPaymentRequest({
        planId: selectedPlanId,
        billingCycle,
      });

      try {
        const returnTo = window.location.pathname + window.location.search + window.location.hash;
        sessionStorage.setItem('webpay:returnTo', returnTo);
      } catch {
        // ignore
      }

      // Redirigir a Webpay (form POST)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentResp.data.url;
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token_ws';
      tokenInput.value = paymentResp.data.token;
      form.appendChild(tokenInput);
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setSubmitting(false);
    }
  };

  const handleTeamsCountChange = (field, value) => {
    // Permitimos vacío en el input; se interpretará como 0 al calcular/enviar
    if (value === '') {
      setTeamsCounts((prev) => ({ ...prev, [field]: '' }));
      return;
    }

    const numeric = parseInt(value, 10);
    if (Number.isNaN(numeric)) {
      setTeamsCounts((prev) => ({ ...prev, [field]: '' }));
      return;
    }

    if (field === 'cantidadAdmins') {
      const safeAdmins = Math.max(1, numeric);
      setTeamsCounts((prev) => ({ ...prev, cantidadAdmins: String(safeAdmins) }));
    } else if (field === 'cantidadProfessionals') {
      const safePros = Math.max(0, numeric);
      setTeamsCounts((prev) => ({ ...prev, cantidadProfessionals: String(safePros) }));
    } else if (field === 'cantidadAssistants') {
      const safeAsists = Math.max(0, numeric);
      setTeamsCounts((prev) => ({ ...prev, cantidadAssistants: String(safeAsists) }));
    }
  };

  // Calcula automáticamente el precio del plan Teams cada vez que cambian las cantidades
  useEffect(() => {
    const run = async () => {
      if (!teamsPlan || !teamsConfigOpen) return;
      try {
        setTeamsPriceLoading(true);
        const admins = parseInt(teamsCounts.cantidadAdmins, 10);
        const pros = parseInt(teamsCounts.cantidadProfessionals, 10);
        const asists = parseInt(teamsCounts.cantidadAssistants, 10);

        const result = await calculatePrice({
          planId: teamsPlan._id,
          cantidadAdmins: Number.isNaN(admins) || admins < 1 ? 1 : admins,
          cantidadProfessionals: Number.isNaN(pros) ? 0 : pros,
          cantidadAssistants: Number.isNaN(asists) ? 0 : asists,
        });
        setTeamsPrice(result);
      } catch (e) {
        setTeamsPrice(null);
      } finally {
        setTeamsPriceLoading(false);
      }
    };

    run();
  }, [teamsPlan, teamsConfigOpen, teamsCounts, calculatePrice]);

  const handleConfirmTeams = async () => {
    if (!teamsPlan || submitting) return;
    try {
      setSubmitting(true);
      const admins = parseInt(teamsCounts.cantidadAdmins, 10);
      const pros = parseInt(teamsCounts.cantidadProfessionals, 10);
      const asists = parseInt(teamsCounts.cantidadAssistants, 10);
      const paymentResp = await createSubscriptionPaymentRequest({
        planId: teamsPlan._id,
        cantidadAdmins: Number.isNaN(admins) || admins < 1 ? 1 : admins,
        cantidadProfessionals: Number.isNaN(pros) ? 0 : pros,
        cantidadAssistants: Number.isNaN(asists) ? 0 : asists,
        billingCycle,
      });

      try {
        const returnTo = window.location.pathname + window.location.search + window.location.hash;
        sessionStorage.setItem('webpay:returnTo', returnTo);
      } catch {
        // ignore
      }

      // Redirigir a Webpay (form POST)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentResp.data.url;
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token_ws';
      tokenInput.value = paymentResp.data.token;
      form.appendChild(tokenInput);
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setSubmitting(false);
    }
  };

  const renderFeature = (label, enabled) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: enabled ? 1 : 0.4 }}>
      {enabled ? (
        <CheckCircleIcon
          fontSize="small"
          sx={{ color: '#21cbe6' }}
        />
      ) : (
        <LockIcon fontSize="small" color="disabled" />
      )}
      <Typography variant="body2">{label}</Typography>
    </Stack>
  );

  const renderPlanFeatures = (plan, defaultFeatures = []) => {
    if (Array.isArray(plan?.features) && plan.features.length > 0) {
      return plan.features.map((feature, idx) => (
        <React.Fragment key={idx}>{renderFeature(feature, true)}</React.Fragment>
      ));
    }

    return defaultFeatures.map(({ label, enabled }, idx) => (
      <React.Fragment key={idx}>{renderFeature(label, enabled)}</React.Fragment>
    ));
  };

  const isAnyPlanLoading = loading || submitting;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
          color: 'white',
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Elige el plan que mejor se adapte a tu consulta
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Mejora tu experiencia con recordatorios automáticos, pagos en línea y reportes avanzados.
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, backgroundColor: '#f8fafc' }}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Período de pago
            </Typography>
            <Button
              size="small"
              variant={billingCycle === 'monthly' ? 'contained' : 'outlined'}
              onClick={() => setBillingCycle('monthly')}
              sx={{
                textTransform: 'none',
                borderRadius: 999,
                px: 2,
                py: 0.5,
                fontSize: '0.75rem',
                color: billingCycle === 'monthly' ? 'white' : '#2596be',
                backgroundColor: billingCycle === 'monthly' ? '#2596be' : 'transparent',
              }}
            >
              Mensual
            </Button>
            <Button
              size="small"
              variant={billingCycle === 'yearly' ? 'contained' : 'outlined'}
              onClick={() => setBillingCycle('yearly')}
              sx={{
                textTransform: 'none',
                borderRadius: 999,
                px: 2,
                py: 0.5,
                fontSize: '0.75rem',
                color: billingCycle === 'yearly' ? 'white' : '#2596be',
                backgroundColor: billingCycle === 'yearly' ? '#2596be' : 'transparent',
              }}
            >
              Anual (2 meses gratis)
            </Button>
          </Stack>
        </Box>
        <Grid container spacing={2}>
          {/* Basic */}
          {basicPlan && (
            <Grid item xs={12} md={4}>
              <Card
                variant={selectedPlanId === basicPlan._id ? 'outlined' : 'elevation'}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  borderWidth: selectedPlanId === basicPlan._id ? 2 : 1,
                  borderColor:
                    selectedPlanId === basicPlan._id ? '#2596be' : 'rgba(148, 163, 184, 0.5)',
                  boxShadow: selectedPlanId === basicPlan._id ? 6 : 2,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                    borderColor: '#2596be',
                  },
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={() => handleSelectPlan(basicPlan._id)}
              >
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon color="primary" sx={{ color: '#2596be' }}/>
                      <Typography variant="h6" fontWeight={700} color='#2596be'>
                        Plan Básico
                      </Typography>
                    </Stack>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      Ideal para profesionales que están comenzando.
                    </Typography>
                  }
                  sx={{ pb: 0 }}
                />
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 1 }}>
                  <Box mb={2}>
                    <Typography variant="h4" fontWeight={800} color="#2596be">
                      {formatPrice(
                        (basicPlan.price || 24900) * (billingCycle === 'yearly' ? 10 : 1)
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {billingCycle === 'monthly'
                        ? 'por mes, por profesional'
                        : 'por año (2 meses gratis)'}
                    </Typography>
                  </Box>

                  <Stack spacing={1.2} mb={2}>
                    {renderPlanFeatures(basicPlan, [
                      { label: 'Agenda online y recordatorios automáticos', enabled: true },
                      { label: 'Gestión básica de pacientes', enabled: true },
                      { label: 'Subida de exámenes e imágenes', enabled: false },
                      { label: 'Telemedicina y sala de espera virtual', enabled: false },
                      { label: 'Pagos en línea con Webpay', enabled: false },
                      { label: 'Reportes avanzados y analytics', enabled: false },
                    ])}
                  </Stack>

                  <Box mt="auto">
                    <Button
                      fullWidth
                      variant={selectedPlanId === basicPlan._id ? 'contained' : 'outlined'}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        color: selectedPlanId === basicPlan._id ? 'white' : '#2596be',
                        backgroundColor:
                          selectedPlanId === basicPlan._id ? '#2596be' : 'transparent',
                        borderColor: '#2596be',
                        '&:hover': {
                          backgroundColor: '#1b7ea4',
                          borderColor: '#1b7ea4',
                          color: 'white',
                        },
                      }}
                    >
                      Elegir Básico
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Advanced / Standard */}
          {advancedPlan && (
            <Grid item xs={12} md={4}>
              <Card
                variant={selectedPlanId === advancedPlan._id ? 'outlined' : 'elevation'}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  borderWidth: selectedPlanId === advancedPlan._id ? 2 : 1,
                  borderColor:
                    selectedPlanId === advancedPlan._id ? '#2596be' : 'rgba(148, 163, 184, 0.5)',
                  boxShadow: selectedPlanId === advancedPlan._id ? 8 : 3,
                  cursor: 'pointer',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 8,
                    borderColor: '#2596be',
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  background:
                    'linear-gradient(180deg, rgba(37,150,190,0.06) 0%, rgba(255,255,255,1) 40%)',
                }}
                onClick={() => handleSelectPlan(advancedPlan._id)}
              >
                <Chip
                  icon={<StarIcon color='white' />}
                  label="Más recomendado"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    fontWeight: 700,
                    color: "white",
                    backgroundColor: '#2596be',
                  }}
                />
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon color="primary" sx={{ color: '#2596be' }}/>
                      <Typography variant="h6" fontWeight={700} color="#2596be">
                        Plan Avanzado
                      </Typography>
                    </Stack>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      Para profesionales que necesitan automatizar y escalar su consulta.
                    </Typography>
                  }
                  sx={{ pb: 0, pt: 2.5 }}
                />
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 1 }}>
                  <Box mb={2}>
                    <Typography variant="h4" fontWeight={800} color="#2596be">
                      {formatPrice(
                        (advancedPlan.price || 34900) * (billingCycle === 'yearly' ? 10 : 1)
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {billingCycle === 'monthly'
                        ? 'por mes, por profesional'
                        : 'por año (2 meses gratis)'}
                    </Typography>
                  </Box>

                  <Stack spacing={1.2} mb={2}>
                    {renderPlanFeatures(advancedPlan, [
                      { label: 'Todo lo del Plan Básico', enabled: true },
                      { label: 'Subida de exámenes e imágenes ilimitadas', enabled: true },
                      { label: 'Telemedicina y sala virtual de espera', enabled: true },
                      { label: 'Pagos en línea con Webpay', enabled: true },
                      { label: 'Reportes avanzados y analytics', enabled: true },
                      { label: 'Integración con Google Calendar', enabled: true },
                    ])}
                  </Stack>

                  <Box mt="auto">
                    <Button
                      fullWidth
                      variant={selectedPlanId === advancedPlan._id ? 'contained' : 'outlined'}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: '#2596be',
                        color: selectedPlanId === advancedPlan._id ? 'white' : '#2596be',
                        backgroundColor:
                          selectedPlanId === advancedPlan._id ? '#2596be' : 'transparent',
                        '&:hover': {
                          backgroundColor: '#1b7ea4',
                          borderColor: '#1b7ea4',
                          color: 'white',
                        },
                      }}
                    >
                      Elegir Avanzado
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Teams */}
          {teamsPlan && (
            <Grid item xs={12} md={4}>
              <Card
                variant={selectedPlanId === teamsPlan._id ? 'outlined' : 'elevation'}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  borderWidth: selectedPlanId === teamsPlan._id ? 2 : 1,
                  borderColor:
                    selectedPlanId === teamsPlan._id ? '#2596be' : 'rgba(148, 163, 184, 0.5)',
                  boxShadow: selectedPlanId === teamsPlan._id ? 8 : 3,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 8,
                    borderColor: '#2596be',
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  background:
                    'linear-gradient(180deg, rgba(37,150,190,0.06) 0%, rgba(255,255,255,1) 40%)',
                }}
                onClick={() => handleSelectPlan(teamsPlan._id)}
              >
                <CardHeader
                  title={
                    <Stack direction="row" spacing={1} alignItems="center" >
                      <GroupsIcon sx={{ color: "#2596be" }} />
                      <Typography variant="h6" fontWeight={700} color="#2596be">
                        Plan Teams
                      </Typography>
                    </Stack>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      Diseñado para centros médicos, clínicas y equipos de trabajo.
                    </Typography>
                  }
                  sx={{ pb: 0, pt: 2 }}
                />
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 1 }}>
                  <Box mb={2}>
                    <Typography variant="h5" fontWeight={800} color="#2596be">
                      Precio según número de usuarios
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Calculamos el valor según administradores, profesionales y asistentes.
                    </Typography>
                  </Box>

                  <Stack spacing={1.2} mb={2}>
                    {renderPlanFeatures(teamsPlan, [
                      { label: 'Todo lo del Plan Avanzado', enabled: true },
                      { label: 'Múltiples profesionales y asistentes', enabled: true },
                      { label: 'Reportes consolidados por sucursal', enabled: true },
                      { label: 'Configuración flexible de roles', enabled: true },
                      { label: 'Soporte prioritario', enabled: true },
                    ])}
                  </Stack>

                  <Box mt="auto">
                    <Tooltip title="Configura tu equipo en la sección de suscripción Teams" arrow>
                      <span>
                        <Button
                          fullWidth
                          variant={selectedPlanId === teamsPlan._id ? 'contained' : 'outlined'}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            borderColor: '#2596be',
                            color: selectedPlanId === teamsPlan._id ? 'white' : '#2596be',
                            backgroundColor:
                              selectedPlanId === teamsPlan._id ? '#2596be' : 'transparent',
                            '&:hover': {
                              backgroundColor: '#1b7ea4',
                              borderColor: '#1b7ea4',
                              color: 'white',
                            },
                          }}
                        >
                          Hablar con ventas
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {(!basicPlan && !advancedPlan && !teamsPlan) && (
          <Box mt={3} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              Algunos planes podrían no estar configurados aún en el backend. Revisa la sección de administración de planes.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, backgroundColor: '#f9fafb' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Puedes cambiar o cancelar tu suscripción cuando quieras desde tu perfil.
        </Typography>
        <Button onClick={handleClose}  sx={{ textTransform: 'none', color: 'grey.700' }}>
          Cerrar
        </Button>
        <Button
          onClick={handleSubscribe}
          variant="contained"
          disabled={!selectedPlanId || isAnyPlanLoading}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            fontWeight: 700,
            backgroundColor: '#2596be',
            '&:hover': {
              backgroundColor: '#1b7ea4',
            },
          }}
        >
          {isAnyPlanLoading ? 'Procesando...' : 'Confirmar suscripción'}
        </Button>
      </DialogActions>

      {/* Modal de configuración para Teams */}
      {teamsPlan && (
        <Dialog
          open={teamsConfigOpen}
          onClose={() => setTeamsConfigOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
            },
          }}
        >
          <DialogTitle sx={{ p: 0 }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
                color: 'white',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Configura tu equipo para el Plan Teams
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Define cuántos administradores, profesionales y asistentes usarán la plataforma.
                </Typography>
              </Box>
              <IconButton
                onClick={() => setTeamsConfigOpen(false)}
                sx={{ color: 'white' }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              px: 3,
              py: 3,
              backgroundColor: '#f8fafc',
            }}
          >
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" >
                  Período de pago
                </Typography>
                <Button
                  size="small"
                  variant={billingCycle === 'monthly' ? 'contained' : 'outlined'}
                  onClick={() => setBillingCycle('monthly')}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2,
                    py: 0.5,
                    fontSize: '0.75rem',
                    color: billingCycle === 'monthly' ? 'white' : '#2596be',
                    backgroundColor: billingCycle === 'monthly' ? '#2596be' : 'transparent',
                  }}
                >
                  Mensual
                </Button>
                <Button
                  size="small"
                  variant={billingCycle === 'yearly' ? 'contained' : 'outlined'}
                  onClick={() => setBillingCycle('yearly')}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2,
                    py: 0.5,
                    fontSize: '0.75rem',
                    color: billingCycle === 'yearly' ? 'white' : '#2596be',
                    backgroundColor: billingCycle === 'yearly' ? '#2596be' : 'transparent',
                  }}
                >
                  Anual (2 meses gratis)
                </Button>
              </Stack>
            </Box>
            <Stack spacing={3} mt={1}>
              <Box>
                <Typography variant="subtitle2" color="text.primary" gutterBottom>
                  Administradores
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  El plan incluye 1 administrador en el precio base. Solo se cobra por administradores adicionales.
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 1 }}
                  value={teamsCounts.cantidadAdmins}
                  onChange={(e) => handleTeamsCountChange('cantidadAdmins', e.target.value)}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.primary" gutterBottom>
                  Profesionales
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Indica cuántos profesionales de la salud atenderán en esta sucursal.
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 0 }}
                  value={teamsCounts.cantidadProfessionals}
                  onChange={(e) => handleTeamsCountChange('cantidadProfessionals', e.target.value)}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.primary" gutterBottom>
                  Asistentes
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Secretarias, recepcionistas u otros roles de apoyo administrativo.
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 0 }}
                  value={teamsCounts.cantidadAssistants}
                  onChange={(e) => handleTeamsCountChange('cantidadAssistants', e.target.value)}
                />
              </Box>
            </Stack>

            <Box mt={3}>
              {teamsPriceLoading && (
                <Typography variant="body2" color="text.secondary">
                  Calculando precio mensual...
                </Typography>
              )}

              {teamsPrice && !teamsPriceLoading && (
                <Card
                  variant="outlined"
                  sx={{
                    mt: 1.5,
                    borderRadius: 2,
                    borderColor: '#bfdbfe',
                    backgroundColor: '#eff6ff',
                  }}
                >
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" color="#2596be" fontWeight={700}>
                      {billingCycle === 'monthly'
                        ? 'Precio estimado mensual'
                        : 'Precio estimado por año (2 meses gratis)'}
                    </Typography>
                    <Typography variant="h6" fontWeight={800} color="#2596be">
                      {formatPrice(
                        teamsPrice.finalPrice * (billingCycle === 'yearly' ? 10 : 1)
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {billingCycle === 'monthly'
                        ? `Duración estimada: ${teamsPrice.durationInMonths} mes(es)`
                        : 'Duración estimada: 12 mes(es)'}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              backgroundColor: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Button
              onClick={() => setTeamsConfigOpen(false)}
              sx={{ textTransform: 'none', color: 'grey.700' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmTeams}
              variant="contained"
              disabled={submitting}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                backgroundColor: '#2596be',
                '&:hover': {
                  backgroundColor: '#1b7ea4',
                },
              }}
            >
              {submitting ? 'Procesando...' : 'Confirmar Teams'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
}
