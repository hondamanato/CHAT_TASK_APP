import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ChevronLeftIcon,
} from 'react-native-heroicons/outline';
import { useNavigation, NavigationScreen } from '../contexts/NavigationContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScreenLayerProps {
  screen: NavigationScreen;
  index: number;
  isTop: boolean;
  totalScreens: number;
}

export const ScreenLayer: React.FC<ScreenLayerProps> = ({
  screen,
  index,
  isTop,
  totalScreens,
}) => {
  const { pop, stack } = useNavigation();
  const translateX = useSharedValue(index === 0 ? 0 : SCREEN_WIDTH);
  const opacity = useSharedValue(1);

  const previousScreen = index > 0 ? stack[index - 1] : null;
  const canGoBack = index > 0;

  useEffect(() => {
    if (index === 0) {
      // 初期画面は最初から表示
      translateX.value = 0;
    } else {
      // 新しい画面は右からスライドイン
      translateX.value = withSpring(0, {
        damping: 50,
        stiffness: 400,
      });
    }
  }, [index]);

  const handleBack = () => {
    if (!canGoBack) return;
    
    // 右にスライドアウト
    translateX.value = withTiming(SCREEN_WIDTH, {
      duration: 300,
    }, () => {
      runOnJS(pop)();
    });
  };

  // 右スワイプで戻るジェスチャー
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0 && canGoBack && isTop) {
        translateX.value = event.translationX;
        
        // 背景の透明度を調整（スワイプ中の視覚効果）
        const progress = Math.min(event.translationX / SCREEN_WIDTH, 1);
        opacity.value = 1 - progress * 0.3;
      }
    })
    .onEnd((event) => {
      if (!isTop || !canGoBack) return;
      
      const shouldPop = event.translationX > SCREEN_WIDTH * 0.3 || event.velocityX > 500;
      
      if (shouldPop) {
        // スワイプで戻る
        translateX.value = withTiming(SCREEN_WIDTH, {
          duration: 250,
        }, () => {
          runOnJS(pop)();
        });
      } else {
        // 元の位置に戻る
        translateX.value = withSpring(0, {
          damping: 50,
          stiffness: 400,
        });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // 下の画面は少し左にずらして立体感を演出
    const baseOffset = index === 0 ? 0 : interpolate(
      index,
      [0, totalScreens - 1],
      [0, -20]
    );

    return {
      transform: [{ translateX: translateX.value + baseOffset }],
      opacity: isTop ? opacity.value : 0.8,
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: isTop ? 0.3 : 0.1,
    elevation: isTop ? 10 : index * 2,
  }));

  const ScreenComponent = screen.component;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle, shadowStyle]}>
        {/* ヘッダー */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ChevronLeftIcon size={18} color="#007AFF" />
              <Text style={styles.backText}>
                {previousScreen?.title || '戻る'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          
          <Text style={styles.headerTitle}>{screen.title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* スクリーンコンテンツ */}
        <View style={styles.content}>
          <ScreenComponent {...(screen.props || {})} />
        </View>

        {/* 背景オーバーレイ（階層感を演出） */}
        {!isTop && <View style={styles.backgroundOverlay} />}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
    minHeight: 44,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
  },
  backButtonPlaceholder: {
    width: 60,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});