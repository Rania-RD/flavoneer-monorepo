import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Boxes, FileText, FlaskConical, History, Smartphone } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import {
  BrandEntrance,
  BrandHeader,
  BrandScreen,
  BrandSurface,
  StatusPill,
} from '@/components/brand-screen';
import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';

const workspaceAreas = [
  {
    title: 'Formulations',
    detail: 'Recipes, phases, and controlled versions',
    status: 'Web',
    icon: <FlaskConical color={BrandColors.forest} size={21} />,
    iconBackground: '#D2F2D4',
  },
  {
    title: 'Run history',
    detail: 'Batch execution and sign-off records',
    status: 'Shared',
    icon: <History color="#8A5811" size={21} />,
    iconBackground: '#FFF0C7',
  },
  {
    title: 'Materials',
    detail: 'Ingredient inventory and lot traceability',
    status: 'Web',
    icon: <Boxes color="#235D70" size={21} />,
    iconBackground: '#DDF3F7',
  },
  {
    title: 'Reports',
    detail: 'Lab reports and finished-good sheets',
    status: 'Shared',
    icon: <FileText color="#7A3A4B" size={21} />,
    iconBackground: '#F8E1E7',
  },
] as const;

export default function WorkspaceScreen() {
  return (
    <BrandScreen>
      <BrandEntrance>
        <BrandHeader />
      </BrandEntrance>

      <BrandEntrance className="mb-7" delay={70}>
        <ThemedText themeColor="textSecondary" type="overline">
          Shared system
        </ThemedText>
        <ThemedText className="mt-2 max-w-[360px]" type="title">
          One workspace, every lab record.
        </ThemedText>
        <ThemedText className="mt-3 max-w-[420px]" themeColor="textSecondary" type="small">
          Mobile and formulation-rd use the same account, project data, and controlled records.
        </ThemedText>
      </BrandEntrance>

      <BrandEntrance delay={140}>
        <BrandSurface className="mb-8 !p-0">
          {workspaceAreas.map((area, index) => (
            <View key={area.title}>
              <WorkspaceArea {...area} />
              {index < workspaceAreas.length - 1 ? (
                <View className="ms-[76px] h-px bg-[#1C4A3C]/10 dark:bg-[#D2F2D4]/10" />
              ) : null}
            </View>
          ))}
        </BrandSurface>
      </BrandEntrance>

      <BrandEntrance className="mb-3 px-1" delay={210}>
        <ThemedText themeColor="textSecondary" type="overline">
          This device
        </ThemedText>
        <ThemedText className="mt-1" type="section">
          Mobile companion
        </ThemedText>
      </BrandEntrance>

      <BrandEntrance delay={260}>
        <View className="relative overflow-hidden rounded-[32px] border border-[#D2F2D4]/10 bg-[#102F27] p-6 dark:bg-[#173E33]">
          <View className="absolute -end-12 -top-16 size-40 rounded-full border-[28px] border-[#F5A623]/10" />
          <View className="mb-6 size-12 items-center justify-center rounded-[17px] bg-[#F5A623]">
            <Smartphone color={BrandColors.ink} size={23} />
          </View>
          <ThemedText className="!text-[#FFFDF4]" type="section">
            {Device.modelName || 'Flavoneer mobile'}
          </ThemedText>
          <ThemedText className="mt-1 !text-[#A9CBBB]" type="small">
            App version {Constants.expoConfig?.version ?? '0.1.0'}
          </ThemedText>
          <View className="mt-5">
            <StatusPill>Connected to shared workspace</StatusPill>
          </View>
        </View>
      </BrandEntrance>
    </BrandScreen>
  );
}

function WorkspaceArea({
  detail,
  icon,
  iconBackground,
  status,
  title,
}: {
  detail: string;
  icon: ReactNode;
  iconBackground: string;
  status: string;
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-4 px-5 py-5">
      <View
        className="size-11 items-center justify-center rounded-[16px]"
        style={{ backgroundColor: iconBackground }}
      >
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <ThemedText numberOfLines={1} type="smallBold">
          {title}
        </ThemedText>
        <ThemedText className="mt-0.5" numberOfLines={1} themeColor="textSecondary" type="caption">
          {detail}
        </ThemedText>
      </View>
      <View className="rounded-full bg-[#EEF8EB] px-2.5 py-1 dark:bg-[#285B4D]">
        <ThemedText className="text-[10px] leading-[14px]" type="smallBold">
          {status}
        </ThemedText>
      </View>
    </View>
  );
}
