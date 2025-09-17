import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  PencilIcon,
  UserGroupIcon,
  TrashIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';
import { BlurView } from 'expo-blur';
import { BaseBottomSheet } from './BaseBottomSheet';
import { useCalendarContext } from '../contexts/CalendarContext';
import { useTheme } from '@/hooks/useThemeColor';

interface CalendarOptionsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  calendarId: string | null;
}

export const CalendarOptionsSheet: React.FC<CalendarOptionsSheetProps> = ({
  isVisible,
  onClose,
  calendarId,
}) => {
  const { calendars, deleteCalendar, updateCalendar } = useCalendarContext();
  const { colors } = useTheme();

  const selectedCalendar = calendars.find(cal => cal.id === calendarId);

  // 名前変更用の state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // キーボードイベントリスナー
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // 名前変更処理
  const handleStartRename = () => {
    console.log('handleStartRename called, selectedCalendar:', selectedCalendar);
    if (selectedCalendar) {
      Alert.prompt(
        'カレンダー名',
        '',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: '保存',
            onPress: (text) => {
              if (text && text.trim()) {
                updateCalendar(selectedCalendar.id, { name: text.trim() });
              }
            },
          },
        ],
        'plain-text',
        selectedCalendar.name
      );
    } else {
      console.log('No selected calendar found');
    }
  };

  const handleSaveName = () => {
    if (selectedCalendar && newCalendarName.trim()) {
      updateCalendar(selectedCalendar.id, { name: newCalendarName.trim() });
      setShowRenameModal(false);
    }
  };

  const handleCancelRename = () => {
    setShowRenameModal(false);
    setNewCalendarName('');
  };

  const handleDeleteCalendar = () => {
    if (!selectedCalendar) return;

    Alert.alert(
      'カレンダーを削除',
      `「${selectedCalendar.name}」を削除しますか？この操作は取り消せません。`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteCalendar(selectedCalendar.id);
            onClose();
          },
        },
      ]
    );
  };


  const optionItems = [
    {
      icon: <PencilIcon size={20} color={colors.primaryText} />,
      title: '名前を変更',
      showChevron: false,
      onPress: () => {
        console.log('名前を変更がタップされました');
        handleStartRename();
      },
    },
    {
      icon: <UserGroupIcon size={20} color={colors.primaryText} />,
      title: 'メンバーを招待',
      showChevron: true,
      onPress: () => {
        // TODO: メンバー招待機能を実装
        console.log('メンバーを招待');
      },
    },
  ];

  return (
    <>
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.5}
        showCloseButton={false}
        showHandle={true}
      >
        <View style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
          {/* カスタムヘッダー */}
          <View style={[styles.customHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft} />
            <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
              {selectedCalendar?.name || 'カレンダーオプション'}
            </Text>
            <TouchableOpacity
              style={styles.trashButton}
              onPress={handleDeleteCalendar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <TrashIcon size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
          {/* オプションメニュー */}
          <View style={styles.optionsContainer}>
            {optionItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  { borderBottomColor: colors.border },
                  index === optionItems.length - 1 && styles.lastItem,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionIcon}>
                    {item.icon}
                  </View>
                  <Text style={[styles.optionTitle, { color: colors.primaryText }]}>
                    {item.title}
                  </Text>
                  {item.showChevron && (
                    <ChevronRightIcon size={16} color={colors.secondaryText} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BaseBottomSheet>

    {/* カレンダー名変更モーダル */}
    {console.log('Rendering modal, showRenameModal:', showRenameModal)}
    <Modal
      visible={showRenameModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelRename}
    >
      <TouchableWithoutFeedback onPress={handleCancelRename}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={[
              styles.alertContainer,
              {
                backgroundColor: colors.primaryBackground,
                borderColor: colors.border,
                marginBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 0,
              }
            ]}>
              {/* タイトル */}
              <Text style={[styles.alertTitle, { color: colors.primaryText }]}>
                カレンダー名
              </Text>

              {/* テキスト入力 */}
              <TextInput
                style={[
                  styles.alertInput,
                  {
                    color: colors.primaryText,
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                  }
                ]}
                value={newCalendarName}
                onChangeText={setNewCalendarName}
                placeholder="カレンダー名を入力"
                placeholderTextColor={colors.secondaryText}
                autoFocus
                selectTextOnFocus
                onSubmitEditing={handleSaveName}
              />

              {/* ボタン */}
              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.cancelButton]}
                  onPress={handleCancelRename}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.primaryText }]}>
                    キャンセル
                  </Text>
                </TouchableOpacity>

                <View style={[styles.buttonSeparator, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={[styles.alertButton, styles.saveButton]}
                  onPress={handleSaveName}
                >
                  <Text style={styles.saveButtonText}>
                    保存
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionIcon: {
    marginRight: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    width: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  trashButton: {
    padding: 4,
    borderRadius: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // モーダル関連のスタイル
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    paddingTop: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  alertInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    // キャンセルボタン用のスタイル
  },
  saveButton: {
    // 保存ボタン用のスタイル
  },
  buttonSeparator: {
    width: 0.5,
    backgroundColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});