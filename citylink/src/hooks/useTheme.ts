import { useSystemStore } from '../store/SystemStore';
import { Colors, DarkColors } from '../theme';

export function useTheme() {
  const isDark = useSystemStore((s) => s.isDark);
  const lang = useSystemStore((s) => s.lang);
  const colors = isDark ? DarkColors : Colors;
  return { ...colors, isDark, lang };
}
