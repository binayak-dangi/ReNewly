import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Card, Divider, ListRow, Screen } from '../../../components';
import { FileText, Mail, RefreshCcw, ShieldCheck } from '../../../components/icons';
import { env } from '../../../config/env';
import { colors, radii, spacing } from '../../../theme';

export function AboutScreen() {
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <RefreshCcw size={32} color={colors.onPrimary} strokeWidth={2.4} />
        </View>
        <AppText variant="title">Renewly</AppText>
        <AppText tone="secondary" align="center">
          Know before you're charged.{'\n'}Cancel before you renew.
        </AppText>
        <AppText variant="caption" tone="muted">
          Version {env.appVersion}
        </AppText>
      </View>

      <Card>
        <AppText tone="secondary">
          Renewly helps you keep track of your subscriptions and reminds you before they renew. Renewly never asks for
          card numbers, CVVs, PINs or banking passwords, and it never cancels, renews or pays for anything on your
          behalf.
        </AppText>
      </Card>

      <Card padding="none">
        <ListRow title="Contact us" subtitle={env.supportEmail} icon={Mail} onPress={() => open(`mailto:${env.supportEmail}`)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Privacy policy" icon={ShieldCheck} onPress={() => open(env.privacyPolicyUrl)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Terms of use" icon={FileText} onPress={() => open(env.termsUrl)} />
      </Card>

      <AppText variant="caption" tone="muted" align="center">
        © {new Date().getFullYear()} BYNQORA Technologies. All rights reserved.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
