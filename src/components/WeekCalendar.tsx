import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

interface WeekCalendarProps {
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
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HOUR_HEIGHT = 60; // 1時間あたりの高さ
const HEADER_HEIGHT = 80;
const TIME_COLUMN_WIDTH = 60;
const DAY_COLUMN_WIDTH = (screenWidth - TIME_COLUMN_WIDTH - 20) / 7;

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  selectedDate,
  onDateSelect,
  markedDates = {},
  onSelectedDatePress,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  });

  // 週の日付配列を生成
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  // 現在週の予定を取得
  const weekEvents = useMemo(() => {
    const events: EventInfo[] = [];
    
    weekDays.forEach(date => {
      const dateString = date.toISOString().split('T')[0];
      const dayMarked = markedDates[dateString];
      
      if (dayMarked?.events) {
        dayMarked.events.forEach((eventInfo: any) => {
          // 実際のイベントデータから時間情報を取得（マークデータには時間情報がないため推定）
          const startTime = new Date(date);
          startTime.setHours(9, 0, 0, 0); // デフォルト9:00開始
          const endTime = new Date(date);
          endTime.setHours(10, 0, 0, 0); // デフォルト10:00終了
          
          events.push({
            id: eventInfo.id,
            title: eventInfo.title,
            color: eventInfo.color,
            start: startTime,
            end: endTime,
            isAllDay: false,
          });
        });
      }
    });
    
    return events;
  }, [weekDays, markedDates]);

  // 時間ラベルを生成
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
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

  // 週の変更
  const changeWeek = (direction: number) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newWeekStart);
  };

  // 今日まで自動スクロール
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 2) * HOUR_HEIGHT); // 現在時刻の2時間前にスクロール
      scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: true });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentWeekStart]);

  // 日付フォーマット
  const formatDayHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[date.getDay()];
    const dayNumber = date.getDate();
    
    return { dayName, dayNumber, isToday };
  };

  // 予定のレンダリング位置を計算
  const getEventStyle = (event: EventInfo, dayIndex: number) => {
    const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
    const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
    const duration = endMinutes - startMinutes;
    
    return {
      position: 'absolute' as const,
      left: TIME_COLUMN_WIDTH + dayIndex * DAY_COLUMN_WIDTH + 2,
      top: (startMinutes / 60) * HOUR_HEIGHT,
      width: DAY_COLUMN_WIDTH - 4,
      height: (duration / 60) * HOUR_HEIGHT - 1,
      backgroundColor: event.color,
      borderRadius: 4,
      padding: 4,
      zIndex: 10,
    };
  };

  // 週の変更ボタン
  const PrevWeekButton = () => (
    <TouchableOpacity
      style={styles.weekNavButton}
      onPress={() => changeWeek(-1)}
    >
      <Text style={styles.weekNavText}>‹</Text>
    </TouchableOpacity>
  );

  const NextWeekButton = () => (
    <TouchableOpacity
      style={styles.weekNavButton}
      onPress={() => changeWeek(1)}
    >
      <Text style={styles.weekNavText}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー：日付表示 */}
      <View style={styles.header}>
        <PrevWeekButton />
        <View style={styles.weekDaysContainer}>
          {weekDays.map((date, index) => {
            const { dayName, dayNumber, isToday } = formatDayHeader(date);
            const dateString = date.toISOString().split('T')[0];
            const isSelected = dateString === selectedDate;
            
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dayHeader, isSelected && styles.selectedDayHeader]}
                onPress={() => {
                  onDateSelect(dateString);
                  onSelectedDatePress?.(dateString);
                }}
              >
                <Text style={[styles.dayName, isToday && styles.todayText]}>
                  {dayName}
                </Text>
                <Text style={[styles.dayNumber, isToday && styles.todayText, isSelected && styles.selectedText]}>
                  {dayNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <NextWeekButton />
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
            {timeLabels.map((time, index) => (
              <View key={index} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>{time}</Text>
              </View>
            ))}
          </View>

          {/* 日付グリッド */}
          <View style={styles.daysGrid}>
            {/* 時間線 */}
            {timeLabels.map((_, index) => (
              <View key={`line-${index}`} style={[styles.hourLine, { top: index * HOUR_HEIGHT }]} />
            ))}

            {/* 日付列 */}
            {weekDays.map((date, dayIndex) => (
              <View key={dayIndex} style={[styles.dayColumn, { left: dayIndex * DAY_COLUMN_WIDTH }]}>
                {/* 30分線 */}
                {timeLabels.map((_, hourIndex) => (
                  <View
                    key={`half-${hourIndex}`}
                    style={[
                      styles.halfHourLine,
                      { top: hourIndex * HOUR_HEIGHT + HOUR_HEIGHT / 2 }
                    ]}
                  />
                ))}
              </View>
            ))}

            {/* 現在時刻ライン */}
            <View style={[styles.currentTimeLine, { top: getCurrentTimePosition() }]} />

            {/* 予定表示 */}
            {weekEvents.map((event, index) => {
              const eventDate = new Date(event.start);
              const dayIndex = weekDays.findIndex(day => 
                day.toDateString() === eventDate.toDateString()
              );
              
              if (dayIndex === -1) return null;
              
              return (
                <TouchableOpacity
                  key={`${event.id}-${index}`}
                  style={getEventStyle(event, dayIndex)}
                  onPress={() => {
                    const dateString = eventDate.toISOString().split('T')[0];
                    onDateSelect(dateString);
                    onSelectedDatePress?.(dateString);
                  }}
                >
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  weekDaysContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  weekNavText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  selectedDayHeader: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  dayName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  todayText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedText: {
    color: '#ffffff',
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
  },
  timeSlot: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
  },
  timeLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'right',
  },
  daysGrid: {
    flex: 1,
    position: 'relative',
  },
  dayColumn: {
    position: 'absolute',
    width: DAY_COLUMN_WIDTH,
    height: '100%',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e1e1e1',
  },
  halfHourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ff3b30',
    zIndex: 20,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});