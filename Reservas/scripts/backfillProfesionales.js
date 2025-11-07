// Backfill script to populate Paciente.profesionales from historical Reservas
// Usage:
//   node scripts/backfillProfesionales.js            # executes updates
//   node scripts/backfillProfesionales.js --dry-run  # only logs what would change

import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import Paciente from '../src/models/paciente.model.js';
import Reserva from '../src/models/ficha.model.js';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  const start = Date.now();
  await connectDB();

  console.log(`[backfill] Iniciando backfill de profesionales (dryRun=${isDryRun})...`);

  // 1) Cargar reservas con paciente y profesional
  const reservas = await Reserva.find({}, 'paciente profesional').lean();
  console.log(`[backfill] Reservas cargadas: ${reservas.length}`);

  // 2) Construir mapa pacienteId -> Set(profesionalId)
  const mapProfesionalesPorPaciente = new Map();
  for (const r of reservas) {
    if (!r.paciente || !r.profesional) continue; // ignorar reservas sin profesional
    const pid = r.paciente.toString();
    const uid = r.profesional.toString();
    if (!mapProfesionalesPorPaciente.has(pid)) mapProfesionalesPorPaciente.set(pid, new Set());
    mapProfesionalesPorPaciente.get(pid).add(uid);
  }

  // 3) Cargar pacientes relevantes (los que aparecen en reservas)
  const pacienteIds = Array.from(mapProfesionalesPorPaciente.keys());
  const pacientes = await Paciente.find({ _id: { $in: pacienteIds } }, '_id profesional profesionales nombre rut').lean();
  console.log(`[backfill] Pacientes a evaluar: ${pacientes.length}`);

  let toUpdate = 0;
  const bulkOps = [];

  for (const p of pacientes) {
    const current = new Set((p.profesionales || []).map(id => id.toString()));
    // Incluir profesional legacy si existe
    if (p.profesional) current.add(p.profesional.toString());

    const agregados = mapProfesionalesPorPaciente.get(p._id.toString()) || new Set();
    for (const profId of agregados) current.add(profId);

    const newList = Array.from(current);
    // Necesita update si difiere del array existente
    const existingList = (p.profesionales || []).map(id => id.toString());
    const equalLength = newList.length === existingList.length;
    const same = equalLength && newList.every(id => existingList.includes(id));
    if (!same) {
      toUpdate++;
      if (isDryRun) {
        console.log(`[dry-run] Paciente ${p._id} (${p.rut || p.nombre || 'sin-nombre'}) -> profesionales: ${JSON.stringify(newList)}`);
      } else {
        bulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { profesionales: newList } }
          }
        });
      }
    }
  }

  if (!isDryRun && bulkOps.length > 0) {
    const result = await Paciente.bulkWrite(bulkOps, { ordered: false });
    console.log(`[backfill] Actualizaciones aplicadas: ${result.modifiedCount || 0}`);
  } else if (!isDryRun) {
    console.log('[backfill] No hay cambios que aplicar.');
  }

  // 4) Reporte final
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`[backfill] Pacientes con cambios detectados: ${toUpdate}`);
  console.log(`[backfill] Tiempo total: ${elapsed}s`);

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('[backfill] Error:', err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
