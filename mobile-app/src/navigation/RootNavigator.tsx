import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {mobileTheme} from '../theme/tokens';

const grainMetrics = [
  {label: 'Moisture', value: '-- %', status: 'Waiting for sensor'},
  {label: 'Temperature', value: '-- C', status: 'No reading yet'},
  {label: 'Humidity', value: '-- %', status: 'Gateway offline'},
];

export function RootNavigator() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Field monitoring</Text>
        <Text style={styles.title}>{mobileTheme.brandName}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={styles.statusValue}>Offline</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {grainMetrics.map(metric => (
          <View key={metric.label} style={styles.card}>
            <Text style={styles.cardLabel}>{metric.label}</Text>
            <Text style={styles.cardValue}>{metric.value}</Text>
            <Text style={styles.cardStatus}>{metric.status}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.lg,
  },
  header: {
    gap: mobileTheme.spacing.sm,
  },
  eyebrow: {
    color: mobileTheme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: mobileTheme.colors.card,
    borderColor: mobileTheme.colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.xs,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
  },
  statusLabel: {
    color: mobileTheme.colors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  statusValue: {
    color: mobileTheme.colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    gap: mobileTheme.spacing.md,
  },
  card: {
    backgroundColor: mobileTheme.colors.card,
    borderColor: mobileTheme.colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: mobileTheme.spacing.md,
  },
  cardLabel: {
    color: mobileTheme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
  cardValue: {
    color: mobileTheme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: mobileTheme.spacing.xs,
  },
  cardStatus: {
    color: mobileTheme.colors.warning,
    fontSize: 14,
    marginTop: mobileTheme.spacing.sm,
  },
});
