import AsyncStorage from '@react-native-async-storage/async-storage';
import { TermsService } from './termsService';

/**
 * ローカルストレージクリーンアップサービス
 * 退会時にすべてのユーザーデータを削除する
 */
export class LocalStorageCleanupService {

  /**
   * アプリで使用しているすべてのキー一覧
   */
  private static readonly STORAGE_KEYS = [
    // プロフィール関連
    'profile_name',
    'profile_image_uri',

    // 設定関連
    'weekStartDay',
    'showRokuyou',
    'selectedTimezone',
    'darkModeEnabled',

    // チャット関連
    'chatHistory',

    // パターン分析関連
    'pattern_user_hash',
    'pattern_learning_settings',

    // 通知関連
    'notification_settings',
    'scheduled_notifications',

    // 利用規約関連
    'terms_agreement',
  ];

  /**
   * ホリデーデータキーのプレフィックス
   */
  private static readonly HOLIDAY_KEY_PREFIX = 'holiday_';

  /**
   * 完全なローカルストレージクリーンアップを実行
   */
  static async cleanupAllData(): Promise<void> {
    try {
      console.log('ローカルストレージの完全クリーンアップを開始...');

      // 1. 定義済みキーを削除
      const deletePromises = this.STORAGE_KEYS.map(key =>
        AsyncStorage.removeItem(key).catch(error =>
          console.warn(`キー削除エラー (${key}):`, error)
        )
      );

      await Promise.all(deletePromises);

      // 2. ホリデーデータキーを検索して削除
      await this.cleanupHolidayData();

      console.log('✅ ローカルストレージクリーンアップ完了');

    } catch (error) {
      console.error('❌ ローカルストレージクリーンアップエラー:', error);
      throw new Error('ローカルストレージのクリーンアップに失敗しました');
    }
  }

  /**
   * ホリデーデータの削除
   */
  private static async cleanupHolidayData(): Promise<void> {
    try {
      // すべてのキーを取得
      const allKeys = await AsyncStorage.getAllKeys();

      // ホリデーデータキーをフィルター
      const holidayKeys = allKeys.filter(key =>
        key.startsWith(this.HOLIDAY_KEY_PREFIX)
      );

      if (holidayKeys.length > 0) {
        console.log(`🗑️  ${holidayKeys.length}個のホリデーデータキーを削除中...`);

        const deletePromises = holidayKeys.map(key =>
          AsyncStorage.removeItem(key).catch(error =>
            console.warn(`ホリデーデータ削除エラー (${key}):`, error)
          )
        );

        await Promise.all(deletePromises);
        console.log('✅ ホリデーデータ削除完了');
      }

    } catch (error) {
      console.warn('ホリデーデータクリーンアップエラー:', error);
    }
  }

  /**
   * 特定のカテゴリのデータのみ削除
   */
  static async cleanupCategory(category: 'profile' | 'settings' | 'chat' | 'pattern' | 'notification' | 'terms'): Promise<void> {
    try {
      let keysToDelete: string[] = [];

      switch (category) {
        case 'profile':
          keysToDelete = ['profile_name', 'profile_image_uri'];
          break;
        case 'settings':
          keysToDelete = ['weekStartDay', 'showRokuyou', 'selectedTimezone', 'darkModeEnabled'];
          break;
        case 'chat':
          keysToDelete = ['chatHistory'];
          break;
        case 'pattern':
          keysToDelete = ['pattern_user_hash', 'pattern_learning_settings'];
          break;
        case 'notification':
          keysToDelete = ['notification_settings', 'scheduled_notifications'];
          break;
        case 'terms':
          keysToDelete = ['terms_agreement'];
          break;
      }

      const deletePromises = keysToDelete.map(key =>
        AsyncStorage.removeItem(key).catch(error =>
          console.warn(`カテゴリ削除エラー (${category}/${key}):`, error)
        )
      );

      await Promise.all(deletePromises);
      console.log(`✅ ${category}カテゴリのデータ削除完了`);

    } catch (error) {
      console.error(`❌ ${category}カテゴリ削除エラー:`, error);
      throw new Error(`${category}データの削除に失敗しました`);
    }
  }

  /**
   * ストレージ使用量を取得（デバッグ用）
   */
  static async getStorageInfo(): Promise<{ totalKeys: number; holidayKeys: number; estimatedSize: string }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const holidayKeys = allKeys.filter(key => key.startsWith(this.HOLIDAY_KEY_PREFIX));

      // 簡易的なサイズ推定（各キーのデータ長を合計）
      let totalSize = 0;
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length + key.length;
          }
        } catch (error) {
          // エラーが発生したキーはスキップ
        }
      }

      return {
        totalKeys: allKeys.length,
        holidayKeys: holidayKeys.length,
        estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };

    } catch (error) {
      console.error('ストレージ情報取得エラー:', error);
      return {
        totalKeys: 0,
        holidayKeys: 0,
        estimatedSize: '不明',
      };
    }
  }
}