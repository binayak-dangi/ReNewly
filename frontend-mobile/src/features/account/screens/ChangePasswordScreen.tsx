import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authApi } from '../../../api/endpoints';
import { ErrorCodes, toApiError } from '../../../api/errors';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, FormMessage, FormTextField, Screen, toast } from '../../../components';
import { Lock } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { applyApiErrors } from '../../../utils/forms';
import { passwordSchema } from '../../auth/schemas';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
  })
  .refine(v => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password.',
  });
type Values = z.infer<typeof schema>;

export function ChangePasswordScreen({ navigation }: RootScreenProps<'ChangePassword'>) {
  const applySession = useAuthStore(s => s.applySession);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const change = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: async auth => {
      await applySession(auth); // new session; other devices are signed out by the server
      toast.success('Password changed. Other devices have been signed out.');
      goBackOrHome(navigation);
    },
    onError: e => {
      if (toApiError(e).code === ErrorCodes.InvalidCredentials) {
        setError('currentPassword', { message: toApiError(e).message }, { shouldFocus: true });
        return;
      }
      setFormError(applyApiErrors(e, setError, ['currentPassword', 'newPassword']));
    },
  });

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      change.mutate(values);
    })();
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} keyboardAware footer={<Button title="Change password" onPress={submit} loading={change.isPending} />}>
      <FormMessage message={formError} />
      <FormTextField control={control} name="currentPassword" label="Current password" icon={Lock} password autoComplete="current-password" />
      <FormTextField
        control={control}
        name="newPassword"
        label="New password"
        icon={Lock}
        password
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
      />
      <AppText variant="caption" tone="muted">
        For your security, you'll stay signed in here and every other device will be signed out.
      </AppText>
    </Screen>
  );
}
