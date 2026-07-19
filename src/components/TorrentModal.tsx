import { StyleSheet, View, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { ThemedText } from './themed-text';
import { IconSymbol } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { TorrentioStream, formatBytes } from '@/utils/streamHelpers';
import { useStreamActions } from '@/hooks/useStreamActions';
import { FileSelectionModal } from '@/components/FileSelectionModal';
import { FocusablePressable } from '@/components/tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

interface TorrentModalProps {
  visible: boolean;
  onClose: () => void;
  options: TorrentioStream[];
  cachedHashes?: Set<string>;
  loading?: boolean;
  error?: string | null;
  contentTitle?: string;
  contentPoster?: string;
  contentBackdrop?: string;
  contentId?: string;
}

export function TorrentModal({ visible, onClose, options, cachedHashes, loading, error, contentTitle, contentPoster, contentBackdrop, contentId }: TorrentModalProps) {
  const { colors } = useAppTheme();
  const { play, playExternal, copyUrl, download, resolvingId, fileSelection, setFileSelection, resolveAndPlay } = useStreamActions({
    title: contentTitle,
    poster: contentPoster,
    backdrop: contentBackdrop,
    contentId,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>('All');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const sources = Array.from(new Set(options.map((o) => o.addonName || 'Unknown')));
  const filteredOptions = activeSource === 'All' ? options : options.filter((o) => (o.addonName || 'Unknown') === activeSource);

  useEffect(() => {
    if (visible) setActiveSource('All');
  }, [visible]);

  // Split into three mutually-exclusive handlers (only one is ever `enabled`
  // at a time based on state) instead of one hand-rolled if-priority chain —
  // each handler only registers a listener when its own concern is active,
  // so there's no reliance on RN's BackHandler LIFO ordering to get this right.
  useTVBackHandler(() => setFileSelection(null), visible && !!fileSelection);
  useTVBackHandler(() => setExpandedId(null), visible && !fileSelection && !!expandedId);
  useTVBackHandler(onClose, visible && !fileSelection && !expandedId);

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
            <FocusablePressable onPress={onClose} style={styles.closeBtn} focusRingBorderRadius={16} accessibilityRole="button" accessibilityLabel="Close">
              <IconSymbol name="plus" color={colors.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} size={24} />
            </FocusablePressable>
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
            <>
              {sources.length > 0 && (
                <View style={styles.sourceSection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sourceRow}
                  >
                    {['All', ...sources].map((source) => {
                      const isActive = activeSource === source;
                      const count = source === 'All' ? options.length : options.filter((o) => (o.addonName || 'Unknown') === source).length;
                      return (
                        <FocusablePressable
                          key={source}
                          style={[
                            styles.sourcePill,
                            {
                              backgroundColor: isActive ? colors.accent : 'transparent',
                              borderColor: isActive ? colors.accent : colors.backgroundSelected,
                            },
                          ]}
                          onPress={() => setActiveSource(source)}
                          focusRingBorderRadius={20}
                          accessibilityRole="button"
                          accessibilityLabel={`Filter by ${source}`}
                          accessibilityState={{ selected: isActive }}
                        >
                          <ThemedText
                            style={[
                              styles.sourcePillText,
                              { color: isActive ? colors.textOnAccent : colors.text },
                            ]}
                          >
                            {source}
                          </ThemedText>
                          <View
                            style={[
                              styles.sourceCountBadge,
                              { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.backgroundSelected },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.sourceCountText,
                                { color: isActive ? colors.textOnAccent : colors.textSecondary },
                              ]}
                            >
                              {count}
                            </ThemedText>
                          </View>
                        </FocusablePressable>
                      );
                    })}
                  </ScrollView>
                  <View style={[styles.sourceDivider, { backgroundColor: colors.backgroundSelected }]} />
                </View>
              )}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {filteredOptions.map((opt, idx) => {
                const uniqueId = `stream-${opt.infoHash || 'unknown'}-${idx}`;
                const isExpanded = expandedId === uniqueId;
                const isCached = !!opt.infoHash && !!cachedHashes?.has(opt.infoHash.toLowerCase());

                const badges: { text: string; color?: string }[] = [];
                if (opt.quality) badges.push({ text: opt.quality, color: colors.accent });
                if (opt.dolbyVision) badges.push({ text: 'Dolby Vision', color: '#8b5cf6' });
                if (opt.hdr) badges.push({ text: opt.hdr, color: '#f5a623' });
                if (opt.is3D) badges.push({ text: '3D' });
                if (opt.codec) badges.push({ text: opt.codec });
                if (opt.bitDepth) badges.push({ text: opt.bitDepth });
                if (opt.source) badges.push({ text: opt.source });

                const metaParts: string[] = [];
                if (opt.size) metaParts.push(formatBytes(opt.size));
                if (opt.seeders != null) metaParts.push(`👤 ${opt.seeders}`);
                if (opt.audio) metaParts.push(opt.audio);
                if (opt.provider) metaParts.push(opt.provider);
                if (opt.releaseGroup) metaParts.push(opt.releaseGroup);
                if (opt.languages.length) metaParts.push(opt.languages.join(' '));

                return (
                  <View key={uniqueId} style={[styles.optionContainer, { backgroundColor: isExpanded ? colors.backgroundElement : 'transparent' }]}>
                    <FocusablePressable
                      style={({ pressed }) => [
                        styles.optionRow,
                        { backgroundColor: pressed && !isExpanded ? colors.backgroundElement : 'transparent' },
                      ]}
                      onPress={() => toggleExpand(uniqueId)}
                      hasTVPreferredFocus={idx === 0}
                      focusRingBorderRadius={10}
                      focusRingScale={false}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={opt.title}
                    >
                      <View style={styles.optionLeft}>
                        <View style={styles.titleRow}>
                          {isCached && (
                            <IconSymbol name="flame.fill" color="#f97316" size={16} style={styles.fireIcon} />
                          )}
                          <ThemedText style={styles.streamTitle} numberOfLines={2}>{opt.title}</ThemedText>
                        </View>
                        {badges.length > 0 && (
                          <View style={styles.metaContainer}>
                            {badges.map((badge, i) => (
                              <View
                                key={i}
                                style={[styles.badge, { backgroundColor: badge.color ? badge.color + '33' : colors.backgroundSelected }]}
                              >
                                <ThemedText style={[styles.badgeText, badge.color ? { color: badge.color } : undefined]}>
                                  {badge.text}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        )}
                        {metaParts.length > 0 && (
                          <ThemedText style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {metaParts.join('  •  ')}
                          </ThemedText>
                        )}
                      </View>
                      <IconSymbol
                        name={isExpanded ? "chevron.up" : "chevron.down"}
                        color={colors.textSecondary}
                        size={20}
                      />
                    </FocusablePressable>

                    {isExpanded && (
                      <View style={styles.actionsContainer}>
                        <FocusablePressable
                          style={[styles.actionBtn, { backgroundColor: colors.accent, opacity: resolvingId === opt.magnet ? 0.7 : 1 }]}
                          onPress={() => play(opt.magnet)}
                          disabled={resolvingId === opt.magnet}
                          hasTVPreferredFocus
                          focusRingBorderRadius={8}
                          focusRingScale={false}
                          accessibilityRole="button"
                          accessibilityLabel="Play"
                        >
                          {resolvingId === opt.magnet ? (
                            <ActivityIndicator size="small" color={colors.textOnAccent} />
                          ) : (
                            <IconSymbol name="play.fill" color={colors.textOnAccent} size={16} />
                          )}
                          <ThemedText style={[styles.actionBtnText, { color: colors.textOnAccent }]}>
                            {resolvingId === opt.magnet ? 'Resolving...' : 'Play'}
                          </ThemedText>
                        </FocusablePressable>
                        <FocusablePressable style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => playExternal(opt.magnet)} focusRingBorderRadius={8} focusRingScale={false} accessibilityRole="button" accessibilityLabel="Play externally">
                          <IconSymbol name="arrow.up.right.square" color="#fff" size={16} />
                          <ThemedText style={styles.actionBtnText}>External</ThemedText>
                        </FocusablePressable>
                        <FocusablePressable style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => copyUrl(opt.magnet)} focusRingBorderRadius={8} focusRingScale={false} accessibilityRole="button" accessibilityLabel={opt.isDirect ? 'Copy link' : 'Copy magnet'}>
                          <IconSymbol name="doc.on.doc" color={colors.text} size={16} />
                          <ThemedText style={[styles.actionBtnText, { color: colors.text }]}>
                            {opt.isDirect ? 'Copy Link' : 'Copy Magnet'}
                          </ThemedText>
                        </FocusablePressable>
                        <FocusablePressable style={[styles.actionBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => download(opt.magnet)} focusRingBorderRadius={8} focusRingScale={false} accessibilityRole="button" accessibilityLabel="Download">
                          <IconSymbol name="arrow.down.circle" color={colors.text} size={16} />
                          <ThemedText style={[styles.actionBtnText, { color: colors.text }]}>Download</ThemedText>
                        </FocusablePressable>
                      </View>
                    )}
                  </View>
                );
              })}
              </ScrollView>
            </>
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
            resolveAndPlay(fileSelection.torrentId, fileId, fileSelection.provider, fileSelection.apiKey, fileSelection.sourceKey);
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
  sourceSection: {
    marginBottom: 10,
  },
  sourceRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
  },
  sourcePillText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  sourceCountBadge: {
    height: 18,
    minWidth: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  sourceCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
    includeFontPadding: false,
    textAlign: 'center',
  },
  sourceDivider: {
    height: 1,
    marginTop: 10,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fireIcon: {
    marginRight: 4,
    marginTop: 1,
  },
  streamTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    flex: 1,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 6,
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

