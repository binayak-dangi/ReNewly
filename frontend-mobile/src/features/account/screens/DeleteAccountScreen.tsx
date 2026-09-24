import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { meApi } from '../../../api/endpoints';
import { ErrorCodes, toApiError } from '../../../api/errors';
import { AppText, Button, Card, FormMessage, Screen, TextField, toast } from '../../../components';
import { Lock, TriangleAlert } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { colors, spacing } from '../../../theme';

const WHAT_IS_DELETED = [
  'All subscriptions you added, with their reminders and notes',
  'Notification history and registered devices',
  'Your profile, preferences and sign-in sessions',
];

/** In-app account deletion (required by Google Play). */
export function DeleteAccountScreen() {
  const signOut = useAuthStore(s => s.signOut);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  const remove = useMutation({
    mutationFn: () => meApi.deleteAccount(password),
    onSuccess: async () => {
      await signOut('accountDeleted');
      toast.success('Your account has been deleted.');
    },
    onError: e => {
      const apiError = toApiError(e);
      setError(apiError.code === ErrorCodes.InvalidCredentials ? 'Your password is incorrect.' : apiError.message);
    },
  });

  const confirm = () => {
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    Alert.alert('Delete your account?', 'This permanently deletes your Renewly data. It cannot be undone.', [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      keyboardAware
      footer={<Button title="Delete my account" variant="danger" onPress={confirm} loading={remove.isPending} />}>
      <View style={styles.header}>
        <TriangleAlert size={28} color={colors.danger} />
        <AppText variant="title" accessibilityRole="header">
          Delete your account
        </AppText>
      </View>

      <Card>
        <AppText variant="bodyStrong">This permanently deletes:</AppText>
        <View style={styles.list}>
          {WHAT_IS_DELETED.map(item => (
            <AppText key={item} tone="secondary">
              • {item}
            </AppText>
          ))}
        </View>
      </Card>

      <FormMessage
        tone="info"
        message="Deleting Renewly does not cancel any of your subscriptions with their providers. Cancel those first if you no longer want them. A Renewly Pro plan bought on Google Play must be cancelled in Google Play."
      />

      <TextField
        label="Password"
        icon={Lock}
        password
        value={password}
        onChangeText={value => {
          setPassword(value);
          setError(undefined);
        }}
        error={error}
        autoComplete="current-password"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  list: { gap: spacing.xs, marginTop: spacing.sm },
});
