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
  onOpenColorSettings?: () => void;
  onOpenCountrySettings?: () => void;
}

export const HolidaySettingsScreen: React.FC<HolidaySettingsScreenProps> = ({
  onBack,
  onOpenColorSettings,
  onOpenCountrySettings,
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
  
  // 利用可能な色のリスト（表示名取得用）
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
        onPress={onOpenCountrySettings}
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
        onPress={onOpenColorSettings}
      >
        <View style={styles.settingItemLeft}>
          <View style={[styles.colorDot, { backgroundColor: selectedColor }]} />
          <Text style={styles.settingItemText}>{selectedColorInfo.name}</Text>
        </View>
        <ChevronRightIcon size={16} color="#c7c7cc" />
      </TouchableOpacity>


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
});