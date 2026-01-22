import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  ChevronRightIcon,
} from 'react-native-heroicons/outline';
import regionsData from '../data/regions.json';
import { Country } from '../types/weather';
import { useTheme } from '@/hooks/useThemeColor';

// 国旗の絵文字マッピング
const COUNTRY_FLAGS: { [code: string]: string } = {
  JP: '\u{1F1EF}\u{1F1F5}',
  US: '\u{1F1FA}\u{1F1F8}',
  GB: '\u{1F1EC}\u{1F1E7}',
  FR: '\u{1F1EB}\u{1F1F7}',
  DE: '\u{1F1E9}\u{1F1EA}',
  AU: '\u{1F1E6}\u{1F1FA}',
  KR: '\u{1F1F0}\u{1F1F7}',
  CN: '\u{1F1E8}\u{1F1F3}',
  CA: '\u{1F1E8}\u{1F1E6}',
  IT: '\u{1F1EE}\u{1F1F9}',
};

interface CountrySelectionScreenProps {
  onBack?: () => void;
  onCountrySelect?: (countryCode: string) => void;
}

interface FlatListItem {
  type: 'header' | 'item';
  continent?: string;
  country?: Country;
}

export const CountrySelectionScreen: React.FC<CountrySelectionScreenProps> = ({
  onBack,
  onCountrySelect,
}) => {
  const { colors } = useTheme();

  // 大陸別にグループ化
  const groupedData = useMemo(() => {
    const result: FlatListItem[] = [];
    const continentGroups: { [continent: string]: Country[] } = {};

    regionsData.countries.forEach((country: Country) => {
      if (!continentGroups[country.continent]) {
        continentGroups[country.continent] = [];
      }
      continentGroups[country.continent].push(country);
    });

    // 大陸の順序
    const continentOrder = ['アジア', 'ヨーロッパ', '北アメリカ', 'オセアニア'];
    const sortedContinents = Object.keys(continentGroups).sort((a, b) => {
      const indexA = continentOrder.indexOf(a);
      const indexB = continentOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // FlatList用のデータを構築
    sortedContinents.forEach(continent => {
      result.push({ type: 'header', continent });
      continentGroups[continent]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((country) => {
          result.push({ type: 'item', country });
        });
    });

    return result;
  }, []);

  const handleCountrySelect = (countryCode: string) => {
    if (onCountrySelect) {
      onCountrySelect(countryCode);
    }
  };

  const renderItem = ({ item }: { item: FlatListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={[styles.sectionHeader, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={[styles.sectionHeaderText, { color: colors.secondaryText }]}>
            {item.continent}
          </Text>
        </View>
      );
    }

    const flag = COUNTRY_FLAGS[item.country?.code || ''] || '';

    return (
      <TouchableOpacity
        style={[styles.countryItem, { borderBottomColor: colors.border }]}
        onPress={() => handleCountrySelect(item.country!.code)}
        activeOpacity={0.7}
      >
        <View style={styles.countryInfo}>
          <Text style={styles.flagText}>{flag}</Text>
          <Text style={[styles.countryText, { color: colors.primaryText }]}>
            {item.country?.name}
          </Text>
        </View>
        <ChevronRightIcon size={16} color={colors.secondaryText} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
      <FlatList
        data={groupedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.type === 'header') {
            return `header-${item.continent}`;
          }
          return `item-${item.country?.code}`;
        }}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
    backgroundColor: '#ffffff',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagText: {
    fontSize: 24,
    marginRight: 12,
  },
  countryText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000000',
  },
});
