import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { CustomCalendar } from '@/src/components/CustomCalendar';
import { ShiftScanner } from '@/src/components/ShiftScanner';
import { Sidebar } from '@/src/components/Sidebar';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EventProvider, useEventContext } from '@/src/contexts/EventContext';
import { CalendarProvider, useCalendarContext } from '@/src/contexts/CalendarContext';
import { ViewMode } from '@/src/types';
import { Bars3Icon } from 'react-native-heroicons/outline';
import { useSettings } from '@/src/contexts/SettingsContext';

function CalendarScreenContent() {
  const { events, addEvent, updateEvent, deleteEvent, getFilteredEvents } = useEventContext();
  const { selectedCalendarId } = useCalendarContext();
  const { weekStartDay } = useSettings();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showShiftScanner, setShowShiftScanner] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // 選択されたカレンダーのイベントのみを取得
  const filteredEvents = useMemo(() => {
    return getFilteredEvents(selectedCalendarId);
  }, [events, selectedCalendarId, getFilteredEvents]);

  // イベントをmarkedDates形式に変換（CustomCalendar用）
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};
    
    // 各日付の予定リストを作成
    filteredEvents.forEach(event => {
      // 開始日と終了日を計算
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      // 日付をまたぐ予定の場合は各日に追加
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        
        if (!marked[dateString]) {
          marked[dateString] = {
            hasEvent: true,
            events: [],
          };
        }
        
        // 予定情報を追加
        marked[dateString].events.push({
          id: event.id,
          title: event.title,
          color: event.color || '#007AFF',
          start: event.start,
          end: event.end,
          isAllDay: event.isAllDay,
          location: event.location,
          notes: event.notes,
          isStart: currentDate.getTime() === startDate.getTime(),
          isEnd: currentDate.getTime() === endDate.getTime(),
          isMultiDay: startDate.getTime() !== endDate.getTime(),
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    return marked;
  }, [filteredEvents]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleSelectedDatePress = (date: string) => {
    setShowBottomSheet(true);
  };

  // 年月の日本語表示を生成
  const formatMonthYear = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };

  const handleImageCapture = async (imageUri: string) => {
    console.log('Captured image:', imageUri);
    try {
      // ハイブリッドAIサービスでシフト表解析
      const { hybridAIService } = await import('@/src/services/hybridAIService');
      const result = await hybridAIService.analyzeShiftImage(imageUri);
      
      // TODO: 解析結果をカレンダーに反映
      console.log('シフト解析結果:', result);
    } catch (error) {
      console.error('シフト解析エラー:', error);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.hamburgerButton}
          onPress={() => setShowSidebar(true)}
        >
          <Bars3Icon size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{formatMonthYear(currentMonth)}</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <CustomCalendar
        viewMode={viewMode}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        markedDates={markedDates}
        onMonthChange={(year: number, month: number) => {
          setCurrentMonth(new Date(year, month, 1));
        }}
        onSelectedDatePress={handleSelectedDatePress}
        weekStartDay={weekStartDay}
      />
      

      <Modal
        visible={showShiftScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ShiftScanner
          onImageCapture={handleImageCapture}
          onClose={() => setShowShiftScanner(false)}
        />
      </Modal>

      <Sidebar
        isVisible={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <BottomSheet
        isVisible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        selectedDate={selectedDate}
        events={filteredEvents}
        onEventCreate={(event) => {
          // 現在選択されているカレンダーIDを追加
          const eventWithCalendarId = {
            ...event,
            calendarId: selectedCalendarId
          };
          addEvent(eventWithCalendarId);
          setShowBottomSheet(false);
        }}
        onEventUpdate={(id, event) => {
          updateEvent(id, event);
          setShowBottomSheet(false);
        }}
        onEventDelete={(id) => {
          deleteEvent(id);
          setShowBottomSheet(false);
        }}
      />

      {/* 表示モード切り替えフッター */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.footerButtonText, viewMode === 'month' && styles.activeTabText]}>月</Text>
          {viewMode === 'month' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setViewMode('week')}
        >
          <Text style={[styles.footerButtonText, viewMode === 'week' && styles.activeTabText]}>週</Text>
          {viewMode === 'week' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.footerButton}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.footerButtonText, viewMode === 'day' && styles.activeTabText]}>日</Text>
          {viewMode === 'day' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
  },
  hamburgerButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 24,
    height: 24,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  footer: {
    height: 49,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d1d6',
    paddingHorizontal: 0,
  },
  footerButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 49,
    position: 'relative',
  },
  footerButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#999999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 2,
    backgroundColor: '#007AFF',
  },
});

export default function CalendarScreen() {
  return (
    <CalendarProvider>
      <EventProvider>
        <CalendarScreenContent />
      </EventProvider>
    </CalendarProvider>
  );
}
