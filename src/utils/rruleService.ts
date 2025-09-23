import { RRule, rrulestr } from 'rrule';
import { RecurrenceSettings } from '../types/recurrence';

/**
 * rrule.jsを使用した繰り返し予定サービス
 * iCalendar RRULE標準に準拠した実装
 */
export class RRuleService {
  
  /**
   * RecurrenceSettingsからRRuleオブジェクトを生成
   */
  static createRRule(recurrence: RecurrenceSettings, startDate: Date): RRule | null {
    if (!recurrence || recurrence.type === 'none') {
      return null;
    }

    console.log('RRuleService: createRRule開始', {
      recurrence,
      startDate: startDate.toISOString()
    });

    const options: any = {
      dtstart: startDate,
      freq: this.getFrequency(recurrence),
    };

    // INTERVAL（間隔）
    if (recurrence.interval && recurrence.interval > 1) {
      options.interval = recurrence.interval;
    }

    // BYDAY（曜日指定）- 週の繰り返しの場合
    if ((recurrence.type === 'weekly' || (recurrence.type === 'custom' && recurrence.unit === 'week'))) {
      if (recurrence.weekdays && recurrence.weekdays.length > 0) {
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        // undefinedやnullを除外して有効な曜日のみをマップ
        const validWeekdays = recurrence.weekdays
          .filter(day => day !== null && day !== undefined && day >= 0 && day <= 6)
          .map(day => dayNames[day])
          .filter(dayName => dayName); // undefinedのdayNameを除外
        
        if (validWeekdays.length > 0) {
          options.byweekday = validWeekdays;
          console.log('RRuleService: 曜日指定あり', {
            weekdays: recurrence.weekdays,
            validWeekdays,
            byweekday: options.byweekday
          });
        } else {
          // 有効な曜日がない場合は開始日の曜日を使用
          const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          options.byweekday = [dayNames[startDate.getDay()]];
          console.log('RRuleService: 有効な曜日がないため開始日の曜日を使用', {
            startDay: startDate.getDay(),
            byweekday: options.byweekday
          });
        }
      } else {
        // 曜日指定がない場合は開始日の曜日を使用
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        options.byweekday = [dayNames[startDate.getDay()]];
        console.log('RRuleService: 開始日の曜日を使用', {
          startDay: startDate.getDay(),
          byweekday: options.byweekday
        });
      }
    }

    // 月の繰り返しでの第何曜日指定
    if ((recurrence.type === 'monthly' || (recurrence.type === 'custom' && recurrence.unit === 'month')) &&
        recurrence.monthlyOption === 'same-weekday') {
      // 第何曜日かを計算
      const weekOfMonth = Math.ceil(startDate.getDate() / 7);
      const dayOfWeek = startDate.getDay();
      const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      
      options.bysetpos = [weekOfMonth];
      options.byweekday = [dayNames[dayOfWeek]];
    }

    // 終了条件
    switch (recurrence.endCondition) {
      case 'count':
        if (recurrence.endCount && recurrence.endCount > 0) {
          options.count = recurrence.endCount;
        }
        break;
      case 'date':
        if (recurrence.endDate) {
          options.until = new Date(recurrence.endDate);
        }
        break;
      case 'never':
        // 何も設定しない（無期限）
        break;
    }

    console.log('RRuleService: 最終オプション', options);

    try {
      const rrule = new RRule(options);
      console.log('RRuleService: RRule作成成功', {
        rruleString: rrule.toString(),
        options
      });
      return rrule;
    } catch (error) {
      console.error('RRule作成エラー:', error, options);
      return null;
    }
  }

  /**
   * RRULE文字列からRRuleオブジェクトを生成
   */
  static parseRRule(rruleString: string): RRule | null {
    if (!rruleString) {
      console.log('RRuleService: RRULE文字列が空です');
      return null;
    }

    try {
      console.log('RRuleService: RRULE解析開始', { rruleString });
      const rrule = rrulestr(rruleString);
      console.log('RRuleService: RRULE解析成功', { 
        rruleString,
        options: rrule.options 
      });
      return rrule;
    } catch (error) {
      console.error('RRULE解析エラー:', error);
      console.error('RRULE文字列:', rruleString);
      return null;
    }
  }

  /**
   * RRuleオブジェクトからRRULE文字列を生成
   */
  static toString(rrule: RRule): string {
    return rrule.toString();
  }

  /**
   * 指定期間内の発生日を生成
   */
  static generateOccurrences(
    rrule: RRule,
    rangeStart: Date,
    rangeEnd: Date,
    maxOccurrences: number = 100
  ): Date[] {
    try {
      return rrule.between(rangeStart, rangeEnd, true);
    } catch (error) {
      console.error('発生日生成エラー:', error);
      return [];
    }
  }

