import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, Screen } from '../../../components';
import { BellRing, CalendarClock, LucideIcon, RefreshCcw, ShieldCheck } from '../../../components/icons';
import { usePreferencesStore } from '../../../store/preferencesStore';
import { colors, radii, spacing } from '../../../theme';

const points: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BellRing,
    title: 'Reminded before every renewal',
    body: 'Get a heads-up 7, 3 or 1 day before you are charged.',
  },
  {
    icon: CalendarClock,
    title: 'Every renewal in one place',
    body: 'See what renews next and what you spend each month.',
  },
  {
    icon: ShieldCheck,
    title: 'No card details. Ever.',
    body: 'Renewly never asks for card numbers, CVVs or bank logins.',
  },
];

export function WelcomeScreen({ navigation }: RootScreenProps<'Welcome'>) {
  const markOnboardingSeen = usePreferencesStore(s => s.markOnboardingSeen);

  // Navigate first, then drop Welcome from the stack (it is only registered until onboarding is seen).
  const go = (route: 'Register' | 'Login') => {
    navigation.navigate(route);
    markOnboardingSeen();
  };

  return (
    <Screen
      background="background"
      footer={
        <>
          <Button title="Create free account" onPress={() => go('Register')} />
          <Button title="I already have an account" variant="ghost" onPress={() => go('Login')} />
        </>
      }>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <RefreshCcw size={32} color={colors.onPrimary} strokeWidth={2.4} />
        </View>
        <AppText variant="display" accessibilityRole="header">
          Know before you're charged.
        </AppText>
        <AppText variant="headline" tone="primary">
          Cancel before you renew.
        </AppText>
        <AppText tone="secondary">
          Renewly keeps track of your subscriptions and reminds you before they renew, so you only pay for what you
          still use.
        </AppText>
      </View>

      <View style={styles.points}>
        {points.map(({ icon: Icon, title, body }) => (
          <View key={title} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon size={22} color={colors.primary} />
            </View>
            <View style={styles.pointText}>
              <AppText variant="bodyStrong">{title}</AppText>
              <AppText variant="label" tone="secondary">
                {body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, marginTop: spacing.xxl },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  points: { gap: spacing.xl, marginTop: spacing.xxl },
  point: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, gap: spacing.xxs },
});
