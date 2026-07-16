import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CategoryRow } from '@/components/settings/CategoryRow';
import { settingsStyles } from '@/components/settings/settingsStyles';
import { IconSymbolName } from '@/components/IconSymbol';

const CATEGORIES: { icon: IconSymbolName; label: string; subtitle: string; route: string }[] = [
  { icon: 'lock.fill', label: 'Debrid', subtitle: 'Provider, API key', route: '/settings/debrid' },
  { icon: 'play.rectangle.fill', label: 'Playback', subtitle: 'Speed, resize, buffering, orientation', route: '/settings/playback' },
  { icon: 'goforward', label: 'Continue watching', subtitle: 'Resume, autoplay, position', route: '/settings/continue-watching' },
  { icon: 'photo', label: 'Pre-play screen', subtitle: 'Landscape loading screen layout', route: '/settings/preplay' },
  { icon: 'hand.tap', label: 'Gestures', subtitle: 'Swipe and tap controls', route: '/settings/gestures' },
  { icon: 'captions.bubble', label: 'Subtitles', subtitle: 'Font, color, background', route: '/settings/subtitles' },
  { icon: 'sun.max.fill', label: 'Appearance', subtitle: 'Theme, discover layout, ratings', route: '/settings/appearance' },
  { icon: 'info.circle', label: 'Storage & about', subtitle: 'Cache, version', route: '/settings/storage' },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ThemedView style={settingsStyles.container}>
      <SafeAreaView edges={['top']} style={settingsStyles.safeArea}>

        <ThemedView style={settingsStyles.header}>
          <ThemedText type="title" style={settingsStyles.headerTitle}>Settings</ThemedText>
        </ThemedView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStyles.scrollContent}>
          {CATEGORIES.map((category) => (
            <CategoryRow
              key={category.route}
              icon={category.icon}
              label={category.label}
              subtitle={category.subtitle}
              onPress={() => router.push(category.route as any)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
