import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import {
  CalendarIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';
import { useHolidayContext } from '../contexts/HolidayContext';

interface HolidaySettingsScreenProps {
  onBack?: () => void;
}

export const HolidaySettingsScreen: React.FC<HolidaySettingsScreenProps> = ({
  onBack,
}) => {
  const { 
    holidays, 
    events, 
    showHolidays, 
    showEvents, 
    selectedCountry, 
    selectedColor, 
    language,
    setShowHolidays,
    setShowEvents,
    setSelectedCountry,
    setSelectedColor,
    setLanguage,
    isLoading
  } = useHolidayContext();

  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  
  // 利用可能な国のリスト
  const countries = [
    { code: 'JP', name: '日本', flag: '🇯🇵' },
    { code: 'US', name: 'アメリカ', flag: '🇺🇸' },
    { code: 'GB', name: 'イギリス', flag: '🇬🇧' },
    { code: 'FR', name: 'フランス', flag: '🇫🇷' },
    { code: 'DE', name: 'ドイツ', flag: '🇩🇪' },
    { code: 'IT', name: 'イタリア', flag: '🇮🇹' },
    { code: 'ES', name: 'スペイン', flag: '🇪🇸' },
    { code: 'CA', name: 'カナダ', flag: '🇨🇦' },
    { code: 'AU', name: 'オーストラリア', flag: '🇦🇺' },
    { code: 'KR', name: '韓国', flag: '🇰🇷' },
    { code: 'CN', name: '中国', flag: '🇨🇳' },
    { code: 'BR', name: 'ブラジル', flag: '🇧🇷' }
  ];
  
  // 利用可能な色のリスト
  const colors = [
    { value: '#ef4444', name: '赤' },
    { value: '#f97316', name: 'オレンジ' },
    { value: '#eab308', name: '黄' },
    { value: '#22c55e', name: '緑' },
    { value: '#3b82f6', name: '青' },
    { value: '#8b5cf6', name: '紫' },
    { value: '#ec4899', name: 'ピンク' },
    { value: '#6b7280', name: 'グレー' },
  ];
  
  const selectedCountryInfo = countries.find(c => c.code === selectedCountry) || countries[0];
  const selectedColorInfo = colors.find(c => c.value === selectedColor) || colors[0];

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 祝日を表示 */}
      <View style={styles.settingItem}>
        <View style={styles.settingItemLeft}>
          <CalendarIcon size={20} color="#007AFF" />
          <Text style={styles.settingItemText}>祝日を表示</Text>
        </View>
        <Switch
          value={showHolidays}
          onValueChange={setShowHolidays}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={showHolidays ? '#007AFF' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>

      {/* 行事を表示 */}
      <View style={styles.settingItem}>
        <View style={styles.settingItemLeft}>
          <CalendarIcon size={20} color="#4ecdc4" />
          <Text style={styles.settingItemText}>行事を表示</Text>
        </View>
        <Switch
          value={showEvents}
          onValueChange={setShowEvents}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={showEvents ? '#007AFF' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>

      {/* 国・地域選択 */}
      <TouchableOpacity 
        style={styles.settingItem} 
        onPress={() => setShowCountryModal(true)}
      >
        <View style={styles.settingItemLeft}>
          <Text style={styles.countryFlag}>{selectedCountryInfo.flag}</Text>
          <Text style={styles.settingItemText}>{selectedCountryInfo.name}</Text>
        </View>
        <ChevronRightIcon size={16} color="#c7c7cc" />
      </TouchableOpacity>

      {/* カラー選択 */}
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={() => setShowColorModal(true)}
      >
        <View style={styles.settingItemLeft}>
          <View style={[styles.colorDot, { backgroundColor: selectedColor }]} />
          <Text style={styles.settingItemText}>{selectedColorInfo.name}</Text>
        </View>
        <ChevronRightIcon size={16} color="#c7c7cc" />
      </TouchableOpacity>

      {/* 国選択モーダル */}
      {showCountryModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>国・地域を選択</Text>
            <ScrollView style={styles.modalScrollView}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.modalItem,
                    selectedCountry === country.code && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCountry(country.code);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={styles.modalFlag}>{country.flag}</Text>
                  <Text style={styles.modalItemText}>{country.name}</Text>
                  {selectedCountry === country.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* カラー選択モーダル */}
      {showColorModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>表示色を選択</Text>
            <View style={styles.colorGrid}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.value },
                    selectedColor === color.value && styles.colorOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedColor(color.value);
                    setShowColorModal(false);
                  }}
                >
                  {selectedColor === color.value && (
                    <Text style={styles.colorCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowColorModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemText: {
    fontSize: 17,
    color: '#000000',
    marginLeft: 12,
  },
  settingItemDescription: {
    fontSize: 13,
    color: '#8e8e93',
    marginLeft: 12,
    marginTop: 2,
  },
  countryFlag: {
    fontSize: 20,
    width: 20,
    textAlign: 'center',
  },
  countryFlagText: {
    fontSize: 12,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  settingValue: {
    fontSize: 17,
    color: '#000000',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    minWidth: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000000',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  modalItemSelected: {
    backgroundColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#000000',
  },
  colorCheckmark: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});