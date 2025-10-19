import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// AdMob リワード広告ユニットID
// TestFlight対応: テスト用IDを使用（App Store公開時に本番IDに変更）
const REWARDED_AD_UNIT_ID = TestIds.REWARDED;

class RewardAdService {
  private rewardedAd: RewardedAd | null = null;
  private isAdLoaded: boolean = false;

  constructor() {
    this.initializeAd();
  }

  // リワード広告を初期化
  initializeAd() {
    try {
      console.log('[RewardAd] リワード広告を初期化中...');
      this.rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);

      // 広告読み込み完了イベント
      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[RewardAd] リワード広告の読み込み完了');
        this.isAdLoaded = true;
      });

      // 広告読み込み失敗イベント
      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
        console.error('[RewardAd] リワード広告の読み込みエラー:', error);
        this.isAdLoaded = false;
      });

      console.log('[RewardAd] AdMob初期化完了');
    } catch (error) {
      console.error('[RewardAd] AdMob初期化エラー:', error);
    }
  }

  // リワード広告を読み込み
  async loadRewardedAd(): Promise<boolean> {
    if (this.isAdLoaded) {
      console.log('[RewardAd] 広告は既に読み込まれています');
      return true;
    }

    if (!this.rewardedAd) {
      this.initializeAd();
    }

    try {
      console.log('[RewardAd] リワード広告を読み込み中...');
      await this.rewardedAd?.load();
      return true;
    } catch (error) {
      console.error('[RewardAd] リワード広告の読み込みエラー:', error);
      this.isAdLoaded = false;
      return false;
    }
  }

  // リワード広告を表示
  async showRewardedAd(
    onRewarded: () => void,
    onDismissed?: () => void
  ): Promise<void> {
    try {
      // 広告が読み込まれていない場合は読み込む
      if (!this.isAdLoaded) {
        const loaded = await this.loadRewardedAd();
        if (!loaded) {
          throw new Error('広告の読み込みに失敗しました');
        }
      }

      if (!this.rewardedAd) {
        throw new Error('広告が初期化されていません');
      }

      // 報酬取得イベントのリスナー
      const earnedRewardListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('[RewardAd] ユーザーが報酬を獲得:', reward);
          onRewarded();
        }
      );

      // 広告が閉じられたイベント
      const dismissListener = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.CLOSED,
        () => {
          console.log('[RewardAd] リワード広告が閉じられました');
          this.isAdLoaded = false;

          // リスナーをクリーンアップ
          earnedRewardListener();
          dismissListener();

          if (onDismissed) {
            onDismissed();
          }

          // 次の広告をプリロード
          this.loadRewardedAd();
        }
      );

      // 広告を表示
      console.log('[RewardAd] リワード広告を表示中...');
      await this.rewardedAd.show();
    } catch (error) {
      console.error('[RewardAd] リワード広告の表示エラー:', error);
      this.isAdLoaded = false;
      throw error;
    }
  }

  // 広告が読み込まれているかチェック
  isReady(): boolean {
    return this.isAdLoaded;
  }

  // クリーンアップ
  cleanup() {
    this.rewardedAd = null;
    this.isAdLoaded = false;
  }
}

// シングルトンインスタンス
export const rewardAdService = new RewardAdService();
