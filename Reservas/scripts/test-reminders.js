/**
 * Script para probar el sistema de recordatorios
 * 
 * Ejecutar con: node scripts/test-reminders.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Importar modelos y funciones
import '../src/db.js';
import ScheduledReminder from '../src/models/scheduledReminder.model.js';
import Reserva from '../src/models/ficha.model.js';
import User from '../src/models/user.model.js';
import Paciente from '../src/models/paciente.model.js';
import { programarRecordatorios, procesarRecordatoriosPendientes } from '../src/controllers/reminder.controller.js';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testReminders() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await delay(2000); // Esperar conexión

        // 1. Ver recordatorios existentes
        console.log('\n📋 Recordatorios existentes:');
        const existentes = await ScheduledReminder.find({})
            .populate('paciente', 'nombre telefono')
            .populate('profesional', 'username')
            .sort({ fechaProgramada: 1 })
            .limit(20);
        
        if (existentes.length === 0) {
            console.log('   No hay recordatorios programados');
        } else {
            existentes.forEach(r => {
                console.log(`   - [${r.estado}] ${r.tipo} | Paciente: ${r.paciente?.nombre || 'N/A'} | Programado: ${r.fechaProgramada.toLocaleString()}`);
            });
        }

        // 2. Ver estadísticas por estado
        console.log('\n📊 Estadísticas por estado:');
        const stats = await ScheduledReminder.aggregate([
            { $group: { _id: '$estado', count: { $sum: 1 } } }
        ]);
        stats.forEach(s => {
            console.log(`   ${s._id}: ${s.count}`);
        });

        // 3. Ver estadísticas por tipo
        console.log('\n📊 Estadísticas por tipo:');
        const statsTipo = await ScheduledReminder.aggregate([
            { $group: { _id: '$tipo', count: { $sum: 1 } } }
        ]);
        statsTipo.forEach(s => {
            console.log(`   ${s._id}: ${s.count}`);
        });

        // 4. Ver recordatorios pendientes listos para enviar
        console.log('\n⏰ Recordatorios pendientes listos para enviar AHORA:');
        const pendientes = await ScheduledReminder.find({
            estado: 'pendiente',
            fechaProgramada: { $lte: new Date() }
        }).populate('paciente', 'nombre telefono');
        
        if (pendientes.length === 0) {
            console.log('   No hay recordatorios listos para enviar');
        } else {
            pendientes.forEach(r => {
                console.log(`   - ${r.tipo} | ${r.paciente?.nombre} | Tel: ${r.paciente?.telefono}`);
            });
        }

        // 5. Opción para procesar pendientes
        if (pendientes.length > 0) {
            console.log('\n🚀 Procesando recordatorios pendientes...');
            const resultado = await procesarRecordatoriosPendientes();
            console.log('   Resultado:', JSON.stringify(resultado, null, 2));
        }

        // 6. Mostrar próximos recordatorios programados
        console.log('\n📅 Próximos recordatorios (pendientes):');
        const proximos = await ScheduledReminder.find({
            estado: 'pendiente',
            fechaProgramada: { $gt: new Date() }
        })
        .populate('paciente', 'nombre')
        .sort({ fechaProgramada: 1 })
        .limit(10);
        
        if (proximos.length === 0) {
            console.log('   No hay recordatorios futuros programados');
        } else {
            proximos.forEach(r => {
                const diff = (r.fechaProgramada - new Date()) / (1000 * 60 * 60);
                console.log(`   - ${r.tipo} | ${r.paciente?.nombre} | En ${diff.toFixed(1)} horas (${r.fechaProgramada.toLocaleString()})`);
            });
        }

        console.log('\n✅ Test completado');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testReminders();
