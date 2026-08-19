import { Card, CardContent, Stack } from '@mui/material';

export default function FilterBar({ children, sx }) {
  return (
    <Card sx={{ mb: { xs: 2, sm: 3 }, ...sx }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}
