import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Typography, List, ListItem, ListItemText } from '@mui/material';
import { useSubscription } from '../context/subscriptionContext';

const ArrastraSeleccionaImagenes = ({ onImagesSelected, pacienteRut }) => {
  const [files, setFiles] = useState([]);
  const { canUploadExamImages } = useSubscription();

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]);
    onImagesSelected([...files, ...acceptedFiles]); // Pasa las imágenes seleccionadas al componente padre
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: true,
    disabled: !canUploadExamImages,
  });

  return (
    <Box>
      <Box {...getRootProps()} sx={{ border: '2px dashed grey', padding: '1rem', textAlign: 'center', opacity: canUploadExamImages ? 1 : 0.5 }}>
        <input {...getInputProps()} />
        <Typography variant="body1">
          Arrastra y suelta imágenes aquí, o haz clic para seleccionar imágenes
        </Typography>
        <Button
          variant="contained"
          component="span"
          sx={{ marginTop: '1rem', backgroundColor: '#2596be', color: 'white' }}
          disabled={!canUploadExamImages}
        >
          Seleccionar imágenes
        </Button>
      </Box>
      {!canUploadExamImages && (
        <Typography variant="caption" color="textSecondary">
          La subida de imágenes de exámenes está disponible en el Plan Avanzado y Teams.
        </Typography>
      )}
      <List>
        {files.map((file, index) => (
          <ListItem key={index}>
            <ListItemText primary={file.name} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ArrastraSeleccionaImagenes;