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