import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNotification } from '@/src/contexts/NotificationContext';
import { BellIcon, ClockIcon } from 'react-native-heroicons/outline';

const reminderOptions = [
  { label: '5分前', value: 5 },
  { label: '10分前', value: 10 },
  { label: '15分前', value: 15 },
  { label: '30分前', value: 30 },
  { label: '1時間前', value: 60 },
  { label: '2時間前', value: 120 },
  { label: '1日前', value: 1440 },
];

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { 
    settings, 
    permissions, 
    updateSettings, 
    requestPermissions,
    sendTestNotification,
    isLoading 
  } = useNotification();
  
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const handlePermissionRequest = async () => {
    try {
      const newPermissions = await requestPermissions();
      if (!newPermissions.granted) {
        Alert.alert(
          '通知許可が必要です',
          'プッシュ通知を受け取るには、設定から通知を許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => {
              // iOS/Androidの設定画面を開く処理は実装可能だが、ここでは省略
            }},
          ]
        );
      }
    } catch (error) {
      console.error('権限リクエストエラー:', error);
    }
  };

  const handleTestNotification = async () => {
    if (!permissions?.granted) {
      Alert.alert(
        '通知権限が必要です',
        'テスト通知を送信するには通知権限が必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '権限を許可', onPress: handlePermissionRequest },
        ]
      );
      return;
    }

    try {
      await sendTestNotification();
      Alert.alert('テスト通知を送信しました', 'しばらくしてから通知が表示されます。');
    } catch (error) {
      Alert.alert('エラー', 'テスト通知の送信に失敗しました。');
    }
  };

  const handleReminderTimeChange = (minutes: number) => {
    updateSettings({ reminderMinutesBefore: minutes });
    setShowReminderPicker(false);
  };

  const getPermissionStatusText = () => {
    if (!permissions) return '確認中...';
    if (permissions.granted) return '許可済み';
    if (permissions.canAskAgain) return '未許可';
    return '拒否済み';
  };

  const getPermissionStatusColor = () => {
    if (!permissions) return '#666';
    if (permissions.granted) return '#34C759';
    if (permissions.canAskAgain) return '#FF9500';
    return '#FF3B30';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <BellIcon size={24} color="#007AFF" />
        <Text style={styles.title}>通知設定</Text>
      </View>

      {/* 権限ステータス */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>権限ステータス</Text>
        <View style={styles.permissionRow}>
          <Text style={styles.permissionLabel}>通知権限:</Text>
          <Text style={[styles.permissionStatus, { color: getPermissionStatusColor() }]}>
            {getPermissionStatusText()}
          </Text>
        </View>
        
        {!permissions?.granted && (
          <TouchableOpacity style={styles.button} onPress={handlePermissionRequest}>
            <Text style={styles.buttonText}>通知権限を許可</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 基本設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本設定</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>通知を有効にする</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>予定のリマインダー</Text>
          <Switch
            value={settings.eventReminders}
            onValueChange={(value) => updateSettings({ eventReminders: value })}
            trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            thumbColor="#FFFFFF"
            disabled={!settings.enabled}
          />
        </View>
      </View>

      {/* リマインダー設定 */}
      {settings.enabled && settings.eventReminders && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>リマインダー設定</Text>
          
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowReminderPicker(!showReminderPicker)}
          >
            <ClockIcon size={20} color="#666" />
            <Text style={styles.pickerButtonText}>
              {reminderOptions.find(option => option.value === settings.reminderMinutesBefore)?.label || '15分前'}
            </Text>
            <Text style={styles.pickerArrow}>{showReminderPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showReminderPicker && (
            <View style={styles.pickerContainer}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    settings.reminderMinutesBefore === option.value && styles.pickerOptionSelected
                  ]}
                  onPress={() => handleReminderTimeChange(option.value)}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    settings.reminderMinutesBefore === option.value && styles.pickerOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* テスト通知 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>テスト</Text>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestNotification}
        >
          <Text style={styles.buttonText}>テスト通知を送信</Text>
        </TouchableOpacity>
      </View>

      {/* クローズボタン */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>閉じる</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
  },
  permissionLabel: {
    fontSize: 16,
    color: '#000',
  },
  permissionStatus: {
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#000',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});