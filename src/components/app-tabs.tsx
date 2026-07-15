import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          elevation: 0, // Android shadow
          shadowOpacity: 0, // iOS shadow
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="house.fill" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="magnifyingglass" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="bookmark.fill" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="gearshape.fill" color={color} size={24} />
          ),
        }}
      />
      
      {/* Hide non-tab screens */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="details"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="see-all"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="player"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
