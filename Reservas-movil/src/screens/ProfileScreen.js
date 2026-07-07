import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { esAdminDeSucursal } from '../utils/sucursal';
import { colors } from '../theme';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const esAdmin = esAdminDeSucursal(user);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, danger = false }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={22} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
    </TouchableOpacity>
  );

  // Obtener iniciales del nombre
  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {getInitials(user?.username)}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.username || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@ejemplo.com'}</Text>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
            <Text style={styles.editProfileText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <MenuItem
            icon="person-outline"
            title="Información personal"
            subtitle="Nombre, email, teléfono"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="briefcase-outline"
            title="Información profesional"
            subtitle="Especialidad, servicios"
            onPress={() => navigation.navigate('Services')}
          />
          <MenuItem
            icon="time-outline"
            title="Horarios"
            subtitle="Disponibilidad de atención"
            onPress={() => navigation.navigate('Timetable')}
          />
          <MenuItem
            icon="link-outline"
            title="Mi enlace"
            subtitle="Comparte tu página de reservas"
            onPress={() => navigation.navigate('MyLink')}
          />
        </View>

        {esAdmin ? (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Mi empresa</Text>
            <MenuItem
              icon="business-outline"
              title="Configuración de empresa"
              subtitle="Datos, colores y contacto"
              onPress={() => navigation.navigate('SucursalConfig')}
            />
            <MenuItem
              icon="globe-outline"
              title="Enlace de empresa"
              subtitle="Página pública de la sucursal"
              onPress={() => navigation.navigate('SucursalLink')}
            />
            <MenuItem
              icon="cube-outline"
              title="Boxes"
              subtitle="Salas de atención"
              onPress={() => navigation.navigate('Boxes')}
            />
            <Text style={styles.menuFootnote}>
              Reportes y gestión de asistentes/profesionales están disponibles en la versión web.
            </Text>
          </View>
        ) : null}

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          <MenuItem
            icon="chatbubble-ellipses-outline"
            title="Mensajes automáticos"
            subtitle="Plantillas de WhatsApp"
            onPress={() => navigation.navigate('MessageTemplates')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacidad y seguridad"
            onPress={() => navigation.navigate('PrivacySecurity')}
          />
          <MenuItem
            icon="color-palette-outline"
            title="Apariencia"
            subtitle="Tema de la aplicación"
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <MenuItem
            icon="help-circle-outline"
            title="Ayuda y soporte"
          />
          <MenuItem
            icon="document-text-outline"
            title="Términos y condiciones"
          />
          <MenuItem
            icon="information-circle-outline"
            title="Acerca de"
            subtitle="Versión 1.0.0"
          />
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon="log-out-outline"
            title="Cerrar sesión"
            onPress={handleLogout}
            showArrow={false}
            danger
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 15,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
  },
  editProfileText: {
    color: colors.primary,
    marginLeft: 5,
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: '#ffebee',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
  },
  menuTitleDanger: {
    color: colors.error,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  menuFootnote: {
    fontSize: 12,
    color: '#999',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    lineHeight: 16,
  },
});

export default ProfileScreen;
