import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface CircularRevealProps {
  isVisible: boolean;
  startX: number;
  startY: number;
  onAnimationComplete?: () => void;
  children: React.ReactNode;
  duration?: number;
}

export const CircularReveal: React.FC<CircularRevealProps> = ({
  isVisible,
  startX,
  startY,
  onAnimationComplete,
  children,
  duration = 400,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // 画面の対角線長さを計算（円が画面全体を覆うのに必要な半径）
  const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  
  useEffect(() => {
    if (isVisible) {
      // 開くアニメーション
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete?.();
      });
    } else {
      // 閉じるアニメーション
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: duration * 0.5,
          delay: duration * 0.3,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete?.();
      });
    }
  }, [isVisible, scaleAnim, opacityAnim, duration, onAnimationComplete]);

  if (!isVisible && (scaleAnim as any)._value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {/* 背景ブラー効果 */}
      <BlurView intensity={20} style={styles.backgroundBlur} />
      
      <Animated.View
        style={[
          styles.circle,
          {
            left: startX - maxRadius,
            top: startY - maxRadius,
            width: maxRadius * 2,
            height: maxRadius * 2,
            borderRadius: maxRadius,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backgroundBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default CircularReveal;