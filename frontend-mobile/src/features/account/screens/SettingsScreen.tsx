import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorMessage } from '../../../api/errors';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, FormMessage, Screen, SelectField, toast } from '../../../components';
import { useAuthStore } from '../../../store/authStore';
import { spacing } from '../../../theme';
import { deviceTimeZone } from '../../../utils/device';
import { useMeta } from '../../subscriptions/hooks';
import { profilePayload, useUpdateProfile } from '../hooks';
import { languageOptions, timeZoneOptions } from '../options';

/** Preferences: display currency, time zone (drives reminder times) and language. */
export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const user = useAuthStore(s => s.user)!;
  const meta = useMeta();
  const update = useUpdateProfile();
  const [currency, setCurrency] = useState(user.preferredCurrency);
  const [timeZone, setTimeZone] = useState(user.timeZoneId);
  const [language, setLanguage] = useState(user.language);
  const [formError, setFormError] = useState<string | null>(null);

  const device = deviceTimeZone();
  const currencies = useMemo(
    () => (meta.data?.currencies ?? [user.preferredCurrency, 'USD', 'EUR', 'GBP', 'INR', 'NPR']).map(c => ({ value: c, label: c })),
    [meta.data, user.preferredCurrency],
  );
  const zones = useMemo(() => timeZoneOptions(user.timeZoneId, device), [user.timeZoneId, device]);
  const languages = useMemo(() => languageOptions(meta.data?.languages), [meta.data]);

  const changed = currency !== user.preferredCurrency || timeZone !== user.timeZoneId || language !== user.language;

  const save = () => {
    setFormError(null);
    update.mutate(profilePayload(user, { preferredCurrency: currency, timeZoneId: timeZone, language }), {
      onSuccess: () => {
        toast.success('Preferences saved.');
        goBackOrHome(navigation);
      },
      onError: e => setFormError(errorMessage(e)),
    });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} footer={<Button title="Save" onPress={save} loading={update.isPending} disabled={!changed} />}>
      <FormMessage message={formError} />

      <View style={styles.group}>
        <SelectField label="Currency" value={currency} options={currencies} onChange={setCurrency} searchable />
        <AppText variant="caption" tone="muted">
          Totals are shown in this currency first. Each subscription keeps its own currency; Renewly doesn't convert
          between currencies.
        </AppText>
      </View>

      <View style={styles.group}>
        <SelectField label="Time zone" value={timeZone} options={zones} onChange={setTimeZone} searchable />
        <AppText variant="caption" tone="muted">
          Reminders are sent at your chosen time in this time zone.
          {device && device !== timeZone ? ` This phone is set to ${device.replace(/_/g, ' ')}.` : ''}
        </AppText>
        {device && device !== timeZone ? (
          <Button title="Use this phone's time zone" variant="ghost" size="md" fullWidth={false} onPress={() => setTimeZone(device)} />
        ) : null}
      </View>

      <View style={styles.group}>
        <SelectField label="Language" value={language} options={languages} onChange={setLanguage} />
        <AppText variant="caption" tone="muted">
          Used for emails. The app is currently available in English.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
});
