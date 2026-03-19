import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileAds } from 'react-native-google-mobile-ads';

interface AdContextType {
  isAdFree: boolean;
  setAdFree: (duration: number) => Promise<void>;
  checkAdFreeStatus: () => Promise<void>;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

const AD_FREE_KEY = '@ad_free_until';

export const AdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdFree, setIsAdFree] = useState(false);

  // 広告非表示状態をチェック
  const checkAdFreeStatus = async () => {
    try {
      const adFreeUntil = await AsyncStorage.getItem(AD_FREE_KEY);
      if (adFreeUntil) {
        const expiryTime = parseInt(adFreeUntil, 10);
        const now = Date.now();

        if (now < expiryTime) {
          setIsAdFree(true);
        } else {
          // 期限切れの場合は削除
          await AsyncStorage.removeItem(AD_FREE_KEY);
          setIsAdFree(false);
        }
      } else {
        setIsAdFree(false);
      }
    } catch (error) {
      console.error('広告非表示状態のチェックエラー:', error);
      setIsAdFree(false);
    }
  };

  // 広告非表示状態を設定（duration: ミリ秒）
  const setAdFree = async (duration: number) => {
    try {
      const expiryTime = Date.now() + duration;
      await AsyncStorage.setItem(AD_FREE_KEY, expiryTime.toString());
      setIsAdFree(true);
      console.log(`広告非表示を設定しました: ${duration / 1000 / 60 / 60}時間`);
    } catch (error) {
      console.error('広告非表示状態の設定エラー:', error);
    }
  };

  useEffect(() => {
    const initializeAdServices = async () => {
      try {
        // AdMob初期化に遅延を追加（ネイティブモジュール初期化を待つ）
        await new Promise(resolve => setTimeout(resolve, 1000));

        // AdMob SDKの初期化を待つ
        await MobileAds().initialize();
        console.log('[AdContext] AdMob SDK初期化完了');

        // 動的インポートでrewardAdServiceを取得（早期初期化を防ぐ）
        const { rewardAdService } = await import('../services/rewardAdService');

        // AdMob初期化後にリワード広告を初期化
        rewardAdService.initializeAd();

        // 広告非表示状態をチェック
        await checkAdFreeStatus();

        // リワード広告をプリロード
        rewardAdService.loadRewardedAd();
      } catch (error) {
        console.error('[AdContext] 広告サービス初期化エラー:', error);
        // エラー時もアプリは継続（広告なしで動作）
      }
    };

    initializeAdServices();
  }, []);

  return (
    <AdContext.Provider value={{ isAdFree, setAdFree, checkAdFreeStatus }}>
      {children}
    </AdContext.Provider>
  );
};

export const useAd = (): AdContextType => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
};
