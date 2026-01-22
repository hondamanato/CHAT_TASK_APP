import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeatherData, WeatherKitResponse } from '../types/weather';
import { supabase } from './supabase';

const CACHE_PREFIX = 'weather_cache_';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12時間

interface CacheEntry {
  data: WeatherData[];
  timestamp: number;
}

export class WeatherService {
  /**
   * 天気データを取得（キャッシュ対応）
   */
  async getWeatherData(
    lat: number,
    long: number,
    regionCode: string,
    timezone: string = 'Asia/Tokyo'
  ): Promise<WeatherData[]> {
    // キャッシュをチェック
    const cached = await this.getFromCache(regionCode);
    if (cached) {
      console.log(`天気データ: キャッシュから取得 (${regionCode})`);
      return cached;
    }

    // APIから取得
    try {
      const data = await this.fetchFromApi(lat, long, timezone);

      // キャッシュに保存
      await this.saveToCache(regionCode, data);
      console.log(`天気データ: APIから取得・キャッシュ保存 (${regionCode})`);

      return data;
    } catch (error) {
      console.error('天気データ取得エラー:', error);

      // オフライン時は期限切れキャッシュも返す
      const expiredCache = await this.getFromCache(regionCode, true);
      if (expiredCache) {
        console.log(`天気データ: 期限切れキャッシュを使用 (${regionCode})`);
        return expiredCache;
      }

      throw error;
    }
  }

  /**
   * Supabase Edge Function経由でWeatherKit APIからデータを取得
   */
  private async fetchFromApi(
    lat: number,
    long: number,
    timezone: string
  ): Promise<WeatherData[]> {
    console.log('[WeatherKit] Supabase Function呼び出し:', { lat, long, timezone });

    const { data, error } = await supabase.functions.invoke('weatherkit-proxy', {
      body: { lat, long, timezone },
    });

    if (error) {
      console.error('[WeatherKit] Supabase Functionエラー:', error);
      throw new Error(`WeatherKit API error: ${error.message}`);
    }

    if (data.error) {
      console.error('[WeatherKit] APIエラー:', data.error, data.details);
      throw new Error(`WeatherKit API error: ${data.error}`);
    }

    const json: WeatherKitResponse = data;

    // デバッグログ
    console.log('[WeatherKit Debug] レスポンス受信:', {
      日数: json.forecastDaily?.days?.length || 0,
      最初の日: json.forecastDaily?.days?.[0]?.forecastStart,
      最後の日: json.forecastDaily?.days?.[json.forecastDaily?.days?.length - 1]?.forecastStart,
    });

    return this.transformResponse(json);
  }

  /**
   * APIレスポンスをWeatherData[]に変換
   */
  private transformResponse(response: WeatherKitResponse): WeatherData[] {
    return response.forecastDaily.days.map((day) => {
      // forecastStartをDateオブジェクトとしてパースし、ローカル日付に変換
      const forecastDate = new Date(day.forecastStart);
      const year = forecastDate.getFullYear();
      const month = String(forecastDate.getMonth() + 1).padStart(2, '0');
      const date = String(forecastDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${date}`;

      return {
        date: dateString,
        weatherCode: day.conditionCode,
        temperatureMax: Math.round(day.temperatureMax),
        temperatureMin: Math.round(day.temperatureMin),
      };
    });
  }

  /**
   * キャッシュから取得
   */
  private async getFromCache(
    regionCode: string,
    ignoreExpiry: boolean = false
  ): Promise<WeatherData[] | null> {
    try {
      const key = `${CACHE_PREFIX}${regionCode}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);

      // 有効期限チェック
      if (!ignoreExpiry && Date.now() - entry.timestamp > CACHE_TTL) {
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error);
      return null;
    }
  }

  /**
   * キャッシュに保存
   */
  private async saveToCache(
    regionCode: string,
    data: WeatherData[]
  ): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${regionCode}`;
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('キャッシュ保存エラー:', error);
    }
  }

  /**
   * 特定地域のキャッシュをクリア
   */
  async clearCache(regionCode: string): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${regionCode}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
    }
  }

  /**
   * 全ての天気キャッシュをクリア
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const weatherKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

      if (weatherKeys.length > 0) {
        await AsyncStorage.multiRemove(weatherKeys);
      }
    } catch (error) {
      console.error('全キャッシュクリアエラー:', error);
    }
  }
}

// シングルトンインスタンス
export const weatherService = new WeatherService();
