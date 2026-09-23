import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Home: undefined;
  Subscriptions: undefined;
  Calendar: undefined;
  Insights: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  // Signed out
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  // Signed in, email not verified
  VerifyEmail: undefined;
  // Signed in
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  SubscriptionDetail: { id: string };
  /** Add (no id) or edit (id). `serviceId` pre-fills from the catalog. */
  SubscriptionForm: { id?: string; serviceId?: string };
  ServicePicker: undefined;
  CancellationAssistance: { id: string };
  Notifications: undefined;
  Settings: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  ChangePassword: undefined;
  DeleteAccount: undefined;
  Premium: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    // Enables typed useNavigation() everywhere.
    interface RootParamList extends RootStackParamList {}
  }
}
