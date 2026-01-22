import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import {
  CloudIcon,
  MapPinIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';
import { SymbolView } from 'expo-symbols';
import { useWeatherContext } from '../contexts/WeatherContext';
import { useTheme } from '@/hooks/useThemeColor';

interface WeatherSettingsScreenProps {
  onBack?: () => void;
  onOpenRegionSelection?: () => void;
}

export const WeatherSettingsScreen: React.FC<WeatherSettingsScreenProps> = ({
  onBack,
  onOpenRegionSelection,
}) => {
  const { colors, isDarkMode } = useTheme();

  // Apple Weather法的帰属ページを開く
  const openAppleWeatherAttribution = () => {
    Linking.openURL('https://weatherkit.apple.com/legal-attribution.html');
  };
  const {
    weatherEnabled,
    setWeatherEnabled,
    getSelectedCityDisplayName,
  } = useWeatherContext();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.primaryBackground }]}
      showsVerticalScrollIndicator={false}
      bounces={true}
    >
      <View style={styles.section}>
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingItemLeft}>
            <CloudIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>
              天気を表示
            </Text>
          </View>
          <Switch
            value={weatherEnabled}
            onValueChange={setWeatherEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={weatherEnabled ? '#007AFF' : '#f4f3f4'}
            ios_backgroundColor={isDarkMode ? '#3e3e3e' : '#e9e9eb'}
          />
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={onOpenRegionSelection}
        >
          <View style={styles.settingItemLeft}>
            <MapPinIcon size={20} color={colors.primaryText} />
            <Text style={[styles.settingItemText, { color: colors.primaryText }]}>
              地域
            </Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={[styles.settingValue, { color: colors.secondaryText }]}>
              {getSelectedCityDisplayName()}
            </Text>
            <ChevronRightIcon size={16} color={colors.secondaryText} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Apple Weather 帰属表示 */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.attributionContainer}
          onPress={openAppleWeatherAttribution}
          accessibilityLabel="Apple Weather の法的帰属情報を開く"
          accessibilityRole="link"
        >
          <SymbolView
            name="apple.logo"
            style={styles.appleWeatherLogo}
            tintColor={colors.secondaryText}
          />
          <Text style={[styles.attributionText, { color: colors.secondaryText }]}>
            Weather
          </Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.footnote, { color: colors.secondaryText }]}>
        ※ 10日先までの天気予報が表示されます
      </Text>
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
  footnote: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  attributionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  appleWeatherLogo: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  attributionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
