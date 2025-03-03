import React, { useEffect, useState } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Tooltip, IconButton, Button, Checkbox, FormControlLabel } from '@mui/material';
import { useReserva } from '../../context/reservaContext';
import PDFPaciente from '../Pdfs/PDFPaciente';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../ui/VerDetalles.css';
import { set } from 'mongoose';

const VerHistorial = ({ open, onClose, paciente }) => {
  const [historial, setHistorial] = useState([]);
  const [closing, setClosing] = useState(false);
  const [viewingProcedure, setViewingProcedure] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [selectedSesiones, setSelectedSesiones] = useState([]);
  const [animationClass, setAnimationClass] = useState('');
  const [selectingPDF, setSelectingPDF] = useState(false);
  const [dataReserva, setDataReserva] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const { getHistorial, getReserva } = useReserva();

  const stickyHeaderStyles = {
    position: 'sticky',
    backgroundColor: 'primary.main',
    color: 'white',
    top: 0,
    left: -10,
    width: '100%',
    zIndex: 1, // Asegúrate de que el encabezado esté por encima del contenido
    padding: '10px', // Ajusta el padding según sea necesario
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)', // Opcional: añade una sombra para separar visualmente el encabezado del contenido
  };

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const data = await getHistorial(paciente.rut);
        const dataReserva = await getReserva(paciente.rut);
        // Flatten the array of arrays
        const flattenedData = data.flat();
        setHistorial(flattenedData);
        setDataReserva(dataReserva);
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

  const handleSelectSesion = (sesion) => {
    setSelectedSesiones((prevSelected) =>
      prevSelected.includes(sesion)
        ? prevSelected.filter((s) => s !== sesion)
        : [...prevSelected, sesion]
    );
  };

  const handleGeneratePDF = () => {
    setSelectingPDF(true);
  };

  const handleConfirmPDF = () => {
    if (selectedSesiones.length > 0) {
      PDFPaciente({ paciente, dataReserva, sesiones: selectedSesiones });
      setSelectingPDF(false);
      setSelectedSesiones([]);
    }
  };

  const handleCancelPDF = () => {
    setSelectingPDF(false);
    setSelectedSesiones([]);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSesiones([]);
    } else {
      setSelectedSesiones(historial);
    }
    setSelectAll(!selectAll);
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
            <Box sx={stickyHeaderStyles} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Historial de Sesiones</Typography>
              {selectingPDF ? (
                <Box display="flex" alignItems="center">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectAll}
                        onChange={handleSelectAll}
                        color='secondary'
                      />
                    }
                    label="Todos"
                  />
                  <Tooltip title="Confirmar selección" arrow>
                    <IconButton color="primary" onClick={handleConfirmPDF} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)', marginRight: '5px', backgroundColor: '#82e0aa', color: 'black' }}>
                      <CheckIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar selección" arrow>
                    <IconButton color="secondary" onClick={handleCancelPDF} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)', backgroundColor: '#f1948a', color: 'black' }}>
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Button variant="contained" color="secondary" onClick={handleGeneratePDF} startIcon={<PictureAsPdfIcon />} style={{ boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)' }}>
                  Generar PDF
                </Button>
              )}
            </Box>
            <List>
              {historial.map((sesion, index) => (
                <ListItem key={index} sx={{ display: 'flex', justifyContent: 'space-between', boxShadow: 5, borderRadius: 1, my: 1, backgroundColor: "white" }}>
                  {selectingPDF && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSesiones.includes(sesion)}
                          onChange={() => handleSelectSesion(sesion)}
                        />
                      }
                    />
                  )}
                  <ListItemText
                    primary={`Sesión ${index + 1} -> ${new Date(sesion.fecha).toLocaleDateString()}`}
                  />
                  <Box>
                    <Tooltip title="Ver procedimiento" arrow>
                      <IconButton
                        onClick={() => handleViewProcedure(sesion)}
                      >
                        <VisibilityIcon />
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