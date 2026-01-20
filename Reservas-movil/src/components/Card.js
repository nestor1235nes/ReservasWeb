import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, shadows } from '../theme';

const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
});

export default Card;
