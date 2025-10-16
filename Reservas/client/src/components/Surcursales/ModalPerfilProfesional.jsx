import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Chip,
  Stack,
  Divider,
  Tabs,
  Tab,
  Button,
  useMediaQuery,
} from "@mui/material";
import PlaceIcon from "@mui/icons-material/Place";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";
import ApartmentIcon from '@mui/icons-material/Apartment';
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useTheme } from "@mui/material/styles";
import { ASSETS_BASE } from '../../config';


// Props: { open, onClose, profesional }
export default function ModalPerfilProfesional({ open, onClose, profesional }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tab, setTab] = React.useState(0);

  if (!profesional) return null;


  return (
    <Box
      sx={{
        width: isMobile ? "100vw" : 800,
        maxWidth: "100vw",
        p: isMobile ? 1 : 3,
        bgcolor: "#e9f3f4",
        borderRadius: 3,
        boxShadow: 24,
        mx: "auto",
        my: 4,
      }}
    >
    {/* Header */}
        <Stack direction={isMobile ? "column" : "row"} spacing={3} alignItems="center" position="relative">
          <Avatar
            src={profesional.fotoPerfil ? `${ASSETS_BASE}${profesional.fotoPerfil}` : undefined}
            sx={{ width: 96, height: 96, fontSize: 36, bgcolor: "#2596be" }}
          >
            {profesional.username?.[0]}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={700} color="#2596be">
            {profesional.username}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
            {profesional.especialidad}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} mt={1}>
            <ApartmentIcon fontSize="small" color="info" />
            <Typography variant="body2" color="text.secondary">
              {profesional.sucursal?.nombre || "Independiente"}
            </Typography>
            </Stack>
          </Box>
          <Button
            onClick={onClose}
            sx={{
            minWidth: 0,
            width: 36,
            height: 36,
            borderRadius: "50%",
            position: isMobile ? "absolute" : "static",
            top: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            alignSelf: isMobile ? "flex-start" : "center",
            }}
            color="inherit"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
            <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
            <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="2" />
            </svg>
          </Button>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ mb: 0, backgroundColor: "#e0e0e0", mt:-1, borderRadius: 2 }}
      >
        <Tab label="Acerca de" />
        <Tab label="Servicios" />
        <Tab label="Horarios" />
        <Tab label="Contacto" />
      </Tabs>

      {/* Tab Content */}
      {tab === 0 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 2 }} >
            <CardHeader title="Biografía Profesional" />
            <CardContent>
              <Typography color="text.secondary">
                {profesional.descripcion || "Sin biografía disponible."}
              </Typography>
            </CardContent>
          </Card>
          <Stack direction={isMobile ? "column" : "row"} spacing={2}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardHeader title="Formación Académica" />
              <CardContent>
                <Typography fontWeight={600}>Especialidad:</Typography>
                <Typography color="text.secondary">
                  {profesional.especialidad_principal || profesional.especialidad || "No especificada"}
                </Typography>
                <Typography fontWeight={600} mt={2}>
                  Experiencia:
                </Typography>
                <Typography color="text.secondary">
                  {profesional.experiencia || "No especificada"}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardHeader title="Servicios Disponibles" />
            <CardContent>
              {(profesional.servicios && profesional.servicios.length > 0) ? (
                profesional.servicios.map((serv, idx) => (
                  <Box key={idx} mb={2} p={1} border="1px solid #e0e0e0" borderRadius={2}>
                    <Typography fontWeight={600}>{serv.tipo}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {serv.descripcion}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1}>
                      <Chip
                        icon={<AccessTimeIcon fontSize="small" />}
                        label={serv.duracion}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                      <Chip
                        label={serv.modalidad}
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={
                          serv.modalidad === "Presencial"
                            ? <PersonPinCircleIcon fontSize="small" />
                            : <VideoCallIcon fontSize="small" />
                        }
                      />
                      <Chip
                        label={`$${serv.precio}`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Stack>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">No hay servicios registrados.</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Card variant="outlined">
            <CardHeader title="Horarios de Atención" />
            <CardContent>
              {(profesional.timetable && profesional.timetable.length > 0) ? (
                profesional.timetable.map((bloque, idx) => (
                  <Box key={idx} mb={2}>
                    <Typography fontWeight={600}>
                      {bloque.days?.join(", ") || "Días no especificados"}
                    </Typography>
                    <Typography color="text.secondary">
                      {bloque.fromTime} - {bloque.toTime} ({bloque.interval} min)
                    </Typography>
                    {bloque.breakFrom && (
                      <Typography color="text.secondary" fontSize={13}>
                        Receso: {bloque.breakFrom} - {bloque.breakTo}
                      </Typography>
                    )}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">No hay horarios registrados.</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 3 && (
        <Box>
          <Card variant="outlined">
            <CardHeader title="Información de Contacto" />
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PlaceIcon color="info" />
                  <Typography>
                    {profesional.sucursal?.direccion || "Sin dirección"}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PhoneIphoneIcon color="info" />
                  <Typography>
                    {profesional.celular || "Sin teléfono"}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <MailOutlineIcon color="info" />
                  <Typography>
                    {profesional.email}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonPinCircleIcon color={profesional.cita_presencial ? "success" : "disabled"} />
                  <Typography>
                    Presencial: {profesional.cita_presencial ? "Sí" : "No"}
                  </Typography>
                  <VideoCallIcon color={profesional.cita_virtual ? "success" : "disabled"} />
                  <Typography>
                    Telemedicina: {profesional.cita_virtual ? "Sí" : "No"}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}