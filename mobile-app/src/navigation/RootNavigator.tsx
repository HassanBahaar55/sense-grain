import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';

import {colors, fontSize} from '../theme/tokens';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import RealtimeMonitorScreen from '../screens/realtime-monitor/RealtimeMonitorScreen';
import StorageUnitsScreen from '../screens/storage-units/StorageUnitsScreen';
import AlertsScreen from '../screens/alerts/AlertsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import PredictionsScreen from '../screens/predictions/PredictionsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

export type RootTabParamList = {
  Dashboard: undefined;
  Monitor: undefined;
  Storage: undefined;
  Alerts: undefined;
  Analytics: undefined;
  Predictions: undefined;
  Reports: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIcons: Record<string, string> = {
  Dashboard: '⊞',
  Monitor: '◉',
  Storage: '▦',
  Alerts: '⚠',
  Analytics: '▲',
  Predictions: '◈',
  Reports: '☰',
  Settings: '⚙',
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarIcon: ({focused}) => (
            <Text style={{fontSize: 18, color: focused ? colors.primaryLight : colors.textMuted}}>
              {tabIcons[route.name]}
            </Text>
          ),
          tabBarActiveTintColor: colors.primaryLight,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: fontSize.lg,
            fontWeight: '700',
          },
          headerTintColor: colors.primaryLight,
        })}>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Monitor" component={RealtimeMonitorScreen} options={{title: 'Monitor'}} />
        <Tab.Screen name="Storage" component={StorageUnitsScreen} options={{title: 'Storage'}} />
        <Tab.Screen name="Alerts" component={AlertsScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Predictions" component={PredictionsScreen} />
        <Tab.Screen name="Reports" component={ReportsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
