/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useSettings } from '@/src/contexts/SettingsContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { isDarkMode } = useSettings();
  const theme = isDarkMode ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

// 追加のヘルパーフック
export function useTheme() {
  const { isDarkMode, darkModeEnabled, setDarkModeEnabled } = useSettings();
  return {
    isDarkMode,
    darkModeEnabled,
    setDarkModeEnabled,
    theme: isDarkMode ? 'dark' : 'light' as const,
    colors: Colors[isDarkMode ? 'dark' : 'light']
  };
}
