import React, { useState } from 'react';
import { Box, IconButton, Dialog, Typography } from '@mui/material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const MostrarImagenes = ({ imagenes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openZoom, setOpenZoom] = useState(false);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? imagenes.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === imagenes.length - 1 ? 0 : prevIndex + 1));
  };

  const handleZoomOpen = () => {
    setOpenZoom(true);
  };

  const handleZoomClose = () => {
    setOpenZoom(false);
  };

  if (!imagenes || imagenes.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center">
        <BrokenImageIcon style={{ fontSize: 50, opacity: '0.2' }} />
        <Typography variant="body1">No hay imágenes</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" my={2}>
      {imagenes.length > 1 && (
        <IconButton onClick={handlePrev}>
          <ArrowBackIosIcon />
        </IconButton>
      )}
      <img
        src={`http://localhost:4000${imagenes[currentIndex]}`}
        style={{ maxWidth: '100%', maxHeight: '200px', cursor: 'pointer' }}
        onClick={handleZoomOpen}
      />
      {imagenes.length > 1 && (
        <IconButton onClick={handleNext}>
          <ArrowForwardIosIcon />
        </IconButton>
      )}
      <Dialog open={openZoom} onClose={handleZoomClose} maxWidth="lg">
        <img src={`http://localhost:4000${imagenes[currentIndex]}`} style={{ width: '100%', height: 'auto' }} />
      </Dialog>
    </Box>
  );
};

export default MostrarImagenes;