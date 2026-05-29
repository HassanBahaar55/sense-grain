import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';

import {useAuth} from '../app/AuthProvider';
import {useUser} from '../contexts/UserContext';
import {ForgotPasswordScreen} from '../screens/auth/ForgotPasswordScreen';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {SignupScreen} from '../screens/auth/SignupScreen';
import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import AlertsScreen from '../screens/alerts/AlertsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PredictionsScreen from '../screens/predictions/PredictionsScreen';
import RealtimeMonitorScreen from '../screens/realtime-monitor/RealtimeMonitorScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import StorageUnitsScreen from '../screens/storage-units/StorageUnitsScreen';
import {colors, fontSize, fontWeight} from '../theme/tokens';

// ─── Route types ──────────────────────────────────────────────────────────────

export type RootTabParamList = {
  Dashboard: undefined;
  Monitor: undefined;
  Storage: undefined;
  Alerts: undefined;
  Analytics: undefined;
  Predictions: undefined;
  Reports: undefined;
  Settings: undefined;
  Admin: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Signup: undefined;
  AppTabs: undefined;
  Pending: undefined;
  Rejected: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const ICON_SIZE = 22;

function DashboardIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MonitorIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StorageIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M21 5c0 1.657-4.03 3-9 3S3 6.657 3 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 5c0-1.657-4.03-3-9-3S3 3.343 3 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AlertsIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AnalyticsIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function PredictionsIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6l-.8 1H9l-.8-1A7 7 0 0 1 12 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 17h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9 20.5c0 .83.67 1.5 1.5 1.5h3c.83 0 1.5-.67 1.5-1.5V20H9v.5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ReportsIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Polyline points="10 9 9 9 8 9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function SettingsIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AdminIcon({color}: {color: string}) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

type IconComponent = ({color}: {color: string}) => React.JSX.Element;

const TAB_ICONS: Record<keyof RootTabParamList, IconComponent> = {
  Dashboard:   DashboardIcon,
  Monitor:     MonitorIcon,
  Storage:     StorageIcon,
  Alerts:      AlertsIcon,
  Analytics:   AnalyticsIcon,
  Predictions: PredictionsIcon,
  Reports:     ReportsIcon,
  Settings:    SettingsIcon,
  Admin:       AdminIcon,
};

// ─── Screen options ───────────────────────────────────────────────────────────

type ScreenOptionsArgs = {
  route: RouteProp<RootTabParamList, keyof RootTabParamList>;
};

const screenOptions = ({route}: ScreenOptionsArgs): BottomTabNavigationOptions => {
  const IconComp = TAB_ICONS[route.name];
  return {
    tabBarIcon: ({color}) => <IconComp color={color} />,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: 62,
      paddingBottom: 8,
      paddingTop: 4,
    },
    tabBarLabelStyle: {
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
    headerShown: false,
  };
};

// ─── Pending screen ───────────────────────────────────────────────────────────

function PendingScreen() {
  const {signOutUser} = useAuth();
  return (
    <SafeAreaView style={styles.guardScreen}>
      <View style={styles.guardCard}>
        <View style={styles.guardIconWrap}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth={1.8} />
            <Path d="M12 8v4M12 16h.01" stroke="#f59e0b" strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={styles.guardTitle}>Account Pending Approval</Text>
        <Text style={styles.guardMessage}>
          Your account is awaiting administrator approval. You will gain access once an admin
          reviews your registration.
        </Text>
        <Text style={styles.guardSub}>
          This usually takes a few hours. Please check back later.
        </Text>
        <TouchableOpacity style={styles.guardBtn} onPress={signOutUser}>
          <Text style={styles.guardBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Rejected screen ──────────────────────────────────────────────────────────

function RejectedScreen() {
  const {signOutUser} = useAuth();
  const {profile} = useUser();
  return (
    <SafeAreaView style={styles.guardScreen}>
      <View style={styles.guardCard}>
        <View style={styles.guardIconWrap}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth={1.8} />
            <Path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={[styles.guardTitle, {color: '#ef4444'}]}>Account Rejected</Text>
        <Text style={styles.guardMessage}>
          Your registration request was not approved.
        </Text>
        {profile?.rejectedReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{profile.rejectedReason}</Text>
          </View>
        ) : null}
        <Text style={styles.guardSub}>
          Please contact support if you believe this is a mistake.
        </Text>
        <TouchableOpacity style={[styles.guardBtn, {backgroundColor: '#ef4444'}]} onPress={signOutUser}>
          <Text style={styles.guardBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Tab navigator ────────────────────────────────────────────────────────────

function AppTabs() {
  const {isAdmin} = useUser();

  return (
    <Tab.Navigator screenOptions={screenOptions} initialRouteName={isAdmin ? 'Admin' : 'Dashboard'}>
      <Tab.Screen name="Dashboard"   component={DashboardScreen} />
      <Tab.Screen name="Monitor"     component={RealtimeMonitorScreen} options={{title: 'Monitor'}} />
      <Tab.Screen name="Storage"     component={StorageUnitsScreen}    options={{title: 'Storage'}} />
      <Tab.Screen name="Alerts"      component={AlertsScreen} />
      <Tab.Screen name="Analytics"   component={AnalyticsScreen} />
      <Tab.Screen name="Predictions" component={PredictionsScreen} />
      <Tab.Screen name="Reports"     component={ReportsScreen} />
      <Tab.Screen name="Settings"    component={SettingsScreen} />
      <Tab.Screen
        name="Admin"
        component={AdminPanelScreen}
        options={{
          tabBarButton: isAdmin ? undefined : () => null,
          tabBarLabel: 'Admin',
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Auth loading screen ──────────────────────────────────────────────────────

function AuthBootScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────

export function RootNavigator() {
  const {loading: authLoading, user} = useAuth();
  const {approvalStatus, loading: userLoading} = useUser();

  if (authLoading || (user != null && userLoading)) {
    return <AuthBootScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!user ? (
          <>
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="Signup"         component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : approvalStatus === 'pending' ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : approvalStatus === 'rejected' ? (
          <Stack.Screen name="Rejected" component={RejectedScreen} />
        ) : (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardScreen: {
    flex: 1,
    backgroundColor: '#f6f8f3',
    justifyContent: 'center',
    padding: 24,
  },
  guardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  guardIconWrap: {
    marginBottom: 20,
  },
  guardTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold as any,
    color: '#172118',
    textAlign: 'center',
    marginBottom: 12,
  },
  guardMessage: {
    fontSize: 14,
    color: '#5e6b5f',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  guardSub: {
    fontSize: 12,
    color: '#8e9b8f',
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: fontWeight.semibold as any,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 13,
    color: '#991b1b',
  },
  guardBtn: {
    backgroundColor: '#1f5135',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  guardBtnText: {
    color: '#ffffff',
    fontWeight: fontWeight.semibold as any,
    fontSize: 15,
  },
});
