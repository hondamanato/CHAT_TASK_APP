/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // 基本色
    primaryText: '#000000',
    secondaryText: '#8e8e93',
    disabledText: '#c7c7cc',
    // 背景色
    primaryBackground: '#ffffff',
    secondaryBackground: '#f2f2f7',
    surfaceBackground: '#ffffff',
    modalBackground: 'rgba(0, 0, 0, 0.5)',
    // ボーダー・区切り線
    border: '#e5e5e7',
    separator: '#e5e5e7',
    // ボタン・インタラクティブ要素
    buttonPrimary: '#007AFF',
    buttonSecondary: '#f2f2f7',
    buttonDanger: '#ef4444',
    // AI関連
    accentColor: '#34C759',
    // その他
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.3)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // 基本色
    primaryText: '#ffffff',
    secondaryText: '#8e8e93',
    disabledText: '#48484a',
    // 背景色
    primaryBackground: '#151718',
    secondaryBackground: '#1c1c1e',
    surfaceBackground: '#2c2c2e',
    modalBackground: 'rgba(0, 0, 0, 0.7)',
    // ボーダー・区切り線
    border: '#38383a',
    separator: '#38383a',
    // ボタン・インタラクティブ要素
    buttonPrimary: '#0a84ff',
    buttonSecondary: '#2c2c2e',
    buttonDanger: '#ff453a',
    // AI関連
    accentColor: '#30D158',
    // その他
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};
