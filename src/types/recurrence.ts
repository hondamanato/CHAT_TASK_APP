export interface RecurrenceSettings {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number;
  unit?: 'day' | 'week' | 'month' | 'year';
  endCondition: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
  weekdays?: number[]; // 週の繰り返し時の曜日選択 (0=日曜日, 1=月曜日, ...)
  monthlyOption?: 'same-date' | 'same-weekday'; // 月の繰り返しオプション
}

export interface EventCreateData {
  title: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  location?: { name: string; address?: string } | { name: '' };
  notes?: string;
  color: string;
  reminders?: number[];
  isAllDay?: boolean;
  recurrence?: RecurrenceSettings;
  timezone?: string; // タイムゾーン情報
  photos?: string[]; // 複数写真URL配列
}