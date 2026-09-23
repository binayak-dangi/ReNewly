import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** True while the device has a usable connection. Optimistic (true) until NetInfo reports. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(
    () =>
      NetInfo.addEventListener(state => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
      }),
    [],
  );

  return online;
}
