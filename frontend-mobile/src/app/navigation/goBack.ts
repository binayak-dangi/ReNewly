import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * Goes back after an action (save, delete, mark cancelled). When the screen was opened directly — e.g.
 * from a notification deep link — there is nothing to go back to, so fall back to the main tabs.
 */
export function goBackOrHome(navigation: NavigationProp<ParamListBase>): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('MainTabs');
  }
}
