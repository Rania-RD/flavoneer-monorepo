import { useRouter } from 'expo-router';
import {
  Building2,
  Check,
  ChevronLeft,
  Globe2,
  LogOut,
  type LucideIcon,
  Monitor,
  Moon,
  Palette,
  Sun,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BrandEntrance, BrandHeader, BrandScreen, BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { type AppLanguage, LanguageReloadError, useLanguage } from '@/contexts/language-context';
import { useOrganization } from '@/contexts/organization-context';
import { type ThemePreference, useThemePreference } from '@/contexts/theme-preference-context';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { useTheme } from '@/hooks/use-theme';
import { authClient } from '@/lib/backend';

export default function UserSettingsScreen() {
  const { data: session } = authClient.useSession();
  const { language, setLanguage } = useLanguage();
  const { isRTL, t } = useProductionLineI18n();
  const { activeOrganizationId, organizations, organizationsLoading, setActiveOrganizationId } =
    useOrganization();
  const { setThemePreference, themePreference } = useThemePreference();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        Alert.alert(t('signOutFailed'), t('tryAgain'));
      }
    } catch {
      Alert.alert(t('signOutFailed'), t('tryAgain'));
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === language || isSavingLanguage) {
      return;
    }
    setIsSavingLanguage(true);
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      Alert.alert(
        error instanceof LanguageReloadError
          ? t('languageReloadFailed')
          : t('languageUpdateFailed'),
        error instanceof LanguageReloadError ? t('languageReloadHelp') : t('tryAgain'),
      );
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleThemeChange = async (nextPreference: ThemePreference) => {
    if (nextPreference === themePreference || isSavingTheme) {
      return;
    }
    setIsSavingTheme(true);
    try {
      await setThemePreference(nextPreference);
    } catch {
      Alert.alert(t('appearanceUpdateFailed'), t('tryAgain'));
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <BrandScreen>
      <View style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <BrandEntrance>
          <BrandHeader
            action={
              <Pressable
                accessibilityLabel={t('back')}
                accessibilityRole="button"
                className="size-11 items-center justify-center rounded-full border border-[#1C4A3C]/10 bg-[#FFFDF4]/80 active:scale-95 active:opacity-70 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]"
                onPress={() => router.back()}
              >
                <ChevronLeft
                  color={theme.text}
                  size={22}
                  strokeWidth={2.2}
                  style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                />
              </Pressable>
            }
            actionPosition="start"
          />
        </BrandEntrance>

        <BrandEntrance className="mb-7" delay={70}>
          <ThemedText className="max-w-[360px]" type="title">
            {t('profileTitle')}
          </ThemedText>
          <ThemedText className="mt-3 max-w-[420px]" themeColor="textSecondary" type="small">
            {t('profileDescription')}
          </ThemedText>
        </BrandEntrance>

        <BrandEntrance delay={140}>
          <BrandSurface className="mb-6 !p-0">
            <View className="flex-row items-center gap-4 px-5 py-5">
              <UserAvatar
                name={session?.user.name || session?.user.email}
                seed={session?.user.email}
                size={56}
              />
              <View className="min-w-0 flex-1">
                <ThemedText numberOfLines={1} type="smallBold">
                  {session?.user.name || t('memberFallback')}
                </ThemedText>
                <ThemedText
                  className="mt-0.5"
                  numberOfLines={1}
                  themeColor="textSecondary"
                  type="caption"
                  style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: 'ltr' }}
                >
                  {session?.user.email || t('noEmail')}
                </ThemedText>
              </View>
            </View>

            <View className="ms-5 h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />

            <View className="gap-5 px-5 py-5">
              <SettingValue label={t('name')} value={session?.user.name || t('notSet')} />
              <SettingValue
                label={t('email')}
                value={session?.user.email || t('notSet')}
                valueDirection="ltr"
              />
            </View>
          </BrandSurface>
        </BrandEntrance>

        <BrandEntrance delay={210}>
          <BrandSurface className="mb-6 !p-0">
            <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
              <View className="size-10 items-center justify-center rounded-[14px] bg-[#D2F2D4]/70 dark:bg-[#D2F2D4]/10">
                <Building2 color={theme.text} size={19} />
              </View>
              <View className="min-w-0 flex-1">
                <ThemedText type="smallBold">{t('organization')}</ThemedText>
                <ThemedText className="mt-0.5" themeColor="textSecondary" type="caption">
                  {t('organizationDescription')}
                </ThemedText>
              </View>
            </View>

            <View className="mx-5 mb-5 gap-2">
              {organizationsLoading ? (
                <ActivityIndicator color={theme.text} />
              ) : organizations.length === 0 ? (
                <ThemedText themeColor="textSecondary" type="caption">
                  {t('noOrganization')}
                </ThemedText>
              ) : (
                organizations.map((organization) => {
                  const selected = organization._id === activeOrganizationId;
                  return (
                    <Pressable
                      accessibilityLabel={organization.name}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      className={`min-h-[54px] flex-row items-center gap-3 rounded-[18px] border px-4 active:opacity-70 ${
                        selected
                          ? 'border-[#1C4A3C] bg-[#D2F2D4] dark:border-[#F5A623] dark:bg-[#F5A623]'
                          : 'border-[#1C4A3C]/10 bg-[#1C4A3C]/5 dark:border-[#D2F2D4]/10 dark:bg-[#D2F2D4]/5'
                      }`}
                      key={organization._id}
                      onPress={() => setActiveOrganizationId(organization._id)}
                    >
                      <View
                        className={`size-7 items-center justify-center rounded-full border ${
                          selected
                            ? 'border-[#1C4A3C] bg-[#1C4A3C] dark:border-[#173E33] dark:bg-[#173E33]'
                            : 'border-[#1C4A3C]/25 dark:border-[#D2F2D4]/25'
                        }`}
                      >
                        {selected ? <Check color="#FFFDF4" size={16} strokeWidth={3} /> : null}
                      </View>
                      <ThemedText className="min-w-0 flex-1" numberOfLines={1} type="smallBold">
                        {organization.name}
                      </ThemedText>
                    </Pressable>
                  );
                })
              )}
            </View>
          </BrandSurface>
        </BrandEntrance>

        <BrandEntrance delay={280}>
          <BrandSurface className="mb-6 !p-0">
            <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
              <View className="size-10 items-center justify-center rounded-[14px] bg-[#D2F2D4]/70 dark:bg-[#D2F2D4]/10">
                <Globe2 color={theme.text} size={19} />
              </View>
              <View className="min-w-0 flex-1">
                <ThemedText type="smallBold">{t('language')}</ThemedText>
                <ThemedText className="mt-0.5" themeColor="textSecondary" type="caption">
                  {isSavingLanguage ? t('switchingLanguage') : t('languageDescription')}
                </ThemedText>
              </View>
            </View>

            <View className="mx-5 mb-5 flex-row rounded-[16px] bg-[#1C4A3C]/5 p-1 dark:bg-[#D2F2D4]/5">
              <LanguageOption
                disabled={isSavingLanguage}
                label={t('englishLanguage')}
                language="en"
                onPress={handleLanguageChange}
                selected={language === 'en'}
              />
              <LanguageOption
                disabled={isSavingLanguage}
                label={t('arabicLanguage')}
                language="ar"
                onPress={handleLanguageChange}
                selected={language === 'ar'}
              />
            </View>
          </BrandSurface>
        </BrandEntrance>

        <BrandEntrance delay={350}>
          <BrandSurface className="mb-6 !p-0">
            <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
              <View className="size-10 items-center justify-center rounded-[14px] bg-[#D2F2D4]/70 dark:bg-[#D2F2D4]/10">
                <Palette color={theme.text} size={19} />
              </View>
              <View className="min-w-0 flex-1">
                <ThemedText type="smallBold">{t('appearance')}</ThemedText>
                <ThemedText className="mt-0.5" themeColor="textSecondary" type="caption">
                  {t('appearanceDescription')}
                </ThemedText>
              </View>
            </View>

            <View
              accessibilityLabel={t('appearance')}
              accessibilityRole="radiogroup"
              className="mx-5 mb-5 flex-row rounded-[16px] bg-[#1C4A3C]/5 p-1 dark:bg-[#D2F2D4]/5"
            >
              <AppearanceOption
                disabled={isSavingTheme}
                icon={Moon}
                label={t('darkMode')}
                onPress={handleThemeChange}
                preference="dark"
                selected={themePreference === 'dark'}
              />
              <AppearanceOption
                disabled={isSavingTheme}
                icon={Sun}
                label={t('lightMode')}
                onPress={handleThemeChange}
                preference="light"
                selected={themePreference === 'light'}
              />
              <AppearanceOption
                disabled={isSavingTheme}
                icon={Monitor}
                label={t('systemMode')}
                onPress={handleThemeChange}
                preference="system"
                selected={themePreference === 'system'}
              />
            </View>
          </BrandSurface>
        </BrandEntrance>

        <BrandEntrance delay={420}>
          <Pressable
            accessibilityLabel={t('signOut')}
            accessibilityRole="button"
            className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-[18px] border border-[#1C4A3C]/12 bg-[#FFFDF4]/80 active:scale-[0.98] active:opacity-70 dark:border-[#D2F2D4]/10 dark:bg-[#173E33] ${isSigningOut ? 'opacity-50' : ''}`}
            disabled={isSigningOut}
            onPress={handleSignOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <LogOut
                color={theme.text}
                size={18}
                style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
              />
            )}
            <ThemedText type="smallBold">{t('signOut')}</ThemedText>
          </Pressable>
        </BrandEntrance>
      </View>
    </BrandScreen>
  );
}

