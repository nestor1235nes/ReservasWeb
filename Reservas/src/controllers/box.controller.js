import Box from "../models/box.model.js";
import Sucursal from "../models/sucursal.model.js";

// Verificar que el usuario autenticado es admin de la sucursal
const verificarAdminSucursal = async (userId, sucursalId) => {
  const sucursal = await Sucursal.findById(sucursalId);
  if (!sucursal) return false;
  return sucursal.administradores.some((a) => a.toString() === userId.toString());
};

export const obtenerBoxesSucursal = async (req, res) => {
  try {
    const { sucursalId } = req.params;
    const soloActivos = req.query.activo === "true";

    const filtro = { sucursal: sucursalId };
    if (soloActivos) filtro.activo = true;

    const boxes = await Box.find(filtro)
      .populate("profesionalesAsignados", "username email")
      .sort({ nombre: 1 });

    res.json(boxes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los boxes", error: error.message });
  }
};

export const obtenerBox = async (req, res) => {
  try {
    const box = await Box.findById(req.params.id).populate("profesionalesAsignados", "username email");
    if (!box) return res.status(404).json({ message: "Box no encontrado" });
    res.json(box);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el box", error: error.message });
  }
};

export const crearBox = async (req, res) => {
  try {
    const { sucursalId } = req.params;
    const userId = req.user.id;

    const esAdmin = await verificarAdminSucursal(userId, sucursalId);
    if (!esAdmin) return res.status(403).json({ message: "No tienes permisos para crear boxes en esta sucursal" });

    const { nombre, descripcion, codigo, capacidad, piso, equipamiento, profesionalesAsignados, activo, color, notas } = req.body;

    if (!nombre) return res.status(400).json({ message: "El nombre del box es requerido" });

    const box = new Box({
      sucursal: sucursalId,
      nombre,
      descripcion,
      codigo,
      capacidad,
      piso,
      equipamiento,
      profesionalesAsignados,
      activo,
      color,
      notas,
    });

    await box.save();
    const populated = await box.populate("profesionalesAsignados", "username email");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error al crear el box", error: error.message });
  }
};

export const actualizarBox = async (req, res) => {
  try {
    const userId = req.user.id;
    const box = await Box.findById(req.params.id);
    if (!box) return res.status(404).json({ message: "Box no encontrado" });

    const esAdmin = await verificarAdminSucursal(userId, box.sucursal);
    if (!esAdmin) return res.status(403).json({ message: "No tienes permisos para editar este box" });

    const campos = ["nombre", "descripcion", "codigo", "capacidad", "piso", "equipamiento", "profesionalesAsignados", "activo", "color", "notas"];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) box[campo] = req.body[campo];
    });

    await box.save();
    const populated = await box.populate("profesionalesAsignados", "username email");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el box", error: error.message });
  }
};

export const eliminarBox = async (req, res) => {
  try {
    const userId = req.user.id;
    const box = await Box.findById(req.params.id);
    if (!box) return res.status(404).json({ message: "Box no encontrado" });

    const esAdmin = await verificarAdminSucursal(userId, box.sucursal);
    if (!esAdmin) return res.status(403).json({ message: "No tienes permisos para eliminar este box" });

    await Box.findByIdAndDelete(req.params.id);
    res.json({ message: "Box eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el box", error: error.message });
  }
};

export const toggleActivoBox = async (req, res) => {
  try {
    const userId = req.user.id;
    const box = await Box.findById(req.params.id);
    if (!box) return res.status(404).json({ message: "Box no encontrado" });

    const esAdmin = await verificarAdminSucursal(userId, box.sucursal);
    if (!esAdmin) return res.status(403).json({ message: "No tienes permisos para modificar este box" });

    box.activo = !box.activo;
    await box.save();
    res.json({ activo: box.activo, message: `Box ${box.activo ? "activado" : "desactivado"} correctamente` });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar estado del box", error: error.message });
  }
};
