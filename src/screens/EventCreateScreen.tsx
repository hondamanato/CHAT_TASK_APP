import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { TimePickerComponent } from '../components/TimePickerComponent';
import { InlineDatePicker } from '../components/InlineDatePicker';
import { LocationSearchScreen } from '../components/LocationSearchScreen';
import { CustomReminderPicker } from '../components/CustomReminderPicker';
import { CustomRecurrencePicker } from '../components/CustomRecurrencePicker';
import { RecurrenceEndCondition } from '../components/RecurrenceEndCondition';
import { RecurringEventDeleteSheet, DeleteOption } from '../components/RecurringEventDeleteSheet';
import { TimezoneSelectionScreen } from '../components/TimezoneSelectionScreen';
import {
  PencilIcon,
  ClockIcon,
  MapPinIcon,
  DocumentTextIcon,
  SwatchIcon,
  BellIcon,
  ChevronUpDownIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
} from 'react-native-heroicons/outline';

import { RecurrenceSettings, EventCreateData } from '../types/recurrence';
import timezoneData from '../data/timezones.json';

interface EventCreateScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (event: EventCreateData) => void;
  onDelete?: (eventId: string) => void;
  onDeleteRecurringSeries?: (seriesId: string) => void;
  onDeleteRecurringFuture?: (eventId: string) => void;
  initialDate?: string;
  editingEvent?: any;
  existingEvents?: any[];
  onScrollChange?: (isAtTop: boolean) => void;
}

