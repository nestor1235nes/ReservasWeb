import React, { useState } from 'react';
import { Fab, Tooltip, Portal } from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import LiberarHoras from '../Modales/LiberarHoras';
 
const BotonFlotante = ({ onClick, fetchReservas, gapi }) => {
  const [openLiberarHoras, setOpenLiberarHoras] = useState(false);
  const handleClick = () => setOpenLiberarHoras(true);

  return (
    <>
      <Portal>
        <Tooltip title="Bloquea un día en tu calendario" placement="top">
          <Fab
            color="primary"
            aria-label="bloquear dia"
            onClick={handleClick}
            sx={{
              position: 'fixed',
              bottom: { xs: '96px', sm: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' },
              right: { xs: '16px', sm: 'calc(env(safe-area-inset-right, 0px) + 16px)' },
              zIndex: (theme) => theme.zIndex.drawer - 1, // debajo de Drawer/DespliegueEventos
              width: { xs: 56, sm: 64 },
              height: { xs: 56, sm: 64 },
              borderRadius: 2,
              // Hexagon shape via clip-path
              clipPath: 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 6,
              background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
              color: 'white',
              pointerEvents: 'auto',
              '&:hover': { filter: 'brightness(0.95)' }
            }}
          >
            <PriorityHighIcon sx={{ fontSize: { xs: 30, sm: 36 }, color: 'inherit' }} />
          </Fab>
        </Tooltip>
      </Portal>

      <LiberarHoras open={openLiberarHoras} onClose={() => setOpenLiberarHoras(false)} fetchReservas={fetchReservas} gapi={gapi} />
    </>
  );
};

export default BotonFlotante;