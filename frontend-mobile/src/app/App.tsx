import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
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

export function App() {
  const status = useAuthStore(s => s.status);
  const bootstrap = useAuthStore(s => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <SafeAreaProvider>
      <QueryProvider>
        {status === 'booting' ? (
          <SplashScreen />
        ) : (
          <NavigationContainer theme={navigationTheme} linking={linking} fallback={<SplashScreen />}>
            <RootNavigator />
          </NavigationContainer>
        )}
      </QueryProvider>
    </SafeAreaProvider>
  );
}
