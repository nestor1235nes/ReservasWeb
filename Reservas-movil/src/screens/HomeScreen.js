import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { getReservasRequest } from '../api/reservas';
import { addMinutesToHHMM, getReservaDateKey, toYmdLocal } from '../utils/helpers';
import { colors } from '../theme';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalCitas: 0,
    citasPendientes: 0,
    citasCompletadas: 0,
  });

  const [todayReservas, setTodayReservas] = useState([]);
  const [loadingToday, setLoadingToday] = useState(false);

  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: es });

  const fetchToday = async () => {
    setLoadingToday(true);
    try {
      const res = await getReservasRequest();
      const data = res?.data || [];
      const todayKey = toYmdLocal(new Date());
      const list = (Array.isArray(data) ? data : [])
        .filter((r) => getReservaDateKey(r?.siguienteCita) === todayKey)
        .slice()
        .sort((a, b) => String(a?.hora || '').localeCompare(String(b?.hora || '')));

      setTodayReservas(list);

      const estado = (r) => String(r?.confirmStatus || 'pending').toLowerCase().trim();
      const totalCitas = list.length;
      const citasCompletadas = list.filter((r) => estado(r) === 'confirmed').length;
      const citasPendientes = list.filter((r) => estado(r) === 'pending').length;
      setTodayStats({ totalCitas, citasPendientes, citasCompletadas });
    } catch (e) {
      console.error('Error cargando citas de hoy:', e);
      setTodayReservas([]);
      setTodayStats({ totalCitas: 0, citasPendientes: 0, citasCompletadas: 0 });
    } finally {
      setLoadingToday(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchToday();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchToday();
    setRefreshing(false);
  };

  const statusMap = {
    confirmed: { bg: '#e8f5e9', fg: '#2e7d32', label: 'Confirmada' },
    pending: { bg: '#fff3e0', fg: '#ef6c00', label: 'Pendiente' },
    cancelled: { bg: '#ffebee', fg: '#c62828', label: 'Cancelada' },
    reschedule_requested: { bg: colors.primarySoft, fg: colors.primary, label: 'Solicitud cambio' },
  };

  const TodayReservaRow = ({ reserva }) => {
    const horaInicio = reserva?.hora || '';
    const horaFin = horaInicio ? addMinutesToHHMM(horaInicio, 30) : '';
    const estadoRaw = String(reserva?.confirmStatus || 'pending').toLowerCase().trim();
    const st = statusMap[estadoRaw] || statusMap.pending;
    return (
      <TouchableOpacity
        style={styles.todayReservaRow}
        onPress={() => navigation.navigate('Calendar')}
      >
        <View style={styles.todayReservaLeft}>
          <Text style={styles.todayReservaTime}>
            {horaInicio || '—'}{horaFin ? ` - ${horaFin}` : ''}
          </Text>
          <Text style={styles.todayReservaName} numberOfLines={1}>
            {reserva?.paciente?.nombre || 'Paciente'}
          </Text>
        </View>
        <View style={[styles.todayReservaBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.todayReservaBadgeText, { color: st.fg }]}>{st.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#bbb" />
      </TouchableOpacity>
    );
  };

  const QuickActionCard = ({ icon, title, subtitle, onPress, color }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, value, label, color }) => (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Hola, {user?.username || 'Usuario'}
          </Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="calendar"
            value={todayStats.totalCitas}
            label="Citas hoy"
            color={colors.primary}
          />
          <StatCard
            icon="time"
            value={todayStats.citasPendientes}
            label="Pendientes"
            color="#ff9800"
          />
          <StatCard
            icon="checkmark-circle"
            value={todayStats.citasCompletadas}
            label="Completadas"
            color="#4caf50"
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon="add-circle"
            title="Nueva Cita"
            subtitle="Agendar reserva"
            color={colors.primary}
            onPress={() => navigation.navigate('Calendar')}
          />
          <QuickActionCard
            icon="people"
            title="Pacientes"
            subtitle="Ver listado"
            color="#4caf50"
            onPress={() => navigation.navigate('Patients')}
          />
          <QuickActionCard
            icon="calendar-outline"
            title="Calendario"
            subtitle="Ver agenda"
            color="#ff9800"
            onPress={() => navigation.navigate('Calendar')}
          />
          <QuickActionCard
            icon="settings"
            title="Configuración"
            subtitle="Ajustes"
            color="#9c27b0"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* Recent Activity (placeholder) */}
        <Text style={styles.sectionTitle}>Próximas Citas</Text>
        {loadingToday ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : todayReservas.length > 0 ? (
          <View style={styles.todayList}>
            {todayReservas.slice(0, 4).map((r) => (
              <TodayReservaRow key={r._id} reserva={r} />
            ))}
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Text style={styles.emptyStateButtonText}>Ver agenda completa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No hay citas programadas para hoy</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Text style={styles.emptyStateButtonText}>Ver Calendario</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  todayList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  todayReservaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  todayReservaLeft: {
    flex: 1,
  },
  todayReservaTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  todayReservaName: {
    marginTop: 2,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  todayReservaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 10,
  },
  todayReservaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default HomeScreen;
