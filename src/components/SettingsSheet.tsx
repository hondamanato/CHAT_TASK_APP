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
import { useSettings } from '../contexts/SettingsContext';

interface SettingsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { selectedTimezone, setSelectedTimezone } = useSettings();
  const [showTodaySchedule, setShowTodaySchedule] = useState(false);
  const [showHolidaySettings, setShowHolidaySettings] = useState(false);
  const [showTimezoneSettings, setShowTimezoneSettings] = useState(false);

  return (
    <>
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.9}
        title={showHolidaySettings ? '祝日設定' : showTimezoneSettings ? 'タイムゾーン' : '設定'}
        showHandle={true}
        showCloseButton={true}
        showBackButton={showHolidaySettings || showTimezoneSettings}
        onBackPress={() => {
          setShowHolidaySettings(false);
          setShowTimezoneSettings(false);
        }}
      >
        
        <View style={styles.content}>
          {showHolidaySettings ? (
            <HolidaySettingsScreen onBack={() => setShowHolidaySettings(false)} />
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