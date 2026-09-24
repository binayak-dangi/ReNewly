import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Linking, StyleSheet, View } from 'react-native';
import { authApi } from '../../../api/endpoints';
import { ErrorCodes, toApiError } from '../../../api/errors';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, FormMessage, FormTextField, TextInputHandle } from '../../../components';
import { Lock, Mail, User } from '../../../components/icons';
import { env } from '../../../config/env';
import { useAuthStore } from '../../../store/authStore';
import { usePreferencesStore } from '../../../store/preferencesStore';
import { spacing } from '../../../theme';
import { deviceName, deviceTimeZone } from '../../../utils/device';
import { applyApiErrors } from '../../../utils/forms';
import { AuthLayout } from '../components/AuthLayout';
import { RegisterValues, registerSchema } from '../schemas';

export function RegisterScreen({ navigation }: RootScreenProps<'Register'>) {
  const applySession = useAuthStore(s => s.applySession);
  const setLastEmail = usePreferencesStore(s => s.setLastEmail);
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<TextInputHandle>(null);
  const passwordRef = useRef<TextInputHandle>(null);

  const { control, handleSubmit, setError } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const register = useMutation({
    mutationFn: (values: RegisterValues) =>
      authApi.register({
        ...values,
        timeZoneId: deviceTimeZone(),
        deviceName: deviceName(),
      }),
    onSuccess: async (auth, values) => {
      setLastEmail(values.email);
      await applySession(auth); // → email verification screen
    },
    onError: error => {
      if (toApiError(error).code === ErrorCodes.EmailAlreadyRegistered) {
        setError('email', { message: 'An account with this email already exists. Sign in instead.' }, { shouldFocus: true });
        setFormError(null);
        return;
      }
      setFormError(applyApiErrors(error, setError, ['fullName', 'email', 'password']));
    },
  });

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      register.mutate(values);
    })();
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free for up to 5 subscriptions. No card details needed."
      footer={
        <View style={styles.footerRow}>
          <AppText tone="secondary">Already have an account?</AppText>
          <Button title="Sign in" variant="ghost" size="md" fullWidth={false} onPress={() => navigation.navigate('Login')} />
        </View>
      }>
      <FormMessage message={formError} />

      <FormTextField
        control={control}
        name="fullName"
        label="Name"
        icon={User}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormTextField
        control={control}
        name="email"
        label="Email"
        icon={Mail}
        ref={emailRef}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormTextField
        control={control}
        name="password"
        label="Password"
        icon={Lock}
        ref={passwordRef}
        password
        hint="At least 8 characters, with a letter and a number."
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button title="Create account" onPress={submit} loading={register.isPending} />

      <AppText variant="caption" tone="muted" align="center">
        By creating an account you agree to the{' '}
        <AppText variant="caption" tone="primary" onPress={() => Linking.openURL(env.termsUrl)} accessibilityRole="link">
          Terms
        </AppText>{' '}
        and{' '}
        <AppText variant="caption" tone="primary" onPress={() => Linking.openURL(env.privacyPolicyUrl)} accessibilityRole="link">
          Privacy Policy
        </AppText>
        .
      </AppText>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
