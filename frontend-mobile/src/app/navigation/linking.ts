import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Deep links, used by push notifications (data.deepLink = "renewly://subscriptions/{id}").
 * The scheme is registered in android/app/src/main/AndroidManifest.xml.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['renewly://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Subscriptions: 'subscriptions',
          Calendar: 'calendar',
          Insights: 'insights',
          Profile: 'profile',
        },
      },
      SubscriptionDetail: 'subscriptions/:id',
      Notifications: 'notifications',
      Premium: 'premium',
    },
  },
};
