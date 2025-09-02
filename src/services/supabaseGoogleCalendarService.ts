// Supabase Edge Function経由でGoogle Calendar APIを呼び出すサービス
export class SupabaseGoogleCalendarService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  
  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    
    // デバッグ用ログ
    console.log('SupabaseGoogleCalendarService 初期化');
    console.log('Supabase URL:', this.supabaseUrl);
    console.log('Supabase Anon Key:', this.supabaseAnonKey ? '設定済み' : '未設定');
  }
  
  // Supabase Edge Function経由で祝日を取得
  async getPublicHolidays(countryCode: string, year: number): Promise<any[]> {
    try {
      // デバッグ用ログ
      console.log('Supabase Edge Function リクエスト開始');
      console.log('Supabase URL:', this.supabaseUrl);
      console.log('Supabase Anon Key:', this.supabaseAnonKey ? '設定済み' : '未設定');
      console.log('リクエストパラメータ:', { countryCode, year });
      
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/google-calendar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
            'apikey': this.supabaseAnonKey,
          },
          body: JSON.stringify({
            countryCode,
            year
          })
        }
      );
      
      console.log('Supabase Edge Function レスポンス:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase Edge Function エラー詳細:', errorText);
        throw new Error(`Supabase Edge Function error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log(`Supabase Edge Function レスポンス: ${data.holidays?.length || 0} 件の祝日`);
      
      return data.holidays || [];
      
    } catch (error) {
      console.error('Supabase Edge Function からの祝日取得に失敗:', error);
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
