import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Compute project root from this file location: src/routes -> project root is two levels up
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsBase = path.join(projectRoot, 'uploads');
const imagenesPacientesBase = path.join(projectRoot, 'imagenesPacientes');

function isPathInside(child, parent) {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

router.delete('/delete', (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'File path is required' });
  }

  // Remove any leading slash and normalize
  const cleaned = filePath.replace(/^\\+|^\/+/, '');
  const fullPath = path.join(projectRoot, cleaned);

  // Only allow deletion inside uploads or imagenesPacientes
  const allowed = [uploadsBase, imagenesPacientesBase];
  const allowedMatch = allowed.some((base) => fullPath === base || isPathInside(fullPath, base));
  if (!allowedMatch) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  fs.unlink(fullPath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File already not present; consider success for idempotency
        return res.status(200).json({ message: 'File not found; considered deleted' });
      }
      console.error('Error deleting file:', err);
      return res.status(500).json({ error: 'Error deleting file' });
    }
    res.status(200).json({ message: 'File deleted successfully' });
  });
});

export default router;