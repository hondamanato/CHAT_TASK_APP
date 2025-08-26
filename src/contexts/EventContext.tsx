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
}

export interface EventCreateData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate: string;
  location: { name: string; address?: string };
  notes: string;
  color: string;
  reminders: number[];
  isAllDay: boolean;
}

interface EventContextType {
  events: CalendarEvent[];
  addEvent: (eventData: EventCreateData) => void;
  updateEvent: (id: string, eventData: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
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
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: eventData.title,
      start: eventData.isAllDay 
        ? new Date(`${eventData.date}T00:00:00`) 
        : new Date(`${eventData.date}T${eventData.startTime}`),
      end: eventData.isAllDay 
        ? new Date(`${eventData.endDate}T23:59:59`) 
        : new Date(`${eventData.endDate}T${eventData.endTime}`),
      color: eventData.color,
      location: eventData.location,
      notes: eventData.notes,
      reminders: eventData.reminders,
      isAllDay: eventData.isAllDay,
    };

    setEvents(prev => [...prev, newEvent]);
  };

  const updateEvent = (id: string, eventData: Partial<CalendarEvent>) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === id ? { ...event, ...eventData } : event
      )
    );
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

  const value: EventContextType = {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};