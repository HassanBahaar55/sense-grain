import React, {useEffect, useMemo, useState} from 'react';
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
import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';

import {useAuth} from '../../app/AuthProvider';
import {RootStackParamList} from '../../navigation/RootNavigator';
import {colors, fontWeight, spacing} from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

function validateEmail(value: string) {
  if (!value.trim()) {
    return 'Email is required';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Enter a valid email address';
  }
  return '';
}

function validatePassword(value: string) {
  if (!value) {
    return 'Password is required';
  }
  if (value.length < 6) {
    return 'Must be at least 6 characters';
  }
  return '';
}

function Logo() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoBadge}>
        <Svg width={24} height={24} viewBox="0 0 32 32">
          <Defs>
            <LinearGradient id="signupLogoGradient" x1="0" y1="0" x2="1" y2="1">
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

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function EyeIcon({visible}: {visible: boolean}) {
  if (visible) {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 0 1-4.24-4.24"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M1 1L23 23"
          stroke="#9ca3af"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z"
        stroke="#9ca3af"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={12}
        r={3}
        stroke="#9ca3af"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
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

function InputField({
  label,
  value,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
  onChangeText,
  onBlur,
  error,
  disabled,
  rightAccessory,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name';
  onChangeText: (nextValue: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  rightAccessory?: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onChangeText={onChangeText}
          onBlur={onBlur}
          editable={!disabled}
          style={[
            styles.input,
            rightAccessory ? styles.inputWithAccessory : undefined,
            error ? styles.inputError : undefined,
          ]}
        />
        {rightAccessory ? <View style={styles.inputAccessory}>{rightAccessory}</View> : null}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

function mapGoogleErrorToMessage(code: string) {
  if (code === 'auth/cancelled-popup-request' || code === 'SIGN_IN_CANCELLED') {
    return '';
  }
  if (code === 'auth/google-not-configured') {
    return 'Google sign-in is not configured for this Firebase Android app yet.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your connection and try again.';
  }
  return 'Google sign-up failed. Please try again.';
}

export function SignupScreen({navigation}: Props) {
  const {signUpWithEmail, signInWithGoogle, loading} = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({name: false, email: false, password: false, confirm: false});
  const [error, setError] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsSubmitLoading(false);
      setIsGoogleLoading(false);
    }
  }, [loading]);

  const nameError = touched.name && !name.trim() ? 'Name is required' : '';
  const emailError = touched.email ? validateEmail(email) : '';
  const passwordError = touched.password ? validatePassword(password) : '';
  const confirmError = touched.confirm && confirm !== password ? 'Passwords do not match' : '';

  const anyLoading = useMemo(
    () => loading || isSubmitLoading || isGoogleLoading,
    [isSubmitLoading, isGoogleLoading, loading],
  );

  async function handleGoogleSignUp() {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code = (err as {code?: string}).code ?? '';
      const nextMessage = mapGoogleErrorToMessage(code);
      if (nextMessage) {
        setError(nextMessage);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit() {
    setTouched({name: true, email: true, password: true, confirm: true});
    setError('');

    if (!name.trim() || validateEmail(email) || validatePassword(password) || confirm !== password) {
      return;
    }

    setIsSubmitLoading(true);
    try {
      await signUpWithEmail(name.trim(), email.trim(), password);
    } catch (err: unknown) {
      const code = (err as {code?: string}).code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Account creation failed. Please try again.');
      }
    } finally {
      setIsSubmitLoading(false);
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
              <View style={styles.header}>
                <Text style={styles.title}>Create your account</Text>
                <Text style={styles.subtitle}>Get started with Sense Grain</Text>
              </View>

              {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}

              <Pressable
                disabled={anyLoading}
                onPress={handleGoogleSignUp}
                style={({pressed}) => [
                  styles.googleButton,
                  pressed ? styles.buttonPressed : undefined,
                  anyLoading ? styles.buttonDisabled : undefined,
                ]}>
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <GoogleIcon />
                )}
                <Text style={styles.googleButtonText}>
                  {isGoogleLoading ? 'Opening Google...' : 'Continue with Google'}
                </Text>
              </Pressable>

              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerChip}>
                  <Text style={styles.dividerText}>or</Text>
                </View>
              </View>

              <View style={styles.form}>
                <InputField
                  label="Full name"
                  value={name}
                  placeholder="Your full name"
                  autoCapitalize="words"
                  autoComplete="name"
                  disabled={anyLoading}
                  onChangeText={(nextValue) => {
                    setName(nextValue);
                    setError('');
                  }}
                  onBlur={() => setTouched((current) => ({...current, name: true}))}
                  error={nameError}
                />

                <InputField
                  label="Email"
                  value={email}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  disabled={anyLoading}
                  onChangeText={(nextValue) => {
                    setEmail(nextValue);
                    setError('');
                  }}
                  onBlur={() => setTouched((current) => ({...current, email: true}))}
                  error={emailError}
                />

                <InputField
                  label="Password"
                  value={password}
                  placeholder="At least 6 characters"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  disabled={anyLoading}
                  onChangeText={(nextValue) => {
                    setPassword(nextValue);
                    setError('');
                  }}
                  onBlur={() => setTouched((current) => ({...current, password: true}))}
                  error={passwordError}
                  rightAccessory={
                    <Pressable
                      onPress={() => setShowPassword((current) => !current)}
                      hitSlop={10}
                      style={styles.eyeButton}>
                      <EyeIcon visible={showPassword} />
                    </Pressable>
                  }
                />

                <InputField
                  label="Confirm password"
                  value={confirm}
                  placeholder="Re-enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  disabled={anyLoading}
                  onChangeText={(nextValue) => {
                    setConfirm(nextValue);
                    setError('');
                  }}
                  onBlur={() => setTouched((current) => ({...current, confirm: true}))}
                  error={confirmError}
                />

                <Pressable
                  disabled={anyLoading}
                  onPress={handleSubmit}
                  style={({pressed}) => [
                    styles.submitButton,
                    pressed ? styles.buttonPressed : undefined,
                    anyLoading ? styles.submitButtonDisabled : undefined,
                  ]}>
                  {isSubmitLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.submitButtonText}>Creating...</Text>
                    </>
                  ) : (
                    <Text style={styles.submitButtonText}>Create account</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate('Login')}>
                Sign in
              </Text>
            </Text>
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
    marginBottom: 16,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#064e3b',
    shadowOpacity: 0.2,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 16,
    elevation: 5,
  },
  logoText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.bold,
    color: '#111827',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: '#064e3b',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 10},
    shadowRadius: 28,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#6b7280',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    marginBottom: 12,
  },
  errorIcon: {
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#b91c1c',
    fontWeight: fontWeight.medium,
  },
  errorDismiss: {
    color: '#f87171',
    fontSize: 18,
    lineHeight: 18,
  },
  googleButton: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#374151',
    fontWeight: fontWeight.semibold,
  },
  dividerWrap: {
    marginVertical: 12,
    justifyContent: 'center',
  },
  dividerLine: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dividerChip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
  },
  dividerText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#9ca3af',
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  form: {
    gap: 10,
  },
  inputLabel: {
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#1f2937',
    fontWeight: fontWeight.semibold,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: '#111827',
  },
  inputWithAccessory: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: '#fca5a5',
  },
  inputAccessory: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    justifyContent: 'center',
  },
  eyeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputErrorText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: '#dc2626',
    fontWeight: fontWeight.medium,
  },
  submitButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  footerText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  footerLink: {
    color: '#047857',
    fontWeight: fontWeight.semibold,
  },
});
