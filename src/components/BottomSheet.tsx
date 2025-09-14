import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { EventCreateScreen } from '../screens/EventCreateScreen';
import { CalendarEvent } from '../contexts/EventContext';
import { BaseBottomSheet } from './BaseBottomSheet';

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate?: string;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, event: any) => void;
  onEventDelete?: (id: string) => void;
  events?: CalendarEvent[];
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  selectedDate,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  events = [],
}) => {
  const [showEventCreate, setShowEventCreate] = useState(false);
  const [scrollViewAtTop, setScrollViewAtTop] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // 選択された日の予定をフィルタリング
  const dayEvents = events.filter(event => {
    if (!selectedDate) return false;
    const eventDate = event.start.toISOString().split('T')[0];
    return eventDate === selectedDate;
  });

  // 予定を時間順にソート（全日イベントを先頭に）
  const sortedEvents = dayEvents.sort((a, b) => {
    // 全日イベントを先頭に
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    
    // 両方とも全日または両方とも時間指定の場合は開始時間順
    if (a.start.getTime() !== b.start.getTime()) {
      return a.start.getTime() - b.start.getTime();
    }
    
    // 開始時間が同じ場合は期間が長い順
    const durationA = b.end.getTime() - b.start.getTime();
    const durationB = a.end.getTime() - a.start.getTime();
    
    if (durationB !== durationA) {
      return durationB - durationA;
    }
    return a.id.localeCompare(b.id);
  });

  // 日付のフォーマット
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  // 曜日を取得
  const getDayOfWeek = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `（${days[date.getDay()]}）`;
  };

  // 時間をフォーマット
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // 新しい予定を作成
  const handleCreateEvent = () => {
    setEditingEvent(null);
    onClose(); // メインボトムシートを閉じる
    setShowEventCreate(true);
  };

  // 予定を編集
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    onClose(); // メインボトムシートを閉じる
    setShowEventCreate(true);
  };

  // EventCreateScreenから戻る
  const handleEventCreateClose = () => {
    setShowEventCreate(false);
    setEditingEvent(null);
  };

  // スクロール位置の監視
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const atTop = contentOffset.y <= 0;
    setScrollViewAtTop(atTop);
  };

  return (
    <>
      {/* メインの予定一覧ボトムシート */}
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.9}
        showHandle={true}
        showCloseButton={false}
        disableSwipeWhenScrollAtTop={!scrollViewAtTop}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.dateText}>
            {formatDate(selectedDate)}
            {getDayOfWeek(selectedDate)}
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleCreateEvent}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 予定一覧 */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.eventsList}>
            {sortedEvents.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <Text style={styles.noEventsText}>予定はありません</Text>
                <TouchableOpacity 
                  style={styles.createEventButton}
                  onPress={handleCreateEvent}
                >
                  <Text style={styles.createEventButtonText}>予定を作成</Text>
                </TouchableOpacity>
              </View>
            ) : (
              sortedEvents.map((event) => (
                <TouchableOpacity 
                  key={event.id} 
                  style={styles.eventItem}
                  onPress={() => handleEditEvent(event)}
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
                    <Text style={styles.eventNotes} numberOfLines={2}>
                      {event.notes}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </BaseBottomSheet>

      {/* 予定作成・編集ボトムシート */}
      <BaseBottomSheet
        isVisible={showEventCreate}
        onClose={handleEventCreateClose}
        height={0.9}
        showHandle={true}
        showCloseButton={true}
        disableSwipeWhenScrollAtTop={!scrollViewAtTop}
      >
        <EventCreateScreen
          isVisible={true}
          onClose={handleEventCreateClose}
          onSave={(eventData) => {
            if (editingEvent && onEventUpdate) {
              onEventUpdate(editingEvent.id, eventData);
            } else if (onEventCreate) {
              onEventCreate(eventData);
            }
            handleEventCreateClose();
          }}
          onDelete={editingEvent ? (eventId) => {
            if (onEventDelete) {
              onEventDelete(eventId);
            }
            handleEventCreateClose();
          } : undefined}
          initialDate={selectedDate}
          editingEvent={editingEvent}
          onScrollChange={setScrollViewAtTop}
        />
      </BaseBottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  eventsList: {
    paddingBottom: 20,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  createEventButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createEventButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  eventItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  eventNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});