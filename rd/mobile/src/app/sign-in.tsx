import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from '@/components/ui/image';
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
    <ThemedView className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerClassName="grow items-center justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-full max-w-[440px] gap-8">
              <View className="items-center gap-2">
                <View className="mb-4 size-[88px] items-center justify-center rounded-[28px] bg-[#D2F2D4]">
                  <Image
                    accessibilityLabel="Flavoneer"
                    className="size-16"
                    source={require('@/assets/images/flavoneer-mark.png')}
                  />
                </View>
                <ThemedText className="text-center" type="subtitle">
                  Welcome back
                </ThemedText>
                <ThemedText className="text-center" themeColor="textSecondary">
                  Sign in to continue to Flavoneer.
                </ThemedText>
              </View>

              <View className="gap-4">
                <View className="gap-2">
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
                    className="min-h-[54px] rounded-2xl border-hairline border-[#E0E1E6] bg-[#F0F0F3] px-4 text-base text-black dark:border-[#2E3135] dark:bg-[#212225] dark:text-white"
                    textContentType="username"
                    value={email}
                  />
                </View>

                <View className="gap-2">
                  <ThemedText type="smallBold">Password</ThemedText>
                  <View className="min-h-[54px] flex-row items-center rounded-2xl border-hairline border-[#E0E1E6] bg-[#F0F0F3] dark:border-[#2E3135] dark:bg-[#212225]">
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
                      className="min-h-[52px] flex-1 pl-4 text-base text-black dark:text-white"
                      textContentType="password"
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                      className="min-h-[52px] w-[52px] items-center justify-center active:opacity-70"
                      hitSlop={12}
                      onPress={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? (
                        <EyeOff color={theme.textSecondary} size={20} />
                      ) : (
                        <Eye color={theme.textSecondary} size={20} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {errorMessage ? (
                  <View
                    accessibilityLiveRegion="polite"
                    className="rounded-lg bg-[#FEF2F2] px-4 py-2"
                  >
                    <ThemedText className="!text-[#B91C1C]" type="small">
                      {errorMessage}
                    </ThemedText>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  className={`mt-1 min-h-[54px] items-center justify-center rounded-2xl bg-black active:opacity-70 dark:bg-white ${isSubmitting ? 'opacity-[0.55]' : ''}`}
                  disabled={isSubmitting}
                  onPress={handleSignIn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.background} size="small" />
                  ) : (
                    <ThemedText className="text-base font-bold leading-[22px] !text-white dark:!text-black">
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
