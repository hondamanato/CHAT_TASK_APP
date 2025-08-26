import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimePickerComponentProps {
  value: Date;
  onChange: (time: Date) => void;
  minuteInterval?: number;
}

export const TimePickerComponent: React.FC<TimePickerComponentProps> = ({
  value,
  onChange,
  minuteInterval = 5,
}) => {
  // DateTimePickerの値変更処理
  const handleDateTimeChange = (_: any, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  // 入力値の検証
  const validatedValue = (value && value instanceof Date && !isNaN(value.getTime())) 
    ? value 
    : new Date();

  return (
    <View style={styles.container}>
      <DateTimePicker
        value={validatedValue}
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleDateTimeChange}
        style={styles.dateTimePicker}
        minuteInterval={minuteInterval as any}
        locale="ja_JP"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
  },
  dateTimePicker: {
    width: '100%',
    height: 180,
  },
});