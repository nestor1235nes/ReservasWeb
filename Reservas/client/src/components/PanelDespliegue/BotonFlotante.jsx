import React, { useState } from 'react';
import { Fab, Tooltip, Portal, Box } from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import LiberarHoras from '../Modales/LiberarHoras';
import { useSubscription } from '../../context/subscriptionContext';
 
const BotonFlotante = ({ onClick, fetchReservas, gapi }) => {
  const [openLiberarHoras, setOpenLiberarHoras] = useState(false);
  const { isAdvanced, isTeams } = useSubscription();
  const canBlockHours = isAdvanced || isTeams;
  const handleClick = () => setOpenLiberarHoras(true);

  return (
    <>
      <Portal>
        <Tooltip
          title={canBlockHours ? "Bloquear día u horarios" : "Disponible solo en Plan Avanzado o Teams"}
          placement="top"
        >
          <Box
            component="span"
            sx={{
              position: 'fixed',
              bottom: { xs: '96px', sm: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' },
              right: { xs: '16px', sm: 'calc(env(safe-area-inset-right, 0px) + 16px)' },
              zIndex: (theme) => theme.zIndex.drawer - 1,
              display: 'inline-flex',
              pointerEvents: 'auto',
            }}
          >
            <Fab
              color="primary"
              aria-label="bloquear dia"
              onClick={handleClick}
              disabled={!canBlockHours}
              sx={{
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
                '&:hover': { filter: 'brightness(0.95)' },
                '&.Mui-disabled': {
                  opacity: 0.6,
                  color: 'white',
                },
              }}
            >
              <PriorityHighIcon sx={{ fontSize: { xs: 30, sm: 36 }, color: 'inherit' }} />
            </Fab>
          </Box>
        </Tooltip>
      </Portal>

      <LiberarHoras open={openLiberarHoras} onClose={() => setOpenLiberarHoras(false)} fetchReservas={fetchReservas} gapi={gapi} />
    </>
  );
};

export default BotonFlotante;