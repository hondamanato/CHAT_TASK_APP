import { useTheme } from '@/hooks/useThemeColor';
import { useResponsive } from '@/hooks/useResponsive';
import { BottomSheet } from '@/src/components/BottomSheet';
import { ChatButton } from '@/src/components/ChatButton';
import { GiftedChatScreen } from '@/src/components/chat/GiftedChatScreen';
import { CustomCalendar } from '@/src/components/CustomCalendar';
import { OfflineIndicator } from '@/src/components/OfflineIndicator';
import { Sidebar } from '@/src/components/Sidebar';
import { AdBanner } from '@/src/components/AdBanner';
import { useAuth } from '@/src/contexts/AuthContext';
import { useCalendarContext } from '@/src/contexts/CalendarContext';
import { CalendarEvent, EventCreateData, useEventContext } from '@/src/contexts/EventContext';
import { useSettings } from '@/src/contexts/SettingsContext';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Bars3Icon } from 'react-native-heroicons/outline';

function CalendarScreenContent() {
  const { user } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent, deleteRecurringEventSeries, deleteRecurringEventsFuture, getFilteredEvents, getEventsForMonth } = useEventContext();
  const { selectedCalendarId } = useCalendarContext();
  const { weekStartDay } = useSettings();
  const { colors } = useTheme();
  const { scale } = useResponsive();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [monthlyEvents, setMonthlyEvents] = useState<any[]>([]);
  // 累積型月別イベントキャッシュ
  const [cachedMonthlyEvents, setCachedMonthlyEvents] = useState<{
    [key: string]: CalendarEvent[]
  }>({});

  // 月が変更された時に動的に予定を取得（キャッシュ対応）
  const loadMonthlyEvents = async (year: number, month: number, forceReload = false) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    try {
      // キャッシュに存在し、強制再読み込みでない場合はスキップ
      if (cachedMonthlyEvents[monthKey] && !forceReload) {
        console.log('キャッシュから月の予定を取得:', monthKey, cachedMonthlyEvents[monthKey].length);
        return;
      }

      console.log('月の予定を読み込み中:', { year, month, selectedCalendarId });
      const monthEvents = await getEventsForMonth(year, month, selectedCalendarId);

      // キャッシュに追加
      setCachedMonthlyEvents(prev => ({
        ...prev,
        [monthKey]: monthEvents
      }));

      console.log('月の予定読み込み完了:', monthKey, monthEvents.length);
    } catch (error) {
      console.error('月の予定読み込みエラー:', error);
      // エラー時はキャッシュからも削除
      setCachedMonthlyEvents(prev => {
        const updated = { ...prev };
        delete updated[monthKey];
        return updated;
      });
    }
  };

  // 古いキャッシュを削除する関数
  const cleanupOldCache = (currentYear: number, currentMonth: number) => {
    const currentDate = new Date(currentYear, currentMonth, 1);
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
    const sixMonthsLater = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 1);

    setCachedMonthlyEvents(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        const cacheDate = new Date(year, month - 1, 1);

        // 現在月から±6ヶ月以上離れているキャッシュを削除
        if (cacheDate < sixMonthsAgo || cacheDate > sixMonthsLater) {
          delete updated[monthKey];
          console.log('古いキャッシュを削除:', monthKey);
        }
      });
      return updated;
    });
  };

  // 前後の月をプリロードする関数
  const preloadAdjacentMonths = async (year: number, month: number) => {
    // 前月と次月をバックグラウンドでプリロード
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    // プリロードは非同期で実行し、エラーは無視
    setTimeout(() => {
      loadMonthlyEvents(prevYear, prevMonth).catch(() => {});
      loadMonthlyEvents(nextYear, nextMonth).catch(() => {});
      // プリロード後に古いキャッシュをクリーンアップ
      cleanupOldCache(year, month);
    }, 500);
  };

  // 現在の月の予定を初期読み込み
  useEffect(() => {
    // ユーザーが未ログインの場合は何もしない
    if (!user?.id) {
      return;
    }

    // カレンダー切り替え時はキャッシュをクリア
    setCachedMonthlyEvents({});

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    loadMonthlyEvents(year, month).then(() => {
      // 初期読み込み完了後に前後の月をプリロード
      preloadAdjacentMonths(year, month);
    });
  }, [selectedCalendarId, user?.id]);

  // 月変更時の処理
  const handleMonthChange = (year: number, month: number) => {
    setCurrentMonth(new Date(year, month, 1));
    loadMonthlyEvents(year, month).then(() => {
      // 月変更後に前後の月をプリロード
      preloadAdjacentMonths(year, month);
    });
  };

  // キャッシュ済みの月の予定とローカルのイベントを統合
  const filteredEvents = useMemo(() => {
    // ローカルの単発予定も含める（繰り返し予定の親イベントは除外）
    const localSingleEvents = getFilteredEvents(selectedCalendarId).filter(event =>
      !event.recurrence || event.recurrence.type === 'none'
    );

    // キャッシュ済みのすべての月の予定を統合
    const allCachedEvents: CalendarEvent[] = [];
    Object.values(cachedMonthlyEvents).forEach(monthEvents => {
      allCachedEvents.push(...monthEvents);
    });

    // キャッシュ済み予定、従来の月次予定、ローカル予定をマージ
    const allEvents = [...allCachedEvents, ...monthlyEvents, ...localSingleEvents];

    // 重複を除去（IDベース）
    const uniqueEvents = allEvents.filter((event, index, self) =>
      index === self.findIndex((e) => e.id === event.id)
    );

    return uniqueEvents;
  }, [cachedMonthlyEvents, monthlyEvents, events, selectedCalendarId, getFilteredEvents]);

  // イベントをmarkedDates形式に変換（CustomCalendar用）
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    // デバッグ用ログ
    console.log('=== markedDates生成開始 ===');
    console.log('filteredEvents:', filteredEvents.length);

    // 各日付の予定リストを作成
    filteredEvents.forEach(event => {
      // 開始日と終了日を計算
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      // 日付部分のみを比較して単日・複数日を判定
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const isMultiDay = startDateOnly.getTime() !== endDateOnly.getTime();

      console.log('Event:', {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay,
        isMultiDay: isMultiDay,
        startDateOnly: startDateOnly.toISOString(),
        endDateOnly: endDateOnly.toISOString()
      });

      // 日付をまたぐ予定の場合は各日に追加
      const currentDate = new Date(startDateOnly);
      while (currentDate <= endDateOnly) {
        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        if (!marked[dateString]) {
          marked[dateString] = {
            hasEvent: true,
            events: [],
          };
        }

        // 予定情報を追加
        marked[dateString].events.push({
          id: event.id,
          title: event.title,
          color: event.color || '#007AFF',
          start: event.start,
          end: event.end,
          isAllDay: event.isAllDay,
          location: event.location,
          notes: event.notes,
          isStart: currentDate.getTime() === startDateOnly.getTime(),
          isEnd: currentDate.getTime() === endDateOnly.getTime(),
          isMultiDay: isMultiDay,
          isRecurring: event.id.startsWith('recurring_') || (event as any).isRecurringInstance,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // デバッグ用ログ
    console.log('=== markedDates生成結果 ===');
    Object.entries(marked).forEach(([date, data]) => {
      if (data.events && data.events.length > 0) {
        console.log(`${date}:`, data.events.length, 'events');
        data.events.forEach((event: any, index: number) => {
          console.log(`  Event ${index}:`, { id: event.id, title: event.title, isMultiDay: event.isMultiDay });
        });
      }
    });

    return marked;
  }, [filteredEvents]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleSelectedDatePress = (date: string) => {
    setShowBottomSheet(true);
  };

  const handleChatPress = () => {
    setShowChat(true);
  };

  const handleChatClose = () => {
    setShowChat(false);
  };


  const handleEventCreateFromChat = async (eventData: EventCreateData) => {
    try {
      // カレンダーIDを追加
      const eventWithCalendarId = {
        ...eventData,
        calendarId: selectedCalendarId
      };

      console.log('🔍 AIチャットから作成される予定:', {
        originalEventData: eventData,
        eventWithCalendarId: eventWithCalendarId
      });

      await addEvent(eventWithCalendarId);
      console.log('✅ 予定追加成功:', eventData.title);

      // 繰り返し予定の場合は全キャッシュを強制再読み込み
      if (eventData.recurrence && eventData.recurrence.type !== 'none') {
        console.log('🔄 繰り返し予定: 全キャッシュを再読み込み');
        // キャッシュ済みのすべての月を強制再読み込み
        const cachedMonthKeys = Object.keys(cachedMonthlyEvents);
        for (const monthKey of cachedMonthKeys) {
          const [year, month] = monthKey.split('-').map(Number);
          await loadMonthlyEvents(year, month - 1, true);
        }

        // 現在月も確実に再読み込み
        await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
      } else {
        // シフト予定（単発予定）の場合は該当する月を特定して再読み込み
        console.log('🔄 単発予定: 該当する月を特定して再読み込み');

        // イベントの日付から年月を抽出
        const eventDate = new Date(eventData.date);
        const eventYear = eventDate.getFullYear();
        const eventMonth = eventDate.getMonth();

        console.log(`📅 予定の年月: ${eventYear}年${eventMonth + 1}月 (日付: ${eventData.date})`);

        // 該当する月のキャッシュを再読み込み
        await loadMonthlyEvents(eventYear, eventMonth, true);
        console.log(`✅ ${eventYear}年${eventMonth + 1}月のキャッシュを再読み込み完了`);

        // 現在表示中の月も再読み込み（該当月と異なる場合）
        const currentYear = currentMonth.getFullYear();
        const currentMonthIndex = currentMonth.getMonth();

        if (eventYear !== currentYear || eventMonth !== currentMonthIndex) {
          console.log(`🔄 現在表示中の月(${currentYear}年${currentMonthIndex + 1}月)も再読み込み`);
          await loadMonthlyEvents(currentYear, currentMonthIndex, true);
        }
      }

      console.log('🎉 カレンダー更新完了');
    } catch (error) {
      console.error('❌ AIチャットからの予定作成エラー:', error);
    }
  };


  // 年月の日本語表示を生成
  const formatMonthYear = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };




  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryBackground }]}>
        <TouchableOpacity
          style={[
            styles.hamburgerButton,
            {
              width: scale(24),
              height: scale(24),
            }
          ]}
          onPress={() => setShowSidebar(true)}
        >
          <Bars3Icon size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.primaryText }]}>{formatMonthYear(currentMonth)}</Text>
        <View style={{ width: scale(24), height: scale(24) }} />
      </View>

      {/* バナー広告 */}
      <AdBanner position="top" />

      <View style={styles.calendarContainer}>
        <CustomCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          markedDates={markedDates}
          onMonthChange={handleMonthChange}
          onSelectedDatePress={handleSelectedDatePress}
          weekStartDay={weekStartDay}
        />
        
      </View>
      
      <OfflineIndicator />

      {/* AIチャットボタン */}
      <ChatButton onPress={handleChatPress} />

      <Sidebar
        isVisible={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      <BottomSheet
        isVisible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        selectedDate={selectedDate}
        events={filteredEvents}
        onEventCreate={async (eventData) => {
          // カレンダーIDを追加
          const eventWithCalendarId = {
            ...eventData,
            calendarId: selectedCalendarId
          };
          await addEvent(eventWithCalendarId);

          // 繰り返し予定の場合は全キャッシュを強制再読み込み
          if (eventData.recurrence && eventData.recurrence.type !== 'none') {
            // キャッシュ済みのすべての月を強制再読み込み
            const cachedMonthKeys = Object.keys(cachedMonthlyEvents);
            for (const monthKey of cachedMonthKeys) {
              const [year, month] = monthKey.split('-').map(Number);
              await loadMonthlyEvents(year, month - 1, true);
            }

            // 現在月も確実に再読み込み
            await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
          }

          setShowBottomSheet(false);
        }}
        onEventUpdate={async (id, eventData) => {
          // EventCreateDataとしてUpdateEventに渡す（EventContext内で変換される）
          await updateEvent(id, eventData);
          // 更新完了後に月の予定を強制再読み込み
          await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
          setShowBottomSheet(false);
        }}
        onEventDelete={async (id) => {
          await deleteEvent(id, () => {
            // 削除完了後に月の予定を強制再読み込み
            loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
          });
          setShowBottomSheet(false);
        }}
        onDeleteRecurringSeries={async (seriesId) => {
          await deleteRecurringEventSeries(seriesId, async () => {
            // キャッシュ済みのすべての月を強制再読み込み
            const cachedMonthKeys = Object.keys(cachedMonthlyEvents);
            for (const monthKey of cachedMonthKeys) {
              const [year, month] = monthKey.split('-').map(Number);
              await loadMonthlyEvents(year, month - 1, true);
            }

            // 現在月も確実に再読み込み
            await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
          });
          setShowBottomSheet(false);
        }}
        onDeleteRecurringFuture={async (eventId) => {
          await deleteRecurringEventsFuture(eventId, async () => {
            // キャッシュ済みのすべての月を強制再読み込み
            const cachedMonthKeys = Object.keys(cachedMonthlyEvents);
            for (const monthKey of cachedMonthKeys) {
              const [year, month] = monthKey.split('-').map(Number);
              await loadMonthlyEvents(year, month - 1, true);
            }

            // 現在月も確実に再読み込み
            await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
          });
          setShowBottomSheet(false);
        }}
      />

      {/* AIチャット画面 */}
      <Modal
        visible={showChat}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        <GiftedChatScreen
          isVisible={showChat}
          onClose={handleChatClose}
          onEventCreate={handleEventCreateFromChat}
          onEventUpdate={async (id, eventData) => {
            // EventCreateDataとしてUpdateEventに渡す（EventContext内で変換される）
            await updateEvent(id, eventData);
            // 更新完了後に月の予定を強制再読み込み
            await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
          }}
          onEventDelete={async (id) => {
            await deleteEvent(id, () => {
              // 削除完了後に月の予定を強制再読み込み
              loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
            });
          }}
          existingEvents={filteredEvents}
        />
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
  },
  hamburgerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
    position: 'relative',
  },
});

export default function CalendarScreen() {
  return <CalendarScreenContent />;
}
