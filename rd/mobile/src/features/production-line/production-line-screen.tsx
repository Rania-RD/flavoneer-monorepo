import type { Id } from '@flavoneer/backend/data-model';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import {
  BrandEntrance,
  BrandHeader,
  BrandScreen,
  BrandSurface,
  StatusPill,
} from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { Image } from '@/components/ui/image';
import { UserAvatar } from '@/components/user-avatar';
import { BrandColors, Fonts } from '@/constants/theme';
import { useOrganization } from '@/contexts/organization-context';
import { useProductionLineI18n } from '@/features/production-line/i18n';
import { api, authClient } from '@/lib/backend';

type HallCode = 'A' | 'B';

const statusKeys = {
  approved: 'approved',
  draft: 'draft',
  pending_production_review: 'pendingReview',
  returned: 'returned',
} as const;

export default function ProductionLineScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { activeOrganizationId } = useOrganization();
  const { isRTL, language, t } = useProductionLineI18n();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const createDraft = useMutation(api.productionLineRecords.createDraft);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedHallCode, setSelectedHallCode] = useState<HallCode | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<Id<'projects'> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createFailed, setCreateFailed] = useState(false);

  useEffect(() => {
    syncCurrentUser().catch(() => undefined);
  }, [syncCurrentUser]);

  const referenceData = useQuery(
    api.productionLineRecords.getMobileReferenceData,
    activeOrganizationId ? { organizationId: activeOrganizationId } : 'skip',
  );
  const records = useQuery(
    api.productionLineRecords.listMine,
    activeOrganizationId ? { organizationId: activeOrganizationId } : 'skip',
  );

  const hallCode =
    selectedHallCode && referenceData?.enabledHallCodes.includes(selectedHallCode)
      ? selectedHallCode
      : (referenceData?.enabledHallCodes[0] ?? 'A');
  const productId =
    selectedProductId &&
    referenceData?.products.some((product) => product.productId === selectedProductId)
      ? selectedProductId
      : (referenceData?.products[0]?.productId ?? null);

  const currentHour = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ar' ? 'ar-PS' : 'en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
    [language],
  );

  const handleCreate = async () => {
    if (!(activeOrganizationId && productId && departmentName.trim())) {
      return;
    }
    setIsCreating(true);
    setCreateFailed(false);
    try {
      const recordId = await createDraft({
        organizationId: activeOrganizationId,
        productionHallCode: hallCode,
        departmentName: departmentName.trim(),
        productId,
        inspectionAt: Date.now(),
      });
      router.push(`/quality/production-line/${recordId}`);
    } catch {
      setCreateFailed(true);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BrandScreen>
      <View style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <BrandEntrance>
          <BrandHeader
            action={
              <Pressable
                accessibilityLabel={t('accountSettings')}
                accessibilityRole="button"
                className="size-11 items-center justify-center rounded-full active:scale-95 active:opacity-70"
                onPress={() => router.navigate('/user-settings')}
              >
                <UserAvatar
                  name={session?.user.name || session?.user.email}
                  seed={session?.user.email}
                  size={44}
                />
              </Pressable>
            }
            subtitle={t('qualityControl')}
          />
        </BrandEntrance>

        <BrandEntrance className="mb-7" delay={70}>
          <ThemedText themeColor="textSecondary" type="overline">
            {t('hourlyInspections')}
          </ThemedText>
          <ThemedText className="mt-2 max-w-[390px]" type="title">
            {t('productionMonitoring')}
          </ThemedText>
          <View className="mt-4 flex-row flex-wrap items-center gap-2">
            <StatusPill>{t('workspaceOnline')}</StatusPill>
            <View className="rounded-full border border-[#1C4A3C]/10 bg-[#FFFDF4]/80 px-3.5 py-2 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]">
              <ThemedText themeColor="textSecondary" type="caption">
                {currentHour}
              </ThemedText>
            </View>
          </View>
        </BrandEntrance>

        <BrandEntrance delay={140}>
          <View className="relative mb-8 overflow-hidden rounded-[40px] bg-[#1C4A3C] p-7 dark:bg-[#102F27]">
            <View className="absolute -end-16 -top-20 size-52 rounded-full border-[36px] border-[#F5A623]/15" />
            <View className="mb-10 size-14 items-center justify-center rounded-[19px] bg-[#F5A623]">
              <Factory color={BrandColors.ink} size={27} />
            </View>
            <ThemedText className="!text-[#B9D8C8]" type="overline">
              {t('currentHour')}
            </ThemedText>
            <ThemedText className="mt-2 max-w-[280px] !text-[#FFFDF4]" type="display">
              {t('newInspection')}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              className="mt-7 min-h-[56px] flex-row items-center justify-center gap-2 rounded-[19px] bg-[#F5A623] px-5 active:scale-[0.98]"
              onPress={() => setShowCreate((value) => !value)}
            >
              {showCreate ? (
                <ThemedText className="!text-[#173E33]" type="smallBold">
                  {t('close')}
                </ThemedText>
              ) : (
                <>
                  <Plus color={BrandColors.ink} size={20} />
                  <ThemedText className="!text-[#173E33]" type="smallBold">
                    {t('newInspection')}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </BrandEntrance>

        {showCreate ? (
          <BrandEntrance delay={20}>
            <BrandSurface className="mb-8 gap-6">
              {!activeOrganizationId ? (
                <SetupMessage
                  icon={<ShieldCheck color="#8A5811" size={22} />}
                  text={t('noOrganization')}
                />
              ) : referenceData === undefined ? (
                <ActivityIndicator color={BrandColors.forest} />
              ) : referenceData === null ? (
                <SetupMessage
                  detail={t('configurationHelp')}
                  icon={<ShieldCheck color="#8A5811" size={22} />}
                  text={t('configurationRequired')}
                />
              ) : referenceData.products.length === 0 ? (
                <SetupMessage
                  detail={t('configurationHelp')}
                  icon={<ShieldCheck color="#8A5811" size={22} />}
                  text={t('noConfiguredProducts')}
                />
              ) : (
                <>
                  <View>
                    <ThemedText themeColor="textSecondary" type="overline">
                      {t('productionHall')}
                    </ThemedText>
                    <View className="mt-3 flex-row gap-3">
                      {referenceData.enabledHallCodes.map((hall) => (
                        <Pressable
                          accessibilityRole="button"
                          className={`min-h-[54px] flex-1 items-center justify-center rounded-[18px] border ${
                            hall === hallCode
                              ? 'border-[#1C4A3C] bg-[#D2F2D4] dark:border-[#F5A623] dark:bg-[#F5A623]'
                              : 'border-[#1C4A3C]/10 bg-[#EEF8EB] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D]'
                          }`}
                          key={hall}
                          onPress={() => setSelectedHallCode(hall)}
                        >
                          <ThemedText type="section">{hall}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <ThemedText themeColor="textSecondary" type="overline">
                      {t('departmentLine')}
                    </ThemedText>
                    <TextInput
                      accessibilityLabel={t('departmentLine')}
                      className="mt-3 min-h-[56px] rounded-[18px] border border-[#1C4A3C]/12 bg-[#EEF8EB] px-4 text-base text-[#173E33] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D] dark:text-[#F7F4DF]"
                      onChangeText={setDepartmentName}
                      placeholder={t('departmentPlaceholder')}
                      placeholderTextColor="#789489"
                      style={{
                        fontFamily: Fonts.sans,
                        textAlign: isRTL ? 'right' : 'left',
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                      }}
                      value={departmentName}
                    />
                  </View>

                  <View>
                    <ThemedText themeColor="textSecondary" type="overline">
                      {t('product')}
                    </ThemedText>
                    <View className="mt-3 gap-2">
                      {referenceData.products.map((product) => (
                        <Pressable
                          accessibilityRole="button"
                          className={`min-h-[64px] flex-row items-center gap-3 rounded-[18px] border p-2 ${
                            product.productId === productId
                              ? 'border-[#1C4A3C] bg-[#D2F2D4] dark:border-[#F5A623] dark:bg-[#F5A623]'
                              : 'border-[#1C4A3C]/10 bg-[#EEF8EB] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D]'
                          }`}
                          key={product.productId}
                          onPress={() => setSelectedProductId(product.productId)}
                        >
                          {product.productPhotoUrl ? (
                            <Image
                              className="size-12 rounded-[14px] bg-[#DDEBE0] dark:bg-[#173E33]"
                              contentFit="cover"
                              source={{ uri: product.productPhotoUrl }}
                              transition={150}
                            />
                          ) : null}
                          <ThemedText className="min-w-0 flex-1" numberOfLines={2} type="smallBold">
                            {product.productName}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary" type="caption">
                            {t('version', { version: product.specificationVersion })}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {createFailed ? (
                    <ThemedText className="!text-[#A43434]" type="caption">
                      {t('unexpectedError')}
                    </ThemedText>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    className={`min-h-[56px] flex-row items-center justify-center gap-2 rounded-[19px] bg-[#1C4A3C] active:scale-[0.98] dark:bg-[#F5A623] ${
                      !departmentName.trim() || isCreating ? 'opacity-50' : ''
                    }`}
                    disabled={!departmentName.trim() || isCreating}
                    onPress={handleCreate}
                  >
                    {isCreating ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <ArrowUpRight
                        color="white"
                        size={19}
                        style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                      />
                    )}
                    <ThemedText className="!text-white dark:!text-[#173E33]" type="smallBold">
                      {isCreating ? t('creatingDraft') : t('createDraft')}
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </BrandSurface>
          </BrandEntrance>
        ) : null}

        <BrandEntrance className="mb-3 flex-row items-end justify-between px-1" delay={220}>
          <View>
            <ThemedText themeColor="textSecondary" type="overline">
              {t('qualityControl')}
            </ThemedText>
            <ThemedText className="mt-1" type="section">
              {t('recentRecords')}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" type="caption">
            {records?.length ?? 0}
          </ThemedText>
        </BrandEntrance>

        <BrandEntrance delay={270}>
          <BrandSurface className="mb-8 !p-0">
            {records === undefined ? (
              <ActivityIndicator className="my-8" color={BrandColors.forest} />
            ) : records.length === 0 ? (
              <View className="items-center gap-3 px-6 py-10">
                <ClipboardCheck color={BrandColors.copy} size={30} />
                <ThemedText className="text-center" themeColor="textSecondary" type="small">
                  {t('noRecords')}
                </ThemedText>
              </View>
            ) : (
              records.map((record, index) => (
                <View key={record._id}>
                  <Pressable
                    accessibilityLabel={`${t('openRecord')} ${record.displaySerial}`}
                    accessibilityRole="button"
                    className="flex-row items-center gap-4 px-5 py-5 active:bg-[#D2F2D4]/35 dark:active:bg-[#D2F2D4]/10"
                    onPress={() => router.push(`/quality/production-line/${record._id}`)}
                  >
                    <View className="size-12 items-center justify-center rounded-[17px] bg-[#D2F2D4]">
                      <ThemedText className="!text-[#173E33]" type="smallBold">
                        {record.productionHallCode}
                      </ThemedText>
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <ThemedText numberOfLines={1} type="smallBold">
                          {record.displaySerial}
                        </ThemedText>
                        <View className="rounded-full bg-[#EEF8EB] px-2 py-1 dark:bg-[#285B4D]">
                          <ThemedText className="text-[10px] leading-3" type="smallBold">
                            {t(statusKeys[record.status as keyof typeof statusKeys] ?? 'draft')}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText
                        className="mt-1"
                        numberOfLines={1}
                        themeColor="textSecondary"
                        type="caption"
                      >
                        {record.productName} ·{' '}
                        {new Intl.DateTimeFormat(language === 'ar' ? 'ar-PS' : 'en', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(record.inspectionAt)}
                      </ThemedText>
                    </View>
                    <ChevronRight
                      color={BrandColors.copy}
                      size={19}
                      style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                    />
                  </Pressable>
                  {index < records.length - 1 ? (
                    <View className="ms-[84px] h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
                  ) : null}
                </View>
              ))
            )}
          </BrandSurface>
        </BrandEntrance>
      </View>
    </BrandScreen>
  );
}

function SetupMessage({
  detail,
  icon,
  text,
}: {
  detail?: string;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <View className="gap-4">
      <View className="size-12 items-center justify-center rounded-[17px] bg-[#FFF0C7]">
        {icon}
      </View>
      <ThemedText type="smallBold">{text}</ThemedText>
      {detail ? (
        <ThemedText themeColor="textSecondary" type="small">
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}
