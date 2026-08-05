import { Image } from 'expo-image';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/backend';

const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export default function SignInScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMessage(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Check your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (result.error) {
        setErrorMessage(result.error.message ?? 'The email or password is incorrect.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign in failed. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.brand}>
                <View style={styles.logoContainer}>
                  <Image
                    accessibilityLabel="Flavoneer"
                    source={require('@/assets/images/flavoneer-mark.png')}
                    style={styles.logo}
                  />
                </View>
                <ThemedText type="subtitle" style={styles.title}>
                  Welcome back
                </ThemedText>
                <ThemedText style={styles.subtitle} themeColor="textSecondary">
                  Sign in to continue to Flavoneer.
                </ThemedText>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <ThemedText type="smallBold">Email</ThemedText>
                  <TextInput
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    editable={!isSubmitting}
                    inputMode="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    onSubmitEditing={() => undefined}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textSecondary}
                    returnKeyType="next"
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                    textContentType="username"
                    value={email}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText type="smallBold">Password</ThemedText>
                  <View
                    style={[
                      styles.passwordField,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}>
                    <TextInput
                      accessibilityLabel="Password"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      editable={!isSubmitting}
                      onChangeText={setPassword}
                      onSubmitEditing={handleSignIn}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.textSecondary}
                      returnKeyType="go"
                      secureTextEntry={!showPassword}
                      style={[styles.passwordInput, { color: theme.text }]}
                      textContentType="password"
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                      hitSlop={12}
                      onPress={() => setShowPassword((current) => !current)}
                      style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}>
                      {showPassword ? (
                        <EyeOff color={theme.textSecondary} size={20} />
                      ) : (
                        <Eye color={theme.textSecondary} size={20} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {errorMessage ? (
                  <View accessibilityLiveRegion="polite" style={styles.errorContainer}>
                    <ThemedText style={styles.errorText} type="small">
                      {errorMessage}
                    </ThemedText>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleSignIn}
                  style={({ pressed }) => [
                    styles.submitButton,
                    { backgroundColor: theme.text },
                    pressed && styles.pressed,
                    isSubmitting && styles.disabled,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.background} size="small" />
                  ) : (
                    <ThemedText style={[styles.submitLabel, { color: theme.background }]}>
                      Sign in
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  content: {
    width: '100%',
    maxWidth: Math.min(MaxContentWidth, 440),
    gap: Spacing.five,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    marginBottom: Spacing.three,
    borderRadius: 28,
    backgroundColor: '#D2F2D4',
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  passwordField: {
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingLeft: Spacing.three,
    fontSize: 16,
  },
  visibilityButton: {
    width: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#B91C1C',
  },
  submitButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
  },
  submitLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.55,
  },
});
