import React from 'react';
import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import logo_simple from '../../assets/logo_simple.png';

const SiteFooter = () => {
  return (
    <Box component="footer" sx={{ py: 4, borderTop: '1px solid #e3f2fd', bgcolor: '#fff' }}>
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="center" justifyContent="space-between">
          <Grid item>
            <Stack direction="row" spacing={1} alignItems="center">
              <img src={logo_simple} alt="Logo" style={{ width: '3%' }} />
              <Typography fontWeight={700}>VITALINK</Typography>
            </Stack>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} VITALINK. Todos los derechos reservados.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default SiteFooter;
