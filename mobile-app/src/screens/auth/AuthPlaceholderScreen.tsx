import React from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {RootStackParamList} from '../../navigation/RootNavigator';
import {colors, fontSize, fontWeight, radius, spacing} from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup' | 'ForgotPassword'>;

const copy = {
  Signup: {
    title: 'Sign up',
    message: 'This screen is next in line. The login flow is ready first so we can match the web app step by step.',
  },
  ForgotPassword: {
    title: 'Forgot password',
    message: 'Password reset flow is the next auth screen to mirror from the web app.',
  },
};

export function AuthPlaceholderScreen({navigation, route}: Props) {
  const content = copy[route.name];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>{content.message}</Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backgroundOrbTop: {
    position: 'absolute',
    top: -160,
    right: -160,
    width: 420,
    height: 420,
    borderRadius: 999,
    backgroundColor: 'rgba(209, 250, 229, 0.7)',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    bottom: -180,
    left: -140,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: 'rgba(236, 253, 245, 0.95)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeight.bold,
    color: '#111827',
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: '#6b7280',
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
});
