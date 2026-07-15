import { StyleSheet, View, Modal, Pressable, ScrollView, useColorScheme, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { ThemedText } from './themed-text';
import { IconSymbol } from './IconSymbol';
import { Colors } from '@/constants/theme';
import { TorrentioStream, formatBytes } from '@/utils/streamHelpers';
import { useStreamActions } from '@/hooks/useStreamActions';
import { FileSelectionModal } from '@/components/FileSelectionModal';

interface TorrentModalProps {
  visible: boolean;
  onClose: () => void;
  options: TorrentioStream[];
  loading?: boolean;
  error?: string | null;
}

export function TorrentModal({ visible, onClose, options, loading, error }: TorrentModalProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { play, playExternal, copyUrl, download, resolvingId, fileSelection, setFileSelection, resolveAndPlay } = useStreamActions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getQualityBadge = (title: string) => {
    if (title.includes('2160p') || title.includes('4k') || title.includes('4K')) return '4K';
    if (title.includes('1080p')) return '1080p';
    if (title.includes('720p')) return '720p';
    if (title.includes('480p')) return '480p';
    return 'SD';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.backgroundElement }]} />
          </View>
          
          <View style={styles.header}>
            <ThemedText style={styles.title}>Select Stream</ThemedText>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <IconSymbol name="plus" color={colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} size={24} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.accent} />
              <ThemedText style={styles.loadingText}>Fetching streams...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <IconSymbol name="slash.circle" size={48} color="#ef4444" />
              <ThemedText style={[styles.loadingText, { color: '#ef4444' }]}>{error}</ThemedText>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.centerContent}>
              <IconSymbol name="slash.circle" size={48} color={colors.textSecondary} />
              <ThemedText style={styles.loadingText}>No streams found.</ThemedText>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {options.map((opt, idx) => {
                const uniqueId = `stream-${opt.infoHash || 'unknown'}-${idx}`;
                const isExpanded = expandedId === uniqueId;
                const quality = getQualityBadge(opt.title);
                
                return (
                  <View key={uniqueId} style={[styles.optionContainer, { backgroundColor: isExpanded ? colors.backgroundElement : 'transparent' }]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.optionRow,
                        { backgroundColor: pressed && !isExpanded ? colors.backgroundElement : 'transparent' },
                      ]}
                      onPress={() => toggleExpand(uniqueId)}
                    >
                      <View style={styles.optionLeft}>
                        <ThemedText style={styles.provider}>{opt.provider}</ThemedText>
                        <ThemedText style={styles.streamTitle} numberOfLines={1}>{opt.title}</ThemedText>
                        <View style={styles.metaContainer}>
                          <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
                            <ThemedText style={styles.badgeText}>{quality}</ThemedText>
                          </View>
                          <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                            {formatBytes(opt.size)}
                          </ThemedText>
                          {opt.isDirect ? (
                            <ThemedText style={[styles.metaText, { color: '#1db954' }]}>
                              • Direct
                            </ThemedText>
                          ) : (
                            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                              • P2P
                            </ThemedText>
                          )}
                        </View>
                      </View>
                      <IconSymbol 
                        name={isExpanded ? "chevron.up" : "chevron.down"} 
                        color={colors.textSecondary} 
                        size={20} 
                      />
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.actionsContainer}>
                        <Pressable 
                          style={[styles.actionBtn, { backgroundColor: colors.accent, opacity: resolvingId === opt.magnet ? 0.7 : 1 }]} 
                          onPress={() => play(opt.magnet)}
                          disabled={resolvingId === opt.magnet}
                        >
                          {resolvingId === opt.magnet ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <IconSymbol name="play.fill" color="#fff" size={16} />
                          )}
                          <ThemedText style={styles.actionBtnText}>
                            {resolvingId === opt.magnet ? 'Resolving...' : 'Play'}
                          </ThemedText>
                        </Pressable>
                        <Pressable style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => playExternal(opt.magnet)}>
                          <IconSymbol name="arrow.up.right.square" color="#fff" size={16} />
                          <ThemedText style={styles.actionBtnText}>External</ThemedText>
                        </Pressable>
                        <Pressable style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => copyUrl(opt.magnet)}>
                          <IconSymbol name="doc.on.doc" color={colors.text} size={16} />
                          <ThemedText style={[styles.actionBtnText, { color: colors.text }]}>
                            {opt.isDirect ? 'Copy Link' : 'Copy Magnet'}
                          </ThemedText>
                        </Pressable>
                        <Pressable style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => download(opt.magnet)}>
                          <IconSymbol name="arrow.down.circle" color={colors.text} size={16} />
                          <ThemedText style={[styles.actionBtnText, { color: colors.text }]}>Download</ThemedText>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* File Selection Overlay */}
      {fileSelection && (
        <FileSelectionModal
          visible={true}
          onClose={() => setFileSelection(null)}
          files={fileSelection.files}
          onSelectFile={(fileId) => {
            resolveAndPlay(fileSelection.torrentId, fileId, fileSelection.provider, fileSelection.apiKey);
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    paddingBottom: 40,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  optionContainer: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionLeft: {
    flex: 1,
    paddingRight: 16,
  },
  provider: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  streamTitle: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

