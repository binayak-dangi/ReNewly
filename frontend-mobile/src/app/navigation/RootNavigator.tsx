import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { colors, typography } from '../../theme';
import { ForgotPasswordScreen } from '../../features/auth/screens/ForgotPasswordScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../../features/auth/screens/RegisterScreen';
import { ResetPasswordScreen } from '../../features/auth/screens/ResetPasswordScreen';
import { VerifyEmailScreen } from '../../features/auth/screens/VerifyEmailScreen';
import { WelcomeScreen } from '../../features/auth/screens/WelcomeScreen';
import { MainTabs } from './MainTabs';
import { placeholder } from './PlaceholderScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Stage 6 replaces these placeholders with the real screens.
const SubscriptionDetailScreen = placeholder('Subscription');
const SubscriptionFormScreen = placeholder('Add subscription');
const ServicePickerScreen = placeholder('Choose a service');
const CancellationAssistanceScreen = placeholder('Cancel subscription');
const NotificationsScreen = placeholder('Notifications');
const SettingsScreen = placeholder('Settings');
const EditProfileScreen = placeholder('Personal information');
const NotificationSettingsScreen = placeholder('Notification settings');
const ChangePasswordScreen = placeholder('Change password');
const DeleteAccountScreen = placeholder('Delete account');
const PremiumScreen = placeholder('Renewly Pro');

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
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Personal information' }} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notifications' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete account' }} />
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
