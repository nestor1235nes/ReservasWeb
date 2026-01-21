import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Screens & Stacks
import HomeStack from './HomeStack';
import CalendarScreen from '../screens/CalendarScreen';
import PatientsStack from './PatientsStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Patients':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ 
          title: 'Inicio',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{ 
          title: 'Calendario',
          headerTitle: 'Mi Calendario'
        }}
      />
      <Tab.Screen 
        name="Patients" 
        component={PatientsStack}
        options={{ 
          title: 'Pacientes',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ 
          title: 'Perfil',
          headerShown: false
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
