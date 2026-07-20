import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CategoryRow } from '@/components/settings/CategoryRow';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { IconSymbolName } from '@/components/IconSymbol';
import { useRestoreFocus } from '@/hooks/tv/useRestoreFocus';

const CATEGORIES: { icon: IconSymbolName; label: string; subtitle: string; route: string }[] = [
  { icon: 'lock.fill', label: 'Debrid', subtitle: 'Provider, API key', route: '/settings/debrid' },
  { icon: 'puzzlepiece.extension.fill', label: 'Addons', subtitle: 'Stream sources', route: '/settings/addons' },
  { icon: 'bell', label: 'Notifications', subtitle: 'New episode alerts', route: '/settings/notifications' },
  { icon: 'goforward', label: 'Continue watching', subtitle: 'Resume, autoplay, position', route: '/settings/continue-watching' },
  { icon: 'photo', label: 'Pre-play screen', subtitle: 'Landscape loading screen layout', route: '/settings/preplay' },
  { icon: 'sun.max.fill', label: 'Appearance', subtitle: 'Theme, discover layout, ratings', route: '/settings/appearance' },
  { icon: 'tv', label: 'Display Mode', subtitle: 'Mobile, TV, or automatic', route: '/settings/display-mode' },
  { icon: 'info.circle', label: 'Storage & about', subtitle: 'Cache, version', route: '/settings/storage' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { hasPreferredFocus, registerFocusable } = useRestoreFocus('settings');

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>

        <ThemedView style={settingsStyles.header}>
          <ThemedText type="title" style={settingsStyles.headerTitle}>Settings</ThemedText>
        </ThemedView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          {CATEGORIES.map((category, index) => (
            <CategoryRow
              key={category.route}
              icon={category.icon}
              label={category.label}
              subtitle={category.subtitle}
              onPress={() => router.push(category.route as any)}
              onFocus={() => registerFocusable(category.route)}
              isLast={index === CATEGORIES.length - 1}
              hasTVPreferredFocus={hasPreferredFocus(category.route, index === 0)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
