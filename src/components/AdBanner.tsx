import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { useAd } from '../contexts/AdContext';
import { AdRewardBottomSheet } from './AdRewardBottomSheet';
import Constants from 'expo-constants';

// AdMob バナー広告ユニットID（本番ID）
const BANNER_AD_UNIT_ID = Platform.select({
  ios: Constants.expoConfig?.extra?.admobBannerIdIos || '',
  android: Constants.expoConfig?.extra?.admobBannerIdAndroid || '',
}) || '';

interface AdBannerProps {
  position?: 'top' | 'bottom';
}

export const AdBanner: React.FC<AdBannerProps> = ({ position = 'bottom' }) => {
  const { isAdFree, checkAdFreeStatus } = useAd();
  const [showRewardSheet, setShowRewardSheet] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    // デバッグログ
    console.log('[AdBanner] バナー広告ID:', BANNER_AD_UNIT_ID);
    console.log('[AdBanner] 広告非表示状態 (isAdFree):', isAdFree);
    console.log('[AdBanner] Platform:', Platform.OS);
    console.log('[AdBanner] expoConfig.extra:', Constants.expoConfig?.extra);

    checkAdFreeStatus();
  }, []);

  // 広告非表示中は何も表示しない
  if (isAdFree) {
    return null;
  }

  // バナー広告の読み込みエラー時も非表示
  if (bannerError) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, position === 'top' && styles.containerTop]}>
        {/* バナー広告 */}
        <BannerAd
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={(error) => {
            console.error('[AdBanner] バナー広告読み込みエラー:', error);
            console.error('[AdBanner] エラー詳細:', JSON.stringify(error, null, 2));
            console.error('[AdBanner] 使用した広告ID:', BANNER_AD_UNIT_ID);
            setBannerError(true);
          }}
          onAdLoaded={() => {
            console.log('[AdBanner] バナー広告読み込み成功');
            setBannerError(false);
          }}
        />

        {/* ×ボタン */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowRewardSheet(true)}
          accessibilityLabel="広告を非表示にする"
          accessibilityRole="button"
        >
          <View style={styles.closeButtonBackground}>
            <XMarkIcon size={16} color="#333" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      {/* リワード広告ボトムシート */}
      <AdRewardBottomSheet
        isVisible={showRewardSheet}
        onClose={() => {
          setShowRewardSheet(false);
          // 閉じた後に広告非表示状態を再チェック
          checkAdFreeStatus();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  containerTop: {
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  closeButtonBackground: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
