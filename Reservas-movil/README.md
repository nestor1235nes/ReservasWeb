# Reservas Móvil

Aplicación móvil para gestión de reservas médicas, desarrollada con React Native y Expo.

## 📱 Plataformas Soportadas

- ✅ Android
- ✅ iOS
- ✅ Web (como PWA)

## 🚀 Comenzando

### Prerrequisitos

1. **Node.js** (versión 18 o superior)
2. **npm** o **pnpm**
3. **Expo CLI** (se instalará automáticamente)
4. **Expo Go** app en tu dispositivo móvil (para pruebas)

### Instalación

```bash
# Navegar a la carpeta del proyecto móvil
cd Reservas-movil

# Instalar dependencias
npm install
# o con pnpm
pnpm install
```

### Ejecutar la aplicación

```bash
# Iniciar el servidor de desarrollo
npm start
# o
npx expo start
```

Esto abrirá Expo DevTools en tu navegador. Desde ahí puedes:

- **Escanear el código QR** con la app Expo Go (Android/iOS)
- Presionar `a` para abrir en Android Emulator
- Presionar `i` para abrir en iOS Simulator (solo macOS)
- Presionar `w` para abrir en el navegador web

## 📁 Estructura del Proyecto

```
Reservas-movil/
├── App.js                 # Punto de entrada de la aplicación
├── app.json              # Configuración de Expo
├── package.json          # Dependencias y scripts
├── babel.config.js       # Configuración de Babel
├── assets/               # Iconos y splash screens
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
└── src/
    ├── config.js         # Configuración de API y variables
    ├── api/              # Funciones de llamadas a la API
    │   ├── axios.js      # Instancia de Axios configurada
    │   ├── auth.js       # Endpoints de autenticación
    │   ├── pacientes.js  # Endpoints de pacientes
    │   ├── patientAuth.js
    │   └── reservas.js   # Endpoints de reservas
    ├── context/          # Contextos de React (estado global)
    │   ├── AlertContext.js
    │   ├── AuthContext.js
    │   └── ReservaContext.js
    ├── navigation/       # Configuración de navegación
    │   ├── MainTabs.js   # Tabs principales
    │   └── RootNavigator.js
    └── screens/          # Pantallas de la aplicación
        ├── auth/
        │   ├── LoginScreen.js
        │   └── RegisterScreen.js
        ├── CalendarScreen.js
        ├── HomeScreen.js
        ├── PatientsScreen.js
        └── ProfileScreen.js
```

## ⚙️ Configuración

### Conexión con el Backend

Edita el archivo `src/config.js` para configurar la URL de tu API:

```javascript
// Para desarrollo con Android Emulator
const DEV_API_URL = 'http://10.0.2.2:4000/api';

// Para desarrollo con iOS Simulator
const DEV_API_URL = 'http://localhost:4000/api';

// Para dispositivo físico (usa tu IP local)
const DEV_API_URL = 'http://192.168.1.XX:4000/api';

// Para producción
const PROD_API_URL = 'https://tu-servidor.com/api';
```

### Assets (Iconos y Splash)

Reemplaza los archivos en la carpeta `assets/`:
- `icon.png` - Icono de la app (1024x1024px)
- `splash.png` - Pantalla de carga (1284x2778px)
- `adaptive-icon.png` - Icono adaptativo Android (1024x1024px)

## 📦 Compilar para Producción

### Usando EAS Build (recomendado)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Iniciar sesión en Expo
eas login

# Configurar el proyecto
eas build:configure

# Compilar para Android
eas build --platform android

# Compilar para iOS
eas build --platform ios
```

### Generar APK local (desarrollo)

```bash
# Para Android
npx expo run:android

# Para iOS (solo macOS)
npx expo run:ios
```

## 🔧 Próximos Pasos

1. **Agregar assets personalizados**: Crea los iconos y splash screen de tu marca
2. **Configurar la URL de producción**: Actualiza `PROD_API_URL` en `src/config.js`
3. **Agregar más pantallas**: Implementa las funcionalidades faltantes
4. **Notificaciones push**: Integra expo-notifications
5. **Publicar en las tiendas**: Usa EAS Submit para publicar

## 🎨 Personalización

### Colores del tema

Los colores principales se pueden cambiar en cada archivo de estilos:
- Color primario: `#1976d2` (azul Material Design)
- Color de éxito: `#4caf50`
- Color de error: `#f44336`
- Color de advertencia: `#ff9800`

### Iconos

Se utiliza `@expo/vector-icons` con el set de Ionicons. Puedes explorar todos los iconos disponibles en: https://icons.expo.fyi/

## 🤝 Integración con el Backend

La aplicación móvil se conecta al mismo backend que la versión web. Asegúrate de que:

1. El backend esté corriendo y accesible
2. CORS esté configurado para aceptar requests desde la app móvil
3. La autenticación por token JWT esté habilitada (la app usa tokens en lugar de cookies)

## 📚 Recursos Adicionales

- [Documentación de Expo](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native](https://reactnative.dev/docs/getting-started)
