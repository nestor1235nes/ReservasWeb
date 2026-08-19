import { Box } from '@mui/material';

export default function PageLayout({ children, maxWidth = 1400, sx }) {
  return (
    <Box
      component="main"
      sx={{
        width: '100%',
        maxWidth,
        mx: 'auto',
        pb: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
