import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { ViewMode } from '../types';
import { WeekCalendar } from './WeekCalendar';
import { DayCalendar } from './DayCalendar';

interface CustomCalendarProps {
  viewMode: ViewMode;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  markedDates?: { [key: string]: any };
  onMonthChange?: (year: number, month: number) => void;
  onSelectedDatePress?: (date: string) => void;
}

interface EventInfo {
  id: string;
  title: string;
  color: string;
  isStart: boolean;
  isEnd: boolean;
  isMultiDay: boolean;
}

interface DayInfo {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSelected: boolean;
  hasEvent?: boolean;
  events?: EventInfo[];
}

interface MonthData {
  id: string;
  offset: number;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  viewMode,
  selectedDate,
  onDateSelect,
  markedDates = {},
  onMonthChange,
  onSelectedDatePress,
}) => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [containerHeight, setContainerHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [monthsData, setMonthsData] = useState<MonthData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(50);
  const [currentViewDate, setCurrentViewDate] = useState(selectedDate);
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
      return { id: `month_${i}`, offset };
    });
    setMonthsData(initialData);
  }, []);

  // 初期化時のヘッダー更新（初回のみ実行）
  useEffect(() => {
    if (onMonthChange) {
      const viewDate = new Date(selectedDate);
      onMonthChange(viewDate.getFullYear(), viewDate.getMonth());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 画面サイズとセルサイズの計算
  const screenDimensions = useMemo(() => {
    const { width } = dimensions;
    
    const DAY_HEADER_HEIGHT = 35; // 曜日ヘッダーの高さ
    
    // コンテナの高さが取得できている場合はそれを使用
    const availableHeight = containerHeight > 0 ? containerHeight - DAY_HEADER_HEIGHT : 400;
    
    // セルサイズを計算（6週 × 7日）
    const cellHeight = availableHeight / 6;
    const cellWidth = width / 7;
    
    
    return {
      screenWidth: width,
      cellHeight,
      cellWidth,
      availableHeight,
    };
  }, [dimensions, containerHeight]);

  // 月のデータを生成する関数
  const generateMonthData = useCallback((year: number, month: number, targetMonth: number): DayInfo[] => {
    const today = new Date();
    // ローカル時間で今日の日付文字列を生成
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // その月の1日
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0: 日曜日, 1: 月曜日, ...
    
    // その月の最後の日
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // 前月の最後の日
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days: DayInfo[] = [];
    
    // 前月の日付を追加
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const eventInfo = markedDates?.[dateString];
      days.push({
        date: dateString,
        day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isSelected: false,
        hasEvent: eventInfo?.hasEvent || false,
        events: eventInfo?.events || [],
      });
    }
    
    // 今月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const isToday = dateString === todayString;
      const isSelected = dateString === selectedDate;
      const eventInfo = markedDates?.[dateString];
      
      days.push({
        date: dateString,
        day,
        isCurrentMonth: true,
        isToday,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isSelected,
        hasEvent: eventInfo?.hasEvent || false,
        events: eventInfo?.events || [],
      });
    }
    
    // 来月の日付を追加（42日になるまで）
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const eventInfo = markedDates?.[dateString];
      days.push({
        date: dateString,
        day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isSelected: false,
        hasEvent: eventInfo?.hasEvent || false,
        events: eventInfo?.events || [],
      });
    }
    
    return days;
  }, [selectedDate, markedDates]);

  // 動的データ追加（無限スクロール）
  const loadMoreMonths = useCallback((direction: 'start' | 'end') => {
    setMonthsData(prev => {
      // 重複データの防止
      if (direction === 'end') {
        const lastOffset = prev[prev.length - 1].offset;
        // 既に十分なデータがある場合はスキップ
        if (prev.length >= 200) return prev;
        
        const newMonths = Array.from({ length: 12 }, (_, i) => ({
          id: `month_future_${lastOffset + i + 1}`,
          offset: lastOffset + i + 1
        }));
        return [...prev, ...newMonths];
      } else {
        const firstOffset = prev[0].offset;
        if (prev.length >= 200) return prev;
        
        const newMonths = Array.from({ length: 12 }, (_, i) => ({
          id: `month_past_${firstOffset - 12 + i}`,
          offset: firstOffset - 12 + i
        }));
        return [...newMonths, ...prev];
      }
    });
  }, []);
  
  // 古いデータのクリーンアップ（メモリ最適化）
  const cleanupOldData = useCallback((index: number) => {
    setMonthsData(prev => {
      if (prev.length <= 101) return prev; // 初期データ数以下はクリーンアップしない
      
      const currentItem = prev[index];
      if (!currentItem) return prev;
      
      // 現在の位置から前後50個のデータを保持
      const startIndex = Math.max(0, index - 50);
      const endIndex = Math.min(prev.length - 1, index + 50);
      const newData = prev.slice(startIndex, endIndex + 1);
      
      if (newData.length !== prev.length) {
        // インデックス調整は呼び出し元で行う
        return newData;
      }
      return prev;
    });
  }, []);

  // 曜日ヘッダー
  const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];

  const handleDayPress = (dayInfo: DayInfo) => {
    if (dayInfo.date === selectedDate && onSelectedDatePress) {
      // 既に選択されている日付をタップした場合はボトムシートを表示
      onSelectedDatePress(dayInfo.date);
    } else {
      // 新しい日付を選択
      onDateSelect(dayInfo.date);
    }
  };

  // 前月に移動
  const goToPreviousMonth = useCallback(() => {
    const currentDate = new Date(selectedDate);
    currentDate.setMonth(currentDate.getMonth() - 1);
    onDateSelect(currentDate.toISOString().split('T')[0]);
  }, [selectedDate, onDateSelect]);

  // 次月に移動
  const goToNextMonth = useCallback(() => {
    const currentDate = new Date(selectedDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
    onDateSelect(currentDate.toISOString().split('T')[0]);
  }, [selectedDate, onDateSelect]);

  // FlatListのスクロール完了時の処理
  const handleMomentumScrollEnd = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const newIndex = Math.round(contentOffset.x / dimensions.width);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      
      // 表示月を更新（スワイプ時のみ）
      const item = monthsData[newIndex];
      if (item) {
        // 初期基準日からのオフセットで正確に月を計算
        const baseDate = new Date(initialDate);
        const newViewDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + item.offset, 1);
        const newViewDateString = newViewDate.toISOString().split('T')[0];
        setCurrentViewDate(newViewDateString);
        
        // ヘッダー更新
        if (onMonthChange) {
          onMonthChange(newViewDate.getFullYear(), newViewDate.getMonth());
        }
      }
      
      // 動的データ読み込みとメモリ最適化
      if (newIndex <= 10) {
        loadMoreMonths('start');
        // インデックス調整
        setTimeout(() => {
          const adjustedIndex = newIndex + 12;
          setCurrentIndex(adjustedIndex);
          flatListRef.current?.scrollToIndex({ index: adjustedIndex, animated: false });
        }, 0);
      } else if (newIndex >= monthsData.length - 11) {
        loadMoreMonths('end');
      }
      
      // 数秒後に古いデータをクリーンアップ
      setTimeout(() => {
        cleanupOldData(newIndex);
      }, 2000);
    }
  };

  const renderDayHeader = (day: string, index: number) => (
    <View
      key={day}
      style={[
        styles.dayHeader,
        {
          width: screenDimensions.cellWidth,
          height: 35,
        },
        index === 6 && styles.lastDayHeader, // 最後の曜日は右境界線なし
      ]}
    >
      <Text style={styles.dayHeaderText}>{day}</Text>
    </View>
  );

  const renderDay = (dayInfo: DayInfo, index: number) => {
    const isLastColumn = index % 7 === 6;
    
    return (
      <TouchableOpacity
        key={`${dayInfo.date}-${index}`}
        style={[
          styles.dayCell,
          {
            width: screenDimensions.cellWidth,
            height: screenDimensions.cellHeight,
          },
          !isLastColumn && styles.dayBorder,
          index < 35 && styles.dayBottomBorder, // 最後の週は下境界線なし
          dayInfo.isSelected && styles.selectedCell, // 選択状態の背景色
        ]}
        onPress={() => handleDayPress(dayInfo)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayText,
            !dayInfo.isCurrentMonth && styles.otherMonthText,
            dayInfo.isToday && styles.todayText,
            dayInfo.isWeekend && dayInfo.isCurrentMonth && styles.weekendText,
            dayInfo.isSelected && styles.selectedText,
          ]}
        >
          {dayInfo.day}
        </Text>
      </TouchableOpacity>
    );
  };

  // イベントレイヤーのレンダリング
  const renderEventLayer = (monthData: DayInfo[]) => {
    const eventBars: React.JSX.Element[] = [];
    const processedEvents = new Set<string>();

    // 全イベントを収集し、日数の多い順→作成順でソート
    const allEvents: Array<{ event: any; dayIndex: number; duration: number }> = [];
    
    monthData.forEach((dayInfo, dayIndex) => {
      dayInfo.events?.forEach((event) => {
        if (!processedEvents.has(event.id) && event.isStart) {
          processedEvents.add(event.id);
          
          // 予定の期間を計算
          let endIndex = dayIndex;
          for (let i = dayIndex; i < monthData.length; i++) {
            const hasThisEvent = monthData[i].events?.some(e => e.id === event.id);
            if (hasThisEvent) {
              endIndex = i;
            } else {
              break;
            }
          }
          
          const duration = endIndex - dayIndex + 1;
          allEvents.push({ event, dayIndex, duration });
        }
      });
    });

    // ソート: 期間が長い順 → IDが小さい順（作成順）
    allEvents.sort((a, b) => {
      if (b.duration !== a.duration) {
        return b.duration - a.duration;
      }
      return a.event.id.localeCompare(b.event.id);
    });

    // 週ごとの予定配置を管理
    const weekEventPositions: Map<number, number> = new Map();

    allEvents.forEach(({ event, dayIndex, duration }) => {
      // 開始日から終了日までのセルを特定
      let currentIndex = dayIndex;
      let endIndex = dayIndex + duration - 1;

      // 週をまたぐ場合の処理
      const startRow = Math.floor(currentIndex / 7);
      const endRow = Math.floor(endIndex / 7);
      
      if (startRow === endRow) {
        // 同じ週内の場合
        const startCol = currentIndex % 7;
        const endCol = endIndex % 7;
        const width = (endCol - startCol + 1) * screenDimensions.cellWidth;
        
        // この週の次のposition indexを取得
        const positionIndex = weekEventPositions.get(startRow) || 0;
        weekEventPositions.set(startRow, positionIndex + 1);
        
        eventBars.push(
          <View
            key={`${event.id}-${startRow}`}
            style={[
              styles.continuousEventBar,
              {
                left: startCol * screenDimensions.cellWidth + 1,
                top: startRow * screenDimensions.cellHeight + 18 + (positionIndex * 12),
                width: width - 3,
                backgroundColor: event.color,
                borderRadius: 2,
              }
            ]}
          >
            <Text style={styles.eventText} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        );
      } else {
        // 週をまたぐ場合、各週ごとにバーを作成
        for (let row = startRow; row <= endRow; row++) {
          let segmentStartCol = 0;
          let segmentEndCol = 6;
          
          if (row === startRow) {
            segmentStartCol = currentIndex % 7;
          }
          if (row === endRow) {
            segmentEndCol = endIndex % 7;
          }
          
          const segmentWidth = (segmentEndCol - segmentStartCol + 1) * screenDimensions.cellWidth;
          
          // この週の次のposition indexを取得
          const positionIndex = weekEventPositions.get(row) || 0;
          weekEventPositions.set(row, positionIndex + 1);
          
          eventBars.push(
            <View
              key={`${event.id}-${row}`}
              style={[
                styles.continuousEventBar,
                {
                  left: segmentStartCol * screenDimensions.cellWidth + 1, // 左端1px
                  top: row * screenDimensions.cellHeight + 18 + (positionIndex * 12),
                  width: segmentWidth - 3, // 幅を3px狭く
                  backgroundColor: event.color,
                  borderRadius: 2,
                }
              ]}
            >
              <Text style={styles.eventText} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
          );
        }
      }
    });

    return eventBars;
  };

  // FlatListアイテムレンダリング
  const renderMonth = ({ item }: { item: MonthData }) => {
    // 初期日付からの絶対的オフセットで月を計算
    const baseDate = new Date(initialDate);
    const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + item.offset, 1);
    
    const monthData = generateMonthData(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getMonth()
    );
    
    return (
      <View style={{ width: dimensions.width }}>
        <View style={[styles.calendarGrid, { height: screenDimensions.cellHeight * 6 }]}>
          {monthData.map(renderDay)}
        </View>
        {/* イベントレイヤー */}
        <View style={styles.eventLayer}>
          {renderEventLayer(monthData)}
        </View>
      </View>
    );
  };

  const handleContainerLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContainerHeight(height);
  };

  // 週表示の場合はWeekCalendarを表示
  if (viewMode === 'week') {
    return (
      <WeekCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        markedDates={markedDates}
        onSelectedDatePress={onSelectedDatePress}
      />
    );
  }

  // 日表示の場合はDayCalendarを表示
  if (viewMode === 'day') {
    return (
      <DayCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        markedDates={markedDates}
        onSelectedDatePress={onSelectedDatePress}
      />
    );
  }

  return (
    <View 
      style={styles.container} 
      onLayout={handleContainerLayout}
    >
      {/* 曜日ヘッダー */}
      <View style={[styles.dayHeaderRow, { height: 35 }]}>
        {dayHeaders.map(renderDayHeader)}
      </View>
      
      {/* 無限スクロール可能なカレンダー */}
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        data={monthsData}
        renderItem={renderMonth}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, marginBottom: 0 }}
        getItemLayout={(data, index) => ({
          length: dimensions.width,
          offset: dimensions.width * index,
          index,
        })}
        initialScrollIndex={monthsData.length > 0 ? currentIndex : undefined}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={true}
        decelerationRate={0.99}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    flex: 1,
    margin: 0,
    padding: 0,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  dayHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e6e6e6',
  },
  lastDayHeader: {
    borderRightWidth: 0,
  },
  dayHeaderText: {
    fontSize: 13,
    color: '#999999',
    fontWeight: '400',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dayBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e6e6e6',
  },
  dayBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  dayText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#000000',
    paddingTop: 6,
  },
  otherMonthText: {
    color: '#d1d1d6',
  },
  todayText: {
    color: '#007AFF',
    fontWeight: '400',
  },
  weekendText: {
    color: '#007AFF', // 週末は青
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedCell: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // 薄い青
  },
  eventLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  continuousEventBar: {
    position: 'absolute',
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    paddingHorizontal: 4,
    zIndex: 11,
  },
  eventText: {
    fontSize: 8,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  moreEventsText: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 7,
    color: '#666666',
    fontWeight: '500',
  },
});