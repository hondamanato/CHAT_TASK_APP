import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface RecurrenceEndConditionProps {
  endConditionType: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
  onChange: (type: 'never' | 'date' | 'count', endDate?: string, endCount?: number) => void;
}

export const RecurrenceEndCondition: React.FC<RecurrenceEndConditionProps> = ({
  endConditionType,
  endDate,
  endCount,
  onChange,
}) => {
  const [selectedType, setSelectedType] = useState(endConditionType);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    endDate ? new Date(endDate) : new Date()
  );
  const [tempCount, setTempCount] = useState(endCount?.toString() || '10');

  const handleTypeChange = (type: 'never' | 'date' | 'count') => {
    setSelectedType(type);
    if (type === 'date') {
      setShowDatePicker(true);
    } else if (type === 'count') {
      onChange(type, undefined, parseInt(tempCount) || 10);
    } else {
      setShowDatePicker(false);
      onChange(type, undefined, undefined);
    }
  };

  const handleDateConfirm = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    onChange('date', date.toISOString().split('T')[0], undefined);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  return (
    <View style={styles.container}>
      {/* 期限なしで繰り返す */}
      <TouchableOpacity
        style={styles.option}
        onPress={() => handleTypeChange('never')}
      >
        <View style={styles.iconSpacer} />
        <Text style={styles.optionText}>期限なしで繰り返す</Text>
        {selectedType === 'never' && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 指定した日付 */}
      <TouchableOpacity
        style={styles.option}
        onPress={() => handleTypeChange('date')}
      >
        <View style={styles.iconSpacer} />
        <View style={styles.optionContent}>
          <Text style={styles.optionText}>指定した日付</Text>
          {selectedType === 'date' && (
            <Text style={styles.selectedDateText}>
              {formatDate(selectedDate)}
            </Text>
          )}
        </View>
        {selectedType === 'date' && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 日付ピッカーモーダル */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        date={selectedDate}
        minimumDate={new Date()}
        locale="ja_JP"
      />

      {/* 指定した回数を繰り返した後 */}
      <TouchableOpacity
        style={styles.option}
        onPress={() => handleTypeChange('count')}
      >
        <View style={styles.iconSpacer} />
        <View style={styles.optionContent}>
          <Text style={styles.optionText}>指定した回数を繰り返した後</Text>
          {selectedType === 'count' && (
            <View style={styles.countInputContainer}>
              <TextInput
                style={styles.countInput}
                value={tempCount}
                onChangeText={(text) => {
                  setTempCount(text);
                  const count = parseInt(text) || 10;
                  onChange('count', undefined, count);
                }}
                keyboardType="numeric"
                placeholder="10"
                maxLength={3}
              />
              <Text style={styles.countLabel}>回</Text>
            </View>
          )}
        </View>
        {selectedType === 'count' && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  iconSpacer: {
    width: 36,
  },
  icon: {
    fontSize: 16,
    color: '#6b7280',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 17,
    color: '#1f2937',
  },
  selectedDateText: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
  },
  checkmark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
  countInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  countInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minWidth: 60,
    textAlign: 'center',
  },
  countLabel: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
  },
});