import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Skeleton,
  Grid,
  Tabs,
  Tab,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Popper,
  Paper,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckIcon from '@mui/icons-material/Check';

import TopAppBar from '../components/ui/TopAppBar';
import SiteFooter from '../components/ui/SiteFooter';
import FullPageLoader from '../components/ui/FullPageLoader';

import { usePaciente } from '../context/pacienteContext';
import { useReserva } from '../context/reservaContext';
import { useAlert } from '../context/AlertContext';

const STORAGE_KEY = 'patient_rut';
const TOKEN_KEY = 'patient_token';

const BRAND_GRADIENT = 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)';
const BRAND_GRADIENT_SOFT = 'linear-gradient(45deg, rgba(37,150,190,0.10) 30%, rgba(33,203,230,0.12) 90%)';
const BRAND_BORDER = '#e3f2fd';
const BRAND_TEXT_DARK = '#0f5b75';
const BRAND_BORDER_HOVER = '#2596be';

const HOVER_CARD_SX = {
  transition: 'border-color 140ms ease, box-shadow 140ms ease',
  '&:hover': {
    borderColor: BRAND_BORDER_HOVER,
    boxShadow: 2,
  },
};

const HOVER_BOX_SX = {
  transition: 'border-color 140ms ease, box-shadow 140ms ease',
  '&:hover': {
    borderColor: BRAND_BORDER_HOVER,
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
  },
};

const fmtDate = (value) => {
  if (!value) return '';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '';
};

const calcAgeYears = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const dob = dayjs(fechaNacimiento);
  if (!dob.isValid()) return null;
  const years = dayjs().diff(dob, 'year');
  if (!Number.isFinite(years) || years < 0 || years > 130) return null;
  return years;
};

const isProbablyHtml = (value) => /<\s*\w+[^>]*>/.test(String(value || ''));

const sanitizeHtml = (html) => {
  try {
    return DOMPurify.sanitize(String(html || ''), {
      USE_PROFILES: { html: true },
    });
  } catch {
    return String(html || '');
  }
};

const htmlToText = (html) => {
  const raw = String(html || '');
  if (!raw) return '';
  try {
    if (typeof window !== 'undefined' && window.document) {
      const el = window.document.createElement('div');
      el.innerHTML = sanitizeHtml(raw);
      return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
    }
  } catch {
    // ignore
  }
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

function HelpBubble({ open, anchorEl, children }) {
  const isOpen = !!open && !!anchorEl;
  return (
    <Popper open={isOpen} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 1400 }}>
      <Box
        sx={{
          position: 'relative',
          mt: 1,
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -8,
            left: 16,
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid #ffffff',
            filter: 'drop-shadow(0px -1px 1px rgba(0,0,0,0.08))',
          },
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 1.25,
            borderRadius: 2,
            border: `1px solid ${BRAND_BORDER}`,
            maxWidth: 340,
          }}
        >
          {children}
        </Paper>
      </Box>
    </Popper>
  );
}

const flattenHistorialLegacy = (historial) => {
  if (!Array.isArray(historial)) return [];
  const flat = Array.isArray(historial[0]) ? historial.flat() : historial;
  return flat.filter(Boolean);
};

function RichBlock({ html, empty = '—' }) {
  const value = String(html || '').trim();
  if (!value) return <Typography variant="body2" color="text.secondary">{empty}</Typography>;
  if (!isProbablyHtml(value)) {
    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{value}</Typography>;
  }
  return (
    <Box
      className="ql-editor"
      sx={{
        p: 0,
        '&.ql-editor': { padding: 0 },
        '& h1, & h2, & h3': { margin: '0.25rem 0' },
        '& p': { margin: '0.25rem 0' },
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
    />
  );
}

function ExpandableRich({ html, empty = '—', collapsedMaxHeight = 160, minTextLengthToToggle = 260 }) {
  const value = String(html || '').trim();
  const [expanded, setExpanded] = useState(false);

  const plain = useMemo(() => htmlToText(value), [value]);
  const showToggle = !!value && plain.length >= minTextLengthToToggle;

  if (!value) return <Typography variant="body2" color="text.secondary">{empty}</Typography>;

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          maxHeight: expanded ? 'none' : collapsedMaxHeight,
          overflow: expanded ? 'visible' : 'hidden',
          borderRadius: 1.5,
          ...(expanded
            ? null
            : {
                '&:after': showToggle
                  ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 42,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                      pointerEvents: 'none',
                    }
                  : null,
              }),
        }}
      >
        <RichBlock html={value} empty={empty} />
      </Box>

      {showToggle ? (
        <Button
          size="small"
          variant="text"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: 0.5, fontWeight: 900, textTransform: 'none' }}
          aria-expanded={expanded}
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </Button>
      ) : null}
    </Box>
  );
}

