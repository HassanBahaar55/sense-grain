import React from 'react';
import {SafeAreaView, StatusBar, Text, View} from 'react-native';

export default function App() {
  return (
    <SafeAreaView>
      <StatusBar barStyle="dark-content" />
      <View>
        <Text>Sense Grain</Text>
      </View>
    </SafeAreaView>
  );
}
