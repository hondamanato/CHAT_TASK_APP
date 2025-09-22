import { EventCreateData, RecurrenceSettings } from '../types/recurrence';

export interface RecurringEventInstance {
  title: string;
  start: Date;
  end: Date;
  color?: string;
  location?: { name: string; address?: string };
  notes?: string;
  reminders?: number[];
  isAllDay?: boolean;
  parentId?: string; // 親イベントのID
}

/**
 * 繰り返し設定に基づいて複数のイベントインスタンスを生成
 */
export function generateRecurringEvents(
  eventData: EventCreateData,
  parentId: string,
  maxEvents: number = 100 // 最大生成数の制限
): RecurringEventInstance[] {
  const { recurrence } = eventData;

  if (!recurrence || recurrence.type === 'none') {
    return [];
  }

  const events: RecurringEventInstance[] = [];
  const startDate = new Date(eventData.date);

  // 開始時刻と終了時刻を設定
  const [startHour, startMinute] = eventData.startTime.split(':').map(Number);
  const [endHour, endMinute] = eventData.endTime.split(':').map(Number);

  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date(startDate);
  if (eventData.endDate && eventData.endDate !== eventData.date) {
    // 複数日イベントの場合
    const eventEndDate = new Date(eventData.endDate);
    eventEndDate.setHours(endHour, endMinute, 0, 0);
    endDate.setTime(eventEndDate.getTime());
  } else {
    endDate.setHours(endHour, endMinute, 0, 0);
  }

  const eventDurationMs = endDate.getTime() - startDate.getTime();

  // 最初のイベントは元のイベントとして既に作成されているため、次の発生日から開始
  let currentDate = getNextOccurrence(new Date(startDate), recurrence);
  let eventCount = 0;

  while (eventCount < maxEvents) {
    // 終了条件をチェック
    if (shouldStopRecurrence(currentDate, recurrence, eventCount + 1)) {
      break;
    }

    const eventStart = new Date(currentDate);
    const eventEnd = new Date(eventStart.getTime() + eventDurationMs);

    events.push({
      title: eventData.title,
      start: eventStart,
      end: eventEnd,
      color: eventData.color,
      location: eventData.location?.name ? { name: eventData.location.name } : undefined,
      notes: eventData.notes,
      reminders: eventData.reminders,
      isAllDay: eventData.isAllDay,
      parentId
    });

    // 次の発生日を計算
    currentDate = getNextOccurrence(currentDate, recurrence);
    eventCount++;
  }

  return events;
}

/**
 * 繰り返しを停止すべきかチェック
 */
function shouldStopRecurrence(
  currentDate: Date,
  recurrence: RecurrenceSettings,
  eventCount: number
): boolean {
  switch (recurrence.endCondition) {
    case 'never':
      return false;
    case 'date':
      if (recurrence.endDate) {
        const endDate = new Date(recurrence.endDate);
        return currentDate > endDate;
      }
      return false;
    case 'count':
      if (recurrence.endCount) {
        return eventCount >= recurrence.endCount;
      }
      return false;
    default:
      return false;
  }
}

/**
 * 次の発生日を計算
 */
function getNextOccurrence(
  currentDate: Date,
  recurrence: RecurrenceSettings
): Date {
  const nextDate = new Date(currentDate);
  const interval = recurrence.interval || 1;

  switch (recurrence.type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      return getNextWeeklyOccurrence(nextDate, recurrence, interval);
    case 'monthly':
      return getNextMonthlyOccurrence(nextDate, recurrence, interval);
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    case 'custom':
      switch (recurrence.unit) {
        case 'day':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        case 'week':
          return getNextWeeklyOccurrence(nextDate, recurrence, interval);
        case 'month':
          return getNextMonthlyOccurrence(nextDate, recurrence, interval);
        case 'year':
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          break;
      }
      break;
  }

  return nextDate;
}

/**
 * 週の繰り返しで次の発生日を計算（曜日選択考慮）
 */
function getNextWeeklyOccurrence(
  currentDate: Date,
  recurrence: RecurrenceSettings,
  interval: number
): Date {
  const nextDate = new Date(currentDate);

  // 曜日選択がある場合
  if (recurrence.weekdays && recurrence.weekdays.length > 0) {
    const currentDayOfWeek = currentDate.getDay();
    const sortedWeekdays = [...recurrence.weekdays].sort((a, b) => a - b);

    // 今日以降の次の指定曜日を探す
    let nextWeekday = sortedWeekdays.find(day => day > currentDayOfWeek);

    if (nextWeekday !== undefined) {
      // 同じ週内に次の指定曜日がある
      const daysToAdd = nextWeekday - currentDayOfWeek;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
    } else {
      // 次の週の最初の指定曜日
      const firstWeekday = sortedWeekdays[0];
      const daysToAdd = 7 * interval + firstWeekday - currentDayOfWeek;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
    }
  } else {
    // 曜日選択がない場合は従来通り
    nextDate.setDate(nextDate.getDate() + (7 * interval));
  }

  return nextDate;
}

/**
 * 月の繰り返しで次の発生日を計算（月オプション考慮）
 */
function getNextMonthlyOccurrence(
  currentDate: Date,
  recurrence: RecurrenceSettings,
  interval: number
): Date {
  const nextDate = new Date(currentDate);

  if (recurrence.monthlyOption === 'same-weekday') {
    // 第何曜日かを維持
    const originalWeekOfMonth = Math.ceil(currentDate.getDate() / 7);
    const originalDayOfWeek = currentDate.getDay();

    // 次の月に移動
    nextDate.setMonth(nextDate.getMonth() + interval, 1);

    // その月の第何曜日かを計算
    const firstDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    // 目標の曜日の最初の出現日を計算
    let targetDate = 1 + (originalDayOfWeek - firstDayOfWeek + 7) % 7;

    // 第何週かを反映
    targetDate += (originalWeekOfMonth - 1) * 7;

    // 月末を超える場合は前週にする
    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    if (targetDate > lastDayOfMonth) {
      targetDate -= 7;
    }

    nextDate.setDate(targetDate);
  } else {
    // 毎月同じ日（デフォルト）
    nextDate.setMonth(nextDate.getMonth() + interval);

    // 月末日を超える場合の調整
    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    if (nextDate.getDate() > lastDayOfMonth) {
      nextDate.setDate(lastDayOfMonth);
    }
  }

  return nextDate;
}