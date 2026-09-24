import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AboutScreen } from '../../features/account/screens/AboutScreen';
import { ChangePasswordScreen } from '../../features/account/screens/ChangePasswordScreen';
import { DeleteAccountScreen } from '../../features/account/screens/DeleteAccountScreen';
import { EditProfileScreen } from '../../features/account/screens/EditProfileScreen';
import { NotificationSettingsScreen } from '../../features/account/screens/NotificationSettingsScreen';
import { SettingsScreen } from '../../features/account/screens/SettingsScreen';
import { ForgotPasswordScreen } from '../../features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../../features/auth/screens/RegisterScreen';
import { ResetPasswordScreen } from '../../features/auth/screens/ResetPasswordScreen';
import { VerifyEmailScreen } from '../../features/auth/screens/VerifyEmailScreen';
import { WelcomeScreen } from '../../features/auth/screens/WelcomeScreen';
import { NotificationsScreen } from '../../features/notifications/NotificationsScreen';
import { PremiumScreen } from '../../features/premium/PremiumScreen';
import { CancellationAssistanceScreen } from '../../features/subscriptions/screens/CancellationAssistanceScreen';
import { ServicePickerScreen } from '../../features/subscriptions/screens/ServicePickerScreen';
import { SubscriptionDetailScreen } from '../../features/subscriptions/screens/SubscriptionDetailScreen';
import { SubscriptionFormScreen } from '../../features/subscriptions/screens/SubscriptionFormScreen';
import { useAuthStore } from '../../store/authStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { colors, typography } from '../../theme';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Screens are grouped by session state; switching state swaps the whole group, so a signed-out user can
 * never navigate "back" into the app and an unverified user can only reach the verification screen.
 */
export function RootNavigator() {
  const status = useAuthStore(s => s.status);
  const hasSeenOnboarding = usePreferencesStore(s => s.hasSeenOnboarding);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { ...typography.headline, color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.surface },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      {status === 'signedOut' ? (
        <Stack.Group screenOptions={{ headerShown: false }}>
          {!hasSeenOnboarding ? <Stack.Screen name="Welcome" component={WelcomeScreen} /> : null}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Group>
      ) : status === 'unverified' ? (
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Group>
            <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="CancellationAssistance" component={CancellationAssistanceScreen} options={{ title: 'Cancel subscription' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Preferences' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Personal information' }} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notifications' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete account' }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About Renewly' }} />
          </Stack.Group>
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="SubscriptionForm" component={SubscriptionFormScreen} options={{ title: 'Add subscription' }} />
            <Stack.Screen name="ServicePicker" component={ServicePickerScreen} options={{ title: 'Choose a service' }} />
            <Stack.Screen name="Premium" component={PremiumScreen} options={{ title: 'Renewly Pro' }} />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}
