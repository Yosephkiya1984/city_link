import { useAppStore } from '../store/AppStore';
import { Colors, DarkColors } from '../theme';

export function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  const colors = isDark ? DarkColors : Colors;
  return { ...colors, isDark };
}
