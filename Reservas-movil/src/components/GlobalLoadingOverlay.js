import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { loadingBus } from '../utils/loadingBus';
import VitalinkLoader from './VitalinkLoader';

/**
 * Overlay global de carga: se muestra (bloqueando toques) mientras el
 * loadingBus tenga operaciones activas. Se monta una sola vez en App.js.
 */
export default function GlobalLoadingOverlay() {
  const [state, setState] = useState(loadingBus.getState());

  useEffect(() => loadingBus.subscribe(setState), []);

  if (!state.active) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <VitalinkLoader caption={state.message} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});
