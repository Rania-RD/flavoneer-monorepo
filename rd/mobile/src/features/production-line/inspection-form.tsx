import type {
  ProductionLineCheckKey,
  ProductionLineReadingKey,
} from '@flavoneer/backend/production-line';
import { AlertCircle, Check, CheckCircle2, Minus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { BrandSurface } from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Fonts } from '@/constants/theme';
import type { ProductionLineTranslationKey } from './i18n';

type Translate = (
  key: ProductionLineTranslationKey,
  values?: Record<string, number | string>,
) => string;

interface SpecificationLimit {
  maximum: number;
  minimum: number;
  minimumReadingCount: number;
  readingKey: ProductionLineReadingKey;
  target?: number;
  unit: 'g' | 'kg' | 'mg' | '°C';
}

interface SavedReading {
  maximum: number;
  minimum: number;
  readingIndex: number;
  readingKey: ProductionLineReadingKey;
  target?: number;
  unit: 'g' | 'kg' | 'mg' | '°C';
  value: number;
  withinLimit: boolean;
}

interface SavedCheck {
  checked: boolean;
  checkKey: ProductionLineCheckKey;
}

const readingLabels = {
  additive_weight: 'additiveWeight',
  carton_weight: 'cartonWeight',
  chocolate_temperature: 'chocolateTemperature',
  coated_piece_weight: 'coatedPieceWeight',
  pour_weight: 'pourWeight',
} as const satisfies Record<ProductionLineReadingKey, ProductionLineTranslationKey>;

const checkLabels = {
  sealing_machine: 'checkSealingMachine',
  production_date: 'checkProductionDate',
  batch_number: 'checkBatchNumber',
  weight_or_volume: 'checkWeightOrVolume',
  chocolate_weight: 'checkChocolateWeight',
  packaging: 'checkPackaging',
  product_shape: 'checkProductShape',
  raw_materials: 'checkRawMaterials',
  count: 'checkCount',
  taste: 'checkTaste',
  floors: 'checkFloors',
  orderliness: 'checkOrderliness',
  personal_hygiene: 'checkPersonalHygiene',
  work_clothes: 'checkWorkClothes',
  waste: 'checkWaste',
  occupational_safety: 'checkOccupationalSafety',
  washbasins: 'checkWashbasins',
  cleaning_materials: 'checkCleaningMaterials',
  walls_and_ceilings: 'checkWallsCeilings',
  gloves: 'checkGloves',
  machinery_and_equipment: 'checkMachineryEquipment',
  maintenance_equipment: 'checkMaintenanceEquipment',
} as const satisfies Record<ProductionLineCheckKey, ProductionLineTranslationKey>;

const checkGroups: {
  label: ProductionLineTranslationKey;
  keys: ProductionLineCheckKey[];
}[] = [
  {
    label: 'complianceProductPackaging',
    keys: [
      'sealing_machine',
      'production_date',
      'batch_number',
      'weight_or_volume',
      'chocolate_weight',
      'packaging',
      'product_shape',
    ],
  },
  {
    label: 'complianceMaterialsPeople',
    keys: [
      'raw_materials',
      'count',
      'taste',
      'floors',
      'orderliness',
      'personal_hygiene',
      'work_clothes',
    ],
  },
  {
    label: 'complianceEnvironmentSafety',
    keys: [
      'waste',
      'occupational_safety',
      'washbasins',
      'cleaning_materials',
      'walls_and_ceilings',
      'gloves',
      'machinery_and_equipment',
    ],
  },
  { label: 'complianceMaintenance', keys: ['maintenance_equipment'] },
];

const totalCheckCount = checkGroups.reduce((total, group) => total + group.keys.length, 0);

