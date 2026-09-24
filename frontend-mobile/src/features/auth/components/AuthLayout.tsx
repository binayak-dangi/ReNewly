import { useNavigation } from '@react-navigation/native';
import React, { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, IconButton, Screen } from '../../../components';
import { ArrowLeft } from '../../../components/icons';
import { spacing } from '../../../theme';

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  /** Shows a back arrow when the screen can go back. */
  showBack?: boolean;
  footer?: ReactNode;
}

/** Shared frame for sign-in, sign-up, reset and verification screens. */
export function AuthLayout({ title, subtitle, showBack = true, footer, children }: AuthLayoutProps) {
  const navigation = useNavigation();
  const canGoBack = showBack && navigation.canGoBack();

  return (
    <Screen background="background" keyboardAware footer={footer}>
      <View style={styles.header}>
        {canGoBack ? (
          <View style={styles.back}>
            <IconButton icon={ArrowLeft} accessibilityLabel="Go back" onPress={() => navigation.goBack()} />
          </View>
        ) : null}
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText tone="secondary">{subtitle}</AppText> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.sm },
  back: { marginLeft: -spacing.md, marginBottom: spacing.xs },
  body: { gap: spacing.lg, marginTop: spacing.md },
});
