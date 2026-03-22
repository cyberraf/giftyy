import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useState } from 'react';

type NetworkContextType = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: null,
});

// Module-level reconnect listeners (usable outside React tree, e.g. syncManager)
const _reconnectListeners = new Set<() => void>();

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let prevConnected = true;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      setIsInternetReachable(state.isInternetReachable);

      // Fire reconnect listeners when transitioning offline → online
      if (connected && !prevConnected) {
        _reconnectListeners.forEach((cb) => {
          try {
            cb();
          } catch (err) {
            console.warn('[NetworkContext] Reconnect callback error:', err);
          }
        });
      }

      prevConnected = connected;
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, isInternetReachable }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

/**
 * Register a callback to fire when connectivity is restored.
 * Can be used outside React tree (e.g. from syncManager).
 * Returns an unsubscribe function.
 */
export function onReconnect(callback: () => void): () => void {
  _reconnectListeners.add(callback);
  return () => {
    _reconnectListeners.delete(callback);
  };
}