  /**
   * 指定された月の期間内でイベントの繰り返しインスタンスを生成
   */
  static generateOccurrencesForDateRange(
    eventData: any,
    rrule: RRule,
    rangeStart: Date,
    rangeEnd: Date
  ): any[] {
    try {
      console.log('RRuleService: generateOccurrencesForDateRange開始', {
        eventTitle: eventData.title,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString()
      });

      // 指定期間内の発生日を取得
      const occurrences = rrule.between(rangeStart, rangeEnd, true);

      // 元のイベントの開始時刻と終了時刻を取得
      const originalStart = new Date(eventData.start);
      const originalEnd = new Date(eventData.end);
      const duration = originalEnd.getTime() - originalStart.getTime();

      // 各発生日に対してイベントインスタンスを生成
      const instances = occurrences.map((occurrenceDate, index) => {
        const instanceStart = new Date(occurrenceDate);
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        return {
          id: `recurring_${eventData.id}_${instanceStart.getTime()}`, // 一意のID生成
          title: eventData.title,
          start: instanceStart,
          end: instanceEnd,
          color: eventData.color,
          location: eventData.location,
          notes: eventData.notes,
          reminders: eventData.reminders || [],
          isAllDay: eventData.isAllDay || false,
          calendarId: eventData.calendarId,
          createdAt: eventData.createdAt,
          notificationId: null,
          timezone: eventData.timezone,
          recurrence: eventData.recurrence,
          parentEventId: eventData.id, // 親イベントのID
          isRecurringInstance: true // 繰り返しインスタンスフラグ
        };
      });

      console.log('RRuleService: 生成されたインスタンス数', instances.length);
      return instances;
    } catch (error) {
      console.error('繰り返しインスタンス生成エラー:', error);
      return [];
    }
  }

  /**
   * 次の発生日を取得
   */
  static getNextOccurrence(rrule: RRule, after?: Date): Date | null {
    try {
      return rrule.after(after || new Date());
    } catch (error) {
      console.error('次の発生日取得エラー:', error);
      return null;
    }
  }

  /**
   * 前の発生日を取得
   */
  static getPreviousOccurrence(rrule: RRule, before?: Date): Date | null {
    try {
      return rrule.before(before || new Date());
    } catch (error) {
      console.error('前の発生日取得エラー:', error);
      return null;
    }
  }

  /**
   * 指定日が繰り返し予定の発生日かチェック
   */
  static isOccurrence(rrule: RRule, date: Date): boolean {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const occurrences = rrule.between(startOfDay, endOfDay, true);
      return occurrences.length > 0;
    } catch (error) {
      console.error('発生日チェックエラー:', error);
      return false;
    }
  }

  /**
   * RecurrenceSettingsのtypeからrrule.jsの頻度を取得
   */
  private static getFrequency(recurrence: RecurrenceSettings): number {
    switch (recurrence.type) {
      case 'daily':
        return RRule.DAILY;
      case 'weekly':
        return RRule.WEEKLY;
      case 'monthly':
        return RRule.MONTHLY;
      case 'yearly':
        return RRule.YEARLY;
      case 'custom':
        switch (recurrence.unit) {
          case 'day':
            return RRule.DAILY;
          case 'week':
            return RRule.WEEKLY;
          case 'month':
            return RRule.MONTHLY;
          case 'year':
            return RRule.YEARLY;
          default:
            return RRule.DAILY;
        }
      default:
        return RRule.DAILY;
    }
  }

  /**
   * RRuleからRecurrenceSettingsに変換
   */
  static toRecurrenceSettings(rrule: RRule): RecurrenceSettings | null {
    try {
      const options = rrule.options;
      
      const recurrence: RecurrenceSettings = {
        type: 'none',
        interval: options.interval || 1,
        endCondition: 'never'
      };

      // FREQ（頻度）
      switch (options.freq) {
        case RRule.DAILY:
          recurrence.type = 'daily';
          break;
        case RRule.WEEKLY:
          recurrence.type = 'weekly';
          break;
        case RRule.MONTHLY:
          recurrence.type = 'monthly';
          break;
        case RRule.YEARLY:
          recurrence.type = 'yearly';
          break;
      }

      // BYWEEKDAY（曜日指定）
      if (options.byweekday && options.byweekday.length > 0) {
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        recurrence.weekdays = options.byweekday
          .filter(day => day !== null && day !== undefined) // null/undefinedを除外
          .map((day: any) => {
            if (typeof day === 'number') {
              return day;
            }
            return dayNames.indexOf(day.toString());
          })
          .filter(index => index !== -1); // 無効なインデックスを除外
      }

      // 月の繰り返しオプション
      if (options.bysetpos && options.byweekday) {
        recurrence.monthlyOption = 'same-weekday';
      } else if (options.bymonthday) {
        recurrence.monthlyOption = 'same-date';
      }

      // 終了条件
      if (options.count) {
        recurrence.endCondition = 'count';
        recurrence.endCount = options.count;
      } else if (options.until) {
        recurrence.endCondition = 'date';
        recurrence.endDate = options.until.toISOString().split('T')[0];
      }

      return recurrence;
    } catch (error) {
      console.error('RecurrenceSettings変換エラー:', error);
      return null;
    }
  }
}
