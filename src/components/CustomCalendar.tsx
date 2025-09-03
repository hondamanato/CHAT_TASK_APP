import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { ViewMode } from '../types';
import { WeekCalendar } from './WeekCalendar';
import { DayCalendar } from './DayCalendar';
import { useSettings } from '../contexts/SettingsContext';
import { useHolidayContext } from '../contexts/HolidayContext';
const rokuyo = require('rokuyo');

interface CustomCalendarProps {
  viewMode: ViewMode;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  markedDates?: { [key: string]: any };
  onMonthChange?: (year: number, month: number) => void;
  onSelectedDatePress?: (date: string) => void;
  weekStartDay?: string; // 週の始まり設定
}

interface EventInfo {
  id: string;
  title: string;
  color: string;
  isStart: boolean;
  isEnd: boolean;
  isMultiDay: boolean;
}

// 統一されたセル内要素のインターフェース
interface CellItem {
  id: string;
  title: string;
  type: 'rokuyou' | 'holiday' | 'event' | 'schedule';
  color?: string;
  isMultiDay: boolean;
  isStart?: boolean;
  isEnd?: boolean;
  duration?: number; // 予定の期間（日数）
  createdAt?: string; // 作成日時（ソート用）
  priority: number; // 表示優先度（1: 六曜、2: 複数日の個人予定、3: 祝日・行事、4: 単日の個人予定）
  displayOrder: number; // 表示順序（同じ優先度内での順序）
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
  rokuyou?: string;
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
  weekStartDay = '日曜日',
}) => {
  const { showRokuyou } = useSettings();
  const { holidays, events, showHolidays, showEvents, selectedColor, loadHolidaysSimple } = useHolidayContext();
  const [currentViewYear, setCurrentViewYear] = useState<number>(new Date(selectedDate).getFullYear());
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [lastLoadedYear, setLastLoadedYear] = useState<number | null>(null);
  const [isLoadingYear, setIsLoadingYear] = useState<boolean>(false);
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

  // 六曜キャッシュ
  const rokuyouCache = useMemo(() => new Map<string, string | undefined>(), []);

  // 簡易六曜計算（フォールバック用）
  const getSimpleRokuyo = useCallback((year: number, month: number, day: number): string => {
    // 六曜の順序
    const rokuyouList = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
    
    // 簡易計算：(月 + 日) % 6 で六曜を決定
    // この計算は正確な旧暦計算ではないが、一貫したパターンを提供
    const index = (month + day) % 6;
    return rokuyouList[index];
  }, []);

  // 六曜を取得する関数（キャッシュ付き）
  const getRokuyou = useCallback((date: Date): string | undefined => {
    if (!showRokuyou) return undefined;
    
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    if (rokuyouCache.has(key)) {
      return rokuyouCache.get(key);
    }
    
    try {
      const result = rokuyo.getByDate(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );
      
      let rokuyouValue: string | undefined;
      
      if (result && result.kanji) {
        // rokuyoパッケージから正常に取得できた場合
        rokuyouValue = result.kanji;
      } else {
        // rokuyoパッケージがnull/undefinedを返した場合はフォールバック計算を使用
        rokuyouValue = getSimpleRokuyo(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        );
      }
      
      rokuyouCache.set(key, rokuyouValue);
      return rokuyouValue;
    } catch (error) {
      console.warn('六曜計算エラー:', error);
      // エラーが発生した場合も簡易計算を使用
      const fallbackValue = getSimpleRokuyo(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
      );
      rokuyouCache.set(key, fallbackValue);
      return fallbackValue;
    }
  }, [showRokuyou, rokuyouCache, getSimpleRokuyo]);

  // 祝日・行事データをmarkedDates形式に統合する関数
  const mergeHolidaysAndEventsToMarkedDates = useCallback((originalMarkedDates: { [key: string]: any }) => {
    const merged = { ...originalMarkedDates };
    
    // 祝日データを追加
    if (showHolidays) {
      Object.entries(holidays).forEach(([dateStr, holidayList]) => {
        if (holidayList && holidayList.length > 0) {
          if (!merged[dateStr]) {
            merged[dateStr] = { hasEvent: false, events: [] };
          }
          
          holidayList.forEach((holiday, holidayIndex) => {
            const holidayEventId = `holiday-${dateStr}-${holidayIndex}-${holiday.name}`;
            
            // 重複チェック：既に同じIDのイベントが存在するかチェック
            const existingEvent = merged[dateStr].events.find((e: any) => e.id === holidayEventId);
            if (!existingEvent) {
              const holidayEvent = {
                id: holidayEventId,
                title: holiday.localName || holiday.name,
                color: selectedColor,
                isStart: true,
                isEnd: true,
                isMultiDay: false,
              };
              merged[dateStr].events.push(holidayEvent);
              merged[dateStr].hasEvent = true;
            }
          });
        }
      });
    }
    
    // 行事データを追加
    if (showEvents) {
      Object.entries(events).forEach(([dateStr, eventList]) => {
        if (eventList && eventList.length > 0) {
          if (!merged[dateStr]) {
            merged[dateStr] = { hasEvent: false, events: [] };
          }
          
          eventList.forEach((event, eventIndex) => {
            const eventItemId = `event-${dateStr}-${eventIndex}-${event.name}`;
            
            // 重複チェック：既に同じIDのイベントが存在するかチェック
            const existingEvent = merged[dateStr].events.find((e: any) => e.id === eventItemId);
            if (!existingEvent) {
              const eventItem = {
                id: eventItemId,
                title: event.localName || event.name,
                color: event.color || selectedColor,
                isStart: true,
                isEnd: true,
                isMultiDay: false,
              };
              merged[dateStr].events.push(eventItem);
              merged[dateStr].hasEvent = true;
            }
          });
        }
      });
    }
    
    return merged;
  }, [holidays, events, showHolidays, showEvents, selectedColor]);

  // 月のデータを生成する関数
  const generateMonthData = useCallback((year: number, month: number, targetMonth: number): DayInfo[] => {
    const today = new Date();
    // ローカル時間で今日の日付文字列を生成
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 祝日・行事データを統合したmarkedDatesを作成
    const mergedMarkedDates = mergeHolidaysAndEventsToMarkedDates(markedDates);
    
    // その月の1日
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0: 日曜日, 1: 月曜日, ...
    
    // 週の始まりに応じて調整
    const adjustedStartDay = weekStartDay === '月曜日' 
      ? (startDay === 0 ? 6 : startDay - 1)
      : startDay;
    
    // その月の最後の日
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // 前月の最後の日
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days: DayInfo[] = [];
    
    // 前月の日付を追加
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const eventInfo = mergedMarkedDates?.[dateString];
      
      // 六曜を取得（キャッシュ付き）
      const rokuyouValue = getRokuyou(date);
      
      days.push({
        date: dateString,
        day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: weekStartDay === '月曜日' 
          ? (date.getDay() === 0 || date.getDay() === 6)  // 月曜始まりでも日曜(0)と土曜(6)が週末
          : (date.getDay() === 0 || date.getDay() === 6), // 日曜始まりでも日曜(0)と土曜(6)が週末
        isSelected: false,
        hasEvent: eventInfo?.hasEvent || false,
        events: eventInfo?.events || [],
        rokuyou: rokuyouValue,
      });
    }
    
    // 今月の日付を追加
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const isToday = dateString === todayString;
      const isSelected = dateString === selectedDate;
      const eventInfo = mergedMarkedDates?.[dateString];
      
      // 六曜を取得（キャッシュ付き）
      const rokuyouValue = getRokuyou(date);
      
      days.push({
        date: dateString,
        day,
        isCurrentMonth: true,
        isToday,
        isWeekend: weekStartDay === '月曜日' 
          ? (date.getDay() === 0 || date.getDay() === 6)  // 月曜始まりでも日曜(0)と土曜(6)が週末
          : (date.getDay() === 0 || date.getDay() === 6), // 日曜始まりでも日曜(0)と土曜(6)が週末
        isSelected,
        hasEvent: eventInfo?.hasEvent || false,
        events: eventInfo?.events || [],
        rokuyou: rokuyouValue,
      });
    }
    
    // 来月の日付を追加（42日になるまで）
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const eventInfo = mergedMarkedDates?.[dateString];
      
      // 六曜を取得（キャッシュ付き）
      const rokuyouValue = getRokuyou(date);
      
      days.push({
        date: dateString,
        day,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: weekStartDay === '月曜日' 
          ? (date.getDay() === 0 || date.getDay() === 6)  // 月曜始まりでも日曜(0)と土曜(6)が週末
          : (date.getDay() === 0 || date.getDay() === 6), // 日曜始まりでも日曜(0)と土曜(6)が週末
        isSelected: false,
        hasEvent: eventInfo?.hasEvent || false,
        events: eventInfo?.events || [],
        rokuyou: rokuyouValue,
      });
    }
    
    return days;
  }, [selectedDate, markedDates, weekStartDay, showRokuyou, getRokuyou, mergeHolidaysAndEventsToMarkedDates]);

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

  // 曜日ヘッダー（週の始まりに応じて調整）
  const dayHeaders = weekStartDay === '月曜日' 
    ? ['月', '火', '水', '木', '金', '土', '日']
    : ['日', '月', '火', '水', '木', '金', '土'];

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
        
        // 年が変更された場合は祝日データを読み込み（重複防止）
        const newYear = newViewDate.getFullYear();
        if (newYear !== currentViewYear) {
          console.log(`年が変更されました: ${currentViewYear} → ${newYear}`);
          setCurrentViewYear(newYear);
          
          // 重複ロードと無限ループを防ぐためのより強力なガード
          if (lastLoadedYear !== newYear && !isLoadingYear) {
            setIsLoadingYear(true);
            setLastLoadedYear(newYear);
            
            // throttling: 連続する年変更を防ぐため遅延
            setTimeout(async () => {
              try {
                await loadHolidaysSimple(newYear);
              } catch (error) {
                console.error('祝日データロードエラー:', error);
              } finally {
                setIsLoadingYear(false);
              }
            }, 300);
          }
        }
        
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
        {showRokuyou && dayInfo.rokuyou && (
          <Text
            style={[
              styles.rokuyouText,
              !dayInfo.isCurrentMonth && styles.otherMonthText,
              dayInfo.isSelected && styles.selectedText,
            ]}
          >
            {dayInfo.rokuyou}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // CellItemを生成するヘルパー関数
  // 指定された優先順位でCellItemを作成し、表示順序を管理
  const createCellItem = (
    id: string,
    title: string,
    type: 'rokuyou' | 'holiday' | 'event' | 'schedule',
    priority: number,
    options: {
      color?: string;
      isMultiDay?: boolean;
      isStart?: boolean;
      isEnd?: boolean;
      duration?: number;
      createdAt?: string;
      displayOrder?: number;
    } = {}
  ): CellItem => {
    return {
      id,
      title,
      type,
      priority,
      color: options.color,
      isMultiDay: options.isMultiDay || false,
      isStart: options.isStart || false,
      isEnd: options.isEnd || false,
      duration: options.duration,
      createdAt: options.createdAt,
      displayOrder: options.displayOrder || 0,
    };
  };

  // 六曜のCellItemを生成するヘルパー関数
  const createRokuyouCellItem = (date: string, rokuyou: string): CellItem => {
    return createCellItem(
      `rokuyou-${date}`,
      rokuyou,
      'rokuyou',
      1, // 最優先
      { displayOrder: 0 }
    );
  };

  // 祝日・行事のCellItemを生成するヘルパー関数
  const createHolidayCellItem = (
    event: EventInfo,
    displayOrder: number
  ): CellItem => {
    return createCellItem(
      event.id,
      event.title,
      'holiday',
      3, // 祝日・行事の優先度
      {
        color: event.color,
        isMultiDay: event.isMultiDay,
        isStart: event.isStart,
        isEnd: event.isEnd,
        duration: event.isMultiDay ? calculateEventDuration(event) : 1,
        createdAt: event.id,
        displayOrder,
      }
    );
  };

  // 個人予定のCellItemを生成するヘルパー関数
  const createScheduleCellItem = (
    event: EventInfo,
    displayOrder: number
  ): CellItem => {
    const priority = event.isMultiDay ? 2 : 4; // 複数日=2, 単日=4
    const duration = event.isMultiDay ? calculateEventDuration(event) : 1;
    
    return createCellItem(
      event.id,
      event.title,
      'schedule',
      priority,
      {
        color: event.color,
        isMultiDay: event.isMultiDay,
        isStart: event.isStart,
        isEnd: event.isEnd,
        duration,
        createdAt: event.id,
        displayOrder,
      }
    );
  };

  // セル内のすべての要素（六曜、祝日、行事、予定）を統合してソートする関数
  // 新しい統一ロジック：
  // 1. すべての表示要素をCellItemとして統一
  // 2. 優先順位でソート（六曜 → 複数日の個人予定 → 祝日・行事 → 単日の個人予定）
  // 3. 同じ優先度内では表示順序でソート
  // 4. 表示制限を適用（六曜含めて最大6つ）
  const createUnifiedCellItems = (dayInfo: DayInfo): CellItem[] => {
    const items: CellItem[] = [];
    
    // dayInfoがundefinedの場合は空配列を返す
    if (!dayInfo) {
      return items;
    }
    
    // 1. 六曜を追加（showRokuyou設定に基づく）
    if (showRokuyou && dayInfo.rokuyou) {
      items.push(createRokuyouCellItem(dayInfo.date, dayInfo.rokuyou));
    }
    
    // 2. イベント（祝日・行事・予定）を追加
    if (dayInfo.events && dayInfo.events.length > 0) {
      // 同じ優先度内での表示順序を管理
      const priorityCounters = { 2: 0, 3: 0, 4: 0 };
      
      dayInfo.events.forEach(event => {
        const eventType = getEventType(event);
        
        // 祝日・行事は showHolidays/showEvents 設定をチェック
        if ((eventType === 'holiday' && !showHolidays) || 
            (eventType === 'event' && !showEvents)) {
          return; // 表示設定がOFFの場合はスキップ
        }
        
        // 優先度を決定
        let priority: number;
        if (eventType === 'holiday' || eventType === 'event') {
          priority = 3; // 祝日・行事
        } else {
          // 個人予定
          priority = event.isMultiDay ? 2 : 4; // 複数日=2, 単日=4
        }
        
        // 同じ優先度内での表示順序を設定
        const displayOrder = priorityCounters[priority as keyof typeof priorityCounters] || 0;
        priorityCounters[priority as keyof typeof priorityCounters] = displayOrder + 1;
        
        // 適切なヘルパー関数を使用してCellItemを作成
        if (eventType === 'holiday' || eventType === 'event') {
          items.push(createHolidayCellItem(event, displayOrder));
        } else {
          items.push(createScheduleCellItem(event, displayOrder));
        }
      });
    }
    
    return items;
  };
  
  // 統合された要素のソート関数
  // 優先順位：
  // 1. 優先度（六曜=1, 複数日の個人予定=2, 祝日・行事=3, 単日の個人予定=4）
  // 2. 同じ優先度内での表示順序
  // 3. 複数日の個人予定の場合、期間の長い順
  // 4. 単日の個人予定の場合、作成日時の早い順
  // 5. その他の場合はID順
  const sortCellItems = (items: CellItem[]): CellItem[] => {
    return items.sort((a, b) => {
      // 1. 優先度順（六曜 → 複数日の個人予定 → 祝日・行事 → 単日の個人予定）
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // 2. 同じ優先度内での表示順序
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      
      // 3. 複数日の個人予定の場合（priority = 2）、期間の長い順
      if (a.priority === 2 && b.priority === 2) {
        const aDuration = a.duration || 1;
        const bDuration = b.duration || 1;
        if (aDuration !== bDuration) {
          return bDuration - aDuration; // 長い期間が上
        }
      }
      
      // 4. 単日の個人予定の場合（priority = 4）、作成日時の早い順
      if (a.priority === 4 && b.priority === 4) {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      
      // 5. その他の場合はID順（祝日・行事など）
      return a.id.localeCompare(b.id);
    });
  };

  // 予定の期間を計算する関数
  const calculateEventDuration = (event: EventInfo): number => {
    if (!event.isMultiDay) return 1;
    
    // markedDatesから該当イベントの開始日と終了日を探して期間を計算
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // markedDatesをスキャンして同じIDの予定の開始日と終了日を見つける
    Object.entries(markedDates).forEach(([dateStr, dateInfo]) => {
      if (dateInfo.events) {
        const matchingEvent = dateInfo.events.find((e: EventInfo) => e.id === event.id);
        if (matchingEvent) {
          const currentDate = new Date(dateStr);
          if (matchingEvent.isStart) {
            startDate = currentDate;
          }
          if (matchingEvent.isEnd) {
            endDate = currentDate;
          }
        }
      }
    });
    
    // 開始日と終了日が見つかった場合は日数を計算
    if (startDate !== null && endDate !== null) {
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    }
    
    // フォールバック：同じIDの予定の数をカウント
    let eventCount = 0;
    Object.values(markedDates).forEach(dateInfo => {
      if (dateInfo.events) {
        const hasThisEvent = dateInfo.events.some((e: EventInfo) => e.id === event.id);
        if (hasThisEvent) eventCount++;
      }
    });
    
    return Math.max(1, eventCount);
  };

  // イベントタイプを判定する関数
  const getEventType = (event: EventInfo): 'holiday' | 'event' | 'schedule' => {
    if (event.id.startsWith('holiday-')) return 'holiday';
    if (event.id.startsWith('event-')) return 'event';
    return 'schedule';
  };
  
  // CellItemをEventInfoに変換するヘルパー関数
  const cellItemToEventInfo = (item: CellItem): EventInfo => ({
    id: item.id,
    title: item.title,
    color: item.color || '#666666',
    isStart: item.isStart || false,
    isEnd: item.isEnd || false,
    isMultiDay: item.isMultiDay,
  });

  // Y座標を計算するヘルパー関数
  // 並び替えたリストのインデックスに基づいてY座標を計算
  // これにより、六曜や祝日が表示されない日は自動的に下の予定が上に詰めて表示される
  const calculateYPosition = (
    baseTop: number,
    itemIndex: number,
    itemHeight: number = 14,
    itemSpacing: number = 0
  ): number => {
    return baseTop + (itemIndex * (itemHeight + itemSpacing));
  };

  // 表示要素を描画するヘルパー関数
  // 並び替えたリストを元に上から順番に要素を描画
  const renderDisplayItems = (
    displayItems: CellItem[],
    dayInfo: DayInfo,
    dayIndex: number,
    eventTopOffset: number,
    dailyProcessedEvents: Set<string>,
    monthData: DayInfo[],
    multiDayEventPositions: Map<string, number>
  ): React.JSX.Element[] => {
    const eventBars: React.JSX.Element[] = [];
    const row = Math.floor(dayIndex / 7);
    const col = dayIndex % 7;
    
    // 並び替えたリストのインデックスに基づいてY座標を計算
    displayItems.forEach((item, itemIndex) => {
      // CellItemをEventInfoに変換
      const event = cellItemToEventInfo(item);
      const isHoliday = item.type === 'holiday';
      const eventType = isHoliday ? 'holiday' : 'schedule';
      
      // Y座標をリストのインデックスに基づいて計算
      const yPosition = calculateYPosition(
        row * screenDimensions.cellHeight + eventTopOffset,
        itemIndex
      );
      
      if (event.isMultiDay) {
        // 複数日予定の場合、事前に計算された位置を使用
        const preCalculatedPosition = multiDayEventPositions.get(event.id);
        
        // 複数日予定の重複チェック
        const multiDayEventKey = `${event.id}-${dayInfo.date}`;
        if (dailyProcessedEvents.has(multiDayEventKey)) {
          return; // 既に処理済みの場合はスキップ
        }
        
        if (event.isStart && preCalculatedPosition !== undefined) {
          // 開始日の場合、横に伸びるバーを作成
          let endIndex = dayIndex;
          for (let i = dayIndex; i < monthData.length; i++) {
            const hasThisEvent = monthData[i].events?.some((e: any) => e.id === event.id);
            if (hasThisEvent) {
              endIndex = i;
            } else {
              break;
            }
          }
          
          const startRow = Math.floor(dayIndex / 7);
          const endRow = Math.floor(endIndex / 7);
          
          if (startRow === endRow) {
            // 同じ週内の場合
            const startCol = dayIndex % 7;
            const endCol = endIndex % 7;
            const width = (endCol - startCol + 1) * screenDimensions.cellWidth;
            
            eventBars.push(
              <View
                key={`${event.id}-${dayIndex}-${eventType}-continuous-${itemIndex}`}
                style={[
                  styles.continuousEventBar,
                  {
                    left: startCol * screenDimensions.cellWidth + 1,
                    top: yPosition,
                    width: width - 3,
                    backgroundColor: event.color,
                    borderRadius: 2,
                    zIndex: 1000 - item.priority, // 優先度が高いほど前面に表示
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
            for (let currentRow = startRow; currentRow <= endRow; currentRow++) {
              let segmentStartCol = 0;
              let segmentEndCol = 6;
              
              if (currentRow === startRow) {
                segmentStartCol = dayIndex % 7;
              }
              if (currentRow === endRow) {
                segmentEndCol = endIndex % 7;
              }
              
              const segmentWidth = (segmentEndCol - segmentStartCol + 1) * screenDimensions.cellWidth;
              
              eventBars.push(
                <View
                  key={`${event.id}-${currentRow}-${dayIndex}-${eventType}-continuous-${itemIndex}`}
                  style={[
                    styles.continuousEventBar,
                    {
                      left: segmentStartCol * screenDimensions.cellWidth + 1,
                      top: yPosition,
                      width: segmentWidth - 3,
                      backgroundColor: event.color,
                      borderRadius: 2,
                      zIndex: 1000 - item.priority, // 優先度が高いほど前面に表示
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
          dailyProcessedEvents.add(multiDayEventKey);
        }
      } else {
        // 単日予定の場合 - 重複チェック
        const singleEventKey = `${event.id}-${dayInfo.date}`;
        
        if (!dailyProcessedEvents.has(singleEventKey)) {
          eventBars.push(
            <View
              key={`${event.id}-${dayIndex}-${eventType}-single-${itemIndex}`}
              style={[
                styles.singleEventBar,
                {
                  left: col * screenDimensions.cellWidth + 2,
                  top: yPosition,
                  width: screenDimensions.cellWidth - 4,
                  backgroundColor: event.color,
                  borderRadius: 2,
                  zIndex: 1000 - item.priority, // 優先度が高いほど前面に表示
                }
              ]}
            >
              <Text style={styles.eventText} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
          );
          dailyProcessedEvents.add(singleEventKey);
        }
      }
    });
    
    return eventBars;
  };

  // 残りの予定を表示するヘルパー関数
  const renderRemainingCount = (
    remainingCount: number,
    dayInfo: DayInfo,
    dayIndex: number,
    eventTopOffset: number,
    displayItemsCount: number
  ): React.JSX.Element | null => {
    if (remainingCount <= 0) return null;
    
    const row = Math.floor(dayIndex / 7);
    const col = dayIndex % 7;
    
    // 最後の表示位置に「+X件」を配置
    const yPosition = calculateYPosition(
      row * screenDimensions.cellHeight + eventTopOffset,
      displayItemsCount
    );
    
    return (
      <View
        key={`more-events-${dayInfo.date}-${dayIndex}-${remainingCount}`}
        style={[
          styles.moreEventsBar,
          {
            left: col * screenDimensions.cellWidth + 2,
            top: yPosition,
            width: screenDimensions.cellWidth - 4,
            backgroundColor: 'rgba(102, 102, 102, 0.8)',
            borderRadius: 2,
            zIndex: 1000 - 5, // 最前面に表示
          }
        ]}
      >
        <Text style={styles.moreEventsText} numberOfLines={1}>
          +{remainingCount}件
        </Text>
      </View>
    );
  };

  // 表示要素の収集と並び替えを行うヘルパー関数
  // 指定された日付のすべての表示要素を収集し、優先順位に従って並び替える
  const collectAndSortDisplayItems = (dayInfo: DayInfo): {
    sortedItems: CellItem[];
    hasRokuyou: boolean;
    availableSlotsForEvents: number;
    displayItems: CellItem[];
    remainingCount: number;
  } => {
    // セル内のすべての要素を収集してソート
    const cellItems = createUnifiedCellItems(dayInfo);
    const sortedItems = sortCellItems(cellItems);
    
    if (sortedItems.length === 0) {
      return {
        sortedItems: [],
        hasRokuyou: false,
        availableSlotsForEvents: 6,
        displayItems: [],
        remainingCount: 0,
      };
    }
    
    // 六曜の有無を確認
    const hasRokuyou = Boolean(showRokuyou && dayInfo.rokuyou);
    const totalSlots = 6; // 六曜含めて最大6つの表示枠
    const availableSlotsForEvents = hasRokuyou ? totalSlots - 1 : totalSlots;
    
    // 表示するアイテムを制限（六曜を除く）
    const nonRokuyouItems = sortedItems.filter(item => item.type !== 'rokuyou');
    
    // 表示制限を適用
    let displayItems: CellItem[];
    let remainingCount: number;
    
    if (nonRokuyouItems.length > availableSlotsForEvents) {
      // 予定が上限を超える場合：最後の1枠を「+X件」用に確保
      displayItems = nonRokuyouItems.slice(0, availableSlotsForEvents - 1);
      remainingCount = nonRokuyouItems.length - displayItems.length;
    } else {
      // 予定が上限以内の場合：すべて表示
      displayItems = nonRokuyouItems;
      remainingCount = 0;
    }
    
    return {
      sortedItems,
      hasRokuyou,
      availableSlotsForEvents,
      displayItems,
      remainingCount,
    };
  };

  // イベントレイヤーのレンダリング
  // 新しい統一ロジックによる表示：
  // 1. 各セル内の要素を統合してソート（collectAndSortDisplayItems関数を使用）
  // 2. 優先順位に従って表示位置を決定
  // 3. 複数日予定は事前に位置を計算
  // 4. 表示制限を適用（六曜含めて最大6つ）
  // 5. 残りの予定は「+X件」として表示
  // 
  // 改善点：
  // - ヘルパー関数によるコードの分離と再利用性の向上
  // - 明確な優先順位システム（六曜→複数日予定→祝日・行事→単日予定）
  // - 効率的な表示制限の管理
  // - 重複処理の削減
  // - Y座標の自動計算による要素の重複防止
  // - 並び替えたリストのインデックスに基づく自動配置
  const renderEventLayer = (monthData: DayInfo[]) => {
    const eventBars: React.JSX.Element[] = [];
    
    // 六曜表示による高さ調整を計算
    const getEventTopOffset = (dayInfo: DayInfo) => {
      // dayInfoがundefinedの場合はデフォルト値を返す
      if (!dayInfo) {
        return showRokuyou ? 30 : 20;
      }
      
      // 日付テキスト: 約16px
      // 六曜テキスト: showRokuyou && dayInfo.rokuyouの場合 約12px、そうでなければ 0px
      // マージン: 2px
      return (showRokuyou && dayInfo.rokuyou) ? 30 : 20; // 六曜ありの場合は30px、なしの場合は20px
    };
    
    // デフォルトの高さオフセット（六曜なしの場合）
    // 実際の各セルごとの高さは個別に計算される
    
    // 統一された位置管理システム
    const multiDayEventPositions = new Map<string, number>();
    let globalPosition = 0;
    
    // 優先度別に予定を分類し、位置を事前計算
    const holidayEvents: EventInfo[] = [];
    const scheduleEvents: EventInfo[] = [];
    
    monthData.forEach((dayInfo) => {
      if (dayInfo.events && dayInfo.events.length > 0) {
        dayInfo.events.forEach((event) => {
          if (event.isMultiDay && event.isStart && !multiDayEventPositions.has(event.id)) {
            const eventType = getEventType(event);
            if (eventType === 'holiday' || eventType === 'event') {
              holidayEvents.push(event);
            } else {
              scheduleEvents.push(event);
            }
          }
        });
      }
    });
    
    // 祝日・行事を最初に配置
    holidayEvents.forEach((event) => {
      multiDayEventPositions.set(event.id, globalPosition);
      globalPosition++;
    });
    
    // 通常の予定を祝日・行事の後に配置
    scheduleEvents.forEach((event) => {
      multiDayEventPositions.set(event.id, globalPosition);
      globalPosition++;
    });

    // 各日付セル内のすべての要素を統合して表示（最終修正版）
    monthData.forEach((dayInfo, dayIndex) => {
      // dayInfoがundefinedの場合はスキップ
      if (!dayInfo) {
        return;
      }
      
      // 新しいヘルパー関数を使用して表示要素を収集・並び替え
      const {
        sortedItems,
        hasRokuyou,
        availableSlotsForEvents,
        displayItems,
        remainingCount,
      } = collectAndSortDisplayItems(dayInfo);
      
      if (sortedItems.length === 0) return;
      
      const row = Math.floor(dayIndex / 7);
      const col = dayIndex % 7;
      
      // セル内での実際の表示位置を管理（ソート順に従って配置）
      let displayPosition = 0;
      
      // 六曜表示による高さ調整を計算（各日ごとに動的に）
      const eventTopOffset = getEventTopOffset(dayInfo);
      
      // 各日ごとに独立した重複チェック用のセット
      const dailyProcessedEvents = new Set<string>();
      
      // 新しいヘルパー関数を使用して表示要素を描画
      const displayEventBars = renderDisplayItems(
        displayItems,
        dayInfo,
        dayIndex,
        eventTopOffset,
        dailyProcessedEvents,
        monthData,
        multiDayEventPositions
      );
      eventBars.push(...displayEventBars);
      
      // 残りの予定がある場合は「+X件」を表示
      const remainingCountBar = renderRemainingCount(
        remainingCount,
        dayInfo,
        dayIndex,
        eventTopOffset,
        displayItems.length
      );
      if (remainingCountBar) {
        eventBars.push(remainingCountBar);
      }
    });

    // 優先度順にソートして、優先度の高い要素（大きいzIndex値）が先に描画されるようにする
    // これにより祝日・行事（zIndex=997）が個人予定（zIndex=996）より上（背面）に表示される
    const sortedEventBars = eventBars.sort((a, b) => {
      const aZIndex = parseInt(a.props.style[1].zIndex) || 0;
      const bZIndex = parseInt(b.props.style[1].zIndex) || 0;
      return aZIndex - bZIndex; // 小さいzIndex（低優先度）を後に、大きいzIndex（高優先度）を先に
    });
    
    return sortedEventBars;
  };

  // FlatListアイテムレンダリング
  const renderMonth = useCallback(({ item }: { item: MonthData }) => {
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
  }, [generateMonthData, renderDay, renderEventLayer, dimensions, screenDimensions, initialDate]);

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
  rokuyouText: {
    fontSize: 8,
    fontWeight: '400',
    color: '#666666',
    paddingTop: 1,
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
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  singleEventBar: {
    position: 'absolute',
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  eventText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  moreEventsText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  moreEventsBar: {
    position: 'absolute',
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
    paddingHorizontal: 4,
  },
});