import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService, NotificationSettings, NotificationPermissions } from '@/src/services/notificationService';

interface NotificationContextType {
  settings: NotificationSettings;
  permissions: NotificationPermissions | null;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  requestPermissions: () => Promise<NotificationPermissions>;
  sendTestNotification: () => Promise<void>;
  scheduleEventNotification: (eventId: string, title: string, eventDate: Date, reminderMinutes?: number) => Promise<string | null>;
  scheduleEventNotifications: (eventId: string, title: string, eventDate: Date, reminderMinutes: number[]) => Promise<string[]>;
  cancelEventNotifications: (eventId: string) => Promise<void>;
  scheduleTodayScheduleNotification: (events?: any[]) => Promise<void>;
  cancelTodayScheduleNotifications: () => Promise<void>;
  getNotificationDebugInfo: () => Promise<any>;
  scheduleTestNotification: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    eventReminders: true,
    reminderMinutesBefore: 15,
    dailyDigest: false,
    dailyDigestTime: '09:00',
    todaySchedule: {
      enabled: true,
      notificationTime: '08:00',
      noScheduleNotification: false,
      participatingOnly: true,
    },
  });
  const [permissions, setPermissions] = useState<NotificationPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      
      // 通知サービスの初期化
      await notificationService.initialize();
      
      // 設定を読み込み
      const storedSettings = await notificationService.getSettings();
      setSettings(storedSettings);
      
      // 権限状態を確認
      const currentPermissions = await notificationService.requestPermissions();
      setPermissions(currentPermissions);
      
      // 期限切れ通知のクリーンアップ
      await notificationService.cleanupExpiredNotifications();
      
    } catch (error) {
      console.error('通知の初期化エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      await notificationService.updateSettings(newSettings);
      const updatedSettings = await notificationService.getSettings();
      setSettings(updatedSettings);
    } catch (error) {
      console.error('設定更新エラー:', error);
    }
  };

  const requestPermissions = async (): Promise<NotificationPermissions> => {
    try {
      const newPermissions = await notificationService.requestPermissions();
      setPermissions(newPermissions);
      return newPermissions;
    } catch (error) {
      console.error('権限リクエストエラー:', error);
      const defaultPermissions: NotificationPermissions = {
        status: 'denied' as any,
        canAskAgain: false,
        granted: false,
      };
      setPermissions(defaultPermissions);
      return defaultPermissions;
    }
  };

  const sendTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
    } catch (error) {
      console.error('テスト通知エラー:', error);
    }
  };

  const scheduleEventNotification = async (
    eventId: string,
    title: string,
    eventDate: Date,
    reminderMinutes?: number
  ): Promise<string | null> => {
    try {
      const minutes = reminderMinutes ?? settings.reminderMinutesBefore;
      return await notificationService.scheduleEventNotification(eventId, title, eventDate, minutes);
    } catch (error) {
      console.error('予定通知のスケジューリングエラー:', error);
      return null;
    }
  };

  const scheduleEventNotifications = async (
    eventId: string,
    title: string,
    eventDate: Date,
    reminderMinutes: number[]
  ): Promise<string[]> => {
    try {
      const notificationIds: string[] = [];

      for (const minutes of reminderMinutes) {
        const notificationId = await notificationService.scheduleEventNotification(eventId, title, eventDate, minutes);
        if (notificationId) {
          notificationIds.push(notificationId);
        }
      }

      return notificationIds;
    } catch (error) {
      console.error('複数予定通知のスケジューリングエラー:', error);
      return [];
    }
  };

  const cancelEventNotifications = async (eventId: string) => {
    try {
      await notificationService.cancelEventNotifications(eventId);
    } catch (error) {
      console.error('予定通知のキャンセルエラー:', error);
    }
  };

  const scheduleTodayScheduleNotification = async (events: any[] = []) => {
    try {
      await notificationService.scheduleTodayScheduleNotification(events);
    } catch (error) {
      console.error('今日の予定通知スケジューリングエラー:', error);
    }
  };

  const cancelTodayScheduleNotifications = async () => {
    try {
      await notificationService.cancelTodayScheduleNotifications();
    } catch (error) {
      console.error('今日の予定通知キャンセルエラー:', error);
    }
  };

  const getNotificationDebugInfo = async () => {
    try {
      return await notificationService.getNotificationDebugInfo();
    } catch (error) {
      console.error('通知デバッグ情報取得エラー:', error);
      return null;
    }
  };

  const scheduleTestNotification = async (): Promise<string | null> => {
    try {
      return await notificationService.scheduleTestNotification();
    } catch (error) {
      console.error('テスト通知スケジューリングエラー:', error);
      return null;
    }
  };

  const value: NotificationContextType = {
    settings,
    permissions,
    isLoading,
    updateSettings,
    requestPermissions,
    sendTestNotification,
    scheduleEventNotification,
    scheduleEventNotifications,
    cancelEventNotifications,
    scheduleTodayScheduleNotification,
    cancelTodayScheduleNotifications,
    getNotificationDebugInfo,
    scheduleTestNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}