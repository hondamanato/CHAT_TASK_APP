import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeatherData, SearchedCity, getWeatherIcon, getWeatherSFSymbol } from '../types/weather';
import { weatherService } from '../services/weatherService';

// AsyncStorageのキー
const WEATHER_ENABLED_KEY = 'weather_enabled';
const SELECTED_CITY_KEY = 'selected_city';
const RECENT_CITIES_KEY = 'recent_cities';
const MAX_RECENT_CITIES = 10;

interface WeatherContextType {
  weatherData: { [date: string]: WeatherData };
  weatherEnabled: boolean;
  selectedCity: SearchedCity | null;
  recentCities: SearchedCity[];
  isLoading: boolean;
  error: string | null;
  setWeatherEnabled: (enabled: boolean) => Promise<void>;
  setSelectedCity: (city: SearchedCity) => Promise<void>;
  refreshWeather: () => Promise<void>;
  getWeatherForDate: (date: string) => WeatherData | null;
  getWeatherIconForDate: (date: string) => string | null;
  getWeatherSFSymbolForDate: (date: string) => string | null;
  getSelectedCityDisplayName: () => string;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const useWeatherContext = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeatherContext must be used within a WeatherProvider');
  }
  return context;
};

interface WeatherProviderProps {
  children: React.ReactNode;
}

export const WeatherProvider: React.FC<WeatherProviderProps> = ({ children }) => {
  const [weatherData, setWeatherData] = useState<{ [date: string]: WeatherData }>({});
  const [weatherEnabled, setWeatherEnabledState] = useState(false);
  const [selectedCity, setSelectedCityState] = useState<SearchedCity | null>(null);
  const [recentCities, setRecentCities] = useState<SearchedCity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [enabledValue, cityValue, recentValue] = await Promise.all([
          AsyncStorage.getItem(WEATHER_ENABLED_KEY),
          AsyncStorage.getItem(SELECTED_CITY_KEY),
          AsyncStorage.getItem(RECENT_CITIES_KEY),
        ]);

        const enabled = enabledValue === 'true';
        setWeatherEnabledState(enabled);

        // 検索履歴を読み込む
        if (recentValue) {
          const recent = JSON.parse(recentValue) as SearchedCity[];
          setRecentCities(recent);
        }

        if (cityValue) {
          const city = JSON.parse(cityValue) as SearchedCity;
          setSelectedCityState(city);

          isInitialized.current = true;

          // 天気が有効で都市が選択されている場合、データを取得
          if (enabled) {
            await fetchWeatherData(city);
          }
        } else {
          isInitialized.current = true;
        }
      } catch (err) {
        console.error('天気設定の読み込みエラー:', err);
        isInitialized.current = true;
      }
    };

    loadSettings();
  }, []);

  // 天気データを取得
  const fetchWeatherData = useCallback(async (city: SearchedCity) => {
    setIsLoading(true);
    setError(null);

    try {
      // キャッシュキーとして都市の座標を使用
      const cacheKey = `${city.lat.toFixed(4)}_${city.long.toFixed(4)}`;
      const data = await weatherService.getWeatherData(
        city.lat,
        city.long,
        cacheKey
      );

      // 日付をキーとしたオブジェクトに変換
      const dataByDate: { [date: string]: WeatherData } = {};
      data.forEach(item => {
        dataByDate[item.date] = item;
      });

      setWeatherData(dataByDate);
    } catch (err) {
      console.error('天気データ取得エラー:', err);
      setError('天気データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 天気表示ON/OFFを設定
  const setWeatherEnabled = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(WEATHER_ENABLED_KEY, enabled.toString());
      setWeatherEnabledState(enabled);

      if (enabled && selectedCity) {
        await fetchWeatherData(selectedCity);
      } else if (!enabled) {
        setWeatherData({});
      }
    } catch (err) {
      console.error('天気設定の保存エラー:', err);
    }
  }, [selectedCity, fetchWeatherData]);

  // 検索履歴に都市を追加
  const addCityToHistory = useCallback(async (city: SearchedCity) => {
    try {
      // 同じ座標の都市を除外して先頭に追加
      const filtered = recentCities.filter(
        c => !(c.lat.toFixed(4) === city.lat.toFixed(4) && c.long.toFixed(4) === city.long.toFixed(4))
      );
      const updated = [city, ...filtered].slice(0, MAX_RECENT_CITIES);
      setRecentCities(updated);
      await AsyncStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('検索履歴の保存エラー:', err);
    }
  }, [recentCities]);

  // 選択都市を設定
  const setSelectedCity = useCallback(async (city: SearchedCity) => {
    try {
      await AsyncStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city));
      setSelectedCityState(city);

      // 検索履歴に追加
      await addCityToHistory(city);

      if (weatherEnabled) {
        await fetchWeatherData(city);
      }
    } catch (err) {
      console.error('都市設定の保存エラー:', err);
    }
  }, [weatherEnabled, fetchWeatherData, addCityToHistory]);

  // 天気データを更新
  const refreshWeather = useCallback(async () => {
    if (selectedCity && weatherEnabled) {
      // キャッシュをクリアしてから再取得
      const cacheKey = `${selectedCity.lat.toFixed(4)}_${selectedCity.long.toFixed(4)}`;
      await weatherService.clearCache(cacheKey);
      await fetchWeatherData(selectedCity);
    }
  }, [selectedCity, weatherEnabled, fetchWeatherData]);

  // 特定日付の天気を取得
  const getWeatherForDate = useCallback((date: string): WeatherData | null => {
    if (!weatherEnabled) return null;
    return weatherData[date] || null;
  }, [weatherEnabled, weatherData]);

  // 特定日付の天気アイコンを取得
  const getWeatherIconForDate = useCallback((date: string): string | null => {
    const weather = getWeatherForDate(date);
    if (!weather) return null;
    return getWeatherIcon(weather.weatherCode);
  }, [getWeatherForDate]);

  // 特定日付のSF Symbol名を取得
  const getWeatherSFSymbolForDate = useCallback((date: string): string | null => {
    const weather = getWeatherForDate(date);
    if (!weather) return null;
    return getWeatherSFSymbol(weather.weatherCode);
  }, [getWeatherForDate]);

  // 選択中の都市名を取得（設定画面表示用）
  const getSelectedCityDisplayName = useCallback((): string => {
    if (!selectedCity) return '未設定';
    return selectedCity.name;
  }, [selectedCity]);

  const value: WeatherContextType = {
    weatherData,
    weatherEnabled,
    selectedCity,
    recentCities,
    isLoading,
    error,
    setWeatherEnabled,
    setSelectedCity,
    refreshWeather,
    getWeatherForDate,
    getWeatherIconForDate,
    getWeatherSFSymbolForDate,
    getSelectedCityDisplayName,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};
