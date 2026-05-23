import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, fontSize, fontWeight, radius, spacing, shadow} from '../../theme/tokens';

type Status = 'normal' | 'warning' | 'critical' | 'good';

type Props = {
  label: string;
  value: string;
  unit?: string;
  status?: Status;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  style?: ViewStyle;
};

const statusColors: Record<Status, string> = {
  normal: colors.sky,
  warning: colors.warning,
  critical: colors.danger,
  good: colors.primaryLight,
};

const statusBg: Record<Status, string> = {
  normal: colors.infoBg,
  warning: colors.warningBg,
  critical: colors.dangerBg,
  good: colors.successBg,
};

export function MetricCard({label, value, unit, status = 'normal', trend, trendValue, style}: Props) {
  return (
    <View style={[styles.card, {backgroundColor: statusBg[status]}, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, {color: statusColors[status]}]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {trend && trendValue ? (
        <Text style={[styles.trend, {color: trend === 'up' ? colors.danger : colors.primaryLight}]}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    flex: 1,
    ...shadow.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
    gap: 3,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  trend: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
});
