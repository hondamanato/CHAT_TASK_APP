import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  XMarkIcon,
  ChevronLeftIcon,
} from 'react-native-heroicons/outline';
import { TodayScheduleSheet } from './TodayScheduleSheet';
import { MainSettingsScreen } from './MainSettingsScreen';
import { HolidaySettingsScreen } from './HolidaySettingsScreen';

interface SettingsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const screenHeight = Dimensions.get('window').height;
const SHEET_HEIGHT = screenHeight * 0.9;
const CLOSE_THRESHOLD = 120;
const CLOSE_VELOCITY = 800;

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const [showTodaySchedule, setShowTodaySchedule] = useState(false);
  const [showHolidaySettings, setShowHolidaySettings] = useState(false);

  useEffect(() => {
    if (isVisible) {
      translateY.value = SHEET_HEIGHT;
      const timer = setTimeout(() => {
        translateY.value = withTiming(0, { duration: 300 });
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [isVisible]);

  // ヘッダー専用スワイプジェスチャー（ボトムシート全体を動かす）
  const headerGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const shouldClose = event.translationY > CLOSE_THRESHOLD || event.velocityY > CLOSE_VELOCITY;
      
      if (shouldClose) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));


  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchArea} />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: SHEET_HEIGHT,
            },
            animatedStyle,
          ]}
        >
          {/* ヘッダーエリア（スワイプでボトムシート全体を動かす） */}
          <GestureDetector gesture={headerGesture}>
            <View style={styles.headerArea}>
              {/* ハンドル */}
              <View style={styles.handle} />
              
              {/* ヘッダー */}
              <View style={styles.header}>
                {showHolidaySettings && (
                  <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => setShowHolidaySettings(false)}
                  >
                    <ChevronLeftIcon size={20} color="#000000" />
                  </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>
                  {showHolidaySettings ? '祝日設定' : '設定'}
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => {
                    translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, () => {
                      runOnJS(onClose)();
                    });
                  }}
                >
                  <XMarkIcon size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>

          {/* コンテンツエリア */}
          <View style={styles.content}>
            {showHolidaySettings ? (
              <HolidaySettingsScreen onBack={() => setShowHolidaySettings(false)} />
            ) : (
              <MainSettingsScreen onOpenHolidaySettings={() => setShowHolidaySettings(true)} />
            )}
          </View>

        </Animated.View>
      </View>

      {/* 今日の予定ボトムシート */}
      <TodayScheduleSheet
        isVisible={showTodaySchedule}
        onClose={() => setShowTodaySchedule(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  headerArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d1d6',
    borderRadius: 2,
    marginBottom: 16,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
    paddingBottom: 34,
  },
});