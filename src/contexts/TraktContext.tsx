import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import * as traktService from '@/services/traktService';
import { DeviceAuthResult } from '@/services/traktService';

export type TraktAuthStatus = 'idle' | 'pending' | 'success' | 'expired' | 'denied' | 'error';

interface DeviceAuthState {
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
}

interface TraktContextValue {
  connected: boolean;
  connecting: boolean;
  username: string | null;
  deviceAuth: DeviceAuthState | null;
  authStatus: TraktAuthStatus;
  authError: string | null;
  startAuth: () => Promise<void>;
  cancelAuth: () => void;
  disconnect: () => Promise<void>;
}

const TraktContext = createContext<TraktContextValue>({
  connected: false,
  connecting: false,
  username: null,
  deviceAuth: null,
  authStatus: 'idle',
  authError: null,
  startAuth: async () => {},
  cancelAuth: () => {},
  disconnect: async () => {},
});

export function TraktProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthState | null>(null);
  const [authStatus, setAuthStatus] = useState<TraktAuthStatus>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    traktService.isConnected().then((isConnected) => {
      setConnected(isConnected);
      if (isConnected) {
        traktService.getUserProfile().then((profile) => {
          if (profile) setUsername(profile.username);
        });
      }
    });
  }, []);

  // The service layer can disconnect on its own (a request finds the refresh
  // token dead) — without this, "Connected" would keep showing forever after
  // a silent, un-recoverable session expiry.
  useEffect(() => {
    return traktService.onDisconnected(() => {
      setConnected(false);
      setUsername(null);
    });
  }, []);

  const startAuth = useCallback(async () => {
    if (!traktService.isTraktConfigured()) {
      setAuthStatus('error');
      setAuthError("Trakt isn't set up yet.");
      return;
    }

    setConnecting(true);
    setAuthError(null);
    try {
      const device = await traktService.startDeviceAuth();
      setDeviceAuth({
        userCode: device.userCode,
        verificationUrl: device.verificationUrl,
        expiresIn: device.expiresIn,
      });
      setAuthStatus('pending');

      const { promise, cancel } = traktService.pollDeviceToken(device.deviceCode, device.interval, device.expiresIn);
      cancelRef.current = cancel;
      const result: DeviceAuthResult = await promise;
      cancelRef.current = null;

      if (result === 'success') {
        setAuthStatus('success');
        setDeviceAuth(null);
        setConnected(true);
        const profile = await traktService.getUserProfile();
        if (profile) setUsername(profile.username);
      } else if (result === 'expired') {
        setAuthStatus('expired');
        setAuthError('The Trakt activation code expired. Try connecting again.');
        setDeviceAuth(null);
      } else if (result === 'denied') {
        setAuthStatus('denied');
        setAuthError('Trakt authorization was denied.');
        setDeviceAuth(null);
      }
    } catch (err: any) {
      setAuthStatus('error');
      setAuthError(err?.message || 'Failed to connect to Trakt.');
      setDeviceAuth(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const cancelAuth = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setDeviceAuth(null);
    setAuthStatus('idle');
    setConnecting(false);
  }, []);

  const disconnect = useCallback(async () => {
    await traktService.disconnect();
    setConnected(false);
    setUsername(null);
    setDeviceAuth(null);
    setAuthStatus('idle');
    setAuthError(null);
  }, []);

  return (
    <TraktContext.Provider
      value={{ connected, connecting, username, deviceAuth, authStatus, authError, startAuth, cancelAuth, disconnect }}
    >
      {children}
    </TraktContext.Provider>
  );
}

export function useTrakt() {
  return useContext(TraktContext);
}
