import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi } from '../../../api/endpoints';
import { errorMessage, toApiError } from '../../../api/errors';
import { AppText, Button, CodeInput, toast } from '../../../components';
import { MailCheck } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { colors, radii } from '../../../theme';
import { AuthLayout } from '../components/AuthLayout';

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailScreen() {
  const user = useAuthStore(s => s.user);
  const applySession = useAuthStore(s => s.applySession);
  const signOut = useAuthStore(s => s.signOut);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyEmail(value),
    onSuccess: async auth => {
      await applySession(auth); // status → signedIn, navigator switches to the app
      toast.success('Email verified. Welcome to Renewly!');
    },
    onError: e => {
      setCode('');
      setError(toApiError(e).message);
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: () => {
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.info('A new code is on its way.');
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const submit = (value = code) => {
    if (value.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(undefined);
    verify.mutate(value);
  };

  return (
    <AuthLayout
      title="Check your email"
      showBack={false}
      footer={<Button title="Use a different email" variant="ghost" onPress={() => signOut('user')} />}>
      <View style={styles.iconCircle}>
        <MailCheck size={28} color={colors.primary} />
      </View>
      <AppText tone="secondary">
        We sent a 6-digit code to <AppText variant="bodyStrong">{user?.email}</AppText>. Enter it below to verify your
        email and start tracking renewals.
      </AppText>

      <CodeInput
        value={code}
        onChangeText={value => {
          setCode(value);
          setError(undefined);
        }}
        onComplete={submit}
        error={error}
        autoFocus
      />

      <Button title="Verify email" onPress={() => submit()} loading={verify.isPending} />
      <Button
        title={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        variant="ghost"
        disabled={cooldown > 0}
        loading={resend.isPending}
        onPress={() => resend.mutate()}
      />
      <AppText variant="caption" tone="muted" align="center">
        Can't find it? Check your spam folder.
      </AppText>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
