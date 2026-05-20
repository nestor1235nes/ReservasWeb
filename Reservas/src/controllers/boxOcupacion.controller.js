import BoxOcupacion from "../models/boxOcupacion.model.js";
import Box from "../models/box.model.js";
import Sucursal from "../models/sucursal.model.js";

// Convierte "HH:mm" a minutos desde medianoche para comparar
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Verifica solapamiento entre dos bloques horarios
const hayConflicto = (inicioA, finA, inicioB, finB) => {
  return toMinutes(inicioA) < toMinutes(finB) && toMinutes(finA) > toMinutes(inicioB);
};

const verificarAdminOProfesional = async (userId, sucursalId) => {
  const sucursal = await Sucursal.findById(sucursalId);
  if (!sucursal) return false;
  const esAdmin = sucursal.administradores.some((a) => a.toString() === userId.toString());
  const esProfesional = sucursal.profesionales.some((p) => p.toString() === userId.toString());
  const esAsistente = sucursal.asistentes.some((a) => a.toString() === userId.toString());
  return esAdmin || esProfesional || esAsistente;
};

// GET /boxes/:boxId/ocupaciones?fecha=YYYY-MM-DD
export const obtenerOcupacionesBox = async (req, res) => {
  try {
    const { boxId } = req.params;
    const { fecha } = req.query;

    // Incluye canceladas para mostrarlas como historial
    const filtro = { box: boxId };

    if (fecha) {
      const inicio = new Date(fecha);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);
      filtro.fecha = { $gte: inicio, $lte: fin };
    }

    const ocupaciones = await BoxOcupacion.find(filtro)
      .populate("solicitadoPor", "username email")
      .populate("paciente", "nombre apellido")
      .sort({ horaInicio: 1 });

    res.json(ocupaciones);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ocupaciones", error: error.message });
  }
};

// GET /sucursal/:sucursalId/boxes/agenda?fecha=YYYY-MM-DD
// Devuelve todos los boxes de la sucursal con sus ocupaciones del día
export const obtenerAgendaSucursal = async (req, res) => {
  try {
    const { sucursalId } = req.params;
    const { fecha } = req.query;

    const boxes = await Box.find({ sucursal: sucursalId })
      .populate("profesionalesAsignados", "username email")
      .sort({ nombre: 1 });

    const diaFiltro = fecha ? new Date(fecha) : new Date();
    const inicio = new Date(diaFiltro);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(diaFiltro);
    fin.setHours(23, 59, 59, 999);

    const ocupaciones = await BoxOcupacion.find({
      sucursal: sucursalId,
      fecha: { $gte: inicio, $lte: fin },
      estado: { $ne: "cancelado" },
    })
      .populate("solicitadoPor", "username email")
      .populate("paciente", "nombre apellido")
      .sort({ horaInicio: 1 });

    // Agrupar ocupaciones por box
    const ocupacionesPorBox = {};
    ocupaciones.forEach((oc) => {
      const id = oc.box.toString();
      if (!ocupacionesPorBox[id]) ocupacionesPorBox[id] = [];
      ocupacionesPorBox[id].push(oc);
    });

    const agenda = boxes.map((box) => ({
      box,
      ocupaciones: ocupacionesPorBox[box._id.toString()] || [],
    }));

    res.json(agenda);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener agenda", error: error.message });
  }
};

