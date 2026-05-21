import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing, fontSize} from '../../theme/tokens';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  text: {fontSize: fontSize.xl, color: colors.textPrimary},
});
