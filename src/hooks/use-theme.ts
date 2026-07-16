import { useAppTheme } from '@/contexts/ThemeContext';

export function useTheme() {
  return useAppTheme().colors;
}
