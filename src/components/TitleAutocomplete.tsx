import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { searchTitleHistory, TitleHistoryItem, deleteTitleFromHistory } from '../utils/titleHistoryService';
import { useLocalization } from '../contexts/LocalizationContext';
import { t } from '../i18n';

interface TitleAutocompleteProps {
  query: string;
  onSelect: (item: TitleHistoryItem) => void;
  isVisible: boolean;
  maxHeight?: number;
  isDeletingRef?: React.MutableRefObject<boolean>;
  onDeleteComplete?: () => void;
}

export const TitleAutocomplete: React.FC<TitleAutocompleteProps> = ({
  query,
  onSelect,
  isVisible,
  maxHeight = 300,
  isDeletingRef,
  onDeleteComplete,
}) => {
  const { colors } = useTheme();
  const { locale } = useLocalization();
  const [suggestions, setSuggestions] = useState<TitleHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // クエリが変更されたら候補を検索
  useEffect(() => {
    const searchSuggestions = async () => {
      if (!query || query.trim() === '') {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchTitleHistory(query);
        setSuggestions(results);
      } catch (error) {
        console.error('候補検索エラー:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    // debounce処理（300ms）
    const timer = setTimeout(() => {
      searchSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // 時間帯をフォーマット
  const formatTimeRange = useCallback((item: TitleHistoryItem): string => {
    if (item.isAllDay) {
      return t('eventCreate.allDay') || '終日';
    }
    return `${item.startTime} ~ ${item.endTime}`;
  }, []);

  // 候補を削除
  const handleDelete = async (item: TitleHistoryItem) => {
    if (isDeletingRef) {
      isDeletingRef.current = true;
    }
    try {
      console.log('削除ボタンがタップされました:', item.title);
      await deleteTitleFromHistory(item);
      console.log('履歴から削除完了');
      // 候補リストを再検索
      const results = await searchTitleHistory(query);
      console.log('候補リスト更新:', results.length, '件');
      setSuggestions(results);
    } catch (error) {
      console.error('候補削除エラー:', error);
    } finally {
      if (isDeletingRef) {
        isDeletingRef.current = false;
      }
      // 削除完了を親コンポーネントに通知
      onDeleteComplete?.();
    }
  };

  // 非表示の場合のみ非表示（候補0件でもエリアは表示）
  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          maxHeight,
          minHeight: 100,
        },
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.buttonPrimary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 履歴候補を表示 */}
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.title}-${item.createdAt}-${index}`}
              style={styles.suggestionItem}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.titleText, { color: colors.primaryText }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.timeText, { color: colors.secondaryText }]}
                numberOfLines={1}
              >
                {formatTimeRange(item)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* 入力中の文字を候補として表示（履歴がない場合） */}
          {query && query.trim() && (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => onSelect({
                title: query,
                startTime: '09:00',
                endTime: '10:00',
                isAllDay: false,
                createdAt: new Date().toISOString(),
              })}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.titleText, { color: colors.primaryText }]}
                numberOfLines={1}
              >
                {query}
              </Text>
              <Text
                style={[styles.timeText, { color: colors.secondaryText }]}
                numberOfLines={1}
              >
                09:00 ~ 10:00
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 12,
  },
});
