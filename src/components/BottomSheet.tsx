import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
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
const CLOSE_THRESHOLD = 150; // 閉じるためのしきい値（px）
const CLOSE_VELOCITY = 0.5; // 閉じるための速度しきい値（px/s）

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  selectedDate,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  events = [],
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const translateYEventCreate = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [showEventCreate, setShowEventCreate] = useState(false);
  const [scrollViewAtTop, setScrollViewAtTop] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Modal表示前に初期位置を設定
      translateY.setValue(SHEET_HEIGHT);
      // 短い遅延後にアニメーション開始
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // 非表示アニメーション
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  // EventCreateボトムシートのアニメーション
  useEffect(() => {
    if (showEventCreate) {
      // Modal表示前に初期位置を設定
      translateYEventCreate.setValue(SHEET_HEIGHT);
      // 短い遅延後にアニメーション開始
      const timer = setTimeout(() => {
        Animated.timing(translateYEventCreate, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // 非表示アニメーション
      Animated.timing(translateYEventCreate, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showEventCreate]);

  // 作成ページ用のPanResponder
  const panResponderEventCreate = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        // スクロールが最上部にあり、下方向のジェスチャーの場合のみ反応
        return scrollViewAtTop && gestureState.dy > 0;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // スクロールが最上部にあり、下方向のスワイプの場合のみ反応
        return scrollViewAtTop && gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        translateYEventCreate.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && scrollViewAtTop) {
          translateYEventCreate.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        
        if ((dy > CLOSE_THRESHOLD || vy > CLOSE_VELOCITY) && scrollViewAtTop) {
          // 閉じる
          Animated.spring(translateYEventCreate, {
            toValue: SHEET_HEIGHT,
            useNativeDriver: true,
            velocity: vy,
            tension: 100,
            friction: 8,
          }).start(() => {
            setShowEventCreate(false);
          });
        } else {
          // 元の位置に戻る
          Animated.spring(translateYEventCreate, {
            toValue: 0,
            useNativeDriver: true,
            velocity: vy,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 縦方向のスワイプを検知（しきい値を緩和）
        return Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // タッチ開始時の処理
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // 下方向のスワイプで閉じる操作を許可
        if (gestureState.dy > 0) {
          // スワイプ距離に応じて位置を更新
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        
        // 速度または距離による閉じる判定
        if (dy > CLOSE_THRESHOLD || vy > CLOSE_VELOCITY) {
          // 閉じる
          Animated.spring(translateY, {
            toValue: SHEET_HEIGHT,
            useNativeDriver: true,
            velocity: vy,
            tension: 100,
            friction: 8,
          }).start(() => {
            onClose();
          });
        } else {
          // 元の位置に戻る
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            velocity: vy,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

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
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        }}>
          <View style={styles.backdrop}>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  height: SHEET_HEIGHT,
                  transform: [{ translateY }],
                },
              ]}
            >
                {/* ハンドル */}
                <View style={styles.handle} {...panResponder.panHandlers} />
                
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
            Animated.timing(translateYEventCreate, {
              toValue: SHEET_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              setShowEventCreate(false);
            });
          }}>
            <View style={styles.backdropTouchArea} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.bottomSheet,
              styles.eventCreateBottomSheet,
              {
                height: SHEET_HEIGHT,
                transform: [{ translateY: translateYEventCreate }],
              },
            ]}
            {...panResponderEventCreate.panHandlers}
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