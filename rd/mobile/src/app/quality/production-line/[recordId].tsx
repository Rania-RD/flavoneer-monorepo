import type { Id } from '@flavoneer/backend/data-model';
import {
  getProductionLineSubmissionReadiness,
  type ProductionLineCheckKey,
  type ProductionLineReadingKey,
} from '@flavoneer/backend/production-line';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from 'convex/react';
import { useNetworkState } from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Factory,
  RefreshCw,
  Save,
  Send,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandEntrance, BrandHeader, BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from '@/components/ui/image';
import { BrandColors, Fonts } from '@/constants/theme';
import { BatchLabelCamera } from '@/features/production-line/components/batch-label-camera';
import {
  type ProductionLineTranslationKey,
  useProductionLineI18n,
} from '@/features/production-line/i18n';
import { ComplianceSection, MeasurementSection } from '@/features/production-line/inspection-form';
import {
  BatchLabelPhotoUploadError,
  uploadBatchLabelPhoto,
} from '@/features/production-line/photo-upload';
import { api } from '@/lib/backend';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type SaveAction = 'check' | 'code' | 'photo' | 'reading' | 'submit';

export default function ProductionLineRecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recordId?: string }>();
  const recordId = params.recordId as Id<'productionLineRecords'> | undefined;
  const { isRTL, language, t } = useProductionLineI18n();
  const network = useNetworkState();
  const isConnected = network.isConnected !== false && network.isInternetReachable !== false;
  const record = useQuery(api.productionLineRecords.get, recordId ? { recordId } : 'skip');
  const generatePhotoUploadUrl = useMutation(api.productionLineRecords.generatePhotoUploadUrl);
  const attachBatchLabelPhoto = useMutation(api.productionLineRecords.attachBatchLabelPhoto);
  const updateBatchLabelCode = useMutation(api.productionLineRecords.updateBatchLabelCode);
  const saveReading = useMutation(api.productionLineRecords.saveReading);
  const updateComplianceCheck = useMutation(api.productionLineRecords.updateComplianceCheck);
  const updateComplianceChecks = useMutation(api.productionLineRecords.updateComplianceChecks);
  const submitRecordForReview = useMutation(api.productionLineRecords.submitForReview);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [batchCodeDraft, setBatchCodeDraft] = useState<string | null>(null);
  const [matchesPhotoDraft, setMatchesPhotoDraft] = useState<boolean | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<SaveAction | null>(null);
  const retryFormAction = useRef<(() => void) | null>(null);

  const batchCode = batchCodeDraft ?? record?.printedBatchCode ?? '';
  const matchesPhoto = matchesPhotoDraft ?? Boolean(record?.batchLabelConfirmedAt);
  const isEditable = Boolean(record && ['draft', 'returned'].includes(record.status));
  const displayedSaveState =
    saveState === 'idle' && batchCodeDraft === null && record?.batchLabelConfirmedAt
      ? 'saved'
      : saveState;

  const formattedInspection = useMemo(
    () =>
      record
        ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-PS' : 'en', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(record.inspectionAt)
        : '',
    [language, record],
  );

  const uploadPhoto = async (uri: string) => {
    if (!(recordId && isConnected && isEditable)) {
      return;
    }
    setPendingPhotoUri(uri);
    setLastAction('photo');
    setSaveState('saving');
    try {
      const storageId = await uploadBatchLabelPhoto(uri, () =>
        generatePhotoUploadUrl({ recordId }),
      );
      await attachBatchLabelPhoto({
        recordId,
        storageId: storageId as Id<'_storage'>,
        capturedAt: Date.now(),
      });
      setMatchesPhotoDraft(false);
      setPendingPhotoUri(null);
      retryFormAction.current = null;
      setSaveState('saved');
      setCameraVisible(false);
    } catch (error) {
      reportSaveFailure({
        action: 'photo',
        error,
        phase: error instanceof BatchLabelPhotoUploadError ? error.phase : 'attach-photo-to-record',
        recordId,
      });
      setSaveState('failed');
      setCameraVisible(false);
    }
  };

  const confirmCode = async () => {
    if (!(recordId && batchCode.trim() && matchesPhoto && isConnected && isEditable)) {
      return;
    }
    setLastAction('code');
    setSaveState('saving');
    try {
      await updateBatchLabelCode({
        recordId,
        printedBatchCode: batchCode,
        confirmed: true,
      });
      retryFormAction.current = null;
      setSaveState('saved');
    } catch (error) {
      reportSaveFailure({ action: 'code', error, phase: 'confirm-batch-code', recordId });
      setSaveState('failed');
    }
  };

  const retry = () => {
    if (lastAction === 'photo' && pendingPhotoUri) {
      uploadPhoto(pendingPhotoUri);
    } else if (lastAction === 'code') {
      confirmCode();
    } else {
      retryFormAction.current?.();
    }
  };

  const saveMeasurement = async (
    readingKey: ProductionLineReadingKey,
    readingIndex: number,
    value: number | null,
  ) => {
    if (!(recordId && isConnected && isEditable)) {
      return;
    }
    retryFormAction.current = () => {
      void saveMeasurement(readingKey, readingIndex, value);
    };
    setLastAction('reading');
    setSaveState('saving');
    try {
      await saveReading({ recordId, readingKey, readingIndex, value });
      retryFormAction.current = null;
      setSaveState('saved');
    } catch (error) {
      reportSaveFailure({ action: 'reading', error, phase: 'save-reading', recordId });
      setSaveState('failed');
      throw error;
    }
  };

  const setComplianceChecks = async (checkKeys: ProductionLineCheckKey[], checked: boolean) => {
    if (!(recordId && isConnected && isEditable)) {
      return;
    }
    retryFormAction.current = () => {
      void setComplianceChecks(checkKeys, checked);
    };
    setLastAction('check');
    setSaveState('saving');
    try {
      if (checkKeys.length === 1) {
        await updateComplianceCheck({ recordId, checkKey: checkKeys[0], checked });
      } else {
        await updateComplianceChecks({ recordId, checkKeys, checked });
      }
      retryFormAction.current = null;
      setSaveState('saved');
    } catch (error) {
      reportSaveFailure({ action: 'check', error, phase: 'save-compliance-check', recordId });
      setSaveState('failed');
      throw error;
    }
  };

  if (record === undefined) {
    return (
      <ThemedView className="flex-1 items-center justify-center">
        <ActivityIndicator color={BrandColors.forest} size="large" />
      </ThemedView>
    );
  }

  if (!record) {
    return (
      <ThemedView className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center gap-5 px-8">
          <ThemedText className="text-center" type="section">
            {t('recordNotFound')}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            className="min-h-[52px] justify-center rounded-[18px] bg-[#1C4A3C] px-6"
            onPress={() => router.back()}
          >
            <ThemedText className="!text-white" type="smallBold">
              {t('back')}
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const confirmed = Boolean(record.batchLabelConfirmedAt);
  const submissionReadiness = getProductionLineSubmissionReadiness({
    checks: record.checks,
    hasBatchLabelPhoto: Boolean(record.batchLabelPhotoUrl),
    hasConfirmedBatchCode: Boolean(record.printedBatchCode && record.batchLabelConfirmedAt),
    limits: record.specificationLimits,
    readings: record.readings,
  });

  const submitForReview = async () => {
    if (!(recordId && isConnected && isEditable && submissionReadiness.isReady)) {
      return;
    }
    retryFormAction.current = () => {
      void submitForReview();
    };
    setLastAction('submit');
    setSaveState('saving');
    try {
      await submitRecordForReview({ recordId });
      retryFormAction.current = null;
      setSaveState('saved');
    } catch (error) {
      reportSaveFailure({ action: 'submit', error, phase: 'submit-for-review', recordId });
      setSaveState('failed');
    }
  };

  return (
    <ThemedView className="flex-1 overflow-hidden">
      <View className="pointer-events-none absolute -start-28 -top-24 size-72 rounded-full bg-[#D2F2D4]/80 dark:bg-[#285B4D]/35" />
      <View className="pointer-events-none absolute -end-24 top-[28%] size-64 rounded-full bg-[#F5A623]/10" />
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <View
          className="mx-auto w-full max-w-[800px] px-5 pb-3 pt-3"
          style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        >
          <BrandEntrance>
            <BrandHeader
              action={
                <Pressable
                  accessibilityLabel={t('back')}
                  accessibilityRole="button"
                  className="size-11 items-center justify-center rounded-full border border-[#1C4A3C]/10 bg-[#FFFDF4] active:scale-95 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]"
                  onPress={() => router.back()}
                >
                  <ArrowLeft
                    color={BrandColors.forest}
                    size={20}
                    style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                  />
                </Pressable>
              }
              className="mb-3"
              subtitle={t('qualityControl')}
            />
          </BrandEntrance>
          <View className="mb-2 flex-row items-center justify-between gap-3 px-1">
            <ThemedText themeColor="textSecondary" type="overline">
              {t('serial')}
            </ThemedText>
            <ThemedText type="smallBold">{record.displaySerial}</ThemedText>
          </View>
          <SaveStatusBar
            connected={isConnected}
            onRetry={retry}
            saveState={displayedSaveState}
            t={t}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-[800px] px-5 pb-12 pt-3"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <BrandEntrance>
              <View className="relative mb-7 overflow-hidden rounded-[36px] bg-[#1C4A3C] p-6 dark:bg-[#102F27]">
                <View className="absolute -end-14 -top-16 size-44 rounded-full border-[30px] border-[#F5A623]/15" />
                <View className="mb-7 size-12 items-center justify-center rounded-[17px] bg-[#F5A623]">
                  <Factory color={BrandColors.ink} size={23} />
                </View>
                <ThemedText className="!text-[#B9D8C8]" type="overline">
                  {t('inspectionContext')}
                </ThemedText>
                <ThemedText className="mt-2 !text-[#FFFDF4]" type="display">
                  {record.productName}
                </ThemedText>
                <View className="mt-5 flex-row flex-wrap gap-2">
                  <ContextPill text={`${t('productionHall')} ${record.productionHallCode}`} />
                  <ContextPill text={record.departmentName} />
                  <ContextPill text={formattedInspection} />
                </View>
              </View>
            </BrandEntrance>

            <BrandEntrance delay={80}>
              <BrandSurface className="mb-7 gap-5">
                <View>
                  <ThemedText themeColor="textSecondary" type="overline">
                    {t('cartonLabel')}
                  </ThemedText>
                  <ThemedText className="mt-2" themeColor="textSecondary" type="small">
                    {t('cartonLabelHelp')}
                  </ThemedText>
                </View>

                {record.batchLabelPhotoUrl ? (
                  <View className="overflow-hidden rounded-[24px] bg-[#102F27]">
                    <Image
                      accessibilityLabel={t('cartonLabel')}
                      className="aspect-[4/3] w-full"
                      contentFit="cover"
                      source={{ uri: record.batchLabelPhotoUrl }}
                    />
                  </View>
                ) : (
                  <View className="aspect-[4/3] items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-[#1C4A3C]/15 bg-[#EEF8EB] dark:border-[#D2F2D4]/15 dark:bg-[#285B4D]">
                    <Camera color={BrandColors.copy} size={32} />
                    <ThemedText themeColor="textSecondary" type="caption">
                      {t('evidencePending')}
                    </ThemedText>
                  </View>
                )}

                <Pressable
                  accessibilityRole="button"
                  className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-[18px] border border-[#1C4A3C]/12 bg-[#EEF8EB] active:scale-[0.98] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D] ${
                    !isConnected || !isEditable || saveState === 'saving' ? 'opacity-50' : ''
                  }`}
                  disabled={!isConnected || !isEditable || saveState === 'saving'}
                  onPress={() => setCameraVisible(true)}
                >
                  <Camera color={BrandColors.forest} size={19} />
                  <ThemedText type="smallBold">
                    {record.batchLabelPhotoUrl ? t('replaceLabel') : t('captureLabel')}
                  </ThemedText>
                </Pressable>

                {record.batchLabelPhotoUrl ? (
                  <View className="gap-4 border-t border-[#1C4A3C]/10 pt-5 dark:border-[#D2F2D4]/10">
                    <View>
                      <ThemedText themeColor="textSecondary" type="overline">
                        {t('printedBatchCode')}
                      </ThemedText>
                      <TextInput
                        accessibilityLabel={t('printedBatchCode')}
                        autoCapitalize="characters"
                        className="mt-3 min-h-[58px] rounded-[18px] border border-[#1C4A3C]/12 bg-[#EEF8EB] px-4 text-lg text-[#173E33] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D] dark:text-[#F7F4DF]"
                        editable={isEditable && saveState !== 'saving'}
                        keyboardType="numbers-and-punctuation"
                        onChangeText={(value) => {
                          setBatchCodeDraft(value);
                          setMatchesPhotoDraft(false);
                          setSaveState('idle');
                        }}
                        placeholder={t('batchCodePlaceholder')}
                        placeholderTextColor="#789489"
                        style={{
                          fontFamily: Fonts.mono,
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                        value={batchCode}
                      />
                      <ThemedText className="mt-2" themeColor="textSecondary" type="caption">
                        {t('batchCodeHelp')}
                      </ThemedText>
                    </View>

                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: matchesPhoto, disabled: !isEditable }}
                      className={`flex-row items-center gap-3 py-1 ${isEditable ? '' : 'opacity-50'}`}
                      disabled={!isEditable}
                      onPress={() => {
                        setMatchesPhotoDraft(!matchesPhoto);
                        setSaveState('idle');
                      }}
                    >
                      <View
                        className={`size-7 items-center justify-center rounded-[9px] border ${
                          matchesPhoto
                            ? 'border-[#1C4A3C] bg-[#1C4A3C] dark:border-[#F5A623] dark:bg-[#F5A623]'
                            : 'border-[#1C4A3C]/20 bg-transparent dark:border-[#D2F2D4]/20'
                        }`}
                      >
                        {matchesPhoto ? <Check color="white" size={17} /> : null}
                      </View>
                      <ThemedText className="min-w-0 flex-1" type="small">
                        {t('confirmMatch')}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      className={`min-h-[56px] flex-row items-center justify-center gap-2 rounded-[19px] bg-[#1C4A3C] active:scale-[0.98] dark:bg-[#F5A623] ${
                        !(batchCode.trim() && matchesPhoto && isConnected && isEditable) ||
                        saveState === 'saving'
                          ? 'opacity-50'
                          : ''
                      }`}
                      disabled={
                        !(batchCode.trim() && matchesPhoto && isConnected && isEditable) ||
                        saveState === 'saving'
                      }
                      onPress={confirmCode}
                    >
                      {saveState === 'saving' && lastAction === 'code' ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <CheckCircle2 color="white" size={19} />
                      )}
                      <ThemedText className="!text-white dark:!text-[#173E33]" type="smallBold">
                        {saveState === 'saving' && lastAction === 'code'
                          ? t('confirmingCode')
                          : t('confirmCode')}
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}

                {confirmed ? (
                  <View className="rounded-[20px] bg-[#E8F7ED] p-4 dark:bg-[#285B4D]">
                    <View className="flex-row items-center gap-2">
                      <CheckCircle2 color="#247A51" size={19} />
                      <ThemedText type="smallBold">{t('confirmedEvidence')}</ThemedText>
                    </View>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      <EvidenceDatum
                        label={t('productionDate')}
                        value={record.labelProductionDate ?? '—'}
                      />
                      <EvidenceDatum
                        label={t('dailySequence')}
                        value={String(record.dailyBatchSequence ?? '—')}
                      />
                    </View>
                  </View>
                ) : null}
              </BrandSurface>
            </BrandEntrance>

            <BrandEntrance delay={150}>
              <MeasurementSection
                disabled={!isConnected || !isEditable}
                isRTL={isRTL}
                limits={record.specificationLimits}
                onSave={saveMeasurement}
                readings={record.readings}
                t={t}
              />
            </BrandEntrance>

            <BrandEntrance delay={210}>
              <ComplianceSection
                checks={record.checks}
                disabled={!isConnected || !isEditable}
                onToggle={(checkKey, checked) => setComplianceChecks([checkKey], checked)}
                onToggleGroup={setComplianceChecks}
                t={t}
              />
            </BrandEntrance>

            <BrandEntrance delay={270}>
              <BrandSurface className="mb-7 gap-5">
                <View>
                  <ThemedText themeColor="textSecondary" type="overline">
                    {t('reviewSubmission')}
                  </ThemedText>
                  <ThemedText className="mt-2" type="section">
                    {isEditable ? t('submitForReview') : t('formLocked')}
                  </ThemedText>
                  <ThemedText className="mt-2" themeColor="textSecondary" type="small">
                    {isEditable ? t('submitForReviewHelp') : t('formLockedHelp')}
                  </ThemedText>
                </View>

                {isEditable ? (
                  <>
                    <View
                      className={`rounded-[18px] p-4 ${
                        submissionReadiness.isReady
                          ? 'bg-[#E8F7ED] dark:bg-[#247A51]/15'
                          : 'bg-[#FFF0C7] dark:bg-[#8A5811]/20'
                      }`}
                    >
                      <ThemedText type="caption">
                        {submissionReadiness.isReady
                          ? t('readyForReview')
                          : t('submissionIncomplete')}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled:
                          !isConnected || !submissionReadiness.isReady || saveState === 'saving',
                      }}
                      className={`min-h-[58px] flex-row items-center justify-center gap-2 rounded-[19px] bg-[#1C4A3C] active:scale-[0.98] dark:bg-[#F5A623] ${
                        !isConnected || !submissionReadiness.isReady || saveState === 'saving'
                          ? 'opacity-50'
                          : ''
                      }`}
                      disabled={
                        !isConnected || !submissionReadiness.isReady || saveState === 'saving'
                      }
                      onPress={submitForReview}
                      testID="submit-production-record-button"
                    >
                      {saveState === 'saving' && lastAction === 'submit' ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Send color="white" size={19} />
                      )}
                      <ThemedText className="!text-white dark:!text-[#173E33]" type="smallBold">
                        {saveState === 'saving' && lastAction === 'submit'
                          ? t('submittingForReview')
                          : t('submitForReview')}
                      </ThemedText>
                    </Pressable>
                  </>
                ) : (
                  <View className="flex-row items-center gap-3 rounded-[18px] bg-[#E8F7ED] p-4 dark:bg-[#247A51]/15">
                    <CheckCircle2 color="#247A51" size={20} />
                    <ThemedText className="min-w-0 flex-1" type="smallBold">
                      {record.status === 'pending_production_review'
                        ? t('submittedForReview')
                        : t('formLocked')}
                    </ThemedText>
                  </View>
                )}
              </BrandSurface>
            </BrandEntrance>
          </View>
        </ScrollView>
      </SafeAreaView>

      <BatchLabelCamera
        onCapture={uploadPhoto}
        onClose={() => setCameraVisible(false)}
        t={t}
        visible={cameraVisible}
      />
    </ThemedView>
  );
}

function reportSaveFailure({
  action,
  error,
  phase,
  recordId,
}: {
  action: SaveAction;
  error: unknown;
  phase: string;
  recordId: Id<'productionLineRecords'>;
}) {
  const exception = error instanceof Error ? error : new Error(String(error));
  console.error(`[production-line] ${action} failed during ${phase}`, exception);
  Sentry.captureException(exception, {
    extra: { recordId },
    tags: {
      feature: 'production-line',
      operation: action,
      phase,
    },
  });
}

function ContextPill({ text }: { text: string }) {
  return (
    <View className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
      <ThemedText className="!text-[#E1EEE6]" type="caption">
        {text}
      </ThemedText>
    </View>
  );
}

function EvidenceDatum({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-full bg-white/70 px-3 py-2 dark:bg-[#173E33]/50">
      <ThemedText type="caption">
        {label}: {value}
      </ThemedText>
    </View>
  );
}

function SaveStatusBar({
  connected,
  onRetry,
  saveState,
  t,
}: {
  connected: boolean;
  onRetry: () => void;
  saveState: SaveState;
  t: (key: ProductionLineTranslationKey) => string;
}) {
  const state = connected ? saveState : 'offline';
  const content = {
    failed: { icon: RefreshCw, label: t('saveFailed'), tone: '#A43434' },
    idle: { icon: ChevronRight, label: t('online'), tone: BrandColors.copy },
    offline: { icon: CloudOff, label: t('connectionRequired'), tone: '#A43434' },
    saved: { icon: CheckCircle2, label: t('saved'), tone: '#247A51' },
    saving: { icon: Save, label: t('saving'), tone: '#8A5811' },
  }[state];
  const Icon = content.icon;

  return (
    <View className="mt-3 flex-row items-center justify-center gap-2 rounded-full border border-[#1C4A3C]/10 bg-[#FFFDF4]/90 px-4 py-2.5 dark:border-[#D2F2D4]/10 dark:bg-[#173E33]">
      <Icon color={content.tone} size={16} />
      <ThemedText style={{ color: content.tone }} type="caption">
        {content.label}
      </ThemedText>
      {state === 'failed' ? (
        <Pressable accessibilityRole="button" className="ms-2" onPress={onRetry}>
          <ThemedText className="!text-[#A43434]" type="smallBold">
            {t('retry')}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
