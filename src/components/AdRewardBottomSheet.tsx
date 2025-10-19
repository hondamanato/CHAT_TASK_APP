import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { ArrowPathIcon, ChartBarIcon, ChevronRightIcon } from 'react-native-heroicons/outline';
import { rewardAdService } from '../services/rewardAdService';
import { useAd } from '../contexts/AdContext';
import { useTheme } from '@/hooks/useThemeColor';
import Constants from 'expo-constants';

interface AdRewardBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AdRewardBottomSheet: React.FC<AdRewardBottomSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAdFree } = useAd();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  // モーダルが開いたらアニメーションをリセット
  useEffect(() => {
    if (isVisible) {
      translateY.value = 0;
    }
  }, [isVisible]);

  // 下スワイプジェスチャー
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        // 100px以上下にスワイプしたら閉じる
        translateY.value = withTiming(400, { duration: 200 }, () => {
          runOnJS(onClose)();
        });
      } else {
        // 元の位置に戻す
        translateY.value = withSpring(0);
      }
    });

  // アニメーションスタイル
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // オプション1: リワード広告を表示
  const handleWatchAd = async () => {
    setIsLoading(true);

    try {
      await rewardAdService.showRewardedAd(
        // 報酬取得時のコールバック
        async () => {
          console.log('[AdReward] ユーザーが報酬を獲得しました');
          // 24時間広告を非表示にする
          await setAdFree(24 * 60 * 60 * 1000);
          Alert.alert(
            '広告を非表示にしました',
            '24時間、アプリ内の全ての広告が非表示になります。',
            [{ text: 'OK', onPress: () => onClose() }]
          );
        },
        // 広告が閉じられた時のコールバック
        () => {
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('[AdReward] リワード広告の表示エラー:', error);
      setIsLoading(false);
      Alert.alert(
        'エラー',
        '広告の読み込みに失敗しました。しばらくしてから再度お試しください。',
        [{ text: 'OK' }]
      );
    }
  };

  // オプション2: フィードバックメールを送信
  const handleFeedback = async () => {
    const supportEmail = Constants.expoConfig?.extra?.supportEmail || 'support@example.com';
    const subject = encodeURIComponent('カレンダーアプリへのご意見・ご要望');
    const body = encodeURIComponent('');
    const mailtoUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        onClose();
      } else {
        Alert.alert(
          'エラー',
          'メールアプリを開けませんでした。',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[Feedback] メールアプリ起動エラー:', error);
      Alert.alert(
        'エラー',
        'メールアプリを開けませんでした。',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 背景タップで閉じる */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: Math.max(insets.bottom + 20, 34),
              },
              animatedStyle,
            ]}
          >
            {/* ドラッグハンドル */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: isDarkMode ? '#48484A' : '#C6C6C8' }]} />
            </View>

            {/* オプション1: 短い動画を見て広告を非表示にする */}
            <TouchableOpacity
              style={[
                styles.option,
                { borderBottomColor: isDarkMode ? '#38383A' : '#E5E5E7' },
              ]}
              onPress={handleWatchAd}
              disabled={isLoading}
            >
              <View style={styles.optionLeft}>
                <View style={styles.iconContainer}>
                  <ArrowPathIcon size={24} color="#34C759" strokeWidth={2} />
                </View>
                <Text style={[styles.optionText, { color: colors.primaryText }]}>
                  短い動画を見て広告を非表示にする
                </Text>
              </View>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.secondaryText} />
              ) : (
                <ChevronRightIcon size={20} color={colors.secondaryText} strokeWidth={2} />
              )}
            </TouchableOpacity>

            {/* オプション2: ご意見・ご要望はこちら */}
            <TouchableOpacity
              style={styles.option}
              onPress={handleFeedback}
            >
              <View style={styles.optionLeft}>
                <View style={styles.iconContainer}>
                  <ChartBarIcon size={24} color="#34C759" strokeWidth={2} />
                </View>
                <Text style={[styles.optionText, { color: colors.primaryText }]}>
                  ご意見・ご要望はこちら
                </Text>
              </View>
              <ChevronRightIcon size={20} color={colors.secondaryText} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 60,
    borderBottomWidth: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
});
