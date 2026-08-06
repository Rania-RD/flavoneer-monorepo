import { Eye, EyeOff, LockKeyhole } from 'lucide-react-native';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from '@/components/ui/image';
import { BrandColors, Fonts } from '@/constants/theme';
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
    <ThemedView className="flex-1 overflow-hidden">
      <View className="pointer-events-none absolute -start-32 -top-24 size-80 rounded-full bg-[#D2F2D4] dark:bg-[#285B4D]/45" />
      <View className="pointer-events-none absolute -end-24 top-[38%] size-60 rounded-full bg-[#F5A623]/15 dark:bg-[#F5A623]/8" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerClassName="grow items-center justify-center px-5 py-8"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full max-w-[440px]">
              <Animated.View entering={FadeInDown.duration(520).springify()}>
                <View className="mb-8 items-center">
                  <View
                    className="mb-5 size-20 items-center justify-center rounded-[27px] bg-[#F5A623]"
                    style={{
                      elevation: 4,
                      shadowColor: BrandColors.deepForest,
                      shadowOpacity: 0.18,
                      shadowRadius: 16,
                    }}
                  >
                    <Image
                      accessibilityLabel="Flavoneer"
                      className="size-[58px]"
                      source={require('@/assets/images/flavoneer-mark.png')}
                    />
                  </View>
                  <ThemedText type="section">Flavoneer</ThemedText>
                  <ThemedText className="mt-1" themeColor="textSecondary" type="overline">
                    R&amp;D workspace
                  </ThemedText>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(90).duration(520).springify()}>
                <View
                  className="rounded-[40px] border bg-[#FFFDF4] p-7 dark:bg-[#173E33]"
                  style={{
                    borderColor: theme.border,
                    elevation: 5,
                    shadowColor: BrandColors.deepForest,
                    shadowOffset: { width: 0, height: 18 },
                    shadowOpacity: 0.1,
                    shadowRadius: 30,
                  }}
                >
                  <View className="mb-7">
                    <View className="mb-4 size-11 items-center justify-center rounded-[16px] bg-[#D2F2D4] dark:bg-[#285B4D]">
                      <LockKeyhole color={theme.text} size={20} />
                    </View>
                    <ThemedText type="display">Welcome back.</ThemedText>
                    <ThemedText className="mt-2" themeColor="textSecondary" type="small">
                      Sign in to open your shared lab workspace.
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
                        placeholder="you@example.com"
                        placeholderTextColor={theme.textSecondary}
                        returnKeyType="next"
                        className="min-h-[56px] rounded-[18px] border bg-[#EEF8EB] px-4 text-base text-[#173E33] dark:bg-[#285B4D] dark:text-[#F7F4DF]"
                        style={{ borderColor: theme.border, fontFamily: Fonts.sans }}
                        textContentType="username"
                        value={email}
                      />
                    </View>

                    <View className="gap-2">
                      <ThemedText type="smallBold">Password</ThemedText>
                      <View
                        className="min-h-[56px] flex-row items-center rounded-[18px] border bg-[#EEF8EB] dark:bg-[#285B4D]"
                        style={{ borderColor: theme.border }}
                      >
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
                          className="min-h-[54px] flex-1 ps-4 text-base text-[#173E33] dark:text-[#F7F4DF]"
                          style={{ fontFamily: Fonts.sans }}
                          textContentType="password"
                          value={password}
                        />
                        <Pressable
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                          accessibilityRole="button"
                          className="min-h-[54px] w-[54px] items-center justify-center active:opacity-60"
                          hitSlop={10}
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
                        className="rounded-[16px] border border-[#E9B7AD] bg-[#FFF0ED] px-4 py-3 dark:border-[#A65C4D]/40 dark:bg-[#A43434]/20"
                      >
                        <ThemedText className="!text-[#A43434] dark:!text-[#F4B9AE]" type="small">
                          {errorMessage}
                        </ThemedText>
                      </View>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      className={`mt-1 min-h-[56px] items-center justify-center rounded-[19px] bg-[#1C4A3C] active:scale-[0.98] active:bg-[#102F27] dark:bg-[#F5A623] dark:active:bg-[#FFC760] ${isSubmitting ? 'opacity-[0.55]' : ''}`}
                      disabled={isSubmitting}
                      onPress={handleSignIn}
                      style={{
                        elevation: 4,
                        shadowColor: BrandColors.deepForest,
                        shadowOpacity: 0.2,
                        shadowRadius: 12,
                      }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color={theme.primaryText} size="small" />
                      ) : (
                        <ThemedText
                          className="!text-[#FFFDF4] dark:!text-[#173E33]"
                          type="smallBold"
                        >
                          Sign in
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).duration(480)}>
                <ThemedText className="mt-6 text-center" themeColor="textSecondary" type="caption">
                  Your mobile session uses the same account as formulation-rd.
                </ThemedText>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
