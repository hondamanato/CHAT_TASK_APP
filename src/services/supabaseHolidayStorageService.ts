import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Holiday } from './holidayService';

interface EventData {
  name: string;
  localName: string;
  date: string;
  color: string;
  type: 'cultural' | 'religious' | 'seasonal' | 'national';
}

interface SupabaseHolidayData {
  id?: string;
  country_code: string;
  year: number;
  data: {
    holidays: Holiday[];
    events: EventData[];
    version: string;
  };
  last_updated?: string;
}

export class SupabaseHolidayStorageService {
  private supabase: SupabaseClient;
  private readonly TABLE_NAME = 'holiday_cache';
  private readonly DATA_VERSION = '1.0.0';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async storeHolidayData(
    countryCode: string,
    year: number,
    holidays: Holiday[],
    events: EventData[]
  ): Promise<void> {
    try {
      const holidayData: SupabaseHolidayData = {
        country_code: countryCode,
        year,
        data: {
          holidays,
          events,
          version: this.DATA_VERSION
        }
      };

      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .upsert(holidayData, {
          onConflict: 'country_code,year'
        });

      if (error) {
        console.error('Supabase store error:', error);
        throw error;
      }

      console.log(`✅ Stored to Supabase: ${countryCode} ${year}`);
    } catch (error) {
      console.error('Failed to store holiday data to Supabase:', error);
      throw error;
    }
  }

  async getStoredHolidayData(countryCode: string, year: number): Promise<{
    holidays: Holiday[];
    events: EventData[];
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('country_code', countryCode)
        .eq('year', year)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        console.error('Supabase get error:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // バージョンチェック
      if (data.data.version !== this.DATA_VERSION) {
        console.log(`Version mismatch for ${countryCode} ${year}, removing old data`);
        await this.removeHolidayData(countryCode, year);
        return null;
      }

      console.log(`✅ Retrieved from Supabase: ${countryCode} ${year}`);
      return {
        holidays: data.data.holidays,
        events: data.data.events
      };
    } catch (error) {
      console.error('Failed to get stored holiday data from Supabase:', error);
      return null;
    }
  }

  async removeHolidayData(countryCode: string, year: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('country_code', countryCode)
        .eq('year', year);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      console.log(`Removed from Supabase: ${countryCode} ${year}`);
    } catch (error) {
      console.error('Failed to remove holiday data from Supabase:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.TABLE_NAME)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) {
        console.error('Supabase clear all error:', error);
        throw error;
      }

      console.log('Cleared all holiday cache from Supabase');
    } catch (error) {
      console.error('Failed to clear all holiday cache from Supabase:', error);
    }
  }

  async getCacheInfo(): Promise<{
    totalEntries: number;
    entries: Array<{countryCode: string; year: number; lastUpdated: string}>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('country_code, year, last_updated')
        .order('year', { ascending: false });

      if (error) {
        console.error('Supabase get cache info error:', error);
        return {
          totalEntries: 0,
          entries: []
        };
      }

      return {
        totalEntries: data?.length || 0,
        entries: (data || []).map(item => ({
          countryCode: item.country_code,
          year: item.year,
          lastUpdated: item.last_updated || ''
        }))
      };
    } catch (error) {
      console.error('Failed to get cache info from Supabase:', error);
      return {
        totalEntries: 0,
        entries: []
      };
    }
  }

  async isDataCached(countryCode: string, year: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select('id')
        .eq('country_code', countryCode)
        .eq('year', year)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase check cache error:', error);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.error('Failed to check if data is cached in Supabase:', error);
      return false;
    }
  }

  async syncWithLocal(
    localData: {countryCode: string; year: number; holidays: Holiday[]; events: EventData[]}[]
  ): Promise<void> {
    console.log(`🔄 Syncing ${localData.length} entries with Supabase`);

    for (const entry of localData) {
      try {
        const isAlreadyInSupabase = await this.isDataCached(entry.countryCode, entry.year);
        
        if (!isAlreadyInSupabase) {
          await this.storeHolidayData(
            entry.countryCode,
            entry.year,
            entry.holidays,
            entry.events
          );
          console.log(`Synced to Supabase: ${entry.countryCode} ${entry.year}`);
        }
      } catch (error) {
        console.error(`Failed to sync ${entry.countryCode} ${entry.year}:`, error);
      }
    }
  }

  async createTable(): Promise<void> {
    try {
      // Note: This should typically be done through Supabase dashboard or migration scripts
      // This is just for reference of the table structure
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS holiday_cache (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          country_code VARCHAR(2) NOT NULL,
          year INTEGER NOT NULL,
          data JSONB NOT NULL,
          last_updated TIMESTAMP DEFAULT NOW(),
          UNIQUE(country_code, year)
        );

        CREATE INDEX IF NOT EXISTS idx_holiday_cache_country_year 
        ON holiday_cache(country_code, year);
      `;

      console.log('Table structure for reference:', createTableSQL);
    } catch (error) {
      console.error('Table creation reference failed:', error);
    }
  }
}