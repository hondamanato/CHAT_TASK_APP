import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface Calendar {
  id: string;
  name: string;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  color?: string;
  icon?: React.ReactNode;
  type?: string;
}

interface CalendarContextType {
  calendars: Calendar[];
  selectedCalendarId: string | null;
  loading: boolean;
  addCalendar: (name: string) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  updateCalendar: (id: string, updates: { name?: string }) => Promise<void>;
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
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Supabaseからカレンダーを取得
  const fetchCalendars = async () => {
    if (!user) {
      setCalendars([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // オーナーとして所有するカレンダーのみ取得（シンプルなクエリ）
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabaseエラー:', error);
        throw error;
      }

      setCalendars(data || []);
    } catch (error) {
      console.error('カレンダー取得エラー:', error);
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  };

  // ユーザーが変わったときにカレンダーを再取得
  useEffect(() => {
    fetchCalendars();
  }, [user]);

  const addCalendar = async (name: string) => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    try {
      const { data, error } = await supabase
        .from('calendars')
        .insert({
          name,
          owner_id: user.id,
          is_shared: false,
        })
        .select()
        .single();

      if (error) throw error;

      // 新しいカレンダーをリストに追加
      setCalendars(prev => [...prev, data]);

      // 最初のカレンダーの場合は自動選択
      if (calendars.length === 0) {
        setSelectedCalendarId(data.id);
      }
    } catch (error) {
      console.error('カレンダー追加エラー:', error);
      throw error;
    }
  };

  const deleteCalendar = async (id: string) => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    try {
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;

      // カレンダーをリストから削除
      setCalendars(prev => prev.filter(calendar => calendar.id !== id));

      // 削除されたカレンダーが選択中だった場合は選択を解除
      if (selectedCalendarId === id) {
        setSelectedCalendarId(null);
      }
    } catch (error) {
      console.error('カレンダー削除エラー:', error);
      throw error;
    }
  };

  const updateCalendar = async (id: string, updates: { name?: string }) => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    try {
      const { data, error } = await supabase
        .from('calendars')
        .update(updates)
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;

      // カレンダーを更新
      setCalendars(prev =>
        prev.map(calendar =>
          calendar.id === id ? { ...calendar, ...data } : calendar
        )
      );
    } catch (error) {
      console.error('カレンダー更新エラー:', error);
      throw error;
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
    loading,
    addCalendar,
    deleteCalendar,
    updateCalendar,
    selectCalendar,
    getSelectedCalendar,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};