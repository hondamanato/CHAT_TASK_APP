import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ChevronLeftIcon,
  CheckIcon,
} from 'react-native-heroicons/outline';

interface ColorSettingsScreenProps {
  onBack?: () => void;
  selectedColor?: string;
  onColorSelect?: (color: string) => void;
}

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

export const ColorSettingsScreen: React.FC<ColorSettingsScreenProps> = ({
  onBack,
  selectedColor = '#ef4444',
  onColorSelect,
}) => {
  const [currentSelectedColor, setCurrentSelectedColor] = useState(selectedColor);

  const handleColorSelect = (color: string) => {
    setCurrentSelectedColor(color);
    onColorSelect?.(color);
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {COLORS.map((color) => (
        <TouchableOpacity
          key={color.value}
          style={styles.colorItem}
          onPress={() => handleColorSelect(color.value)}
        >
          <View style={styles.colorItemLeft}>
            <View style={[styles.colorDot, { backgroundColor: color.value }]} />
            <Text style={styles.colorItemText}>{color.name.ja}</Text>
          </View>
          {currentSelectedColor === color.value && (
            <CheckIcon size={20} color="#007AFF" />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  colorItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  colorItemText: {
    fontSize: 17,
    color: '#000000',
    marginLeft: 12,
  },
});
