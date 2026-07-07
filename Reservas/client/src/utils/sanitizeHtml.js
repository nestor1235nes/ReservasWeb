// Sanitiza HTML proveniente de contenido del usuario (notas clínicas, anamnesis,
// diagnósticos) antes de renderizarlo, para evitar XSS persistente.
// Mantiene el formato seguro (negritas, listas, etc.) y elimina scripts y
// manejadores de eventos (onerror, onclick, etc.).
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html) => {
  try {
    return DOMPurify.sanitize(String(html ?? ''), {
      USE_PROFILES: { html: true },
    });
  } catch {
    // Ante cualquier fallo, degradar a texto plano escapado (sin etiquetas).
    return String(html ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

export default sanitizeHtml;
