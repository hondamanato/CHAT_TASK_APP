import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNotification } from './NotificationContext';
import { EventService } from '../services/eventService';
import { useAuth } from './AuthContext';
import { generateRecurringEvents } from '../utils/recurrenceUtils';
import { RecurrenceSettings, EventCreateData as BaseEventCreateData } from '../types/recurrence';

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
  timezone?: string; // タイムゾーン情報
  recurrence?: RecurrenceSettings; // 繰り返し設定
}

export interface EventCreateData extends BaseEventCreateData {
  calendarId?: string | null;
}

interface EventContextType {
  events: CalendarEvent[];
  loading: boolean;
  addEvent: (eventData: EventCreateData) => Promise<void>;
  updateEvent: (id: string, eventData: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  deleteRecurringEventSeries: (seriesId: string) => Promise<void>;
  deleteRecurringEventsFuture: (eventId: string) => Promise<void>;
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

      // メインイベントをデータベースに保存
      const newEvent = await EventService.createEvent(eventData, user.id);

      // 繰り返し予定のシリーズIDを生成（メインイベントのIDを使用）
      const recurrenceSeriesId = eventData.recurrence && eventData.recurrence.type !== 'none' ? newEvent.id : null;

      // 繰り返しイベントが生成された場合、全てのイベントをローカル状態に追加
      const allNewEvents = [newEvent];
      const tempRecurringEvents: CalendarEvent[] = [];

      if (eventData.recurrence && eventData.recurrence.type !== 'none') {
        const recurringEvents = generateRecurringEvents(eventData, newEvent.id);

        // 繰り返しイベントを仮のIDでUIに即座に表示
        recurringEvents.forEach((recurringEvent, index) => {
          const tempEvent: CalendarEvent = {
            id: `temp_${Date.now()}_${index}`, // 仮のID
            title: recurringEvent.title,
            start: recurringEvent.start,
            end: recurringEvent.end,
            color: recurringEvent.color || eventData.color,
            location: recurringEvent.location || { name: '' },
            notes: recurringEvent.notes || '',
            reminders: recurringEvent.reminders || [],
            isAllDay: recurringEvent.isAllDay || false,
            calendarId: eventData.calendarId,
            createdAt: new Date(),
            notificationId: null,
          };
          tempRecurringEvents.push(tempEvent);
        });

        // UIを即座に更新（楽観的更新）
        setEvents(prev => [...prev, newEvent, ...tempRecurringEvents]);

        // バックグラウンドでデータベースに保存
        Promise.resolve().then(async () => {
          for (let i = 0; i < recurringEvents.length; i++) {
            const recurringEvent = recurringEvents[i];
            const tempEvent = tempRecurringEvents[i];

            try {
              const recurringEventData: EventCreateData = {
                title: recurringEvent.title,
                date: recurringEvent.start.toISOString().split('T')[0],
                startTime: recurringEvent.start.toTimeString().slice(0, 5),
                endTime: recurringEvent.end.toTimeString().slice(0, 5),
                location: recurringEvent.location,
                notes: recurringEvent.notes,
                color: recurringEvent.color || eventData.color,
                reminders: recurringEvent.reminders,
                isAllDay: recurringEvent.isAllDay,
                timezone: eventData.timezone, // タイムゾーン情報を引き継ぎ
                calendarId: eventData.calendarId,
                recurrence: { type: 'none', endCondition: 'never' },
              };

              const savedRecurringEvent = await EventService.createEvent(recurringEventData, user.id, recurrenceSeriesId);

              // 仮IDを実IDで置き換え
              setEvents(prev => prev.map(event =>
                event.id === tempEvent.id ? savedRecurringEvent : event
              ));
            } catch (error) {
              console.error('繰り返し予定の保存エラー:', error);
              // 保存に失敗した予定をUIから削除
              setEvents(prev => prev.filter(event => event.id !== tempEvent.id));
            }
          }
        });
      } else {
        // 単発イベントの場合は従来通り
        setEvents(prev => [...prev, newEvent]);
      }

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
      throw error; // エラーを呼び出し元に伝播
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

    // 削除対象のイベントを保存（ロールバック用）
    const eventToDelete = events.find(event => event.id === id);
    if (!eventToDelete) return;

    // UIを即座に更新（楽観的削除）
    setEvents(prev => prev.filter(event => event.id !== id));

    // 一時的なID（temp_で始まる）の場合はデータベース操作をスキップ
    if (id.startsWith('temp_')) {
      console.log('一時的なイベントを削除しました:', id);
      return;
    }

    try {
      // バックグラウンドで通知をキャンセルとデータベースから削除
      await notification.cancelEventNotifications(id);
      await EventService.deleteEvent(id, user.id);
      console.log('Event and notifications deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting event:', error);
      // 削除失敗時はイベントを復元
      setEvents(prev => [...prev, eventToDelete]);
    }
  };

