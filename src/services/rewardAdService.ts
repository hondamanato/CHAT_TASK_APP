import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

// AdMob リワード広告ユニットID（本番ID）
const REWARDED_AD_UNIT_ID = Platform.select({
  ios: Constants.expoConfig?.extra?.admobRewardIdIos || '',
  android: Constants.expoConfig?.extra?.admobRewardIdAndroid || '',
}) || '';

class RewardAdService {
  private rewardedAd: RewardedAd | null = null;
  private isAdLoaded: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // 何もしない（遅延初期化 - AdMob SDK初期化後にinitializeAd()を呼ぶ）
  }

  // リワード広告を初期化（AdMob SDK初期化後に呼ぶこと）
  initializeAd() {
    if (this.isInitialized) {
      console.log('[RewardAd] 既に初期化済みです');
      return;
    }

    try {
      console.log('[RewardAd] リワード広告を初期化中...');
      console.log('[RewardAd] リワード広告ID:', REWARDED_AD_UNIT_ID);
      console.log('[RewardAd] Platform:', Platform.OS);
      console.log('[RewardAd] expoConfig.extra:', Constants.expoConfig?.extra);

      this.rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);

      // 広告読み込み完了イベント
      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[RewardAd] リワード広告の読み込み完了');
        this.isAdLoaded = true;
      });

      // 広告読み込み失敗イベント（古いバージョンのAPIではERRORイベントは存在しない場合がある）
      // this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
      //   console.error('[RewardAd] リワード広告の読み込みエラー:', error);
      //   this.isAdLoaded = false;
      // });

      this.isInitialized = true;
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

      // 広告が閉じられたイベント（古いバージョンではCLOSEDではなく別のイベント名を使用）
      const dismissListener = this.rewardedAd.addAdEventListener(
        'closed' as any,
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