function SettingValue({
  label,
  value,
  valueDirection = 'auto',
}: {
  label: string;
  value: string;
  valueDirection?: 'auto' | 'ltr';
}) {
  const { isRTL } = useProductionLineI18n();

  return (
    <View>
      <ThemedText themeColor="textSecondary" type="overline">
        {label}
      </ThemedText>
      <ThemedText
        className="mt-1"
        style={{ textAlign: isRTL ? 'right' : 'left', writingDirection: valueDirection }}
        type="small"
      >
        {value}
      </ThemedText>
    </View>
  );
}

function LanguageOption({
  disabled,
  label,
  language,
  onPress,
  selected,
}: {
  disabled: boolean;
  label: string;
  language: AppLanguage;
  onPress: (language: AppLanguage) => void;
  selected: boolean;
}) {
  const theme = useTheme();
  const { t } = useProductionLineI18n();

  return (
    <Pressable
      accessibilityLabel={t('useLanguage', { language: label })}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[13px] px-3 active:opacity-70 ${
        selected ? 'bg-[#1C4A3C] dark:bg-[#F5A623]' : ''
      } ${disabled ? 'opacity-60' : ''}`}
      disabled={disabled}
      onPress={() => onPress(language)}
    >
      {selected ? <Check color={theme.primaryText} size={16} /> : null}
      <ThemedText className={selected ? '!text-white dark:!text-[#173E33]' : ''} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function AppearanceOption({
  disabled,
  icon: Icon,
  label,
  onPress,
  preference,
  selected,
}: {
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  onPress: (preference: ThemePreference) => void;
  preference: ThemePreference;
  selected: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      className={`min-h-12 flex-1 items-center justify-center gap-1 rounded-[13px] px-1 active:opacity-70 ${
        selected ? 'bg-[#1C4A3C] dark:bg-[#F5A623]' : ''
      } ${disabled ? 'opacity-60' : ''}`}
      disabled={disabled}
      onPress={() => onPress(preference)}
    >
      <Icon color={selected ? theme.primaryText : theme.textSecondary} size={17} />
      <ThemedText
        className={`text-center ${selected ? '!text-white dark:!text-[#173E33]' : ''}`}
        numberOfLines={1}
        type="caption"
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
