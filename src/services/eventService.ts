import { supabase } from '../lib/supabase';
import type { CalendarEvent, EventCreateData } from '../contexts/EventContext';

export interface DatabaseEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  user_id: string;
  calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

export class EventService {
  // データベースからCalendarEventに変換
  private static dbEventToCalendarEvent(dbEvent: DatabaseEvent): CalendarEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      start: new Date(dbEvent.start_date),
      end: new Date(dbEvent.end_date),
      color: '#007AFF', // デフォルト色
      location: { name: '' }, // デフォルト空の場所
      notes: dbEvent.description || '',
      reminders: [], // デフォルト空のリマインダー
      isAllDay: dbEvent.is_all_day,
      calendarId: dbEvent.calendar_id,
      createdAt: new Date(dbEvent.created_at),
      notificationId: null, // デフォルトnull
    };
  }

  // CalendarEventからデータベース形式に変換
  private static calendarEventToDbEvent(event: CalendarEvent, userId: string): Omit<DatabaseEvent, 'created_at' | 'updated_at'> {
    return {
      id: event.id,
      title: event.title,
      description: event.notes || null,
      start_date: event.start.toISOString(),
      end_date: event.end.toISOString(),
      is_all_day: event.isAllDay || false,
      user_id: userId,
      calendar_id: event.calendarId || null,
    };
  }

  // EventCreateDataからデータベース形式に変換
  private static eventCreateDataToDbEvent(eventData: EventCreateData, userId: string): Omit<DatabaseEvent, 'id' | 'created_at' | 'updated_at'> {
    // 日時の作成
    const createDateTime = (dateStr: string, timeStr?: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (timeStr) {
        const [hour, minute] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute);
      }
      return new Date(year, month - 1, day);
    };

    const startDate = eventData.isAllDay
      ? createDateTime(eventData.date)
      : createDateTime(eventData.date, eventData.startTime);

    const endDate = eventData.isAllDay
      ? (() => {
          const endDateTime = createDateTime(eventData.endDate || eventData.date);
          endDateTime.setHours(23, 59, 59, 999);
          return endDateTime;
        })()
      : createDateTime(eventData.endDate || eventData.date, eventData.endTime);

    return {
      title: eventData.title,
      description: eventData.notes || null,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      is_all_day: eventData.isAllDay || false,
      user_id: userId,
      calendar_id: eventData.calendarId || null,
    };
  }

  // 全ての予定を取得
  static async getAllEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('予定取得エラー:', error);
        throw error;
      }

      return (data || []).map(this.dbEventToCalendarEvent);
    } catch (error) {
      console.error('予定取得失敗:', error);
      throw error;
    }
  }

  // 予定を作成
  static async createEvent(eventData: EventCreateData, userId: string): Promise<CalendarEvent> {
    try {
      const dbEvent = this.eventCreateDataToDbEvent(eventData, userId);

      const { data, error } = await supabase
        .from('events')
        .insert(dbEvent)
        .select()
        .single();

      if (error) {
        console.error('予定作成エラー:', error);
        throw error;
      }

      return this.dbEventToCalendarEvent(data);
    } catch (error) {
      console.error('予定作成失敗:', error);
      throw error;
    }
  }

  // 予定を更新
  static async updateEvent(eventId: string, eventData: Partial<CalendarEvent>, userId: string): Promise<CalendarEvent> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (eventData.title !== undefined) updateData.title = eventData.title;
      if (eventData.notes !== undefined) updateData.description = eventData.notes;
      if (eventData.start !== undefined) updateData.start_date = eventData.start.toISOString();
      if (eventData.end !== undefined) updateData.end_date = eventData.end.toISOString();
      if (eventData.isAllDay !== undefined) updateData.is_all_day = eventData.isAllDay;
      if (eventData.calendarId !== undefined) updateData.calendar_id = eventData.calendarId;

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('予定更新エラー:', error);
        throw error;
      }

      return this.dbEventToCalendarEvent(data);
    } catch (error) {
      console.error('予定更新失敗:', error);
      throw error;
    }
  }

  // 予定を削除
  static async deleteEvent(eventId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) {
        console.error('予定削除エラー:', error);
        throw error;
      }
    } catch (error) {
      console.error('予定削除失敗:', error);
      throw error;
    }
  }

  // 特定の日付の予定を取得
  static async getEventsForDate(date: string, userId: string): Promise<CalendarEvent[]> {
    try {
      const startOfDay = new Date(date + 'T00:00:00.000Z').toISOString();
      const endOfDay = new Date(date + 'T23:59:59.999Z').toISOString();

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date', startOfDay)
        .lte('end_date', endOfDay)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('日付別予定取得エラー:', error);
        throw error;
      }

      return (data || []).map(this.dbEventToCalendarEvent);
    } catch (error) {
      console.error('日付別予定取得失敗:', error);
      throw error;
    }
  }

  // カレンダー別の予定を取得
  static async getEventsForCalendar(calendarId: string | null, userId: string): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('user_id', userId);

      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      } else {
        query = query.is('calendar_id', null);
      }

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) {
        console.error('カレンダー別予定取得エラー:', error);
        throw error;
      }

      return (data || []).map(this.dbEventToCalendarEvent);
    } catch (error) {
      console.error('カレンダー別予定取得失敗:', error);
      throw error;
    }
  }
}