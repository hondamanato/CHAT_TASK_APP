export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  userId: string;
  calendarId?: string;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Calendar {
  id: string;
  name: string;
  ownerId: string;
  isShared: boolean;
  members: CalendarMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarMember {
  id: string;
  calendarId: string;
  userId: string;
  role: 'member';
  canInvite: boolean;
  joinedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type ViewMode = 'month' | 'week' | 'day';

// AIチャット用の型定義
export interface ChatEvent {
  id?: string; // 編集・削除時に必要
  date: string;
  endDate?: string; // 複数日予定の場合
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  isAllDay?: boolean;
  isMultiDay?: boolean; // 複数日予定かどうか
}

export interface ChatAction {
  type: 'create' | 'edit' | 'delete' | 'delete_single' | 'delete_series' | 'delete_future' | 'bulk_delete';
  eventId?: string; // 編集・削除時に必要（単一予定の場合）
  eventIds?: string[]; // 複数予定削除時に必要
  searchQuery?: string; // 予定を検索するためのクエリ
  deleteAll?: boolean; // 全削除フラグ
  deleteScope?: 'single' | 'series' | 'future'; // 繰り返し予定の削除範囲
  deleteCondition?: {
    type: 'all' | 'date_range' | 'title_match' | 'recurring';
    dateRange?: { start: string; end: string };
    titlePattern?: string;
  };
}

export interface ChatResponse {
  events: ChatEvent[];
  message: string;
  confidence: number;
  action?: ChatAction;
  suggestedEvents?: ChatEvent[]; // 編集・削除候補の予定
}