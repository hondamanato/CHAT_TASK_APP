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
  scheduleTodayScheduleNotification: (getEventsForDate?: (date: string) => Promise<any[]>) => Promise<void>;
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
    // UIレンダリングを優先するため、500ms遅延して初期化
    const timer = setTimeout(() => {
      initializeNotifications();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const initializeNotifications = async () => {
    console.log('[NotificationProvider] Starting notification initialization...');
    try {
      setIsLoading(true);

      // 通知サービスの初期化
      try {
        await notificationService.initialize();
        console.log('[NotificationProvider] Notification service initialized');
      } catch (initError) {
        console.error('[NotificationProvider] Failed to initialize notification service:', initError);
        // 初期化が失敗してもアプリは起動できるようにする
      }

      // 設定を読み込み
      try {
        const storedSettings = await notificationService.getSettings();
        setSettings(storedSettings);
        console.log('[NotificationProvider] Settings loaded');
      } catch (settingsError) {
        console.error('[NotificationProvider] Failed to load settings:', settingsError);
        // デフォルト設定を使用
      }

      // 権限状態を確認
      try {
        const currentPermissions = await notificationService.requestPermissions();
        setPermissions(currentPermissions);
        console.log('[NotificationProvider] Permissions checked');
      } catch (permissionsError) {
        console.error('[NotificationProvider] Failed to check permissions:', permissionsError);
        // 権限なしでも続行
        setPermissions(null);
      }

      // 期限切れ通知のクリーンアップ
      try {
        await notificationService.cleanupExpiredNotifications();
        console.log('[NotificationProvider] Expired notifications cleaned up');
      } catch (cleanupError) {
        console.error('[NotificationProvider] Failed to cleanup notifications:', cleanupError);
        // クリーンアップが失敗しても続行
      }

      // 今日の予定通知はEventContext初期化後にスケジュールされます
      // （EventContextからgetEventsForDateWithRecurrence関数を使用するため）

      console.log('[NotificationProvider] Notification initialization completed');
    } catch (error) {
      console.error('[NotificationProvider] Critical error in notification initialization:', error);
      // 何があってもアプリは起動できるようにする
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

  const scheduleTodayScheduleNotification = async (getEventsForDate?: (date: string) => Promise<any[]>) => {
    try {
      await notificationService.scheduleTodayScheduleNotification(getEventsForDate);
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