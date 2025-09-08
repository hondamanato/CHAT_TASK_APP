import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface FallbackTimePickerProps {
  value: Date;
  onChange: (time: Date) => void;
  minuteInterval?: number;
}

export const FallbackTimePicker: React.FC<FallbackTimePickerProps> = ({
  value,
  onChange,
  minuteInterval = 5,
}) => {
  const [isPickerVisible, setPickerVisible] = useState(false);

  const showPicker = () => {
    setPickerVisible(true);
  };

  const hidePicker = () => {
    setPickerVisible(false);
  };

  const handleConfirm = (time: Date) => {
    onChange(time);
    hidePicker();
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.timeButton} onPress={showPicker}>
        <Text style={styles.timeText}>{formatTime(value)}</Text>
        <Text style={styles.tapText}>タップして時刻を変更</Text>
      </TouchableOpacity>
      
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode="time"
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        date={value}
        minuteInterval={minuteInterval}
        locale="ja_JP"
        confirmTextIOS="決定"
        cancelTextIOS="キャンセル"
        headerTextIOS="時刻を選択"
        pickerStyleIOS={{
          backgroundColor: '#ffffff',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  timeButton: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tapText: {
    fontSize: 14,
    color: '#666',
  },
});