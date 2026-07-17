import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Platform } from 'react-native';

const DEVICE_MODE_KEY = 'settings:device_mode';

export type DeviceModePreference = 'mobile' | 'tv' | 'auto';
export type EffectiveDeviceMode = 'mobile' | 'tv';
const DEFAULT_PREFERENCE: DeviceModePreference = 'auto';

function detectPhysicalTV(): boolean {
  if (Platform.isTV) return true;
  return Device.deviceType === Device.DeviceType.TV;
}

interface DeviceModeContextValue {
  preference: DeviceModePreference;
  setPreference: (value: DeviceModePreference) => void;
  effectiveMode: EffectiveDeviceMode;
  isPhysicalTV: boolean;
}

const isPhysicalTV = detectPhysicalTV();

const DeviceModeContext = createContext<DeviceModeContextValue>({
  preference: DEFAULT_PREFERENCE,
  setPreference: () => {},
  effectiveMode: isPhysicalTV ? 'tv' : 'mobile',
  isPhysicalTV,
});

export function DeviceModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<DeviceModePreference>(DEFAULT_PREFERENCE);

  useEffect(() => {
    AsyncStorage.getItem(DEVICE_MODE_KEY).then((value) => {
      if (value === 'mobile' || value === 'tv' || value === 'auto') {
        setPreferenceState(value);
      }
    });
  }, []);

  const setPreference = (value: DeviceModePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(DEVICE_MODE_KEY, value);
  };

  const effectiveMode: EffectiveDeviceMode = useMemo(() => {
    if (preference === 'auto') return isPhysicalTV ? 'tv' : 'mobile';
    return preference;
  }, [preference]);

  return (
    <DeviceModeContext.Provider value={{ preference, setPreference, effectiveMode, isPhysicalTV }}>
      {children}
    </DeviceModeContext.Provider>
  );
}

export function useDeviceMode() {
  return useContext(DeviceModeContext);
}

export function useIsTV() {
  return useContext(DeviceModeContext).effectiveMode === 'tv';
}
