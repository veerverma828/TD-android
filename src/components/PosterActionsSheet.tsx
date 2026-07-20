import { Modal, StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { IconSymbol, IconSymbolName } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';
import { FocusablePressable } from './tv/FocusablePressable';
import { useTVBackHandler } from '@/hooks/tv/useTVBackHandler';

export interface PosterAction {
  label: string;
  icon: IconSymbolName;
  destructive?: boolean;
  onPress: () => void;
}

interface PosterActionsSheetProps {
  visible: boolean;
  title?: string;
  actions: PosterAction[];
  onClose: () => void;
}

export function PosterActionsSheet({ visible, title, actions, onClose }: PosterActionsSheetProps) {
  const scheme = useColorScheme();
  const { colors } = useAppTheme();

  useTVBackHandler(() => {
    if (!visible) return false;
    onClose();
  }, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Pressable>

        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            {title && (
              <ThemedText numberOfLines={1} style={styles.title}>
                {title}
              </ThemedText>
            )}
            {actions.map((action, index) => (
              <FocusablePressable
                key={action.label}
                onPress={() => {
                  onClose();
                  // Defer to next tick: firing action.onPress() synchronously can open
                  // another RN <Modal> (e.g. file selection) while this sheet's Modal is
                  // still mid-dismiss, which on Android silently fails to surface it.
                  setTimeout(() => action.onPress(), 0);
                }}
                hasTVPreferredFocus={index === 0}
                focusRingBorderRadius={10}
                focusRingScale={false}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? colors.backgroundElement : 'transparent' },
                ]}
              >
                <IconSymbol
                  name={action.icon}
                  size={20}
                  color={action.destructive ? '#ff5c5c' : colors.text}
                />
                <ThemedText style={[styles.rowLabel, { color: action.destructive ? '#ff5c5c' : colors.text }]}>
                  {action.label}
                </ThemedText>
              </FocusablePressable>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    justifyContent: 'flex-end',
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
