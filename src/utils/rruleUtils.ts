import { RecurrenceSettings } from '../types/recurrence';

/**
 * RecurrenceSettingsからRRULE形式の文字列に変換
 */
export function recurrenceToRrule(recurrence: RecurrenceSettings): string {
  if (!recurrence || recurrence.type === 'none') {
    return '';
  }

  const parts: string[] = [];

  // FREQ（頻度）
  switch (recurrence.type) {
    case 'daily':
      parts.push('FREQ=DAILY');
      break;
    case 'weekly':
      parts.push('FREQ=WEEKLY');
      break;
    case 'monthly':
      parts.push('FREQ=MONTHLY');
      break;
    case 'yearly':
      parts.push('FREQ=YEARLY');
      break;
    case 'custom':
      switch (recurrence.unit) {
        case 'day':
          parts.push('FREQ=DAILY');
          break;
        case 'week':
          parts.push('FREQ=WEEKLY');
          break;
        case 'month':
          parts.push('FREQ=MONTHLY');
          break;
        case 'year':
          parts.push('FREQ=YEARLY');
          break;
      }
      break;
  }

  // INTERVAL（間隔）
  if (recurrence.interval && recurrence.interval > 1) {
    parts.push(`INTERVAL=${recurrence.interval}`);
  }

  // BYDAY（曜日指定）- 週の繰り返しの場合
  if ((recurrence.type === 'weekly' || (recurrence.type === 'custom' && recurrence.unit === 'week')) &&
      recurrence.weekdays && recurrence.weekdays.length > 0) {
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDays = recurrence.weekdays.map(day => dayNames[day]).join(',');
    parts.push(`BYDAY=${byDays}`);
  }

  // 月の繰り返しでの第何曜日指定
  if ((recurrence.type === 'monthly' || (recurrence.type === 'custom' && recurrence.unit === 'month')) &&
      recurrence.monthlyOption === 'same-weekday') {
    // この場合は、具体的な日付からBYSETPOSとBYDAYを設定する必要があるが、
    // 今回はシンプルに既存のmonthlyOptionを維持
    parts.push('BYMONTHDAY=1'); // 仮の値、実際には開始日から計算
  }

  // 終了条件
  switch (recurrence.endCondition) {
    case 'count':
      if (recurrence.endCount && recurrence.endCount > 0) {
        parts.push(`COUNT=${recurrence.endCount}`);
      }
      break;
    case 'date':
      if (recurrence.endDate) {
        const endDate = new Date(recurrence.endDate);
        const until = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        parts.push(`UNTIL=${until}`);
      }
      break;
    case 'never':
      // 何も追加しない（無期限）
      break;
  }

  return parts.join(';');
}

/**
 * RRULE文字列からRecurrenceSettingsに変換
 */
export function rruleToRecurrence(rrule: string): RecurrenceSettings | null {
  if (!rrule) {
    return null;
  }

  const parts = rrule.split(';');
  const rules: { [key: string]: string } = {};

  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) {
      rules[key] = value;
    }
  });

  const recurrence: RecurrenceSettings = {
    type: 'none',
    interval: 1,
    endCondition: 'never'
  };

  // FREQ（頻度）
  switch (rules.FREQ) {
    case 'DAILY':
      recurrence.type = 'daily';
      break;
    case 'WEEKLY':
      recurrence.type = 'weekly';
      break;
    case 'MONTHLY':
      recurrence.type = 'monthly';
      break;
    case 'YEARLY':
      recurrence.type = 'yearly';
      break;
  }

  // INTERVAL（間隔）
  if (rules.INTERVAL) {
    recurrence.interval = parseInt(rules.INTERVAL, 10);
  }

  // BYDAY（曜日指定）
  if (rules.BYDAY) {
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDays = rules.BYDAY.split(',');
    recurrence.weekdays = byDays.map(day => dayNames.indexOf(day)).filter(index => index !== -1);
  }

  // 月の繰り返しオプション
  if (rules.BYSETPOS && rules.BYDAY) {
    recurrence.monthlyOption = 'same-weekday';
  } else if (rules.BYMONTHDAY) {
    recurrence.monthlyOption = 'same-date';
  }

  // 終了条件
  if (rules.COUNT) {
    recurrence.endCondition = 'count';
    recurrence.endCount = parseInt(rules.COUNT, 10);
  } else if (rules.UNTIL) {
    recurrence.endCondition = 'date';
    // UNTIL形式（20241231T235959Z）から日付文字列に変換
    const until = rules.UNTIL.replace(/[TZ]/g, '');
    const year = until.substring(0, 4);
    const month = until.substring(4, 6);
    const day = until.substring(6, 8);
    recurrence.endDate = `${year}-${month}-${day}`;
  } else {
    recurrence.endCondition = 'never';
  }

  return recurrence;
}

