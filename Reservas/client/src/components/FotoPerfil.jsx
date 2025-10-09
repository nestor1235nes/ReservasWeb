import React, { useState, useRef } from 'react';
import { Avatar, Tooltip, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, Button, Slider } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useAuth } from '../context/authContext';
import { useAlert } from '../context/AlertContext'; 
import axios from '../api/axios';
import AvatarEditor from 'react-avatar-editor';
import { ASSETS_BASE } from '../config';

const FotoPerfil = () => {
  const { user, updatePerfil } = useAuth();
  const showAlert = useAlert();
  const [selectedFile, setSelectedFile] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const editorRef = useRef(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setEditorOpen(true);
  };

  const handleScaleChange = (event, newValue) => {
    setScale(newValue);
  };

  const handleSave = async () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas().toDataURL();
      const blob = await fetch(canvas).then(res => res.blob());
      const formData = new FormData();
      formData.append('file', blob, selectedFile.name);

      try {
        // Eliminar la foto de perfil anterior
        if (user.fotoPerfil) {
          await axios.delete(`/delete`, { data: { filePath: user.fotoPerfil } });
        }

        // Subir la nueva foto de perfil
        const res = await axios.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        await updatePerfil(user.id || user._id, { fotoPerfil: res.data.url });
        setEditorOpen(false);
        showAlert('success', 'Foto de perfil actualizada correctamente');
      } catch (error) {
        console.error('Error uploading file:', error);
        showAlert('error', 'Ocurrió un error al subir la foto de perfil, por favor intenta nuevamente');
      }
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="icon-button-file"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="icon-button-file">
        <Tooltip title="Agregar foto de perfil" arrow>
          <IconButton color="primary" component="span">
            <Avatar src={user.fotoPerfil ? `${ASSETS_BASE}${user.fotoPerfil}` : undefined} style={{ width: '100%', height: '100%' }}>
              {!user.fotoPerfil && <AddPhotoAlternateIcon />}
            </Avatar>
          </IconButton>
        </Tooltip>
      </label>

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)}>
        <DialogTitle>Ajustar Imagen</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <AvatarEditor
              ref={editorRef}
              image={selectedFile}
              width={250}
              height={250}
              border={50}
              borderRadius={125}
              scale={scale}
            />
          )}
          <Slider
            value={scale}
            min={1}
            max={2}
            step={0.01}
            onChange={handleScaleChange}
            aria-labelledby="scale-slider"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSave} color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FotoPerfil;