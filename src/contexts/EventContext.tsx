import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNotification } from './NotificationContext';
import { EventService } from '../services/eventService';
import { useAuth } from './AuthContext';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  location?: { name: string; address?: string };
  notes?: string;
  reminders?: number[];
  isAllDay?: boolean;
  calendarId?: string | null;
  createdAt?: Date;
  notificationId?: string | null;
}

export interface EventCreateData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string; // オプショナル
  location?: { name: string; address?: string } | { name: '' };
  notes?: string;
  color: string;
  reminders?: number[];
  isAllDay?: boolean;
  calendarId?: string | null;
}

interface EventContextType {
  events: CalendarEvent[];
  loading: boolean;
  addEvent: (eventData: EventCreateData) => Promise<void>;
  updateEvent: (id: string, eventData: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForDate: (date: string) => CalendarEvent[];
  getEventsForCalendar: (calendarId: string | null) => CalendarEvent[];
  getFilteredEvents: (selectedCalendarId: string | null) => CalendarEvent[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEventContext = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
};

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();
  const { user } = useAuth();

  // ユーザーログイン時に予定を読み込み
  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.id) {
        setEvents([]);
        return;
      }

      setLoading(true);
      try {
        const loadedEvents = await EventService.getAllEvents(user.id);
        setEvents(loadedEvents);
        console.log('予定を読み込みました:', loadedEvents.length + '件');
      } catch (error) {
        console.error('予定読み込みエラー:', error);
        // エラー時はローカルデータを保持
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [user?.id]);

  const addEvent = async (eventData: EventCreateData) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      // EventCreateDataの検証
      if (!eventData || typeof eventData !== 'object') {
        console.error('Invalid eventData:', eventData);
        return;
      }

      // 必須フィールドの検証
      if (!eventData.title || typeof eventData.title !== 'string') {
        console.error('Invalid or missing title:', eventData.title);
        return;
      }

      // データベースに保存
      const newEvent = await EventService.createEvent(eventData, user.id);

      // ローカル状態を更新
      setEvents(prev => [...prev, newEvent]);

      // イベント作成後に通知をスケジューリング
      const scheduleNotification = async () => {
        try {
          const notificationId = await notification.scheduleEventNotification(
            newEvent.id,
            newEvent.title,
            newEvent.start
          );

          if (notificationId) {
            // 通知IDをデータベースとローカル状態に更新
            await EventService.updateEvent(newEvent.id, { notificationId }, user.id);
            setEvents(prev =>
              prev.map(event =>
                event.id === newEvent.id
                  ? { ...event, notificationId }
                  : event
              )
            );
          }
        } catch (error) {
          console.error('通知スケジューリングエラー:', error);
        }
      };

      scheduleNotification();
      console.log('Event added successfully:', newEvent);
    } catch (error) {
      console.error('Error adding event:', error);
      // エラーが発生してもアプリがクラッシュしないように処理を続行
    }
  };

  const updateEvent = async (id: string, eventData: any) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      if (!eventData || typeof eventData !== 'object') {
        console.error('Invalid eventData for update:', eventData);
        return;
      }

      // データベースを更新
      const updatedEvent = await EventService.updateEvent(id, eventData, user.id);

      // ローカル状態を更新
      setEvents(prev =>
        prev.map(event => (event.id === id ? updatedEvent : event))
      );

      console.log('Event updated successfully:', id);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      // 通知をキャンセル
      await notification.cancelEventNotifications(id);

      // データベースから削除
      await EventService.deleteEvent(id, user.id);

      // ローカル状態を更新
      setEvents(prev => prev.filter(event => event.id !== id));
      console.log('Event and notifications deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting event:', error);
      // エラーが発生してもローカルからは削除する
      setEvents(prev => prev.filter(event => event.id !== id));
    }
  };

  const getEventsForDate = (date: string): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = event.start.toISOString().split('T')[0];
      return eventDate === date;
    });
  };

  const getEventsForCalendar = (calendarId: string | null): CalendarEvent[] => {
    return events.filter(event => event.calendarId === calendarId);
  };

  const getFilteredEvents = (selectedCalendarId: string | null): CalendarEvent[] => {
    return events.filter(event => event.calendarId === selectedCalendarId);
  };

  const value: EventContextType = {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getEventsForCalendar,
    getFilteredEvents,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};