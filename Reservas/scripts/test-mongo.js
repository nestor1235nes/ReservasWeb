import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Falta MONGODB_URI en .env');
  process.exit(1);
}

(async () => {
  try {
    const start = Date.now();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const ping = await mongoose.connection.db.admin().command({ ping: 1 });
    const dbName = mongoose.connection.db.databaseName;
    console.log('Conexion OK a MongoDB Atlas');
    console.log('Base de datos:', dbName);
    console.log('Ping:', ping);
    console.log('Tiempo (ms):', Date.now() - start);
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
