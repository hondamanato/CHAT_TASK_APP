// 天気データの型定義

export interface WeatherData {
  date: string; // YYYY-MM-DD
  weatherCode: number | string; // WeatherKit uses string codes
  temperatureMax: number;
  temperatureMin: number;
}

// Open-Meteo レスポンス型（旧）
export interface DailyWeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

// WeatherAPI.com レスポンス型
export interface WeatherApiResponse {
  forecast: {
    forecastday: WeatherApiForecastDay[];
  };
}

export interface WeatherApiForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    condition: {
      code: number;
      text: string;
      icon: string;
    };
  };
}

// WeatherKit REST API レスポンス型
export interface WeatherKitResponse {
  forecastDaily: {
    name: string;
    days: WeatherKitDayForecast[];
  };
}

export interface WeatherKitDayForecast {
  forecastStart: string; // ISO 8601
  forecastEnd: string;
  conditionCode: string;
  maxUvIndex: number;
  moonPhase: string;
  moonrise?: string;
  moonset?: string;
  precipitationAmount: number;
  precipitationChance: number;
  precipitationType: string;
  snowfallAmount: number;
  sunrise: string;
  sunset: string;
  temperatureMax: number;
  temperatureMin: number;
}

export interface Region {
  code: string;
  name: string;
  lat: number;
  long: number;
}

export interface Country {
  code: string;
  name: string;
  continent: string;
  regions: Region[];
}

export interface RegionsData {
  countries: Country[];
}

// Nominatim検索で取得した都市情報
export interface SearchedCity {
  name: string;           // 都市名（例: "渋谷区"）
  displayName: string;    // 完全な表示名（例: "渋谷区, 東京都, 日本"）
  lat: number;
  long: number;
}

// WeatherAPI.com コードから天気アイコンへのマッピング
export const WEATHER_CODE_TO_ICON: { [code: number]: string } = {
  // 晴れ
  1000: '☀️',
  // 一部曇り
  1003: '🌤️',
  // 曇り
  1006: '⛅',
  // どんより曇り
  1009: '☁️',
  // 霧
  1030: '🌫️',
  1135: '🌫️',
  1147: '🌫️',
  // 霧雨
  1150: '🌧️',
  1153: '🌧️',
  1168: '🌧️',
  1171: '🌧️',
  // 雨
  1063: '🌧️',
  1180: '🌧️',
  1183: '🌧️',
  1186: '🌧️',
  1189: '🌧️',
  1192: '🌧️',
  1195: '🌧️',
  1198: '🌧️',
  1201: '🌧️',
  1240: '🌦️',
  1243: '🌦️',
  1246: '🌦️',
  // 雪
  1066: '🌨️',
  1069: '🌨️',
  1072: '🌨️',
  1114: '🌨️',
  1117: '🌨️',
  1210: '🌨️',
  1213: '🌨️',
  1216: '🌨️',
  1219: '🌨️',
  1222: '🌨️',
  1225: '🌨️',
  1237: '🌨️',
  1249: '🌨️',
  1252: '🌨️',
  1255: '🌨️',
  1258: '🌨️',
  1261: '🌨️',
  1264: '🌨️',
  // 雷雨
  1087: '⛈️',
  1273: '⛈️',
  1276: '⛈️',
  1279: '⛈️',
  1282: '⛈️',
};

