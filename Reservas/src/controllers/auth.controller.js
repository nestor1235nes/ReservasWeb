import User from "../models/user.model.js";
import Sucursal from "../models/sucursal.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TOKEN_SECRET, CLIENT_ID, FRONTEND_URL } from "../config.js";
import { createAccessToken } from "../libs/jwt.js";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(CLIENT_ID);

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  const u = userDoc.toObject ? userDoc.toObject() : userDoc;
  // Nunca exponer credenciales/secretos al cliente
  delete u.password;
  delete u.idInstance;
  delete u.apiTokenInstance;
  delete u.__v;
  // Exponer siempre `id` además de `_id` (el frontend usa user.id)
  if (u._id && u.id === undefined) u.id = u._id;
  return u;
};

const timeToMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = Math.floor(minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const getWorkingSegments = (schedule) => {
  const from = timeToMinutes(schedule?.fromTime);
  const to = timeToMinutes(schedule?.toTime);
  if (from === null || to === null || from >= to) return [];

  const breakFrom = timeToMinutes(schedule?.breakFrom);
  const breakTo = timeToMinutes(schedule?.breakTo);

  const hasValidBreak =
    breakFrom !== null &&
    breakTo !== null &&
    breakFrom < breakTo &&
    from < breakTo &&
    breakFrom < to;

  if (!hasValidBreak) return [[from, to]];

  const leftEnd = Math.max(from, Math.min(breakFrom, to));
  const rightStart = Math.min(to, Math.max(breakTo, from));

  const segments = [];
  if (from < leftEnd) segments.push([from, leftEnd]);
  if (rightStart < to) segments.push([rightStart, to]);
  return segments;
};

const findTimetableOverlaps = (timetable) => {
  const overlaps = [];
  const byDay = new Map();

  (timetable || []).forEach((schedule, index) => {
    const days = Array.isArray(schedule?.days) ? schedule.days : [];
    const segments = getWorkingSegments(schedule);
    if (days.length === 0 || segments.length === 0) return;

    days.forEach((day) => {
      if (!byDay.has(day)) byDay.set(day, []);
      const existing = byDay.get(day);

      segments.forEach(([start, end]) => {
        existing.forEach((prev) => {
          const overlapStart = Math.max(start, prev.start);
          const overlapEnd = Math.min(end, prev.end);
          if (overlapStart < overlapEnd) {
            overlaps.push({ day, aIndex: prev.index, bIndex: index, start: overlapStart, end: overlapEnd });
          }
        });
        existing.push({ index, start, end });
      });
    });
  });

  return overlaps;
};

// Función helper para normalizar el teléfono al formato 569XXXXXXXX
const normalizarTelefono = (telefono) => {
  if (!telefono) return '';
  
  let tel = telefono.toString().replace(/\D/g, ''); // Solo números
  
  // Si ya está en formato correcto (569XXXXXXXX), lo dejamos
  if (tel.length === 11 && tel.startsWith('569')) {
    return tel;
  }
  
  // Si tiene 9 dígitos y empieza con 9 (912345678), agregamos 56
  if (tel.length === 9 && tel.startsWith('9')) {
    return '56' + tel;
  }
  
  // Si tiene 8 dígitos (12345678), agregamos 569
  if (tel.length === 8) {
    return '569' + tel;
  }
  
  // Si empieza con 56 pero no con 569, lo corregimos
  if (tel.startsWith('56') && !tel.startsWith('569')) {
    return '569' + tel.slice(2);
  }
  
  // Si no cumple ningún caso, lo dejamos vacío
  return '';
};

export const googleAuth = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const { name, email } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        username: name,
        email,
        password: await bcrypt.hash(email + TOKEN_SECRET, 10),
      });
      await user.save();
    }

    const accessToken = await createAccessToken({ id: user._id });

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.json({ ...sanitizeUser(user), token: accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      googleEmail,
      password, 
      celular, 
      fotoPerfil, 
      especialidad, 
      especialidad_principal,
      experiencia,
      descripcion, 
      timetable, 
      sucursal,
      cita_presencial,
      cita_virtual,
      cita_domicilio,
      servicios,
      notifications,
      defaultMessage, 
      reminderMessage,
      direccion,
      pacientes,
      adminAtiendePersonas,
    } = req.body;

    if (timetable) {
      const overlaps = findTimetableOverlaps(timetable);
      if (overlaps.length > 0) {
        const first = overlaps[0];
        return res.status(400).json({
          message: [
            `Hay solapamiento de horarios en ${first.day} entre Bloque ${first.aIndex + 1} y Bloque ${first.bIndex + 1} (${minutesToTime(first.start)}–${minutesToTime(first.end)}). Ajusta las horas para que no se crucen.`,
          ],
        });
      }
    }

    const userFound = await User.findOne({ email });

    if (userFound)
      return res.status(400).json({
        message: ["The email is already in use"],
      });

    // Hashing the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Normalizar teléfono
    const telefonoNormalizado = normalizarTelefono(celular);

    // Creating the user
    const newUser = new User({
      username,
      email,
      password: passwordHash,
  celular: telefonoNormalizado,
      fotoPerfil,
      especialidad: especialidad ? especialidad.toUpperCase() : '',
      especialidad_principal: especialidad_principal ? especialidad_principal.toUpperCase() : '',
      experiencia,
  descripcion,
      timetable: timetable || [],
      sucursal,
      cita_presencial: cita_presencial || false,
      cita_virtual: cita_virtual || false,
      cita_domicilio: cita_domicilio || false,
      servicios: servicios || [],
      notifications: notifications || [],
      defaultMessage,
      reminderMessage,
      direccion,
      pacientes,
      adminAtiendePersonas,
      googleEmail,
    });

    const userSaved = await newUser.save();

    // Create access token
    const token = await createAccessToken({
      id: userSaved._id,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    // Devolver el usuario completo (sin secretos) para no omitir campos del modelo.
    res.json({ ...sanitizeUser(userSaved), token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const registerUserOnly = async (req, res) => {
  try {
    const { username, email, password, especialidad } = req.body;
    const userFound = await User.findOne({ email });
    if (userFound) {
      return res.status(400).json({ message: "El correo ya está en uso" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // nombre en mayúsculas
    const usernameUpperCase = username ? username.toUpperCase() : '';
    // especialidad en mayúsculas
    const especialidadUpperCase = especialidad ? especialidad.toUpperCase() : '';
    const newUser = new User({
      username: usernameUpperCase,
      email,
      password: passwordHash,
      especialidad: especialidadUpperCase || '',
    });

    const userSaved = await newUser.save();

    return res.json({
      id: userSaved._id,
      username: userSaved.username,
      email: userSaved.email,
      especialidad: userSaved.especialidad,
    });
  } catch (error) {
    console.error('Error en registerUserOnly:', error);
    return res.status(500).json({ message: error.message || 'Error registrando usuario' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await User.findOne({ email }).populate('sucursal');

    if (!userFound)
      return res.status(400).json({
        message: ["El correo ingresado no existe"],
      });

    const isMatch = await bcrypt.compare(password, userFound.password);
    if (!isMatch) {
      return res.status(400).json({
        message: ["Contraseña incorrecta"],
      });
    }

    const token = await createAccessToken({
      id: userFound._id,
      username: userFound.username,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    // Devolver el usuario completo (sin secretos) para no omitir campos del modelo.
    res.json({ ...sanitizeUser(userFound), token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  // Cookie httpOnly (web) o Authorization: Bearer (app móvil / fallback web).
  let token = req.cookies?.token;
  if (!token && req.headers?.authorization) {
    const authHeader = String(req.headers.authorization);
    if (authHeader.toLowerCase().startsWith('bearer ')) token = authHeader.slice(7);
  }
  if (!token) return res.send(false);

  jwt.verify(token, TOKEN_SECRET, async (error, user) => {
    if (error) return res.sendStatus(401);

    const userFound = await User.findById(user.id).populate('sucursal');
    if (!userFound) return res.sendStatus(401);

    // Devolver el usuario completo (sin secretos) para no omitir campos del modelo.
    return res.json(sanitizeUser(userFound));
  });
};

export const logout = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    expires: new Date(0),
  });
  return res.sendStatus(200);
};

export const updatePerfil = async (req, res) => {
  try {
    if (req.body.timetable) {
      const overlaps = findTimetableOverlaps(req.body.timetable);
      if (overlaps.length > 0) {
        const first = overlaps[0];
        return res.status(400).json({
          message: [
            `Hay solapamiento de horarios en ${first.day} entre Bloque ${first.aIndex + 1} y Bloque ${first.bIndex + 1} (${minutesToTime(first.start)}–${minutesToTime(first.end)}). Ajusta las horas para que no se crucen.`,
          ],
        });
      }
    }

    // Normalizar teléfono si se proporciona
    if (req.body.celular) {
      req.body.celular = normalizarTelefono(req.body.celular);
    }

    // Convertir especialidades a mayúsculas
    if (req.body.especialidad) {
      req.body.especialidad = req.body.especialidad.toUpperCase();
    }
    if (req.body.especialidad_principal) {
      req.body.especialidad_principal = req.body.especialidad_principal.toUpperCase();
    }

    const current = await User.findById(req.params.id).populate('suscriptionPlan');
    if (!current) return res.status(404).json({ message: 'User not found' });

    const isTryingToEditMessages =
      Object.prototype.hasOwnProperty.call(req.body, 'defaultMessage') ||
      Object.prototype.hasOwnProperty.call(req.body, 'reminderMessage') ||
      Object.prototype.hasOwnProperty.call(req.body, 'messageTemplates');

    // Restricción por plan: en plan Basic no se permite editar mensajes automáticos.
    const hasActiveSubscription = !!current?.suscriptionEndDate && current.suscriptionEndDate > new Date();
    const planName = current?.suscriptionPlan?.name || null;
    const isBasicActive = hasActiveSubscription && planName === 'Basic';
    if (isBasicActive && isTryingToEditMessages) {
      return res.status(403).json({
        message: 'La edición de mensajes automáticos está disponible desde Plan Standard y Teams.',
      });
    }

    // Desde ahora las credenciales GreenAPI son globales (plataforma) y no se editan por usuario.
    delete req.body.idInstance;
    delete req.body.apiTokenInstance;

    // Si el usuario pertenece a una sucursal, las credenciales de WhatsApp se toman siempre desde la sucursal.
    // Bloqueamos la modificación de estas claves a nivel de perfil para evitar configuraciones inconsistentes.
    if (current.sucursal) {
      delete req.body.defaultMessage;
      delete req.body.reminderMessage;
      delete req.body.messageTemplates;
    }

    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('sucursal');
    res.json(sanitizeUser(updated));
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const deleteBloqueHorario = async (req, res) => {
  try {
    const { id, index } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index === undefined || index === null) {
      return res.status(400).json({ message: "Index is required" });
    }
    if (index < 0 || index >= user.timetable.length) {
      return res.status(400).json({ message: "Index out of bounds" });
    }
    
    user.timetable.splice(index, 1);
    const updatedUser = await user.save();
    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, duracion, precio, modalidad, descripcion } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const nuevoServicio = {
      tipo,
      duracion,
      precio,
      modalidad,
      descripcion
    };

    user.servicios.push(nuevoServicio);
    const updatedUser = await user.save();
    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteServicio = async (req, res) => {
  try {
    const { id, index } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index === undefined || index === null) {
      return res.status(400).json({ message: "Index is required" });
    }
    if (index < 0 || index >= user.servicios.length) {
      return res.status(400).json({ message: "Index out of bounds" });
    }
    
    user.servicios.splice(index, 1);
    const updatedUser = await user.save();
    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateServicio = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { tipo, duracion, precio, modalidad, descripcion } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index === undefined || index === null) {
      return res.status(400).json({ message: "Index is required" });
    }
    if (index < 0 || index >= user.servicios.length) {
      return res.status(400).json({ message: "Index out of bounds" });
    }

    // Actualizar el servicio en el índice especificado
    user.servicios[index] = {
      tipo,
      duracion,
      precio,
      modalidad,
      descripcion
    };

    const updatedUser = await user.save();
    res.json(sanitizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNotifications = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id, 
      { $push: { notifications: req.body.data } }, 
      { new: true }
    );
    res.json(sanitizeUser(updated));
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id, 
      { notifications: [] }, 
      { new: true }
    );
    res.json(sanitizeUser(updated));
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getAllProfiles = async (req, res) => {
  try {
    // Traer todas las sucursales
    const sucursales = await Sucursal.find();

    // Construir sets de IDs de administradores, asistentes y profesionales
    const adminIds = new Set(sucursales.flatMap(s => s.administradores.map(id => id.toString())));
    const asistenteIds = new Set(sucursales.flatMap(s => s.asistentes.map(id => id.toString())));
    const profesionalesIds = new Set(sucursales.flatMap(s => s.profesionales.map(id => id.toString())));

    // Traer todos los usuarios, incluyendo información de sucursal y plan de suscripción
    const users = await User.find().populate([
      {
        path: 'sucursal',
        populate: { path: 'suscriptionPlan' }
      },
      {
        path: 'suscriptionPlan'
      }
    ]);

    // Filtrar:
    // - Independientes (sin sucursal)
    // - O que estén en profesionales de alguna sucursal
    // - Excluir admins siempre y cuando no esten en profesionales
    // - y asistentes
    const filtrados = users.filter(user => {
      const isIndependiente = !user.sucursal;
      const isProfesional = profesionalesIds.has(user._id.toString());
      const isAdmin = adminIds.has(user._id.toString());
      const isAsistente = asistenteIds.has(user._id.toString());

      // Si es independiente, lo incluimos
      if (isIndependiente) return true;

      // Si es profesional, lo incluimos
      if (isProfesional) return true;

      // Si es admin o asistente, lo excluimos a menos que sea profesional
      if (isAdmin || isAsistente) {
        return isProfesional;
      }

      // Si no es ni independiente, ni profesional, ni admin/asistente, lo excluimos
      return false;
    });

    res.status(200).json(filtrados.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('sucursal');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConfiguracion = async (req, res) => {
  try {
    const { cita_presencial, cita_virtual, cita_domicilio } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { cita_presencial, cita_virtual, cita_domicilio },
      { new: true }
    );
    res.json(sanitizeUser(updated));
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Genera y persiste un enlace público único para el usuario
export const generarEnlace = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Construir un slug sencillo y estable: nombre-normalizado-<shortid>
    // (si ya existe slug, lo reutilizamos)
    const shortId = user._id.toString().slice(-6);
    const slugBase = (user.username || "usuario")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);
    const slug = user.slug && String(user.slug).trim() !== "" ? user.slug : `${slugBase}-${shortId}`;

    // Si ya tiene enlace, pero es el formato viejo (/front-users?u=), lo migramos
    const existing = (user.miEnlace || "").trim();
    const looksLegacy = existing.includes("/front-users?u=");
    if (existing && !looksLegacy) {
      return res.json({ miEnlace: user.miEnlace });
    }

    const url = `${FRONTEND_URL}/p/${encodeURIComponent(slug)}`;
    user.miEnlace = url;
    user.slug = slug;
    await user.save();

    res.json({ miEnlace: user.miEnlace });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = await User.findOne({ slug }).populate([
      {
        path: 'sucursal',
        populate: { path: 'suscriptionPlan' }
      },
      {
        path: 'suscriptionPlan'
      }
    ]);
    if (!user) return res.status(404).json({ message: 'No encontrado' });
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Perfil del usuario autenticado (mobile-friendly)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({ path: 'sucursal', populate: { path: 'suscriptionPlan' } })
      .populate('suscriptionPlan');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const id = req.user.id;

    if (req.body.timetable) {
      const overlaps = findTimetableOverlaps(req.body.timetable);
      if (overlaps.length > 0) {
        const first = overlaps[0];
        return res.status(400).json({
          message: [
            `Hay solapamiento de horarios en ${first.day} entre Bloque ${first.aIndex + 1} y Bloque ${first.bIndex + 1} (${minutesToTime(first.start)}–${minutesToTime(first.end)}). Ajusta las horas para que no se crucen.`,
          ],
        });
      }
    }

    if (req.body.celular) {
      req.body.celular = normalizarTelefono(req.body.celular);
    }
    if (req.body.especialidad) {
      req.body.especialidad = req.body.especialidad.toUpperCase();
    }
    if (req.body.especialidad_principal) {
      req.body.especialidad_principal = req.body.especialidad_principal.toUpperCase();
    }

    const current = await User.findById(id).populate('suscriptionPlan');
    if (!current) return res.status(404).json({ message: 'User not found' });

    const isTryingToEditMessages =
      Object.prototype.hasOwnProperty.call(req.body, 'defaultMessage') ||
      Object.prototype.hasOwnProperty.call(req.body, 'reminderMessage') ||
      Object.prototype.hasOwnProperty.call(req.body, 'messageTemplates');

    const hasActiveSubscription = !!current?.suscriptionEndDate && current.suscriptionEndDate > new Date();
    const planName = current?.suscriptionPlan?.name || null;
    const isBasicActive = hasActiveSubscription && planName === 'Basic';
    if (isBasicActive && isTryingToEditMessages) {
      return res.status(403).json({
        message: 'La edición de mensajes automáticos está disponible desde Plan Standard y Teams.',
      });
    }

    // Credenciales GreenAPI globales (no editables por usuario)
    delete req.body.idInstance;
    delete req.body.apiTokenInstance;

    // Si pertenece a una sucursal, bloqueamos edición de mensajes automáticos por usuario
    if (current.sucursal) {
      delete req.body.defaultMessage;
      delete req.body.reminderMessage;
      delete req.body.messageTemplates;
    }

    const updated = await User.findByIdAndUpdate(id, req.body, { new: true })
      .populate('sucursal')
      .populate('suscriptionPlan');

    res.json(sanitizeUser(updated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};