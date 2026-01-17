import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export default function ExpandableText({
  text,
  lines = 3,
  minCharsForToggle = 220,
  typographyProps,
  moreLabel = 'Ver más',
  lessLabel = 'Ver menos',
}) {
  const value = (text ?? '').toString().trim();
  const [expanded, setExpanded] = React.useState(false);

  if (!value) return null;

  const showToggle = value.length > minCharsForToggle;

  const sx = {
    ...(typographyProps?.sx || {}),
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: expanded ? 'unset' : lines,
    overflow: 'hidden',
  };

  return (
    <Box>
      <Typography {...typographyProps} sx={sx}>
        {value}
      </Typography>

      {showToggle && (
        <Button
          variant="text"
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ px: 0, mt: 0.75, fontWeight: 900, textTransform: 'none' }}
        >
          {expanded ? lessLabel : moreLabel}
        </Button>
      )}
    </Box>
  );
}