/**
 * RRULE文字列から指定期間内のイベント発生日を生成
 */
export function generateOccurrencesFromRrule(
  rrule: string,
  startDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences: number = 100
): Date[] {
  const recurrence = rruleToRecurrence(rrule);
  if (!recurrence || recurrence.type === 'none') {
    return [];
  }

  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;

  // 最初の開始日が範囲内にある場合は追加
  if (currentDate >= rangeStart && currentDate <= rangeEnd) {
    occurrences.push(new Date(currentDate));
  }

  while (count < maxOccurrences) {
    // 次の発生日を計算
    currentDate = getNextOccurrenceFromRecurrence(currentDate, recurrence);
    count++;

    // 終了条件をチェック
    if (shouldStopRecurrenceByRule(currentDate, recurrence, count + 1)) {
      break;
    }

    // 範囲外になったら終了
    if (currentDate > rangeEnd) {
      break;
    }

    // 範囲内の場合のみ追加
    if (currentDate >= rangeStart) {
      occurrences.push(new Date(currentDate));
    }
  }

  return occurrences;
}

/**
 * RecurrenceSettingsから次の発生日を計算
 */
function getNextOccurrenceFromRecurrence(
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
      return getNextWeeklyOccurrenceFromRecurrence(nextDate, recurrence, interval);
    case 'monthly':
      return getNextMonthlyOccurrenceFromRecurrence(nextDate, recurrence, interval);
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
  }

  return nextDate;
}

/**
 * 週の繰り返しで次の発生日を計算
 */
function getNextWeeklyOccurrenceFromRecurrence(
  currentDate: Date,
  recurrence: RecurrenceSettings,
  interval: number
): Date {
  const nextDate = new Date(currentDate);

  if (recurrence.weekdays && recurrence.weekdays.length > 0) {
    const currentDayOfWeek = currentDate.getDay();
    const sortedWeekdays = [...recurrence.weekdays].sort((a, b) => a - b);

    let nextWeekday = sortedWeekdays.find(day => day > currentDayOfWeek);

    if (nextWeekday !== undefined) {
      const daysToAdd = nextWeekday - currentDayOfWeek;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
    } else {
      const firstWeekday = sortedWeekdays[0];
      const daysToAdd = 7 * interval + firstWeekday - currentDayOfWeek;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
    }
  } else {
    nextDate.setDate(nextDate.getDate() + (7 * interval));
  }

  return nextDate;
}

/**
 * 月の繰り返しで次の発生日を計算
 */
function getNextMonthlyOccurrenceFromRecurrence(
  currentDate: Date,
  recurrence: RecurrenceSettings,
  interval: number
): Date {
  const nextDate = new Date(currentDate);

  if (recurrence.monthlyOption === 'same-weekday') {
    const originalWeekOfMonth = Math.ceil(currentDate.getDate() / 7);
    const originalDayOfWeek = currentDate.getDay();

    nextDate.setMonth(nextDate.getMonth() + interval, 1);

    const firstDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    let targetDate = 1 + (originalDayOfWeek - firstDayOfWeek + 7) % 7;
    targetDate += (originalWeekOfMonth - 1) * 7;

    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    if (targetDate > lastDayOfMonth) {
      targetDate -= 7;
    }

    nextDate.setDate(targetDate);
  } else {
    nextDate.setMonth(nextDate.getMonth() + interval);

    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    if (nextDate.getDate() > lastDayOfMonth) {
      nextDate.setDate(lastDayOfMonth);
    }
  }

  return nextDate;
}

/**
 * RRULEによる繰り返しを停止すべきかチェック
 */
function shouldStopRecurrenceByRule(
  currentDate: Date,
  recurrence: RecurrenceSettings,
  occurrenceCount: number
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
        return occurrenceCount >= recurrence.endCount;
      }
      return false;
    default:
      return false;
  }
}