import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ServicesScreen from '../screens/profile/ServicesScreen';
import ServiceFormScreen from '../screens/profile/ServiceFormScreen';
import TimetableScreen from '../screens/profile/TimetableScreen';
import EditTimetableBlockScreen from '../screens/profile/EditTimetableBlockScreen';
import PrivacySecurityScreen from '../screens/profile/PrivacySecurityScreen';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Mi Perfil' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Editar Perfil' }}
      />
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ title: 'Servicios' }}
      />
      <Stack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{ title: 'Horarios de Atención' }}
      />
      <Stack.Screen
        name="EditTimetableBlock"
        component={EditTimetableBlockScreen}
        options={{ title: 'Editar Bloque de Horario' }}
      />
      <Stack.Screen
        name="PrivacySecurity"
        component={PrivacySecurityScreen}
        options={{ title: 'Privacidad y seguridad' }}
      />
      <Stack.Screen
        name="ServiceForm"
        component={ServiceFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Editar Servicio' : 'Nuevo Servicio',
        })}
      />
    </Stack.Navigator>
  );
}