  // 繰り返し予定シリーズ全体を削除
  const deleteRecurringEventSeries = async (seriesId: string) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      const targetEvent = events.find(event => event.id === seriesId);
      if (!targetEvent) {
        console.error('対象の予定が見つかりません');
        return;
      }

      // 繰り返し予定の場合：同じタイトルかつ同じ作成日の予定を検索
      // ※ recurrence_series_idカラムが追加されるまでの暫定対応
      let seriesEvents: CalendarEvent[] = [];

      if (targetEvent.recurrence && targetEvent.recurrence.type !== 'none') {
        // 繰り返し予定の場合、同じタイトルかつ作成日が近い（1分以内）予定を対象とする
        const targetCreatedAt = targetEvent.createdAt || new Date();
        const oneMinute = 60 * 1000; // 1分をミリ秒で

        seriesEvents = events.filter(event =>
          event.title === targetEvent.title &&
          event.createdAt &&
          Math.abs(event.createdAt.getTime() - targetCreatedAt.getTime()) <= oneMinute
        );
      } else {
        // 単発予定の場合は自分自身のみ
        seriesEvents = [targetEvent];
      }

      if (seriesEvents.length === 0) {
        await deleteEvent(seriesId);
        return;
      }

      // 削除対象のイベントを保存（ロールバック用）
      const eventsToDelete = [...seriesEvents];
      const eventIdsToDelete = seriesEvents.map(event => event.id);

      // UIを即座に更新（楽観的削除）
      setEvents(prev => prev.filter(event => !eventIdsToDelete.includes(event.id)));

      // バックグラウンドで削除処理
      Promise.resolve().then(async () => {
        try {
          // シリーズに属する全イベントの通知をキャンセル（一時的なIDはスキップ）
          for (const event of seriesEvents) {
            if (!event.id.startsWith('temp_')) {
              await notification.cancelEventNotifications(event.id);
            }
          }

          // 個別削除（一時的なIDはスキップ）
          for (const event of seriesEvents) {
            if (!event.id.startsWith('temp_')) {
              await EventService.deleteEvent(event.id, user.id);
            }
          }

          console.log('Recurring event series deleted successfully:', seriesId);
        } catch (error) {
          console.error('Error deleting recurring event series:', error);
          // 削除失敗時はイベントを復元
          setEvents(prev => [...prev, ...eventsToDelete]);
        }
      });
    } catch (error) {
      console.error('Error deleting recurring event series:', error);
    }
  };

  // 指定日以降の繰り返し予定を削除
  const deleteRecurringEventsFuture = async (eventId: string) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      const targetEvent = events.find(event => event.id === eventId);
      if (!targetEvent) {
        throw new Error('対象の予定が見つかりません');
      }

      // 同じタイトルで同じ日付以降の予定を検索
      let futureEvents = events.filter(event =>
        event.title === targetEvent.title &&
        event.start >= targetEvent.start
      );

      if (futureEvents.length === 0) {
        // 削除対象が見つからない場合は、単一の予定として削除
        await deleteEvent(eventId);
        return;
      }

      // 削除対象のイベントを保存（ロールバック用）
      const eventsToDelete = [...futureEvents];
      const eventIdsToDelete = futureEvents.map(event => event.id);

      // UIを即座に更新（楽観的削除）
      setEvents(prev => prev.filter(event => !eventIdsToDelete.includes(event.id)));

      // バックグラウンドで削除処理
      Promise.resolve().then(async () => {
        try {
          // 削除対象のイベントの通知をキャンセル
          for (const event of futureEvents) {
            await notification.cancelEventNotifications(event.id);
          }

          // 個別に削除
          for (const event of futureEvents) {
            await EventService.deleteEvent(event.id, user.id);
          }

          console.log('Future recurring events deleted successfully:', eventId);
        } catch (error) {
          console.error('Error deleting future recurring events:', error);
          // 削除失敗時はイベントを復元
          setEvents(prev => [...prev, ...eventsToDelete]);
        }
      });
    } catch (error) {
      console.error('Error deleting future recurring events:', error);
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
    deleteRecurringEventSeries,
    deleteRecurringEventsFuture,
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