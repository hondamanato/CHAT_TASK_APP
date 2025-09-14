import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { colors, isDarkMode } = useTheme();
  const backgroundColor = isDarkMode ? (darkColor || colors.primaryBackground) : (lightColor || colors.primaryBackground);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
