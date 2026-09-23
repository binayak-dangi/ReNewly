import { Hammer } from '../../components/icons';
import React from 'react';
import { AppText, Button, EmptyState, Screen } from '../../components';
import { useAuthStore } from '../../store/authStore';

/**
 * Temporary stand-in used by the navigators until each screen is implemented (Stage 6).
 * Keeping every route registered now lets navigation, deep links and auth gating be tested end to end.
 */
export function placeholder(title: string, options: { showSignOut?: boolean } = {}) {
  function PlaceholderScreen() {
    const user = useAuthStore(s => s.user);
    const signOut = useAuthStore(s => s.signOut);

    return (
      <Screen>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <EmptyState icon={Hammer} title="Coming soon" message={`The ${title} screen is being built.`} />
        {options.showSignOut && user ? (
          <>
            <AppText tone="secondary" align="center">
              Signed in as {user.email}
            </AppText>
            <Button title="Sign out" variant="outline" onPress={() => signOut('user')} />
          </>
        ) : null}
      </Screen>
    );
  }

  PlaceholderScreen.displayName = `${title.replace(/\s+/g, '')}Placeholder`;
  return PlaceholderScreen;
}
