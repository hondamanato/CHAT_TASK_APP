import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CheckIcon, XMarkIcon } from 'react-native-heroicons/outline';

const { width } = Dimensions.get('window');

// 12色のカラーパレット（多言語対応）
const COLORS = [
  { 
    name: { en: 'Red', ja: 'レッド' }, 
    value: '#ef4444' 
  },
  { 
    name: { en: 'Orange', ja: 'オレンジ' }, 
    value: '#f97316' 
  },
  { 
    name: { en: 'Yellow', ja: 'イエロー' }, 
    value: '#eab308' 
  },
  { 
    name: { en: 'Green', ja: 'グリーン' }, 
    value: '#22c55e' 
  },
  { 
    name: { en: 'Teal', ja: 'ティール' }, 
    value: '#14b8a6' 
  },
  { 
    name: { en: 'Blue', ja: 'ブルー' }, 
    value: '#3b82f6' 
  },
  { 
    name: { en: 'Indigo', ja: 'インディゴ' }, 
    value: '#6366f1' 
  },
  { 
    name: { en: 'Purple', ja: 'パープル' }, 
    value: '#a855f7' 
  },
  { 
    name: { en: 'Pink', ja: 'ピンク' }, 
    value: '#ec4899' 
  },
  { 
    name: { en: 'Brown', ja: 'ブラウン' }, 
    value: '#a3a3a3' 
  },
  { 
    name: { en: 'Gray', ja: 'グレー' }, 
    value: '#6b7280' 
  },
  { 
    name: { en: 'Black', ja: 'ブラック' }, 
    value: '#1f2937' 
  },
];

interface ColorPickerModalProps {
  isVisible: boolean;
  selectedColor: string;
  onClose: () => void;
  onColorSelect: (color: string) => void;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isVisible,
  selectedColor,
  onClose,
  onColorSelect,
}) => {
  // アプリの言語を取得（デフォルトは日本語）
  const getAppLanguage = () => {
    // ここで実際のアプリの言語設定を取得
    // 現在は日本語をデフォルトとして設定
    return 'ja';
  };

  // 色の名前を現在の言語で取得
  const getColorName = (colorName: { en: string, ja: string }) => {
    const language = getAppLanguage();
    return colorName[language as keyof typeof colorName] || colorName.ja;
  };

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={[styles.selectedColorDot, { backgroundColor: selectedColor }]} />
              <Text style={styles.title}>カラーを選択</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <XMarkIcon size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* カラーリスト */}
          <View style={styles.colorList}>
            {COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={styles.colorItem}
                onPress={() => handleColorSelect(color.value)}
              >
                <View style={styles.colorItemContent}>
                  <View style={styles.colorInfo}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: color.value },
                      ]}
                    />
                    <Text style={styles.colorName}>{getColorName(color.name)}</Text>
                  </View>
                  {selectedColor === color.value && (
                    <CheckIcon size={20} color="#007AFF" strokeWidth={3} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#007AFF', // 選択された色の枠線
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  colorList: {
    // カラーリストのスタイルはここに追加
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  colorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  colorName: {
    fontSize: 14,
    color: '#6b7280',
  },
});