import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
  type: string;
}

interface CalendarContextType {
  calendars: Calendar[];
  selectedCalendarId: string | null;
  addCalendar: (calendar: Omit<Calendar, 'id'>) => void;
  deleteCalendar: (id: string) => void;
  selectCalendar: (id: string | null) => void;
  getSelectedCalendar: () => Calendar | null;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};

interface CalendarProviderProps {
  children: ReactNode;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

  const addCalendar = (calendarData: Omit<Calendar, 'id'>) => {
    const newCalendar: Calendar = {
      ...calendarData,
      id: Date.now().toString(),
    };
    setCalendars(prev => [...prev, newCalendar]);
    
    // 最初のカレンダーの場合は自動選択
    if (calendars.length === 0) {
      setSelectedCalendarId(newCalendar.id);
    }
  };

  const deleteCalendar = (id: string) => {
    setCalendars(prev => prev.filter(calendar => calendar.id !== id));
    
    // 削除されたカレンダーが選択中だった場合は選択を解除
    if (selectedCalendarId === id) {
      setSelectedCalendarId(null);
    }
  };

  const selectCalendar = (id: string | null) => {
    setSelectedCalendarId(id);
  };

  const getSelectedCalendar = (): Calendar | null => {
    if (!selectedCalendarId) return null;
    return calendars.find(calendar => calendar.id === selectedCalendarId) || null;
  };

  const value: CalendarContextType = {
    calendars,
    selectedCalendarId,
    addCalendar,
    deleteCalendar,
    selectCalendar,
    getSelectedCalendar,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};