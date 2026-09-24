import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CalendarDays, ChartPie, CircleUser, House, Layers, LucideIcon } from '../../components/icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';
import { DashboardScreen } from '../../features/dashboard/DashboardScreen';
import { placeholder } from './PlaceholderScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, LucideIcon> = {
  Home: House,
  Subscriptions: Layers,
  Calendar: CalendarDays,
  Insights: ChartPie,
  Profile: CircleUser,
};

// Stage 6 replaces the placeholders with the real screens.
const SubscriptionsScreen = placeholder('Subscriptions');
const CalendarScreen = placeholder('Calendar');
const InsightsScreen = placeholder('Insights');
const ProfileScreen = placeholder('Profile', { showSignOut: true });

/** Defined outside render so React keeps a stable component type per tab. */
function tabIcon(name: keyof MainTabParamList) {
  const Icon = icons[name];
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
  );
}

const tabIcons = Object.fromEntries(
  (Object.keys(icons) as (keyof MainTabParamList)[]).map(name => [name, tabIcon(name)]),
) as Record<keyof MainTabParamList, ReturnType<typeof tabIcon>>;

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarIcon: tabIcons[route.name],
      })}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  label: { ...typography.caption, fontWeight: '600' },
});
