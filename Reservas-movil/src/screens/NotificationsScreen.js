import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { 
  getNotificationsRequest, 
  markAsReadRequest, 
  deleteAllNotificationsRequest 
} from '../api/notifications';
import { useAlert } from '../context/AlertContext';

const NotificationsScreen = ({ navigation }) => {
  const { showAlert } = useAlert();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsRequest({ limit: 50 });
      setNotifications(res?.data?.notifications || []);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      // Marcar como leídas al entrar
      markAsReadRequest([]).catch(console.error);
    }, [fetchNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotificationsRequest();
      setNotifications([]);
      showAlert('Notificaciones eliminadas', 'success');
    } catch (error) {
      showAlert('Error eliminando notificaciones', 'error');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'new_appointment':
        return 'calendar-outline';
      case 'cancelled_appointment':
        return 'close-circle-outline';
      case 'confirmed_appointment':
        return 'checkmark-circle-outline';
      case 'subscription_expiring':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'new_appointment':
        return colors.primary;
      case 'cancelled_appointment':
        return '#c62828';
      case 'confirmed_appointment':
        return '#2e7d32';
      case 'subscription_expiring':
        return '#ef6c00';
      default:
        return '#666';
    }
  };

  const renderNotification = ({ item }) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();
    const formattedDate = format(createdAt, "d 'de' MMM, HH:mm", { locale: es });

    return (
      <View style={[styles.notificationCard, !item.read && styles.unreadCard]}>
        <View style={[styles.iconContainer, { backgroundColor: getTypeColor(item.type) + '20' }]}>
          <Ionicons name={getTypeIcon(item.type)} size={24} color={getTypeColor(item.type)} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleDeleteAll} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No hay notificaciones</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
  },
});

export default NotificationsScreen;
