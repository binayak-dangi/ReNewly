import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authApi } from '../../../api/endpoints';
import type { RootScreenProps } from '../../../app/navigation/types';
import { Button, FormMessage, FormTextField } from '../../../components';
import { Mail } from '../../../components/icons';
import { usePreferencesStore } from '../../../store/preferencesStore';
import { applyApiErrors } from '../../../utils/forms';
import { AuthLayout } from '../components/AuthLayout';
import { ForgotPasswordValues, forgotPasswordSchema } from '../schemas';

export function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const lastEmail = usePreferencesStore(s => s.lastEmail);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: lastEmail ?? '' },
  });

  const request = useMutation({
    mutationFn: (values: ForgotPasswordValues) => authApi.forgotPassword(values.email),
    // The API answers the same way whether or not the account exists, so always continue.
    onSuccess: (_result, values) => navigation.navigate('ResetPassword', { email: values.email }),
    onError: error => setFormError(applyApiErrors(error, setError, ['email'])),
  });

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      request.mutate(values);
    })();
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your account email and we'll send you a 6-digit code.">
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
        returnKeyType="send"
        onSubmitEditing={submit}
        autoFocus={!lastEmail}
      />
      <Button title="Send code" onPress={submit} loading={request.isPending} />
    </AuthLayout>
  );
}
