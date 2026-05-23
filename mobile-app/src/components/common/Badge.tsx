import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, fontSize, fontWeight, radius, spacing} from '../../theme/tokens';

type Variant = 'critical' | 'warning' | 'info' | 'success' | 'neutral';

type Props = {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
};

const variantStyles: Record<Variant, {bg: string; text: string}> = {
  critical: {bg: colors.dangerBg, text: colors.danger},
  warning: {bg: colors.warningBg, text: colors.warning},
  info: {bg: colors.infoBg, text: colors.sky},
  success: {bg: colors.successBg, text: colors.primaryLight},
  neutral: {bg: colors.surfaceSecondary, text: colors.textSecondary},
};

export function Badge({label, variant = 'neutral', style}: Props) {
  const vs = variantStyles[variant];
  return (
    <View style={[styles.badge, {backgroundColor: vs.bg}, style]}>
      <Text style={[styles.label, {color: vs.text}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
