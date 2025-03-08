import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Typography, List, ListItem, ListItemText } from '@mui/material';

const ArrastraSeleccionaImagenes = ({ onImagesSelected, pacienteRut }) => {
  const [files, setFiles] = useState([]);

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]);
    onImagesSelected([...files, ...acceptedFiles]); // Pasa las imágenes seleccionadas al componente padre
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: true,
  });

  return (
    <Box>
      <Box {...getRootProps()} sx={{ border: '2px dashed grey', padding: '1rem', textAlign: 'center' }}>
        <input {...getInputProps()} />
        <Typography variant="body1">Arrastra y suelta imágenes aquí, o haz clic para seleccionar imágenes</Typography>
        <Button variant="contained" component="span" sx={{ marginTop: '1rem' }}>
          Seleccionar imágenes
        </Button>
      </Box>
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