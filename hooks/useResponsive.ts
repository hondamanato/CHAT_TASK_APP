import { useState, useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';

export interface ResponsiveDimensions {
  width: number;
  height: number;
  isTablet: boolean;
  isSmallDevice: boolean;
  scale: (size: number) => number;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
}

export const useResponsive = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState(() => {
    try {
      return Dimensions.get('window');
    } catch (error) {
      console.warn('Dimensions初期化エラー、デフォルト値を使用:', error);
      return { width: 375, height: 667, scale: 2, fontScale: 1 }; // iPhone SE のサイズをフォールバック
    }
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const responsive = useMemo(() => {
    const { width, height } = dimensions;
    const isTablet = width >= 768;
    const isSmallDevice = width < 375;

    return {
      width,
      height,
      isTablet,
      isSmallDevice,
      // スケーリング関数 - iPhone SE (375px) を基準に
      scale: (size: number) => Math.round((width / 375) * size),
      // 横幅に対する比率で計算
      wp: (percentage: number) => (width * percentage) / 100,
      // 高さに対する比率で計算
      hp: (percentage: number) => (height * percentage) / 100,
    };
  }, [dimensions]);

  return responsive;
};