// GET /boxes/:boxId/disponibilidad?fecha=YYYY-MM-DD&horaInicio=HH:mm&horaFin=HH:mm
export const verificarDisponibilidad = async (req, res) => {
  try {
    const { boxId } = req.params;
    const { fecha, horaInicio, horaFin } = req.query;

    if (!fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ message: "fecha, horaInicio y horaFin son requeridos" });
    }

    const box = await Box.findById(boxId);
    if (!box) return res.status(404).json({ message: "Box no encontrado" });
    if (!box.activo) return res.json({ disponible: false, motivo: "El box está inactivo" });

    const diaFiltro = new Date(fecha);
    const inicioFiltro = new Date(diaFiltro);
    inicioFiltro.setHours(0, 0, 0, 0);
    const finFiltro = new Date(diaFiltro);
    finFiltro.setHours(23, 59, 59, 999);

    const ocupacionesDelDia = await BoxOcupacion.find({
      box: boxId,
      fecha: { $gte: inicioFiltro, $lte: finFiltro },
      estado: { $ne: "cancelado" },
    }).populate("solicitadoPor", "username");

    const conflictos = ocupacionesDelDia.filter((oc) =>
      hayConflicto(horaInicio, horaFin, oc.horaInicio, oc.horaFin)
    );

    if (conflictos.length > 0) {
      return res.json({
        disponible: false,
        motivo: "El box ya está reservado en ese horario",
        conflictos: conflictos.map((c) => ({
          horaInicio: c.horaInicio,
          horaFin: c.horaFin,
          solicitadoPor: c.solicitadoPor?.username,
          tipo: c.tipo,
        })),
      });
    }

    res.json({ disponible: true });
  } catch (error) {
    res.status(500).json({ message: "Error al verificar disponibilidad", error: error.message });
  }
};