export default function PacientePortalPageFixed() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { getPacientePorRut, updatePacientePublicPorRut } = usePaciente();
  const { getReservasPorRut } = useReserva();
  const showAlert = useAlert();

  const [rut, setRut] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const [docsProfesionalKey, setDocsProfesionalKey] = useState('');
  const [docsDiagnosticoKey, setDocsDiagnosticoKey] = useState('');
  const [docsSelectingPdf, setDocsSelectingPdf] = useState(false);
  const [docsSelectAll, setDocsSelectAll] = useState(false);
  const [docsSelectedKeys, setDocsSelectedKeys] = useState(() => new Set());

  const docsProfesionalesRef = useRef(null);
  const docsDiagnosticosRef = useRef(null);
  const docsSesionesRef = useRef(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    fechaNacimiento: null,
    sexo: 'No especifica',
    tipoSangre: '',
    prevision: 'No especifica',
    alergias: [],
    medicamentosActivos: [],
    contactoEmergencia: { nombre: '', relacion: '', telefono: '' },
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    const token = localStorage.getItem(TOKEN_KEY) || '';
    if (!stored) {
      navigate('/paciente/login', { replace: true });
      return;
    }
    if (!token) {
      navigate('/paciente/login', { replace: true });
      return;
    }
    setRut(stored);
  }, [navigate]);

  useEffect(() => {
    const run = async () => {
      if (!rut) return;
      setError('');
      setLoading(true);
      try {
        const token = localStorage.getItem(TOKEN_KEY) || '';
        const p = await getPacientePorRut(rut, token);
        if (!p?._id) {
          setError('No encontramos tu ficha. Vuelve a iniciar sesión con tu RUT.');
          setPaciente(null);
          setReservas([]);
          return;
        }
        setPaciente(p);
        const rs = await getReservasPorRut(rut, token);
        setReservas(Array.isArray(rs) ? rs : []);
      } catch {
        setError('No se pudo cargar tu información. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [rut, getPacientePorRut, getReservasPorRut]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    navigate('/paciente/login', { replace: true });
  };

  const casosClinicos = useMemo(() => {
    const out = [];
    (reservas || []).forEach((r) => {
      const cases = Array.isArray(r?.clinicalCases) ? r.clinicalCases : [];
      cases.forEach((c, idx) => {
        out.push({
          key: `${r?._id || 'r'}:${idx}`,
          createdAt: c?.createdAt || r?.createdAt,
          profesional: r?.profesional,
          diagnostico: c?.diagnostico || '',
          diagnosticoText: htmlToText(c?.diagnostico) || '(Sin diagnóstico)',
          anamnesis: c?.anamnesis || '',
          signosVitales: c?.signosVitales || null,
        });
      });
    });
    out.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    return out;
  }, [reservas]);

  const documentosProfesionales = useMemo(() => {
    const map = new Map();

    (reservas || []).forEach((r) => {
      const pro = r?.profesional;
      const proKey = pro?._id || pro?.id || pro?.email || pro?.username || String(r?.profesional || '');
      const finalProKey = String(proKey || 'unknown');

      if (!map.has(finalProKey)) {
        map.set(finalProKey, {
          key: finalProKey,
          profesional: pro,
          grupos: [],
        });
      }
      const entry = map.get(finalProKey);

      // Legacy historial (reserva.historial)
      const legacySesiones = flattenHistorialLegacy(r?.historial);
      if (legacySesiones.length > 0) {
        entry.grupos.push({
          key: `legacy:${r?._id || Math.random().toString(16).slice(2)}`,
          diagnosticoHtml: r?.diagnostico || '',
          diagnosticoText: htmlToText(r?.diagnostico) || '(Sin diagnóstico)',
          anamnesisHtml: r?.anamnesis || '',
          sesiones: legacySesiones.map((s, idx) => ({
            key: `legacy:${r?._id || 'r'}:${idx}`,
            fecha: s?.fecha,
            notas: s?.notas,
            raw: s,
          })),
        });
      }

      // Clinical cases sesiones
      const cases = Array.isArray(r?.clinicalCases) ? r.clinicalCases : [];
      cases.forEach((c, idx) => {
        const sesiones = Array.isArray(c?.sesiones) ? c.sesiones : [];
        if (sesiones.length === 0) return;
        entry.grupos.push({
          key: `case:${r?._id || 'r'}:${c?._id || idx}`,
          diagnosticoHtml: c?.diagnostico || '',
          diagnosticoText: htmlToText(c?.diagnostico) || `(Diagnóstico ${idx + 1})`,
          anamnesisHtml: c?.anamnesis || '',
          sesiones: sesiones.map((s, sidx) => ({
            key: `case:${r?._id || 'r'}:${c?._id || idx}:ses:${sidx}`,
            fecha: s?.fecha,
            notas: s?.notas,
            raw: s,
          })),
        });
      });
    });

    const arr = Array.from(map.values())
      .filter((x) => Array.isArray(x.grupos) && x.grupos.some((g) => (g?.sesiones || []).length > 0))
      .map((x) => {
        const grupos = (x.grupos || [])
          .filter((g) => (g?.sesiones || []).length > 0)
          .slice()
          .sort((a, b) => {
            const aDate = new Date(a?.sesiones?.[0]?.fecha || 0).getTime();
            const bDate = new Date(b?.sesiones?.[0]?.fecha || 0).getTime();
            return bDate - aDate;
          });
        return { ...x, grupos };
      })
      .sort((a, b) => {
        const an = (a?.profesional?.username || a?.profesional?.email || '').toString().toLowerCase();
        const bn = (b?.profesional?.username || b?.profesional?.email || '').toString().toLowerCase();
        return an.localeCompare(bn);
      });

    return arr;
  }, [reservas]);

  useEffect(() => {
    if (!docsProfesionalKey && documentosProfesionales.length > 0) {
      setDocsProfesionalKey(documentosProfesionales[0].key);
    }
  }, [documentosProfesionales, docsProfesionalKey]);

  const docsProfesionalActual = useMemo(
    () => documentosProfesionales.find((p) => p.key === docsProfesionalKey) || null,
    [documentosProfesionales, docsProfesionalKey]
  );

  const docsGrupoActual = useMemo(() => {
    if (!docsProfesionalActual || !docsDiagnosticoKey) return null;
    return (docsProfesionalActual?.grupos || []).find((g) => g.key === docsDiagnosticoKey) || null;
  }, [docsProfesionalActual, docsDiagnosticoKey]);

  const docsPdfStep1Done = !!docsProfesionalActual;
  const docsPdfStep2Done = !!docsGrupoActual;
  const docsPdfStep3Done = docsSelectedKeys.size > 0;
  const docsHelpStep1Open = docsSelectingPdf && !docsPdfStep1Done;
  const docsHelpStep2Open = docsSelectingPdf && docsPdfStep1Done && !docsPdfStep2Done;
  const docsHelpStep3Open = docsSelectingPdf && docsPdfStep1Done && docsPdfStep2Done && !docsPdfStep3Done;

  const allSessionKeysForSelectedGroup = useMemo(() => {
    const keys = [];
    (docsGrupoActual?.sesiones || []).forEach((s) => keys.push(s.key));
    return keys;
  }, [docsGrupoActual]);

  const toggleDocKey = (key) => {
    setDocsSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDocsStartPdf = () => {
    if (!docsProfesionalActual) {
      showAlert?.('error', 'Selecciona un profesional primero.');
      return;
    }
    setDocsSelectingPdf(true);
  };

  const handleDocsCancelPdf = () => {
    setDocsSelectingPdf(false);
    setDocsSelectAll(false);
    setDocsSelectedKeys(new Set());
    setDocsDiagnosticoKey('');
  };

  const handleDocsSelectAll = () => {
    setDocsSelectAll((prev) => {
      const next = !prev;
      if (!docsGrupoActual) {
        showAlert?.('error', 'Primero selecciona un diagnóstico.');
        return prev;
      }
      setDocsSelectedKeys(next ? new Set(allSessionKeysForSelectedGroup) : new Set());
      return next;
    });
  };

  const handleDocsConfirmPdf = () => {
    if (!paciente?._id) return;
    if (!docsProfesionalActual) {
      showAlert?.('error', 'Selecciona un profesional primero.');
      return;
    }
    if (!docsGrupoActual) {
      showAlert?.('error', 'Selecciona un diagnóstico.');
      return;
    }
    if (docsSelectedKeys.size === 0) {
      showAlert?.('error', 'Debes seleccionar al menos una sesión para generar el PDF');
      return;
    }

    const strip = (html) => htmlToText(html || '');
    const profesionalName = docsProfesionalActual?.profesional?.username || docsProfesionalActual?.profesional?.email || 'Profesional';

    const selectedGroups = [
      {
        diagnosticoText: docsGrupoActual?.diagnosticoText || 'Diagnóstico',
        anamnesisText: strip(docsGrupoActual?.anamnesisHtml || ''),
        sesiones: (docsGrupoActual?.sesiones || []).filter((s) => docsSelectedKeys.has(s.key)),
      },
    ].filter((g) => (g?.sesiones || []).length > 0);

    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Documentos del Paciente (Sesiones)', 45, 12);
    doc.setLineWidth(0.5);
    doc.line(10, 16, 200, 16);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', 10, 26);
    doc.setFont('helvetica', 'normal');
    doc.text(String(paciente?.nombre || '—'), 35, 26);

    doc.setFont('helvetica', 'bold');
    doc.text('RUT:', 120, 26);
    doc.setFont('helvetica', 'normal');
    doc.text(String(paciente?.rut || rut || '—'), 135, 26);

    doc.setFont('helvetica', 'bold');
    doc.text('Profesional:', 10, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(String(profesionalName), 40, 34);

    let nextY = 44;
    selectedGroups.forEach((g, idx) => {
      if (nextY > 260) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Diagnóstico ${idx + 1}:`, 10, nextY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dxLines = doc.splitTextToSize(String(g.diagnosticoText || '—'), 180);
      doc.text(dxLines, 10, nextY + 6);
      nextY += 10 + dxLines.length * 6;

      if (g.anamnesisText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Anamnesis:', 10, nextY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const anLines = doc.splitTextToSize(String(g.anamnesisText), 180);
        doc.text(anLines, 10, nextY + 6);
        nextY += 10 + anLines.length * 6;
      }

      const tableData = (g.sesiones || []).map((s) => [
        dayjs(s?.fecha).isValid() ? dayjs(s.fecha).format('DD/MM/YYYY') : '—',
        strip(s?.notas || ''),
      ]);

      // @ts-ignore - autotable extend
      doc.autoTable({
        startY: nextY,
        head: [['Fecha', 'Procedimiento']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 150, 190] },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 160 } },
      });

      // @ts-ignore
      nextY = (doc.lastAutoTable?.finalY || nextY) + 10;
    });

    doc.save(`Documentos_${paciente?.rut || rut || 'paciente'}.pdf`);
    handleDocsCancelPdf();
    showAlert?.('success', 'PDF generado.');
  };

  const signosDesdeCasos = useMemo(() => {
    const out = [];
    (reservas || []).forEach((r) => {
      const cases = Array.isArray(r?.clinicalCases) ? r.clinicalCases : [];
      cases.forEach((c, idx) => {
        const vital = c?.signosVitales || {};
        const hasAny = Object.values(vital || {}).some((v) => String(v || '').trim());
        if (!hasAny) return;
        out.push({
          key: `${r?._id || 'r'}:case:${idx}`,
          fecha: c?.createdAt || r?.siguienteCita || r?.createdAt,
          ...vital,
          source: 'clinicalCase',
        });
      });
    });
    return out;
  }, [reservas]);

  const todosLosSignos = useMemo(() => {
    const p = Array.isArray(paciente?.signosVitales) ? paciente.signosVitales : [];
    const base = p.map((x, idx) => ({ key: `paciente:${idx}`, source: 'paciente', ...x }));
    const merged = [...signosDesdeCasos, ...base];
    merged.sort((a, b) => new Date(b?.fecha || b?.createdAt || 0).getTime() - new Date(a?.fecha || a?.createdAt || 0).getTime());
    return merged;
  }, [paciente, signosDesdeCasos]);

  const ultimosSignos = useMemo(() => todosLosSignos[0] || null, [todosLosSignos]);

  const proximasCitas = useMemo(() => {
    const now = new Date();
    return (reservas || [])
      .filter(r => r?.siguienteCita && new Date(r.siguienteCita) >= now)
      .slice()
      .sort((a, b) => new Date(a.siguienteCita).getTime() - new Date(b.siguienteCita).getTime());
  }, [reservas]);

  const diagnosticosActivos = useMemo(() => {
    const set = new Set();
    (casosClinicos || []).forEach(c => {
      const dx = htmlToText(c?.diagnostico || '').toString().trim();
      if (dx) set.add(dx);
    });
    return Array.from(set).slice(0, 8);
  }, [casosClinicos]);

  const openEdit = () => {
    setEditError('');
    setForm({
      nombre: paciente?.nombre || '',
      email: paciente?.email || '',
      telefono: paciente?.telefono || '',
      direccion: paciente?.direccion || '',
      fechaNacimiento: paciente?.fechaNacimiento ? dayjs(paciente.fechaNacimiento) : null,
      sexo: paciente?.sexo || 'No especifica',
      tipoSangre: paciente?.tipoSangre || '',
      prevision: paciente?.prevision || 'No especifica',
      alergias: Array.isArray(paciente?.alergias) ? paciente.alergias : [],
      medicamentosActivos: Array.isArray(paciente?.medicamentosActivos) ? paciente.medicamentosActivos : [],
      contactoEmergencia: paciente?.contactoEmergencia || { nombre: '', relacion: '', telefono: '' },
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!rut) return;
    setEditError('');
    setEditSaving(true);
    try {
      const payload = {
        nombre: String(form.nombre || '').trim(),
        email: String(form.email || '').trim(),
        telefono: String(form.telefono || '').trim(),
        direccion: String(form.direccion || '').trim(),
        fechaNacimiento: form.fechaNacimiento && dayjs(form.fechaNacimiento).isValid() ? dayjs(form.fechaNacimiento).toDate() : null,
        sexo: form.sexo || 'No especifica',
        tipoSangre: String(form.tipoSangre || '').trim(),
        prevision: form.prevision || 'No especifica',
        alergias: (form.alergias || []).filter(a => String(a?.nombre || '').trim()).map(a => ({
          nombre: String(a?.nombre || '').trim(),
          severidad: (a?.severidad || 'baja').toString().toLowerCase(),
        })),
        medicamentosActivos: (form.medicamentosActivos || []).filter(m => String(m?.nombre || '').trim()).map(m => ({
          nombre: String(m?.nombre || '').trim(),
          dosis: String(m?.dosis || '').trim(),
          frecuencia: String(m?.frecuencia || '').trim(),
        })),
        contactoEmergencia: {
          nombre: String(form.contactoEmergencia?.nombre || '').trim(),
          relacion: String(form.contactoEmergencia?.relacion || '').trim(),
          telefono: String(form.contactoEmergencia?.telefono || '').trim(),
        },
      };

      const token = localStorage.getItem(TOKEN_KEY) || '';
      const updated = await updatePacientePublicPorRut(rut, payload, token);
      if (updated?._id) {
        setPaciente(updated);
        showAlert?.('success', 'Datos actualizados.');
        setEditOpen(false);
      } else {
        showAlert?.('success', 'Datos actualizados.');
        // fallback: recargar
        const p = await getPacientePorRut(rut, token);
        setPaciente(p);
        setEditOpen(false);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudieron guardar los cambios.';
      setEditError(msg);
      showAlert?.('error', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const edadFromDob = useMemo(() => calcAgeYears(paciente?.fechaNacimiento), [paciente]);

  if (loading && !paciente && !error) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfd 100%)' }}>
        <TopAppBar />
        <FullPageLoader />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #ffffff 0%, #f7fbfd 100%)' }}>
      <TopAppBar />

      <Box sx={{ width: '100%', maxWidth: 1100, alignSelf: 'center', flex: 1, p: { xs: 1.5, sm: 3 } }}>
        <Card sx={{ mb: 2, border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, overflow: 'hidden', ...HOVER_CARD_SX }}>
          <Box sx={{ p: { xs: 1.5, sm: 2 }, color: 'white', background: BRAND_GRADIENT }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Avatar sx={{ width: { xs: 44, sm: 52 }, height: { xs: 44, sm: 52 }, bgcolor: 'rgba(255,255,255,0.25)', fontWeight: 900, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  {(paciente?.nombre || 'P').trim().slice(0, 1).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={900} noWrap>{paciente?.nombre || 'Paciente'}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.95, fontSize: { xs: '0.75rem', sm: '0.875rem' } }} noWrap>
                    RUT: {rut || '—'} {!isMobile && paciente?.email ? `· ${paciente.email}` : ''}
                  </Typography>
                  {isMobile && paciente?.email && (
                    <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>{paciente.email}</Typography>
                  )}
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                <Button 
                  variant="outlined" 
                  onClick={openEdit} 
                  startIcon={!isMobile && <EditIcon />} 
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ borderColor: 'rgba(255,255,255,0.7)', color: 'white', fontWeight: 900, minWidth: { xs: 'auto', sm: 100 } }}
                >
                  {isMobile ? <EditIcon fontSize="small" /> : 'Editar'}
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleLogout} 
                  startIcon={!isMobile && <LogoutIcon />}
                  size={isMobile ? 'small' : 'medium'} 
                  sx={{ background: 'rgba(255,255,255,0.16)', fontWeight: 900, minWidth: { xs: 'auto', sm: 100 } }}
                >
                  {isMobile ? <LogoutIcon fontSize="small" /> : 'Salir'}
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 }, overflowX: 'auto' }}>
            <Tabs
              value={tab}
              onChange={(_e, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              TabIndicatorProps={{ sx: { display: 'none' } }}
              sx={{ 
                minHeight: { xs: 38, sm: 44 }, 
                '& .MuiTabs-flexContainer': { gap: { xs: 0.25, sm: 0.5 } },
                '& .MuiTabs-scroller': { overflow: 'auto !important' },
              }}
            >
              {[
                { label: 'Resumen', shortLabel: 'Resumen' },
                { label: 'Diagnósticos', shortLabel: 'Diag.' },
                { label: 'Citas', shortLabel: 'Citas' },
                { label: 'Medicamentos', shortLabel: 'Meds' },
                { label: 'Signos Vitales', shortLabel: 'Signos' },
                { label: 'Documentos', shortLabel: 'Docs' },
              ].map((item) => (
                <Tab
                  key={item.label}
                  label={isMobile ? item.shortLabel : item.label}
                  sx={{
                    textTransform: 'none',
                    minHeight: { xs: 34, sm: 40 },
                    minWidth: { xs: 'auto', sm: 90 },
                    py: { xs: 0.5, sm: 1 },
                    px: { xs: 1.25, sm: 2 },
                    borderRadius: 2,
                    fontWeight: 900,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    color: BRAND_TEXT_DARK,
                    '&.Mui-selected': {
                      background: BRAND_GRADIENT,
                      color: 'white',
                      boxShadow: 2,
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* TAB: Resumen */}
        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card sx={{ mb: { xs: 1.5, sm: 2 }, border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#e8f6fb', color: BRAND_TEXT_DARK }}>
                      <CalendarMonthIcon fontSize="small" />
                    </Box>
                    <Typography fontWeight={900} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Perfil</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Edad</Typography>
                  <Typography fontWeight={900} sx={{ mb: 1, fontSize: { xs: '0.9rem', sm: '1rem' } }}>{edadFromDob != null ? `${edadFromDob} años` : (paciente?.edad ? `${paciente.edad} años` : '—')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Sexo</Typography>
                  <Typography fontWeight={900} sx={{ mb: 1, fontSize: { xs: '0.9rem', sm: '1rem' } }}>{paciente?.sexo || 'No especifica'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Teléfono</Typography>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>{paciente?.telefono || '—'}</Typography>
                </CardContent>
              </Card>

              <Card sx={{ mb: { xs: 1.5, sm: 2 }, border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#e8f6fb', color: BRAND_TEXT_DARK }}>
                      <PhoneIphoneIcon fontSize="small" />
                    </Box>
                    <Typography fontWeight={900} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Contacto de emergencia</Typography>
                  </Stack>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>{paciente?.contactoEmergencia?.nombre || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{paciente?.contactoEmergencia?.relacion || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{paciente?.contactoEmergencia?.telefono || '—'}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card sx={{ mb: { xs: 1.5, sm: 2 }, border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#e8f6fb', color: BRAND_TEXT_DARK }}>
                      <FavoriteBorderIcon fontSize="small" />
                    </Box>
                    <Typography fontWeight={900} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Últimos signos vitales</Typography>
                  </Stack>
                  {loading ? (
                    <Skeleton height={120} />
                  ) : !ultimosSignos ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Fecha: {fmtDate(ultimosSignos?.fecha) || '—'} {ultimosSignos?.source === 'clinicalCase' ? '· desde ficha' : ''}
                      </Typography>
                      <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                        {[
                          { label: 'Presión Arterial', shortLabel: 'PA', value: ultimosSignos?.presionArterial, unit: 'mmHg' },
                          { label: 'Frecuencia Cardíaca', shortLabel: 'FC', value: ultimosSignos?.frecuenciaCardiaca, unit: 'lpm' },
                          { label: 'Peso', shortLabel: 'Peso', value: ultimosSignos?.pesoKg, unit: 'kg' },
                          { label: 'Talla', shortLabel: 'Talla', value: ultimosSignos?.tallaCm, unit: 'cm' },
                          { label: 'Temp', shortLabel: 'Temp', value: ultimosSignos?.temperaturaC, unit: '°C' },
                          { label: 'SatO2', shortLabel: 'SatO2', value: ultimosSignos?.saturacionO2, unit: '%' },
                          { label: 'Glucosa', shortLabel: 'Gluc.', value: ultimosSignos?.glucosaMgDl, unit: 'mg/dL' },
                        ].map((x) => (
                          <Grid item xs={6} sm={6} md={4} key={x.label}>
                            <Box sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, bgcolor: '#f7fbfd', border: '1px solid #e3f2fd', ...HOVER_BOX_SX }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                {isMobile ? x.shortLabel : x.label}
                              </Typography>
                              <Typography fontWeight={900} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                                {x.value ? `${x.value} ${x.unit || ''}` : '—'}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ mb: { xs: 1.5, sm: 2 }, border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#e8f6fb', color: BRAND_TEXT_DARK }}>
                      <BloodtypeIcon fontSize="small" />
                    </Box>
                    <Typography fontWeight={900} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Diagnósticos</Typography>
                  </Stack>
                  {loading ? (
                    <Skeleton height={60} />
                  ) : diagnosticosActivos.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  ) : (
                    <Stack direction="row" flexWrap="wrap" gap={{ xs: 0.5, sm: 1 }}>
                      {diagnosticosActivos.map((dx) => (
                        <Chip 
                          key={dx} 
                          label={dx} 
                          variant="outlined" 
                          size={isMobile ? 'small' : 'medium'}
                          sx={{ 
                            borderColor: '#2596be', 
                            color: BRAND_TEXT_DARK, 
                            fontWeight: 900,
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                          }} 
                        />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* TAB: Diagnósticos */}
        {tab === 1 && (
          <Card sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Typography fontWeight={900} sx={{ mb: 1, fontSize: { xs: '0.95rem', sm: '1rem' } }}>Diagnósticos / Ficha clínica</Typography>
              {loading ? (
                <Skeleton height={220} />
              ) : casosClinicos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Aún no hay diagnósticos registrados.</Typography>
              ) : (
                <Stack spacing={1}>
                  {casosClinicos.map((c) => (
                    <Accordion key={c.key} disableGutters sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 0, borderRadius: 2, ...HOVER_CARD_SX }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack spacing={0.25} sx={{ width: '100%' }}>
                          <Typography fontWeight={900}>{c.diagnosticoText}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Creado: {fmtDate(c.createdAt) || '—'} · Profesional: {c?.profesional?.username || c?.profesional?.email || '—'}
                          </Typography>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1.5}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={900}>Diagnóstico</Typography>
                            <RichBlock html={c.diagnostico} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={900}>Anamnesis</Typography>
                            <RichBlock html={c.anamnesis} />
                          </Box>

                          {c?.signosVitales && Object.values(c.signosVitales).some(v => String(v || '').trim()) ? (
                            <>
                              <Divider />
                              <Typography variant="subtitle2" fontWeight={900}>Signos vitales</Typography>
                              <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                                {[
                                  ['Presión arterial', c.signosVitales?.presionArterial, 'mmHg'],
                                  ['Frecuencia cardíaca', c.signosVitales?.frecuenciaCardiaca, 'lpm'],
                                  ['Peso', c.signosVitales?.pesoKg, 'kg'],
                                  ['Talla', c.signosVitales?.tallaCm, 'cm'],
                                  ['Temperatura', c.signosVitales?.temperaturaC, '°C'],
                                  ['Saturación O2', c.signosVitales?.saturacionO2, '%'],
                                  ['Glucosa', c.signosVitales?.glucosaMgDl, 'mg/dL'],
                                ].map(([lbl, v, unit]) => {
                                  const val = String(v || '').trim();
                                  if (!val) return null;
                                  return (
                                    <Grid item xs={6} sm={6} md={4} key={lbl}>
                                      <Box sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, bgcolor: '#f7fbfd', border: `1px solid ${BRAND_BORDER}`, ...HOVER_BOX_SX }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{lbl}</Typography>
                                        <Typography fontWeight={900} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{val}{unit ? ` ${unit}` : ''}</Typography>
                                      </Box>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </>
                          ) : null}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: Citas */}
        {tab === 2 && (
          <Card sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Typography fontWeight={900} sx={{ mb: 1, fontSize: { xs: '0.95rem', sm: '1rem' } }}>Citas</Typography>
              {loading ? (
                <>
                  <Skeleton height={160} />
                  <Skeleton height={42} />
                  <Skeleton height={42} />
                </>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.75 }}>Próximas citas</Typography>
                    {proximasCitas.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No hay próximas citas registradas.</Typography>
                    ) : (
                      <Stack spacing={1}>
                        {proximasCitas.slice(0, 8).map((r) => (
                          <Box key={r?._id} sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, bgcolor: '#f7fbfd', border: `1px solid ${BRAND_BORDER}`, ...HOVER_BOX_SX }}>
                            <Typography fontWeight={900} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                              {fmtDate(r?.siguienteCita) || '—'} {r?.hora ? `· ${r.hora}` : ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              Profesional: {r?.profesional?.username || r?.profesional?.email || '—'}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.75 }}>Historial</Typography>
                    {reservas.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Aún no hay atenciones registradas.</Typography>
                    ) : (
                      <Stack spacing={1}>
                        {reservas
                          .slice()
                          .sort((a, b) => new Date(b?.siguienteCita || b?.createdAt || 0).getTime() - new Date(a?.siguienteCita || a?.createdAt || 0).getTime())
                          .map((r) => (
                            <Accordion key={r?._id} disableGutters sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 0, borderRadius: 2, ...HOVER_CARD_SX }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack spacing={0.25} sx={{ width: '100%' }}>
                                  <Typography fontWeight={900}>
                                    {fmtDate(r?.siguienteCita) || 'Fecha no definida'} {r?.hora ? `· ${r.hora}` : ''}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Profesional: {r?.profesional?.username || r?.profesional?.email || '—'}
                                  </Typography>
                                </Stack>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Stack spacing={1}>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight={900}>Diagnóstico</Typography>
                                    <RichBlock html={r?.diagnostico || ''} />
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight={900}>Anamnesis</Typography>
                                    <RichBlock html={r?.anamnesis || ''} />
                                  </Box>
                                  <Divider />
                                  <Typography variant="caption" color="text.secondary">
                                    Casos clínicos en esta atención: {Array.isArray(r?.clinicalCases) ? r.clinicalCases.length : 0}
                                  </Typography>
                                </Stack>
                              </AccordionDetails>
                            </Accordion>
                          ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: Medicamentos */}
        {tab === 3 && (
          <Card sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                <Typography fontWeight={900}>Medicamentos</Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<EditIcon />} 
                  onClick={openEdit} 
                  size={isMobile ? 'small' : 'medium'}
                  fullWidth={isMobile}
                  sx={{ borderColor: '#2596be', color: BRAND_TEXT_DARK }}
                >
                  Editar
                </Button>
              </Stack>
              {loading ? (
                <Skeleton height={120} />
              ) : (
                <Stack spacing={1}>
                  {(Array.isArray(paciente?.medicamentosActivos) ? paciente.medicamentosActivos : []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  ) : (
                    (paciente.medicamentosActivos || []).map((m, idx) => (
                      <Box key={idx} sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, bgcolor: '#f7fbfd', border: `1px solid ${BRAND_BORDER}`, ...HOVER_BOX_SX }}>
                        <Typography fontWeight={900} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{m?.nombre || '—'}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          {[m?.dosis, m?.frecuencia].filter(Boolean).join(' • ') || '—'}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: Signos Vitales */}
        {tab === 4 && (
          <Card sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Typography fontWeight={900} sx={{ mb: 1, fontSize: { xs: '0.95rem', sm: '1rem' } }}>Signos Vitales</Typography>
              {loading ? (
                <Skeleton height={160} />
              ) : (
                <Stack spacing={1}>
                  {todosLosSignos.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  ) : (
                    todosLosSignos.map((sv, idx) => (
                      <Box key={sv?.key || idx} sx={{ p: { xs: 1, sm: 1.25 }, borderRadius: 2, bgcolor: '#f7fbfd', border: `1px solid ${BRAND_BORDER}`, ...HOVER_BOX_SX }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
                          <Typography fontWeight={900} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{fmtDate(sv?.fecha) || '—'}</Typography>
                          {sv?.source === 'clinicalCase' && (
                            <Chip size="small" label="Ficha" variant="outlined" sx={{ borderColor: '#2596be', color: BRAND_TEXT_DARK, fontWeight: 900, fontSize: { xs: '0.65rem', sm: '0.75rem' } }} />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mt: 0.5 }}>
                          {[
                            sv?.presionArterial ? `PA: ${sv.presionArterial}` : null,
                            sv?.frecuenciaCardiaca ? `FC: ${sv.frecuenciaCardiaca}` : null,
                            sv?.pesoKg ? `Peso: ${sv.pesoKg}` : null,
                            sv?.tallaCm ? `Talla: ${sv.tallaCm}` : null,
                            sv?.temperaturaC ? `Temp: ${sv.temperaturaC}` : null,
                            sv?.saturacionO2 ? `SatO2: ${sv.saturacionO2}` : null,
                            sv?.glucosaMgDl ? `Glucosa: ${sv.glucosaMgDl}` : null,
                          ].filter(Boolean).join(' • ') || '—'}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: Documentos */}
        {tab === 5 && (
          <Card sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 1, borderRadius: 2, ...HOVER_CARD_SX }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction="column" spacing={1} sx={{ mb: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>Documentos (Sesiones)</Typography>
                  {!docsSelectingPdf && (
                    <Button
                      variant="contained"
                      onClick={handleDocsStartPdf}
                      startIcon={<PictureAsPdfIcon />}
                      size={isMobile ? 'small' : 'medium'}
                      fullWidth={isMobile}
                      sx={{ background: BRAND_GRADIENT, fontWeight: 900, '&:hover': { background: BRAND_GRADIENT } }}
                    >
                      Generar PDF
                    </Button>
                  )}
                </Stack>
                {docsSelectingPdf && (
                  <Box sx={{ 
                    p: { xs: 1, sm: 1.5 }, 
                    borderRadius: 2, 
                    bgcolor: '#f7fbfd', 
                    border: `1px solid ${BRAND_BORDER}` 
                  }}>
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={{ xs: 1, sm: 1 }} 
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      flexWrap="wrap"
                    >
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                        <Chip
                          size="small"
                          color={docsPdfStep1Done ? 'success' : 'default'}
                          icon={docsPdfStep1Done ? <CheckIcon /> : undefined}
                          label={isMobile ? '1) Prof.' : '1) Profesional'}
                          sx={{ fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                        />
                        <Chip
                          size="small"
                          color={docsPdfStep2Done ? 'success' : 'default'}
                          icon={docsPdfStep2Done ? <CheckIcon /> : undefined}
                          label={isMobile ? '2) Diag.' : '2) Diagnóstico'}
                          sx={{ fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                        />
                        <Chip
                          size="small"
                          color={docsPdfStep3Done ? 'success' : 'default'}
                          icon={docsPdfStep3Done ? <CheckIcon /> : undefined}
                          label={isMobile ? '3) Ses.' : '3) Sesiones'}
                          sx={{ fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: { xs: 1, sm: 0 }, ml: { sm: 'auto' } }}>
                        <FormControlLabel
                          control={<Checkbox size="small" checked={docsSelectAll} onChange={handleDocsSelectAll} />}
                          label={<Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Todos</Typography>}
                          sx={{ mr: 0.5 }}
                        />
                        <Tooltip title="Confirmar" arrow>
                          <IconButton size="small" onClick={handleDocsConfirmPdf} sx={{ bgcolor: '#82e0aa', color: 'black', boxShadow: 1 }}>
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancelar" arrow>
                          <IconButton size="small" onClick={handleDocsCancelPdf} sx={{ bgcolor: '#f1948a', color: 'black', boxShadow: 1 }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </Stack>

              {docsSelectingPdf ? (
                <Alert severity="info" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' }, '& .MuiAlert-message': { width: '100%' } }}>
                  {isMobile 
                    ? 'Sigue los pasos: profesional → diagnóstico → sesiones.' 
                    : 'Para generar el PDF sigue los pasos por orden: profesional → diagnóstico → sesiones.'
                  }
                </Alert>
              ) : null}

              {loading ? (
                <Skeleton height={200} />
              ) : documentosProfesionales.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No hay sesiones registradas para generar documentos.</Typography>
              ) : (
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  <Grid item xs={12} md={4}>
                    <Box ref={docsProfesionalesRef} sx={{ position: 'relative' }}>
                      <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1, fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>Profesionales</Typography>
                      <HelpBubble open={docsHelpStep1Open} anchorEl={docsProfesionalesRef.current}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.25 }}>
                          Paso 1 (obligatorio)
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Selecciona un <b>profesional</b>.
                        </Typography>
                      </HelpBubble>
                      <Stack spacing={1}>
                        {documentosProfesionales.map((p) => {
                          const selected = p.key === docsProfesionalKey;
                          const name = p?.profesional?.username || p?.profesional?.email || 'Profesional';
                          const count = (p?.grupos || []).reduce((acc, g) => acc + ((g?.sesiones || []).length || 0), 0);
                          return (
                            <Button
                              key={p.key}
                              variant={selected ? 'contained' : 'outlined'}
                              size={isMobile ? 'small' : 'medium'}
                              onClick={() => {
                                setDocsProfesionalKey(p.key);
                                // Cambiar profesional reinicia el flujo de selección
                                if (docsSelectingPdf) {
                                  setDocsSelectAll(false);
                                  setDocsSelectedKeys(new Set());
                                  setDocsDiagnosticoKey('');
                                }
                              }}
                              sx={selected
                                ? { 
                                    background: BRAND_GRADIENT, 
                                    fontWeight: 900, 
                                    justifyContent: 'space-between', 
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    '&:hover': { background: BRAND_GRADIENT } 
                                  }
                                : { 
                                    borderColor: '#2596be', 
                                    color: BRAND_TEXT_DARK, 
                                    fontWeight: 900, 
                                    justifyContent: 'space-between',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                  }
                              }
                            >
                              <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                              <Chip
                                size="small"
                                label={`${count}`}
                                sx={selected 
                                  ? { bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.75rem' } } 
                                  : { bgcolor: '#e8f6fb', color: BRAND_TEXT_DARK, fontWeight: 900, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                              />
                            </Button>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    {!docsProfesionalActual ? (
                      <Typography variant="body2" color="text.secondary">Selecciona un profesional para ver tus sesiones.</Typography>
                    ) : (
                      <Stack spacing={1}>
                        <Box ref={docsDiagnosticosRef} sx={{ position: 'relative' }}>
                          <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 0.5 }}>
                            Sesiones por diagnóstico
                          </Typography>
                          <HelpBubble open={docsHelpStep2Open} anchorEl={docsDiagnosticosRef.current}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.25 }}>
                              Paso 2 (obligatorio)
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Abre y selecciona un <b>diagnóstico</b>.
                            </Typography>
                          </HelpBubble>

                          {(docsProfesionalActual?.grupos || []).map((g) => (
                          <Accordion
                            key={g.key}
                            disableGutters
                            expanded={docsDiagnosticoKey === g.key}
                            onChange={(_, expanded) => {
                              setDocsDiagnosticoKey(expanded ? g.key : '');
                              if (docsSelectingPdf) {
                                setDocsSelectAll(false);
                                setDocsSelectedKeys(new Set());
                              }
                            }}
                            sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 0, borderRadius: 2, ...HOVER_CARD_SX }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack spacing={0.25} sx={{ width: '100%' }}>
                                <Typography fontWeight={900}>{g?.diagnosticoText || 'Diagnóstico'}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Sesiones: {(g?.sesiones || []).length}
                                </Typography>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Stack spacing={1}>
                                {g?.anamnesisHtml ? (
                                  <>
                                    <Typography variant="subtitle2" fontWeight={900}>Anamnesis</Typography>
                                    <ExpandableRich html={g.anamnesisHtml} collapsedMaxHeight={180} minTextLengthToToggle={280} />
                                    <Divider />
                                  </>
                                ) : null}

                                <Box sx={{ position: 'relative' }}>
                                  <Typography
                                    ref={docsDiagnosticoKey === g.key ? docsSesionesRef : null}
                                    variant="subtitle2"
                                    fontWeight={900}
                                    sx={{ mb: 0.25 }}
                                  >
                                    Sesiones
                                  </Typography>
                                  {docsHelpStep3Open && docsDiagnosticoKey === g.key ? (
                                    <HelpBubble open={docsHelpStep3Open} anchorEl={docsSesionesRef.current}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.25 }}>
                                        Paso 3 (obligatorio)
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Selecciona una o más <b>sesiones</b> (clic en la tarjeta).
                                      </Typography>
                                    </HelpBubble>
                                  ) : null}
                                </Box>

                                {(g?.sesiones || [])
                                  .slice()
                                  .sort((a, b) => new Date(b?.fecha || 0).getTime() - new Date(a?.fecha || 0).getTime())
                                  .map((s, idx) => (
                                    <Box
                                      key={s.key}
                                      onClick={
                                        docsSelectingPdf
                                          ? () => {
                                              // En PDF, paso 2 debe estar seleccionado
                                              if (!docsGrupoActual) {
                                                showAlert?.('error', 'Primero selecciona un diagnóstico.');
                                                return;
                                              }
                                              toggleDocKey(s.key);
                                            }
                                          : undefined
                                      }
                                      role={docsSelectingPdf ? 'button' : undefined}
                                      tabIndex={docsSelectingPdf ? 0 : undefined}
                                      onKeyDown={
                                        docsSelectingPdf
                                          ? (e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                if (!docsGrupoActual) {
                                                  showAlert?.('error', 'Primero selecciona un diagnóstico.');
                                                  return;
                                                }
                                                toggleDocKey(s.key);
                                              }
                                            }
                                          : undefined
                                      }
                                      sx={{
                                        p: { xs: 1, sm: 1.25 },
                                        borderRadius: 2,
                                        bgcolor: docsSelectedKeys.has(s.key) ? '#f7fbff' : '#f7fbfd',
                                        border: `1px solid ${docsSelectedKeys.has(s.key) ? '#2596be' : BRAND_BORDER}`,
                                        cursor: docsSelectingPdf ? 'pointer' : 'default',
                                        transition: 'border-color 120ms ease, box-shadow 120ms ease',
                                        '&:hover': {
                                          borderColor: '#2596be',
                                          boxShadow: docsSelectingPdf ? '0 6px 18px rgba(0,0,0,0.08)' : '0 4px 14px rgba(0,0,0,0.08)',
                                        },
                                      }}
                                    >
                                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                                        <Typography fontWeight={900} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                                          {isMobile ? `#${idx + 1} · ${fmtDate(s?.fecha) || '—'}` : `Sesión ${idx + 1} · ${fmtDate(s?.fecha) || '—'}`}
                                        </Typography>
                                        {docsSelectingPdf ? (
                                          <Checkbox
                                            size="small"
                                            checked={docsSelectedKeys.has(s.key)}
                                            onChange={() => toggleDocKey(s.key)}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : null}
                                      </Stack>
                                      {s?.notas ? (
                                        <Box sx={{ mt: 0.75 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Procedimiento</Typography>
                                          <ExpandableRich html={s?.notas || ''} empty="—" collapsedMaxHeight={isMobile ? 120 : 180} minTextLengthToToggle={isMobile ? 160 : 260} />
                                        </Box>
                                      ) : (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Sin notas registradas.</Typography>
                                      )}
                                    </Box>
                                  ))}
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                        </Box>
                      </Stack>
                    )}
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile}>
          <DialogTitle sx={{ background: BRAND_GRADIENT, color: 'white', fontWeight: 900, py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography fontWeight={900} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Editar mis datos</Typography>
              <IconButton onClick={() => setEditOpen(false)} sx={{ color: '#fff' }} aria-label="Cerrar" size={isMobile ? 'small' : 'medium'}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: '#ffffff', p: { xs: 1.5, sm: 3 } }}>
            {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Datos personales</Typography>
                <Stack spacing={1.25}>
                  <TextField label="Nombre" value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} fullWidth />
                  <TextField label="Email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} fullWidth />
                  <TextField label="Teléfono" value={form.telefono} onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))} fullWidth />
                  <TextField label="Dirección" value={form.direccion} onChange={(e) => setForm(f => ({ ...f, direccion: e.target.value }))} fullWidth />

                  <DatePicker
                    label="Fecha de nacimiento"
                    value={form.fechaNacimiento}
                    onChange={(v) => setForm(f => ({ ...f, fechaNacimiento: v }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />

                  <TextField
                    label="Edad"
                    value={(() => {
                      const years = calcAgeYears(form.fechaNacimiento);
                      return years != null ? `${years} años` : '—';
                    })()}
                    fullWidth
                    disabled
                  />

                  <TextField
                    select
                    label="Sexo"
                    value={form.sexo}
                    onChange={(e) => setForm(f => ({ ...f, sexo: e.target.value }))}
                    fullWidth
                  >
                    {['No especifica', 'Femenino', 'Masculino', 'Otro'].map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>

                  <TextField label="Tipo de Sangre" value={form.tipoSangre} onChange={(e) => setForm(f => ({ ...f, tipoSangre: e.target.value }))} fullWidth placeholder="Ej: O+" />

                  <TextField
                    select
                    label="Previsión"
                    value={form.prevision}
                    onChange={(e) => setForm(f => ({ ...f, prevision: e.target.value }))}
                    fullWidth
                  >
                    {['No especifica', 'FONASA', 'ISAPRE', 'Particular'].map(p => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Contacto de emergencia</Typography>
                <Stack spacing={1.25} sx={{ mb: 2 }}>
                  <TextField label="Nombre" value={form.contactoEmergencia?.nombre || ''} onChange={(e) => setForm(f => ({ ...f, contactoEmergencia: { ...(f.contactoEmergencia || {}), nombre: e.target.value } }))} fullWidth />
                  <TextField label="Relación" value={form.contactoEmergencia?.relacion || ''} onChange={(e) => setForm(f => ({ ...f, contactoEmergencia: { ...(f.contactoEmergencia || {}), relacion: e.target.value } }))} fullWidth />
                  <TextField label="Teléfono" value={form.contactoEmergencia?.telefono || ''} onChange={(e) => setForm(f => ({ ...f, contactoEmergencia: { ...(f.contactoEmergencia || {}), telefono: e.target.value } }))} fullWidth />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography fontWeight={900}>Alergias</Typography>
                  <Tooltip title="Agregar">
                    <IconButton onClick={() => setForm(f => ({ ...f, alergias: [...(f.alergias || []), { nombre: '', severidad: 'baja' }] }))}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack spacing={1.25}>
                  {(form.alergias || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  ) : (
                    (form.alergias || []).map((a, idx) => (
                      <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                          label="Alergia"
                          value={a?.nombre || ''}
                          onChange={(e) => setForm(f => {
                            const next = (f.alergias || []).slice();
                            next[idx] = { ...(next[idx] || {}), nombre: e.target.value };
                            return { ...f, alergias: next };
                          })}
                          fullWidth
                        />
                        <TextField
                          select
                          label="Severidad"
                          value={(a?.severidad || 'baja').toString().toLowerCase()}
                          onChange={(e) => setForm(f => {
                            const next = (f.alergias || []).slice();
                            next[idx] = { ...(next[idx] || {}), severidad: e.target.value };
                            return { ...f, alergias: next };
                          })}
                          sx={{ minWidth: 160 }}
                        >
                          {['alta', 'media', 'baja'].map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </TextField>
                        <IconButton color="error" onClick={() => setForm(f => ({ ...f, alergias: (f.alergias || []).filter((_, i) => i !== idx) }))}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ))
                  )}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography fontWeight={900}>Medicamentos</Typography>
                  <Tooltip title="Agregar">
                    <IconButton onClick={() => setForm(f => ({ ...f, medicamentosActivos: [...(f.medicamentosActivos || []), { nombre: '', dosis: '', frecuencia: '' }] }))}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack spacing={1.25}>
                  {(form.medicamentosActivos || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  ) : (
                    (form.medicamentosActivos || []).map((m, idx) => (
                      <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                          label="Nombre"
                          value={m?.nombre || ''}
                          onChange={(e) => setForm(f => {
                            const next = (f.medicamentosActivos || []).slice();
                            next[idx] = { ...(next[idx] || {}), nombre: e.target.value };
                            return { ...f, medicamentosActivos: next };
                          })}
                          fullWidth
                        />
                        <TextField
                          label="Dosis"
                          value={m?.dosis || ''}
                          onChange={(e) => setForm(f => {
                            const next = (f.medicamentosActivos || []).slice();
                            next[idx] = { ...(next[idx] || {}), dosis: e.target.value };
                            return { ...f, medicamentosActivos: next };
                          })}
                          sx={{ minWidth: 160 }}
                        />
                        <TextField
                          label="Frecuencia"
                          value={m?.frecuencia || ''}
                          onChange={(e) => setForm(f => {
                            const next = (f.medicamentosActivos || []).slice();
                            next[idx] = { ...(next[idx] || {}), frecuencia: e.target.value };
                            return { ...f, medicamentosActivos: next };
                          })}
                          sx={{ minWidth: 160 }}
                        />
                        <IconButton color="error" onClick={() => setForm(f => ({ ...f, medicamentosActivos: (f.medicamentosActivos || []).filter((_, i) => i !== idx) }))}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Card sx={{ border: `1px solid ${BRAND_BORDER}`, boxShadow: 0, borderRadius: 2, ...HOVER_CARD_SX }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ShieldOutlinedIcon fontSize="small" />
                  <Typography fontWeight={900}>Privacidad</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Esta sección es informativa. Si necesitas corregir datos clínicos, coordina con tu profesional.
                </Typography>
              </CardContent>
            </Card>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button 
              variant="text" 
              onClick={() => setEditOpen(false)} 
              disabled={editSaving}
              fullWidth={isMobile}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={saveEdit}
              disabled={editSaving}
              fullWidth={isMobile}
              sx={{
                background: BRAND_GRADIENT,
                fontWeight: 900,
                '&:hover': { background: BRAND_GRADIENT },
                order: { xs: 1, sm: 2 },
              }}
            >
              {editSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <SiteFooter />
    </Box>
  );
}
