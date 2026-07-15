import { StyleSheet, View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';
import { IconSymbol } from '../IconSymbol';
import { Colors } from '@/constants/theme';

interface AudioTracksModalProps {
  visible: boolean;
  onClose: () => void;
  tracks: any[]; // Using any to be safe against expo-video version differences, but we expect an array of tracks
  activeTrackId: string | null;
  onSelectTrack: (track: any) => void;
}

export function AudioTracksModal({ visible, onClose, tracks, activeTrackId, onSelectTrack }: AudioTracksModalProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Pressable>
        
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            
            <View style={styles.header}>
              <ThemedText style={styles.title}>Audio Tracks</ThemedText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            {tracks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={{ color: colors.textSecondary }}>No additional audio tracks found.</ThemedText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {tracks.map((track, idx) => {
                  const trackName = track.name || track.language || `Track ${idx + 1}`;
                  const isSelected = track.id === activeTrackId || (activeTrackId === null && idx === 0);

                  return (
                    <Pressable
                      key={track.id || idx.toString()}
                      style={({ pressed }) => [
                        styles.trackItem,
                        { backgroundColor: isSelected ? colors.backgroundSelected : colors.backgroundElement },
                        pressed && { opacity: 0.7 }
                      ]}
                      onPress={() => {
                        onSelectTrack(track);
                        onClose();
                      }}
                    >
                      <View style={styles.trackInfo}>
                        <ThemedText style={[styles.trackName, isSelected && { color: colors.accent }]}>
                          {trackName}
                        </ThemedText>
                      </View>
                      {isSelected && (
                        <IconSymbol name="play.fill" size={20} color={colors.accent} />
                      )}
                    </Pressable>
                  );
                })}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}

          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '70%',
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  trackInfo: {
    flex: 1,
    marginRight: 16,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '500',
  },
});
