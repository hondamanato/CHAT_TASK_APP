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
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';

interface HolidaySettingsScreenProps {
  onBack?: () => void;
}

export const HolidaySettingsScreen: React.FC<HolidaySettingsScreenProps> = ({
  onBack,
}) => {
  const [showHolidays, setShowHolidays] = useState(true);
  const [showJapaneseHolidays, setShowJapaneseHolidays] = useState(true);
  const [showOtherCountryHolidays, setShowOtherCountryHolidays] = useState(false);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 祝日を表示 */}
      <View style={styles.settingItem}>
        <View style={styles.settingItemLeft}>
          <CalendarIcon size={20} color="#000000" />
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
          <CalendarIcon size={20} color="#000000" />
          <Text style={styles.settingItemText}>行事を表示</Text>
        </View>
        <Switch
          value={showJapaneseHolidays}
          onValueChange={setShowJapaneseHolidays}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={showJapaneseHolidays ? '#007AFF' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>

      {/* カラー選択 */}
      <View style={styles.settingItem}>
        <View style={styles.settingItemLeft}>
          <View style={[styles.colorDot, { backgroundColor: '#ff4757' }]} />
          <Text style={styles.settingItemText}>赤</Text>
        </View>
        <View style={styles.settingItemRight}>
          <ChevronRightIcon size={16} color="#000000" />
        </View>
      </View>

      {/* 国選択 */}
      <View style={styles.settingItem}>
        <View style={styles.settingItemLeft}>
          <View style={[styles.countryFlag, { backgroundColor: '#3742fa' }]}>
            <Text style={styles.countryFlagText}>🇯🇵</Text>
          </View>
          <Text style={styles.settingItemText}>日本</Text>
        </View>
        <View style={styles.settingItemRight}>
          <ChevronRightIcon size={16} color="#000000" />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryFlagText: {
    fontSize: 12,
  },
  infoBox: {
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
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