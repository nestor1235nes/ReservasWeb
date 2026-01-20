import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const showAlert = useCallback((message, type = 'info', duration = 3000) => {
    setAlert({ message, type });
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setAlert(null));
  }, [fadeAnim]);

  const hideAlert = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setAlert(null));
  }, [fadeAnim]);

  const getAlertStyle = (type) => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#4caf50', icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: '#f44336', icon: 'alert-circle' };
      case 'warning':
        return { backgroundColor: '#ff9800', icon: 'warning' };
      default:
        return { backgroundColor: colors.primary, icon: 'information-circle' };
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert && (
        <Animated.View 
          style={[
            styles.alertContainer, 
            { opacity: fadeAnim, backgroundColor: getAlertStyle(alert.type).backgroundColor }
          ]}
        >
          <Ionicons 
            name={getAlertStyle(alert.type).icon} 
            size={24} 
            color="white" 
            style={styles.icon}
          />
          <Text style={styles.alertText}>{alert.message}</Text>
          <TouchableOpacity onPress={hideAlert}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  alertContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  icon: {
    marginRight: 10,
  },
  alertText: {
    color: 'white',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AlertContext;
