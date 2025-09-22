import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BaseBottomSheet } from './BaseBottomSheet';
import { useTheme } from '@/hooks/useThemeColor';

interface WeekdaySelectorProps {
  isVisible: boolean;
  onClose: () => void;
  selectedWeekdays: number[];
  onWeekdaysChange: (weekdays: number[]) => void;
}

const WEEKDAYS = [
  { label: '日曜日', value: 0 },
  { label: '月曜日', value: 1 },
  { label: '火曜日', value: 2 },
  { label: '水曜日', value: 3 },
  { label: '木曜日', value: 4 },
  { label: '金曜日', value: 5 },
  { label: '土曜日', value: 6 },
];

export const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({
  isVisible,
  onClose,
  selectedWeekdays,
  onWeekdaysChange,
}) => {
  const { colors } = useTheme();
  const [localSelectedDays, setLocalSelectedDays] = useState<number[]>(selectedWeekdays);

  useEffect(() => {
    setLocalSelectedDays(selectedWeekdays);
  }, [selectedWeekdays]);

  const toggleWeekday = (dayValue: number) => {
    const newSelection = localSelectedDays.includes(dayValue)
      ? localSelectedDays.filter(day => day !== dayValue)
      : [...localSelectedDays, dayValue];

    setLocalSelectedDays(newSelection);
  };

  const handleDone = () => {
    onWeekdaysChange(localSelectedDays);
    onClose();
  };

  const handleSelectAll = () => {
    const allDays = WEEKDAYS.map(day => day.value);
    setLocalSelectedDays(allDays);
  };

  const handleClearAll = () => {
    setLocalSelectedDays([]);
  };

  return (
    <BaseBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      height={0.6}
      showHandle={true}
      showCloseButton={false}
    >
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.cancelButton, { color: colors.buttonPrimary }]}>
            キャンセル
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primaryText }]}>
          曜日を選択
        </Text>
        <TouchableOpacity onPress={handleDone}>
          <Text style={[styles.doneButton, { color: colors.buttonPrimary }]}>
            完了
          </Text>
        </TouchableOpacity>
      </View>

      {/* クイック選択ボタン */}
      <View style={styles.quickButtonsContainer}>
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: colors.surfaceBackground, borderColor: colors.border }]}
          onPress={handleSelectAll}
        >
          <Text style={[styles.quickButtonText, { color: colors.primaryText }]}>
            すべて選択
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: colors.surfaceBackground, borderColor: colors.border }]}
          onPress={handleClearAll}
        >
          <Text style={[styles.quickButtonText, { color: colors.primaryText }]}>
            すべて解除
          </Text>
        </TouchableOpacity>
      </View>

      {/* 曜日選択リスト */}
      <View style={styles.weekdayList}>
        {WEEKDAYS.map((weekday) => {
          const isSelected = localSelectedDays.includes(weekday.value);
          return (
            <TouchableOpacity
              key={weekday.value}
              style={[
                styles.weekdayItem,
                { backgroundColor: colors.primaryBackground }
              ]}
              onPress={() => toggleWeekday(weekday.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekdayLabel, { color: colors.primaryText }]}>
                {weekday.label}
              </Text>
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }
              ]}>
                {isSelected && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </BaseBottomSheet>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 17,
    fontWeight: '400',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  quickButtonsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 12,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  weekdayList: {
    flex: 1,
  },
  weekdayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    fontSize: 17,
    fontWeight: '400',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});