import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import {
  ChevronLeftIcon,
} from 'react-native-heroicons/outline';
import { BaseBottomSheet } from './BaseBottomSheet';
import { TodayScheduleSheet } from './TodayScheduleSheet';
import { MainSettingsScreen } from './MainSettingsScreen';
import { HolidaySettingsScreen } from './HolidaySettingsScreen';
import { TimezoneSelectionScreen } from './TimezoneSelectionScreen';
import { ColorSettingsScreen } from './ColorSettingsScreen';
import { CountrySettingsScreen } from './CountrySettingsScreen';
import { useSettings } from '../contexts/SettingsContext';
import { useHolidayContext } from '../contexts/HolidayContext';

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
  const [showTodaySchedule, setShowTodaySchedule] = useState(false);
  const [showHolidaySettings, setShowHolidaySettings] = useState(false);
  const [showTimezoneSettings, setShowTimezoneSettings] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showCountrySettings, setShowCountrySettings] = useState(false);

  return (
    <>
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.9}
        title={showHolidaySettings ? '祝日設定' : showTimezoneSettings ? 'タイムゾーン' : showColorSettings ? 'カラー選択' : showCountrySettings ? '国・地域選択' : '設定'}
        showHandle={true}
        showCloseButton={true}
        showBackButton={showHolidaySettings || showTimezoneSettings || showColorSettings || showCountrySettings}
        onBackPress={() => {
          if (showColorSettings) {
            setShowColorSettings(false);
            setShowHolidaySettings(true);
          } else if (showCountrySettings) {
            setShowCountrySettings(false);
            setShowHolidaySettings(true);
          } else {
            setShowHolidaySettings(false);
            setShowTimezoneSettings(false);
          }
        }}
      >
        
        <View style={styles.content}>
          {showCountrySettings ? (
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