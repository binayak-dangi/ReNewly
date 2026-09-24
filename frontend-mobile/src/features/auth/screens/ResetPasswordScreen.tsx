import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { authApi } from '../../../api/endpoints';
import { ErrorCodes, errorMessage, toApiError } from '../../../api/errors';
import type { RootScreenProps } from '../../../app/navigation/types';
import { Button, CodeInput, FormMessage, FormTextField, toast } from '../../../components';
import { Lock } from '../../../components/icons';
import { applyApiErrors } from '../../../utils/forms';
import { AuthLayout } from '../components/AuthLayout';
import { ResetPasswordValues, resetPasswordSchema } from '../schemas';

export function ResetPasswordScreen({ navigation, route }: RootScreenProps<'ResetPassword'>) {
  const { email } = route.params;
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, setValue } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', newPassword: '' },
  });

  const reset = useMutation({
    mutationFn: (values: ResetPasswordValues) => authApi.resetPassword({ email, ...values }),
    onSuccess: result => {
      toast.success(result.message ?? 'Password updated. Please sign in.');
      navigation.popTo('Login');
    },
    onError: error => {
      if (toApiError(error).code === ErrorCodes.InvalidToken) {
        setValue('code', '');
        setError('code', { message: toApiError(error).message });
        setFormError(null);
        return;
      }
      setFormError(applyApiErrors(error, setError, ['code', 'newPassword']));
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => toast.info('If an account exists for this email, a new code is on its way.'),
    onError: error => toast.error(errorMessage(error)),
  });

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      reset.mutate(values);
    })();
  };

  return (
    <AuthLayout title="Enter your code" subtitle={`If ${email} has a Renewly account, we sent it a 6-digit code.`}>
      <FormMessage message={formError} />
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <CodeInput value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoFocus />
        )}
      />
      <FormTextField
        control={control}
        name="newPassword"
        label="New password"
        icon={Lock}
        password
        hint="At least 8 characters, with a letter and a number."
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button title="Update password" onPress={submit} loading={reset.isPending} />
      <Button title="Send a new code" variant="ghost" onPress={() => resend.mutate()} loading={resend.isPending} />
    </AuthLayout>
  );
}
