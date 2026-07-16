import { Modal, StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { IconSymbol, IconSymbolName } from './IconSymbol';
import { useAppTheme } from '@/contexts/ThemeContext';

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
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
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
              </Pressable>
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
