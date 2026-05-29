import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AuthProvider} from './AuthProvider';
import {UserProvider} from '../contexts/UserContext';
import {LiveDataProvider} from '../contexts/LiveDataContext';
import {RootNavigator} from '../navigation/RootNavigator';
import {colors} from '../theme/tokens';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <AuthProvider>
        <UserProvider>
          <LiveDataProvider>
            <RootNavigator />
          </LiveDataProvider>
        </UserProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
