import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Define the base directory for uploads
const uploadsDir = path.join('C:', 'Users', 'ramir', 'OneDrive', 'Documents', 'Git', 'ReservasWeb', 'Reservas');

router.delete('/delete', (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  // Construir la ruta completa asegurándose de que apunte al directorio 'uploads'
  const fullPath = path.join(uploadsDir, filePath);

  fs.unlink(fullPath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).json({ error: 'Error deleting file' });
    }

    res.status(200).json({ message: 'File deleted successfully' });
  });
});

export default router;