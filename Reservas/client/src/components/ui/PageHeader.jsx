import { Box, Stack, Typography } from '@mui/material';

export default function PageHeader({ icon, title, subtitle, actions, toolbar, bg }) {
  const onColor = Boolean(bg);
  const titleColor = (t) => (onColor ? '#ffffff' : t.palette.custom.header.text);
  const subtitleColor = (t) => (onColor ? 'rgba(255,255,255,0.9)' : t.palette.text.secondary);

  return (
    <Box
      component="header"
      sx={(t) => ({
        background: bg || t.palette.custom.header.bg,
        border: `1px solid ${onColor ? 'transparent' : t.palette.custom.header.border}`,
        borderRadius: 2,
        px: { xs: 2, sm: 3 },
        py: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 3 },
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={{ xs: 1.5, sm: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          {icon && <Box sx={{ display: 'flex', color: titleColor }}>{icon}</Box>}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ color: titleColor }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: subtitleColor }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1 }}
          >
            {actions}
          </Stack>
        )}
      </Stack>

      {toolbar && <Box sx={{ mt: 2 }}>{toolbar}</Box>}
    </Box>
  );
}
