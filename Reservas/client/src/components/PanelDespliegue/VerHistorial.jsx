import React, { useEffect, useState } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Tooltip, IconButton, Button } from '@mui/material';
import { useReserva } from '../../context/reservaContext';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../ui/VerDetalles.css';

const VerHistorial = ({ open, onClose, paciente }) => {
  const [historial, setHistorial] = useState([]);
  const [closing, setClosing] = useState(false);
  const [viewingProcedure, setViewingProcedure] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [animationClass, setAnimationClass] = useState('');
  const { getHistorial } = useReserva();

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const data = await getHistorial(paciente.rut);
        // Flatten the array of arrays
        const flattenedData = data.flat();
        setHistorial(flattenedData);
      } catch (error) {
        console.error(error);
      }
    };

    if (open) {
      fetchHistorial();
    }
  }, [open, paciente.rut, getHistorial]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 500); // Duración de la animación
  };

  const handleViewProcedure = (sesion) => {
    setAnimationClass('slide-out-left');
    setTimeout(() => {
      setSelectedSesion(sesion);
      setViewingProcedure(true);
      setAnimationClass('slide-in-right');
    }, 300); // Duración de la animación
  };

  const handleBackToHistorial = () => {
    setAnimationClass('slide-out-right');
    setTimeout(() => {
      setViewingProcedure(false);
      setSelectedSesion(null);
      setAnimationClass('slide-in-left');
    }, 300); // Duración de la animación
  };

  const modalClass = window.innerWidth < 600 ? (closing ? 'modal-slide-out-down' : 'modal-slide-in-up') : (closing ? 'modal-slide-out-right' : 'modal-slide-in-right');

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        p={3}
        bgcolor="#f1eeee"
        borderRadius={2}
        boxShadow={3}
        width={window.innerWidth < 600 ? '90%' : 530}
        maxHeight={window.innerHeight < 600 ? '90%' : 580}
        minHeight={window.innerHeight < 600 ? '90%' : 580}
        mx="auto"
        my="10%"
        overflow="auto"
        className={modalClass}
        display="flex"
        flexDirection="column"
      >
        {viewingProcedure && selectedSesion ? (
          <Box className={animationClass}>
            <Typography variant="h6" gutterBottom textAlign="center">Procedimiento {new Date(selectedSesion.fecha).toLocaleDateString()}</Typography>
            <Box display="flex" flexDirection="column" p={1} minHeight={'25pc'} maxHeight={'25pc'} flexGrow={1} backgroundColor="white" borderRadius={1} boxShadow={5} m={1} overflow={"auto"}>
              <ReactQuill
                value={selectedSesion.notas}
                readOnly={true}
                theme="bubble"
              />
              <Box flexGrow={1} />
            </Box>
            <Box className="modal-footer" display="flex" justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToHistorial}
              >
                Volver
              </Button>
            </Box>
          </Box>
        ) : (
          <Box className={animationClass}>
            <Typography variant="h6" gutterBottom>Historial de Sesiones</Typography>
            <List>
              {historial.map((sesion, index) => (
                <ListItem key={index} sx={{ display: 'flex', justifyContent: 'space-between', boxShadow: 5, borderRadius: 1, my: 1, backgroundColor:"white" }}>
                  <ListItemText primary={`Sesión ${index + 1}`} />
                  <ListItemText
                    primary={`${new Date(sesion.fecha).toLocaleDateString()}`}
                  />
                  <Box>
                    <Tooltip title="Ver procedimiento" arrow>
                      <IconButton
                        onClick={() => handleViewProcedure(sesion)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generar PDF del procedimiento" arrow>
                      <IconButton
                        onClick={() => {
                          window.open(sesion.url, '_blank');
                        }}
                      >
                        <PictureAsPdfIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default VerHistorial;