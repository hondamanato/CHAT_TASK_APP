import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Config from 'react-native-config';
import { Holiday } from '../services/holidayService';
import { translateHolidayName } from '../utils/holidayTranslations';
import { OfflineHolidayService } from '../services/offlineHolidayService';
import { GoogleCalendarService } from '../services/googleCalendarService';
import { SupabaseGoogleCalendarService } from '../services/supabaseGoogleCalendarService';
import { HolidayStorageService } from '../services/holidayStorageService';
import { SupabaseHolidayStorageService } from '../services/supabaseHolidayStorageService';
import { networkService, NetworkState } from '../services/networkService';

interface HolidayContextType {
  holidays: { [date: string]: Holiday[] };
  events: { [date: string]: any[] };
  showHolidays: boolean;
  showEvents: boolean;
  selectedCountry: string;
  selectedColor: string;
  language: 'ja' | 'en';
  isOnline: boolean;
  setShowHolidays: (show: boolean) => void;
  setShowEvents: (show: boolean) => void;
  setSelectedCountry: (country: string) => void;
  setSelectedColor: (color: string) => void;
  setLanguage: (language: 'ja' | 'en') => void;
  loadHolidays: (startYear: number, endYear: number, currentSelectedCountry: string, currentShowHolidays: boolean, currentShowEvents: boolean, currentLanguage: 'ja' | 'en', currentSelectedColor: string) => Promise<void>;
  loadHolidaysSimple: (year: number) => Promise<void>;
  clearCache: () => Promise<void>;
  getCacheInfo: () => Promise<any>;
  isLoading: boolean;
}

// 行事データの型定義
interface EventData {
  name: string;
  localName: string;
  date: string;
  color: string;
  type: 'cultural' | 'religious' | 'seasonal' | 'national';
}

const HolidayContext = createContext<HolidayContextType | undefined>(undefined);

export const useHolidayContext = () => {
  const context = useContext(HolidayContext);
  if (!context) {
    throw new Error('useHolidayContext must be used within a HolidayProvider');
  }
  return context;
};

interface HolidayProviderProps {
  children: React.ReactNode;
}

