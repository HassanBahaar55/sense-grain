import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';

import {useAuth} from '../../app/AuthProvider';
import {RootStackParamList} from '../../navigation/RootNavigator';
import {colors, fontWeight, spacing} from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;
type Screen = 'form' | 'sent';

function Logo() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoBadge}>
        <Svg width={28} height={28} viewBox="0 0 32 32">
          <Defs>
            <LinearGradient id="fpLogoGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#059669" />
              <Stop offset="1" stopColor="#065f46" />
            </LinearGradient>
          </Defs>
          <Path d="M16 26V18C13 18 10 15 10 11C13 11 16 14 16 18" fill="#a7f3d0" />
          <Path d="M16 24V16C19 16 22 13 22 9C19 9 16 12 16 16" fill="#d1fae5" />
          <Path
            d="M16 27V18"
            stroke="#a7f3d0"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text style={styles.logoText}>Sense Grain</Text>
    </View>
  );
}

function ErrorBanner({message, onDismiss}: {message: string; onDismiss: () => void}) {
  return (
    <View style={styles.errorBanner}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={styles.errorIcon}>
        <Circle cx={12} cy={12} r={10} stroke="#ef4444" strokeWidth={2} />
        <Path d="M12 8V12" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
        <Path d="M12 16H12.01" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <Text style={styles.errorDismiss}>×</Text>
      </Pressable>
    </View>
  );
}

function EmailSentIcon() {
  return (
    <View style={styles.sentIconWrap}>
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Rect x={2} y={4} width={20} height={16} rx={2} stroke="#059669" strokeWidth={2} />
        <Path d="M22 7L12 14L2 7" stroke="#059669" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function BackArrowIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5" stroke="#047857" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 5l-7 7 7 7" stroke="#047857" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ForgotPasswordScreen({navigation}: Props) {
  const {sendPasswordReset} = useAuth();

  const [screen, setScreen] = useState<Screen>('form');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  function validateEmailLocal(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Enter a valid email address';
    }
    return '';
  }

  async function handleSend() {
    setError('');
    const validationError = validateEmailLocal(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    setEmailError('');
    setIsLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSentTo(email.trim());
      setScreen('sent');
    } catch (err: unknown) {
      const code = (err as {code?: string}).code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setSentTo(email.trim());
        setScreen('sent');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsLoading(true);
    try {
      await sendPasswordReset(sentTo);
    } catch {
      // silently ignore resend errors
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.shell}>
            <Logo />

            <View style={styles.card}>
              {screen === 'form' ? (
                <>
                  <View style={styles.header}>
                    <Text style={styles.title}>Reset password</Text>
                    <Text style={styles.subtitle}>
                      Enter your email and we'll send you a reset link
                    </Text>
                  </View>

                  {error ? (
                    <ErrorBanner message={error} onDismiss={() => setError('')} />
                  ) : null}

                  <View style={styles.fieldWrap}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      value={email}
                      placeholder="you@example.com"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onChangeText={(nextValue) => {
                        setEmail(nextValue);
                        setEmailError('');
                        setError('');
                      }}
                      editable={!isLoading}
                      style={[styles.input, emailError ? styles.inputError : undefined]}
                    />
                    {emailError ? (
                      <Text style={styles.inputErrorText}>{emailError}</Text>
                    ) : null}
                  </View>

                  <Pressable
                    disabled={isLoading}
                    onPress={handleSend}
                    style={({pressed}) => [
                      styles.submitButton,
                      pressed ? styles.buttonPressed : undefined,
                      isLoading ? styles.submitButtonDisabled : undefined,
                    ]}>
                    {isLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={styles.submitButtonText}>Sending...</Text>
                      </>
                    ) : (
                      <Text style={styles.submitButtonText}>Send reset link</Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.sentIconRow}>
                    <EmailSentIcon />
                  </View>

                  <View style={styles.header}>
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.subtitle}>We sent a password reset link to</Text>
                    <Text style={styles.sentEmail}>{sentTo}</Text>
                  </View>

                  <Text style={styles.sentHint}>
                    Click the link in your email to reset your password.{'\n'}
                    Check your spam folder if you don't see it.
                  </Text>

                  <Pressable
                    disabled={isLoading}
                    onPress={handleResend}
                    style={({pressed}) => [
                      styles.resendButton,
                      pressed ? styles.buttonPressed : undefined,
                      isLoading ? styles.submitButtonDisabled : undefined,
                    ]}>
                    <Text style={styles.resendButtonText}>
                      {isLoading ? 'Sending...' : 'Resend email'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={({pressed}) => [styles.backLink, pressed ? styles.buttonPressed : undefined]}>
              <BackArrowIcon />
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardAvoidingView: {
    flex: 1,
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  shell: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#064e3b',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 16,
    elevation: 5,
  },
  logoText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.bold,
    color: '#111827',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.85)',
    paddingHorizontal: 28,
    paddingVertical: 28,
    shadowColor: '#064e3b',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 10},
    shadowRadius: 28,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeight.bold,
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  sentEmail: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.semibold,
    color: '#111827',
    textAlign: 'center',
  },
  sentHint: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    marginBottom: 16,
  },
  errorIcon: {
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#b91c1c',
    fontWeight: fontWeight.medium,
  },
  errorDismiss: {
    color: '#f87171',
    fontSize: 18,
    lineHeight: 18,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#1f2937',
    fontWeight: fontWeight.semibold,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
  },
  inputError: {
    borderColor: '#fca5a5',
  },
  inputErrorText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#dc2626',
    fontWeight: fontWeight.medium,
  },
  submitButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
  },
  sentIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sentIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#374151',
    fontWeight: fontWeight.semibold,
  },
  backLink: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backLinkText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#047857',
    fontWeight: fontWeight.semibold,
  },
  buttonPressed: {
    opacity: 0.92,
  },
});
