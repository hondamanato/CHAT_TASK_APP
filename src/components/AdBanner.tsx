import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
  size?: BannerAdSize;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  position = 'bottom',
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER
}) => {
  const { isAdFree, checkAdFreeStatus } = useAd();
  const [showRewardSheet, setShowRewardSheet] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // バナー広告の読み込みエラー時は非表示（no-fillはユーザーに見せるべきエラーではない）
  if (bannerError) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, position === 'top' && styles.containerTop]}>
        {/* バナー広告エリア */}
        <View style={styles.adArea}>
          <BannerAd
            unitId={BANNER_AD_UNIT_ID}
            size={size}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdFailedToLoad={(error) => {
              console.error('[AdBanner] バナー広告読み込みエラー:', error);
              console.error('[AdBanner] エラー詳細:', JSON.stringify(error, null, 2));
              console.error('[AdBanner] 使用した広告ID:', BANNER_AD_UNIT_ID);
              setErrorMessage(error.message || `Code: ${error.code || 'Unknown'}`);
              setBannerError(true);
            }}
            onAdLoaded={() => {
              console.log('[AdBanner] バナー広告読み込み成功');
              setBannerError(false);
            }}
          />
        </View>

        {/* 広告コントロールバー（広告の外側に配置） */}
        <View style={styles.controlBar}>
          <Text style={styles.adLabel}>広告</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowRewardSheet(true)}
            accessibilityLabel="広告を非表示にする"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>非表示</Text>
            <XMarkIcon size={14} color="#666" strokeWidth={2} />
          </TouchableOpacity>
        </View>
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
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  containerTop: {
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  adArea: {
    width: '100%',
    alignItems: 'center',
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  adLabel: {
    fontSize: 11,
    color: '#888',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeButtonText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
});
