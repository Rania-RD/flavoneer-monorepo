import * as SplashScreen from 'expo-splash-screen';
import { cssInterop } from 'nativewind';
import { useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Image } from '@/components/ui/image';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const AnimatedView = cssInterop(Animated.View, { className: 'style' }) as typeof Animated.View;

export function AnimatedSplashOverlay({ ready = true }: { ready?: boolean }) {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!ready || animate) return;

    SplashScreen.hideAsync().finally(() => {
      setAnimate(true);
    });
  }, [animate, ready]);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const image = (
    <Image className="size-24" source={require('@/assets/images/flavoneer-mark.png')} />
  );

  return animate ? (
    <AnimatedView
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      className="absolute inset-0 z-[1000] items-center justify-center bg-[#D2F2D4]"
    >
      {image}
    </AnimatedView>
  ) : (
    <View className="absolute inset-0 z-[1000] items-center justify-center bg-[#D2F2D4]">
      {image}
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View className="z-[100] size-32 items-center justify-center">
      <AnimatedView
        className="absolute size-[201px]"
        entering={glowKeyframe.duration(60 * 1000 * 4)}
      >
        <Image
          className="absolute size-[201px]"
          source={require('@/assets/images/flavoneer-glow.png')}
        />
      </AnimatedView>

      <AnimatedView
        className="absolute size-32 rounded-[40px]"
        entering={keyframe.duration(DURATION)}
        style={{ experimental_backgroundImage: 'linear-gradient(180deg, #E9F8EA, #D2F2D4)' }}
      />
      <AnimatedView
        className="items-center justify-center"
        entering={logoKeyframe.duration(DURATION)}
      >
        <Image className="size-24" source={require('@/assets/images/flavoneer-mark.png')} />
      </AnimatedView>
    </View>
  );
}
