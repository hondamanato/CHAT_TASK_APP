import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { UserIcon } from 'react-native-heroicons/outline';
import { AdBanner } from './AdBanner';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { EventCreateScreen } from '../screens/EventCreateScreen';
import { CalendarEvent } from '../contexts/EventContext';
import { BaseBottomSheet } from './BaseBottomSheet';
import { useTheme } from '@/hooks/useThemeColor';
import { useAuth } from '../contexts/AuthContext';

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDate?: string;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, event: any) => void;
  onEventDelete?: (id: string) => void;
  onDeleteRecurringSeries?: (seriesId: string) => void;
  onDeleteRecurringFuture?: (eventId: string) => void;
  events?: CalendarEvent[];
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  selectedDate,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onDeleteRecurringSeries,
  onDeleteRecurringFuture,
  events = [],
}) => {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [showEventCreate, setShowEventCreate] = useState(false);
  const [scrollViewAtTop, setScrollViewAtTop] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentUserProfileImage, setCurrentUserProfileImage] = useState<string | null>(null);

  // 選択された日の予定をフィルタリング
  const dayEvents = events.filter(event => {
    if (!selectedDate) return false;

    // 開始日と終了日を取得
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    // 日付部分のみを比較
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // 選択された日付をDateオブジェクトに変換
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selectedDateOnly = new Date(year, month - 1, day);

    // 選択された日がイベント期間内にあるかチェック
    return selectedDateOnly >= startDateOnly && selectedDateOnly <= endDateOnly;
  });

  // 予定を時間順にソート（全日イベントを先頭に）
  const sortedEvents = dayEvents.sort((a, b) => {
    // 全日イベントを先頭に
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    
    // 両方とも全日または両方とも時間指定の場合は開始時間順
    if (a.start.getTime() !== b.start.getTime()) {
      return a.start.getTime() - b.start.getTime();
    }
    
    // 開始時間が同じ場合は期間が長い順
    const durationA = b.end.getTime() - b.start.getTime();
    const durationB = a.end.getTime() - a.start.getTime();
    
    if (durationB !== durationA) {
      return durationB - durationA;
    }
    return a.id.localeCompare(b.id);
  });

  // 現在のユーザーのプロフィール画像を読み込み
  useEffect(() => {
    if (isVisible && profile?.profile_image_uri) {
      setCurrentUserProfileImage(profile.profile_image_uri);
    }
  }, [isVisible, profile]);

  // SVG URLかどうかを判定
  const isSvgUrl = (url: string) => url.includes('.svg');

  // 日付のフォーマット
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  // 曜日を取得
  const getDayOfWeek = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `（${days[date.getDay()]}）`;
  };

  // 時間をフォーマット
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // 新しい予定を作成
  const handleCreateEvent = () => {
    setEditingEvent(null);
    onClose(); // メインボトムシートを閉じる
    setShowEventCreate(true);
  };

  // 予定を編集
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    onClose(); // メインボトムシートを閉じる
    setShowEventCreate(true);
  };

  // EventCreateScreenから戻る
  const handleEventCreateClose = () => {
    setShowEventCreate(false);
    setEditingEvent(null);
  };

  // スクロール位置の監視
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const atTop = contentOffset.y <= 0;
    setScrollViewAtTop(atTop);
  };

  return (
    <>
      {/* メインの予定一覧ボトムシート */}
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.9}
        showHandle={true}
        showCloseButton={false}
        disableSwipeWhenScrollAtTop={!scrollViewAtTop}
      >
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.dateText, { color: colors.primaryText }]}>
            {formatDate(selectedDate)}
            {getDayOfWeek(selectedDate)}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.buttonPrimary }]}
            onPressIn={handleCreateEvent}
          >
            <Text style={[styles.addButtonText, { color: colors.primaryBackground }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 予定一覧 */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.eventsList}>
            {sortedEvents.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <Image
                  source={require('@/assets/images/mascot-tired.png')}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
                <Text style={[styles.noEventsText, { color: colors.secondaryText }]}>予定はありません</Text>
                <TouchableOpacity
                  style={[styles.createEventButton, { backgroundColor: colors.buttonPrimary }]}
                  onPress={handleCreateEvent}
                >
                  <Text style={[styles.createEventButtonText, { color: colors.primaryBackground }]}>予定を作成</Text>
                </TouchableOpacity>
              </View>
            ) : (
              sortedEvents.map((event) => {
                // 他のユーザーが作成した予定かチェック
                const isOtherUser = event.userId && user?.id && event.userId !== user.id;

                // 表示するプロフィール画像を決定
                const displayImageUri = isOtherUser
                  ? event.creatorImageUri
                  : currentUserProfileImage;

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventItem, { backgroundColor: colors.surfaceBackground, borderColor: colors.border }]}
                    onPress={() => handleEditEvent(event)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventMainContent}>
                      <View style={styles.eventInfo}>
                        <View style={styles.eventTimeContainer}>
                          <View
                            style={[
                              styles.eventColorDot,
                              { backgroundColor: event.color || '#007AFF' }
                            ]}
                          />
                          <Text style={[styles.eventTime, { color: colors.secondaryText }]}>
                            {event.isAllDay
                              ? '終日'
                              : `${formatTime(event.start)} - ${formatTime(event.end)}`
                            }
                          </Text>
                        </View>
                        <Text style={[styles.eventTitle, { color: colors.primaryText }]}>{event.title}</Text>
                        {event.location?.name && (
                          <Text style={[styles.eventLocation, { color: colors.secondaryText }]}>📍 {event.location.name}</Text>
                        )}
                        {event.notes && (
                          <Text style={[styles.eventNotes, { color: colors.secondaryText }]} numberOfLines={2}>
                            {event.notes}
                          </Text>
                        )}
                      </View>

                      {/* ユーザーアイコン（すべての予定に表示） */}
                      <View style={styles.userAvatarContainer}>
                        {displayImageUri ? (
                          isSvgUrl(displayImageUri) ? (
                            <SvgUri
                              uri={displayImageUri}
                              width={32}
                              height={32}
                            />
                          ) : (
                            <Image
                              source={{ uri: displayImageUri }}
                              style={styles.userAvatar}
                            />
                          )
                        ) : (
                          <View style={styles.userAvatarPlaceholder}>
                            <UserIcon size={16} color="#9CA3AF" />
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* 広告エリア */}
          <View style={styles.adContainer}>
            <AdBanner position="bottom" size={BannerAdSize.MEDIUM_RECTANGLE} />
          </View>
        </ScrollView>
      </BaseBottomSheet>

      {/* 予定作成・編集ボトムシート */}
      <BaseBottomSheet
        isVisible={showEventCreate}
        onClose={handleEventCreateClose}
        height={0.9}
        showHandle={true}
        showCloseButton={true}
        disableSwipeWhenScrollAtTop={!scrollViewAtTop}
      >
        <EventCreateScreen
          isVisible={true}
          onClose={handleEventCreateClose}
          onSave={(eventData) => {
            if (editingEvent && onEventUpdate) {
              onEventUpdate(editingEvent.id, eventData);
            } else if (onEventCreate) {
              onEventCreate(eventData);
            }
            handleEventCreateClose();
          }}
          onDelete={editingEvent ? (eventId) => {
            if (onEventDelete) {
              onEventDelete(eventId);
            }
            // 削除処理は非同期なので、呼び出し元で画面を閉じる
          } : undefined}
          onDeleteRecurringSeries={onDeleteRecurringSeries ? (seriesId) => {
            onDeleteRecurringSeries(seriesId);
            // 削除処理は非同期なので、呼び出し元で画面を閉じる
          } : undefined}
          onDeleteRecurringFuture={onDeleteRecurringFuture ? (eventId) => {
            onDeleteRecurringFuture(eventId);
            // 削除処理は非同期なので、呼び出し元で画面を閉じる
          } : undefined}
          initialDate={selectedDate}
          editingEvent={editingEvent}
          existingEvents={events}
          onScrollChange={setScrollViewAtTop}
        />
      </BaseBottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  eventsList: {
    paddingBottom: 20,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  mascotImage: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  noEventsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  createEventButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createEventButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  eventItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  eventTime: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  eventNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  eventMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventInfo: {
    flex: 1,
    marginRight: 8,
  },
  userAvatarContainer: {
    marginLeft: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adContainer: {
    width: '100%',
    marginTop: 20,
    marginHorizontal: -20,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
  },
});