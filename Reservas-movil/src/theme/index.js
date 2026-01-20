// Colores del tema de la aplicación
export const colors = {
  // Primarios
  primary: '#2596be',
  primaryLight: '#21cbe6',
  primaryDark: '#1565c0',
  primaryHover: '#1e7fa0',
  primarySoft: '#e7f6fb',
  primaryBorder: '#bfe8f3',
  gradientFrom: '#2596be',
  gradientTo: '#21cbe6',
  
  // Secundarios
  secondary: '#9c27b0',
  secondaryLight: '#ba68c8',
  secondaryDark: '#7b1fa2',
  
  // Estados
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  
  // Neutrales
  white: '#ffffff',
  black: '#000000',
  background: '#f5f5f5',
  backgroundAlt: '#f7fbfd',
  surface: '#ffffff',
  
  // Texto
  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#999999',
  textHint: '#cccccc',
  
  // Bordes
  border: '#e0e0e0',
  divider: '#f0f0f0',
};

// Tipografía
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body1: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  body2: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
  },
};

// Espaciado
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Bordes redondeados
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  round: 9999,
};

// Sombras
export const shadows = {
  small: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  medium: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  large: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
