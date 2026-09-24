import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { authApi } from '../../../api/endpoints';
import { ErrorCodes, toApiError } from '../../../api/errors';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, FormMessage, FormTextField, TextInputHandle } from '../../../components';
import { Lock, Mail } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { usePreferencesStore } from '../../../store/preferencesStore';
import { spacing } from '../../../theme';
import { deviceName } from '../../../utils/device';
import { applyApiErrors } from '../../../utils/forms';
import { AuthLayout } from '../components/AuthLayout';
import { LoginValues, loginSchema } from '../schemas';

/** Errors that describe the whole attempt rather than one field. */
const FORM_LEVEL_CODES = new Set<string>([ErrorCodes.InvalidCredentials, ErrorCodes.AccountLocked, ErrorCodes.RateLimited]);

export function LoginScreen({ navigation }: RootScreenProps<'Login'>) {
  const applySession = useAuthStore(s => s.applySession);
  const expired = useAuthStore(s => s.lastSignOutReason === 'expired');
  const { lastEmail, setLastEmail } = usePreferencesStore();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputHandle>(null);

  const { control, handleSubmit, setError } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: lastEmail ?? '', password: '' },
  });

  const login = useMutation({
    mutationFn: (values: LoginValues) =>
      authApi.login({ email: values.email, password: values.password, deviceName: deviceName() }),
    onSuccess: async (auth, values) => {
      setLastEmail(values.email);
      await applySession(auth);
    },
    onError: error => {
      const apiError = toApiError(error);
      setFormError(
        FORM_LEVEL_CODES.has(apiError.code) ? apiError.message : applyApiErrors(error, setError, ['email', 'password']),
      );
    },
  });

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      login.mutate(values);
    })();
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see what renews next."
      showBack={false}
      footer={
        <View style={styles.footerRow}>
          <AppText tone="secondary">New to Renewly?</AppText>
          <Button title="Create an account" variant="ghost" size="md" fullWidth={false} onPress={() => navigation.navigate('Register')} />
        </View>
      }>
      {expired && !formError ? <FormMessage tone="info" message="Your session has expired. Please sign in again." /> : null}
      <FormMessage message={formError} />

      <FormTextField
        control={control}
        name="email"
        label="Email"
        icon={Mail}
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
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        ref={passwordRef}
        onSubmitEditing={submit}
      />

      <View style={styles.forgot}>
        <Button
          title="Forgot password?"
          variant="ghost"
          size="md"
          fullWidth={false}
          onPress={() => navigation.navigate('ForgotPassword')}
        />
      </View>

      <Button title="Sign in" onPress={submit} loading={login.isPending} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { alignItems: 'flex-end', marginTop: -spacing.sm },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
