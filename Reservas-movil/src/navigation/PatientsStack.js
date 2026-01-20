import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PatientsScreen from '../screens/PatientsScreen';
import PatientDetailScreen from '../screens/patients/PatientDetailScreen';
import PatientCreateScreen from '../screens/patients/PatientCreateScreen';
import AddSessionScreen from '../screens/patients/AddSessionScreen';

const Stack = createNativeStackNavigator();

const PatientsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PatientsList"
        component={PatientsScreen}
        options={{ title: 'Mis Pacientes' }}
      />
      <Stack.Screen
        name="PatientDetail"
        component={PatientDetailScreen}
        options={({ route }) => ({
          title: route?.params?.title || 'Paciente',
        })}
      />
      <Stack.Screen
        name="PatientCreate"
        component={PatientCreateScreen}
        options={{ title: 'Nuevo paciente' }}
      />
      <Stack.Screen
        name="PatientAddSession"
        component={AddSessionScreen}
        options={{ title: 'Agregar sesión' }}
      />
    </Stack.Navigator>
  );
};

export default PatientsStack;
