import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { IconSymbol } from '@/components/IconSymbol';
import { ThemedText } from '@/components/themed-text';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { SeekBar } from './SeekBar';

interface PlayerControlsProps {
  title: string;
  paused: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  accentColor: string;
  onTogglePlay: () => void;
  onSeekStart: () => void;
  onSeekEnd: (time: number) => void;
  onSkip: (deltaSeconds: number) => void;
  onBack: () => void;
  onShowAudioTracks: () => void;
  onShowSubtitles: () => void;
  onShowSettings: () => void;
  onEnterPiP?: () => void;
  onLock: () => void;
  onActivity?: () => void;
}

export function PlayerControls({
  title,
  paused,
  buffering,
  currentTime,
  duration,
  accentColor,
  onTogglePlay,
  onSeekStart,
  onSeekEnd,
  onSkip,
  onBack,
  onShowAudioTracks,
  onShowSubtitles,
  onShowSettings,
  onEnterPiP,
  onLock,
  onActivity,
}: PlayerControlsProps) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <LinearGradient colors={['rgba(0,0,0,0.85)', 'transparent']} style={styles.topGradient}>
        <View style={styles.topBar}>
          <FocusablePressable onPress={onBack} onFocus={onActivity} style={styles.iconButton} hitSlop={12} focusRingBorderRadius={22} accessibilityRole="button" accessibilityLabel="Back">
            <IconSymbol name="chevron.left" size={28} color="#fff" />
          </FocusablePressable>
          <ThemedText style={styles.titleText} numberOfLines={1}>{title}</ThemedText>
          <View style={styles.topBarActions}>
            {onEnterPiP && (
              <FocusablePressable onPress={onEnterPiP} onFocus={onActivity} style={styles.iconButton} hitSlop={10} focusRingBorderRadius={20} accessibilityRole="button" accessibilityLabel="Picture in picture">
                <IconSymbol name="pip" size={22} color="#fff" />
              </FocusablePressable>
            )}
            <FocusablePressable onPress={onShowSubtitles} onFocus={onActivity} style={styles.iconButton} hitSlop={10} focusRingBorderRadius={20} accessibilityRole="button" accessibilityLabel="Subtitles">
              <IconSymbol name="captions.bubble" size={22} color="#fff" />
            </FocusablePressable>
            <FocusablePressable onPress={onShowAudioTracks} onFocus={onActivity} style={styles.iconButton} hitSlop={10} focusRingBorderRadius={20} accessibilityRole="button" accessibilityLabel="Audio tracks">
              <IconSymbol name="waveform" size={22} color="#fff" />
            </FocusablePressable>
            <FocusablePressable onPress={onShowSettings} onFocus={onActivity} style={styles.iconButton} hitSlop={10} focusRingBorderRadius={20} accessibilityRole="button" accessibilityLabel="Playback settings">
              <IconSymbol name="gearshape.fill" size={22} color="#fff" />
            </FocusablePressable>
            <FocusablePressable onPress={onLock} onFocus={onActivity} style={styles.iconButton} hitSlop={10} focusRingBorderRadius={20} accessibilityRole="button" accessibilityLabel="Lock controls">
              <IconSymbol name="lock.open.fill" size={22} color="#fff" />
            </FocusablePressable>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.centerRow} pointerEvents="box-none">
        <FocusablePressable onPress={() => onSkip(-10)} onFocus={onActivity} style={styles.skipBtn} hitSlop={16} focusRingBorderRadius={24} accessibilityRole="button" accessibilityLabel="Skip back 10 seconds">
          <IconSymbol name="backward.end.fill" size={26} color="#fff" />
        </FocusablePressable>
        <FocusablePressable onPress={onTogglePlay} onFocus={onActivity} style={styles.playPauseBtn} hitSlop={16} hasTVPreferredFocus focusRingBorderRadius={42} accessibilityRole="button" accessibilityLabel={paused ? 'Play' : 'Pause'}>
          <IconSymbol name={paused ? 'play.fill' : 'pause'} size={40} color="#fff" />
        </FocusablePressable>
        <FocusablePressable onPress={() => onSkip(10)} onFocus={onActivity} style={styles.skipBtn} hitSlop={16} focusRingBorderRadius={24} accessibilityRole="button" accessibilityLabel="Skip forward 10 seconds">
          <IconSymbol name="forward.end.fill" size={26} color="#fff" />
        </FocusablePressable>
      </View>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.bottomGradient}>
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          accentColor={accentColor}
          onSeekStart={onSeekStart}
          onSeekEnd={onSeekEnd}
          onActivity={onActivity}
        />
        <View style={{ height: 20 }} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
  },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  centerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  skipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    justifyContent: 'flex-end',
  },
});