// 旧WMOコードマッピング（互換性のため保持）
export const WMO_CODE_TO_ICON: { [code: number]: string } = {
  // 快晴
  0: '☀️',
  // 晴れ/曇り
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  // 霧
  45: '🌫️',
  48: '🌫️',
  // 霧雨
  51: '🌧️',
  53: '🌧️',
  55: '🌧️',
  56: '🌧️',
  57: '🌧️',
  // 雨
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  66: '🌧️',
  67: '🌧️',
  // 雪
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  77: '🌨️',
  // にわか雨
  80: '🌦️',
  81: '🌦️',
  82: '🌦️',
  // にわか雪
  85: '🌨️',
  86: '🌨️',
  // 雷雨
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

// WeatherAPI.com コードから天気説明へのマッピング
export const WEATHER_CODE_TO_DESCRIPTION: { [code: number]: string } = {
  1000: '晴れ',
  1003: '一部曇り',
  1006: '曇り',
  1009: 'どんより曇り',
  1030: '霧',
  1063: 'にわか雨',
  1066: 'にわか雪',
  1069: 'みぞれ',
  1072: '着氷性霧雨',
  1087: '雷雨',
  1114: '吹雪',
  1117: '猛吹雪',
  1135: '霧',
  1147: '着氷性の霧',
  1150: '弱い霧雨',
  1153: '霧雨',
  1168: '着氷性霧雨',
  1171: '強い着氷性霧雨',
  1180: '弱い雨',
  1183: '雨',
  1186: 'やや強い雨',
  1189: '強い雨',
  1192: '大雨',
  1195: '豪雨',
  1198: '弱い着氷性の雨',
  1201: '着氷性の雨',
  1210: '弱い雪',
  1213: '雪',
  1216: 'やや強い雪',
  1219: '強い雪',
  1222: '大雪',
  1225: '豪雪',
  1237: '氷粒',
  1240: '弱いにわか雨',
  1243: 'にわか雨',
  1246: '強いにわか雨',
  1249: '弱いみぞれ',
  1252: 'みぞれ',
  1255: '弱いにわか雪',
  1258: 'にわか雪',
  1261: '弱い氷粒',
  1264: '氷粒',
  1273: '雷を伴う弱い雨',
  1276: '雷を伴う強い雨',
  1279: '雷を伴う弱い雪',
  1282: '雷を伴う強い雪',
};

// 旧WMOコードマッピング（互換性のため保持）
export const WMO_CODE_TO_DESCRIPTION: { [code: number]: string } = {
  0: '快晴',
  1: '晴れ',
  2: 'やや曇り',
  3: '曇り',
  45: '霧',
  48: '着氷性の霧',
  51: '弱い霧雨',
  53: '霧雨',
  55: '強い霧雨',
  56: '弱い着氷性霧雨',
  57: '着氷性霧雨',
  61: '弱い雨',
  63: '雨',
  65: '強い雨',
  66: '弱い着氷性の雨',
  67: '着氷性の雨',
  71: '弱い雪',
  73: '雪',
  75: '強い雪',
  77: '霧雪',
  80: '弱いにわか雨',
  81: 'にわか雨',
  82: '強いにわか雨',
  85: '弱いにわか雪',
  86: 'にわか雪',
  95: '雷雨',
  96: '雹を伴う雷雨',
  99: '激しい雹を伴う雷雨',
};

// WeatherKit コードから天気アイコンへのマッピング
export const WEATHERKIT_CODE_TO_ICON: { [code: string]: string } = {
  'Clear': '☀️',
  'MostlyClear': '🌤️',
  'PartlyCloudy': '⛅',
  'MostlyCloudy': '🌥️',
  'Cloudy': '☁️',
  'Foggy': '🌫️',
  'Haze': '🌫️',
  'Smoky': '🌫️',
  'Breezy': '🌬️',
  'Windy': '🌬️',
  'Drizzle': '🌧️',
  'Rain': '🌧️',
  'HeavyRain': '🌧️',
  'IsolatedThunderstorms': '⛈️',
  'ScatteredThunderstorms': '⛈️',
  'StrongStorms': '⛈️',
  'Thunderstorms': '⛈️',
  'Flurries': '🌨️',
  'Snow': '🌨️',
  'HeavySnow': '🌨️',
  'Blizzard': '🌨️',
  'BlowingSnow': '🌨️',
  'FreezingDrizzle': '🌨️',
  'FreezingRain': '🌨️',
  'Sleet': '🌨️',
  'Hail': '🌨️',
  'Hot': '🌡️',
  'Frigid': '🥶',
  'BlowingDust': '💨',
  'TropicalStorm': '🌀',
  'Hurricane': '🌀',
  'SunShowers': '🌦️',    // 晴れ時々にわか雨
  'SunFlurries': '🌨️',   // 晴れ時々にわか雪
  'WintryMix': '🌨️',     // 雪まじりの雨
};

// WeatherKit コードから天気説明へのマッピング
export const WEATHERKIT_CODE_TO_DESCRIPTION: { [code: string]: string } = {
  'Clear': '快晴',
  'MostlyClear': '晴れ',
  'PartlyCloudy': 'やや曇り',
  'MostlyCloudy': 'ほぼ曇り',
  'Cloudy': '曇り',
  'Foggy': '霧',
  'Haze': 'もや',
  'Smoky': '煙',
  'Breezy': 'そよ風',
  'Windy': '強風',
  'Drizzle': '霧雨',
  'Rain': '雨',
  'HeavyRain': '大雨',
  'IsolatedThunderstorms': '局地的な雷雨',
  'ScatteredThunderstorms': '散発的な雷雨',
  'StrongStorms': '激しい嵐',
  'Thunderstorms': '雷雨',
  'Flurries': 'にわか雪',
  'Snow': '雪',
  'HeavySnow': '大雪',
  'Blizzard': '吹雪',
  'BlowingSnow': '地吹雪',
  'FreezingDrizzle': '着氷性霧雨',
  'FreezingRain': '着氷性の雨',
  'Sleet': 'みぞれ',
  'Hail': '雹',
  'Hot': '猛暑',
  'Frigid': '極寒',
  'BlowingDust': '砂塵',
  'TropicalStorm': '熱帯性低気圧',
  'Hurricane': 'ハリケーン',
  'SunShowers': '晴れ時々にわか雨',
  'SunFlurries': '晴れ時々にわか雪',
  'WintryMix': '雪まじりの雨',
};

// WeatherKit コードからSF Symbolへのマッピング（Apple天気アプリ互換）
export const WEATHERKIT_CODE_TO_SF_SYMBOL: { [code: string]: string } = {
  'Clear': 'sun.max.fill',
  'MostlyClear': 'sun.max.fill',
  'PartlyCloudy': 'cloud.sun.fill',
  'MostlyCloudy': 'cloud.fill',
  'Cloudy': 'cloud.fill',
  'Foggy': 'cloud.fog.fill',
  'Haze': 'sun.haze.fill',
  'Smoky': 'smoke.fill',
  'Breezy': 'wind',
  'Windy': 'wind',
  'Drizzle': 'cloud.drizzle.fill',
  'Rain': 'cloud.rain.fill',
  'HeavyRain': 'cloud.heavyrain.fill',
  'IsolatedThunderstorms': 'cloud.bolt.fill',
  'ScatteredThunderstorms': 'cloud.bolt.fill',
  'StrongStorms': 'cloud.bolt.rain.fill',
  'Thunderstorms': 'cloud.bolt.rain.fill',
  'Flurries': 'cloud.snow.fill',
  'Snow': 'cloud.snow.fill',
  'HeavySnow': 'cloud.snow.fill',
  'Blizzard': 'wind.snow',
  'BlowingSnow': 'wind.snow',
  'FreezingDrizzle': 'cloud.sleet.fill',
  'FreezingRain': 'cloud.sleet.fill',
  'Sleet': 'cloud.sleet.fill',
  'Hail': 'cloud.hail.fill',
  'Hot': 'thermometer.sun.fill',
  'Frigid': 'thermometer.snowflake',
  'BlowingDust': 'sun.dust.fill',
  'TropicalStorm': 'tropicalstorm',
  'Hurricane': 'hurricane',
  'SunShowers': 'cloud.sun.rain.fill',
  'SunFlurries': 'sun.snow.fill',
  'WintryMix': 'cloud.sleet.fill',
};

// 天気コードからアイコンを取得（WeatherAPI.com/WeatherKit両対応）
export const getWeatherIcon = (code: number | string): string => {
  if (typeof code === 'string') {
    return WEATHERKIT_CODE_TO_ICON[code] || '❓';
  }
  return WEATHER_CODE_TO_ICON[code] || '❓';
};

// 天気コードからSF Symbol名を取得
export const getWeatherSFSymbol = (code: number | string): string => {
  if (typeof code === 'string') {
    return WEATHERKIT_CODE_TO_SF_SYMBOL[code] || 'questionmark';
  }
  return 'questionmark';
};

// 天気コードから天気説明を取得（WeatherAPI.com/WeatherKit両対応）
export const getWeatherDescription = (code: number | string): string => {
  if (typeof code === 'string') {
    return WEATHERKIT_CODE_TO_DESCRIPTION[code] || '不明';
  }
  return WEATHER_CODE_TO_DESCRIPTION[code] || '不明';
};
