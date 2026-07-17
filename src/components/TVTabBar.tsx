import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { IconSymbol, IconSymbolName } from '@/components/IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { FocusSection } from '@/components/tv/FocusSection';

const TAB_ICONS: Record<string, IconSymbolName> = {
  index: 'house.fill',
  search: 'magnifyingglass',
  library: 'bookmark.fill',
  settings: 'gearshape.fill',
};

const NO_TAB_BAR_ROUTES = new Set(['player', 'preplay']);

export const TV_RAIL_WIDTH = 84;

export function TVTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const activeRoute = state.routes[state.index];

  if (NO_TAB_BAR_ROUTES.has(activeRoute.name)) return null;

  const visibleRoutes = state.routes.filter((route) => route.name in TAB_ICONS);

  return (
    <FocusSection style={[styles.rail, { backgroundColor: colors.background + 'e6', borderRightColor: colors.backgroundElement }]}>
      {visibleRoutes.map((route) => {
        const focused = route.key === activeRoute.key;
        const options = descriptors[route.key]?.options;
        const label = typeof options?.title === 'string' ? options.title : route.name;

        return (
          <FocusablePressable
            key={route.key}
            style={styles.item}
            focusRingBorderRadius={12}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            <View style={[styles.iconWrap, focused && { backgroundColor: colors.backgroundElement }]}>
              <IconSymbol name={TAB_ICONS[route.name]} color={focused ? colors.accent : colors.textSecondary} size={26} />
            </View>
          </FocusablePressable>
        );
      })}
    </FocusSection>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: TV_RAIL_WIDTH,
    paddingTop: 48,
    alignItems: 'center',
    gap: 20,
    borderRightWidth: 1,
    zIndex: 20,
  },
  item: {
    width: 56,
    height: 56,
  },
  iconWrap: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
