import React from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';

import {RootNavigator} from '../navigation/RootNavigator';
import {mobileTheme} from '../theme/tokens';

export default function App() {
  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={mobileTheme.colors.background}
      />
      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
});
