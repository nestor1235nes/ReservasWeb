import jwt from 'jsonwebtoken';
import { TOKEN_SECRET } from '../config.js';

function readToken(req) {
  let token = req.cookies?.token;
  if (!token && req.headers?.authorization) {
    const authHeader = String(req.headers.authorization);
    if (authHeader.toLowerCase().startsWith('bearer ')) token = authHeader.slice(7);
  }
  return token;
}

// Permite:
// - Profesional (token normal cookie/bearer) => acceso a cualquier RUT
// - Paciente (token bearer con { type:'patient', rut }) => solo a su propio RUT
export function portalRutAuth(paramName = 'rut') {
  return (req, res, next) => {
    try {
      const token = readToken(req);
      if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

      jwt.verify(token, TOKEN_SECRET, (error, payload) => {
        if (error) return res.status(401).json({ message: 'Token is not valid' });

        req.user = payload;

        const requestedRut = String(req.params?.[paramName] || '').trim();
        if (payload?.type === 'patient') {
          const tokenRut = String(payload?.rut || '').trim();
          if (!tokenRut || !requestedRut || tokenRut !== requestedRut) {
            return res.status(403).json({ message: 'No autorizado para este RUT' });
          }
        }

        return next();
      });
    } catch (e) {
      return res.status(500).json({ message: e?.message || String(e) });
    }
  };
}
