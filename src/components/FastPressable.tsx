import React, { useCallback, useMemo } from 'react';
import { Pressable, PressableProps, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface FastPressableProps extends Omit<PressableProps, 'style' | 'onPress'> {
  style?: ViewStyle | ViewStyle[] | ((state: { pressed: boolean }) => ViewStyle);
  pressedStyle?: ViewStyle;
  onPress?: () => void;
  enableHaptics?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

export const FastPressable: React.FC<FastPressableProps> = ({
  style,
  pressedStyle,
  onPress,
  enableHaptics = true,
  hapticType = 'light',
  children,
  ...props
}) => {
  const hapticStyle = useMemo(() => {
    return hapticType === 'light'
      ? Haptics.ImpactFeedbackStyle.Light
      : hapticType === 'medium'
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Heavy;
  }, [hapticType]);

  const handlePress = useCallback(() => {
    onPress?.();

    if (enableHaptics && Platform.OS === 'ios') {
      Haptics.impactAsync(hapticStyle);
    }
  }, [onPress, enableHaptics, hapticStyle]);

  const getStyle = useCallback((pressed: boolean) => {
    const baseStyle = typeof style === 'function' ? style({ pressed }) : style;
    const combinedStyle = pressed && pressedStyle
      ? Array.isArray(baseStyle) ? [...baseStyle, pressedStyle] : [baseStyle, pressedStyle]
      : baseStyle;
    return combinedStyle;
  }, [style, pressedStyle]);

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      android_ripple={{
        color: 'rgba(0, 0, 0, 0.1)',
        borderless: false,
        radius: 20
      }}
      style={({ pressed }) => getStyle(pressed)}
    >
      {children}
    </Pressable>
  );
};