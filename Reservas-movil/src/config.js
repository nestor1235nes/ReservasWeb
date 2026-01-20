// Configuración de la API
// Cambia esta URL por la URL de tu servidor en producción

// Para desarrollo local:
// - Android Emulator: http://10.0.2.2:4000/api
// - iOS Simulator: http://localhost:4000/api
// - Dispositivo físico: http://TU_IP_LOCAL:4000/api (ej: http://192.168.1.100:4000/api)

const DEV_API_URL = 'http://172.20.10.5:4000/api'; // Android Emulator
// const DEV_API_URL = 'http://localhost:4000/api'; // iOS Simulator
// const DEV_API_URL = 'http://192.168.1.100:4000/api'; // Tu IP local para dispositivos físicos

const PROD_API_URL = 'https://tu-servidor-produccion.com/api'; // Cambia por tu URL de producción

// Detectar si estamos en modo desarrollo o producción
const __DEV__ = process.env.NODE_ENV !== 'production';

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const config = {
  API_URL,
  // Puedes agregar más configuraciones aquí
  APP_NAME: 'Reservas',
  VERSION: '1.0.0',
};

export default config;
