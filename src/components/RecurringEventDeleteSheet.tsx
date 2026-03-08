import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

export type DeleteOption = 'single' | 'future' | 'all' | 'cancel';

interface RecurringEventDeleteSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onDeleteOption: (option: DeleteOption) => void;
  eventTitle?: string;
}

export const RecurringEventDeleteSheet: React.FC<RecurringEventDeleteSheetProps> = ({
  isVisible,
  onClose,
  onDeleteOption,
  eventTitle = '予定',
}) => {
  const { width } = useResponsive();
  const handleOptionPress = (option: DeleteOption) => {
    onDeleteOption(option);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={[styles.sheet, { width: width - 20 }]}>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.headerText}>定期的な予定を削除します</Text>
            </View>

            {/* 削除オプション */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => handleOptionPress('single')}
              >
                <Text style={styles.optionTextDestructive}>この予定</Text>
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.option}
                onPress={() => handleOptionPress('future')}
              >
                <Text style={styles.optionTextDestructive}>これ以降のすべての予定</Text>
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.option}
                onPress={() => handleOptionPress('all')}
              >
                <Text style={styles.optionTextDestructive}>すべての予定</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* キャンセルボタン */}
          <View style={[styles.cancelContainer, { width: width - 20 }]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleOptionPress('cancel')}
            >
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  container: {
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  headerText: {
    fontSize: 13,
    color: '#6d6d72',
    textAlign: 'center',
    lineHeight: 18,
  },
  optionsContainer: {
    backgroundColor: '#ffffff',
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  optionTextDestructive: {
    fontSize: 20,
    color: '#ff3b30',
    fontWeight: '400',
  },
  separator: {
    height: 1,
    backgroundColor: '#c6c6c8',
    marginHorizontal: 16,
  },
  cancelContainer: {
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 20,
    color: '#007aff',
    fontWeight: '600',
  },
});