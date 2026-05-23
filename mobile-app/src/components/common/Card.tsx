import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {colors, radius, shadow, spacing} from '../../theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'flat';
};

export function Card({children, style, variant = 'default'}: Props) {
  return (
    <View style={[styles.card, variant === 'default' && shadow.sm, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});