// POST /boxes/:boxId/ocupaciones
export const crearOcupacion = async (req, res) => {
  try {
    const { boxId } = req.params;
    const userId = req.user.id;
    const { fecha, horaInicio, horaFin, tipo, motivo, notas, paciente } = req.body;

    if (!fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ message: "fecha, horaInicio y horaFin son requeridos" });
    }
    if (toMinutes(horaInicio) >= toMinutes(horaFin)) {
      return res.status(400).json({ message: "La hora de inicio debe ser anterior a la hora de fin" });
    }

    const box = await Box.findById(boxId);
    if (!box) return res.status(404).json({ message: "Box no encontrado" });
    if (!box.activo) return res.status(400).json({ message: "El box está inactivo" });

    const puedeSolicitar = await verificarAdminOProfesional(userId, box.sucursal);
    if (!puedeSolicitar) {
      return res.status(403).json({ message: "No tienes permisos para reservar este box" });
    }

    // Verificar conflictos
    const diaFiltro = new Date(fecha);
    const inicioFiltro = new Date(diaFiltro);
    inicioFiltro.setHours(0, 0, 0, 0);
    const finFiltro = new Date(diaFiltro);
    finFiltro.setHours(23, 59, 59, 999);

    const ocupacionesDelDia = await BoxOcupacion.find({
      box: boxId,
      fecha: { $gte: inicioFiltro, $lte: finFiltro },
      estado: { $ne: "cancelado" },
    });

    const conflicto = ocupacionesDelDia.find((oc) =>
      hayConflicto(horaInicio, horaFin, oc.horaInicio, oc.horaFin)
    );

    if (conflicto) {
      return res.status(409).json({
        message: `El box ya está reservado de ${conflicto.horaInicio} a ${conflicto.horaFin} en esa fecha`,
      });
    }

    const ocupacion = new BoxOcupacion({
      box: boxId,
      sucursal: box.sucursal,
      solicitadoPor: userId,
      fecha: new Date(fecha),
      horaInicio,
      horaFin,
      tipo: tipo || "atencion",
      motivo: motivo || "",
      notas: notas || "",
      paciente: paciente || null,
    });

    await ocupacion.save();
    const populated = await ocupacion.populate([
      { path: "solicitadoPor", select: "username email" },
      { path: "paciente", select: "nombre apellido" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error al crear la ocupación", error: error.message });
  }
};

// PUT /boxes-ocupaciones/:id
export const actualizarOcupacion = async (req, res) => {
  try {
    const ocupacion = await BoxOcupacion.findById(req.params.id);
    if (!ocupacion) return res.status(404).json({ message: "Ocupación no encontrada" });

    const userId = req.user.id;
    const sucursal = await Sucursal.findById(ocupacion.sucursal);
    const esAdmin = sucursal?.administradores.some((a) => a.toString() === userId.toString());
    const esPropietario = ocupacion.solicitadoPor.toString() === userId.toString();

    if (!esAdmin && !esPropietario) {
      return res.status(403).json({ message: "No tienes permisos para editar esta reserva" });
    }

    const { fecha, horaInicio, horaFin, tipo, estado, motivo, notas, paciente } = req.body;

    const nuevaFecha = fecha ? new Date(fecha) : ocupacion.fecha;
    const nuevoInicio = horaInicio || ocupacion.horaInicio;
    const nuevoFin = horaFin || ocupacion.horaFin;

    if (toMinutes(nuevoInicio) >= toMinutes(nuevoFin)) {
      return res.status(400).json({ message: "La hora de inicio debe ser anterior a la hora de fin" });
    }

    // Verificar conflictos si cambiaron horarios
    if (fecha || horaInicio || horaFin) {
      const inicioFiltro = new Date(nuevaFecha);
      inicioFiltro.setHours(0, 0, 0, 0);
      const finFiltro = new Date(nuevaFecha);
      finFiltro.setHours(23, 59, 59, 999);

      const ocupacionesDelDia = await BoxOcupacion.find({
        box: ocupacion.box,
        fecha: { $gte: inicioFiltro, $lte: finFiltro },
        estado: { $ne: "cancelado" },
        _id: { $ne: ocupacion._id },
      });

      const conflicto = ocupacionesDelDia.find((oc) =>
        hayConflicto(nuevoInicio, nuevoFin, oc.horaInicio, oc.horaFin)
      );

      if (conflicto) {
        return res.status(409).json({
          message: `El box ya está reservado de ${conflicto.horaInicio} a ${conflicto.horaFin} en esa fecha`,
        });
      }
    }

    if (fecha) ocupacion.fecha = nuevaFecha;
    if (horaInicio) ocupacion.horaInicio = horaInicio;
    if (horaFin) ocupacion.horaFin = horaFin;
    if (tipo) ocupacion.tipo = tipo;
    if (estado) ocupacion.estado = estado;
    if (motivo !== undefined) ocupacion.motivo = motivo;
    if (notas !== undefined) ocupacion.notas = notas;
    if (paciente !== undefined) ocupacion.paciente = paciente || null;

    await ocupacion.save();
    const populated = await ocupacion.populate([
      { path: "solicitadoPor", select: "username email" },
      { path: "paciente", select: "nombre apellido" },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la ocupación", error: error.message });
  }
};

// PATCH /boxes-ocupaciones/:id/estado
export const cambiarEstadoOcupacion = async (req, res) => {
  try {
    const { estado, horaFin } = req.body;
    const ocupacion = await BoxOcupacion.findById(req.params.id);
    if (!ocupacion) return res.status(404).json({ message: "Ocupación no encontrada" });

    const userId = req.user.id;
    const sucursal = await Sucursal.findById(ocupacion.sucursal);
    const esAdmin = sucursal?.administradores.some((a) => a.toString() === userId.toString());
    const esPropietario = ocupacion.solicitadoPor.toString() === userId.toString();

    if (!esAdmin && !esPropietario) {
      return res.status(403).json({ message: "Solo el propietario de la reserva o un administrador puede liberarla" });
    }

    ocupacion.estado = estado;
    // Permite ajustar horaFin al liberar (ej: en_curso terminado antes de tiempo)
    if (horaFin) ocupacion.horaFin = horaFin;
    await ocupacion.save();
    res.json({ estado: ocupacion.estado, horaFin: ocupacion.horaFin, message: "Estado actualizado" });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar estado", error: error.message });
  }
};

// DELETE /boxes-ocupaciones/:id
export const eliminarOcupacion = async (req, res) => {
  try {
    const ocupacion = await BoxOcupacion.findById(req.params.id);
    if (!ocupacion) return res.status(404).json({ message: "Ocupación no encontrada" });

    const userId = req.user.id;
    const sucursal = await Sucursal.findById(ocupacion.sucursal);
    const esAdmin = sucursal?.administradores.some((a) => a.toString() === userId.toString());
    const esPropietario = ocupacion.solicitadoPor.toString() === userId.toString();

    if (!esAdmin && !esPropietario) {
      return res.status(403).json({ message: "Solo el propietario de la reserva o un administrador puede cancelarla" });
    }

    ocupacion.estado = "cancelado";
    await ocupacion.save();
    res.json({ message: "Reserva cancelada correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al cancelar la ocupación", error: error.message });
  }
};
