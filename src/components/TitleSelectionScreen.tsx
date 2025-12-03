import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { XMarkIcon, ClockIcon } from 'react-native-heroicons/outline';
import { searchTitleHistory, deleteTitleFromHistory, TitleHistoryItem } from '../utils/titleHistoryService';
import { t } from '../i18n';

interface TitleSelectionScreenProps {
  isVisible: boolean;
  initialQuery: string;
  onClose: () => void;
  onSelect: (item: TitleHistoryItem) => void;
  onQueryChange: (query: string) => void;
  topOffset?: number;
}

export const TitleSelectionScreen: React.FC<TitleSelectionScreenProps> = ({
  isVisible,
  initialQuery,
  onClose,
  onSelect,
  onQueryChange,
  topOffset = 160,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<TitleHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 初期クエリが変更されたら反映
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

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
  const formatTimeRange = (item: TitleHistoryItem): string => {
    if (item.isAllDay) {
      return t('eventCreate.allDay') || '終日';
    }
    return `${item.startTime} ~ ${item.endTime}`;
  };

  // 候補を選択
  const handleSelect = (item: TitleHistoryItem) => {
    onSelect(item);
    onClose();
  };

  // 候補を削除
  const handleDelete = async (item: TitleHistoryItem) => {
    await deleteTitleFromHistory(item);
    // 候補リストを再検索
    const results = await searchTitleHistory(query);
    setSuggestions(results);
  };

  // テキスト変更ハンドラー
  const handleTextChange = (text: string) => {
    setQuery(text);
    onQueryChange(text);
  };

  // 候補リストのレンダリング
  const renderSuggestionItem = ({ item, index }: { item: TitleHistoryItem; index: number }) => (
    <View style={styles.suggestionRow}>
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <ClockIcon size={20} color="#8E8E93" style={styles.clockIcon} />
        <View style={styles.suggestionContent}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.timeText} numberOfLines={1}>
            {formatTimeRange(item)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <XMarkIcon size={20} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  // 非表示の場合は何も表示しない
  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, { top: topOffset }]}>
      {/* 入力中のテキスト表示 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.inputText}
          value={query}
          onChangeText={handleTextChange}
          placeholder={t('eventCreate.titlePlaceholder')}
          placeholderTextColor="#C7C7CC"
          autoFocus
          selectionColor="#007AFF"
        />
      </View>

      {/* 候補リスト */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={suggestions}
          renderItem={renderSuggestionItem}
          keyExtractor={(item, index) => `${item.title}-${item.createdAt}-${index}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {query ? '候補が見つかりません' : 'タイトルを入力してください'}
              </Text>
            </View>
          }
          style={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
  },
  inputContainer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: 1,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  suggestionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000000',
    marginRight: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
