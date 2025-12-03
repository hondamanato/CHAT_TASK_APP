import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { UserIcon, SparklesIcon, XMarkIcon } from 'react-native-heroicons/outline';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useThemeColor';
import { useAuth } from '../contexts/AuthContext';
import { EventEntry } from '../services/hybridAIService';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date | undefined;
  imageUri?: string;
  type?: 'text' | 'editable_events';
  events?: EventEntry[];
  onEventsUpdate?: (events: EventEntry[]) => void;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { colors } = useTheme();
  const { profile } = useAuth();

  // イベント編集用のstate
  const [editableEvents, setEditableEvents] = useState<EventEntry[]>(message.events || []);
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<{index: number; type: 'start' | 'end'} | null>(null);

  // eventsが更新されたら、editableEventsも更新
  useEffect(() => {
    if (message.events) {
      setEditableEvents(message.events);
    }
  }, [message.events]);

  // イベントを削除
  const handleDeleteEvent = (index: number) => {
    const newEvents = editableEvents.filter((_, i) => i !== index);
    setEditableEvents(newEvents);
    if (message.onEventsUpdate) {
      message.onEventsUpdate(newEvents);
    }
  };

  // 日付を更新
  const handleDateChange = (index: number, event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      const newEvents = [...editableEvents];
      newEvents[index] = { ...newEvents[index], date: dateString };
      setEditableEvents(newEvents);
      if (message.onEventsUpdate) {
        message.onEventsUpdate(newEvents);
      }
    }
  };

  // 時刻を更新
  const handleTimeChange = (index: number, type: 'start' | 'end', event: any, selectedTime?: Date) => {
    setShowTimePicker(null);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      const newEvents = [...editableEvents];
      if (type === 'start') {
        newEvents[index] = { ...newEvents[index], startTime: timeString };
      } else {
        newEvents[index] = { ...newEvents[index], endTime: timeString };
      }
      setEditableEvents(newEvents);
      if (message.onEventsUpdate) {
        message.onEventsUpdate(newEvents);
      }
    }
  };

  // 日付文字列をDateオブジェクトに変換
  const parseDate = (dateString: string): Date => {
    return new Date(dateString);
  };

  // 時刻文字列をDateオブジェクトに変換
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

  const formatTime = (date: Date | string | undefined) => {
    if (!date) {
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      // 無効な日付の場合は現在時刻を使用
      if (isNaN(dateObj.getTime())) {
        return new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      return dateObj.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      // エラーが発生した場合は現在時刻を使用
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderIcon = () => {
    if (message.isUser) {
      if (profile?.profile_image_url) {
        return (
          <Image
            source={{
              uri: `${profile.profile_image_url}?t=${new Date(profile.updated_at).getTime()}`
            }}
            style={styles.avatar}
          />
        );
      }
      return (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.buttonPrimary }]}>
          <UserIcon size={16} color={colors.primaryBackground} />
        </View>
      );
    } else {
      return (
        <Image
          source={require('@/assets/images/mascot-chat.png')}
          style={styles.avatar}
          resizeMode="contain"
        />
      );
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={[
        styles.container,
        message.isUser ? styles.userContainer : styles.aiContainer
      ]}
    >
      <View style={[
        styles.messageRow,
        message.isUser ? styles.userMessageRow : styles.aiMessageRow
      ]}>
        {!message.isUser && (
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
        )}

        <View style={styles.messageContent}>
          <View
            style={[
              styles.bubble,
              message.isUser
                ? [styles.userBubble, { backgroundColor: colors.buttonPrimary }]
                : [styles.aiBubble, { backgroundColor: colors.secondaryBackground }]
            ]}
          >
            {message.imageUri && (
              <Image
                source={{ uri: message.imageUri }}
                style={styles.image}
                resizeMode="contain"
              />
            )}

            {/* 通常のテキストメッセージ */}
            {message.type !== 'editable_events' && (
              <Text
                style={[
                  styles.text,
                  message.isUser
                    ? [styles.userText, { color: colors.primaryBackground }]
                    : [styles.aiText, { color: colors.primaryText }]
                ]}
              >
                {message.text}
              </Text>
            )}

            {/* 編集可能なイベントリスト */}
            {message.type === 'editable_events' && (
              <View>
                {/* ヘッダーテキスト */}
                <Text style={[styles.text, styles.aiText, { color: colors.primaryText, marginBottom: 8 }]}>
                  {message.text}
                </Text>

                {/* イベントリスト */}
                {editableEvents.map((event, index) => (
                  <View key={index} style={styles.eventItem}>
                    <View style={styles.eventContent}>
                      {/* イベント番号 */}
                      <Text style={[styles.eventNumber, { color: colors.primaryText }]}>
                        {index + 1}.{' '}
                      </Text>

                      {/* 日付 - タップ可能 */}
                      <TouchableOpacity onPress={() => setShowDatePicker(index)}>
                        <Text style={[styles.eventDate, { color: colors.primaryText }]}>
                          {event.date.slice(5)} ({getWeekday(event.date)})
                        </Text>
                      </TouchableOpacity>

                      <Text style={[styles.eventText, { color: colors.primaryText }]}> </Text>

                      {/* 開始時刻 - タップ可能 */}
                      <TouchableOpacity onPress={() => setShowTimePicker({index, type: 'start'})}>
                        <Text style={[styles.eventTime, { color: colors.primaryText }]}>
                          {event.startTime}
                        </Text>
                      </TouchableOpacity>

                      <Text style={[styles.eventText, { color: colors.primaryText }]}>-</Text>

                      {/* 終了時刻 - タップ可能 */}
                      <TouchableOpacity onPress={() => setShowTimePicker({index, type: 'end'})}>
                        <Text style={[styles.eventTime, { color: colors.primaryText }]}>
                          {event.endTime}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 削除ボタン */}
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(index)}
                      style={styles.deleteButton}
                    >
                      <XMarkIcon size={18} color="#FF3B30" strokeWidth={2.5} />
                    </TouchableOpacity>

                  </View>
                ))}
              </View>
            )}
          </View>
          <Text style={[
            styles.timestamp,
            { color: colors.secondaryText },
            message.isUser ? styles.userTimestamp : styles.aiTimestamp
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>

        {message.isUser && (
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
        )}
      </View>

      {/* DateTimePicker Modal for Date */}
      {showDatePicker !== null && (
        <Modal
          visible={showDatePicker !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(null)}
          >
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                  <Text style={styles.pickerHeaderButton}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={styles.pickerHeaderTitle}>日付を選択</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                  <Text style={[styles.pickerHeaderButton, styles.pickerHeaderButtonDone]}>完了</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showDatePicker !== null && editableEvents[showDatePicker] ? parseDate(editableEvents[showDatePicker].date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, date) => {
                  if (showDatePicker !== null) {
                    handleDateChange(showDatePicker, e, date);
                  }
                }}
                style={styles.picker}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* DateTimePicker Modal for Time */}
      {showTimePicker !== null && (
        <Modal
          visible={showTimePicker !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimePicker(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTimePicker(null)}
          >
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                  <Text style={styles.pickerHeaderButton}>キャンセル</Text>
                </TouchableOpacity>
                <Text style={styles.pickerHeaderTitle}>
                  {showTimePicker?.type === 'start' ? '開始時刻' : '終了時刻'}を選択
                </Text>
                <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                  <Text style={[styles.pickerHeaderButton, styles.pickerHeaderButtonDone]}>完了</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showTimePicker !== null && showTimePicker.index !== undefined && editableEvents[showTimePicker.index]
                  ? parseTime(showTimePicker.type === 'start' ? editableEvents[showTimePicker.index].startTime : editableEvents[showTimePicker.index].endTime)
                  : new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, time) => {
                  if (showTimePicker !== null) {
                    handleTimeChange(showTimePicker.index, showTimePicker.type, e, time);
                  }
                }}
                style={styles.picker}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  iconContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
  },
  messageContent: {
    maxWidth: '80%',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  userTimestamp: {
    textAlign: 'right',
  },
  aiTimestamp: {
    textAlign: 'left',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'nowrap',
  },
  eventNumber: {
    fontSize: 15,
    fontWeight: '500',
  },
  eventDate: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  eventTime: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  eventText: {
    fontSize: 15,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
  },
  pickerHeaderButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  pickerHeaderButtonDone: {
    fontWeight: '600',
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  picker: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
});

export default ChatMessage;