export const EventCreateScreen: React.FC<EventCreateScreenProps> = ({
  isVisible,
  onClose,
  onSave,
  onDelete,
  onDeleteRecurringSeries,
  onDeleteRecurringFuture,
  initialDate,
  editingEvent,
  existingEvents = [],
  onScrollChange,
}) => {
  const [title, setTitle] = useState('');
  const initialDateStr = initialDate || new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(initialDateStr);
  const [endDate, setEndDate] = useState(initialDateStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState<{ name: string; address?: string }>({ name: '' });
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [reminders, setReminders] = useState<number[]>([]);
  const [editingReminderIndex, setEditingReminderIndex] = useState<number | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);
  // ピッカー表示状態
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showCustomReminder, setShowCustomReminder] = useState(false);
  const [customReminderMinutes, setCustomReminderMinutes] = useState(120); // デフォルト2時間
  const [showDetailOptions, setShowDetailOptions] = useState(false);
  const [timezone, setTimezone] = useState('日本標準時');
  const [repeatOption, setRepeatOption] = useState('繰り返さない');
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [repeatButtonPosition, setRepeatButtonPosition] = useState<{x: number, y: number, height: number} | null>(null);
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [customRecurrenceInterval, setCustomRecurrenceInterval] = useState(1);
  const [customRecurrenceUnit, setCustomRecurrenceUnit] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [hasEndCondition, setHasEndCondition] = useState(false);
  const [showEndCondition, setShowEndCondition] = useState(false);
  const [endConditionType, setEndConditionType] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | undefined>(undefined);
  const [recurrenceEndCount, setRecurrenceEndCount] = useState<number | undefined>(undefined);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [customRecurrencePage, setCustomRecurrencePage] = useState<'main' | 'weekdays'>('main');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [monthlyOption, setMonthlyOption] = useState<'same-date' | 'same-weekday'>('same-date');
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false);

  // タイムゾーンIDから表示名を取得
  const getTimezoneDisplayName = (timezoneId: string): string => {
    const timezone = timezoneData.timezones.find(tz => tz.id === timezoneId);
    if (timezone) {
      return `${timezone.country}標準時`;
    }
    return timezoneId;
  };

  // 編集モード時にフォームにデータを設定
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || '');
      setStartDate(editingEvent.start ? editingEvent.start.toISOString().split('T')[0] : initialDateStr);
      setEndDate(editingEvent.end ? editingEvent.end.toISOString().split('T')[0] : initialDateStr);
      
      if (editingEvent.start) {
        const hours = editingEvent.start.getHours().toString().padStart(2, '0');
        const minutes = editingEvent.start.getMinutes().toString().padStart(2, '0');
        setStartTime(`${hours}:${minutes}`);
      }
      
      if (editingEvent.end) {
        const hours = editingEvent.end.getHours().toString().padStart(2, '0');
        const minutes = editingEvent.end.getMinutes().toString().padStart(2, '0');
        setEndTime(`${hours}:${minutes}`);
      }
      
      setLocation({ name: editingEvent.location?.name || '' });
      setNotes(editingEvent.notes || '');
      setColor(editingEvent.color || '#3b82f6');
      setReminders(editingEvent.reminders || []);
      setIsAllDay(editingEvent.isAllDay || false);
      setTimezone(editingEvent.timezone || '日本標準時'); // タイムゾーン情報を復元

      // 繰り返し設定を復元
      if (editingEvent.recurrence) {
        const recurrence = editingEvent.recurrence;

        // 繰り返しタイプに応じて表示設定
        if (recurrence.type === 'daily') {
          setRepeatOption('毎日');
        } else if (recurrence.type === 'weekly') {
          setRepeatOption('毎週');
        } else if (recurrence.type === 'monthly') {
          setRepeatOption('毎月');
        } else if (recurrence.type === 'yearly') {
          setRepeatOption('毎年');
        } else if (recurrence.type === 'custom') {
          // カスタム設定の場合
          const intervalText = recurrence.interval === 1 ? '' : recurrence.interval;
          const unitMap = { day: '日', week: '週', month: 'か月', year: '年' };
          const customText = `${intervalText}${unitMap[recurrence.unit || 'day']}ごと`;
          setRepeatOption(customText);
          setCustomRecurrenceInterval(recurrence.interval || 1);
          setCustomRecurrenceUnit(recurrence.unit || 'day');
        }

        // 曜日選択を復元
        if (recurrence.weekdays) {
          setSelectedWeekdays(recurrence.weekdays);
        }

        // 月オプションを復元
        if (recurrence.monthlyOption) {
          setMonthlyOption(recurrence.monthlyOption);
        }

        // 終了条件を復元
        setEndConditionType(recurrence.endCondition || 'never');
        if (recurrence.endDate) {
          setRecurrenceEndDate(recurrence.endDate);
          setHasEndCondition(true);
        }
        if (recurrence.endCount) {
          setRecurrenceEndCount(recurrence.endCount);
          setHasEndCondition(true);
        }
      } else {
        setRepeatOption('繰り返さない');
      }
    } else {
      // 新規作成時はフォームをリセット
      setTitle('');
      setStartDate(initialDateStr);
      setEndDate(initialDateStr);
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation({ name: '' });
      setNotes('');
      setColor('#3b82f6');
      setReminders([]);
      setIsAllDay(false);
      setRepeatOption('繰り返さない');
      setCustomRecurrenceInterval(1);
      setCustomRecurrenceUnit('day');
      setHasEndCondition(false);
      setEndConditionType('never');
      setRecurrenceEndDate(undefined);
      setRecurrenceEndCount(undefined);
    }
  }, [editingEvent, initialDateStr]);

  const handleSave = () => {
    // バリデーション
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    // 終日でない場合の時刻バリデーション
    if (!isAllDay) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      if (endDateTime <= startDateTime) {
        alert('終了時刻は開始時刻より後に設定してください');
        return;
      }
    }

    // 繰り返し設定を構築
    const getRecurrenceSettings = (): RecurrenceSettings => {
      if (repeatOption === '繰り返さない') {
        return {
          type: 'none',
          endCondition: 'never'
        };
      }

      let type: RecurrenceSettings['type'] = 'none';
      let interval = 1;
      let unit: 'day' | 'week' | 'month' | 'year' | undefined;

      switch (repeatOption) {
        case '毎日':
          type = 'daily';
          interval = 1;
          unit = 'day';
          break;
        case '毎週':
          type = 'weekly';
          interval = 1;
          unit = 'week';
          break;
        case '毎月':
          type = 'monthly';
          interval = 1;
          unit = 'month';
          break;
        case '毎年':
          type = 'yearly';
          interval = 1;
          unit = 'year';
          break;
        default:
          // カスタム設定
          type = 'custom';
          interval = customRecurrenceInterval;
          unit = customRecurrenceUnit;
          break;
      }

      const settings: RecurrenceSettings = {
        type,
        interval,
        unit,
        endCondition: endConditionType,
        endDate: recurrenceEndDate,
        endCount: recurrenceEndCount
      };

      // 週の繰り返し時に曜日情報を追加
      if ((type === 'weekly' || (type === 'custom' && unit === 'week')) && selectedWeekdays.length > 0) {
        settings.weekdays = selectedWeekdays;
      }

      // 月の繰り返し時にオプション情報を追加
      if ((type === 'monthly' || (type === 'custom' && unit === 'month'))) {
        settings.monthlyOption = monthlyOption;
      }

      return settings;
    };

    const event: EventCreateData = {
      title: title.trim(),
      date: startDate, // 開始日を基準とする
      endDate: startDate !== endDate ? endDate : undefined, // 複数日の場合のみ設定
      startTime,
      endTime,
      location: location.name.trim() ? { name: location.name.trim() } : { name: '' },
      notes: notes.trim() || '',
      color,
      reminders,
      isAllDay,
      recurrence: getRecurrenceSettings(),
      timezone: timezone !== '日本標準時' ? timezone : undefined, // デフォルト以外の場合のみ保存
    };

    onSave(event);
    onClose();
  };

  // 削除オプションハンドラー
  const handleDeleteOption = (option: DeleteOption) => {
    if (!editingEvent) return;

    switch (option) {
      case 'single':
        // この予定のみ削除
        if (onDelete) {
          onDelete(editingEvent.id);
          onClose();
        }
        break;

      case 'future':
        // これ以降の予定を削除
        if (onDeleteRecurringFuture) {
          onDeleteRecurringFuture(editingEvent.id);
          onClose();
        }
        break;

      case 'all':
        // すべての予定を削除
        if (onDeleteRecurringSeries) {
          // recurrence_series_idがある場合はそれを使用、ない場合はeventIdを使用
          const seriesId = editingEvent.recurrence_series_id || editingEvent.id;
          onDeleteRecurringSeries(seriesId);
          onClose();
        }
        break;

      case 'cancel':
        // キャンセル - 何もしない
        break;
    }
  };

  const formatTime = (time: string) => {
    return time;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = days[date.getDay()];
    return `${date.getMonth() + 1}月${date.getDate()}日(${dayOfWeek})`;
  };

  const formatReminderTime = (minutes: number | undefined) => {
    if (!minutes) return '通知を追加';
    if (minutes === 10) return '10分前';
    if (minutes === 60) return '1時間前';
    if (minutes === 1440) return '1日前';
    
    // カスタム値の表示
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days}日前`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}時間前`;
    } else {
      return `${minutes}分前`;
    }
  };

  // 日付選択ハンドラー
  const handleStartDateSelect = (selectedDate: string) => {
    setStartDate(selectedDate);
  };

  const handleEndDateSelect = (selectedDate: string) => {
    setEndDate(selectedDate);
  };

  // 時刻更新ハンドラー（エラーハンドリング付き）
  const handleStartTimeChange = (time: Date) => {
    try {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setStartTime(timeString);
    } catch (error) {
      console.error('Start time change error:', error);
    }
  };
  
  const handleEndTimeChange = (time: Date) => {
    try {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setEndTime(timeString);
    } catch (error) {
      console.error('End time change error:', error);
    }
  };
  
  // 時刻文字列からDateオブジェクトを生成（エラーハンドリング付き）
  const getDateFromTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        // デフォルト時刻にフォールバック
        const defaultDate = new Date();
        defaultDate.setHours(9, 0, 0, 0);
        return defaultDate;
      }
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (error) {
      console.error('Date conversion error:', error);
      const defaultDate = new Date();
      defaultDate.setHours(9, 0, 0, 0);
      return defaultDate;
    }
  };

  // 日付ピッカーの表示切り替え
  const toggleStartDatePicker = () => {
    setShowEndDatePicker(false); // 他のピッカーを閉じる
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowStartDatePicker(!showStartDatePicker);
  };

  const toggleEndDatePicker = () => {
    setShowStartDatePicker(false); // 他のピッカーを閉じる
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowEndDatePicker(!showEndDatePicker);
  };

  // 時刻ピッカーの表示切り替え
  const toggleStartTimePicker = () => {
    setShowStartDatePicker(false); // 他のピッカーを閉じる
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setShowStartTimePicker(!showStartTimePicker);
  };
  
  const toggleEndTimePicker = () => {
    setShowStartDatePicker(false); // 他のピッカーを閉じる
    setShowEndDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(!showEndTimePicker);
  };

  // 場所検索の表示切り替え
  const openLocationSearch = () => {
    setShowStartDatePicker(false); // 他のピッカーを閉じる
    setShowEndDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowLocationSearch(true);
  };

  const handleLocationSelect = (selectedLocation: string, address?: string) => {
    setLocation({ name: selectedLocation, address });
    setShowLocationSearch(false);
  };

  // カスタム通知モーダルとカスタム繰り返しモーダルの表示状態に応じてボトムシートのスワイプを制御
  useEffect(() => {
    if (showCustomReminder || showCustomRecurrence || showEndCondition) {
      // モーダル表示時はスワイプ無効化
      onScrollChange?.(false);
    } else {
      // モーダル非表示時はスワイプ再有効化
      onScrollChange?.(true);
    }
  }, [showCustomReminder, showCustomRecurrence, showEndCondition, onScrollChange]);

  if (!isVisible) {
    return null;
  }

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const isAtTop = scrollY <= 0;
    // モーダルが表示中はスワイプを無効化
    if (!showCustomReminder && !showCustomRecurrence && !showEndCondition) {
      onScrollChange?.(isAtTop);
    }
    
    // スクロール時にピッカーを閉じる
    if (showColorPicker) {
      setShowColorPicker(false);
    }
    if (showReminderPicker) {
      setShowReminderPicker(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelButton}>キャンセル</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingEvent ? 'イベントを編集' : '新規イベント'}</Text>
        <View style={styles.headerButtons}>
          {editingEvent && onDelete && (
            <TouchableOpacity
              onPress={() => {
                // 繰り返し予定の場合はアクションシートを表示
                // 1. 新しいフィールドがある場合
                // 2. 同じタイトルの予定が複数ある場合（繰り返し予定と推測）
                const hasRecurringFields = false; // シンプル化のため常にfalse
                const sameNameEvents = existingEvents.filter(event =>
                  event.title === editingEvent.title && event.id !== editingEvent.id
                );
                const isRecurring = hasRecurringFields || sameNameEvents.length > 0;

                if (isRecurring) {
                  setShowDeleteSheet(true);
                } else {
                  // 通常の予定の場合は従来通りの確認ダイアログ
                  Alert.alert(
                    '予定を削除',
                    'この予定を削除しますか？',
                    [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '削除', style: 'destructive', onPress: () => onDelete(editingEvent.id) }
                    ]
                  );
                }
              }}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* タイトル */}
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <PencilIcon size={20} color="#000000" />
          </View>
          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="イベントのタイトル"
            textAlign="right"
          />
        </View>
        <View style={styles.separator} />

        {/* 終日オプション */}
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <ClockIcon size={20} color="#000000" />
          </View>
          <Text style={styles.label}>終日</Text>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isAllDay ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>

        {/* 開始日時 */}
        <View style={[styles.row, { paddingBottom: 8 }]}>
          <View style={styles.iconSpacer} />
          <Text style={styles.dateTimeLabel}>開始</Text>
          <View style={styles.newDateTimeContainer}>
            <TouchableOpacity 
              style={styles.newDateButton}
              onPress={toggleStartDatePicker}
            >
              <Text style={styles.newDateText} numberOfLines={1}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
            {!isAllDay && (
              <TouchableOpacity 
                style={styles.newTimeButton}
                onPress={toggleStartTimePicker}
              >
                <Text style={styles.newTimeText}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* 開始日付ピッカー */}
        {showStartDatePicker && (
          <InlineDatePicker
            value={startDate}
            onChange={handleStartDateSelect}
          />
        )}
        
        {/* 開始時刻ネイティブピッカー */}
        {showStartTimePicker && (
          <TimePickerComponent
            value={getDateFromTime(startTime)}
            onChange={handleStartTimeChange}
            minuteInterval={5}
          />
        )}

        {/* 終了日時 */}
        <View style={[styles.row, { paddingTop: 8 }]}>
          <View style={styles.iconSpacer} />
          <Text style={styles.dateTimeLabel}>終了</Text>
          <View style={styles.newDateTimeContainer}>
            <TouchableOpacity 
              style={styles.newDateButton}
              onPress={toggleEndDatePicker}
            >
              <Text style={styles.newDateText}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
            {!isAllDay && (
              <TouchableOpacity 
                style={styles.newTimeButton}
                onPress={toggleEndTimePicker}
              >
                <Text style={styles.newTimeText}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* 終了日付ピッカー */}
        {showEndDatePicker && (
          <InlineDatePicker
            value={endDate}
            onChange={handleEndDateSelect}
          />
        )}
        
        {/* 終了時刻ネイティブピッカー */}
        {showEndTimePicker && (
          <TimePickerComponent
            value={getDateFromTime(endTime)}
            onChange={handleEndTimeChange}
            minuteInterval={5}
          />
        )}

        {/* 詳細オプション */}
        {!showDetailOptions && (
          <TouchableOpacity
            style={styles.detailOptionsButton}
            onPress={() => setShowDetailOptions(true)}
          >
            <View style={styles.iconSpacer} />
            <Text style={styles.detailOptionsText}>詳細オプション</Text>
          </TouchableOpacity>
        )}

        {/* タイムゾーン */}
        {showDetailOptions && (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowTimezoneSelector(true)}
          >
            <View style={styles.iconContainer}>
              <GlobeAltIcon size={20} color="#000000" />
            </View>
            <Text style={styles.label}>{timezone}</Text>
            <View style={styles.reminderContainer}>
              <ChevronUpDownIcon size={16} color="#000000" style={styles.chevron} />
            </View>
          </TouchableOpacity>
        )}

        {/* 繰り返し */}
        {showDetailOptions && (
          <TouchableOpacity
            style={styles.row}
            onPress={(event) => {
              const target = event.currentTarget;
              target.measure((x, y, width, height, pageX, pageY) => {
                setRepeatButtonPosition({ x: pageX, y: pageY, height });
                setShowRepeatPicker(true);
              });
            }}
          >
            <View style={styles.iconContainer}>
              <ArrowPathIcon size={20} color="#000000" />
            </View>
            <Text style={styles.label}>{repeatOption}</Text>
            <View style={styles.repeatContainer}>
              <ChevronUpDownIcon size={16} color="#000000" style={styles.chevron} />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.separator} />

        {/* 場所 */}
        <TouchableOpacity style={styles.row} onPress={openLocationSearch}>
          <View style={styles.iconContainer}>
            <MapPinIcon size={20} color="#000000" />
          </View>
          <Text style={[styles.label, { flex: 0, width: 40 }]}>場所</Text>
          <View style={styles.locationContainer}>
            {location.name ? (
              <>
                <Text style={styles.locationName}>{location.name}</Text>
                {location.address && (
                  <Text style={styles.locationAddress}>{location.address}</Text>
                )}
              </>
            ) : (
              <Text style={styles.placeholder}>場所を入力</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.separator} />

        {/* メモ */}
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <DocumentTextIcon size={20} color="#000000" />
          </View>
          <Text style={styles.label}>メモ</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="メモを入力"
            textAlign="right"
          />
        </View>
        <View style={styles.separator} />

        {/* カラー */}
        <TouchableOpacity style={styles.row} onPress={() => {
          setShowEndDatePicker(false);
          setShowStartDatePicker(false);
          setShowStartTimePicker(false);
          setShowEndTimePicker(false);
          setShowReminderPicker(false);
          setShowColorPicker(!showColorPicker);
        }}>
          <View style={styles.iconContainer}>
            <SwatchIcon size={20} color="#000000" />
          </View>
          <Text style={styles.label}>カラー</Text>
          <View style={styles.colorContainer}>
            <View style={[styles.colorDot, { backgroundColor: color }]} />
            <ChevronUpDownIcon size={16} color="#000000" style={styles.chevron} />
          </View>
        </TouchableOpacity>
        <View style={styles.separator} />

        {/* 設定済み通知一覧 */}
        {reminders.map((reminderTime, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.row} 
            onPress={() => {
              setShowEndDatePicker(false);
              setShowStartDatePicker(false);
              setShowStartTimePicker(false);
              setShowEndTimePicker(false);
              setShowColorPicker(false);
              setEditingReminderIndex(index);
              setShowReminderPicker(!showReminderPicker);
            }}
          >
            {index === 0 && (
              <View style={styles.iconContainer}>
                <BellIcon size={20} color="#6b7280" />
              </View>
            )}
            {index > 0 && <View style={styles.iconSpacer} />}
            <Text style={styles.label}>{formatReminderTime(reminderTime)}</Text>
            <View style={styles.reminderContainer}>
              <ChevronUpDownIcon size={16} color="#000000" style={styles.chevron} />
            </View>
          </TouchableOpacity>
        ))}
        
        {/* 通知を追加 */}
        <TouchableOpacity style={styles.row} onPress={() => {
          setShowEndDatePicker(false);
          setShowStartDatePicker(false);
          setShowStartTimePicker(false);
          setShowEndTimePicker(false);
          setShowColorPicker(false);
          setEditingReminderIndex(null);
          setShowReminderPicker(!showReminderPicker);
        }}>
          {reminders.length === 0 ? (
            <View style={styles.iconContainer}>
              <BellIcon size={20} color="#6b7280" />
            </View>
          ) : (
            <View style={styles.iconSpacer} />
          )}
          <Text style={styles.label}>通知を追加</Text>
          <View style={styles.reminderContainer}>
            <ChevronUpDownIcon size={16} color="#000000" style={styles.chevron} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* カラーピッカー */}
      {showColorPicker && (
        <>
          <TouchableOpacity 
            style={styles.colorPickerOverlay}
            activeOpacity={1}
            onPress={() => setShowColorPicker(false)}
          />
          <View style={[styles.colorPicker, { top: 50 }]}>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#ef4444');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.colorOptionText}>レッド</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#f97316');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.colorOptionText}>オレンジ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#f59e0b');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.colorOptionText}>イエロー</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#84cc16');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#84cc16' }]} />
            <Text style={styles.colorOptionText}>ライム</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#10b981');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.colorOptionText}>グリーン</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#06b6d4');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#06b6d4' }]} />
            <Text style={styles.colorOptionText}>シアン</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#0ea5e9');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#0ea5e9' }]} />
            <Text style={styles.colorOptionText}>スカイ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#3b82f6');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.colorOptionText}>ブルー</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#6366f1');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#6366f1' }]} />
            <Text style={styles.colorOptionText}>インディゴ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#8b5cf6');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.colorOptionText}>バイオレット</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#d946ef');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#d946ef' }]} />
            <Text style={styles.colorOptionText}>マゼンタ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.colorOption}
            onPress={() => {
              setColor('#ec4899');
              setShowColorPicker(false);
            }}
          >
            <View style={[styles.colorOptionDot, { backgroundColor: '#ec4899' }]} />
            <Text style={styles.colorOptionText}>ピンク</Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      {/* 通知ピッカー */}
      {showReminderPicker && (
        <View style={styles.reminderPicker}>
          {editingReminderIndex !== null && (
            <TouchableOpacity 
              style={styles.reminderOption}
              onPress={() => {
                const newReminders = reminders.filter((_, index) => index !== editingReminderIndex);
                setReminders(newReminders);
                setEditingReminderIndex(null);
                setShowReminderPicker(false);
              }}
            >
              <Text style={styles.reminderOptionText}>削除</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.reminderOption}
            onPress={() => {
              const reminderValue = 10;
              if (editingReminderIndex !== null) {
                const newReminders = [...reminders];
                newReminders[editingReminderIndex] = reminderValue;
                setReminders(newReminders);
              } else {
                setReminders([...reminders, reminderValue]);
              }
              setEditingReminderIndex(null);
              setShowReminderPicker(false);
            }}
          >
            <Text style={styles.reminderOptionText}>10分前</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reminderOption}
            onPress={() => {
              const reminderValue = 60;
              if (editingReminderIndex !== null) {
                const newReminders = [...reminders];
                newReminders[editingReminderIndex] = reminderValue;
                setReminders(newReminders);
              } else {
                setReminders([...reminders, reminderValue]);
              }
              setEditingReminderIndex(null);
              setShowReminderPicker(false);
            }}
          >
            <Text style={styles.reminderOptionText}>1時間前</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reminderOption}
            onPress={() => {
              const reminderValue = 1440;
              if (editingReminderIndex !== null) {
                const newReminders = [...reminders];
                newReminders[editingReminderIndex] = reminderValue;
                setReminders(newReminders);
              } else {
                setReminders([...reminders, reminderValue]);
              }
              setEditingReminderIndex(null);
              setShowReminderPicker(false);
            }}
          >
            <Text style={styles.reminderOptionText}>1日前</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reminderOption}
            onPress={() => {
              setShowReminderPicker(false);
              setShowCustomReminder(true);
            }}
          >
            <Text style={styles.reminderOptionText}>カスタム</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 場所検索画面 */}
      <LocationSearchScreen
        isVisible={showLocationSearch}
        onClose={() => setShowLocationSearch(false)}
        onLocationSelect={handleLocationSelect}
        initialQuery={location.name}
      />

      {/* カスタム通知設定 */}
      {showCustomReminder && (
        <View style={styles.customReminderWrapper}>
          <View style={styles.customReminderModal}>
            <View style={styles.customReminderHeader}>
              <TouchableOpacity onPress={() => setShowCustomReminder(false)}>
                <Text style={styles.cancelButton}>キャンセル</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>カスタム通知</Text>
              <TouchableOpacity onPress={() => {
                if (customReminderMinutes && customReminderMinutes > 0) {
                  if (editingReminderIndex !== null) {
                    const newReminders = [...reminders];
                    newReminders[editingReminderIndex] = customReminderMinutes;
                    setReminders(newReminders);
                  } else {
                    setReminders([...reminders, customReminderMinutes]);
                  }
                  setEditingReminderIndex(null);
                }
                setShowCustomReminder(false);
              }}>
                <Text style={styles.saveButton}>保存</Text>
              </TouchableOpacity>
            </View>

            <CustomReminderPicker
              value={customReminderMinutes}
              onChange={setCustomReminderMinutes}
            />
          </View>
        </View>
      )}

      {/* 繰り返し設定ピッカー */}
      {showRepeatPicker && repeatButtonPosition && (
        <TouchableOpacity
          style={styles.repeatPickerWrapper}
          activeOpacity={1}
          onPress={() => setShowRepeatPicker(false)}
        >
          <TouchableOpacity
            style={[
              styles.repeatPickerModal,
              {
                position: 'absolute',
                right: 20,
                width: 200,
                bottom: repeatButtonPosition.y + repeatButtonPosition.height < Dimensions.get('window').height / 2
                  ? Dimensions.get('window').height - repeatButtonPosition.y + 5
                  : undefined,
                top: repeatButtonPosition.y + repeatButtonPosition.height < Dimensions.get('window').height / 2
                  ? undefined
                  : repeatButtonPosition.y - 220, // メニューの高さ分上に表示
              }
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.repeatOptionsContainer}>
              <TouchableOpacity
                style={styles.repeatOption}
                onPress={() => {
                  setRepeatOption('繰り返さない');
                  setShowRepeatPicker(false);
                }}
              >
                <Text style={[styles.repeatOptionText, repeatOption === '繰り返さない' && styles.selectedOption]}>
                  {repeatOption === '繰り返さない' ? '✓ ' : ''}繰り返さない
                </Text>
              </TouchableOpacity>

              <View style={styles.repeatOptionSeparator} />

              <TouchableOpacity
                style={styles.repeatOption}
                onPress={() => {
                  setRepeatOption('毎日');
                  setShowRepeatPicker(false);
                }}
              >
                <Text style={styles.repeatOptionText}>毎日</Text>
              </TouchableOpacity>

              <View style={styles.repeatOptionSeparator} />

              <TouchableOpacity
                style={styles.repeatOption}
                onPress={() => {
                  setRepeatOption('毎週');
                  setShowRepeatPicker(false);
                }}
              >
                <Text style={styles.repeatOptionText}>毎週</Text>
              </TouchableOpacity>

              <View style={styles.repeatOptionSeparator} />

              <TouchableOpacity
                style={styles.repeatOption}
                onPress={() => {
                  setRepeatOption('毎月');
                  setShowRepeatPicker(false);
                }}
              >
                <Text style={styles.repeatOptionText}>毎月</Text>
              </TouchableOpacity>

              <View style={styles.repeatOptionSeparator} />

              <TouchableOpacity
                style={styles.repeatOption}
                onPress={() => {
                  setRepeatOption('毎年');
                  setShowRepeatPicker(false);
                }}
              >
                <Text style={styles.repeatOptionText}>毎年</Text>
              </TouchableOpacity>

              <View style={styles.repeatOptionSeparator} />

              <TouchableOpacity
                style={styles.repeatOption}
                onPress={() => {
                  setShowRepeatPicker(false);
                  setShowCustomRecurrence(true);
                }}
              >
                <Text style={styles.repeatOptionText}>カスタム...</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* カスタム繰り返し設定 */}
      {showCustomRecurrence && (
        <View style={styles.customRecurrenceWrapper}>
          <View style={styles.customRecurrenceModal}>
            {customRecurrencePage === 'main' && (
              <View style={styles.customRecurrenceHeader}>
                <TouchableOpacity onPress={() => {
                  setShowCustomRecurrence(false);
                  setCustomRecurrencePage('main');
                }} style={styles.backButton}>
                  <ChevronLeftIcon size={20} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>繰り返し設定のカスタマイズ</Text>
                <TouchableOpacity onPress={() => {
                const intervalText = customRecurrenceInterval === 1 ? '' : customRecurrenceInterval;
                const unitMap = {
                  day: '日',
                  week: '週',
                  month: 'か月',
                  year: '年'
                };
                const customText = `${intervalText}${unitMap[customRecurrenceUnit]}ごと`;
                setRepeatOption(customText);
                setShowCustomRecurrence(false);
                setCustomRecurrencePage('main');
              }}>
                <Text style={styles.saveButton}>完了</Text>
              </TouchableOpacity>
            </View>
            )}
            {customRecurrencePage === 'main' && <View style={styles.headerSeparator} />}

            <CustomRecurrencePicker
              interval={customRecurrenceInterval}
              unit={customRecurrenceUnit}
              selectedWeekdays={selectedWeekdays}
              monthlyOption={monthlyOption}
              eventDate={startDate}
              onChange={(interval, unit) => {
                setCustomRecurrenceInterval(interval);
                setCustomRecurrenceUnit(unit);
              }}
              onWeekdaysChange={(weekdays) => {
                setSelectedWeekdays(weekdays);
              }}
              onMonthlyOptionChange={(option) => {
                setMonthlyOption(option);
              }}
              onPageChange={(page) => {
                setCustomRecurrencePage(page);
              }}
            />

            {/* 期限なしで繰り返す */}
            {customRecurrencePage === 'main' && (
              <View style={styles.endConditionContainer}>
                <TouchableOpacity
                  style={styles.endConditionRow}
                  onPress={() => setShowEndCondition(true)}
                >
                  <Text style={styles.endConditionText}>期限なしで繰り返す</Text>
                  <View style={styles.endConditionChevron}>
                    <Text style={styles.chevronText}>{'>'}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.endConditionSeparator} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* 終了日設定 */}
      {showEndCondition && (
        <View style={styles.endConditionWrapper}>
          <View style={styles.endConditionModal}>
            <View style={styles.endConditionHeader}>
              <TouchableOpacity onPress={() => setShowEndCondition(false)} style={styles.backButton}>
                <ChevronLeftIcon size={20} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>終了日</Text>
              <TouchableOpacity onPress={() => setShowEndCondition(false)}>
                <Text style={styles.saveButton}>完了</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerSeparator} />

            <RecurrenceEndCondition
              endConditionType={endConditionType}
              endDate={recurrenceEndDate}
              endCount={recurrenceEndCount}
              onChange={(type, date, count) => {
                setEndConditionType(type);
                setRecurrenceEndDate(date);
                setRecurrenceEndCount(count);
              }}
            />
          </View>
        </View>
      )}

      {/* タイムゾーン選択ボトムシート */}
      {showTimezoneSelector && (
        <View style={styles.customRecurrenceWrapper}>
          <View style={styles.customRecurrenceModal}>
            <View style={styles.customRecurrenceHeader}>
              <TouchableOpacity onPress={() => setShowTimezoneSelector(false)} style={styles.backButton}>
                <ChevronLeftIcon size={20} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>タイムゾーン</Text>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.headerSeparator} />
            <TimezoneSelectionScreen
              selectedTimezone={timezone}
              onTimezoneSelect={(timezoneId) => {
                // タイムゾーンIDから表示名を取得
                const timezoneDisplayName = getTimezoneDisplayName(timezoneId);
                setTimezone(timezoneDisplayName);
                setShowTimezoneSelector(false);
              }}
            />
          </View>
        </View>
      )}

      {/* 繰り返し予定削除アクションシート */}
      <RecurringEventDeleteSheet
        isVisible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        onDeleteOption={handleDeleteOption}
        eventTitle={editingEvent?.title}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    color: '#6b7280',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 8,
    textAlign: 'right',
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'right',
  },
  placeholder: {
    color: '#8E8E93',
    textAlign: 'right',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  timeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1f2937',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: -8,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#1f2937',
    width: 40,
  },
  newDateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'space-between',
  },
  newDateButton: {
    paddingVertical: 8,
    maxWidth: 120,
  },
  newTimeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 60,
  },
  newDateText: {
    fontSize: 14,
    color: '#1f2937',
  },
  newTimeText: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  iconSpacer: {
    width: 42, // iconContainer width (28) + marginRight (14)
  },
  locationContainer: {
    flex: 2,
    alignItems: 'flex-end',
    paddingLeft: 0,
  },
  locationName: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'right',
    fontWeight: '500',
  },
  locationAddress: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  reminderText: {
    fontSize: 14,
    color: '#1f2937',
    marginRight: 8,
  },
  reminderPicker: {
    position: 'absolute',
    top: 260,
    right: 0,
    width: 180,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  reminderOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reminderOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  colorPicker: {
    position: 'absolute',
    right: 0,
    width: 180,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colorOptionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  colorPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  customReminderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: 'transparent',
  },
  customReminderModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  customReminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  customRecurrenceWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: 'transparent',
  },
  customRecurrenceModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  customRecurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    width: '100%',
    marginHorizontal: 0,
  },
  endConditionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  endConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  endConditionSeparator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    width: '100%',
    marginHorizontal: -16,
  },
  endConditionText: {
    fontSize: 17,
    color: '#1f2937',
  },
  endConditionChevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  endConditionWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: 'transparent',
  },
  endConditionModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  endConditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  detailOptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  detailOptionsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  repeatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  repeatPickerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  repeatPickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  repeatOptionsContainer: {
    paddingVertical: 4,
  },
  repeatOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  repeatOptionText: {
    fontSize: 17,
    color: '#1f2937',
  },
  selectedOption: {
    color: '#007AFF',
    fontWeight: '500',
  },
  repeatOptionSeparator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
});