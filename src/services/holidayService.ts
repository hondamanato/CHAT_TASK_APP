export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
  color?: string;  // カラー設定（オプション）
}

export interface Country {
  countryCode: string;
  name: string;
  flag: string;
}

export class HolidayService {
  private baseUrl = 'https://date.nager.at/api/v3';

  /**
   * 指定した国の祝日を取得
   */
  async getHolidays(countryCode: string, year: number): Promise<Holiday[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/PublicHolidays/${year}/${countryCode}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const holidays = await response.json();
      return holidays;
    } catch (error) {
      console.error('祝日データの取得に失敗しました:', error);
      return [];
    }
  }

  /**
   * 利用可能な国一覧を取得
   */
  async getCountries(): Promise<Country[]> {
    try {
      const response = await fetch(`${this.baseUrl}/AvailableCountries`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const countries = await response.json();
      return countries;
    } catch (error) {
      console.error('国データの取得に失敗しました:', error);
      return [];
    }
  }

  /**
   * 指定した年の祝日を複数国で取得
   */
  async getHolidaysForMultipleCountries(countryCodes: string[], year: number): Promise<{ [countryCode: string]: Holiday[] }> {
    const promises = countryCodes.map(async (countryCode) => {
      const holidays = await this.getHolidays(countryCode, year);
      return { countryCode, holidays };
    });

    try {
      const results = await Promise.all(promises);
      const holidayMap: { [countryCode: string]: Holiday[] } = {};
      
      results.forEach(({ countryCode, holidays }) => {
        holidayMap[countryCode] = holidays;
      });
      
      return holidayMap;
    } catch (error) {
      console.error('複数国の祝日データの取得に失敗しました:', error);
      return {};
    }
  }

  /**
   * 祝日を日付でソート
   */
  sortHolidaysByDate(holidays: Holiday[]): Holiday[] {
    return holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * 指定した月の祝日をフィルタリング
   */
  getHolidaysForMonth(holidays: Holiday[], year: number, month: number): Holiday[] {
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
    });
  }
}
