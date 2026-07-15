import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { IconSymbol } from '../IconSymbol';
import { ThemedText } from '../themed-text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlayerControlsProps {
  player: any; // expo-video player instance
  title: string;
  onBack: () => void;
  onShowAudioTracks: () => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  }
  return `${m}:${s < 10 ? '0' + s : s}`;
}

export function PlayerControls({ player, title, onBack, onShowAudioTracks }: PlayerControlsProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Poll player state every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (player) {
        setIsPlaying(player.playing);
        setCurrentTime(player.currentTime);
        if (player.duration > 0) setDuration(player.duration);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  const togglePlayPause = () => {
    if (player) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
      setIsPlaying(!player.playing);
    }
    resetControlsTimeout();
  };

  const handleScreenTap = () => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimeout();
    }
  };

  const seekbarPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    // Simple TouchableOpacity on the whole screen to toggle controls visibility
    <TouchableOpacity
      style={styles.container}
      onPress={handleScreenTap}
      activeOpacity={1}
    >
      {controlsVisible && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          {/* Top gradient + bar */}
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topGradient}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                <IconSymbol name="chevron.left" size={32} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.titleText} numberOfLines={1}>{title}</ThemedText>
              <TouchableOpacity onPress={onShowAudioTracks} style={styles.iconButton}>
                <IconSymbol name="waveform" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Center play/pause */}
          <View style={styles.centerContainer}>
            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseBtn}>
              <IconSymbol name={isPlaying ? 'pause' : 'play.fill'} size={64} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom gradient + scrubber */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient}>
            <View style={styles.bottomBar}>
              <ThemedText style={styles.timeText}>{formatTime(currentTime)}</ThemedText>
              <View style={styles.scrubberContainer}>
                <View style={styles.scrubberTrack}>
                  <View style={[styles.scrubberFill, { width: `${seekbarPercentage}%` }]} />
                  <View style={[styles.scrubberThumb, { left: `${seekbarPercentage}%` }]} />
                </View>
              </View>
              <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill as any,
    zIndex: 100,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  iconButton: {
    padding: 12,
  },
  titleText: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    width: 50,
    textAlign: 'center',
  },
  scrubberContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  scrubberTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.accent,
    marginLeft: -8,
  },
});
