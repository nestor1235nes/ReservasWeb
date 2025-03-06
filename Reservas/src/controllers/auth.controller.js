import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TOKEN_SECRET } from "../config.js";
import { createAccessToken } from "../libs/jwt.js";

export const register = async (req, res) => {
  try {
    const { username, email, password, celular, fotoPerfil, especialidad, descripcion, timetable, idInstance, apiTokenInstance } = req.body;

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
      descripcion,
      timetable,
      idInstance,
      apiTokenInstance,
    });

    // saving the user in the database
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
      descripcion: userSaved.descripcion,
      timetable: userSaved.timetable,
      idInstance: userSaved.idInstance,
      apiTokenInstance: userSaved.apiTokenInstance,
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
      descripcion: userFound.descripcion,
      timetable: userFound.timetable,
      idInstance: userFound.idInstance,
      apiTokenInstance: userFound.apiTokenInstance,
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
      descripcion: userFound.descripcion,
      timetable: userFound.timetable,
      idInstance: userFound.idInstance,
      apiTokenInstance: userFound.apiTokenInstance,
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
      req.body.celular = `56${req.body.celular}`;
    }
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
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