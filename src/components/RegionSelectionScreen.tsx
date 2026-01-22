import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  ClockIcon,
} from 'react-native-heroicons/outline';
import { SearchedCity } from '../types/weather';
import { geocodingService } from '../services/geocodingService';
import { useTheme } from '@/hooks/useThemeColor';

interface RegionSelectionScreenProps {
  onBack?: () => void;
  selectedCity?: SearchedCity | null;
  onCitySelect?: (city: SearchedCity) => void;
  recentCities?: SearchedCity[];
}

export const RegionSelectionScreen: React.FC<RegionSelectionScreenProps> = ({
  onBack,
  selectedCity = null,
  onCitySelect,
  recentCities = [],
}) => {
  const { colors, isDarkMode } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedCity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 検索実行（デバウンス用のタイマー）
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchText(query);

    // 既存のタイマーをクリア
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // 300ms後に検索実行（デバウンス）
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);
      const results = await geocodingService.searchCities(query);
      setSearchResults(results);
      setIsLoading(false);
    }, 300);
  }, []);

  const handleCitySelect = (city: SearchedCity) => {
    if (onCitySelect) {
      onCitySelect(city);
    }
    if (onBack) {
      onBack();
    }
  };

  // 検索テキストが空の場合は履歴を表示
  const showRecentCities = !searchText.trim() && recentCities.length > 0;
  const displayData = showRecentCities ? recentCities : searchResults;

  const renderItem = ({ item }: { item: SearchedCity }) => {
    const isSelected = selectedCity?.lat === item.lat && selectedCity?.long === item.long;

    return (
      <TouchableOpacity
        style={[
          styles.cityItem,
          { backgroundColor: colors.primaryBackground, borderBottomColor: colors.separator },
          isSelected && { backgroundColor: colors.secondaryBackground },
        ]}
        onPress={() => handleCitySelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cityIcon}>
          {showRecentCities ? (
            <ClockIcon size={20} color={isSelected ? colors.buttonPrimary : colors.secondaryText} />
          ) : (
            <MapPinIcon size={20} color={isSelected ? colors.buttonPrimary : colors.secondaryText} />
          )}
        </View>
        <View style={styles.cityInfo}>
          <Text style={[styles.cityName, { color: colors.primaryText }, isSelected && { color: colors.buttonPrimary }]}>
            {item.name}
          </Text>
          <Text
            style={[styles.cityDisplayName, { color: colors.secondaryText }, isSelected && { color: colors.buttonPrimary }]}
            numberOfLines={2}
          >
            {item.displayName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (showRecentCities) {
      return (
        <View style={[styles.sectionHeader, { backgroundColor: colors.secondaryBackground, borderBottomColor: colors.separator }]}>
          <Text style={[styles.sectionHeaderText, { color: colors.secondaryText }]}>最近の検索</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>検索中...</Text>
        </View>
      );
    }

    if (hasSearched && searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>検索結果がありません</Text>
        </View>
      );
    }

    // 履歴もない場合の初期表示
    if (!showRecentCities) {
      return (
        <View style={styles.emptyContainer}>
          <MapPinIcon size={48} color={colors.disabledText} />
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>都市名を入力して検索</Text>
          <Text style={[styles.emptySubText, { color: colors.disabledText }]}>例: 渋谷、New York、Paris</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.primaryBackground}
      />

      {/* 検索バー */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.separator }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.secondaryBackground }]}>
          <MagnifyingGlassIcon size={20} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder="都市名を検索..."
            placeholderTextColor={colors.secondaryText}
            value={searchText}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 検索結果 / 履歴リスト */}
      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.lat}-${item.long}-${index}`}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 70,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
    backgroundColor: '#ffffff',
  },
  selectedItem: {
    backgroundColor: '#f0f8ff',
  },
  cityIcon: {
    marginRight: 12,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  cityDisplayName: {
    fontSize: 14,
    color: '#8e8e93',
    lineHeight: 18,
  },
  selectedText: {
    color: '#007AFF',
  },
  selectedSubText: {
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#c7c7cc',
    marginTop: 8,
    textAlign: 'center',
  },
});
