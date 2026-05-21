import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fontSize} from '../../theme/tokens';

export default function StorageUnitsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Storage Units</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
  text: {fontSize: fontSize.xl, color: colors.textPrimary},
});
