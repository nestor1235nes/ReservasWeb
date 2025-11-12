import React from 'react';
import { AppBar, Toolbar, Stack, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Logo from '../../assets/LOGO.png';

const TopAppBar = ({ hideProLink = false }) => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'transparent',
        color: 'inherit',
        borderBottom: '1px solid #e3f2fd',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
          <img src={Logo} alt="Sessionly Logo" style={{ width: 150, height: 40 }} />
        </Stack>
        <Box sx={{ flex: 1 }} />
        {!hideProLink && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button color="inherit" component={RouterLink} to="/front-users">¿Eres profesional?</Button>
          </Stack>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopAppBar;
