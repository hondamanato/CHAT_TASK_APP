import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarEvent } from '../contexts/EventContext';

/**
 * イベントデータのキャッシュ構造
 */
interface CachedEventData {
  userId: string;
  events: SerializedEvent[];
  lastUpdated: string;
  version: string;
}

/**
 * シリアライズされたイベント（Date → ISO文字列）
 */
interface SerializedEvent {
  id: string;
  title: string;
  start: string; // ISO文字列
  end: string; // ISO文字列
  color?: string;
  location?: { name: string; address?: string };
  notes?: string;
  reminders?: number[];
  isAllDay?: boolean;
  calendarId?: string | null;
  createdAt?: string; // ISO文字列
  notificationId?: string | null;
  timezone?: string;
  recurrence?: any;
  userId?: string;
  creatorName?: string;
  creatorImageUri?: string;
}

/**
 * イベントデータのキャッシュ管理サービス
 * HolidayStorageServiceと同じパターンで実装
 */
export class EventCacheService {
  private readonly STORAGE_KEY = 'event_cache';
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_DURATION_HOURS = 24; // 24時間有効

  /**
   * ユーザーごとのストレージキーを生成
   */
  private getStorageKey(userId: string): string {
    return `${this.STORAGE_KEY}_${userId}`;
  }

  /**
   * イベントをキャッシュに保存
   * @param userId ユーザーID
   * @param events イベントの配列
   */
  async storeEvents(userId: string, events: CalendarEvent[]): Promise<void> {
    try {
      const data: CachedEventData = {
        userId,
        events: events.map(this.serializeEvent),
        lastUpdated: new Date().toISOString(),
        version: this.CACHE_VERSION
      };

      const key = this.getStorageKey(userId);
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Cached ${events.length} events for user ${userId}`);
    } catch (error) {
      console.error('Failed to store events:', error);
      throw error;
    }
  }

  /**
   * キャッシュからイベントを取得
   * @param userId ユーザーID
   * @returns キャッシュされたイベント、またはnull（キャッシュなし/期限切れ）
   */
  async getStoredEvents(userId: string): Promise<CalendarEvent[] | null> {
    try {
      const key = this.getStorageKey(userId);
      const storedData = await AsyncStorage.getItem(key);

      if (!storedData) {
        console.log('No cached events found');
        return null;
      }

      const data: CachedEventData = JSON.parse(storedData);

      // バージョンチェック
      if (data.version !== this.CACHE_VERSION) {
        console.log('Cache version mismatch, clearing cache');
        await this.clearCache(userId);
        return null;
      }

      // 有効期限チェック
      const lastUpdated = new Date(data.lastUpdated);
      const hoursDiff = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > this.CACHE_DURATION_HOURS) {
        console.log(`Cache expired (${hoursDiff.toFixed(1)} hours old)`);
        await this.clearCache(userId);
        return null;
      }

      console.log(`✅ Retrieved ${data.events.length} cached events (${hoursDiff.toFixed(1)} hours old)`);
      return data.events.map(this.deserializeEvent);
    } catch (error) {
      console.error('Failed to get stored events:', error);
      return null;
    }
  }

  /**
   * キャッシュをクリア
   * @param userId ユーザーID
   */
  async clearCache(userId: string): Promise<void> {
    try {
      const key = this.getStorageKey(userId);
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Cache cleared for user', userId);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * すべてのユーザーのキャッシュをクリア
   */
  async clearAllCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ Cleared ${cacheKeys.length} event caches`);
      }
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }

  /**
   * キャッシュ情報を取得（デバッグ用）
   * @param userId ユーザーID
   * @returns キャッシュ情報
   */
  async getCacheInfo(userId: string): Promise<{
    isCached: boolean;
    eventCount: number;
    lastUpdated: string | null;
    cacheAge: string;
  }> {
    try {
      const key = this.getStorageKey(userId);
      const storedData = await AsyncStorage.getItem(key);

      if (!storedData) {
        return {
          isCached: false,
          eventCount: 0,
          lastUpdated: null,
          cacheAge: 'N/A'
        };
      }

      const data: CachedEventData = JSON.parse(storedData);
      const lastUpdated = new Date(data.lastUpdated);
      const hoursDiff = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

      return {
        isCached: true,
        eventCount: data.events.length,
        lastUpdated: data.lastUpdated,
        cacheAge: hoursDiff < 1
          ? `${Math.round(hoursDiff * 60)} minutes ago`
          : `${hoursDiff.toFixed(1)} hours ago`
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return {
        isCached: false,
        eventCount: 0,
        lastUpdated: null,
        cacheAge: 'Error'
      };
    }
  }

  /**
   * CalendarEventをシリアライズ（Date → ISO文字列）
   */
  private serializeEvent = (event: CalendarEvent): SerializedEvent => {
    return {
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      createdAt: event.createdAt?.toISOString()
    };
  };

  /**
   * SerializedEventをデシリアライズ（ISO文字列 → Date）
   */
  private deserializeEvent = (data: SerializedEvent): CalendarEvent => {
    return {
      ...data,
      start: new Date(data.start),
      end: new Date(data.end),
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined
    };
  };
}

// シングルトンインスタンスをエクスポート
export const eventCacheService = new EventCacheService();
