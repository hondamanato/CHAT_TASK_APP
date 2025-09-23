import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNotification } from './NotificationContext';
import { EventService } from '../services/eventService';
import { useAuth } from './AuthContext';
import { RecurrenceSettings, EventCreateData as BaseEventCreateData } from '../types/recurrence';
import { RRuleService } from '../utils/rruleService';

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
  deleteEvent: (id: string, onComplete?: () => void) => Promise<void>;
  deleteRecurringEventSeries: (seriesId: string, onComplete?: () => void) => Promise<void>;
  deleteRecurringEventsFuture: (eventId: string, onComplete?: () => void) => Promise<void>;
  getEventsForDate: (date: string) => CalendarEvent[];
  getEventsForCalendar: (calendarId: string | null) => CalendarEvent[];
  getFilteredEvents: (selectedCalendarId: string | null) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number, calendarId: string | null) => Promise<CalendarEvent[]>;
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

      if (eventData.recurrence && eventData.recurrence.type !== 'none') {
        // 繰り返し予定の場合：親イベントのみデータベースに保存
        console.log('繰り返し予定の親イベントを作成しました:', newEvent.id);

        // 親イベントをローカル状態に追加（繰り返しインスタンスは動的生成で対応）
        setEvents(prev => [...prev, newEvent]);
      } else {
        // 単発イベントの場合は従来通り
        setEvents(prev => [...prev, newEvent]);
      }

      // イベント作成後に通知をスケジューリング
      const scheduleNotification = async () => {
        try {
          let notificationIds: string[] = [];

          if (eventData.reminders && eventData.reminders.length > 0) {
            // 複数の通知が設定されている場合
            notificationIds = await notification.scheduleEventNotifications(
              newEvent.id,
              newEvent.title,
              newEvent.start,
              eventData.reminders
            );
          } else {
            // デフォルトの通知設定を使用
            const defaultNotificationId = await notification.scheduleEventNotification(
              newEvent.id,
              newEvent.title,
              newEvent.start
            );
            if (defaultNotificationId) {
              notificationIds = [defaultNotificationId];
            }
          }

          if (notificationIds.length > 0) {
            // 最初の通知IDをデータベースとローカル状態に更新（互換性のため）
            const notificationId = notificationIds[0];
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

      // 動的生成された繰り返しインスタンスかチェック
      if (id.startsWith('recurring_')) {
        console.log('動的インスタンスの編集を例外イベントとして作成:', id);

        // 親IDと日付を抽出
        const parts = id.split('_');
        if (parts.length >= 3) {
          const parentEventId = parts[1];
          const timestamp = parseInt(parts[2]);
          const exceptionDate = new Date(timestamp).toISOString().split('T')[0];

          // 例外イベントとして作成
          const exceptionEvent = await EventService.createExceptionEvent(
            parentEventId,
            exceptionDate,
            eventData,
            user.id
          );

          // ローカル状態を更新（動的インスタンスを例外イベントで置き換え）
          setEvents(prev => prev.map(event =>
            event.id === id ? exceptionEvent : event
          ));

          console.log('例外イベントとして更新完了:', exceptionEvent.id);
          return;
        } else {
          console.error('動的インスタンスIDの解析に失敗:', id);
          return;
        }
      }

      // 通常のイベント更新
      const updatedEvent = await EventService.updateEvent(id, eventData, user.id);

      // ローカル状態を更新
      setEvents(prev =>
        prev.map(event => (event.id === id ? updatedEvent : event))
      );

      // 通知の更新処理
      const updateNotifications = async () => {
        try {
          // 既存の通知をキャンセル
          await notification.cancelEventNotifications(id);

          let notificationIds: string[] = [];

          if (eventData.reminders && eventData.reminders.length > 0) {
            // 複数の通知が設定されている場合
            notificationIds = await notification.scheduleEventNotifications(
              updatedEvent.id,
              updatedEvent.title,
              updatedEvent.start,
              eventData.reminders
            );
          } else {
            // デフォルトの通知設定を使用
            const defaultNotificationId = await notification.scheduleEventNotification(
              updatedEvent.id,
              updatedEvent.title,
              updatedEvent.start
            );
            if (defaultNotificationId) {
              notificationIds = [defaultNotificationId];
            }
          }

          if (notificationIds.length > 0) {
            // 最初の通知IDをデータベースとローカル状態に更新（互換性のため）
            const notificationId = notificationIds[0];
            await EventService.updateEvent(updatedEvent.id, { notificationId }, user.id);
            setEvents(prev =>
              prev.map(event =>
                event.id === updatedEvent.id
                  ? { ...event, notificationId }
                  : event
              )
            );
          }
        } catch (error) {
          console.error('通知更新エラー:', error);
        }
      };

      updateNotifications();
      console.log('Event updated successfully:', id);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const deleteEvent = async (id: string, onComplete?: () => void) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    // 動的生成された繰り返しインスタンスかチェック
    if (id.startsWith('recurring_')) {
      console.log('動的インスタンスの削除を例外削除として記録:', id);

      // 親IDと日付を抽出
      const parts = id.split('_');
      if (parts.length >= 3) {
        const parentEventId = parts[1];
        const timestamp = parseInt(parts[2]);
        const exceptionDate = new Date(timestamp).toISOString().split('T')[0];

        try {
          // 例外削除として記録
          await EventService.recordExceptionDeletion(parentEventId, exceptionDate, user.id);

          // ローカル状態から即座に削除
          setEvents(prev => prev.filter(event => event.id !== id));

          console.log('例外削除記録完了:', { parentEventId, exceptionDate });
          if (onComplete) onComplete();
          return;
        } catch (error) {
          console.error('例外削除記録エラー:', error);
          return;
        }
      } else {
        console.error('動的インスタンスIDの解析に失敗:', id);
        return;
      }
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
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error deleting event:', error);
      // 削除失敗時はイベントを復元
      setEvents(prev => [...prev, eventToDelete]);
    }
  };

  // 繰り返し予定シリーズ全体を削除
  const deleteRecurringEventSeries = async (seriesId: string, onComplete?: () => void) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      // 動的生成された繰り返しインスタンスの場合、親IDを抽出
      let parentEventId = seriesId;
      if (seriesId.startsWith('recurring_')) {
        const parts = seriesId.split('_');
        if (parts.length >= 3) {
          parentEventId = parts[1]; // recurring_{parentId}_{timestamp} から parentId を抽出
        }
      }

      // 親イベントを取得
      const parentEvent = events.find(event => event.id === parentEventId);
      if (!parentEvent) {
        console.error('親イベントが見つかりません:', parentEventId);
        return;
      }

      // 繰り返し予定の親イベントかチェック
      if (parentEvent.recurrence && parentEvent.recurrence.type !== 'none') {
        // ローカル状態から即座に削除：親イベントと関連する動的インスタンスをすべて削除
        setEvents(prev => prev.filter(event => {
          // 親イベント自体を削除
          if (event.id === parentEventId) return false;
          // 動的生成されたインスタンス（recurring_parentId_timestamp形式）を削除
          if (event.id.startsWith(`recurring_${parentEventId}_`)) return false;
          // 例外イベント（recurrence_series_idが親IDと一致）も削除
          if (event.id !== parentEventId && (event as any).recurrence_series_id === parentEventId) return false;
          return true;
        }));

        try {
          await notification.cancelEventNotifications(parentEventId);
          await EventService.deleteEvent(parentEventId, user.id);
          console.log('Recurring event series deleted successfully:', parentEventId);
          if (onComplete) onComplete();
        } catch (error) {
          console.error('Error deleting recurring event series:', error);
          // 削除失敗時は親イベントを復元
          setEvents(prev => [...prev, parentEvent]);
        }
      } else {
        // 単発予定の場合は通常の削除
        await deleteEvent(parentEventId, onComplete);
      }
    } catch (error) {
      console.error('Error deleting recurring event series:', error);
    }
  };

  // 指定日以降の繰り返し予定を削除
  const deleteRecurringEventsFuture = async (eventId: string, onComplete?: () => void) => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return;
    }

    try {
      // 動的生成された繰り返しインスタンスの場合、親IDを抽出
      let parentEventId = eventId;
      let targetDate: Date | null = null;

      if (eventId.startsWith('recurring_')) {
        const parts = eventId.split('_');
        if (parts.length >= 3) {
          parentEventId = parts[1]; // recurring_{parentId}_{timestamp} から parentId を抽出
          targetDate = new Date(parseInt(parts[2])); // timestampから日付を復元
        }
      }

      // 親イベントを取得
      const parentEvent = events.find(event => event.id === parentEventId);
      if (!parentEvent) {
        console.error('親イベントが見つかりません:', parentEventId);
        return;
      }

      if (!targetDate) {
        targetDate = new Date(parentEvent.start);
      }

      // 繰り返し予定の場合：終了日を設定することで指定日以降の発生を停止
      if (parentEvent.recurrence && parentEvent.recurrence.type !== 'none') {
        const updatedRecurrence = {
          ...parentEvent.recurrence,
          endCondition: 'date' as const,
          endDate: new Date(targetDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 前日を終了日に設定
        };

        const updatedEvent = {
          ...parentEvent,
          recurrence: updatedRecurrence
        };

        // ローカル状態から即座に削除：指定日以降のインスタンスを削除
        setEvents(prev => prev.filter(event => {
          // 動的生成されたインスタンスのうち、指定日以降のものを削除
          if (event.id.startsWith(`recurring_${parentEventId}_`)) {
            const parts = event.id.split('_');
            if (parts.length >= 3) {
              const instanceDate = new Date(parseInt(parts[2]));
              return instanceDate < targetDate!; // targetDate以前のもののみ残す
            }
          }
          // 親イベントは更新
          if (event.id === parentEventId) {
            return true;
          }
          // その他のイベントはそのまま
          return true;
        }));

        // 親イベントも更新されたものに置き換え
        setEvents(prev => prev.map(event =>
          event.id === parentEventId ? updatedEvent : event
        ));

        try {
          await EventService.updateEvent(parentEventId, { recurrence: updatedRecurrence }, user.id);
          console.log('Future recurring events deleted by updating end date:', parentEventId);
          if (onComplete) onComplete();
        } catch (error) {
          console.error('Error updating recurring event end date:', error);
          // エラー時は親イベントを元に戻す
          setEvents(prev => prev.map(event =>
            event.id === parentEventId ? parentEvent : event
          ));
        }
      } else {
        // 単発予定の場合は通常の削除
        await deleteEvent(parentEventId, onComplete);
      }
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

  // 指定された月の予定を動的に生成して取得
  const getEventsForMonth = async (year: number, month: number, calendarId: string | null): Promise<CalendarEvent[]> => {
    if (!user?.id) {
      console.error('ユーザーがログインしていません');
      return [];
    }

    try {
      console.log('getEventsForMonth開始:', { year, month, calendarId });

      // 月の開始日と終了日を計算
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      console.log('期間:', {
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString()
      });

      // データベースから通常の予定を取得
      const allEvents = await EventService.getAllEvents(user.id);
      const filteredEvents = allEvents.filter(event =>
        event.calendarId === calendarId
      );

      // 通常の予定をフィルタリング（指定月内）
      const regularEvents = filteredEvents.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // 繰り返し予定でないもの、または親イベント以外
        return (!event.recurrence || event.recurrence.type === 'none') &&
               (eventStart <= monthEnd && eventEnd >= monthStart);
      });

      // 繰り返し予定の親イベントを取得
      const parentEvents = filteredEvents.filter(event =>
        event.recurrence && event.recurrence.type !== 'none'
      );

      // 繰り返しインスタンスを動的生成
      const recurringInstances: CalendarEvent[] = [];

      for (const parentEvent of parentEvents) {
        try {
          // RRuleを作成
          const rrule = RRuleService.createRRule(parentEvent.recurrence!, new Date(parentEvent.start));

          if (rrule) {
            // 例外削除日と例外イベントを取得
            const [exceptionDeletions, exceptionEvents] = await Promise.all([
              EventService.getExceptionDeletions(parentEvent.id, user.id),
              EventService.getExceptionEvents(parentEvent.id, user.id)
            ]);

            // 指定月の繰り返しインスタンスを生成
            const instances = RRuleService.generateOccurrencesForDateRange(
              parentEvent,
              rrule,
              monthStart,
              monthEnd
            );

            // 例外削除日を除外
            const filteredInstances = instances.filter(instance => {
              const instanceDate = instance.start.toISOString().split('T')[0];
              return !exceptionDeletions.includes(instanceDate);
            });

            // 指定月の例外イベント（編集されたインスタンス）を追加
            const monthExceptionEvents = exceptionEvents.filter(exceptionEvent => {
              const eventStart = new Date(exceptionEvent.start);
              const eventEnd = new Date(exceptionEvent.end);
              return eventStart <= monthEnd && eventEnd >= monthStart;
            });

            recurringInstances.push(...filteredInstances, ...monthExceptionEvents);
          }
        } catch (error) {
          console.error('繰り返しインスタンス生成エラー:', error, parentEvent.id);
        }
      }

      const allMonthEvents = [...regularEvents, ...recurringInstances];

      console.log('getEventsForMonth結果:', {
        regularEvents: regularEvents.length,
        recurringInstances: recurringInstances.length,
        total: allMonthEvents.length
      });

      return allMonthEvents;
    } catch (error) {
      console.error('月の予定取得エラー:', error);
      return [];
    }
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
    getEventsForMonth,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};