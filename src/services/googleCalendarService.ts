// Google Calendar API の公開祝日カレンダーサービス
export class GoogleCalendarService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  // 国別の公開祝日カレンダーID
  private getCalendarIdByCountry(countryCode: string): string {
    const calendarIds: { [key: string]: string } = {
      'JP': 'ja.japanese#holiday@group.v.calendar.google.com',
      'US': 'en.usa#holiday@group.v.calendar.google.com',
      'GB': 'en.uk#holiday@group.v.calendar.google.com',
      'FR': 'fr.french#holiday@group.v.calendar.google.com',
      'DE': 'de.german#holiday@group.v.calendar.google.com',
      'IT': 'it.italian#holiday@group.v.calendar.google.com',
      'ES': 'es.spanish#holiday@group.v.calendar.google.com',
      'CA': 'en.canadian#holiday@group.v.calendar.google.com',
      'AU': 'en.australian#holiday@group.v.calendar.google.com',
      'KR': 'ko.south_korean#holiday@group.v.calendar.google.com',
      'CN': 'zh.chinese#holiday@group.v.calendar.google.com',
      'BR': 'pt.brazilian#holiday@group.v.calendar.google.com'
    };
    
    return calendarIds[countryCode] || calendarIds['JP'];
  }
  
  // 公開祝日カレンダーから祝日を取得
  async getPublicHolidays(countryCode: string, year: number): Promise<any[]> {
    try {
      // APIキーが設定されていない場合は早期リターン
      if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_CALENDAR_API_KEY') {
        console.warn('Google Calendar APIキーが設定されていません。フォールバック処理へ移行します。');
        return [];
      }
      
      // デバッグ用：APIキーの状態確認
      console.log(`Google Calendar API キー確認: ${this.apiKey.substring(0, 10)}...`);
      
      const calendarId = this.getCalendarIdByCountry(countryCode);
      const startDate = new Date(year, 0, 1).toISOString();
      const endDate = new Date(year, 11, 31).toISOString();
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${this.apiKey}&timeMin=${startDate}&timeMax=${endDate}&singleEvents=true&orderBy=startTime`;
      
      console.log(`Google Calendar API リクエスト: ${countryCode} ${year}`);
      console.log(`リクエストURL: ${url.replace(this.apiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // より詳細なエラー情報を取得
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorDetails += ` - ${errorData.error.message || 'Unknown error'}`;
          }
        } catch (parseError) {
          // JSON解析に失敗した場合はそのまま続行
        }
        
        console.error(`Google Calendar API エラー: ${errorDetails}`);
        
        // 403エラーの場合は特別なメッセージを表示
        if (response.status === 403) {
          console.warn('Google Calendar API: 403 Forbidden - APIキーの制限設定を確認してください。「Application restrictions: None」に設定することを推奨します。');
        }
        
        // エラーの場合は空配列を返してフォールバック処理に移行
        return [];
      }
      
      const data = await response.json();
      
      console.log(`Google Calendar API 成功: ${data.items?.length || 0} 件の祝日を取得`);
      
      // 祝日データを変換
      return data.items?.map((item: any) => ({
        date: item.start.date,
        localName: item.summary,
        name: item.summary,
        countryCode: countryCode,
        fixed: false,
        global: false,
        counties: null,
        launchYear: null,
        types: ['public']
      })) || [];
      
    } catch (error) {
      console.error('Google Calendar API からの祝日取得に失敗:', error);
      console.warn('Nager.Date API へのフォールバック処理に移行します');
      return [];
    }
  }
  
  // 複数の国から祝日を取得
  async getMultipleCountryHolidays(countryCodes: string[], year: number): Promise<{ [country: string]: any[] }> {
    const holidays: { [country: string]: any[] } = {};
    
    for (const countryCode of countryCodes) {
      holidays[countryCode] = await this.getPublicHolidays(countryCode, year);
    }
    
    return holidays;
  }
  
  // 利用可能な国のリスト
  getAvailableCountries(): string[] {
    return ['JP', 'US', 'GB', 'FR', 'DE', 'IT', 'ES', 'CA', 'AU', 'KR', 'CN', 'BR'];
  }
}