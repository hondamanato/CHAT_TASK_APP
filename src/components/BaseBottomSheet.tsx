import React, { useRef, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { XMarkIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';

interface BaseBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  height?: number; // 画面に対する割合 (0.4 = 40%)
  title?: string;
  children: ReactNode;
  enableSwipeDown?: boolean;
  showCloseButton?: boolean;
  showHandle?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  backgroundColor?: string;
  overlayOpacity?: number;
  disableSwipeWhenScrollAtTop?: boolean; // スクロール位置によってスワイプを制御
  onScrollViewAtTopChange?: (atTop: boolean) => void; // スクロール位置の変更通知
}

const { height: screenHeight } = Dimensions.get('window');

// 統一されたアニメーション設定
const ANIMATION_CONFIG = {
  duration: 300,
  damping: 20,
  stiffness: 300,
};

// 統一されたジェスチャー設定
const GESTURE_CONFIG = {
  closeThreshold: 100,
  closeVelocity: 500,
};

export const BaseBottomSheet: React.FC<BaseBottomSheetProps> = ({
  isVisible,
  onClose,
  height = 0.5, // デフォルト50%
  title,
  children,
  enableSwipeDown = true,
  showCloseButton = true,
  showHandle = true,
  showBackButton = false,
  onBackPress,
  backgroundColor = '#FFFFFF',
  overlayOpacity = 0.5,
  disableSwipeWhenScrollAtTop = false,
  onScrollViewAtTopChange,
}) => {
  const { colors } = useTheme();
  const sheetHeight = screenHeight * height;
  const translateY = useSharedValue(sheetHeight);
  const overlayOpacity_ = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // 開く
      translateY.value = sheetHeight;
      overlayOpacity_.value = 0;
      
      // 即座にアニメーション開始（遅延なし）
      translateY.value = withTiming(0, {
        duration: ANIMATION_CONFIG.duration,
      });
      overlayOpacity_.value = withTiming(overlayOpacity, {
        duration: ANIMATION_CONFIG.duration,
      });
    } else {
      // 閉じる
      translateY.value = withTiming(sheetHeight, {
        duration: ANIMATION_CONFIG.duration,
      });
      overlayOpacity_.value = withTiming(0, {
        duration: ANIMATION_CONFIG.duration,
      });
    }
  }, [isVisible, sheetHeight, overlayOpacity]);

  const closeSheet = () => {
    translateY.value = withTiming(sheetHeight, {
      duration: ANIMATION_CONFIG.duration,
    });
    overlayOpacity_.value = withTiming(0, {
      duration: ANIMATION_CONFIG.duration,
    });
    
    setTimeout(() => {
      onClose();
    }, ANIMATION_CONFIG.duration);
  };

  // スワイプジェスチャー
  const panGesture = Gesture.Pan()
    .enabled(enableSwipeDown && !(disableSwipeWhenScrollAtTop))
    .onChange((event) => {
      if (event.translationY > 0) {
        // 下方向への通常のスワイプ
        translateY.value = event.translationY;
        // オーバーレイの透明度も連動
        const progress = Math.max(0, Math.min(1, event.translationY / sheetHeight));
        overlayOpacity_.value = overlayOpacity * (1 - progress * 0.5);
      } else {
        // 上方向のスワイプ（バウンス効果）
        const resistance = 0.3; // 抵抗係数（0-1, 小さいほど抵抗が強い）
        translateY.value = event.translationY * resistance;
      }
    })
    .onEnd((event) => {
      const shouldClose = 
        event.translationY > GESTURE_CONFIG.closeThreshold || 
        event.velocityY > GESTURE_CONFIG.closeVelocity;

      if (shouldClose) {
        runOnJS(closeSheet)();
      } else {
        // 元の位置に戻す（バウンス効果付き）
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 400,
        });
        overlayOpacity_.value = withTiming(overlayOpacity, {
          duration: ANIMATION_CONFIG.duration,
        });
      }
    });

  // アニメーションスタイル
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity_.value,
  }));

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* オーバーレイ */}
        <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <View style={styles.overlayTouchable} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* ボトムシート */}
        <GestureDetector gesture={enableSwipeDown ? panGesture : Gesture.Pan()}>
          <Animated.View
            style={[
              styles.sheet,
              {
                height: sheetHeight + 20,
                backgroundColor: colors.primaryBackground,
              },
              animatedSheetStyle,
            ]}
          >
            {/* ハンドルバー */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.disabledText }]} />
              </View>
            )}

            {/* ヘッダー */}
            {title && (
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                {showBackButton && (
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBackPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ChevronLeftIcon size={20} color={colors.primaryText} />
                  </TouchableOpacity>
                )}
                <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
              </View>
            )}

            {/* コンテンツ */}
            <View style={styles.content}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});