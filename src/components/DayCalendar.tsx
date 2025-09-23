import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { ArrowPathIcon } from 'react-native-heroicons/outline';

interface DayCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  markedDates?: { [key: string]: any };
  onSelectedDatePress?: (date: string) => void;
}

interface EventInfo {
  id: string;
  title: string;
  color: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  location?: { name: string };
  notes?: string;
  isRecurring?: boolean;
}

interface EventWithPosition extends EventInfo {
  columnIndex: number;
  overlappingCount: number;
}

interface DayData {
  id: string;
  offset: number; // 基準日からの日数差
}

const { width: screenWidth } = Dimensions.get('window');
const HOUR_HEIGHT = 80; // 1時間あたりの高さ（より詳細に）
const HEADER_HEIGHT = 100;
const TIME_COLUMN_WIDTH = 70;
const EVENT_AREA_WIDTH = screenWidth - TIME_COLUMN_WIDTH;

export const DayCalendar: React.FC<DayCalendarProps> = ({
  selectedDate,
  onDateSelect,
  markedDates = {},
  onSelectedDatePress,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRefs = useRef<{ [key: string]: ScrollView | null }>({});
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(50);
  const [initialDate] = useState(selectedDate); // 初期基準日を固定

  // 画面サイズ変更の監視
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  // 初期データ生成
  useEffect(() => {
    const initialData = Array.from({ length: 101 }, (_, i) => {
      const offset = i - 50; // -50 〜 +50
      return { id: `day_${i}`, offset };
    });
    setDaysData(initialData);
  }, []);

  // 動的データ読み込み
  const loadMoreDays = useCallback((direction: 'start' | 'end') => {
    setDaysData(prev => {
      if (direction === 'start') {
        // 前方に20日追加
        const firstOffset = prev[0]?.offset || 0;
        const newDays = Array.from({ length: 20 }, (_, i) => ({
          id: `day_${Date.now()}_${i}`,
          offset: firstOffset - 20 + i,
        }));
        return [...newDays, ...prev];
      } else {
        // 後方に20日追加
        const lastOffset = prev[prev.length - 1]?.offset || 0;
        const newDays = Array.from({ length: 20 }, (_, i) => ({
          id: `day_${Date.now()}_${i}`,
          offset: lastOffset + 1 + i,
        }));
        return [...prev, ...newDays];
      }
    });
  }, []);

  // 指定日の予定を取得する関数
  const getEventsForDate = useCallback((date: Date) => {
    const events: EventInfo[] = [];
    const dateString = date.toISOString().split('T')[0];
    const dayMarked = markedDates[dateString];
    
    if (dayMarked?.events) {
      dayMarked.events.forEach((eventInfo: any) => {
        // 実際のイベント時間情報を使用
        const startTime = eventInfo.start ? new Date(eventInfo.start) : new Date(date);
        const endTime = eventInfo.end ? new Date(eventInfo.end) : new Date(date);
        
        // デフォルト時間の設定（時間情報がない場合のみ）
        if (!eventInfo.start) {
          startTime.setHours(9, 0, 0, 0);
        }
        if (!eventInfo.end) {
          endTime.setHours(10, 30, 0, 0);
        }
        
        events.push({
          id: eventInfo.id,
          title: eventInfo.title,
          color: eventInfo.color,
          start: startTime,
          end: endTime,
          isAllDay: eventInfo.isAllDay || false,
          location: eventInfo.location,
          notes: eventInfo.notes,
          isRecurring: eventInfo.isRecurring || false,
        });
      });
    }
    
    return events;
  }, [markedDates]);

  // 重複する予定をグループ化して横並びに配置するための計算
  const groupOverlappingEvents = useCallback((events: EventInfo[]): EventWithPosition[] => {
    // 終日予定を除外
    const timedEvents = events.filter(event => !event.isAllDay);
    
    // 開始時間でソート
    const sortedEvents = timedEvents.sort((a, b) => {
      return a.start.getTime() - b.start.getTime();
    });

    const eventsWithPosition: EventWithPosition[] = [];
    const eventGroups: EventInfo[][] = [];

    // 重複するイベントをグループ化
    sortedEvents.forEach(event => {
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();
      
      // 既存のグループで重複するものを探す
      let overlappingGroup: EventInfo[] | null = null;
      
      for (const group of eventGroups) {
        const hasOverlap = group.some(groupEvent => {
          const groupStart = groupEvent.start.getTime();
          const groupEnd = groupEvent.end.getTime();
          
          // 重複判定: 一方の開始時間が他方の期間内にある
          return (eventStart < groupEnd && eventEnd > groupStart);
        });
        
        if (hasOverlap) {
          overlappingGroup = group;
          break;
        }
      }
      
      if (overlappingGroup) {
        overlappingGroup.push(event);
      } else {
        eventGroups.push([event]);
      }
    });

    // 各グループ内でcolumnIndexを割り当て
    eventGroups.forEach(group => {
      group.forEach((event, index) => {
        eventsWithPosition.push({
          ...event,
          columnIndex: index,
          overlappingCount: group.length,
        });
      });
    });

    return eventsWithPosition;
  }, []);

  // 15分単位の時間ラベルを生成
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
      labels.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        isMainHour: true,
        position: hour * HOUR_HEIGHT,
      });
      // 15分刻みのサブライン
      for (let quarter = 1; quarter < 4; quarter++) {
        const minutes = quarter * 15;
        labels.push({
          time: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
          isMainHour: false,
          position: hour * HOUR_HEIGHT + (quarter * HOUR_HEIGHT / 4),
        });
      }
    }
    return labels;
  }, []);

  // 現在時刻の位置を計算
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours + minutes / 60) * HOUR_HEIGHT;
  };

  // 現在表示している日付を計算
  const getCurrentDate = useCallback(() => {
    const baseDate = new Date(initialDate);
    const currentItem = daysData[currentIndex];
    if (currentItem) {
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + currentItem.offset);
      return newDate;
    }
    return baseDate;
  }, [initialDate, daysData, currentIndex]);

  // スクロール完了時に現在の日付を更新
  const onMomentumScrollEnd = useCallback((event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / dimensions.width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < daysData.length) {
      setCurrentIndex(newIndex);
      const newDate = new Date(initialDate);
      newDate.setDate(new Date(initialDate).getDate() + daysData[newIndex].offset);
      const newDateString = newDate.toISOString().split('T')[0];
      onDateSelect(newDateString);
    }
  }, [currentIndex, daysData, dimensions.width, initialDate, onDateSelect]);

  // 端に近づいたら追加データを読み込み
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems[0].index;
      const lastVisible = viewableItems[viewableItems.length - 1].index;
      
      if (firstVisible <= 10) {
        loadMoreDays('start');
        setCurrentIndex(prev => prev + 20); // インデックスを調整
      } else if (lastVisible >= daysData.length - 10) {
        loadMoreDays('end');
      }
    }
  }, [daysData.length, loadMoreDays]);

  // 今日まで自動スクロール（各日のScrollView）
  const scrollToCurrentTime = useCallback((dayId: string) => {
    const timer = setTimeout(() => {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 3) * HOUR_HEIGHT);
      scrollViewRefs.current[dayId]?.scrollTo({ y: scrollPosition, animated: true });
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // 日付ヘッダーのフォーマット
  const formatDayHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const dayName = dayNames[date.getDay()];
    const month = date.getMonth() + 1;
    const dayNumber = date.getDate();
    
    return { dayName, month, dayNumber, isToday };
  };

  // 予定のレンダリング位置を計算（重複対応）
  const getEventStyle = (event: EventWithPosition) => {
    const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
    const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // 重複する予定の数に応じて幅を調整
    const gap = 2; // イベント間の隙間
    const totalGaps = (event.overlappingCount - 1) * gap;
    const eventWidth = (EVENT_AREA_WIDTH - totalGaps) / event.overlappingCount;
    const leftPosition = event.columnIndex * (eventWidth + gap);
    
    return {
      position: 'absolute' as const,
      left: leftPosition,
      top: (startMinutes / 60) * HOUR_HEIGHT,
      width: eventWidth,
      height: Math.max((duration / 60) * HOUR_HEIGHT - 2, 30), // 最小高さ30px
      backgroundColor: event.color,
      borderRadius: 8,
      padding: 6, // paddingを少し小さくして狭いスペースに対応
      zIndex: 10 + event.columnIndex,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3 + event.columnIndex,
    };
  };

  // 各日のレンダリング
  const renderDayContent = useCallback(({ item }: { item: DayData }) => {
    const baseDate = new Date(initialDate);
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + item.offset);
    
    const dayEvents = getEventsForDate(targetDate);
    const eventsWithPosition = groupOverlappingEvents(dayEvents);
    const { dayName, month, dayNumber, isToday } = formatDayHeader(targetDate);
    const dateString = targetDate.toISOString().split('T')[0];
    
    return (
      <View style={{ width: dimensions.width }}>
        {/* ヘッダー：日付表示 */}
        <View style={styles.header}>
          <View style={styles.dateHeaderContainer}>
            <Text style={[styles.dayName, isToday && styles.todayText]}>
              {dayName}
            </Text>
            <Text style={[styles.dateText, isToday && styles.todayText]}>
              {month}月{dayNumber}日
            </Text>
          </View>
        </View>

        {/* メインコンテンツ */}
        <ScrollView
          ref={ref => { scrollViewRefs.current[item.id] = ref; }}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onLayout={() => {
            if (isToday) {
              scrollToCurrentTime(item.id);
            }
          }}
        >
          <View style={styles.timeGrid}>
            {/* 時間軸 */}
            <View style={styles.timeColumn}>
              {timeLabels.filter(label => label.isMainHour).map((label, index) => (
                <View key={index} style={[styles.timeSlot, { top: label.position }]}>
                  <Text style={styles.timeLabel}>{label.time}</Text>
                </View>
              ))}
            </View>

            {/* イベントエリア */}
            <View style={styles.eventArea}>
              {/* 時間線 */}
              {timeLabels.map((label, index) => (
                <View
                  key={`line-${index}`}
                  style={[
                    label.isMainHour ? styles.hourLine : styles.quarterLine,
                    { top: label.position }
                  ]}
                />
              ))}

              {/* 現在時刻ライン（今日のみ表示） */}
              {isToday && (
                <View style={[styles.currentTimeLine, { top: getCurrentTimePosition() }]}>
                  <View style={styles.currentTimeDot} />
                  <View style={styles.currentTimeLineBar} />
                </View>
              )}

              {/* 予定表示 */}
              {eventsWithPosition.map((event, index) => (
                <TouchableOpacity
                  key={`${event.id}-${index}`}
                  style={getEventStyle(event)}
                  onPress={() => {
                    onSelectedDatePress?.(dateString);
                  }}
                >
                  <View style={styles.eventTitleContainer}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    {event.isRecurring && (
                      <ArrowPathIcon size={12} color="#666" style={styles.recurringIcon} />
                    )}
                  </View>
                  <Text style={styles.eventTime}>
                    {event.isAllDay ? '終日' : 
                      `${event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                    }
                  </Text>
                  {event.location?.name && (
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      📍 {event.location.name}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}

              {/* 終日予定エリア */}
              <View style={styles.allDayArea}>
                {dayEvents.filter(event => event.isAllDay).map((event, index) => (
                  <TouchableOpacity
                    key={`allday-${event.id}`}
                    style={[styles.allDayEvent, { backgroundColor: event.color }]}
                    onPress={() => {
                      onSelectedDatePress?.(dateString);
                    }}
                  >
                    <View style={styles.allDayEventTitleContainer}>
                      <Text style={styles.allDayEventText}>
                        {event.title}
                      </Text>
                      {event.isRecurring && (
                        <ArrowPathIcon size={10} color="#fff" style={styles.allDayRecurringIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }, [initialDate, getEventsForDate, formatDayHeader, dimensions.width, timeLabels, getCurrentTimePosition, scrollToCurrentTime, onSelectedDatePress, getEventStyle]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        data={daysData}
        renderItem={renderDayContent}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
        getItemLayout={(data, index) => ({
          length: dimensions.width,
          offset: dimensions.width * index,
          index,
        })}
        initialScrollIndex={daysData.length > 0 ? currentIndex : undefined}
        onScrollToIndexFailed={() => {
          // フォールバック処理
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
          }, 100);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  dateHeaderContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  todayText: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    height: 24 * HOUR_HEIGHT,
    position: 'relative',
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: '#fafafa',
    position: 'relative',
  },
  timeSlot: {
    position: 'absolute',
    width: '100%',
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingRight: 12,
  },
  timeLabel: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'right',
    fontWeight: '500',
  },
  eventArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e1e1e1',
  },
  quarterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f5f5f5',
  },
  currentTimeLine: {
    position: 'absolute',
    left: -8,
    right: 0,
    height: 2,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 4,
    marginRight: 4,
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#ff3b30',
  },
  allDayArea: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    zIndex: 15,
  },
  allDayEvent: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  allDayEventText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringIcon: {
    marginLeft: 4,
  },
  allDayEventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allDayRecurringIcon: {
    marginLeft: 4,
  },
});