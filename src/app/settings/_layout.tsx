import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="debrid" />
      <Stack.Screen name="addons" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="playback" />
      <Stack.Screen name="continue-watching" />
      <Stack.Screen name="preplay" />
      <Stack.Screen name="gestures" />
      <Stack.Screen name="subtitles" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="storage" />
    </Stack>
  );
}
