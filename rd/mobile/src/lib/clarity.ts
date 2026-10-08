import * as Clarity from '@microsoft/react-native-clarity';
import { useSegments } from 'expo-router';
import { useEffect } from 'react';

const CLARITY_PROJECT_ID = 'yuk6oz1k5w';

Clarity.initialize(CLARITY_PROJECT_ID, {
  logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None,
});

// Reports the route pattern (e.g. "/quality/production-line/[recordId]") rather than the
// concrete pathname, so dynamic IDs don't split one screen into many in Clarity.
export function useClarityScreenTracking() {
  const segments = useSegments();
  const screenName = `/${segments.filter((segment) => !segment.startsWith('(')).join('/')}`;

  useEffect(() => {
    Clarity.setCurrentScreenName(screenName);
  }, [screenName]);
}

export function useClarityUser(userId: string | undefined) {
  useEffect(() => {
    if (userId) {
      Clarity.setCustomUserId(userId);
    }
  }, [userId]);
}
