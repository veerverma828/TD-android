import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';

import { useAppTheme } from '@/contexts/ThemeContext';
import { useIsTV } from '@/contexts/DeviceModeContext';
import { TVTabBar, TV_RAIL_WIDTH } from '@/components/TVTabBar';

// Routes that live inside the Tabs navigator (for `href: null` screens) but must
// render fully immersive, with no tab bar chrome at all — not just hidden from the tab row.
const NO_TAB_BAR_ROUTES = new Set(['player', 'preplay']);

export default function AppTabs() {
  const { colors } = useAppTheme();
  const isTV = useIsTV();

  return (
    <Tabs
      tabBar={isTV ? (props) => <TVTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        // The TV rail is absolute-positioned; inset every non-immersive screen
        // so content doesn't render underneath it.
        sceneStyle: isTV && !NO_TAB_BAR_ROUTES.has(route.name)
          ? { paddingLeft: TV_RAIL_WIDTH }
          : undefined,
        tabBarStyle: isTV || NO_TAB_BAR_ROUTES.has(route.name)
          ? { display: 'none' }
          : {
              backgroundColor: colors.background,
              borderTopColor: colors.backgroundElement,
              elevation: 0, // Android shadow
              shadowOpacity: 0, // iOS shadow
            },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      })}>
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
      <Tabs.Screen
        name="preplay"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
