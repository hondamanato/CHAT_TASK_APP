import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

export interface EventCreateData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string; // オプショナル
  location?: { name: string; address?: string } | { name: '' };
  notes?: string;
  color: string;
  reminders?: number[];
  isAllDay?: boolean;
  calendarId?: string | null;
}

interface EventContextType {
  events: CalendarEvent[];
  addEvent: (eventData: EventCreateData) => void;
  updateEvent: (id: string, eventData: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
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

  const addEvent = (eventData: EventCreateData) => {
    // ローカル時間で正確な日時を作成
    const createLocalDate = (dateStr: string, timeStr?: string): Date => {
      try {
        // null/undefined/空文字列チェック
        if (!dateStr || typeof dateStr !== 'string') {
          console.warn('Invalid dateStr:', dateStr);
          return new Date(); // 現在時刻をデフォルトとして返す
        }

        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) {
          console.warn('Invalid date format:', dateStr);
          return new Date();
        }

        const [year, month, day] = dateParts.map(Number);
        
        // 数値変換の検証
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.warn('Invalid date values:', { year, month, day });
          return new Date();
        }

        if (timeStr && typeof timeStr === 'string' && timeStr.trim() !== '') {
          const timeParts = timeStr.split(':');
          if (timeParts.length >= 2) {
            const [hour, minute] = timeParts.map(Number);
            if (!isNaN(hour) && !isNaN(minute)) {
              return new Date(year, month - 1, day, hour, minute);
            }
          }
          console.warn('Invalid time format:', timeStr);
        }
        
        return new Date(year, month - 1, day);
      } catch (error) {
        console.error('createLocalDate error:', error);
        return new Date(); // エラー時は現在時刻を返す
      }
    };

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

      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventData.title.trim(),
        start: eventData.isAllDay 
          ? createLocalDate(eventData.date || new Date().toISOString().split('T')[0])
          : createLocalDate(
              eventData.date || new Date().toISOString().split('T')[0], 
              eventData.startTime || '09:00'
            ),
        end: eventData.isAllDay 
          ? (() => {
              const endDate = eventData.endDate || eventData.date || new Date().toISOString().split('T')[0];
              const endDateTime = createLocalDate(endDate);
              endDateTime.setHours(23, 59, 59, 999);
              return endDateTime;
            })()
          : createLocalDate(
              eventData.endDate || eventData.date || new Date().toISOString().split('T')[0], 
              eventData.endTime || '10:00'
            ),
        color: eventData.color || '#007AFF',
        location: eventData.location || { name: '' },
        notes: eventData.notes || '',
        reminders: Array.isArray(eventData.reminders) ? eventData.reminders : [],
        isAllDay: Boolean(eventData.isAllDay),
        calendarId: eventData.calendarId || null,
        createdAt: new Date(),
      };

      setEvents(prev => [...prev, newEvent]);
      console.log('Event added successfully:', newEvent);
    } catch (error) {
      console.error('Error adding event:', error);
      // エラーが発生してもアプリがクラッシュしないように処理を続行
    }
  };

  const updateEvent = (id: string, eventData: any) => {
    const createLocalDate = (dateStr: string, timeStr?: string): Date => {
      try {
        if (!dateStr || typeof dateStr !== 'string') {
          console.warn('Invalid dateStr for createLocalDate:', dateStr);
          return new Date();
        }

        const [year, month, day] = dateStr.split('-').map(Number);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.warn('Invalid date values:', { year, month, day });
          return new Date();
        }

        if (timeStr && typeof timeStr === 'string' && timeStr.trim() !== '') {
          const timeParts = timeStr.split(':');
          if (timeParts.length >= 2) {
            const [hour, minute] = timeParts.map(Number);
            if (!isNaN(hour) && !isNaN(minute)) {
              return new Date(year, month - 1, day, hour, minute);
            }
          }
          console.warn('Invalid time format:', timeStr);
        }
        
        return new Date(year, month - 1, day);
      } catch (error) {
        console.error('createLocalDate error:', error);
        return new Date();
      }
    };

    try {
      if (!eventData || typeof eventData !== 'object') {
        console.error('Invalid eventData for update:', eventData);
        return;
      }

      setEvents(prev => 
        prev.map(event => {
          if (event.id === id) {
            return {
              ...event,
              title: eventData.title?.trim() || event.title,
              start: eventData.isAllDay 
                ? createLocalDate(eventData.date || new Date().toISOString().split('T')[0])
                : createLocalDate(
                    eventData.date || new Date().toISOString().split('T')[0], 
                    eventData.startTime || '09:00'
                  ),
              end: eventData.isAllDay 
                ? new Date(createLocalDate(eventData.endDate || eventData.date || new Date().toISOString().split('T')[0]).getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000)
                : createLocalDate(
                    eventData.endDate || eventData.date || new Date().toISOString().split('T')[0], 
                    eventData.endTime || '10:00'
                  ),
              color: eventData.color || event.color,
              location: eventData.location || event.location,
              notes: eventData.notes !== undefined ? eventData.notes : event.notes,
              reminders: Array.isArray(eventData.reminders) ? eventData.reminders : event.reminders,
              isAllDay: eventData.isAllDay !== undefined ? Boolean(eventData.isAllDay) : event.isAllDay,
              createdAt: event.createdAt || new Date(), // 既存のcreatedAtを保持、なければ現在時刻
            };
          }
          return event;
        })
      );
      console.log('Event updated successfully:', id);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
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
    addEvent,
    updateEvent,
    deleteEvent,
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