import { supabase } from './supabase';
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
  color: string | null;
  timezone: string | null;
  recurrence_type: string | null;
  recurrence_settings: any | null; // JSON形式で保存
  recurrence_series_id: string | null; // 繰り返し予定のグループID
  reminders?: number[]; // 通知設定（分単位の配列）
  photo?: string | null; // 写真URL（JSON配列文字列として保存）
  created_at: string;
  updated_at: string;
}

export class EventService {
  // データベースからCalendarEventに変換
  private static dbEventToCalendarEvent(dbEvent: DatabaseEvent): CalendarEvent {
    const event: CalendarEvent = {
      id: dbEvent.id,
      title: dbEvent.title,
      start: new Date(dbEvent.start_date),
      end: new Date(dbEvent.end_date),
      color: dbEvent.color || '#007AFF', // データベースから復元、なければデフォルト色
      location: (dbEvent as any).location || { name: '' }, // データベースから復元、なければデフォルト空
      notes: dbEvent.description || '',
      reminders: dbEvent.reminders || [], // データベースから復元、なければ空配列
      isAllDay: dbEvent.is_all_day,
      calendarId: dbEvent.calendar_id,
      createdAt: new Date(dbEvent.created_at),
      notificationId: null, // デフォルトnull
      userId: dbEvent.user_id, // 作成者IDを追加
    };

    // タイムゾーン情報を復元
    if (dbEvent.timezone) {
      event.timezone = dbEvent.timezone;
    }

    // 繰り返し情報を復元
    if (dbEvent.recurrence_type && dbEvent.recurrence_settings) {
      try {
        event.recurrence = JSON.parse(dbEvent.recurrence_settings);
      } catch (error) {
        console.error('繰り返し設定の解析エラー:', error);
      }
    }

    // 作成者情報を復元（JOINクエリで取得した場合）
    if ((dbEvent as any).creator) {
      event.creatorName = (dbEvent as any).creator.name;
      // profile_image_uriがあればcreatorImageUriに設定
      const profileImageKey = Object.keys((dbEvent as any).creator).find(
        key => key === 'profile_image_uri' || key.includes('image')
      );
      if (profileImageKey) {
        event.creatorImageUri = (dbEvent as any).creator[profileImageKey];
      }
    }

    // 複数写真URLを復元（JSON文字列または単一URL）
    if (dbEvent.photo) {
      try {
        // JSON配列として解析を試みる
        const parsed = JSON.parse(dbEvent.photo);
        if (Array.isArray(parsed)) {
          event.photos = parsed;
        } else {
          // JSON解析できたが配列でない場合（通常はない）
          event.photos = [dbEvent.photo];
        }
      } catch {
        // JSON解析失敗 = 単一URLの旧形式
        event.photos = [dbEvent.photo];
      }
    }

    return event;
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
      color: event.color || null,
      timezone: event.timezone || null,
      recurrence_type: event.recurrence?.type || null,
      recurrence_settings: event.recurrence ? JSON.stringify(event.recurrence) : null,
      recurrence_series_id: (event as any).recurrenceSeriesId || null,
      location: event.location,
    } as any;
  }

  // EventCreateDataからデータベース形式に変換
  private static eventCreateDataToDbEvent(eventData: EventCreateData, userId: string, recurrenceSeriesId?: string): Omit<DatabaseEvent, 'id' | 'created_at' | 'updated_at'> {
    // 日時の作成
    const createDateTime = (dateStr: string, timeStr?: string): Date => {
      if (!dateStr) {
        throw new Error('日付が指定されていません');
      }
      const [year, month, day] = dateStr.split('-').map(Number);
      if (timeStr) {
        if (!timeStr) {
          throw new Error('時刻の形式が不正です');
        }
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
      color: eventData.color || null,
      timezone: eventData.timezone || null,
      recurrence_type: eventData.recurrence?.type || null,
      recurrence_settings: eventData.recurrence ? JSON.stringify(eventData.recurrence) : null,
      recurrence_series_id: recurrenceSeriesId || null,
      reminders: eventData.reminders || [],
      location: eventData.location,
      photo: eventData.photos && eventData.photos.length > 0 ? JSON.stringify(eventData.photos) : null,
    } as any;
  }

  // 全ての予定を取得
  static async getAllEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!user_id(id, name, profile_image_uri)
        `)
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
  static async createEvent(eventData: EventCreateData, userId: string, recurrenceSeriesId?: string): Promise<CalendarEvent> {
    try {
      const dbEvent = this.eventCreateDataToDbEvent(eventData, userId, recurrenceSeriesId);

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
      if (eventData.isAllDay !== undefined) updateData.is_all_day = eventData.isAllDay;
      if (eventData.calendarId !== undefined) updateData.calendar_id = eventData.calendarId;
      if (eventData.color !== undefined) updateData.color = eventData.color;
      if (eventData.timezone !== undefined) updateData.timezone = eventData.timezone;
      if (eventData.reminders !== undefined) updateData.reminders = eventData.reminders;
      if (eventData.location !== undefined) updateData.location = eventData.location;
      if ((eventData as any).location !== undefined) updateData.location = (eventData as any).location;
      if ((eventData as any).photos !== undefined) {
        const photos = (eventData as any).photos;
        updateData.photo = photos && photos.length > 0 ? JSON.stringify(photos) : null;
      }
      if (eventData.recurrence !== undefined) {
        updateData.recurrence_type = eventData.recurrence?.type || null;
        updateData.recurrence_settings = eventData.recurrence ? JSON.stringify(eventData.recurrence) : null;
      }
      if ((eventData as any).recurrenceSeriesId !== undefined) {
        updateData.recurrence_series_id = (eventData as any).recurrenceSeriesId;
      }

      // EventCreateData形式（編集画面から渡される）の場合の日時処理
      const isEventCreateData = (eventData as any).date !== undefined;

      if (isEventCreateData) {
        const dateStr = (eventData as any).date;
        const startTimeStr = (eventData as any).startTime || '09:00';
        const endTimeStr = (eventData as any).endTime || '10:00';
        const endDateStr = (eventData as any).endDate || dateStr;
        const isAllDay = (eventData as any).isAllDay || false;

        // 開始日時を計算
        const [startYear, startMonth, startDay] = dateStr.split('-').map(Number);
        const startDateTime = isAllDay
          ? new Date(startYear, startMonth - 1, startDay)
          : (() => {
              const [hour, minute] = startTimeStr.split(':').map(Number);
              return new Date(startYear, startMonth - 1, startDay, hour, minute);
            })();

        // 終了日時を計算
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        const endDateTime = isAllDay
          ? new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
          : (() => {
              const [hour, minute] = endTimeStr.split(':').map(Number);
              return new Date(endYear, endMonth - 1, endDay, hour, minute);
            })();

        updateData.start_date = startDateTime.toISOString();
        updateData.end_date = endDateTime.toISOString();
      } else {
        // CalendarEvent形式（従来の方式）
        if (eventData.start !== undefined) updateData.start_date = eventData.start.toISOString();
        if (eventData.end !== undefined) updateData.end_date = eventData.end.toISOString();
      }

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

  // 繰り返し予定シリーズ全体を削除
  static async deleteRecurringEventSeries(seriesId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('recurrence_series_id', seriesId)
        .eq('user_id', userId);

      if (error) {
        console.error('繰り返し予定シリーズ削除エラー:', error);
        throw error;
      }
    } catch (error) {
      console.error('繰り返し予定シリーズ削除失敗:', error);
      throw error;
    }
  }

  // 指定した日付以降の繰り返し予定を削除
  static async deleteRecurringEventsFuture(eventId: string, userId: string): Promise<void> {
    try {
      // まず対象のイベントを取得してシリーズIDと日付を確認
      const { data: targetEvent, error: fetchError } = await supabase
        .from('events')
        .select('recurrence_series_id, start_date')
        .eq('id', eventId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('対象イベント取得エラー:', fetchError);
        throw fetchError;
      }

      if (!targetEvent.recurrence_series_id) {
        throw new Error('繰り返し予定ではありません');
      }

      // 指定した日付以降の予定を削除
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('recurrence_series_id', targetEvent.recurrence_series_id)
        .eq('user_id', userId)
        .gte('start_date', targetEvent.start_date);

      if (error) {
        console.error('未来の繰り返し予定削除エラー:', error);
        throw error;
      }
    } catch (error) {
      console.error('未来の繰り返し予定削除失敗:', error);
      throw error;
    }
  }

  // 繰り返し予定シリーズの情報を取得
  static async getRecurringEventSeries(eventId: string, userId: string): Promise<CalendarEvent[]> {
    try {
      // まず対象のイベントを取得してシリーズIDを確認
      const { data: targetEvent, error: fetchError } = await supabase
        .from('events')
        .select('recurrence_series_id')
        .eq('id', eventId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('対象イベント取得エラー:', fetchError);
        throw fetchError;
      }

      if (!targetEvent.recurrence_series_id) {
        return [];
      }

      // 同じシリーズの全イベントを取得
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('recurrence_series_id', targetEvent.recurrence_series_id)
        .eq('user_id', userId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('繰り返し予定シリーズ取得エラー:', error);
        throw error;
      }

      return (data || []).map(this.dbEventToCalendarEvent);
    } catch (error) {
      console.error('繰り返し予定シリーズ取得失敗:', error);
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

  // 例外イベント（繰り返し予定の特定日のみ編集・削除されたイベント）を作成
  static async createExceptionEvent(
    parentEventId: string,
    exceptionDate: string,
    eventData: Partial<EventCreateData>,
    userId: string
  ): Promise<CalendarEvent> {
    try {
      console.log('例外イベント作成開始:', { parentEventId, exceptionDate, eventData });

      // 親イベントを取得
      const { data: parentEventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', parentEventId)
        .eq('user_id', userId)
        .single();

      if (error || !parentEventData) {
        throw new Error('親イベントが見つかりません');
      }

      const parentEvent = this.dbEventToCalendarEvent(parentEventData);

      // 例外イベントデータを作成
      const exceptionEventData: EventCreateData = {
        title: eventData.title || parentEvent.title,
        date: exceptionDate,
        startTime: eventData.startTime || parentEvent.start.toTimeString().slice(0, 5),
        endTime: eventData.endTime || parentEvent.end.toTimeString().slice(0, 5),
        location: eventData.location || parentEvent.location || { name: '' },
        notes: eventData.notes || parentEvent.notes || '',
        color: eventData.color || parentEvent.color || '#007AFF',
        reminders: eventData.reminders || parentEvent.reminders || [],
        isAllDay: eventData.isAllDay !== undefined ? eventData.isAllDay : parentEvent.isAllDay,
        timezone: eventData.timezone || parentEvent.timezone,
        calendarId: parentEvent.calendarId,
        recurrence: { type: 'none', endCondition: 'never' } // 例外イベントは繰り返しなし
      };

      // 例外イベントを作成
      const newEvent = await this.createEvent(exceptionEventData, userId);

      // 例外日として記録するため、特別なフィールドを追加
      await supabase
        .from('events')
        .update({
          description: `${newEvent.notes || ''}\n__EXCEPTION_FOR__:${parentEventId}:${exceptionDate}`.trim(),
          recurrence_series_id: parentEventId // 親イベントのIDを記録
        })
        .eq('id', newEvent.id)
        .eq('user_id', userId);

      console.log('例外イベント作成完了:', newEvent.id);
      return newEvent;
    } catch (error) {
      console.error('例外イベント作成エラー:', error);
      throw error;
    }
  }

  // 例外削除日を記録（特定日の削除）
  static async recordExceptionDeletion(
    parentEventId: string,
    exceptionDate: string,
    userId: string
  ): Promise<void> {
    try {
      console.log('例外削除日を記録:', { parentEventId, exceptionDate });

      // 既存の例外削除記録があるかチェック
      const { data: existingRecord } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', userId)
        .like('description', `%__EXCEPTION_DELETED__:${parentEventId}:${exceptionDate}%`)
        .single();

      if (existingRecord) {
        console.log('例外削除記録は既に存在します');
        return;
      }

      // 削除記録用の仮イベントを作成
      const deletionRecord: EventCreateData = {
        title: '__EXCEPTION_DELETED__',
        date: exceptionDate,
        startTime: '00:00',
        endTime: '00:01',
        location: { name: '' },
        notes: `__EXCEPTION_DELETED__:${parentEventId}:${exceptionDate}`,
        color: '#000000',
        reminders: [],
        isAllDay: false,
        timezone: 'UTC',
        calendarId: null,
        recurrence: { type: 'none', endCondition: 'never' }
      };

      await this.createEvent(deletionRecord, userId);
      console.log('例外削除日の記録完了');
    } catch (error) {
      console.error('例外削除日記録エラー:', error);
      throw error;
    }
  }

  // 特定の親イベントの例外削除日を取得
  static async getExceptionDeletions(parentEventId: string, userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('description')
        .eq('user_id', userId)
        .like('description', `%__EXCEPTION_DELETED__:${parentEventId}:%`);

      if (error) {
        console.error('例外削除日取得エラー:', error);
        return [];
      }

      const deletedDates: string[] = [];
      data?.forEach(record => {
        const match = record.description?.match(/__EXCEPTION_DELETED__:[^:]+:([^:]+)/);
        if (match && match[1]) {
          deletedDates.push(match[1]);
        }
      });

      return deletedDates;
    } catch (error) {
      console.error('例外削除日取得失敗:', error);
      return [];
    }
  }

  // 特定の親イベントの例外イベント（編集されたインスタンス）を取得
  static async getExceptionEvents(parentEventId: string, userId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .eq('recurrence_series_id', parentEventId)
        .like('description', `%__EXCEPTION_FOR__:${parentEventId}:%`);

      if (error) {
        console.error('例外イベント取得エラー:', error);
        return [];
      }

      return (data || []).map(this.dbEventToCalendarEvent);
    } catch (error) {
      console.error('例外イベント取得失敗:', error);
      return [];
    }
  }
}