import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Check, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { BrandColors } from '@/constants/theme';
import { type ProductionLineTranslationKey, useProductionLineI18n } from '../i18n';

interface BatchLabelCameraProps {
  onCapture: (uri: string) => Promise<void>;
  onClose: () => void;
  t: (key: ProductionLineTranslationKey) => string;
  visible: boolean;
}

export function BatchLabelCamera({ onCapture, onClose, t, visible }: BatchLabelCameraProps) {
  const { isRTL } = useProductionLineI18n();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const takePhoto = async () => {
    if (!(cameraRef.current && isReady) || isCapturing) {
      return;
    }
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      await onCapture(photo.uri);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View className="flex-1 bg-[#071B16]" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        {permission?.granted ? (
          <>
            <CameraView
              facing="back"
              mode="picture"
              onCameraReady={() => setIsReady(true)}
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView
              className="justify-between px-5 pb-8 pt-3"
              pointerEvents="box-none"
              style={[StyleSheet.absoluteFill, styles.controls]}
            >
              <View className="flex-row items-center justify-between">
                <Pressable
                  accessibilityLabel={t('close')}
                  accessibilityRole="button"
                  className="size-12 items-center justify-center rounded-full bg-black/40 active:scale-95"
                  onPress={onClose}
                >
                  <X color="white" size={24} />
                </Pressable>
                <View className="rounded-full bg-black/40 px-4 py-2">
                  <ThemedText className="!text-white" type="smallBold">
                    {t('cartonLabel')}
                  </ThemedText>
                </View>
              </View>

              <View className="mx-4 aspect-[4/3] rounded-[30px] border-2 border-dashed border-[#F5A623] bg-black/5" />

              <View className="items-center gap-5">
                <ThemedText className="max-w-[320px] text-center !text-white" type="small">
                  {t('cameraReadyHelp')}
                </ThemedText>
                <Pressable
                  accessibilityLabel={t('takePhoto')}
                  accessibilityRole="button"
                  className={`size-20 items-center justify-center rounded-full border-[6px] border-white bg-[#F5A623] active:scale-95 ${
                    !isReady || isCapturing ? 'opacity-50' : ''
                  }`}
                  disabled={!isReady || isCapturing}
                  onPress={takePhoto}
                >
                  {isCapturing ? (
                    <ActivityIndicator color={BrandColors.ink} />
                  ) : (
                    <Camera color={BrandColors.ink} size={30} strokeWidth={2.4} />
                  )}
                </Pressable>
              </View>
            </SafeAreaView>
          </>
        ) : (
          <SafeAreaView className="flex-1 items-center justify-center gap-5 px-8">
            <View className="size-20 items-center justify-center rounded-[28px] bg-[#F5A623]">
              {permission ? (
                <Camera color={BrandColors.ink} size={34} />
              ) : (
                <ActivityIndicator color={BrandColors.ink} />
              )}
            </View>
            <ThemedText className="text-center !text-white" type="section">
              {t('cameraPermissionTitle')}
            </ThemedText>
            <ThemedText className="max-w-[340px] text-center !text-[#A9CBBB]" type="small">
              {t('cameraPermissionBody')}
            </ThemedText>
            {permission ? (
              <Pressable
                accessibilityRole="button"
                className="mt-2 min-h-[54px] flex-row items-center gap-2 rounded-[18px] bg-[#F5A623] px-6 active:scale-95"
                onPress={requestPermission}
              >
                <Check color={BrandColors.ink} size={19} />
                <ThemedText className="!text-[#173E33]" type="smallBold">
                  {t('grantPermission')}
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              className="min-h-[48px] justify-center px-5"
              onPress={onClose}
            >
              <ThemedText className="!text-white" type="smallBold">
                {t('close')}
              </ThemedText>
            </Pressable>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  controls: {
    elevation: 1,
    zIndex: 1,
  },
});
