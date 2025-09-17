// オフライン対応のためのキャッシュ機能
export class OfflineHolidayService {
  private cache: Map<string, any>;
  private storageKey = 'holiday_cache';

  constructor() {
    this.cache = new Map();
    this.loadCacheFromStorage();
  }

  // キャッシュから祝日データを取得
  async getHolidaysOffline(country: string, year: number) {
    const cacheKey = `${country}-${year}`;
    
    // キャッシュにデータがある場合は返す
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // オフライン用の基本データを返す
    return this.getBasicHolidays(country, year);
  }

  // オンライン時にデータをキャッシュ（Google Calendar APIを使用しないため廃止予定）
  async cacheHolidays(country: string, year: number) {
    console.warn('cacheHolidays は廃止予定です。Google Calendar APIを直接使用してください。');
    return this.getBasicHolidays(country, year);
  }

  // 基本的な祝日データ（オフライン用）
  private getBasicHolidays(country: string, year: number) {
    const basicHolidays = {
      'JP': [
        { date: `${year}-01-01`, localName: '元日', name: 'New Year\'s Day' },
        { date: `${year}-01-13`, localName: '成人の日', name: 'Coming of Age Day' },
        { date: `${year}-02-11`, localName: '建国記念の日', name: 'Foundation Day' },
        { date: `${year}-05-03`, localName: '憲法記念日', name: 'Constitution Memorial Day' },
        { date: `${year}-05-05`, localName: 'こどもの日', name: 'Children\'s Day' },
        { date: `${year}-07-21`, localName: '海の日', name: 'Marine Day' },
        { date: `${year}-08-11`, localName: '山の日', name: 'Mountain Day' },
        { date: `${year}-09-23`, localName: '秋分の日', name: 'Autumnal Equinox Day' },
        { date: `${year}-11-03`, localName: '文化の日', name: 'Culture Day' },
        { date: `${year}-11-23`, localName: '勤労感謝の日', name: 'Labour Thanksgiving Day' }
      ],
      'US': [
        { date: `${year}-01-01`, localName: 'New Year\'s Day', name: 'New Year\'s Day' },
        { date: `${year}-01-20`, localName: 'Martin Luther King, Jr. Day', name: 'Martin Luther King, Jr. Day' },
        { date: `${year}-02-17`, localName: 'Presidents Day', name: 'Presidents Day' },
        { date: `${year}-05-26`, localName: 'Memorial Day', name: 'Memorial Day' },
        { date: `${year}-07-04`, localName: 'Independence Day', name: 'Independence Day' },
        { date: `${year}-09-01`, localName: 'Labor Day', name: 'Labor Day' },
        { date: `${year}-10-13`, localName: 'Columbus Day', name: 'Columbus Day' },
        { date: `${year}-11-11`, localName: 'Veterans Day', name: 'Veterans Day' },
        { date: `${year}-11-27`, localName: 'Thanksgiving Day', name: 'Thanksgiving Day' },
        { date: `${year}-12-25`, localName: 'Christmas Day', name: 'Christmas Day' }
      ]
    };

    return basicHolidays[country as keyof typeof basicHolidays] || [];
  }

  // ローカルストレージにキャッシュを保存（React Native対応）
  private saveCacheToStorage() {
    try {
      // React Native環境ではlocalStorageが存在しないため、メモリ内キャッシュのみ使用
      console.log('キャッシュをメモリに保存しました');
    } catch (error) {
      console.error('キャッシュの保存に失敗:', error);
    }
  }

  // ローカルストレージからキャッシュを読み込み（React Native対応）
  private loadCacheFromStorage() {
    try {
      // React Native環境ではlocalStorageが存在しないため、メモリ内キャッシュのみ使用
      console.log('メモリ内キャッシュを使用します');
    } catch (error) {
      console.error('キャッシュの読み込みに失敗:', error);
    }
  }

  // キャッシュをクリア（React Native対応）
  clearCache() {
    this.cache.clear();
    console.log('メモリ内キャッシュをクリアしました');
  }
}
