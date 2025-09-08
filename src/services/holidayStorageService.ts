import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holiday } from './holidayService';

interface EventData {
  name: string;
  localName: string;
  date: string;
  color: string;
  type: 'cultural' | 'religious' | 'seasonal' | 'national';
}

interface StoredHolidayData {
  countryCode: string;
  year: number;
  holidays: Holiday[];
  events: EventData[];
  lastUpdated: string;
  version: string;
}

export class HolidayStorageService {
  private readonly STORAGE_KEY_PREFIX = 'holiday_cache_';
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_DURATION_DAYS = 30;

  private getStorageKey(countryCode: string, year: number): string {
    return `${this.STORAGE_KEY_PREFIX}${countryCode}_${year}`;
  }

  async storeHolidayData(
    countryCode: string, 
    year: number, 
    holidays: Holiday[], 
    events: EventData[]
  ): Promise<void> {
    try {
      const data: StoredHolidayData = {
        countryCode,
        year,
        holidays,
        events,
        lastUpdated: new Date().toISOString(),
        version: this.CACHE_VERSION
      };

      const key = this.getStorageKey(countryCode, year);
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Stored holiday data: ${countryCode} ${year}`);
    } catch (error) {
      console.error('Failed to store holiday data:', error);
      throw error;
    }
  }

  async getStoredHolidayData(countryCode: string, year: number): Promise<StoredHolidayData | null> {
    try {
      const key = this.getStorageKey(countryCode, year);
      const storedData = await AsyncStorage.getItem(key);
      
      if (!storedData) {
        return null;
      }

      const data: StoredHolidayData = JSON.parse(storedData);
      
      // バージョンチェック
      if (data.version !== this.CACHE_VERSION) {
        console.log(`Version mismatch for ${countryCode} ${year}, removing old cache`);
        await this.removeHolidayData(countryCode, year);
        return null;
      }

      // 有効期限チェック
      const lastUpdated = new Date(data.lastUpdated);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > this.CACHE_DURATION_DAYS) {
        console.log(`Cache expired for ${countryCode} ${year} (${daysDiff} days old)`);
        await this.removeHolidayData(countryCode, year);
        return null;
      }

      console.log(`✅ Retrieved cached data: ${countryCode} ${year}`);
      return data;
    } catch (error) {
      console.error('Failed to get stored holiday data:', error);
      return null;
    }
  }

  async removeHolidayData(countryCode: string, year: number): Promise<void> {
    try {
      const key = this.getStorageKey(countryCode, year);
      await AsyncStorage.removeItem(key);
      console.log(`Removed cached data: ${countryCode} ${year}`);
    } catch (error) {
      console.error('Failed to remove holiday data:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const holidayKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY_PREFIX));
      
      if (holidayKeys.length > 0) {
        await AsyncStorage.multiRemove(holidayKeys);
        console.log(`Cleared ${holidayKeys.length} cached holiday entries`);
      }
    } catch (error) {
      console.error('Failed to clear holiday cache:', error);
    }
  }

  async getCacheInfo(): Promise<{
    totalEntries: number;
    totalSize: string;
    entries: Array<{countryCode: string; year: number; lastUpdated: string}>;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const holidayKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY_PREFIX));
      
      let totalSize = 0;
      const entries = [];

      for (const key of holidayKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
          const parsedData: StoredHolidayData = JSON.parse(data);
          entries.push({
            countryCode: parsedData.countryCode,
            year: parsedData.year,
            lastUpdated: parsedData.lastUpdated
          });
        }
      }

      return {
        totalEntries: holidayKeys.length,
        totalSize: `${Math.round(totalSize / 1024)} KB`,
        entries: entries.sort((a, b) => b.year - a.year)
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return {
        totalEntries: 0,
        totalSize: '0 KB',
        entries: []
      };
    }
  }

  async isDataCached(countryCode: string, year: number): Promise<boolean> {
    const data = await this.getStoredHolidayData(countryCode, year);
    return data !== null;
  }

  async prefetchYears(countryCode: string, years: number[], fetchCallback: (year: number) => Promise<{holidays: Holiday[], events: EventData[]}>): Promise<void> {
    console.log(`🔄 Prefetching holiday data for ${countryCode}: ${years.join(', ')}`);
    
    const uncachedYears = [];
    
    for (const year of years) {
      const isCached = await this.isDataCached(countryCode, year);
      if (!isCached) {
        uncachedYears.push(year);
      }
    }

    if (uncachedYears.length > 0) {
      console.log(`Need to fetch: ${uncachedYears.join(', ')}`);
      
      for (const year of uncachedYears) {
        try {
          const {holidays, events} = await fetchCallback(year);
          await this.storeHolidayData(countryCode, year, holidays, events);
        } catch (error) {
          console.error(`Failed to prefetch data for ${year}:`, error);
        }
      }
    } else {
      console.log('All requested years are already cached');
    }
  }
}