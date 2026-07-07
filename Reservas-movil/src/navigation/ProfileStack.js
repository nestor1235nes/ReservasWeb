import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ServicesScreen from '../screens/profile/ServicesScreen';
import ServiceFormScreen from '../screens/profile/ServiceFormScreen';
import TimetableScreen from '../screens/profile/TimetableScreen';
import EditTimetableBlockScreen from '../screens/profile/EditTimetableBlockScreen';
import PrivacySecurityScreen from '../screens/profile/PrivacySecurityScreen';
import MessageTemplatesScreen from '../screens/profile/MessageTemplatesScreen';
import MyLinkScreen from '../screens/profile/MyLinkScreen';
import SucursalConfigScreen from '../screens/empresa/SucursalConfigScreen';
import SucursalLinkScreen from '../screens/empresa/SucursalLinkScreen';
import BoxesScreen from '../screens/empresa/BoxesScreen';
import BoxFormScreen from '../screens/empresa/BoxFormScreen';
import BoxAgendaScreen from '../screens/empresa/BoxAgendaScreen';
import BoxOcupacionFormScreen from '../screens/empresa/BoxOcupacionFormScreen';

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
        name="MessageTemplates"
        component={MessageTemplatesScreen}
        options={{ title: 'Mensajes automáticos' }}
      />
      <Stack.Screen
        name="MyLink"
        component={MyLinkScreen}
        options={{ title: 'Mi enlace' }}
      />
      <Stack.Screen
        name="SucursalConfig"
        component={SucursalConfigScreen}
        options={{ title: 'Configuración de empresa' }}
      />
      <Stack.Screen
        name="SucursalLink"
        component={SucursalLinkScreen}
        options={{ title: 'Enlace de empresa' }}
      />
      <Stack.Screen
        name="Boxes"
        component={BoxesScreen}
        options={{ title: 'Boxes' }}
      />
      <Stack.Screen
        name="BoxForm"
        component={BoxFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Editar Box' : 'Nuevo Box',
        })}
      />
      <Stack.Screen
        name="BoxAgenda"
        component={BoxAgendaScreen}
        options={{ title: 'Agenda del box' }}
      />
      <Stack.Screen
        name="BoxOcupacionForm"
        component={BoxOcupacionFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Editar reserva' : 'Reservar box',
        })}
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
