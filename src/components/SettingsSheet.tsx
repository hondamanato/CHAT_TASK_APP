import React, { useState } from 'react';
import {
  View,
} from 'react-native';
import { BaseBottomSheet } from './BaseBottomSheet';
import { TodayScheduleSheet } from './TodayScheduleSheet';
import { MainSettingsScreen } from './MainSettingsScreen';
import { HolidaySettingsScreen } from './HolidaySettingsScreen';
import { TimezoneSelectionScreen } from './TimezoneSelectionScreen';
import { ColorSettingsScreen } from './ColorSettingsScreen';
import { CountrySettingsScreen } from './CountrySettingsScreen';
import { RegionSelectionScreen } from './RegionSelectionScreen';
import { WeatherSettingsScreen } from './WeatherSettingsScreen';
import { useSettings } from '../contexts/SettingsContext';
import { useHolidayContext } from '../contexts/HolidayContext';
import { useWeatherContext } from '../contexts/WeatherContext';

interface SettingsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { selectedTimezone, setSelectedTimezone } = useSettings();
  const { selectedColor, setSelectedColor, selectedCountry, setSelectedCountry } = useHolidayContext();
  const { selectedCity, setSelectedCity, recentCities } = useWeatherContext();
  const [showTodaySchedule, setShowTodaySchedule] = useState(false);
  const [showHolidaySettings, setShowHolidaySettings] = useState(false);
  const [showTimezoneSettings, setShowTimezoneSettings] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCountrySettings, setShowCountrySettings] = useState(false);
  const [showRegionSettings, setShowRegionSettings] = useState(false);
  const [showWeatherSettings, setShowWeatherSettings] = useState(false);

  // タイトルを決定
  const getTitle = () => {
    if (showRegionSettings) return '地域検索';
    if (showWeatherSettings) return '天気表示';
    if (showHolidaySettings) return '祝日設定';
    if (showTimezoneSettings) return 'タイムゾーン';
    if (showColorSettings) return 'カラー選択';
    if (showCountrySettings) return '国・地域選択';
    return '設定';
  };

  // 戻るボタンの表示判定
  const shouldShowBackButton =
    showHolidaySettings ||
    showTimezoneSettings ||
    showColorSettings ||
    showCountrySettings ||
    showRegionSettings ||
    showWeatherSettings;

  // 戻るボタンの処理
  const handleBackPress = () => {
    if (showRegionSettings) {
      setShowRegionSettings(false);
      setShowWeatherSettings(true);
    } else if (showWeatherSettings) {
      setShowWeatherSettings(false);
    } else if (showColorSettings) {
      setShowColorSettings(false);
      setShowHolidaySettings(true);
    } else if (showCountrySettings) {
      setShowCountrySettings(false);
      setShowHolidaySettings(true);
    } else {
      setShowHolidaySettings(false);
      setShowTimezoneSettings(false);
    }
  };

  return (
    <>
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.9}
        title={getTitle()}
        showHandle={true}
        showCloseButton={true}
        showBackButton={shouldShowBackButton}
        onBackPress={handleBackPress}
      >

        <View style={styles.content}>
          {showRegionSettings ? (
            <RegionSelectionScreen
              onBack={() => {
                setShowRegionSettings(false);
                setShowWeatherSettings(true);
              }}
              selectedCity={selectedCity}
              onCitySelect={(city) => {
                setSelectedCity(city);
                setShowRegionSettings(false);
                setShowWeatherSettings(true);
              }}
              recentCities={recentCities}
            />
          ) : showWeatherSettings ? (
            <WeatherSettingsScreen
              onBack={() => setShowWeatherSettings(false)}
              onOpenRegionSelection={() => {
                setShowWeatherSettings(false);
                setShowRegionSettings(true);
              }}
            />
          ) : showCountrySettings ? (
            <CountrySettingsScreen
              onBack={() => {
                setShowCountrySettings(false);
                setShowHolidaySettings(true);
              }}
              selectedCountry={selectedCountry}
              onCountrySelect={setSelectedCountry}
            />
          ) : showColorSettings ? (
            <ColorSettingsScreen
              onBack={() => {
                setShowColorSettings(false);
                setShowHolidaySettings(true);
              }}
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          ) : showHolidaySettings ? (
            <HolidaySettingsScreen
              onBack={() => setShowHolidaySettings(false)}
              onOpenColorSettings={() => {
                setShowHolidaySettings(false);
                setShowColorSettings(true);
              }}
              onOpenCountrySettings={() => {
                setShowHolidaySettings(false);
                setShowCountrySettings(true);
              }}
            />
          ) : showTimezoneSettings ? (
            <TimezoneSelectionScreen
              onBack={() => setShowTimezoneSettings(false)}
              selectedTimezone={selectedTimezone}
              onTimezoneSelect={setSelectedTimezone}
            />
          ) : (
            <MainSettingsScreen
              onOpenHolidaySettings={() => setShowHolidaySettings(true)}
              onOpenTimezoneSettings={() => setShowTimezoneSettings(true)}
              onOpenWeatherSettings={() => setShowWeatherSettings(true)}
            />
          )}
        </View>
      </BaseBottomSheet>

      {/* 今日の予定ボトムシート */}
      <TodayScheduleSheet
        isVisible={showTodaySchedule}
        onClose={() => setShowTodaySchedule(false)}
      />
    </>
  );
};

const styles = {
  content: {
    flex: 1,
    paddingBottom: 34,
  },
};
