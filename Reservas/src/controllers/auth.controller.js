import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TOKEN_SECRET, CLIENT_ID } from "../config.js";
import { createAccessToken } from "../libs/jwt.js";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(CLIENT_ID);

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
        password: await bcrypt.hash(email + TOKEN_SECRET, 10), // Generate a password hash
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
    const { username, email, password, celular, fotoPerfil, especialidad, descripcion, timetable, idInstance, apiTokenInstance, defaultMessage, reminderMessage, notifications, sucursal, especialidad_principal, experiencia } = req.body;

    const userFound = await User.findOne({ email });

    if (userFound)
      return res.status(400).json({
        message: ["The email is already in use"],
      });

    // hashing the password
    const passwordHash = await bcrypt.hash(password, 10);
    // adding country code to celular
    // creating the user
    const newUser = new User({
      username,
      email,
      password: passwordHash,
      celular,
      fotoPerfil,
      especialidad,
      especialidad_principal,
      experiencia,
      descripcion,
      timetable,
      idInstance,
      apiTokenInstance,
      defaultMessage,
      reminderMessage,
      notifications,
      sucursal,
      cita_presencial: false,
      cita_virtual: false,
    });

    // saving the user in the database
    if(newUser.especialidad){
      newUser.especialidad = newUser.especialidad.toUpperCase();
    }
    const userSaved = await newUser.save();

    // create access token
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
      idInstance: userSaved.idInstance,
      apiTokenInstance: userSaved.apiTokenInstance,
      defaultMessage: userSaved.defaultMessage,
      reminderMessage: userSaved.reminderMessage,
      notifications: userSaved.notifications,
      sucursal: userSaved.sucursal,
      cita_presencial: userSaved.cita_presencial,
      cita_virtual: userSaved.cita_virtual
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await User.findOne({ email });

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
      idInstance: userFound.idInstance,
      apiTokenInstance: userFound.apiTokenInstance,
      defaultMessage: userFound.defaultMessage,
      reminderMessage: userFound.reminderMessage,
      notifications: userFound.notifications,
      sucursal: userFound.sucursal,
      cita_presencial: userFound.cita_presencial,
      cita_virtual: userFound.cita_virtual

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

    const userFound = await User.findById(user.id);
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
      idInstance: userFound.idInstance,
      apiTokenInstance: userFound.apiTokenInstance,
      defaultMessage: userFound.defaultMessage,
      reminderMessage: userFound.reminderMessage,
      notifications: userFound.notifications,
      sucursal: userFound.sucursal,
      cita_presencial: userFound.cita_presencial,
      cita_virtual: userFound.cita_virtual
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
    if (req.body.celular) {
      let celular = req.body.celular.toString().replace(/\D/g, ''); // elimina todo lo que no sea dígito
      // Si el número comienza con '56' y tiene 11 dígitos, está correcto
      if (/^56\d{9}$/.test(celular)) {
        req.body.celular = celular;
      } else {
        // Elimina cualquier 0 inicial o prefijo internacional
        if (celular.startsWith('569')) {
          celular = celular.slice(0, 11); // ya está bien, pero por si acaso
        } else if (celular.startsWith('56')) {
          celular = '569' + celular.slice(2);
        } else if (celular.startsWith('69') && celular.length === 10) {
          celular = '569' + celular.slice(2);
        } else if (celular.startsWith('9') && celular.length === 9) {
          celular = '56' + celular;
        } else if (celular.length === 8) {
          celular = '569' + celular;
        } else {
          // Si no cumple ningún caso, intenta forzar el formato
          celular = celular.replace(/^0+/, ''); // elimina ceros iniciales
          if (celular.length === 9 && celular.startsWith('9')) {
            celular = '56' + celular;
          } else if (celular.length === 8) {
            celular = '569' + celular;
          }
        }
        req.body.celular = celular;
      }
    }
    if (req.body.especialidad) {
      req.body.especialidad = req.body.especialidad.toUpperCase();
    }
    if (req.body.especialidad_principal) {
      req.body.especialidad_principal = req.body.especialidad_principal.toUpperCase();
    }
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  }
  catch (error) {
    res.status(404).json({ message: error.message });
  }
}

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
}

export const updateNotifications = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req
      .params.id, { $push: { notifications: req.body.data } }, { new: true });
    res.json(updated);
  }
  catch (error) {
    res.status(404).json({ message: error.message });
  }
}

export const deleteNotifications = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, { notifications: [] }, { new: true });
    res.json(updated);
  }
  catch (error) {
    res.status(404).json({ message: error.message });
  }
}

export const getAllProfiles = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}