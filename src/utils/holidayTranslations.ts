// 祝日名の日本語翻訳マッピング
export const HOLIDAY_TRANSLATIONS: { [key: string]: { [key: string]: string } } = {
  // アメリカの祝日
  'US': {
    'New Year\'s Day': '元日',
    'Martin Luther King, Jr. Day': 'マーティン・ルーサー・キング・ジュニア記念日',
    'Presidents Day': '大統領の日',
    'Memorial Day': '戦没将兵追悼記念日',
    'Independence Day': '独立記念日',
    'Labor Day': '労働者の日',
    'Columbus Day': 'コロンブス記念日',
    'Veterans Day': '復員軍人の日',
    'Thanksgiving Day': '感謝祭',
    'Christmas Day': 'クリスマス',
  },
  
  // イギリスの祝日
  'GB': {
    'New Year\'s Day': '元日',
    '2 January': '1月2日',
    'Saint Patrick\'s Day': '聖パトリックの日',
    'Good Friday': '聖金曜日',
    'Easter Monday': '復活祭月曜日',
    'Early May Bank Holiday': '5月銀行休業日',
    'Spring Bank Holiday': '春の銀行休業日',
    'Summer Bank Holiday': '夏の銀行休業日',
    'Christmas Day': 'クリスマス',
    'Boxing Day': 'ボクシングデー',
  },
  
  // フランスの祝日
  'FR': {
    'New Year\'s Day': '元日',
    'Easter Monday': '復活祭月曜日',
    'Labour Day': 'メーデー',
    'Victory in Europe Day': '第二次世界大戦戦勝記念日',
    'Ascension Day': 'キリスト昇天祭',
    'Bastille Day': '革命記念日',
    'Assumption Day': '聖母被昇天祭',
    'All Saints\' Day': '諸聖人の日',
    'Armistice Day': '第一次世界大戦休戦記念日',
    'Christmas Day': 'クリスマス',
  },
  
  // ドイツの祝日
  'DE': {
    'New Year\'s Day': '元日',
    'Good Friday': '聖金曜日',
    'Easter Monday': '復活祭月曜日',
    'Labour Day': 'メーデー',
    'Ascension Day': 'キリスト昇天祭',
    'Whit Monday': '聖霊降臨祭月曜日',
    'German Unity Day': 'ドイツ統一の日',
    'Christmas Day': 'クリスマス',
    'Boxing Day': '聖ステファノの日',
  },
  
  // イタリアの祝日
  'IT': {
    'New Year\'s Day': '元日',
    'Epiphany': '公現祭',
    'Easter Monday': '復活祭月曜日',
    'Liberation Day': '解放記念日',
    'Labour Day': 'メーデー',
    'Republic Day': '共和国記念日',
    'Assumption Day': '聖母被昇天祭',
    'All Saints\' Day': '諸聖人の日',
    'Immaculate Conception': '無原罪の御宿り',
    'Christmas Day': 'クリスマス',
    'Boxing Day': '聖ステファノの日',
  },
  
  // スペインの祝日
  'ES': {
    'New Year\'s Day': '元日',
    'Epiphany': '公現祭',
    'Good Friday': '聖金曜日',
    'Easter Monday': '復活祭月曜日',
    'Labour Day': 'メーデー',
    'Assumption Day': '聖母被昇天祭',
    'National Day': 'スペイン国民の日',
    'All Saints\' Day': '諸聖人の日',
    'Constitution Day': '憲法記念日',
    'Immaculate Conception': '無原罪の御宿り',
    'Christmas Day': 'クリスマス',
  },
  
  // カナダの祝日
  'CA': {
    'New Year\'s Day': '元日',
    'Good Friday': '聖金曜日',
    'Easter Monday': '復活祭月曜日',
    'Victoria Day': 'ビクトリア女王記念日',
    'Canada Day': 'カナダ記念日',
    'Labour Day': '労働者の日',
    'Thanksgiving Day': '感謝祭',
    'Remembrance Day': '戦没者追悼記念日',
    'Christmas Day': 'クリスマス',
    'Boxing Day': 'ボクシングデー',
  },
  
  // オーストラリアの祝日
  'AU': {
    'New Year\'s Day': '元日',
    'Australia Day': 'オーストラリアデー',
    'Good Friday': '聖金曜日',
    'Easter Monday': '復活祭月曜日',
    'Anzac Day': 'アンザック記念日',
    'Queen\'s Birthday': '女王誕生日',
    'Christmas Day': 'クリスマス',
    'Boxing Day': 'ボクシングデー',
  },
  
  // 韓国の祝日
  'KR': {
    'New Year\'s Day': '신정',
    'Seollal': '설날',
    'Independence Movement Day': '삼일절',
    'Children\'s Day': '어린이날',
    'Buddha\'s Birthday': '부처님 오신 날',
    'Memorial Day': '현충일',
    'Liberation Day': '광복절',
    'Chuseok': '추석',
    'National Foundation Day': '개천절',
    'Hangeul Day': '한글날',
    'Christmas Day': '크리스마스',
  },
  
  // 中国の祝日
  'CN': {
    'New Year\'s Day': '元旦',
    'Spring Festival': '春節',
    'Tomb-sweeping Day': '清明節',
    'Labour Day': '労働節',
    'Dragon Boat Festival': '端午節',
    'National Day': '国慶節',
    'Mid-Autumn Festival': '中秋節',
  },
};

// 祝日名を日本語に翻訳する関数
export const translateHolidayName = (countryCode: string, englishName: string): string => {
  const countryTranslations = HOLIDAY_TRANSLATIONS[countryCode];
  if (countryTranslations && countryTranslations[englishName]) {
    return countryTranslations[englishName];
  }
  
  // 翻訳が見つからない場合は英語名をそのまま返す
  return englishName;
};
