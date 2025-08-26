import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface CustomReminderPickerProps {
  value: number; // 分単位
  onChange: (minutes: number) => void;
}

type Unit = 'minutes' | 'hours' | 'days' | 'weeks';

interface UnitInfo {
  label: string;
  multiplier: number; // 分への変換係数
  maxValue: number; // その単位での最大値
}

const UNITS: Record<Unit, UnitInfo> = {
  minutes: { label: '分', multiplier: 1, maxValue: 60 },
  hours: { label: '時間', multiplier: 60, maxValue: 24 },
  days: { label: '日', multiplier: 1440, maxValue: 28 },
  weeks: { label: '週', multiplier: 10080, maxValue: 28 },
};

export const CustomReminderPicker: React.FC<CustomReminderPickerProps> = ({
  value,
  onChange,
}) => {
  const units = Object.keys(UNITS) as Unit[];

  // 現在の値から数値と単位を計算
  const getValueAndUnit = (minutes: number): [number, Unit] => {
    if (!minutes || minutes <= 0) return [2, 'hours'];
    
    if (minutes % 10080 === 0 && minutes >= 10080) {
      const weeks = minutes / 10080;
      return [Math.min(weeks, UNITS.weeks.maxValue), 'weeks'];
    }
    if (minutes % 1440 === 0 && minutes >= 1440) {
      const days = minutes / 1440;
      return [Math.min(days, UNITS.days.maxValue), 'days'];
    }
    if (minutes % 60 === 0 && minutes >= 60) {
      const hours = minutes / 60;
      return [Math.min(hours, UNITS.hours.maxValue), 'hours'];
    }
    return [Math.min(minutes, UNITS.minutes.maxValue), 'minutes'];
  };

  const [selectedNumber, selectedUnit] = getValueAndUnit(value || 120);
  const [currentNumber, setCurrentNumber] = useState(selectedNumber);
  const [currentUnit, setCurrentUnit] = useState(selectedUnit);

  // 現在の単位に基づいて数値の選択肢を動的生成
  const numbers = Array.from({ length: UNITS[currentUnit].maxValue }, (_, i) => (i + 1));

  // 値変更時の処理
  const updateValue = (number: number, unit: Unit) => {
    const minutes = number * UNITS[unit].multiplier;
    onChange(minutes);
  };

  // 単位変更時の処理（数値が範囲を超える場合の調整付き）
  const handleUnitChange = (newUnit: Unit) => {
    const maxValue = UNITS[newUnit].maxValue;
    const adjustedNumber = currentNumber > maxValue ? maxValue : currentNumber;
    
    setCurrentUnit(newUnit);
    setCurrentNumber(adjustedNumber);
    updateValue(adjustedNumber, newUnit);
  };

  // プレビューテキストを生成
  const getPreviewText = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '2時間前';
    
    if (minutes % 10080 === 0 && minutes >= 10080) return `${minutes / 10080}週間前`;
    if (minutes % 1440 === 0 && minutes >= 1440) return `${minutes / 1440}日前`;
    if (minutes % 60 === 0 && minutes >= 60) return `${minutes / 60}時間前`;
    return `${minutes}分前`;
  };

  // プロップの値が変更された時の同期
  useEffect(() => {
    if (value) {
      const [newNumber, newUnit] = getValueAndUnit(value);
      setCurrentNumber(newNumber);
      setCurrentUnit(newUnit);
    }
  }, [value]);


  return (
    <View style={styles.container}>
      {/* プレビュー */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewText}>
          {getPreviewText(value || 120)}
        </Text>
      </View>

      {/* ピッカー */}
      <View style={styles.pickerContainer}>
        {/* 数値ピッカー */}
        <View style={styles.numberPickerContainer}>
          <Picker
            selectedValue={currentNumber}
            style={styles.picker}
            onValueChange={(itemValue) => {
              setCurrentNumber(itemValue);
              updateValue(itemValue, currentUnit);
            }}
          >
            {numbers.map((number) => (
              <Picker.Item 
                key={number}
                label={number.toString()} 
                value={number}
              />
            ))}
          </Picker>
        </View>

        {/* 単位ピッカー */}
        <View style={styles.unitPickerContainer}>
          <Picker
            selectedValue={currentUnit}
            style={styles.picker}
            onValueChange={(itemValue) => {
              handleUnitChange(itemValue);
            }}
          >
            {units.map((unit) => (
              <Picker.Item 
                key={unit}
                label={UNITS[unit].label} 
                value={unit}
              />
            ))}
          </Picker>
        </View>
      </View>
      
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
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
  },
  previewText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'center',
  },
  numberPickerContainer: {
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
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: -20,
    marginTop: 20,
  },
});