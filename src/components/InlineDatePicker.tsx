import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';

interface InlineDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

export const InlineDatePicker: React.FC<InlineDatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
}) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <Calendar
        current={value}
        onDayPress={(day) => {
          onChange(day.dateString);
        }}
        markedDates={{
          [value]: {
            selected: true,
            selectedColor: '#007AFF',
            selectedTextColor: '#FFFFFF',
          },
          [today]: value !== today ? {
            marked: true,
            dotColor: '#007AFF',
          } : undefined,
        }}
        minDate={minDate}
        maxDate={maxDate}
        enableSwipeMonths={true}
        hideExtraDays={true}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#8e8e93',
          selectedDayBackgroundColor: '#007AFF',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#007AFF',
          dayTextColor: '#000000',
          textDisabledColor: '#c0c0c0',
          dotColor: '#007AFF',
          selectedDotColor: '#ffffff',
          arrowColor: '#007AFF',
          disabledArrowColor: '#d9d9d9',
          monthTextColor: '#000000',
          indicatorColor: '#007AFF',
          textDayFontWeight: '400',
          textMonthFontWeight: '600',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
        style={styles.calendar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendar: {
    borderRadius: 8,
  },
});