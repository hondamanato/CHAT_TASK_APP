import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ArrowPathIcon, ChevronRightIcon, ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';

interface CustomRecurrencePickerProps {
  interval: number; // 繰り返し間隔
  unit: 'day' | 'week' | 'month' | 'year'; // 繰り返し単位
  selectedWeekdays?: number[]; // 選択された曜日 (0=日曜日, 1=月曜日, ...)
  eventDate?: string; // 作成しようとしているイベントの日付 (YYYY-MM-DD)
  monthlyOption?: 'same-date' | 'same-weekday'; // 月オプション
  onChange: (interval: number, unit: 'day' | 'week' | 'month' | 'year') => void;
  onWeekdaysChange?: (weekdays: number[]) => void;
  onMonthlyOptionChange?: (option: 'same-date' | 'same-weekday') => void; // 月オプション変更通知
  onPageChange?: (page: 'main' | 'weekdays') => void; // ページ変更通知
}

type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';

interface UnitInfo {
  label: string;
  maxValue: number; // その単位での最大値
}

const UNITS: Record<RecurrenceUnit, UnitInfo> = {
  day: { label: '日', maxValue: 30 },
  week: { label: '週', maxValue: 52 },
  month: { label: 'か月', maxValue: 12 },
  year: { label: '年', maxValue: 10 },
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const CustomRecurrencePicker: React.FC<CustomRecurrencePickerProps> = ({
  interval,
  unit,
  selectedWeekdays = [],
  eventDate,
  monthlyOption = 'same-date',
  onChange,
  onWeekdaysChange,
  onMonthlyOptionChange,
  onPageChange,
}) => {
  const { colors } = useTheme();
  const units = Object.keys(UNITS) as RecurrenceUnit[];
  const [currentInterval, setCurrentInterval] = useState(interval || 1);
  const [currentUnit, setCurrentUnit] = useState(unit || 'day');
  const [weekdays, setWeekdays] = useState<number[]>(selectedWeekdays);
  const [currentPage, setCurrentPage] = useState<'main' | 'weekdays'>('main');
  const [currentMonthlyOption, setCurrentMonthlyOption] = useState<'same-date' | 'same-weekday'>(monthlyOption);

  // 現在の単位に基づいて数値の選択肢を動的生成
  const intervals = Array.from({ length: UNITS[currentUnit].maxValue }, (_, i) => (i + 1));

  // 値変更時の処理
  const updateValue = (newInterval: number, newUnit: RecurrenceUnit) => {
    onChange(newInterval, newUnit);
  };

  // 単位変更時の処理（数値が範囲を超える場合の調整付き）
  const handleUnitChange = (newUnit: RecurrenceUnit) => {
    const maxValue = UNITS[newUnit].maxValue;
    const adjustedInterval = currentInterval > maxValue ? maxValue : currentInterval;

    setCurrentUnit(newUnit);
    setCurrentInterval(adjustedInterval);
    updateValue(adjustedInterval, newUnit);
  };

  // プレビューテキストを生成
  const getPreviewText = (interval: number, unit: RecurrenceUnit): string => {
    if (!interval || interval <= 0) return '1日ごと';

    return `${interval}${UNITS[unit].label}ごと`;
  };

  // イベント日の曜日を取得
  const getEventDayOfWeek = (): number => {
    if (!eventDate) return new Date().getDay();
    const date = new Date(eventDate + 'T00:00:00');
    return date.getDay();
  };

  // イベント日が月の第何曜日かを計算
  const getWeekOfMonth = (): { weekNumber: number; dayOfWeek: number; dayName: string } => {
    if (!eventDate) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = Math.ceil(today.getDate() / 7);
      return { weekNumber, dayOfWeek, dayName: WEEKDAYS[dayOfWeek] };
    }

    const date = new Date(eventDate + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const weekNumber = Math.ceil(date.getDate() / 7);

    return { weekNumber, dayOfWeek, dayName: WEEKDAYS[dayOfWeek] };
  };

  // 曜日表示テキストを生成
  const getWeekdaysText = (weekdays: number[]): string => {
    // 曜日が選択されていない場合は、イベント日の曜日を表示
    if (weekdays.length === 0) {
      const eventDayOfWeek = getEventDayOfWeek();
      return `${WEEKDAYS[eventDayOfWeek]}曜日`;
    }

    if (weekdays.length === 7) return '毎日';

    const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
    const weekdayNames = sortedWeekdays.map(day => WEEKDAYS[day]);

    if (weekdayNames.length <= 3) {
      return weekdayNames.join('、') + '曜日';
    } else {
      return `${weekdayNames.slice(0, 2).join('、')}など${weekdayNames.length}曜日`;
    }
  };

  // 曜日選択のハンドラー
  const handleWeekdayPress = () => {
    setCurrentPage('weekdays');
    onPageChange?.('weekdays');
  };

  // 曜日選択完了のハンドラー
  const handleWeekdaysChange = (newWeekdays: number[]) => {
    setWeekdays(newWeekdays);
    if (onWeekdaysChange) {
      onWeekdaysChange(newWeekdays);
    }
  };

  // 曜日を切り替える
  const toggleWeekday = (dayValue: number) => {
    const newSelection = weekdays.includes(dayValue)
      ? weekdays.filter(day => day !== dayValue)
      : [...weekdays, dayValue];

    setWeekdays(newSelection);
    handleWeekdaysChange(newSelection);
  };

  // 曜日選択ページから戻る
  const handleBackToMain = () => {
    setCurrentPage('main');
    onPageChange?.('main');
  };

  // プロップの値が変更された時の同期
  useEffect(() => {
    if (interval && unit) {
      setCurrentInterval(interval);
      setCurrentUnit(unit);
    }
  }, [interval, unit]);

  useEffect(() => {
    // 配列の内容が実際に変更された場合のみ更新
    if (JSON.stringify(selectedWeekdays) !== JSON.stringify(weekdays)) {
      setWeekdays(selectedWeekdays);
    }
  }, [selectedWeekdays]);

  useEffect(() => {
    // 月オプションの同期
    if (monthlyOption !== currentMonthlyOption) {
      setCurrentMonthlyOption(monthlyOption);
    }
  }, [monthlyOption]);

  // メインページの曜日一覧
  const WEEKDAY_LIST = [
    { label: '日曜日', value: 0 },
    { label: '月曜日', value: 1 },
    { label: '火曜日', value: 2 },
    { label: '水曜日', value: 3 },
    { label: '木曜日', value: 4 },
    { label: '金曜日', value: 5 },
    { label: '土曜日', value: 6 },
  ];

  if (currentPage === 'weekdays') {
    // 曜日選択ページ
    return (
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={[styles.weekdayHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.backButton}>
            <ChevronLeftIcon size={24} color={colors.buttonPrimary} />
            <Text style={[styles.backButtonText, { color: colors.buttonPrimary }]}>戻る</Text>
          </TouchableOpacity>
          <Text style={[styles.weekdayTitle, { color: colors.primaryText }]}>曜日を選択</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 曜日選択リスト */}
        <View style={styles.weekdayListContainer}>
          {WEEKDAY_LIST.map((weekday) => {
            const isSelected = weekdays.includes(weekday.value);
            return (
              <TouchableOpacity
                key={weekday.value}
                style={styles.weekdayListItem}
                onPress={() => toggleWeekday(weekday.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.weekdayListLabel, { color: colors.primaryText }]}>
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

        {/* 仕切り線 */}
        <View style={styles.separator} />
      </View>
    );
  }

  // メインページ
  return (
    <View style={styles.container}>
      {/* プレビュー */}
      <View style={styles.previewContainer}>
        <View style={styles.previewRow}>
          <View style={styles.iconContainer}>
            <ArrowPathIcon size={20} color="#000000" />
          </View>
          <Text style={styles.previewText}>
            {getPreviewText(currentInterval, currentUnit)}
          </Text>
        </View>
      </View>

      {/* ピッカー */}
      <View style={styles.pickerContainer}>
        {/* 数値ピッカー */}
        <View style={styles.intervalPickerContainer}>
          <Picker
            selectedValue={currentInterval}
            style={[
              styles.picker,
              Platform.OS === 'web' && styles.webPicker
            ]}
            onValueChange={(itemValue) => {
              setCurrentInterval(itemValue);
              updateValue(itemValue, currentUnit);
            }}
          >
            {intervals.map((intervalValue) => (
              <Picker.Item
                key={intervalValue}
                label={intervalValue.toString()}
                value={intervalValue}
              />
            ))}
          </Picker>
        </View>

        {/* 単位ピッカー */}
        <View style={styles.unitPickerContainer}>
          <Picker
            selectedValue={currentUnit}
            style={[
              styles.picker,
              Platform.OS === 'web' && styles.webPicker
            ]}
            onValueChange={(itemValue) => {
              handleUnitChange(itemValue);
            }}
          >
            {units.map((unitValue) => (
              <Picker.Item
                key={unitValue}
                label={UNITS[unitValue].label}
                value={unitValue}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* 週選択時の曜日設定 */}
      {currentUnit === 'week' && (
        <TouchableOpacity
          style={styles.weekdayOption}
          onPress={handleWeekdayPress}
          activeOpacity={0.7}
        >
          <Text style={styles.weekdayLabel}>
            {getWeekdaysText(weekdays)}
          </Text>
          <ChevronRightIcon size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      {/* 月選択時のオプション設定 */}
      {currentUnit === 'month' && (
        <View style={styles.monthlyOptionsContainer}>
          <TouchableOpacity
            style={styles.monthlyOption}
            onPress={() => {
              setCurrentMonthlyOption('same-date');
              onMonthlyOptionChange?.('same-date');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.monthlyOptionLabel, { color: colors.primaryText }]}>
              毎月同じ日
            </Text>
            <View style={[
              styles.checkbox,
              { borderColor: colors.border },
              currentMonthlyOption === 'same-date' && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }
            ]}>
              {currentMonthlyOption === 'same-date' && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthlyOption}
            onPress={() => {
              setCurrentMonthlyOption('same-weekday');
              onMonthlyOptionChange?.('same-weekday');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.monthlyOptionLabel, { color: colors.primaryText }]}>
              毎月第{getWeekOfMonth().weekNumber}{getWeekOfMonth().dayName}曜日
            </Text>
            <View style={[
              styles.checkbox,
              { borderColor: colors.border },
              currentMonthlyOption === 'same-weekday' && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }
            ]}>
              {currentMonthlyOption === 'same-weekday' && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* 仕切り線 */}
      <View style={styles.separator} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 0,
    paddingRight: 4,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 14,
  },
  previewText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1f2937',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'center',
  },
  intervalPickerContainer: {
    flex: 2,
    height: '100%',
  },
  unitPickerContainer: {
    flex: 3,
    height: '100%',
  },
  picker: {
    width: '100%',
    height: '100%',
  },
  webPicker: {
    height: 40,
    backgroundColor: '#f5f5f5',
  },
  weekdayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  weekdayLabel: {
    fontSize: 17,
    color: '#374151',
    fontWeight: '400',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: -20,
    marginTop: 20,
  },
  // 曜日選択ページのスタイル
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '400',
    marginLeft: 4,
  },
  weekdayTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  weekdayListContainer: {
    paddingTop: 16,
  },
  weekdayListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  weekdayListLabel: {
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
  // 月オプション選択のスタイル
  monthlyOptionsContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  monthlyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  monthlyOptionLabel: {
    fontSize: 17,
    fontWeight: '400',
  },
});