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
    // Solid, always-opaque backdrop — a translucent/gradient rail lets bright
    // hero backdrops bleed through and wash out to a whitish look, since
    // content renders directly behind this always-mounted overlay.
    <FocusSection style={[styles.rail, { backgroundColor: colors.background }]}>
      {visibleRoutes.map((route) => {
        const isActiveRoute = route.key === activeRoute.key;
        const options = descriptors[route.key]?.options;
        const label = typeof options?.title === 'string' ? options.title : route.name;

        return (
          <FocusablePressable
            key={route.key}
            style={styles.item}
            focusRingBorderRadius={12}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActiveRoute }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isActiveRoute && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            <View style={[styles.iconWrap, isActiveRoute && { backgroundColor: colors.accent }]}>
              <IconSymbol name={TAB_ICONS[route.name]} color={isActiveRoute ? colors.textOnAccent : colors.textSecondary} size={26} />
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
