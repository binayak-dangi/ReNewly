import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../../../app/navigation/types';
import { AppText, Badge, Card, Divider, ListRow, Screen, SectionHeader } from '../../../components';
import {
  Bell,
  CircleHelp,
  Crown,
  FileText,
  Info,
  KeyRound,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
  User,
} from '../../../components/icons';
import { env } from '../../../config/env';
import { useAuthStore } from '../../../store/authStore';
import { colors, radii, spacing } from '../../../theme';
import { initials } from '../../../utils/format';
import { useMyPlan } from '../../subscriptions/hooks';
import { languageOptions } from '../options';

export function ProfileScreen({ navigation }: TabScreenProps<'Profile'>) {
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const plan = useMyPlan();
  const isPro = plan.data?.entitlements.isPro ?? false;

  if (!user) {
    return null;
  }

  const language = languageOptions([user.language])[0]?.label ?? user.language;

  const confirmSignOut = () =>
    Alert.alert('Sign out of Renewly?', 'Your subscriptions stay saved in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut('user') },
    ]);

  const open = (url: string) => Linking.openURL(url).catch(() => undefined);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <AppText variant="title" accessibilityRole="header">
        Profile
      </AppText>

      <Card>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <AppText variant="headline" tone="inverse">
              {initials(user.fullName)}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="headline" numberOfLines={1}>
              {user.fullName}
            </AppText>
            <AppText variant="label" tone="secondary" numberOfLines={1}>
              {user.email}
            </AppText>
          </View>
          <Badge label={isPro ? 'Pro' : 'Free'} tone={isPro ? 'primary' : 'neutral'} />
        </View>
      </Card>

      {!isPro ? (
        <Card tone="primary" onPress={() => navigation.navigate('Premium')} accessibilityLabel="Upgrade to Renewly Pro">
          <View style={styles.userRow}>
            <Crown size={22} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Upgrade to Renewly Pro</AppText>
              <AppText variant="label" tone="secondary">
                Unlimited subscriptions, email and multiple reminders.
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Account" />
      <Card padding="none">
        <ListRow title="Personal information" subtitle="Name and email" icon={User} onPress={() => navigation.navigate('EditProfile')} />
        <Divider inset={spacing.lg} />
        <ListRow
          title="Preferences"
          subtitle={`${user.preferredCurrency} · ${user.timeZoneId.replace(/_/g, ' ')} · ${language}`}
          icon={SlidersHorizontal}
          onPress={() => navigation.navigate('Settings')}
        />
        <Divider inset={spacing.lg} />
        <ListRow title="Notifications" subtitle="Reminder days, time and channels" icon={Bell} onPress={() => navigation.navigate('NotificationSettings')} />
        <Divider inset={spacing.lg} />
        <ListRow title="Security" subtitle="Change password" icon={KeyRound} onPress={() => navigation.navigate('ChangePassword')} />
        <Divider inset={spacing.lg} />
        <ListRow
          title="Renewly Pro"
          subtitle={isPro ? `You're on ${plan.data?.entitlements.planName}` : 'Compare plans'}
          icon={Crown}
          onPress={() => navigation.navigate('Premium')}
        />
      </Card>

      <SectionHeader title="Support" />
      <Card padding="none">
        <ListRow
          title="Help & support"
          subtitle={env.supportEmail}
          icon={CircleHelp}
          onPress={() => open(`mailto:${env.supportEmail}?subject=${encodeURIComponent('Renewly support')}`)}
        />
        <Divider inset={spacing.lg} />
        <ListRow title="Privacy policy" icon={ShieldCheck} onPress={() => open(env.privacyPolicyUrl)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Terms of use" icon={FileText} onPress={() => open(env.termsUrl)} />
        <Divider inset={spacing.lg} />
        <ListRow title="About Renewly" subtitle={`Version ${env.appVersion}`} icon={Info} onPress={() => navigation.navigate('About')} />
      </Card>

      <Card padding="none">
        <ListRow title="Sign out" icon={LogOut} onPress={confirmSignOut} showChevron={false} />
        <Divider inset={spacing.lg} />
        <ListRow title="Delete account" icon={Trash} destructive onPress={() => navigation.navigate('DeleteAccount')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
