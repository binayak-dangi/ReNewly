import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Non-sensitive, per-device preferences. Never store tokens or personal data here. */
interface PreferencesState {
  hasSeenOnboarding: boolean;
  /** Email of the last signed-in account, to pre-fill the sign-in form. */
  lastEmail: string | null;
  markOnboardingSeen(): void;
  setLastEmail(email: string | null): void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      hasSeenOnboarding: false,
      lastEmail: null,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setLastEmail: email => set({ lastEmail: email }),
    }),
    {
      name: 'renewly.preferences',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
