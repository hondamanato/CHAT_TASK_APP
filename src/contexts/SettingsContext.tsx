import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import timezoneData from '../data/timezones.json';

interface SettingsContextType {
  weekStartDay: string;
  setWeekStartDay: (day: string) => Promise<void>;
  showRokuyou: boolean;
  setShowRokuyou: (show: boolean) => Promise<void>;
  selectedTimezone: string;
  setSelectedTimezone: (timezone: string) => Promise<void>;
  getTimezoneDisplayName: (timezoneId: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [weekStartDay, setWeekStartDayState] = useState('日曜日');
  const [showRokuyou, setShowRokuyouState] = useState(false);
  const [selectedTimezone, setSelectedTimezoneState] = useState('Asia/Tokyo');

  // 初期読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedWeekStartDay = await AsyncStorage.getItem('weekStartDay');
        if (savedWeekStartDay) {
          setWeekStartDayState(savedWeekStartDay);
        }
        
        const savedShowRokuyou = await AsyncStorage.getItem('showRokuyou');
        if (savedShowRokuyou) {
          setShowRokuyouState(savedShowRokuyou === 'true');
        }
        
        const savedTimezone = await AsyncStorage.getItem('selectedTimezone');
        if (savedTimezone) {
          setSelectedTimezoneState(savedTimezone);
        }
      } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
      }
    };
    loadSettings();
  }, []);

  // 週の始まり設定を更新する関数
  const setWeekStartDay = async (day: string) => {
    try {
      setWeekStartDayState(day);
      await AsyncStorage.setItem('weekStartDay', day);
    } catch (error) {
      console.error('週の始まり設定の保存に失敗しました:', error);
    }
  };

  // 六曜表示設定を更新する関数
  const setShowRokuyou = async (show: boolean) => {
    try {
      setShowRokuyouState(show);
      await AsyncStorage.setItem('showRokuyou', show.toString());
    } catch (error) {
      console.error('六曜表示設定の保存に失敗しました:', error);
    }
  };

  // タイムゾーン設定を更新する関数
  const setSelectedTimezone = async (timezone: string) => {
    try {
      setSelectedTimezoneState(timezone);
      await AsyncStorage.setItem('selectedTimezone', timezone);
    } catch (error) {
      console.error('タイムゾーン設定の保存に失敗しました:', error);
    }
  };

  // タイムゾーンの表示名を取得する関数
  const getTimezoneDisplayName = (timezoneId: string): string => {
    const timezone = timezoneData.timezones.find(tz => tz.id === timezoneId);
    if (timezone) {
      return `${timezone.city} (UTC${timezone.offset})`;
    }
    return timezoneId;
  };

  return (
    <SettingsContext.Provider value={{ 
      weekStartDay, 
      setWeekStartDay, 
      showRokuyou, 
      setShowRokuyou,
      selectedTimezone,
      setSelectedTimezone,
      getTimezoneDisplayName
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

// カスタムフック
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};