import React, { useEffect, useRef, useState } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Tooltip, IconButton, Button, Checkbox, FormControlLabel } from '@mui/material';
import { useReserva } from '../../context/reservaContext';
import { useAuth } from '../../context/authContext';
import { useAlert } from '../../context/AlertContext';
import PDFPaciente from '../Pdfs/PDFPaciente';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../ui/VerDetalles.css';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const VerHistorial = ({ open, onClose, paciente, profesionalId }) => {
  const [clinicalCases, setClinicalCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [closing, setClosing] = useState(false);
  const [viewingProcedure, setViewingProcedure] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [selectedSesiones, setSelectedSesiones] = useState([]);
  const [animationClass, setAnimationClass] = useState('');
  const [selectingPDF, setSelectingPDF] = useState(false);
  const [dataReserva, setDataReserva] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFullAnamnesis, setShowFullAnamnesis] = useState(false);
  const [anamnesisIsOverflowing, setAnamnesisIsOverflowing] = useState(false);
  const anamnesisContentRef = useRef(null);
  const anamnesisTopRef = useRef(null);
  const sesionesTopRef = useRef(null);
  const [scrollPulseTarget, setScrollPulseTarget] = useState(null); // 'anamnesis' | 'sesiones' | null
  const [activeSection, setActiveSection] = useState('anamnesis'); // 'anamnesis' | 'sesiones'
  const modalScrollRef = useRef(null);
  const { getHistorial, getReserva } = useReserva();
  const showAlert = useAlert();
  const { user } = useAuth();

  const smoothScrollTo = (ref) => {
    try {
      const el = ref?.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // no-op
    }
  };

  const pulse = (target) => {
    setScrollPulseTarget(target);
    setTimeout(() => setScrollPulseTarget(null), 220);
  };

  const goToSesiones = () => {
    // Al ir a sesiones, ocultar controles y salir de "ver más".
    setShowFullAnamnesis(false);
    setActiveSection('sesiones');
    smoothScrollTo(sesionesTopRef);
    pulse('sesiones');
  };

  const goToAnamnesis = () => {
    setActiveSection('anamnesis');
    smoothScrollTo(anamnesisTopRef);
    pulse('anamnesis');
  };

  const handleAnamnesisHeaderClick = () => {
    goToAnamnesis();
  };

  const handleSesionesHeaderClick = () => {
    if (activeSection === 'sesiones') {
      goToAnamnesis();
    } else {
      goToSesiones();
    }
  };

  const isModalScrollerNearTop = () => {
    try {
      const scroller = modalScrollRef.current;
      if (!scroller) return false;
      return (scroller.scrollTop || 0) <= 10;
    } catch {
      return false;
    }
  };

  const stickyHeaderStyles = {
    position: 'sticky',
    background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
    color: 'white',
    top: 0,
    // Edge-to-edge dentro del contenedor con padding
    mx: -3,
    px: 3,
    py: 2.25,
    width: 'auto',
    zIndex: 2,
    boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
    borderRadius: '9px 9px 0 0',
  };

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const data = await getHistorial(paciente.rut, profesionalId);
        const dataReserva = await getReserva(paciente.rut);
        
        console.log('Datos del historial recibidos:', data); // Debug
        console.log('Datos de la reserva recibidos:', dataReserva); // Debug

        const cases = Array.isArray(data?.clinicalCases) ? data.clinicalCases : [];
        setClinicalCases(cases);
        setSelectedCase(null);
        setHistorial([]);
        setDataReserva(dataReserva);
      } catch (error) {
        console.error('Error al cargar historial:', error);
      }
    };

    if (open) {
      fetchHistorial();
    }
  }, [open, paciente.rut, profesionalId, getHistorial]);

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

  const handleSelectCase = (clinicalCase) => {
    setAnimationClass('slide-out-left');
    setTimeout(() => {
      setSelectedCase(clinicalCase);
      const sesiones = Array.isArray(clinicalCase?.sesiones) ? clinicalCase.sesiones : [];
      // Ordenar por fecha ascendente (si existe)
      const sorted = sesiones.slice().sort((a, b) => {
        const da = a?.fecha ? new Date(a.fecha).getTime() : 0;
        const db = b?.fecha ? new Date(b.fecha).getTime() : 0;
        return da - db;
      });
      setHistorial(sorted);
      setSelectedSesiones([]);
      setSelectingPDF(false);
      setSelectAll(false);
      setShowFullAnamnesis(false);
      setAnamnesisIsOverflowing(false);
      setActiveSection('anamnesis');
      setAnimationClass('slide-in-right');
    }, 300);
  };

  const handleBackToCases = () => {
    setAnimationClass('slide-out-right');
    setTimeout(() => {
      setSelectedCase(null);
      setHistorial([]);
      setViewingProcedure(false);
      setSelectedSesion(null);
      setSelectedSesiones([]);
      setSelectingPDF(false);
      setSelectAll(false);
      setShowFullAnamnesis(false);
      setAnamnesisIsOverflowing(false);
      setActiveSection('anamnesis');
      setAnimationClass('slide-in-left');
    }, 300);
  };

  useEffect(() => {
    // Detectar overflow para mostrar "Ver más" solo cuando haga falta
    if (!selectedCase || showFullAnamnesis) {
      setAnamnesisIsOverflowing(false);
      return;
    }
    // Esperar un tick para que ReactQuill renderice
    const t = setTimeout(() => {
      const el = anamnesisContentRef.current;
      if (!el) return;
      setAnamnesisIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    }, 0);
    return () => clearTimeout(t);
  }, [selectedCase, showFullAnamnesis]);

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
      PDFPaciente({ paciente, dataReserva, sesiones: selectedSesiones, user });
      setSelectingPDF(false);
      setSelectedSesiones([]);
    }
    else{
      showAlert('error', 'Debes seleccionar al menos una sesión para generar el PDF');
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
    <Modal open={open} onClose={handleClose} className="modal-over-drawer">
      <Box
        ref={modalScrollRef}
        onWheel={(e) => {
          // Volver a Anamnesis con rueda hacia arriba cuando estamos en Sesiones y ya estamos arriba
          if (activeSection === 'sesiones' && e.deltaY < 0 && isModalScrollerNearTop()) {
            e.preventDefault();
            goToAnamnesis();
          }
        }}
        px={3}
        pb={3}
        pt={0}
        bgcolor="#e3f2fd"
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
          <Box className={animationClass} sx={{overflow:'hidden'}}>
            <Box sx={stickyHeaderStyles} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" gutterBottom textAlign="center">
                <strong>Procedimiento del día: </strong>{dayjs(selectedSesion.fecha).isValid() ? dayjs(selectedSesion.fecha).format('DD/MM/YYYY') : 'Fecha no válida'}
              </Typography>
            </Box>
            <Box display="flex" flexDirection="column" p={0} minHeight={'25pc'} maxHeight={'25pc'} flexGrow={1} backgroundColor="white" borderRadius={1} boxShadow={5} m={1} overflow={"auto"}>
              <ReactQuill
                value={selectedSesion.notas}
                readOnly={true}
                theme="bubble"
              />
              <Box />
            </Box>
            <Box className="modal-footer" display="flex" justifyContent="center">
              <Button
                variant="contained"
                sx={{ backgroundColor: '#2596be', color: 'white', boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)' }}
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToHistorial}
              >
                Volver
              </Button>
            </Box>
          </Box>
        ) : selectedCase ? (
          <Box className={animationClass}>
            <Box sx={stickyHeaderStyles} display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={handleBackToCases} sx={{ color: 'white' }}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6">
                  {selectedCase?.diagnostico ? selectedCase.diagnostico : 'Diagnóstico sin nombre'}
                </Typography>
              </Box>
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
                <Button
                  variant="contained"
                  onClick={handleGeneratePDF}
                  startIcon={<PictureAsPdfIcon />}
                  sx={{
                    background: 'white',
                    color: '#2596be',
                    boxShadow: '0 0 5px 0 rgba(0,0,0,0.2)',
                  }}
                >
                  Generar PDF
                </Button>
              )}
            </Box>

            {/* Encabezado "Anamnesis" (mismo estilo que "Sesiones" y clickeable para volver) */}
            <Box
              m={1}
              mb={0}
              p={1.25}
              bgcolor="transparent"
              sx={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={handleAnamnesisHeaderClick}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="subtitle1" fontWeight={700} color='#2596be'>
                  Anamnesis
                </Typography>
                {activeSection !== 'sesiones' && (!showFullAnamnesis && anamnesisIsOverflowing) ? (
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullAnamnesis(true);
                    }}
                    sx={{ minWidth: 0, px: 1.0, textTransform: 'none', color: '#2596be' }}
                  >
                    Ver más
                  </Button>
                ) : activeSection !== 'sesiones' && showFullAnamnesis ? (
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullAnamnesis(false);
                      setTimeout(() => smoothScrollTo(anamnesisTopRef), 0);
                    }}
                    sx={{ minWidth: 0, px: 1.0, textTransform: 'none', color: '#2596be' }}
                  >
                    Ver menos
                  </Button>
                ) : null}
              </Box>
            </Box>

            <Box
              display="flex"
              flexDirection="column"
              p={0}
              flexGrow={0}
              backgroundColor="white"
              borderRadius={1}
              boxShadow={5}
              m={activeSection === 'sesiones' ? 0 : 1}
              overflow={activeSection === 'sesiones' ? 'hidden' : 'auto'}
              sx={{
                opacity: activeSection === 'sesiones' ? 0 : (scrollPulseTarget === 'anamnesis' ? 0.75 : 1),
                maxHeight: activeSection === 'sesiones'
                  ? 0
                  : (showFullAnamnesis
                    ? (window.innerWidth < 600 ? '70vh' : '520px')
                    : (window.innerWidth < 600 ? '45vh' : '320px')),
                transition: 'opacity 260ms ease, max-height 260ms ease',
                pointerEvents: activeSection === 'sesiones' ? 'none' : 'auto',
              }}
            >
              <Box ref={anamnesisTopRef} />
              <Box px={2} pt={2} pb={2}>
                <Box
                  ref={anamnesisContentRef}
                  sx={{
                    maxHeight: showFullAnamnesis ? 'none' : (window.innerWidth < 600 ? '30vh' : '240px'),
                    overflow: showFullAnamnesis ? 'visible' : 'hidden',
                  }}
                  onWheel={(e) => {
                    if (!showFullAnamnesis && e.deltaY > 0) {
                      e.preventDefault();
                      goToSesiones();
                    }
                  }}
                >
                  <ReactQuill
                    value={selectedCase?.anamnesis || 'Sin información registrada'}
                    readOnly={true}
                    theme="bubble"
                  />
                </Box>
              </Box>
            </Box>

            {/* Solo título "Sesiones" (clickeable) */}
            <Box
              m={1}
              mt={0}
              p={1.25}
              bgcolor="transparent"
              sx={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={handleSesionesHeaderClick}
            >
              <Typography variant="subtitle1" fontWeight={700} color='#2596be'>
                Sesiones
              </Typography>
            </Box>

            <Box
              ref={sesionesTopRef}
              sx={{
                opacity: scrollPulseTarget === 'sesiones' ? 0.75 : 1,
                transition: 'opacity 200ms ease',
              }}
            />

            <Box
              sx={{
                opacity: activeSection === 'sesiones' ? (scrollPulseTarget === 'sesiones' ? 0.75 : 1) : 0,
                maxHeight: activeSection === 'sesiones' ? '10000px' : 0,
                overflow: 'hidden',
                transition: 'opacity 260ms ease, max-height 260ms ease',
                pointerEvents: activeSection === 'sesiones' ? 'auto' : 'none',
              }}
            >
              <List
                onWheel={(e) => {
                  // La detección real se hace en el contenedor (modal) con scrollTop.
                  // Aquí no interceptamos para no bloquear el scroll normal dentro de sesiones.
                }}
              >
              {historial.map((sesion, index) => (
                <ListItem key={index} sx={{ display: 'flex', justifyContent: 'space-between', boxShadow: 5, borderRadius: 1, my: 1, backgroundColor: "white", border: "2px solid #e3f2fd",
                      "&:hover": {
                        boxShadow: 3,
                        borderColor: "#2596be",
                      }, }}>
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
                    
                    primary={`Sesión ${index + 1} -> ${dayjs(sesion.fecha).isValid() ? dayjs(sesion.fecha).format('DD/MM/YYYY') : 'Fecha no válida'}`}
                  />
                  <Box>
                    <Tooltip title="Ver procedimiento" arrow>
                      <IconButton
                        onClick={() => handleViewProcedure(sesion)}
                      >
                        <VisibilityIcon sx={{ color: '#2596be' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
              </List>
            </Box>
          </Box>
        ) : (
          <Box className={animationClass}>
            <Box sx={stickyHeaderStyles} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Diagnósticos</Typography>
            </Box>
            <List>
              {clinicalCases.map((c, idx) => (
                <ListItem
                  key={c?._id || idx}
                  button
                  onClick={() => handleSelectCase(c)}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    boxShadow: 5,
                    borderRadius: 1,
                    my: 1,
                    backgroundColor: 'white',
                    border: '2px solid #e3f2fd',
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "#2596be",
                    },
                  }}
                >
                  <ListItemText
                    primary={c?.diagnostico ? c.diagnostico : `Diagnóstico ${idx + 1}`}
                    secondary={Array.isArray(c?.sesiones) ? `${c.sesiones.length} sesión(es)` : '0 sesión(es)'}
                  />
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