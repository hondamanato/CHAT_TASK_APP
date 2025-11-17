import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { EventEntry } from '../services/hybridAIService';

interface EditableEventListModalProps {
  visible: boolean;
  events: EventEntry[];
  onConfirm: (editedEvents: EventEntry[]) => void;
  onCancel: () => void;
}

export const EditableEventListModal: React.FC<EditableEventListModalProps> = ({
  visible,
  events,
  onConfirm,
  onCancel,
}) => {
  const [editedEvents, setEditedEvents] = useState<EventEntry[]>(events);
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState<number | null>(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState<number | null>(null);

  // events propsが変更されたら、editedEventsを更新
  useEffect(() => {
    setEditedEvents(events);
  }, [events]);

  // イベントを削除
  const handleDeleteEvent = (index: number) => {
    const newEvents = editedEvents.filter((_, i) => i !== index);
    setEditedEvents(newEvents);
  };

  // イベントのフィールドを更新
  const updateEventField = (index: number, field: keyof EventEntry, value: any) => {
    const newEvents = [...editedEvents];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEditedEvents(newEvents);
  };

  // 日付変更
  const handleDateChange = (index: number, event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      updateEventField(index, 'date', dateString);
    }
  };

  // 開始時刻変更
  const handleStartTimeChange = (index: number, event: any, selectedTime?: Date) => {
    setShowStartTimePicker(null);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateEventField(index, 'startTime', timeString);
    }
  };

  // 終了時刻変更
  const handleEndTimeChange = (index: number, event: any, selectedTime?: Date) => {
    setShowEndTimePicker(null);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateEventField(index, 'endTime', timeString);
    }
  };

  // 日付文字列をDateオブジェクトに変換
  const parseDate = (dateString: string): Date => {
    return new Date(dateString);
  };

  // 時刻文字列をDateオブジェクトに変換（今日の日付と組み合わせ）
  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // 曜日を取得
  const getWeekday = (dateString: string): string => {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>予定の確認と編集</Text>
            <Text style={styles.headerSubtitle}>
              {editedEvents.length}件のイベント
            </Text>
          </View>

          <ScrollView style={styles.eventList}>
            {editedEvents.map((event, index) => (
              <View key={index} style={styles.eventCard}>
                {/* 削除ボタン */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteEvent(index)}
                >
                  <XMarkIcon size={20} color="#FF3B30" />
                </TouchableOpacity>

                {/* 日付 */}
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(index)}
                >
                  <Text style={styles.label}>日付</Text>
                  <Text style={styles.dateTimeText}>
                    {event.date} ({getWeekday(event.date)})
                  </Text>
                </TouchableOpacity>

                {/* 開始時刻 */}
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.timeButton]}
                    onPress={() => setShowStartTimePicker(index)}
                  >
                    <Text style={styles.label}>開始</Text>
                    <Text style={styles.dateTimeText}>{event.startTime}</Text>
                  </TouchableOpacity>

                  <Text style={styles.timeSeparator}>〜</Text>

                  {/* 終了時刻 */}
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.timeButton]}
                    onPress={() => setShowEndTimePicker(index)}
                  >
                    <Text style={styles.label}>終了</Text>
                    <Text style={styles.dateTimeText}>{event.endTime}</Text>
                  </TouchableOpacity>
                </View>

                {/* タイトル */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>タイトル</Text>
                  <TextInput
                    style={styles.textInput}
                    value={event.title}
                    onChangeText={(text) => updateEventField(index, 'title', text)}
                    placeholder="タイトルを入力"
                  />
                </View>

                {/* 場所 */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>場所</Text>
                  <TextInput
                    style={styles.textInput}
                    value={event.location || ''}
                    onChangeText={(text) => updateEventField(index, 'location', text)}
                    placeholder="場所を入力（任意）"
                  />
                </View>

                {/* DateTimePicker for Date */}
                {showDatePicker === index && (
                  <DateTimePicker
                    value={parseDate(event.date)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, date) => handleDateChange(index, e, date)}
                  />
                )}

                {/* DateTimePicker for Start Time */}
                {showStartTimePicker === index && (
                  <DateTimePicker
                    value={parseTime(event.startTime)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, time) => handleStartTimeChange(index, e, time)}
                  />
                )}

                {/* DateTimePicker for End Time */}
                {showEndTimePicker === index && (
                  <DateTimePicker
                    value={parseTime(event.endTime)}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(e, time) => handleEndTimeChange(index, e, time)}
                  />
                )}
              </View>
            ))}
          </ScrollView>

          {/* ボタン */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => onConfirm(editedEvents)}
              disabled={editedEvents.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                カレンダーに追加 ({editedEvents.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  eventList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  dateTimeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeButton: {
    flex: 1,
    marginBottom: 0,
  },
  timeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#8E8E93',
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
