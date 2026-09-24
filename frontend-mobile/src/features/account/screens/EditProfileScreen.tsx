import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, FormMessage, FormTextField, Screen, TextField, toast } from '../../../components';
import { Mail, User } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { applyApiErrors } from '../../../utils/forms';
import { profilePayload, useUpdateProfile } from '../hooks';

const schema = z.object({ fullName: z.string().trim().min(2, 'Enter your name.').max(120, 'Name is too long.') });
type Values = z.infer<typeof schema>;

export function EditProfileScreen({ navigation }: RootScreenProps<'EditProfile'>) {
  const user = useAuthStore(s => s.user)!;
  const update = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user.fullName },
  });

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      update.mutate(profilePayload(user, { fullName: values.fullName.trim() }), {
        onSuccess: () => {
          toast.success('Profile updated.');
          goBackOrHome(navigation);
        },
        onError: e => setFormError(applyApiErrors(e, setError, ['fullName'])),
      });
    })();
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      keyboardAware
      footer={<Button title="Save" onPress={submit} loading={update.isPending} disabled={!formState.isDirty} />}>
      <FormMessage message={formError} />
      <FormTextField control={control} name="fullName" label="Name" icon={User} autoCapitalize="words" autoComplete="name" />
      <TextField label="Email" icon={Mail} value={user.email} editable={false} hint="Email can't be changed yet. Contact support if you need help." />
      <AppText variant="caption" tone="muted">
        Your name is used in reminders and emails from Renewly.
      </AppText>
    </Screen>
  );
}
