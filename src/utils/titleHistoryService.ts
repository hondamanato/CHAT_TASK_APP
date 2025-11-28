import AsyncStorage from '@react-native-async-storage/async-storage';

const TITLE_HISTORY_KEY = '@title_history';
const MAX_HISTORY_ITEMS = 50;

export interface TitleHistoryItem {
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  createdAt: string;
  color?: string;
}

/**
 * タイトル履歴をAsyncStorageから取得
 */
export const getTitleHistory = async (): Promise<TitleHistoryItem[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(TITLE_HISTORY_KEY);
    if (!historyJson) {
      return [];
    }
    const history: TitleHistoryItem[] = JSON.parse(historyJson);
    return history;
  } catch (error) {
    console.error('タイトル履歴の取得エラー:', error);
    return [];
  }
};

/**
 * タイトル履歴に新しいアイテムを追加
 */
export const addTitleToHistory = async (
  title: string,
  startTime: string,
  endTime: string,
  isAllDay: boolean
): Promise<void> => {
  try {
    // 空のタイトルは保存しない
    if (!title || title.trim() === '') {
      return;
    }

    const history = await getTitleHistory();

    // 新しいアイテムを作成
    const newItem: TitleHistoryItem = {
      title: title.trim(),
      startTime,
      endTime,
      isAllDay,
      createdAt: new Date().toISOString(),
    };

    // 同一タイトル+時間帯の重複を除去
    const filteredHistory = history.filter(
      (item) =>
        !(
          item.title === newItem.title &&
          item.startTime === newItem.startTime &&
          item.endTime === newItem.endTime &&
          item.isAllDay === newItem.isAllDay
        )
    );

    // 新しいアイテムを先頭に追加
    const updatedHistory = [newItem, ...filteredHistory];

    // 最大件数を超えた場合は古いものを削除
    const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

    // AsyncStorageに保存
    await AsyncStorage.setItem(TITLE_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('タイトル履歴の保存エラー:', error);
  }
};

/**
 * ひらがなをカタカナに変換して正規化
 */
const normalizeJapanese = (str: string): string => {
  // ひらがな（\u3041-\u3096）をカタカナに変換
  return str.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });
};

/**
 * タイトル履歴を部分一致で検索（ひらがな・カタカナを区別しない）
 */
export const searchTitleHistory = async (query: string): Promise<TitleHistoryItem[]> => {
  try {
    if (!query || query.trim() === '') {
      return [];
    }

    const history = await getTitleHistory();
    // クエリを正規化（ひらがな→カタカナ、小文字化）
    const normalizedQuery = normalizeJapanese(query.toLowerCase());

    // タイトルで部分一致検索（ひらがな・カタカナを区別しない）
    const filtered = history.filter((item) => {
      const normalizedTitle = normalizeJapanese(item.title.toLowerCase());
      return normalizedTitle.includes(normalizedQuery);
    });

    // 作成日時の降順でソート済み（既に新しい順に保存されている）
    return filtered.slice(0, 10); // 最大10件
  } catch (error) {
    console.error('タイトル履歴の検索エラー:', error);
    return [];
  }
};

/**
 * タイトル履歴から特定のアイテムを削除
 */
export const deleteTitleFromHistory = async (item: TitleHistoryItem): Promise<void> => {
  try {
    const history = await getTitleHistory();

    // 指定されたアイテムを除外
    const updatedHistory = history.filter(
      (historyItem) =>
        !(
          historyItem.title === item.title &&
          historyItem.startTime === item.startTime &&
          historyItem.endTime === item.endTime &&
          historyItem.isAllDay === item.isAllDay &&
          historyItem.createdAt === item.createdAt
        )
    );

    // AsyncStorageに保存
    await AsyncStorage.setItem(TITLE_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('タイトル履歴の削除エラー:', error);
  }
};

/**
 * タイトル履歴をクリア
 */
export const clearTitleHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TITLE_HISTORY_KEY);
  } catch (error) {
    console.error('タイトル履歴のクリアエラー:', error);
  }
};
