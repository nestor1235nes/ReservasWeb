import Paciente from "../models/paciente.model.js";
import Reserva from "../models/ficha.model.js";
import Sucursal from "../models/sucursal.model.js";
import User from "../models/user.model.js";

// Obtener estadísticas generales del dashboard
export const getEstadisticasGenerales = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    let filtroBase = {};
    
    // Determinar el alcance de los datos según el tipo de usuario
    if (user.sucursal) {
      const sucursal = await Sucursal.findById(user.sucursal);
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        // Es asistente: datos de toda la sucursal
        filtroBase.sucursal = sucursal._id;
      } else {
        // Es profesional de sucursal: solo sus datos
        filtroBase.profesional = userId;
      }
    } else {
      // Profesional independiente: solo sus datos
      filtroBase.profesional = userId;
    }

    // Obtener pacientes
    let pacientes = [];
    if (user.sucursal) {
      const sucursal = await Sucursal.findById(user.sucursal).populate('pacientes');
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        // Asistente ve todos los pacientes de la sucursal
        pacientes = sucursal.pacientes;
      } else {
        // Profesional de sucursal ve solo sus pacientes
        pacientes = sucursal.pacientes.filter(p => p.profesional && p.profesional.equals(userId));
      }
    } else {
      // Profesional independiente
      const userWithPacientes = await User.findById(userId).populate('pacientes');
      pacientes = userWithPacientes.pacientes;
    }

    // Obtener reservas
    const reservas = await Reserva.find(filtroBase).populate('paciente');

    // Calcular estadísticas básicas
    const totalPacientes = pacientes.length;
    const totalReservas = reservas.length;

    // Estadísticas por estado de pacientes
    const estadosPacientes = pacientes.reduce((acc, paciente) => {
      const estado = paciente.estado || 'Pendiente';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    // Estadísticas de comportamiento/asistencia
    const comportamientoPacientes = {};
    let totalAsistencias = 0;
    let totalInasistencias = 0;

    pacientes.forEach(paciente => {
      if (paciente.comportamiento && paciente.comportamiento.length > 0) {
        paciente.comportamiento.forEach(comp => {
          const tipo = comp.asistencia || 'Sin datos';
          comportamientoPacientes[tipo] = (comportamientoPacientes[tipo] || 0) + 1;
          
          if (comp.asistenciasTotales) totalAsistencias += comp.asistenciasTotales;
          if (comp.inasistenciasTotales) totalInasistencias += comp.inasistenciasTotales;
        });
      }
    });

    const tasaAsistencia = totalAsistencias + totalInasistencias > 0 
      ? Math.round((totalAsistencias / (totalAsistencias + totalInasistencias)) * 100)
      : 0;

    // Distribución por edad
    const distribucionEdad = {
      '0-18': 0,
      '19-30': 0,
      '31-50': 0,
      '51-70': 0,
      '70+': 0
    };

    pacientes.forEach(paciente => {
      const edad = parseInt(paciente.edad) || 0;
      if (edad <= 18) distribucionEdad['0-18']++;
      else if (edad <= 30) distribucionEdad['19-30']++;
      else if (edad <= 50) distribucionEdad['31-50']++;
      else if (edad <= 70) distribucionEdad['51-70']++;
      else distribucionEdad['70+']++;
    });

    // Reservas por mes (últimos 12 meses)
    const reservasPorMes = {};
    const ahora = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesKey = fecha.toISOString().substring(0, 7); // YYYY-MM
      reservasPorMes[mesKey] = 0;
    }

    reservas.forEach(reserva => {
      if (reserva.diaPrimeraCita) {
        const fecha = new Date(reserva.diaPrimeraCita);
        const mesKey = fecha.toISOString().substring(0, 7);
        if (reservasPorMes.hasOwnProperty(mesKey)) {
          reservasPorMes[mesKey]++;
        }
      }
    });

    // Pacientes nuevos último mes
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    
    const pacientesNuevos = pacientes.filter(p => {
      if (p.diaPrimeraCita) {
        const fechaRegistro = new Date(p.diaPrimeraCita);
        return fechaRegistro >= unMesAtras;
      }
      return false;
    }).length;

    res.json({
      kpis: {
        totalPacientes,
        totalReservas,
        tasaAsistencia,
        pacientesNuevos
      },
      estadosPacientes,
      comportamientoPacientes,
      distribucionEdad,
      reservasPorMes,
      totalAsistencias,
      totalInasistencias
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener estadísticas filtradas por rango de tiempo
export const getEstadisticasPorPeriodo = async (req, res) => {
  try {
    const { periodo } = req.query; // '1month', '3months', '6months', '1year'
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Calcular fecha de inicio según el período
    const ahora = new Date();
    let fechaInicio;
    
    switch (periodo) {
      case '1month':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, ahora.getDate());
        break;
      case '3months':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 3, ahora.getDate());
        break;
      case '6months':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 6, ahora.getDate());
        break;
      case '1year':
        fechaInicio = new Date(ahora.getFullYear() - 1, ahora.getMonth(), ahora.getDate());
        break;
      default:
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 6, ahora.getDate());
    }

    let filtroBase = {
      diaPrimeraCita: { $gte: fechaInicio }
    };
    
    // Determinar el alcance según el usuario
    if (user.sucursal) {
      const sucursal = await Sucursal.findById(user.sucursal);
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        filtroBase.sucursal = sucursal._id;
      } else {
        filtroBase.profesional = userId;
      }
    } else {
      filtroBase.profesional = userId;
    }

    // Obtener datos filtrados
    const reservasFiltradas = await Reserva.find(filtroBase).populate('paciente');
    
    // Obtener pacientes del período
    let pacientesFiltrados = [];
    if (user.sucursal) {
      const sucursal = await Sucursal.findById(user.sucursal).populate({
        path: 'pacientes',
        match: { diaPrimeraCita: { $gte: fechaInicio } }
      });
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        pacientesFiltrados = sucursal.pacientes;
      } else {
        pacientesFiltrados = sucursal.pacientes.filter(p => p.profesional && p.profesional.equals(userId));
      }
    } else {
      const userWithPacientes = await User.findById(userId).populate({
        path: 'pacientes',
        match: { diaPrimeraCita: { $gte: fechaInicio } }
      });
      pacientesFiltrados = userWithPacientes.pacientes;
    }

    // Calcular estadísticas del período
    const totalPacientes = pacientesFiltrados.length;
    const totalReservas = reservasFiltradas.length;

    // Estados de pacientes
    const estadosPacientes = pacientesFiltrados.reduce((acc, paciente) => {
      const estado = paciente.estado || 'Pendiente';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    // Comportamiento
    const comportamientoPacientes = {};
    pacientesFiltrados.forEach(paciente => {
      if (paciente.comportamiento && paciente.comportamiento.length > 0) {
        paciente.comportamiento.forEach(comp => {
          const tipo = comp.asistencia || 'Sin datos';
          comportamientoPacientes[tipo] = (comportamientoPacientes[tipo] || 0) + 1;
        });
      }
    });

    // Distribución por edad
    const distribucionEdad = {
      '0-18': 0,
      '19-30': 0,
      '31-50': 0,
      '51-70': 0,
      '70+': 0
    };

    pacientesFiltrados.forEach(paciente => {
      const edad = parseInt(paciente.edad) || 0;
      if (edad <= 18) distribucionEdad['0-18']++;
      else if (edad <= 30) distribucionEdad['19-30']++;
      else if (edad <= 50) distribucionEdad['31-50']++;
      else if (edad <= 70) distribucionEdad['51-70']++;
      else distribucionEdad['70+']++;
    });

    res.json({
      periodo,
      fechaInicio,
      totalPacientes,
      totalReservas,
      estadosPacientes,
      comportamientoPacientes,
      distribucionEdad,
      reservas: reservasFiltradas
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por período:', error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener tendencias mensuales
export const getTendenciasMensuales = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    let filtroBase = {};
    
    if (user.sucursal) {
      const sucursal = await Sucursal.findById(user.sucursal);
      if (sucursal && sucursal.asistentes.some(a => a.equals(userId))) {
        filtroBase.sucursal = sucursal._id;
      } else {
        filtroBase.profesional = userId;
      }
    } else {
      filtroBase.profesional = userId;
    }

    // Obtener datos de los últimos 12 meses
    const ahora = new Date();
    const hace12Meses = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);
    
    const reservas = await Reserva.find({
      ...filtroBase,
      diaPrimeraCita: { $gte: hace12Meses }
    }).populate('paciente');

    // Agrupar por mes
    const tendenciasPorMes = {};
    
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesKey = fecha.toISOString().substring(0, 7);
      const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      tendenciasPorMes[mesKey] = {
        mes: mesNombre,
        reservas: 0,
        pacientesNuevos: 0
      };
    }

    reservas.forEach(reserva => {
      if (reserva.diaPrimeraCita) {
        const fecha = new Date(reserva.diaPrimeraCita);
        const mesKey = fecha.toISOString().substring(0, 7);
        
        if (tendenciasPorMes[mesKey]) {
          tendenciasPorMes[mesKey].reservas++;
          
          // Verificar si es paciente nuevo (primera cita en ese mes)
          if (reserva.paciente && reserva.paciente.diaPrimeraCita) {
            const fechaPaciente = new Date(reserva.paciente.diaPrimeraCita);
            const mesPaciente = fechaPaciente.toISOString().substring(0, 7);
            if (mesPaciente === mesKey) {
              tendenciasPorMes[mesKey].pacientesNuevos++;
            }
          }
        }
      }
    });

    const resultado = Object.values(tendenciasPorMes);

    res.json(resultado);

  } catch (error) {
    console.error('Error obteniendo tendencias mensuales:', error);
    res.status(500).json({ message: error.message });
  }
};