export function MeasurementSection({
  disabled,
  isRTL,
  limits,
  onSave,
  readings,
  t,
}: {
  disabled: boolean;
  isRTL: boolean;
  limits: SpecificationLimit[];
  onSave: (
    readingKey: ProductionLineReadingKey,
    readingIndex: number,
    value: number | null,
  ) => Promise<void>;
  readings: SavedReading[];
  t: Translate;
}) {
  return (
    <BrandSurface className="mb-7 !p-0">
      <View className="border-[#1C4A3C]/10 border-b px-6 pb-5 pt-6 dark:border-[#D2F2D4]/10">
        <ThemedText themeColor="textSecondary" type="overline">
          {t('measurements')}
        </ThemedText>
        <ThemedText className="mt-2" themeColor="textSecondary" type="small">
          {t('measurementHelp')}
        </ThemedText>
      </View>

      {limits.map((limit, limitIndex) => {
        const limitReadings = readings.filter((reading) => reading.readingKey === limit.readingKey);
        const requiredCount = Math.min(100, Math.max(1, limit.minimumReadingCount));
        return (
          <View
            className={
              limitIndex < limits.length - 1
                ? 'border-[#1C4A3C]/10 border-b dark:border-[#D2F2D4]/10'
                : ''
            }
            key={limit.readingKey}
          >
            <View className="flex-row items-start justify-between gap-4 px-6 pb-3 pt-5">
              <View className="min-w-0 flex-1">
                <ThemedText type="smallBold">{t(readingLabels[limit.readingKey])}</ThemedText>
                <ThemedText className="mt-1" themeColor="textSecondary" type="caption">
                  {t('acceptableRange', {
                    maximum: limit.maximum,
                    minimum: limit.minimum,
                    unit: limit.unit,
                  })}
                </ThemedText>
              </View>
              <View className="rounded-full bg-[#EEF8EB] px-3 py-2 dark:bg-[#285B4D]">
                <ThemedText themeColor="textSecondary" type="caption">
                  {t('readingsCompleted', {
                    completed: limitReadings.length,
                    required: requiredCount,
                  })}
                </ThemedText>
              </View>
            </View>

            <View className="gap-3 px-6 pb-6">
              {Array.from({ length: requiredCount }, (_, index) => {
                const readingIndex = index + 1;
                const reading = limitReadings.find(
                  (candidate) => candidate.readingIndex === readingIndex,
                );
                return (
                  <ReadingInput
                    disabled={disabled}
                    isRTL={isRTL}
                    key={`${limit.readingKey}-${readingIndex}-${reading?.value ?? 'empty'}`}
                    limit={limit}
                    onSave={(value) => onSave(limit.readingKey, readingIndex, value)}
                    reading={reading}
                    readingIndex={readingIndex}
                    t={t}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </BrandSurface>
  );
}

function ReadingInput({
  disabled,
  isRTL,
  limit,
  onSave,
  reading,
  readingIndex,
  t,
}: {
  disabled: boolean;
  isRTL: boolean;
  limit: SpecificationLimit;
  onSave: (value: number | null) => Promise<void>;
  reading?: SavedReading;
  readingIndex: number;
  t: Translate;
}) {
  const savedDraft = reading ? String(reading.value) : '';
  const [draft, setDraft] = useState(savedDraft);
  const [inputState, setInputState] = useState<'idle' | 'invalid' | 'saving'>('idle');
  const committedDraft = useRef(savedDraft);

  const saveDraft = async () => {
    if (disabled || inputState === 'saving') {
      return;
    }
    const parsed = parseLocalizedNumber(draft);
    if (draft.trim() && parsed === null) {
      setInputState('invalid');
      return;
    }
    const canonicalDraft = parsed === null ? '' : String(parsed);
    if (canonicalDraft === committedDraft.current) {
      return;
    }
    const previousCommittedDraft = committedDraft.current;
    committedDraft.current = canonicalDraft;
    setInputState('saving');
    try {
      await onSave(parsed);
      setDraft(canonicalDraft);
      setInputState('idle');
    } catch {
      committedDraft.current = previousCommittedDraft;
      setInputState('invalid');
    }
  };

  const withinLimit = reading?.withinLimit;
  const toneClass =
    inputState === 'invalid' || withinLimit === false
      ? 'border-[#A43434]/40 bg-[#FFF0ED] dark:border-[#FFB8AD]/35 dark:bg-[#A43434]/15'
      : withinLimit
        ? 'border-[#247A51]/30 bg-[#E8F7ED] dark:border-[#9BE0B8]/25 dark:bg-[#247A51]/15'
        : 'border-[#1C4A3C]/12 bg-[#EEF8EB] dark:border-[#D2F2D4]/10 dark:bg-[#285B4D]';

  return (
    <View>
      <ThemedText className="mb-1.5" themeColor="textSecondary" type="caption">
        {t('readingNumber', { number: readingIndex })}
      </ThemedText>
      <View
        className={`min-h-[56px] flex-row items-center rounded-[18px] border px-4 ${toneClass}`}
      >
        <TextInput
          accessibilityLabel={`${t(readingLabels[limit.readingKey])}, ${t('readingNumber', { number: readingIndex })}`}
          className="min-w-0 flex-1 py-3 text-lg text-[#173E33] dark:text-[#F7F4DF]"
          editable={!disabled && inputState !== 'saving'}
          inputMode="decimal"
          keyboardType="decimal-pad"
          onBlur={saveDraft}
          onChangeText={(value) => {
            setDraft(value);
            setInputState('idle');
          }}
          placeholder={t('readingValue')}
          placeholderTextColor="#789489"
          returnKeyType="done"
          style={{
            fontFamily: Fonts.mono,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: 'ltr',
          }}
          value={draft}
        />
        <ThemedText className="ms-3" themeColor="textSecondary" type="smallBold">
          {limit.unit}
        </ThemedText>
        {inputState === 'saving' ? (
          <ActivityIndicator className="ms-2" color={BrandColors.forest} size="small" />
        ) : withinLimit ? (
          <CheckCircle2 className="ms-2" color="#247A51" size={18} />
        ) : withinLimit === false || inputState === 'invalid' ? (
          <AlertCircle className="ms-2" color="#A43434" size={18} />
        ) : null}
      </View>
      {reading ? (
        <ThemedText
          className={`mt-1.5 ${reading.withinLimit ? '!text-[#247A51]' : '!text-[#A43434]'}`}
          type="caption"
        >
          {reading.withinLimit ? t('withinRange') : t('outsideRange')}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function ComplianceSection({
  checks,
  disabled,
  onToggle,
  onToggleGroup,
  t,
}: {
  checks: SavedCheck[];
  disabled: boolean;
  onToggle: (checkKey: ProductionLineCheckKey, checked: boolean) => Promise<void>;
  onToggleGroup: (checkKeys: ProductionLineCheckKey[], checked: boolean) => Promise<void>;
  t: Translate;
}) {
  const [pendingKeys, setPendingKeys] = useState<Set<ProductionLineCheckKey>>(() => new Set());
  const [failedKeys, setFailedKeys] = useState<Set<ProductionLineCheckKey>>(() => new Set());
  const checkedKeys = new Set(
    checks.filter((check) => check.checked).map((check) => check.checkKey),
  );

  const toggle = async (checkKey: ProductionLineCheckKey) => {
    if (disabled || pendingKeys.has(checkKey)) {
      return;
    }
    setPendingKeys((current) => new Set(current).add(checkKey));
    setFailedKeys((current) => {
      const next = new Set(current);
      next.delete(checkKey);
      return next;
    });
    try {
      await onToggle(checkKey, !checkedKeys.has(checkKey));
    } catch {
      setFailedKeys((current) => new Set(current).add(checkKey));
    } finally {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(checkKey);
        return next;
      });
    }
  };

  const toggleGroup = async (group: (typeof checkGroups)[number]) => {
    if (disabled || group.keys.some((checkKey) => pendingKeys.has(checkKey))) {
      return;
    }
    const allChecked = group.keys.every((checkKey) => checkedKeys.has(checkKey));
    setPendingKeys((current) => new Set([...current, ...group.keys]));
    setFailedKeys((current) => {
      const next = new Set(current);
      for (const checkKey of group.keys) {
        next.delete(checkKey);
      }
      return next;
    });
    try {
      await onToggleGroup(group.keys, !allChecked);
    } catch {
      setFailedKeys((current) => new Set([...current, ...group.keys]));
    } finally {
      setPendingKeys((current) => {
        const next = new Set(current);
        for (const checkKey of group.keys) {
          next.delete(checkKey);
        }
        return next;
      });
    }
  };

  return (
    <BrandSurface className="mb-7 !p-0">
      <View className="border-[#1C4A3C]/10 border-b px-6 pb-5 pt-6 dark:border-[#D2F2D4]/10">
        <View className="flex-row items-center justify-between gap-4">
          <ThemedText themeColor="textSecondary" type="overline">
            {t('complianceChecks')}
          </ThemedText>
          <View className="rounded-full bg-[#EEF8EB] px-3 py-2 dark:bg-[#285B4D]">
            <ThemedText themeColor="textSecondary" type="caption">
              {t('complianceCompleted', { completed: checkedKeys.size, total: totalCheckCount })}
            </ThemedText>
          </View>
        </View>
        <ThemedText className="mt-2" themeColor="textSecondary" type="small">
          {t('complianceHelp')}
        </ThemedText>
      </View>

      {checkGroups.map((group, groupIndex) => {
        const checkedCount = group.keys.filter((checkKey) => checkedKeys.has(checkKey)).length;
        const allChecked = checkedCount === group.keys.length;
        const someChecked = checkedCount > 0 && !allChecked;
        const groupPending = group.keys.some((checkKey) => pendingKeys.has(checkKey));
        const groupFailed = group.keys.some((checkKey) => failedKeys.has(checkKey));
        const actionLabel = allChecked ? t('clearAll') : t('selectAll');
        return (
          <View
            className={
              groupIndex < checkGroups.length - 1
                ? 'border-[#1C4A3C]/10 border-b dark:border-[#D2F2D4]/10'
                : ''
            }
            key={group.label}
          >
            <View className="flex-row items-center justify-between gap-3 px-6 pb-2 pt-5">
              <ThemedText className="min-w-0 flex-1" type="smallBold">
                {t(group.label)}
              </ThemedText>
              <Pressable
                accessibilityLabel={`${t(group.label)}: ${actionLabel}`}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: allChecked ? true : someChecked ? 'mixed' : false,
                  disabled: disabled || groupPending,
                }}
                className={`min-h-[40px] flex-row items-center gap-2 rounded-[14px] px-2 active:bg-[#EEF8EB] dark:active:bg-[#285B4D] ${disabled ? 'opacity-50' : ''}`}
                disabled={disabled || groupPending}
                onPress={() => toggleGroup(group)}
              >
                <View
                  className={`size-6 items-center justify-center rounded-[8px] border ${
                    allChecked || someChecked
                      ? 'border-[#1C4A3C] bg-[#1C4A3C] dark:border-[#F5A623] dark:bg-[#F5A623]'
                      : 'border-[#1C4A3C]/20 bg-transparent dark:border-[#D2F2D4]/20'
                  }`}
                >
                  {allChecked ? (
                    <Check color="white" size={15} />
                  ) : someChecked ? (
                    <Minus color="white" size={15} />
                  ) : null}
                </View>
                <ThemedText themeColor="textSecondary" type="caption">
                  {actionLabel}
                </ThemedText>
                {groupPending ? (
                  <ActivityIndicator color={BrandColors.forest} size="small" />
                ) : groupFailed ? (
                  <AlertCircle color="#A43434" size={16} />
                ) : null}
              </Pressable>
            </View>
            <View className="px-4 pb-4">
              {group.keys.map((checkKey) => {
                const checked = checkedKeys.has(checkKey);
                const pending = pendingKeys.has(checkKey);
                const failed = failedKeys.has(checkKey);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked,
                      disabled: disabled || pending,
                    }}
                    className={`min-h-[52px] flex-row items-center gap-3 rounded-[16px] px-3 active:bg-[#EEF8EB] dark:active:bg-[#285B4D] ${disabled ? 'opacity-50' : ''}`}
                    disabled={disabled || pending}
                    key={checkKey}
                    onPress={() => toggle(checkKey)}
                  >
                    <View
                      className={`size-7 items-center justify-center rounded-[9px] border ${
                        checked
                          ? 'border-[#1C4A3C] bg-[#1C4A3C] dark:border-[#F5A623] dark:bg-[#F5A623]'
                          : 'border-[#1C4A3C]/20 bg-transparent dark:border-[#D2F2D4]/20'
                      }`}
                    >
                      {checked ? <Check color="white" size={17} /> : null}
                    </View>
                    <ThemedText className="min-w-0 flex-1" type="small">
                      {t(checkLabels[checkKey])}
                    </ThemedText>
                    {pending ? (
                      <ActivityIndicator color={BrandColors.forest} size="small" />
                    ) : failed ? (
                      <AlertCircle color="#A43434" size={18} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </BrandSurface>
  );
}

function parseLocalizedNumber(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٬\s]/g, '')
    .replace(/[٫,]/g, '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
