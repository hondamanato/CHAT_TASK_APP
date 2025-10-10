import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ClockIcon,
  CalendarIcon,
  ChevronRightIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';
import { BaseBottomSheet } from './BaseBottomSheet';
import { useNotification } from '@/src/contexts/NotificationContext';

interface TodayScheduleSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const TodayScheduleSheet: React.FC<TodayScheduleSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { settings, updateSettings, scheduleTodayScheduleNotification } = useNotification();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [localTime, setLocalTime] = useState(new Date(2024, 0, 1, 8, 0));

  // 設定が読み込まれたときに初期値を設定
  useEffect(() => {
    if (settings.todaySchedule.notificationTime) {
      const [hours, minutes] = settings.todaySchedule.notificationTime.split(':').map(Number);
      const time = new Date(2024, 0, 1, hours, minutes);
      setLocalTime(time);
    }
  }, [settings.todaySchedule.notificationTime]);

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(2024, 0, 1, hours, minutes);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setLocalTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      await updateSettings({
        todaySchedule: {
          ...settings.todaySchedule,
          notificationTime: timeString,
        }
      });
      // 通知を再スケジュール
      await scheduleTodayScheduleNotification([]);
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    await updateSettings({
      todaySchedule: {
        ...settings.todaySchedule,
        enabled: value,
      }
    });
    // 通知を再スケジュール
    await scheduleTodayScheduleNotification([]);
  };

  const handleToggleNoSchedule = async (value: boolean) => {
    await updateSettings({
      todaySchedule: {
        ...settings.todaySchedule,
        noScheduleNotification: value,
      }
    });
    // 通知を再スケジュール
    await scheduleTodayScheduleNotification([]);
  };

  const handleToggleParticipatingOnly = async (value: boolean) => {
    await updateSettings({
      todaySchedule: {
        ...settings.todaySchedule,
        participatingOnly: value,
      }
    });
    // 通知を再スケジュール
    await scheduleTodayScheduleNotification([]);
  };

  return (
    <BaseBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      height={0.5}
      title="今日の予定設定"
      showHandle={true}
      showCloseButton={true}
    >
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 通知設定 */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <CalendarIcon size={20} color="#000000" />
              <Text style={styles.settingText}>今日の予定を通知</Text>
            </View>
            <Switch
              value={settings.todaySchedule.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <ExclamationTriangleIcon size={20} color="#000000" />
              <Text style={styles.settingText}>予定がない日も通知</Text>
            </View>
            <Switch
              value={settings.todaySchedule.noScheduleNotification}
              onValueChange={handleToggleNoSchedule}
              trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
              thumbColor="#ffffff"
              disabled={!settings.todaySchedule.enabled}
            />
          </View>
        </View>

        {/* フィルター設定 */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <UserGroupIcon size={20} color="#000000" />
              <Text style={styles.settingText}>参加予定のみ表示</Text>
            </View>
            <Switch
              value={settings.todaySchedule.participatingOnly}
              onValueChange={handleToggleParticipatingOnly}
              trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
              thumbColor="#ffffff"
              disabled={!settings.todaySchedule.enabled}
            />
          </View>
        </View>

        {/* 通知時刻設定 */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingItem, !settings.todaySchedule.enabled && styles.disabledItem]}
            onPress={() => !settings.todaySchedule.enabled ? null : setShowTimePicker(!showTimePicker)}
            disabled={!settings.todaySchedule.enabled}
          >
            <View style={styles.settingLeft}>
              <ClockIcon size={20} color={settings.todaySchedule.enabled ? "#000000" : "#9CA3AF"} />
              <Text style={[styles.settingText, !settings.todaySchedule.enabled && styles.disabledText]}>
                通知時刻
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.timeText, !settings.todaySchedule.enabled && styles.disabledText]}>
                {formatTime(settings.todaySchedule.notificationTime)}
              </Text>
              <ChevronRightIcon size={16} color={settings.todaySchedule.enabled ? "#9CA3AF" : "#D1D5DB"} />
            </View>
          </TouchableOpacity>

          {showTimePicker && (
            <View style={styles.timePickerContainer}>
              <DateTimePicker
                value={localTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                style={styles.timePicker}
              />
              
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>確認</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

      </ScrollView>
    </BaseBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
    minHeight: 52,
  },
  disabledItem: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 17,
    color: '#000000',
    marginLeft: 12,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  timeText: {
    fontSize: 17,
    color: '#8e8e93',
    marginRight: 8,
  },
  timePickerContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  timePicker: {
    height: 100,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});