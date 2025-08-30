import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import {
  Menu,
  MenuProvider,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import {
  BellIcon,
  MoonIcon,
  TrashIcon,
  UserIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  LanguageIcon,
  CalendarDaysIcon,
  StarIcon,
  ClockIcon,
  CalendarIcon,
  SparklesIcon,
  CheckIcon,
} from 'react-native-heroicons/outline';
import { useSettings } from '../contexts/SettingsContext';

export const MainSettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const { weekStartDay, setWeekStartDay, showRokuyou, setShowRokuyou } = useSettings();

  // 言語設定を開く関数
  const openLanguageSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      Alert.alert('エラー', '設定アプリを開けませんでした');
    }
  };

  // 今日の予定設定を開く
  const openTodayScheduleSettings = () => {
    // TODO: 今日の予定設定画面を実装後にナビゲーション追加
    console.log('今日の予定設定を開く');
  };

  // 祝日設定を開く
  const openHolidaySettings = () => {
    // TODO: 祝日設定画面を実装後にナビゲーション追加
    console.log('祝日設定を開く');
  };

  // メニューのカスタムスタイル
  const menuOptionsStyles = {
    optionsContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 8,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 15,
      minWidth: 140,
      zIndex: 99999,
      marginTop: 12,
      alignSelf: 'flex-end' as 'flex-end',
      marginRight: 20,
    },
  };

  const menuTriggerStyles = {
    triggerWrapper: {
      backgroundColor: 'transparent',
    },
    triggerTouchable: {
      underlayColor: 'rgba(0, 0, 0, 0.1)',
      activeOpacity: 0.7,
    },
  };

  return (
    <MenuProvider>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
      {/* 基本設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本設定</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={openLanguageSettings}
        >
          <View style={styles.settingItemLeft}>
            <LanguageIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>言語</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={styles.settingValue}>日本語</Text>
            <ChevronRightIcon size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <Menu>
          <MenuTrigger customStyles={menuTriggerStyles}>
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <CalendarDaysIcon size={20} color="#000000" />
                <Text style={styles.settingItemText}>週の始まり</Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={styles.settingValue}>{weekStartDay}</Text>
                <ChevronUpDownIcon size={16} color="#9ca3af" />
              </View>
            </View>
          </MenuTrigger>
          <MenuOptions customStyles={menuOptionsStyles}>
            <MenuOption onSelect={() => setWeekStartDay('日曜日')}>
              <View style={styles.menuOptionItem}>
                <Text style={styles.menuOptionText}>日曜日</Text>
                {weekStartDay === '日曜日' && <CheckIcon size={16} color="#007AFF" />}
              </View>
            </MenuOption>
            <View style={styles.menuSeparator} />
            <MenuOption onSelect={() => setWeekStartDay('月曜日')}>
              <View style={styles.menuOptionItem}>
                <Text style={styles.menuOptionText}>月曜日</Text>
                {weekStartDay === '月曜日' && <CheckIcon size={16} color="#007AFF" />}
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={openHolidaySettings}
        >
          <View style={styles.settingItemLeft}>
            <StarIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>祝日</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={styles.settingValue}>表示</Text>
            <ChevronRightIcon size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <SparklesIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>六曜</Text>
          </View>
          <Switch
            value={showRokuyou}
            onValueChange={setShowRokuyou}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showRokuyou ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <ClockIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>タイムゾーン</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={styles.settingValue}>JST (UTC+9)</Text>
            <ChevronRightIcon size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>
      </View>

      {/* 通知設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>通知設定</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <BellIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>プッシュ通知</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notificationsEnabled ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={openTodayScheduleSettings}
        >
          <View style={styles.settingItemLeft}>
            <CalendarIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>今日の予定</Text>
          </View>
          <ChevronRightIcon size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* 表示設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>表示設定</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <MoonIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>ダークモード</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={darkModeEnabled ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
      </View>

      {/* データ・法的事項 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>データ・法的事項</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <UserIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>プロフィール</Text>
          </View>
          <ChevronRightIcon size={16} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <TrashIcon size={20} color="#ef4444" />
            <Text style={[styles.settingItemText, styles.dangerText]}>データを削除</Text>
          </View>
          <ChevronRightIcon size={16} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <InformationCircleIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>利用規約</Text>
          </View>
          <ChevronRightIcon size={16} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <InformationCircleIcon size={20} color="#000000" />
            <Text style={styles.settingItemText}>プライバシーポリシー</Text>
          </View>
          <ChevronRightIcon size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      </ScrollView>
    </MenuProvider>
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
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 17,
    color: '#000000',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 17,
    color: '#8e8e93',
    marginRight: 8,
  },
  dangerText: {
    color: '#ef4444',
  },
  menuOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  menuOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
    marginVertical: 4,
  },
});