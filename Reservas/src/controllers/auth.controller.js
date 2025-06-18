import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TOKEN_SECRET, CLIENT_ID } from "../config.js";
import { createAccessToken } from "../libs/jwt.js";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(CLIENT_ID);

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
      httpOnly: process.env.NODE_ENV !== "development",
      secure: true,
      sameSite: "none",
    });

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { 
      username, 
      email, 
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
      servicios,
      notifications,
      idInstance, 
      apiTokenInstance, 
      defaultMessage, 
      reminderMessage
    } = req.body;

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
      servicios: servicios || [],
      notifications: notifications || [],
      idInstance,
      apiTokenInstance,
      defaultMessage,
      reminderMessage,
    });

    const userSaved = await newUser.save();

    // Create access token
    const token = await createAccessToken({
      id: userSaved._id,
    });

    res.cookie("token", token, {
      httpOnly: process.env.NODE_ENV !== "development",
      secure: true,
      sameSite: "none",
    });

    res.json({
      id: userSaved._id,
      username: userSaved.username,
      email: userSaved.email,
      celular: userSaved.celular,
      fotoPerfil: userSaved.fotoPerfil,
      especialidad: userSaved.especialidad,
      especialidad_principal: userSaved.especialidad_principal,
      experiencia: userSaved.experiencia,
      descripcion: userSaved.descripcion,
      timetable: userSaved.timetable,
      sucursal: userSaved.sucursal,
      cita_presencial: userSaved.cita_presencial,
      cita_virtual: userSaved.cita_virtual,
      servicios: userSaved.servicios,
      notifications: userSaved.notifications,
      idInstance: userSaved.idInstance,
      apiTokenInstance: userSaved.apiTokenInstance,
      defaultMessage: userSaved.defaultMessage,
      reminderMessage: userSaved.reminderMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      httpOnly: process.env.NODE_ENV !== "development",
      secure: true,
      sameSite: "none",
    });

    res.json({
      id: userFound._id,
      username: userFound.username,
      email: userFound.email,
      celular: userFound.celular,
      fotoPerfil: userFound.fotoPerfil,
      especialidad: userFound.especialidad,
      especialidad_principal: userFound.especialidad_principal,
      experiencia: userFound.experiencia,
      descripcion: userFound.descripcion,
      timetable: userFound.timetable,
      sucursal: userFound.sucursal,
      cita_presencial: userFound.cita_presencial,
      cita_virtual: userFound.cita_virtual,
      servicios: userFound.servicios,
      notifications: userFound.notifications,
      idInstance: userFound.idInstance,
      apiTokenInstance: userFound.apiTokenInstance,
      defaultMessage: userFound.defaultMessage,
      reminderMessage: userFound.reminderMessage,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyToken = async (req, res) => {
  const { token } = req.cookies;
  if (!token) return res.send(false);

  jwt.verify(token, TOKEN_SECRET, async (error, user) => {
    if (error) return res.sendStatus(401);

    const userFound = await User.findById(user.id).populate('sucursal');
    if (!userFound) return res.sendStatus(401);

    return res.json({
      id: userFound._id,
      username: userFound.username,
      email: userFound.email,
      celular: userFound.celular,
      fotoPerfil: userFound.fotoPerfil,
      especialidad: userFound.especialidad,
      especialidad_principal: userFound.especialidad_principal,
      experiencia: userFound.experiencia,
      descripcion: userFound.descripcion,
      timetable: userFound.timetable,
      sucursal: userFound.sucursal,
      cita_presencial: userFound.cita_presencial,
      cita_virtual: userFound.cita_virtual,
      servicios: userFound.servicios,
      notifications: userFound.notifications,
      idInstance: userFound.idInstance,
      apiTokenInstance: userFound.apiTokenInstance,
      defaultMessage: userFound.defaultMessage,
      reminderMessage: userFound.reminderMessage,
    });
  });
};

export const logout = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    expires: new Date(0),
  });
  return res.sendStatus(200);
};

export const updatePerfil = async (req, res) => {
  try {
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

    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('sucursal');
    res.json(updated);
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
    res.json(updatedUser);
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
    res.json(updatedUser);
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
    res.json(updatedUser);
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
    res.json(updated);
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
    res.json(updated);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getAllProfiles = async (req, res) => {
  try {
    const users = await User.find().populate('sucursal');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('sucursal');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConfiguracion = async (req, res) => {
  try {
    const { cita_presencial, cita_virtual } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { cita_presencial, cita_virtual },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};