import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { useEventListener } from 'expo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { PlayerControls } from './PlayerControls';
import { AudioTracksModal } from './AudioTracksModal';

interface VideoPlayerProps {
  streamUrl: string;
  title?: string;
  poster?: string;
  onClose?: () => void;
}

export function VideoPlayer({ streamUrl, title, poster, onClose }: VideoPlayerProps) {
  const [showAudioTracks, setShowAudioTracks] = useState(false);

  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.play();
  });

  // Future architecture points:
  // - Track playback progress and save to AsyncStorage for "Continue Watching"
  // - Handle subtitle tracks (player.availableSubtitleTracks)
  // - Handle audio tracks (player.availableAudioTracks)
  // - Picture in Picture (player.supportsPictureInPicture)

  return (
    <GestureHandlerRootView style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={false}
        contentFit="contain"
      />
      
      <PlayerControls 
        player={player} 
        title={title || 'Unknown Title'} 
        onBack={onClose || (() => {})} 
        onShowAudioTracks={() => setShowAudioTracks(true)}
      />

      <AudioTracksModal 
        visible={showAudioTracks}
        onClose={() => setShowAudioTracks(false)}
        tracks={player?.availableAudioTracks || []}
        activeTrackId={player?.audioTrack?.id || null}
        onSelectTrack={(track) => {
          if (player) {
            player.audioTrack = track;
          }
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // True AMOLED black
  },
  video: {
    flex: 1,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSub: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});
