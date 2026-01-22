import React, { useState } from 'react';
import { useNotification } from '@/src/contexts/NotificationContext';
import { t } from '../i18n';
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
  CloudIcon,
} from 'react-native-heroicons/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useWeatherContext } from '../contexts/WeatherContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useTheme } from '@/hooks/useThemeColor';
import { TodayScheduleSheet } from './TodayScheduleSheet';
import { TermsBottomSheet } from './TermsBottomSheet';
import { PrivacyBottomSheet } from './PrivacyBottomSheet';
import { useRouter } from 'expo-router';

interface MainSettingsScreenProps {
  onOpenHolidaySettings?: () => void;
  onOpenTimezoneSettings?: () => void;
  onOpenWeatherSettings?: () => void;
}

export const MainSettingsScreen: React.FC<MainSettingsScreenProps> = ({
  onOpenHolidaySettings,
  onOpenTimezoneSettings,
  onOpenWeatherSettings,
}) => {
  const router = useRouter();
  const { settings, updateSettings } = useNotification();
  const [showTodaySchedule, setShowTodaySchedule] = useState(false);
  const [showTermsSheet, setShowTermsSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const {
    weekStartDay,
    setWeekStartDay,
    showRokuyou,
    setShowRokuyou,
    selectedTimezone,
    getTimezoneDisplayName
  } = useSettings();
  const { locale, getLanguageName } = useLocalization();
  const { isDarkMode, darkModeEnabled, setDarkModeEnabled, colors } = useTheme();
  const { getSelectedCityDisplayName } = useWeatherContext();

  // 言語設定を開く関数
  const openLanguageSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.cannotOpenSettings'));
    }
  };

  // 今日の予定設定を開く
  const openTodayScheduleSettings = () => {
    setShowTodaySchedule(true);
  };

  // 祝日設定を開く
  const openHolidaySettings = () => {
    if (onOpenHolidaySettings) {
      onOpenHolidaySettings();
    }
  };

  // タイムゾーン設定を開く
  const openTimezoneSettings = () => {
    if (onOpenTimezoneSettings) {
      onOpenTimezoneSettings();
    }
  };

  // 天気設定を開く
  const openWeatherSettings = () => {
    if (onOpenWeatherSettings) {
      onOpenWeatherSettings();
    }
  };

  // 利用規約を開く
  const openTermsOfService = () => {
    setShowTermsSheet(true);
  };

  // プライバシーポリシーを開く
  const openPrivacyPolicy = () => {
    setShowPrivacySheet(true);
  };

  // メニューのカスタムスタイル
  const menuOptionsStyles = {
    optionsContainer: {
      backgroundColor: isDarkMode ? 'rgba(44, 44, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
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
        style={[styles.container, { backgroundColor: colors.primaryBackground }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
      {/* 基本設定 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{t('settings.basic')}</Text>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={openLanguageSettings}
        >
          <View style={styles.settingItemLeft}>
            <LanguageIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.language')}</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={[styles.settingValue, { color: colors.secondaryText }]}>
              {getLanguageName(locale)}
            </Text>
            <ChevronRightIcon size={16} color={colors.secondaryText} />
          </View>
        </TouchableOpacity>

        <Menu>
          <MenuTrigger customStyles={menuTriggerStyles}>
            <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <View style={styles.settingItemLeft}>
                <CalendarDaysIcon size={20} color={colors.primaryText} />
                <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.weekStart')}</Text>
              </View>
              <View style={styles.settingItemRight}>
                <Text style={[styles.settingValue, { color: colors.secondaryText }]}>{weekStartDay === '日曜日' ? t('settings.sunday') : t('settings.monday')}</Text>
                <ChevronUpDownIcon size={16} color={colors.secondaryText} />
              </View>
            </View>
          </MenuTrigger>
          <MenuOptions customStyles={menuOptionsStyles}>
            <MenuOption onSelect={() => setWeekStartDay('日曜日')}>
              <View style={styles.menuOptionItem}>
                <Text style={[styles.menuOptionText, { color: colors.primaryText }]}>{t('settings.sunday')}</Text>
                {weekStartDay === '日曜日' && <CheckIcon size={16} color={colors.buttonPrimary} />}
              </View>
            </MenuOption>
            <View style={[styles.menuSeparator, { backgroundColor: colors.separator }]} />
            <MenuOption onSelect={() => setWeekStartDay('月曜日')}>
              <View style={styles.menuOptionItem}>
                <Text style={[styles.menuOptionText, { color: colors.primaryText }]}>{t('settings.monday')}</Text>
                {weekStartDay === '月曜日' && <CheckIcon size={16} color={colors.buttonPrimary} />}
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={openHolidaySettings}
        >
          <View style={styles.settingItemLeft}>
            <StarIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.holidays')}</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={[styles.settingValue, { color: colors.secondaryText }]}>{t('settings.display_label')}</Text>
            <ChevronRightIcon size={16} color={colors.secondaryText} />
          </View>
        </TouchableOpacity>

        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingItemLeft}>
            <SparklesIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.rokuyou')}</Text>
          </View>
          <Switch
            value={showRokuyou}
            onValueChange={setShowRokuyou}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showRokuyou ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor={isDarkMode ? '#3e3e3e' : '#e9e9eb'}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={openTimezoneSettings}
        >
          <View style={styles.settingItemLeft}>
            <ClockIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.timezone')}</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={[styles.settingValue, { color: colors.secondaryText }]}>{getTimezoneDisplayName(selectedTimezone)}</Text>
            <ChevronRightIcon size={16} color={colors.secondaryText} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 通知設定 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{t('settings.notifications.title')}</Text>

        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingItemLeft}>
            <BellIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.pushNotification')}</Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.enabled ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor={isDarkMode ? '#3e3e3e' : '#e9e9eb'}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={openTodayScheduleSettings}
        >
          <View style={styles.settingItemLeft}>
            <CalendarIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.todaySchedule')}</Text>
          </View>
          <ChevronRightIcon size={16} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* 表示設定 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{t('settings.display')}</Text>

        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingItemLeft}>
            <MoonIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>{t('settings.darkMode')}</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={darkModeEnabled ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor={isDarkMode ? '#3e3e3e' : '#e9e9eb'}
          />
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={openWeatherSettings}
        >
          <View style={styles.settingItemLeft}>
            <CloudIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>天気表示</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={[styles.settingValue, { color: colors.secondaryText }]}>
              {getSelectedCityDisplayName()}
            </Text>
            <ChevronRightIcon size={16} color={colors.secondaryText} />
          </View>
        </TouchableOpacity>
      </View>

      </ScrollView>
      
      {/* 今日の予定設定ボトムシート */}
      <TodayScheduleSheet
        isVisible={showTodaySchedule}
        onClose={() => setShowTodaySchedule(false)}
      />

      {/* 利用規約ボトムシート */}
      <TermsBottomSheet
        isVisible={showTermsSheet}
        onClose={() => setShowTermsSheet(false)}
      />

      {/* プライバシーポリシーボトムシート */}
      <PrivacyBottomSheet
        isVisible={showPrivacySheet}
        onClose={() => setShowPrivacySheet(false)}
      />
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