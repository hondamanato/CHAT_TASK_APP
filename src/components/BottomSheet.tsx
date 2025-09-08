import React, { useRef, useEffect, useState } from 'react';
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
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { EventCreateScreen } from '../screens/EventCreateScreen';
import { CalendarEvent } from '../contexts/EventContext';

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate?: string;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, event: any) => void;
  onEventDelete?: (id: string) => void;
  events?: CalendarEvent[];
}

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.9; // 画面の90%
const CLOSE_THRESHOLD = 120; // 閉じるためのしきい値（px）
const CLOSE_VELOCITY = 800; // 閉じるための速度しきい値（px/s）

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  selectedDate,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  events = [],
}) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const translateYEventCreate = useSharedValue(SHEET_HEIGHT);
  const [showEventCreate, setShowEventCreate] = useState(false);
  const [scrollViewAtTop, setScrollViewAtTop] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Modal表示前に初期位置を設定
      translateY.value = SHEET_HEIGHT;
      // 短い遅延後にアニメーション開始
      const timer = setTimeout(() => {
        translateY.value = withTiming(0, { duration: 300 });
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // 非表示アニメーション
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [isVisible]);

  // EventCreateボトムシートのアニメーション
  useEffect(() => {
    if (showEventCreate) {
      // Modal表示前に初期位置を設定
      translateYEventCreate.value = SHEET_HEIGHT;
      // 短い遅延後にアニメーション開始
      const timer = setTimeout(() => {
        translateYEventCreate.value = withTiming(0, { duration: 300 });
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // 非表示アニメーション
      translateYEventCreate.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [showEventCreate]);

  // EventCreate用のジェスチャーハンドラー
  const eventCreateGesture = Gesture.Pan()
    .enabled(scrollViewAtTop)
    .onUpdate((event) => {
      if (event.translationY > 0 && scrollViewAtTop) {
        translateYEventCreate.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      
      if ((translationY > CLOSE_THRESHOLD || velocityY > CLOSE_VELOCITY) && scrollViewAtTop) {
        // 閉じる
        translateYEventCreate.value = withSpring(SHEET_HEIGHT, {
          velocity: velocityY,
          damping: 25,
          stiffness: 120,
        }, () => {
          runOnJS(setShowEventCreate)(false);
        });
      } else {
        // 元の位置に戻る
        translateYEventCreate.value = withSpring(0, {
          velocity: velocityY,
          damping: 25,
          stiffness: 120,
        });
      }
    });

  // メインBottomSheet用のジェスチャーハンドラー
  const mainGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      
      // 速度または距離による閉じる判定
      if (translationY > CLOSE_THRESHOLD || velocityY > CLOSE_VELOCITY) {
        // 閉じる
        translateY.value = withSpring(SHEET_HEIGHT, {
          velocity: velocityY,
          damping: 25,
          stiffness: 120,
        }, () => {
          runOnJS(onClose)();
        });
      } else {
        // 元の位置に戻る
        translateY.value = withSpring(0, {
          velocity: velocityY,
          damping: 25,
          stiffness: 120,
        });
      }
    });

  // アニメーション用スタイル
  const animatedMainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedEventCreateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYEventCreate.value }],
  }));

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getDayOfWeek = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `（${days[date.getDay()]}）`;
  };

  // 選択した日付のイベントを取得（複数日予定対応）
  const getEventsForDate = (date?: string): CalendarEvent[] => {
    if (!date) return [];
    const selectedDate = new Date(date);
    
    return events.filter(event => {
      // 開始日と終了日を取得
      const eventStartDate = new Date(event.start);
      const eventEndDate = new Date(event.end);
      
      // 時間を無視して日付のみで比較
      eventStartDate.setHours(0, 0, 0, 0);
      eventEndDate.setHours(23, 59, 59, 999);
      selectedDate.setHours(12, 0, 0, 0);
      
      // 選択日が開始日から終了日の範囲内にあるかチェック
      return selectedDate >= eventStartDate && selectedDate <= eventEndDate;
    });
  };

  const dayEvents = getEventsForDate(selectedDate).sort((a, b) => {
    // 各イベントの期間を計算
    const getDuration = (event: CalendarEvent) => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };
    
    const durationA = getDuration(a);
    const durationB = getDuration(b);
    
    // 期間が長い順 → IDが小さい順（作成順）
    if (durationB !== durationA) {
      return durationB - durationA;
    }
    return a.id.localeCompare(b.id);
  });

  // 時間をフォーマット
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <>
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={() => {
          // アニメーション付きで閉じる
          translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, () => {
            runOnJS(onClose)();
          });
        }}>
          <View style={styles.backdrop}>
            <GestureDetector gesture={mainGesture}>
              <Animated.View
                style={[
                  styles.bottomSheet,
                  {
                    height: SHEET_HEIGHT,
                  },
                  animatedMainStyle,
                ]}
              >
                {/* ハンドル */}
                <View style={styles.handle} />
                
                {/* ヘッダー */}
                <View style={styles.header}>
                  <Text style={styles.dateText}>
                    {formatDate(selectedDate)}
                    {getDayOfWeek(selectedDate)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                      onClose(); // 親のボトムシートを閉じる
                      setShowEventCreate(true); // 作成ページを表示
                    }}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* コンテンツ */}
                <View style={styles.content}>
                  <View style={styles.eventsList}>
                    {dayEvents.length === 0 ? (
                      <Text style={styles.noEventsText}>予定はありません</Text>
                    ) : (
                      dayEvents.map((event) => (
                        <TouchableOpacity 
                          key={event.id} 
                          style={styles.eventItem}
                          onPress={() => {
                            setEditingEvent(event);
                            onClose(); // 親のボトムシートを閉じる
                            setShowEventCreate(true); // 編集ページを表示
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.eventTimeContainer}>
                            <View 
                              style={[
                                styles.eventColorDot, 
                                { backgroundColor: event.color || '#007AFF' }
                              ]} 
                            />
                            <Text style={styles.eventTime}>
                              {event.isAllDay 
                                ? '終日' 
                                : `${formatTime(event.start)} - ${formatTime(event.end)}`
                              }
                            </Text>
                          </View>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          {event.location?.name && (
                            <Text style={styles.eventLocation}>📍 {event.location.name}</Text>
                          )}
                          {event.notes && (
                            <Text style={styles.eventNotes}>{event.notes}</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* イベント作成ボトムシート */}
      <Modal
        visible={showEventCreate}
        transparent
        animationType="none"
        onRequestClose={() => setShowEventCreate(false)}
      >
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {
            // アニメーション付きで閉じる
            translateYEventCreate.value = withTiming(SHEET_HEIGHT, { duration: 250 }, () => {
              runOnJS(setShowEventCreate)(false);
            });
          }}>
            <View style={styles.backdropTouchArea} />
          </TouchableWithoutFeedback>
          <GestureDetector gesture={eventCreateGesture}>
            <Animated.View
              style={[
                styles.bottomSheet,
                styles.eventCreateBottomSheet,
                {
                  height: SHEET_HEIGHT,
                },
                animatedEventCreateStyle,
              ]}
            >
            {/* ハンドル */}
            <View style={styles.handle} />
            
            <EventCreateScreen
              isVisible={showEventCreate}
              onClose={() => {
                setShowEventCreate(false);
                setEditingEvent(null);
              }}
              onSave={(event) => {
                if (editingEvent) {
                  // 編集モード
                  if (onEventUpdate) {
                    onEventUpdate(editingEvent.id, event);
                  }
                } else {
                  // 新規作成モード
                  if (onEventCreate) {
                    onEventCreate(event);
                  }
                }
                setShowEventCreate(false);
                setEditingEvent(null);
              }}
              onDelete={(eventId) => {
                if (onEventDelete) {
                  onEventDelete(eventId);
                }
                setShowEventCreate(false);
                setEditingEvent(null);
              }}
              initialDate={selectedDate}
              editingEvent={editingEvent}
              onScrollChange={setScrollViewAtTop}
            />
            </Animated.View>
          </GestureDetector>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34, // Safe Area対応
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'left',
  },
  content: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  eventsList: {
    flex: 1,
    paddingTop: 8,
  },
  noEventsText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 40,
  },
  eventItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 0,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  eventTime: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  eventNotes: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  eventCreateBottomSheet: {
    padding: 0,
  },
  backdropTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});