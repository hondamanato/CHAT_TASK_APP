import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPermissions {
  status: Notifications.PermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
}

export interface ScheduledNotification {
  id: string;
  eventId: string;
  title: string;
  body: string;
  triggerDate: Date;
  type: 'event' | 'reminder';
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';

export interface NotificationSettings {
  enabled: boolean;
  eventReminders: boolean;
  reminderMinutesBefore: number;
  dailyDigest: boolean;
  dailyDigestTime: string; // HH:MM format
  todaySchedule: {
    enabled: boolean;
    notificationTime: string; // HH:MM format
    noScheduleNotification: boolean;
    participatingOnly: boolean;
  };
}

const defaultSettings: NotificationSettings = {
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
};

class NotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 通知ハンドラーの設定
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Android通知チャンネル設定
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'カレンダー通知',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      });

      await Notifications.setNotificationChannelAsync('reminder', {
        name: 'リマインダー',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF9500',
      });
    }

    this.initialized = true;
  }

  async requestPermissions(): Promise<NotificationPermissions> {
    if (!Device.isDevice) {
      console.warn('プッシュ通知は実機でのみ動作します');
      return {
        status: Notifications.PermissionStatus.DENIED,
        canAskAgain: false,
        granted: false,
      };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    const permissions = await Notifications.getPermissionsAsync();
    
    return {
      status: finalStatus,
      canAskAgain: permissions.canAskAgain,
      granted: finalStatus === Notifications.PermissionStatus.GRANTED,
    };
  }

  async getSettings(): Promise<NotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('通知設定の取得エラー:', error);
    }
    return defaultSettings;
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      
      // 設定が無効になった場合、全ての通知をキャンセル
      if (!updated.enabled) {
        await this.cancelAllNotifications();
      }
    } catch (error) {
      console.error('通知設定の更新エラー:', error);
    }
  }

  async scheduleEventNotification(
    eventId: string,
    title: string,
    eventDate: Date,
    reminderMinutes: number = 15
  ): Promise<string | null> {
    await this.initialize();
    
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.eventReminders) {
      return null;
    }

    const triggerDate = new Date(eventDate.getTime() - reminderMinutes * 60 * 1000);
    
    // 過去の日時の場合は通知しない
    if (triggerDate <= new Date()) {
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '予定のお知らせ',
          body: `${reminderMinutes}分後: ${title}`,
          data: {
            eventId,
            type: 'event_reminder',
          },
        },
        trigger: { type: 'date', date: triggerDate },
      });

      // スケジュール済み通知を記録
      await this.saveScheduledNotification({
        id: notificationId,
        eventId,
        title: '予定のお知らせ',
        body: `${reminderMinutes}分後: ${title}`,
        triggerDate,
        type: 'event',
      });

      return notificationId;
    } catch (error) {
      console.error('通知のスケジューリングエラー:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await this.removeScheduledNotification(notificationId);
    } catch (error) {
      console.error('通知のキャンセルエラー:', error);
    }
  }

  async cancelEventNotifications(eventId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const eventNotifications = scheduled.filter(n => n.eventId === eventId);
      
      for (const notification of eventNotifications) {
        await this.cancelNotification(notification.id);
      }
    } catch (error) {
      console.error('イベント通知のキャンセルエラー:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
    } catch (error) {
      console.error('全通知のキャンセルエラー:', error);
    }
  }

  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (stored) {
        const notifications: ScheduledNotification[] = JSON.parse(stored);
        return notifications.map(n => ({
          ...n,
          triggerDate: new Date(n.triggerDate),
        }));
      }
    } catch (error) {
      console.error('スケジュール済み通知の取得エラー:', error);
    }
    return [];
  }

  private async saveScheduledNotification(notification: ScheduledNotification): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      scheduled.push(notification);
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(scheduled));
    } catch (error) {
      console.error('スケジュール済み通知の保存エラー:', error);
    }
  }

  private async removeScheduledNotification(notificationId: string): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const filtered = scheduled.filter(n => n.id !== notificationId);
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('スケジュール済み通知の削除エラー:', error);
    }
  }

  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const now = new Date();
      const active = scheduled.filter(n => n.triggerDate > now);

      if (active.length !== scheduled.length) {
        await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(active));
      }
    } catch (error) {
      console.error('期限切れ通知のクリーンアップエラー:', error);
    }
  }

  // デバッグ用関数: 通知状態の確認
  async getNotificationDebugInfo(): Promise<{
    permissions: NotificationPermissions;
    settings: NotificationSettings;
    scheduledCount: number;
    scheduledNotifications: ScheduledNotification[];
    systemScheduled: Notifications.NotificationRequest[];
  }> {
    try {
      const permissions = await this.requestPermissions();
      const settings = await this.getSettings();
      const scheduled = await this.getScheduledNotifications();
      const systemScheduled = await Notifications.getAllScheduledNotificationsAsync();

      return {
        permissions,
        settings,
        scheduledCount: scheduled.length,
        scheduledNotifications: scheduled,
        systemScheduled,
      };
    } catch (error) {
      console.error('通知デバッグ情報取得エラー:', error);
      throw error;
    }
  }

  // テスト用通知（1分後）
  async scheduleTestNotification(): Promise<string | null> {
    try {
      await this.initialize();

      const triggerDate = new Date(Date.now() + 60 * 1000); // 1分後

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'テスト通知',
          body: '通知が正常に動作しています！',
          data: {
            type: 'test',
          },
        },
        trigger: { type: 'date', date: triggerDate },
      });

      console.log('テスト通知をスケジュールしました:', {
        notificationId,
        triggerDate: triggerDate.toISOString(),
      });

      return notificationId;
    } catch (error) {
      console.error('テスト通知のスケジューリングエラー:', error);
      return null;
    }
  }

  async sendTestNotification(): Promise<void> {
    await this.initialize();
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'テスト通知',
          body: 'プッシュ通知が正常に動作しています',
          data: { test: true },
        },
        trigger: null, // すぐに送信
      });
    } catch (error) {
      console.error('テスト通知エラー:', error);
    }
  }

  // 今日の予定通知をスケジュール
  async scheduleTodayScheduleNotification(events: any[] = []): Promise<void> {
    await this.initialize();
    
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.todaySchedule.enabled) {
      return;
    }

    // 既存の今日の予定通知をキャンセル
    await this.cancelTodayScheduleNotifications();

    const { notificationTime, noScheduleNotification, participatingOnly } = settings.todaySchedule;
    
    // 通知時刻の設定
    const [hours, minutes] = notificationTime.split(':').map(Number);
    const today = new Date();
    const notificationDate = new Date();
    notificationDate.setHours(hours, minutes, 0, 0);
    
    // 過去の時刻の場合は明日にスケジュール
    if (notificationDate <= today) {
      notificationDate.setDate(notificationDate.getDate() + 1);
    }

    // イベントのフィルタリング
    let todayEvents = events.filter(event => {
      const eventDate = new Date(event.start).toDateString();
      return eventDate === today.toDateString();
    });

    if (participatingOnly) {
      todayEvents = todayEvents.filter(event => event.participating !== false);
    }

    // 通知内容の作成
    let title = '今日の予定';
    let body = '';

    if (todayEvents.length === 0) {
      if (!noScheduleNotification) {
        return; // 予定なしの通知が無効の場合は通知しない
      }
      body = '今日は予定がありません';
    } else {
      body = `${todayEvents.length}件の予定があります`;
      if (todayEvents.length <= 3) {
        const eventTitles = todayEvents.map(e => e.title).join(', ');
        body += `\n${eventTitles}`;
      }
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            type: 'todaySchedule',
            eventCount: todayEvents.length,
            events: todayEvents.slice(0, 5) // 最初の5件まで
          },
        },
        trigger: { type: 'date', date: notificationDate },
      });

      // スケジュール済み通知を記録
      await this.saveScheduledNotification({
        id: notificationId,
        eventId: 'todaySchedule',
        title,
        body,
        triggerDate: notificationDate,
        type: 'reminder',
      });

    } catch (error) {
      console.error('今日の予定通知スケジューリングエラー:', error);
    }
  }

  // 今日の予定通知をキャンセル
  async cancelTodayScheduleNotifications(): Promise<void> {
    const scheduled = await this.getScheduledNotifications();
    const todayScheduleNotifications = scheduled.filter(n => n.eventId === 'todaySchedule');
    
    for (const notification of todayScheduleNotifications) {
      await this.cancelNotification(notification.id);
    }
  }
}

export const notificationService = new NotificationService();