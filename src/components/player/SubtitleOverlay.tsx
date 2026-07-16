import { StyleSheet, Text, View } from 'react-native';
import type { SubtitleAppearance } from '@/contexts/PlayerSettingsContext';
import type { SubtitleCue } from '@/utils/subtitleParser';
import { findActiveCue } from '@/utils/subtitleParser';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  appearance: SubtitleAppearance;
  bottomOffset: number;
}

export function SubtitleOverlay({ cues, currentTime, appearance, bottomOffset }: SubtitleOverlayProps) {
  const cue = findActiveCue(cues, currentTime);
  if (!cue) return null;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="none">
      <Text
        style={[
          styles.text,
          {
            fontSize: appearance.fontSize,
            color: appearance.color,
            backgroundColor: `rgba(0,0,0,${appearance.backgroundOpacity})`,
          },
        ]}
      >
        {cue.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
});
