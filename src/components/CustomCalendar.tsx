import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar as RNCalendar, CalendarProps } from 'react-native-calendars';
import { ViewMode } from '../types';

interface CustomCalendarProps {
  viewMode: ViewMode;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  markedDates?: CalendarProps['markedDates'];
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  viewMode,
  selectedDate,
  onDateSelect,
  markedDates = {},
}) => {
  const handleDayPress = (day: any) => {
    onDateSelect(day.dateString);
  };

  const getCalendarTheme = () => ({
    backgroundColor: '#ffffff',
    calendarBackground: '#ffffff',
    textSectionTitleColor: '#b6c1cd',
    selectedDayBackgroundColor: '#007AFF',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#007AFF',
    dayTextColor: '#2d4150',
    textDisabledColor: '#d9e1e8',
    arrowColor: '#007AFF',
    monthTextColor: '#2d4150',
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontWeight: '300',
    textMonthFontWeight: 'bold',
    textDayHeaderFontWeight: '300',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
  });

  return (
    <View style={styles.container}>
      <RNCalendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            selected: true,
            disableTouchEvent: false,
            selectedColor: '#007AFF',
            ...markedDates[selectedDate],
          },
        }}
        theme={getCalendarTheme()}
        firstDay={0} // 日曜日から開始
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
});