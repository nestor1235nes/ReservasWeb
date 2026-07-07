import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * VitalinkLoader — animación de carga oficial del sistema (port del componente web).
 * Muestra el logo de la empresa con un "pulso" tipo ECG animado debajo.
 *
 * Props:
 * - caption: texto bajo el pulso (por defecto "Cargando…"). Pasa null para ocultarlo.
 * - size: 'sm' | 'md' | 'lg' (ancho del logo).
 * - logoWidth: ancho del logo en px (sobreescribe size).
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZES = { sm: 96, md: 132, lg: 176 };
const ECG_PATH = 'M0 28 H60 L70 28 L78 12 L88 44 L96 20 L104 28 L130 28 L140 14 L150 42 L158 28 H240';
const DASH = 600;

export default function VitalinkLoader({ caption = 'Cargando…', size = 'md', logoWidth }) {
  const dash = useRef(new Animated.Value(DASH)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dashLoop = Animated.loop(
      Animated.timing(dash, {
        toValue: 0,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false, // props de SVG no soportan el driver nativo
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    dashLoop.start();
    pulseLoop.start();
    return () => {
      dashLoop.stop();
      pulseLoop.stop();
    };
  }, [dash, pulse]);

  const w = logoWidth || SIZES[size] || SIZES.md;
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });

  return (
    <View style={styles.wrap}>
      <Animated.Image
        source={require('../../assets/LOGO.png')}
        resizeMode="contain"
        style={{ width: w, height: w * 0.45, transform: [{ scale }], opacity }}
      />

      <Svg width={240} height={56} viewBox="0 0 240 56">
        <Defs>
          <LinearGradient id="vl-ecg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#2BC4CC" stopOpacity="0" />
            <Stop offset="50%" stopColor="#2BC4CC" stopOpacity="1" />
            <Stop offset="100%" stopColor="#1B8A95" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          d={ECG_PATH}
          fill="none"
          stroke="url(#vl-ecg-grad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[DASH, DASH]}
          strokeDashoffset={dash}
        />
      </Svg>

      {caption ? <Text style={styles.caption}>{String(caption).toUpperCase()}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: '#5A7480',
  },
});
