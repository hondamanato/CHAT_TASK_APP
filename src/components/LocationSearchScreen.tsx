import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { MagnifyingGlassIcon, ChevronLeftIcon, MapPinIcon } from 'react-native-heroicons/outline';
import { placesService } from '../services/placesService';
import { useResponsive } from '@/hooks/useResponsive';

interface LocationSearchScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onLocationSelect: (location: string, address?: string) => void;
  initialQuery?: string;
}

interface SearchResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  isGooglePlace: boolean;
}

const sampleLocations = [
  '東京駅',
  '渋谷駅',
  '新宿駅',
  '品川駅',
  '池袋駅',
  '上野駅',
  '秋葉原駅',
  '有楽町駅',
  '銀座',
  '六本木',
  '表参道',
  '原宿',
  '吉祥寺',
  '三軒茶屋',
  '恵比寿',
];

export const LocationSearchScreen: React.FC<LocationSearchScreenProps> = ({
  isVisible,
  onClose,
  onLocationSelect,
  initialQuery = '',
}) => {
  const { width: screenWidth } = useResponsive();
  const [initialScreenWidth] = useState(screenWidth);  // 初期値をキャプチャ
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slideAnimationRef = useRef<Animated.Value | null>(null);
  if (!slideAnimationRef.current) {
    slideAnimationRef.current = new Animated.Value(initialScreenWidth);  // 固定値を使用
  }
  const slideAnimation = slideAnimationRef.current;

  useEffect(() => {
    if (isVisible) {
      setSearchQuery(initialQuery);
      slideAnimation.setValue(initialScreenWidth);
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnimation, {
        toValue: initialScreenWidth,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, initialQuery, initialScreenWidth, slideAnimation]);

  const debouncedSearchPlaces = useCallback(async (query: string) => {
      if (!query.trim()) {
        const staticResults: SearchResult[] = sampleLocations.map((location, index) => ({
          place_id: `static_${index}`,
          description: location,
          main_text: location,
          secondary_text: '東京都',
          isGooglePlace: false,
        }));
        setSearchResults(staticResults);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const googleResults = await placesService.searchPlaces(query, {
          language: 'ja',
        });

        const staticResults = sampleLocations
          .filter(location => location.toLowerCase().includes(query.toLowerCase()))
          .map((location, index) => ({
            place_id: `static_${index}`,
            description: location,
            main_text: location,
            secondary_text: '東京都',
            isGooglePlace: false,
          }));

        const combinedResults: SearchResult[] = [
          ...staticResults,
          ...googleResults.map((result) => ({
            place_id: result.place_id,
            description: result.description,
            main_text: result.structured_formatting.main_text,
            secondary_text: result.structured_formatting.secondary_text,
            isGooglePlace: true,
          })),
        ];

        setSearchResults(combinedResults);
      } catch (err) {
        console.error('Search error:', err);
        
        let errorMessage = '検索中にエラーが発生しました';
        if (err instanceof Error) {
          if (err.message.includes('APIキー')) {
            errorMessage = 'Google Maps APIキーの設定を確認してください';
          } else if (err.message.includes('上限')) {
            errorMessage = 'API使用量の上限に達しました';
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
        
        const fallbackResults = sampleLocations
          .filter(location => location.toLowerCase().includes(query.toLowerCase()))
          .map((location, index) => ({
            place_id: `static_${index}`,
            description: location,
            main_text: location,
            secondary_text: '東京都',
            isGooglePlace: false,
          }));
        setSearchResults(fallbackResults);
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSearchPlaces(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, debouncedSearchPlaces]);

  const handleLocationSelect = (result: SearchResult) => {
    // Google Places APIの正しいデータ構造
    // main_text: 場所名（例：「三宮駅」）
    // secondary_text: 住所（例：「日本、兵庫県神戸市中央区布引町4丁目1」）
    const locationName = result.main_text;
    const address = result.secondary_text && result.secondary_text !== '東京都' ? result.secondary_text : undefined;
    onLocationSelect(locationName, address);
    Keyboard.dismiss();
    onClose();
  };

  const handleBackPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnimation }]
        }
      ]}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ChevronLeftIcon size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MagnifyingGlassIcon size={20} color="#8e8e93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="場所を追加"
            placeholderTextColor="#8e8e93"
            autoFocus={true}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 検索結果リスト */}
      <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>検索中...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isLoading && searchResults.map((result) => (
          <TouchableOpacity
            key={result.place_id}
            style={styles.locationItem}
            onPress={() => handleLocationSelect(result)}
          >
            <View style={styles.locationItemContent}>
              <MapPinIcon 
                size={18} 
                color={result.isGooglePlace ? '#34D399' : '#8e8e93'} 
                style={styles.locationIcon} 
              />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationMainText}>{result.main_text}</Text>
                {result.secondary_text && (
                  <Text style={styles.locationSecondaryText}>{result.secondary_text}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        {!isLoading && searchResults.length === 0 && searchQuery.trim() && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>検索結果が見つかりません</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4, // タップエリアを広げる
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 8,
  },
  resultsList: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 8,
  },
  locationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationMainText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  locationSecondaryText: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8e8e93',
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#8e8e93',
  },
});