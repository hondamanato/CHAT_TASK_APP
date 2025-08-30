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
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeftIcon size={18} color="#007AFF" />
          <Text style={styles.backText}>設定</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>祝日設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 祝日表示設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>表示設定</Text>
        
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
      </View>

      {/* 祝日の種類 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>祝日の種類</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <View style={[styles.countryFlag, { backgroundColor: '#ff4757' }]}>
              <Text style={styles.countryFlagText}>🇯🇵</Text>
            </View>
            <View>
              <Text style={styles.settingItemText}>日本の祝日</Text>
              <Text style={styles.settingItemDescription}>
                国民の祝日、振替休日を表示
              </Text>
            </View>
          </View>
          <Switch
            value={showJapaneseHolidays}
            onValueChange={setShowJapaneseHolidays}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showJapaneseHolidays ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            disabled={!showHolidays}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <View style={[styles.countryFlag, { backgroundColor: '#3742fa' }]}>
              <Text style={styles.countryFlagText}>🌍</Text>
            </View>
            <View>
              <Text style={styles.settingItemText}>海外の祝日</Text>
              <Text style={styles.settingItemDescription}>
                アメリカ、中国などの祝日
              </Text>
            </View>
          </View>
          <Switch
            value={showOtherCountryHolidays}
            onValueChange={setShowOtherCountryHolidays}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOtherCountryHolidays ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            disabled={!showHolidays}
          />
        </View>
      </View>

      {/* 説明 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>注意事項</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            • 祝日情報はオンラインから取得されるため、インターネット接続が必要です
            {'\n'}
            • 一部の祝日は年度によって変更される場合があります
            {'\n'}
            • 海外の祝日は主要な祝日のみ表示されます
          </Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
    minHeight: 44,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContainer: {
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
});