import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '../components';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { colors } from '../theme';
import { linking } from './navigation/linking';
import { RootNavigator } from './navigation/RootNavigator';
import { QueryProvider } from './providers/QueryProvider';
import { SplashScreen } from './SplashScreen';

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.surface,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/** Preferences load asynchronously; wait so the first screen (onboarding vs sign-in) is right. */
function usePreferencesHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePreferencesStore.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = usePreferencesStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(usePreferencesStore.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}

export function App() {
  const status = useAuthStore(s => s.status);
  const preferencesReady = usePreferencesHydrated();
  const bootstrap = useAuthStore(s => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <QueryProvider>
        {status === 'booting' || !preferencesReady ? (
          <SplashScreen />
        ) : (
          <NavigationContainer theme={navigationTheme} linking={linking} fallback={<SplashScreen />}>
            <RootNavigator />
          </NavigationContainer>
        )}
        <ToastHost />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