// HolidayContextでのオフライン対応
export const HolidayProvider: React.FC<HolidayProviderProps> = ({ children }) => {
  const [holidays, setHolidays] = useState<{ [date: string]: Holiday[] }>({});
  const [events, setEvents] = useState<{ [date: string]: any[] }>({});
  const [showHolidays, setShowHolidays] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('JP');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [language, setLanguage] = useState<'ja' | 'en'>('ja');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(networkService.isOnline());
  const [loadedYears, setLoadedYears] = useState<Set<string>>(new Set()); // 取得済み年を記録
  const isInitialLoadDone = useRef(false); // 初回読み込み済みフラグ

  const googleCalendarService = new GoogleCalendarService(
    Config.GOOGLE_CALENDAR_API_KEY || 'YOUR_GOOGLE_API_KEY'
  );
  const holidayStorageService = new HolidayStorageService();

  // 設定変更の検知用
  const previousSettings = useRef({
    selectedCountry,
    showHolidays,
    showEvents,
    language,
    selectedColor
  });

  // ネットワーク状態を監視
  useEffect(() => {
    console.log('🌐 HolidayContext: ネットワーク監視開始、初期isOnline:', isOnline);
    
    const removeListener = networkService.addListener((networkState: NetworkState) => {
      const wasOnline = isOnline;
      const nowOnline = networkState.isConnected && networkState.isInternetReachable;
      
      console.log('🌐 HolidayContext: ネットワーク状態変化', {
        networkState,
        wasOnline,
        nowOnline
      });
      
      setIsOnline(nowOnline);
      
      if (!wasOnline && nowOnline) {
        console.log('🌐 ネットワーク復旧 - オフライン期間中にキャッシュされたデータを更新可能');
        // オンラインに復帰したときの処理をここに追加可能
      } else if (wasOnline && !nowOnline) {
        console.log('📵 オフラインモード - キャッシュデータを使用');
      }
    });

    return removeListener;
  }, [isOnline]);

  // キャッシュクリア機能
  const clearCache = useCallback(async () => {
    try {
      await holidayStorageService.clearAllCache();
      setHolidays({});
      setEvents({});
      setLoadedYears(new Set());
      console.log('✅ キャッシュをクリアしました');
    } catch (error) {
      console.error('❌ キャッシュクリアに失敗:', error);
    }
  }, []);

  // キャッシュ情報取得
  const getCacheInfo = useCallback(async () => {
    return await holidayStorageService.getCacheInfo();
  }, []);

  // 日本の行事データ
  const japaneseEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Obon',
      localName: 'お盆',
      date: '08-15',
      color: '#4ecdc4',
      type: 'cultural'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'バレンタインデー',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    },
    {
      name: 'White Day',
      localName: 'ホワイトデー',
      date: '03-14',
      color: '#ffffff',
      type: 'cultural'
    },
    {
      name: 'Tanabata',
      localName: '七夕',
      date: '07-07',
      color: '#9b59b6',
      type: 'cultural'
    },
    {
      name: 'Father\'s Day',
      localName: '父の日',
      date: '06-16', // 2024年は6月16日（第3日曜日）
      color: '#4ecdc4',
      type: 'cultural'
    }
  ];

  // アメリカの行事データ
  const americanEvents: EventData[] = [
    {
      name: 'New Year\'s Day',
      localName: '元日',
      date: '01-01',
      color: '#ff6b6b',
      type: 'national'
    },
    {
      name: 'Martin Luther King Jr. Day',
      localName: 'キング牧師の日',
      date: '01-20', // 第3月曜日（簡易版）
      color: '#6b7280',
      type: 'national'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'バレンタインデー',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    },
    {
      name: 'Presidents Day',
      localName: '大統領の日',
      date: '02-17', // 第3月曜日（簡易版）
      color: '#3b82f6',
      type: 'national'
    },
    {
      name: 'Memorial Day',
      localName: '戦没者追悼記念日',
      date: '05-26', // 最終月曜日（簡易版）
      color: '#6b7280',
      type: 'national'
    },
    {
      name: 'Father\'s Day',
      localName: '父の日',
      date: '06-16', // 2024年は6月16日（第3日曜日）
      color: '#4ecdc4',
      type: 'cultural'
    },
    {
      name: 'Independence Day',
      localName: '独立記念日',
      date: '07-04',
      color: '#ff6b6b',
      type: 'national'
    },
    {
      name: 'Labor Day',
      localName: '労働者の日',
      date: '09-02', // 第1月曜日（簡易版）
      color: '#22c55e',
      type: 'national'
    },
    {
      name: 'Columbus Day',
      localName: 'コロンバス・デー',
      date: '10-14', // 第2月曜日（簡易版）
      color: '#8b5cf6',
      type: 'national'
    },
    {
      name: 'Halloween',
      localName: 'ハロウィン',
      date: '10-31',
      color: '#ff6b35',
      type: 'cultural'
    },
    {
      name: 'Veterans Day',
      localName: '退役軍人の日',
      date: '11-11',
      color: '#6b7280',
      type: 'national'
    },
    {
      name: 'Thanksgiving',
      localName: '感謝祭',
      date: '11-28', // 第4木曜日（簡易版）
      color: '#ff8c42',
      type: 'cultural'
    },
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    }
  ];

  // イギリスの行事データ
  const britishEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Boxing Day',
      localName: 'ボクシングデー',
      date: '12-26',
      color: '#4ecdc4',
      type: 'cultural'
    },
    {
      name: 'Guy Fawkes Night',
      localName: 'ガイ・フォークス・ナイト',
      date: '11-05',
      color: '#ff8c42',
      type: 'cultural'
    },
    {
      name: 'Halloween',
      localName: 'ハロウィン',
      date: '10-31',
      color: '#ff6b35',
      type: 'cultural'
    },
    {
      name: 'Father\'s Day',
      localName: '父の日',
      date: '06-16', // 2024年は6月16日（第3日曜日）
      color: '#4ecdc4',
      type: 'cultural'
    }
  ];

  // フランスの行事データ
  const frenchEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Bastille Day',
      localName: '革命記念日',
      date: '07-14',
      color: '#ff6b6b',
      type: 'national'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'サン・バレンタン',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    }
  ];

  // ドイツの行事データ
  const germanEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Oktoberfest',
      localName: 'オクトーバーフェスト',
      date: '10-01', // 簡易版（実際は9月後半〜10月前半）
      color: '#ff8c42',
      type: 'cultural'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'バレンタイン',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    }
  ];

  // イタリアの行事データ
  const italianEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'ナターレ',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Epiphany',
      localName: '公現祭',
      date: '01-06',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'サン・バレンティーノ',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    }
  ];

  // スペインの行事データ
  const spanishEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'ナビダッド',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Epiphany',
      localName: '公現祭',
      date: '01-06',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'サン・バレンティン',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    }
  ];

  // カナダの行事データ
  const canadianEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Thanksgiving',
      localName: '感謝祭',
      date: '10-13', // カナダは10月第2月曜日（簡易版）
      color: '#ff8c42',
      type: 'cultural'
    },
    {
      name: 'Halloween',
      localName: 'ハロウィン',
      date: '10-31',
      color: '#ff6b35',
      type: 'cultural'
    }
  ];

  // オーストラリアの行事データ
  const australianEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: 'クリスマス',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Australia Day',
      localName: 'オーストラリアデー',
      date: '01-26',
      color: '#ff6b6b',
      type: 'national'
    },
    {
      name: 'Valentine\'s Day',
      localName: 'バレンタインデー',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    }
  ];

  // 韓国の行事データ
  const koreanEvents: EventData[] = [
    {
      name: 'Christmas',
      localName: '크리스마스',
      date: '12-25',
      color: '#4ecdc4',
      type: 'religious'
    },
    {
      name: 'Valentine\'s Day',
      localName: '발렌타인데이',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    },
    {
      name: 'White Day',
      localName: '화이트데이',
      date: '03-14',
      color: '#ffffff',
      type: 'cultural'
    }
  ];

  // 中国の行事データ
  const chineseEvents: EventData[] = [
    {
      name: 'Chinese New Year',
      localName: '春節',
      date: '02-10', // 簡易版（実際は旧暦）
      color: '#ff6b6b',
      type: 'cultural'
    },
    {
      name: 'Valentine\'s Day',
      localName: '情人节',
      date: '02-14',
      color: '#ff6b9d',
      type: 'cultural'
    },
    {
      name: 'Mid-Autumn Festival',
      localName: '中秋節',
      date: '09-15', // 簡易版（実際は旧暦）
      color: '#ff8c42',
      type: 'cultural'
    }
  ];


  // 複数年の祝日データを読み込み（永続化対応）
  // 修正: 既存のデータを保持しながら新しい年のデータを追加
  // 問題: 年をまたいで移動する際に、前の年のデータが消えてしまう
  const loadHolidaysForMultipleYears = useCallback(async (startYear: number, endYear: number, currentSelectedCountry: string, currentShowHolidays: boolean, currentShowEvents: boolean, currentLanguage: 'ja' | 'en', currentSelectedColor: string) => {
    try {
      setIsLoading(true);

      // 新しいデータを収集する変数（state を直接参照しない）
      let newHolidaysData: { [date: string]: Holiday[] } = {};
      let newEventsData: { [date: string]: EventData[] } = {};
      let yearsToAdd = new Set<string>();
      
      // 指定された年範囲でデータを取得（既に取得済みの年はスキップ）
      for (let year = startYear; year <= endYear; year++) {
        const yearKey = `${currentSelectedCountry}-${year}`;
        
        // 既に処理済みの年はスキップ（loadedYearsは後でcheckする）
        console.log(`${year}年のデータを取得中...`);
        
        // まず永続化されたデータから取得を試みる（ローカルストレージのみ）
        let storedData = await holidayStorageService.getStoredHolidayData(currentSelectedCountry, year);
        let dataLoaded = false;
        
        if (storedData && currentShowHolidays) {
          // ストレージから読み込んだ祝日データを適用
          const holidaysByDate = processHolidayDataForYear(storedData.holidays, year, currentLanguage, currentSelectedColor, currentSelectedCountry);
          Object.assign(newHolidaysData, holidaysByDate);

          // ストレージの行事データも適用
          const eventsByDate: { [date: string]: EventData[] } = {};
          storedData.events.forEach(event => {
            const dateKey = event.date.includes('-') ? event.date : `${year}-${event.date}`;
            if (!eventsByDate[dateKey]) {
              eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push({
              ...event,
              color: event.color || currentSelectedColor
            });
          });
          Object.assign(newEventsData, eventsByDate);

          console.log(`${year}年: ストレージから祝日・行事データを読み込み`);
          dataLoaded = true;
        }
        
        // オンライン時のみGoogle Calendar APIから取得
        console.log(`${year}年: ネットワーク状態確認 - isOnline:${isOnline}`);

        if (!dataLoaded && currentShowHolidays && isOnline) {
          let fetchedHolidays: Holiday[] = [];

          // Google Calendar APIから祝日・行事を取得
          try {
            const holidayData = await googleCalendarService.getPublicHolidays(currentSelectedCountry, year);
            if (holidayData && holidayData.length > 0) {
              fetchedHolidays = holidayData;
              const holidaysByDate = processHolidayDataForYear(holidayData, year, currentLanguage, currentSelectedColor, currentSelectedCountry);
              Object.assign(newHolidaysData, holidaysByDate);

              console.log(`${year}年: Google Calendar API: ${holidayData.length}件の祝日・行事を取得`);
              dataLoaded = true;

              // API呼び出し間に遅延を追加（レート制限対策）
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (googleError) {
            console.warn(`${year}年: Google Calendar APIからの取得に失敗:`, googleError);
          }

          // API から取得したデータを永続化（ローカルのみ、Supabaseはスキップ）
          if (dataLoaded && fetchedHolidays.length > 0) {
            const countryEventsForYear = processEventsForYear(year, currentSelectedCountry, currentSelectedColor);
            const eventsList = Object.values(countryEventsForYear).flat();

            // ローカルストレージにのみ保存（UIブロックしない）
            holidayStorageService.storeHolidayData(currentSelectedCountry, year, fetchedHolidays, eventsList)
              .catch(error => console.warn('ローカルストレージ保存エラー:', error));
          }
        }

        // Google Calendar APIのデータのみを使用（固定データによる上書きを無効化）
        // if (currentShowEvents) {
        //   const eventsByDate = processEventsForYear(year, currentSelectedCountry, currentSelectedColor);
        //   Object.assign(allEvents, eventsByDate);
        //   if (!dataLoaded) dataLoaded = true;
        // }
        
        // データが取得できた場合、取得済みとしてマーク
        if (dataLoaded) {
          yearsToAdd.add(yearKey);
        }
      }

      // 最終的なデータを設定（setStateのコールバック形式を使用）
      setHolidays(prevHolidays => ({ ...prevHolidays, ...newHolidaysData }));
      setEvents(prevEvents => ({ ...prevEvents, ...newEventsData }));
      setLoadedYears(prevLoadedYears => new Set([...prevLoadedYears, ...yearsToAdd]));
      
      console.log(`完了: ${startYear}-${endYear}年のデータ取得処理`);
      
    } catch (error) {
      console.error('複数年の祝日データの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, [googleCalendarService, holidayStorageService, isOnline]);

  // 単一年の祝日データを読み込み（後方互換性のため）
  const loadHolidaysForYear = useCallback(async (year: number) => {
    await loadHolidaysForMultipleYears(year, year, selectedCountry, showHolidays, showEvents, language, selectedColor);
  }, [loadHolidaysForMultipleYears, selectedCountry, showHolidays, showEvents, language, selectedColor]);

  // 簡易版の単一年祝日読み込み（CustomCalendar用）
  const loadHolidaysSimple = useCallback(async (year: number) => {
    const yearKey = `${selectedCountry}-${year}`;
    
    // 既に取得済みの場合はスキップ
    if (loadedYears.has(yearKey)) {
      console.log(`${year}年: 既にキャッシュ済みのためスキップ`);
      return;
    }
    
    console.log(`loadHolidaysSimple: ${year}年のデータ取得開始`);
    
    try {
      // 新しい年のデータを取得（既存データは自動的に保持される）
      await loadHolidaysForMultipleYears(year, year, selectedCountry, showHolidays, showEvents, language, selectedColor);
      
      console.log(`${year}年: データ取得完了、既存データ保持`);
    } catch (error) {
      console.error(`loadHolidaysSimple: ${year}年のデータ取得エラー`, error);
    }
  }, [loadedYears, selectedCountry, showHolidays, showEvents, language, selectedColor, loadHolidaysForMultipleYears]);

  // 年別の祝日データ処理（Google Calendar APIデータを祝日・行事両方として扱う）
  const processHolidayDataForYear = (holidayData: Holiday[], year: number, currentLanguage: 'ja' | 'en', currentSelectedColor: string, currentSelectedCountry: string) => {
    const holidaysByDate: { [date: string]: Holiday[] } = {};
    const eventsByDate: { [date: string]: EventData[] } = {};

    holidayData.forEach(holiday => {
      const dateKey = holiday.date;

      // すべてのGoogle Calendar APIデータを祝日として扱う
      if (!holidaysByDate[dateKey]) {
        holidaysByDate[dateKey] = [];
      }

      const translatedHoliday = {
        ...holiday,
        localName: currentLanguage === 'ja'
          ? translateHolidayName(currentSelectedCountry, holiday.localName)
          : holiday.localName,
        color: currentSelectedColor
      };

      holidaysByDate[dateKey].push(translatedHoliday);

      // 同時に行事としても追加（祝日と行事の両方で表示）
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      const eventData: EventData = {
        name: holiday.name,
        localName: holiday.localName,
        date: holiday.date,
        color: currentSelectedColor,
        type: 'national'
      };

      eventsByDate[dateKey].push(eventData);
    });

    return holidaysByDate;
  };

  // 行事データを年別に処理
  const processEventsForYear = (year: number, currentSelectedCountry: string, currentSelectedColor: string) => {
    const eventsByDate: { [date: string]: EventData[] } = {};
    
    // 選択された国に応じて行事データを取得
    let countryEvents: EventData[] = [];
    switch (currentSelectedCountry) {
      case 'JP':
        countryEvents = japaneseEvents;
        break;
      case 'US':
        countryEvents = americanEvents;
        break;
      case 'GB':
        countryEvents = britishEvents;
        break;
      case 'FR':
        countryEvents = frenchEvents;
        break;
      case 'DE':
        countryEvents = germanEvents;
        break;
      case 'IT':
        countryEvents = italianEvents;
        break;
      case 'ES':
        countryEvents = spanishEvents;
        break;
      case 'CA':
        countryEvents = canadianEvents;
        break;
      case 'AU':
        countryEvents = australianEvents;
        break;
      case 'KR':
        countryEvents = koreanEvents;
        break;
      case 'CN':
        countryEvents = chineseEvents;
        break;
      default:
        countryEvents = japaneseEvents; // デフォルトは日本
    }
    
    countryEvents.forEach(event => {
      let dateKey = `${year}-${event.date}`;
      
      // 父の日と母の日は動的に計算
      if (event.name === 'Father\'s Day') {
        const fathersDayDate = getFathersDayDate(year);
        dateKey = `${year}-${fathersDayDate}`;
      } else if (event.name === 'Mother\'s Day') {
        const mothersDayDate = getMothersDayDate(year);
        dateKey = `${year}-${mothersDayDate}`;
      }
      
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      
      // 選択されたカラーを適用
      const eventWithCustomColor = {
        ...event,
        color: currentSelectedColor
      };
      
      eventsByDate[dateKey].push(eventWithCustomColor);
    });
    
    return eventsByDate;
  };

  // 父の日の日付を計算（6月第3日曜日）
  const getFathersDayDate = (year: number): string => {
    const june = new Date(year, 5, 1); // 6月1日
    const firstSunday = new Date(june);
    firstSunday.setDate(1 + (7 - june.getDay()) % 7); // 6月第1日曜日
    const thirdSunday = new Date(firstSunday);
    thirdSunday.setDate(firstSunday.getDate() + 14); // 第3日曜日
    
    const month = String(thirdSunday.getMonth() + 1).padStart(2, '0');
    const day = String(thirdSunday.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  // 母の日の日付を計算（5月第2日曜日）
  const getMothersDayDate = (year: number): string => {
    const may = new Date(year, 4, 1); // 5月1日
    const firstSunday = new Date(may);
    firstSunday.setDate(1 + (7 - may.getDay()) % 7); // 5月第1日曜日
    const secondSunday = new Date(firstSunday);
    secondSunday.setDate(firstSunday.getDate() + 7); // 第2日曜日
    
    const month = String(secondSunday.getMonth() + 1).padStart(2, '0');
    const day = String(secondSunday.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  // 初回読み込み（現在年のみ）
  useEffect(() => {
    if (!isInitialLoadDone.current) {
      const currentYear = new Date().getFullYear();
      console.log('HolidayProvider: 初回データ読み込み開始');
      loadHolidaysForMultipleYears(currentYear, currentYear, selectedCountry, showHolidays, showEvents, language, selectedColor);
      isInitialLoadDone.current = true; // 初回読み込み完了フラグを設定
    }
  }, []); // 依存配列を空にして初回のみ実行（無限ループを防ぐ）

  // 設定変更時のデータクリアと再読み込み
  useEffect(() => {
    const prev = previousSettings.current;
    const hasSettingsChanged = (
      prev.selectedCountry !== selectedCountry ||
      prev.showHolidays !== showHolidays ||
      prev.showEvents !== showEvents ||
      prev.language !== language ||
      prev.selectedColor !== selectedColor
    );

    if (hasSettingsChanged && isInitialLoadDone.current) { // 実際に設定が変更され、かつ初回読み込み後のみ実行
      console.log('HolidayProvider: 設定変更によるデータクリアと再読み込み - selectedCountry:', selectedCountry, 'showHolidays:', showHolidays, 'showEvents:', showEvents);
      setLoadedYears(new Set()); // キャッシュクリア
      setHolidays({}); // 既存の祝日データをクリア
      setEvents({}); // 既存の行事データをクリア

      // 直接再読み込みを実行
      const currentYear = new Date().getFullYear();
      loadHolidaysForMultipleYears(currentYear, currentYear, selectedCountry, showHolidays, showEvents, language, selectedColor);

      console.log('設定変更によるデータクリアと再読み込み完了。');
    }

    // 前回の設定を更新
    previousSettings.current = {
      selectedCountry,
      showHolidays,
      showEvents,
      language,
      selectedColor
    };
  }, [selectedCountry, showHolidays, showEvents, language, selectedColor, loadHolidaysForMultipleYears]);


  const value: HolidayContextType = {
    holidays,
    events,
    showHolidays,
    showEvents,
    selectedCountry,
    selectedColor,
    language,
    isOnline,
    setShowHolidays,
    setShowEvents,
    setSelectedCountry,
    setSelectedColor,
    setLanguage,
    loadHolidays: loadHolidaysForMultipleYears,
    loadHolidaysSimple,
    clearCache,
    getCacheInfo,
    isLoading,
  };

  return (
    <HolidayContext.Provider value={value}>
      {children}
    </HolidayContext.Provider>
  );
};
