import { usePathname, useRouter } from 'expo-router';
import { Check, ChevronDown, FlaskConical, ShieldCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { useTheme } from '@/hooks/use-theme';

type WorkspaceSection = 'quality' | 'research';

const MENU_WIDTH = 296;
const SCREEN_GUTTER = 20;

export function WorkspaceSectionSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { isRTL, t } = useProductionLineI18n();
  const triggerRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: SCREEN_GUTTER, top: 80 });
  const sections = [
    {
      id: 'research',
      label: t('researchAndDevelopment'),
      shortLabel: 'R&D',
      description: t('researchDescription'),
      icon: FlaskConical,
    },
    {
      id: 'quality',
      label: t('qualityControl'),
      shortLabel: 'QC',
      description: t('qualityDescription'),
      icon: ShieldCheck,
    },
  ] as const;
  const activeSection: WorkspaceSection = pathname.startsWith('/quality') ? 'quality' : 'research';
  const activeSectionDetails = activeSection === 'quality' ? sections[1] : sections[0];
  const ActiveSectionIcon = activeSectionDetails.icon;

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, _width, height) => {
      const menuWidth = Math.min(MENU_WIDTH, screenWidth - SCREEN_GUTTER * 2);
      const left = Math.min(Math.max(x, SCREEN_GUTTER), screenWidth - menuWidth - SCREEN_GUTTER);

      setMenuPosition({ left, top: y + height + 10 });
      setIsOpen(true);
    });
  };

  const selectSection = (section: WorkspaceSection) => {
    setIsOpen(false);
    if (section === activeSection) {
      return;
    }
    router.navigate(section === 'quality' ? '/quality' : '/');
  };

  return (
    <>
      <Pressable
        accessibilityHint={t('switchSectionHint')}
        accessibilityLabel={t('switchSectionCurrent', {
          section: activeSectionDetails.shortLabel,
        })}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        className="relative size-12 items-center justify-center rounded-[17px] bg-[#F5A623] active:scale-95"
        onPress={openMenu}
        ref={triggerRef}
        style={{
          elevation: 3,
          shadowColor: BrandColors.deepForest,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 10,
        }}
      >
        <Animated.View entering={FadeIn.duration(120)} key={activeSection}>
          <ActiveSectionIcon color={BrandColors.ink} size={23} strokeWidth={2.6} />
        </Animated.View>
        <View className="absolute -bottom-1 -end-1 size-[18px] items-center justify-center rounded-full border-2 border-[#173E33] bg-[#FFFDF4]">
          <ChevronDown color={BrandColors.ink} size={10} strokeWidth={3} />
        </View>
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
        transparent
        visible={isOpen}
      >
        <View className="flex-1" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          <Pressable
            accessibilityLabel={t('closeSectionSelector')}
            className="absolute inset-0 bg-[#102F27]/10"
            onPress={() => setIsOpen(false)}
          />

          <Animated.View
            className="absolute overflow-hidden rounded-[28px] border border-[#1C4A3C]/10 bg-[#FFFDF4] p-2 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]"
            entering={FadeInDown.duration(160)}
            style={{
              elevation: 12,
              left: menuPosition.left,
              shadowColor: BrandColors.deepForest,
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.24,
              shadowRadius: 32,
              top: menuPosition.top,
              width: Math.min(MENU_WIDTH, screenWidth - SCREEN_GUTTER * 2),
            }}
          >
            <View className="px-3 pb-2 pt-2">
              <ThemedText themeColor="textSecondary" type="overline">
                {t('switchSection')}
              </ThemedText>
            </View>

            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <Pressable
                  accessibilityLabel={`${section.label}. ${section.description}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  className={`min-h-[72px] flex-row items-center gap-3 rounded-[20px] p-3 active:scale-[0.985] ${
                    isActive ? 'bg-[#D2F2D4] dark:bg-[#F5A623]' : 'active:bg-[#EEF8EB]'
                  }`}
                  key={section.id}
                  onPress={() => selectSection(section.id)}
                >
                  <View
                    className={`size-10 items-center justify-center rounded-[15px] ${
                      isActive ? 'bg-[#FFFDF4]/70' : 'bg-[#D2F2D4]/55 dark:bg-[#D2F2D4]/10'
                    }`}
                  >
                    <Icon
                      color={isActive ? BrandColors.ink : theme.primary}
                      size={20}
                      strokeWidth={2.4}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <ThemedText
                      className={isActive ? '!text-[#173E33]' : ''}
                      numberOfLines={1}
                      type="smallBold"
                    >
                      {section.label}
                    </ThemedText>
                    <ThemedText
                      className={`mt-0.5 ${isActive ? '!text-[#527568]' : ''}`}
                      numberOfLines={1}
                      themeColor="textSecondary"
                      type="caption"
                    >
                      {section.description}
                    </ThemedText>
                  </View>
                  {isActive ? <Check color={BrandColors.ink} size={18} strokeWidth={2.8} /> : null}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
