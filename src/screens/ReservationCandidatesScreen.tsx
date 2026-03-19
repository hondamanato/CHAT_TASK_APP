/**
 * ReservationCandidatesScreen
 * Gmailから取得した予約候補を表示するフルスクリーンモーダル
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  ChevronLeftIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from 'react-native-heroicons/outline';
import { useGmail } from '../contexts/GmailContext';
import { ReservationCard } from '../components/ReservationCard';
import { GmailReservation, ReservationEventData } from '../types/gmail';
import { useTheme } from '@/hooks/useThemeColor';

interface ReservationCandidatesScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onAddToCalendar: (eventData: ReservationEventData) => Promise<void>;
}

/**
 * ReservationCandidatesScreen コンポーネント
 */
export const ReservationCandidatesScreen: React.FC<ReservationCandidatesScreenProps> = ({
  isVisible,
  onClose,
  onAddToCalendar,
}) => {
  const { colors } = useTheme();
  const {
    authState,
    reservations,
    isLoading,
    error,
    isInitialized,
    signIn,
    signOut,
    fetchReservations,
    clearError,
    getReservationEventData,
    initialize,
  } = useGmail();

  const [addingReservationId, setAddingReservationId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // 画面表示時に初期化を実行
  useEffect(() => {
    if (isVisible && !isInitialized) {
      initialize();
    }
  }, [isVisible, isInitialized, initialize]);

  // 初期化完了後、認証済みなら予約を取得
  useEffect(() => {
    if (isVisible && isInitialized && authState.isLinked && reservations.length === 0) {
      fetchReservations();
    }
  }, [isVisible, isInitialized, authState.isLinked]);

  // プルトゥリフレッシュ
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchReservations();
    } finally {
      setRefreshing(false);
    }
  };

  // Googleサインイン
  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (err: any) {
      Alert.alert('エラー', err.message || 'サインインに失敗しました');
    }
  };

  // サインアウト
  const handleSignOut = async () => {
    Alert.alert(
      'サインアウト',
      'Googleアカウントとの連携を解除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'サインアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (err: any) {
              Alert.alert('エラー', err.message || 'サインアウトに失敗しました');
            }
          },
        },
      ]
    );
  };

  // カレンダーに追加
  const handleAddToCalendar = async (reservation: GmailReservation) => {
    if (addedIds.has(reservation.id)) {
      Alert.alert('確認', 'この予約は既にカレンダーに追加されています');
      return;
    }

    setAddingReservationId(reservation.id);
    try {
      // 予約情報をイベントデータに変換
      const eventData = getReservationEventData(reservation);
      // 親コンポーネント（index.tsx）でカレンダーに追加
      await onAddToCalendar(eventData);
      setAddedIds(prev => new Set(prev).add(reservation.id));
      Alert.alert('完了', 'カレンダーに追加しました');
    } catch (err: any) {
      Alert.alert('エラー', err.message || 'カレンダーへの追加に失敗しました');
    } finally {
      setAddingReservationId(null);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ChevronLeftIcon size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
          予約候補
        </Text>
        <View style={styles.headerRight}>
          {authState.isLinked && (
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <ArrowPathIcon size={22} color={colors.primaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* コンテンツ */}
      {!authState.isLinked ? (
        // 未ログイン状態
        <View style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: '#007AFF20' }]}>
            <EnvelopeIcon size={48} color="#007AFF" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>
            Gmailと連携
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.secondaryText }]}>
            Gmailに届いた予約メールから{'\n'}
            自動でカレンダーに追加できます
          </Text>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.googleButtonText}>Googleでサインイン</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.privacyNote, { color: colors.secondaryText }]}>
            ※ 予約メールのみを読み取ります{'\n'}
            メールの送信や削除は行いません
          </Text>
        </View>
      ) : isLoading && reservations.length === 0 ? (
        // ローディング状態
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            予約情報を取得中...
          </Text>
        </View>
      ) : error ? (
        // エラー状態
        <View style={styles.centerContent}>
          <ExclamationCircleIcon size={48} color="#ef4444" />
          <Text style={[styles.errorText, { color: colors.primaryText }]}>
            エラーが発生しました
          </Text>
          <Text style={[styles.errorDescription, { color: colors.secondaryText }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: colors.borderColor }]}
            onPress={() => {
              clearError();
              fetchReservations();
            }}
          >
            <Text style={[styles.retryButtonText, { color: '#007AFF' }]}>
              再試行
            </Text>
          </TouchableOpacity>
        </View>
      ) : reservations.length === 0 ? (
        // 予約なし
        <View style={styles.centerContent}>
          <EnvelopeIcon size={48} color={colors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>
            予約が見つかりません
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.secondaryText }]}>
            Gmailに予約確認メールがある場合は{'\n'}
            自動的に検出されます
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: colors.borderColor }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: '#007AFF' }]}>
              再読み込み
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // 予約リスト
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.secondaryText}
            />
          }
        >
          {/* アカウント情報 */}
          <View style={[styles.accountInfo, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.accountLeft}>
              <Text style={[styles.accountLabel, { color: colors.secondaryText }]}>
                連携中のアカウント
              </Text>
              <Text style={[styles.accountEmail, { color: colors.primaryText }]}>
                {authState.email}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSignOut}>
              <Text style={styles.signOutText}>連携解除</Text>
            </TouchableOpacity>
          </View>

          {/* 予約数 */}
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
            {reservations.length}件の予約が見つかりました
          </Text>

          {/* 予約カード */}
          {reservations.map(reservation => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onAddToCalendar={handleAddToCalendar}
              isAdding={addingReservationId === reservation.id}
            />
          ))}

          {/* 下部余白 */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  refreshButton: {
    padding: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  accountLeft: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});
