import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ChevronLeftIcon,
} from 'react-native-heroicons/outline';
import { useNavigation } from '../contexts/NavigationContext';
import { useResponsive } from '@/hooks/useResponsive';

interface ScreenContainerProps {
  isVisible: boolean;
  onTransitionComplete?: () => void;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  isVisible,
  onTransitionComplete,
}) => {
  const { width: SCREEN_WIDTH } = useResponsive();
  const { currentScreen, previousScreen, canGoBack, pop } = useNavigation();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateX.value = withSpring(0, {
        damping: 50,
        stiffness: 400,
      }, () => {
        if (onTransitionComplete) {
          runOnJS(onTransitionComplete)();
        }
      });
    } else {
      translateX.value = withTiming(SCREEN_WIDTH, {
        duration: 300,
      });
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleBack = () => {
    translateX.value = withTiming(SCREEN_WIDTH, {
      duration: 300,
    }, () => {
      runOnJS(pop)();
    });
  };

  // 右スワイプで戻るジェスチャー
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0 && canGoBack) {
        translateX.value = Math.min(event.translationX, SCREEN_WIDTH);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SCREEN_WIDTH * 0.3 || event.velocityX > 500) {
        if (canGoBack) {
          runOnJS(handleBack)();
        }
      } else {
        translateX.value = withSpring(0, {
          damping: 50,
          stiffness: 400,
        });
      }
    });

  if (!currentScreen) return null;

  const CurrentScreenComponent = currentScreen.component;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
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
          
          <Text style={styles.headerTitle}>{currentScreen.title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* スクリーンコンテンツ */}
        <View style={styles.content}>
          <CurrentScreenComponent {...(currentScreen.props || {})} />
        </View>
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
});