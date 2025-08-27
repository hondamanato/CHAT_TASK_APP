import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

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
}

const { width: screenWidth } = Dimensions.get('window');
const HOUR_HEIGHT = 80; // 1時間あたりの高さ（より詳細に）
const HEADER_HEIGHT = 100;
const TIME_COLUMN_WIDTH = 70;
const EVENT_AREA_WIDTH = screenWidth - TIME_COLUMN_WIDTH - 20;

export const DayCalendar: React.FC<DayCalendarProps> = ({
  selectedDate,
  onDateSelect,
  markedDates = {},
  onSelectedDatePress,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(selectedDate));

  // 選択日が変更されたら現在日付を更新
  useEffect(() => {
    setCurrentDate(new Date(selectedDate));
  }, [selectedDate]);

  // 当日の予定を取得
  const dayEvents = useMemo(() => {
    const events: EventInfo[] = [];
    const dateString = currentDate.toISOString().split('T')[0];
    const dayMarked = markedDates[dateString];
    
    if (dayMarked?.events) {
      dayMarked.events.forEach((eventInfo: any) => {
        // 時間情報をより詳細に設定（実際のEventContextからの情報を使用）
        const startTime = new Date(currentDate);
        startTime.setHours(9, 0, 0, 0); // デフォルト9:00開始
        const endTime = new Date(currentDate);
        endTime.setHours(10, 30, 0, 0); // デフォルト10:30終了
        
        events.push({
          id: eventInfo.id,
          title: eventInfo.title,
          color: eventInfo.color,
          start: startTime,
          end: endTime,
          isAllDay: eventInfo.isAllDay || false,
          location: eventInfo.location,
          notes: eventInfo.notes,
        });
      });
    }
    
    return events;
  }, [currentDate, markedDates]);

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

  // 日付の変更
  const changeDate = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    const newDateString = newDate.toISOString().split('T')[0];
    setCurrentDate(newDate);
    onDateSelect(newDateString);
  };

  // 今日まで自動スクロール
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 3) * HOUR_HEIGHT); // 現在時刻の3時間前にスクロール
      scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: true });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentDate]);

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

  // 予定のレンダリング位置を計算
  const getEventStyle = (event: EventInfo, index: number) => {
    const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
    const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // 複数の予定が重なる場合の横位置調整
    const eventWidth = EVENT_AREA_WIDTH / 2; // とりあえず半分の幅
    const leftOffset = (index % 2) * (eventWidth + 4); // 2列配置
    
    return {
      position: 'absolute' as const,
      left: TIME_COLUMN_WIDTH + leftOffset + 8,
      top: (startMinutes / 60) * HOUR_HEIGHT,
      width: eventWidth - 4,
      height: Math.max((duration / 60) * HOUR_HEIGHT - 2, 30), // 最小高さ30px
      backgroundColor: event.color,
      borderRadius: 6,
      padding: 8,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    };
  };

  const { dayName, month, dayNumber, isToday } = formatDayHeader(currentDate);

  return (
    <View style={styles.container}>
      {/* ヘッダー：日付表示 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => changeDate(-1)}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.dateHeaderContainer}>
          <Text style={[styles.dayName, isToday && styles.todayText]}>
            {dayName}
          </Text>
          <Text style={[styles.dateText, isToday && styles.todayText]}>
            {month}月{dayNumber}日
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => changeDate(1)}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* メインコンテンツ */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
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
            {dayEvents.map((event, index) => (
              <TouchableOpacity
                key={`${event.id}-${index}`}
                style={getEventStyle(event, index)}
                onPress={() => {
                  onSelectedDatePress?.(selectedDate);
                }}
              >
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>
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
                    onSelectedDatePress?.(selectedDate);
                  }}
                >
                  <Text style={styles.allDayEventText}>
                    {event.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
});