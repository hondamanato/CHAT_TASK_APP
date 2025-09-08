import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  XMarkIcon,
  BellIcon,
  ClockIcon,
  CalendarIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';

interface TodayScheduleSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.5; // 画面の50%
const CLOSE_THRESHOLD = 80;
const CLOSE_VELOCITY = 600;

export const TodayScheduleSheet: React.FC<TodayScheduleSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const scrollViewRef = useRef<ScrollView>(null);
  const [todayScheduleNotification, setTodayScheduleNotification] = useState(true);
  const [noScheduleNotification, setNoScheduleNotification] = useState(false);
  const [participatingOnly, setParticipatingOnly] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date(2024, 0, 1, 8, 0)); // 8:00 AM

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setNotificationTime(selectedTime);
    }
  };

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

  const headerGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      
      if (translationY > CLOSE_THRESHOLD || velocityY > CLOSE_VELOCITY) {
        translateY.value = withSpring(SHEET_HEIGHT, {
          velocity: velocityY,
          damping: 25,
          stiffness: 120,
        }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, {
          velocity: velocityY,
          damping: 25,
          stiffness: 120,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={() => {
          translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, () => {
            runOnJS(onClose)();
          });
        }}>
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
          <GestureDetector gesture={headerGesture}>
            <View style={styles.headerArea}>
              <View style={styles.handle} />
              
              <View style={styles.header}>
                <Text style={styles.headerTitle}>今日の予定</Text>
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

          <ScrollView 
            ref={scrollViewRef}
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={true}
          >
            <View style={styles.section}>
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <CalendarIcon size={20} color="#000000" />
                  <Text style={styles.settingItemText}>今日の予定を通知</Text>
                </View>
                <Switch
                  value={todayScheduleNotification}
                  onValueChange={setTodayScheduleNotification}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={todayScheduleNotification ? '#007AFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <ExclamationTriangleIcon size={20} color="#000000" />
                  <Text style={styles.settingItemText}>予定のない日も通知</Text>
                </View>
                <Switch
                  value={noScheduleNotification}
                  onValueChange={setNoScheduleNotification}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={noScheduleNotification ? '#007AFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <UserGroupIcon size={20} color="#000000" />
                  <Text style={styles.settingItemText}>参加している予定のみ表示</Text>
                </View>
                <Switch
                  value={participatingOnly}
                  onValueChange={setParticipatingOnly}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={participatingOnly ? '#007AFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => {
                  const newShowState = !showTimePicker;
                  setShowTimePicker(newShowState);
                  
                  if (newShowState) {
                    // ピッカーが開く場合、少し遅延してから通知時刻項目が見える位置にスクロール
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ 
                        y: 150, 
                        animated: true 
                      });
                    }, 100);
                  }
                }}
              >
                <View style={styles.settingItemLeft}>
                  <ClockIcon size={20} color="#000000" />
                  <Text style={styles.settingItemText}>通知時刻</Text>
                </View>
                <View style={styles.settingItemRight}>
                  <Text style={styles.settingValue}>{formatTime(notificationTime)}</Text>
                  {showTimePicker ? (
                    <ChevronDownIcon size={16} color="#9ca3af" />
                  ) : (
                    <ChevronRightIcon size={16} color="#9ca3af" />
                  )}
                </View>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={notificationTime}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    style={styles.timePicker}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
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
    paddingBottom: 34,
  },
  headerArea: {
    // ヘッダー部分全体（ハンドル+ヘッダー）
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '400',
  },
  timePickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timePicker: {
    height: 120,
    width: '100%',
  },
});