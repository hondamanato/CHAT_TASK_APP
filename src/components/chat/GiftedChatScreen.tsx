import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Text,
} from 'react-native';
import { GiftedChat, IMessage, Actions } from 'react-native-gifted-chat';
import { XMarkIcon, PaperClipIcon, XCircleIcon } from 'react-native-heroicons/outline';
import { hybridAIService } from '../../services/hybridAIService';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { t } from '../../i18n';
import {
  CustomMessage,
  AI_USER,
  createCurrentUser,
  convertToGiftedMessage,
  OldMessage,
} from '../../types/giftedChat';
import { EventEntry } from '../../services/hybridAIService';

// AsyncStorageキー: シフト解析用の名前
const SHIFT_NAME_KEY = '@shift_analysis_name';

interface GiftedChatScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, eventData: any) => void;
  onEventDelete?: (id: string) => void;
  existingEvents?: Array<{id: string; title: string; start: string; end: string}>;
}

export const GiftedChatScreen: React.FC<GiftedChatScreenProps> = ({
  isVisible,
  onClose,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  existingEvents = [],
}) => {
  const { profile } = useAuth();
  const { selectedTimezone } = useSettings();
  const { locale } = useLocalization();

  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // 名前確認関連の状態
  const [isWaitingForName, setIsWaitingForName] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  // イベント確認関連の状態
  const [waitingForEventConfirmation, setWaitingForEventConfirmation] = useState(false);
  const [analyzedEvents, setAnalyzedEvents] = useState<EventEntry[]>([]);

  // 現在のユーザー（メモ化して無限ループを防止）
  const currentUser = useMemo(() => {
    return profile
      ? createCurrentUser(
          profile.id,
          profile.name || 'User',
          profile.profile_image_url
        )
      : createCurrentUser('temp-user', 'User');
  }, [profile?.id, profile?.name, profile?.profile_image_url]);

  // チャット履歴の読み込み
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        // 新形式を試す
        let storedMessages = await AsyncStorage.getItem('@chat_history_v2');

        if (storedMessages) {
          try {
            const parsed = JSON.parse(storedMessages);
            if (Array.isArray(parsed)) {
              const restored = parsed
                .map((msg: any) => ({
                  ...msg,
                  createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
                }))
                .filter(msg => {
                  // Invalid Dateを除外
                  return msg.createdAt.toString() !== 'Invalid Date';
                });
              setMessages(restored);
            } else {
              console.error('チャット履歴が配列ではありません。削除します。');
              await AsyncStorage.removeItem('@chat_history_v2');
            }
          } catch (parseError) {
            console.error('チャット履歴のパースエラー:', parseError);
            await AsyncStorage.removeItem('@chat_history_v2');
          }
        } else {
          // 旧形式から移行
          const oldMessages = await AsyncStorage.getItem('@chat_history');
          if (oldMessages) {
            const parsed: OldMessage[] = JSON.parse(oldMessages);
            const migrated = parsed.map((msg) =>
              convertToGiftedMessage(
                {
                  ...msg,
                  timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
                },
                currentUser._id.toString(),
                currentUser.name,
                currentUser.avatar
              )
            );
            setMessages(migrated);
            // 新形式で保存
            await AsyncStorage.setItem(
              '@chat_history_v2',
              JSON.stringify(migrated)
            );
          } else if (isVisible) {
            // 初回表示時の挨拶メッセージ
            const welcomeMessage: CustomMessage = {
              _id: Date.now().toString(),
              text: t('chat.welcome'),
              createdAt: new Date(),
              user: AI_USER,
            };
            setMessages([welcomeMessage]);
          }
        }
      } catch (error) {
        console.error('チャット履歴の読み込みエラー:', error);
      }
    };

    if (isVisible) {
      loadChatHistory();
    }
  }, [isVisible, currentUser, locale]);

  // チャット履歴の保存
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        if (messages.length > 0) {
          await AsyncStorage.setItem(
            '@chat_history_v2',
            JSON.stringify(messages)
          );
        }
      } catch (error) {
        console.error('チャット履歴の保存エラー:', error);
      }
    };

    saveChatHistory();
  }, [messages]);

  // メッセージから名前を抽出するヘルパー関数
  const extractNameFromMessage = useCallback((message: string): string | null => {
    if (!message || message.trim() === '') return null;

    const trimmedMessage = message.trim();

    // パターン1: 「名前は○○です」「名前は○○だよ」
    const pattern1 = /名前は(.+?)(?:です|だよ|$)/;
    const match1 = trimmedMessage.match(pattern1);
    if (match1 && match1[1]) {
      return match1[1].trim();
    }

    // パターン2: 「○○です」「○○だよ」（短いメッセージの場合）
    if (trimmedMessage.length <= 15) {
      const pattern2 = /^(.+?)(?:です|だよ)$/;
      const match2 = trimmedMessage.match(pattern2);
      if (match2 && match2[1]) {
        return match2[1].trim();
      }
    }

    // パターン3: メッセージ全体が短く、スペースが含まれない場合
    if (trimmedMessage.length <= 10 && !trimmedMessage.includes(' ') && !trimmedMessage.includes('　')) {
      return trimmedMessage;
    }

    return null;
  }, []);

  // イベント検索ヘルパー関数
  const searchEvents = useCallback((dateKeyword?: string, titleKeyword?: string) => {
    return existingEvents.filter(event => {
      // 日付フィルタ
      const dateMatch = !dateKeyword || (() => {
        if (!event.start || typeof event.start !== 'string') return false;
        return event.start.startsWith(dateKeyword);
      })();

      // タイトルフィルタ（部分一致）
      const titleMatch = !titleKeyword || event.title.toLowerCase().includes(titleKeyword.toLowerCase());

      return dateMatch && titleMatch;
    });
  }, [existingEvents]);

  // イベント追加の確認処理
  const handleConfirmEvents = useCallback(async (events: EventEntry[]) => {
    // 既に処理済みの場合はスキップ
    if (!waitingForEventConfirmation) {
      console.log('⚠️ 既に処理済みまたは確認待ちではありません');
      return;
    }

    console.log('✅ イベント追加を確認:', events.length, '件');

    if (onEventCreate) {
      let successCount = 0;
      events.forEach((event, index) => {
        try {
          const eventData = {
            title: event.title,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            endDate: event.date,
            location: event.location ? { name: event.location } : undefined,
            notes: event.description || event.rawText || '',
            color: '#007AFF',
            reminders: [],
            isAllDay: false,
            calendarId: null,
          };
          console.log(`📝 イベント ${index + 1}/${events.length} 変換完了:`, eventData);
          onEventCreate(eventData);
          console.log(`✅ イベント ${index + 1}/${events.length} 登録成功`);
          successCount++;
        } catch (error) {
          console.error(`❌ イベント ${index + 1}/${events.length} 作成エラー:`, error);
        }
      });

      const successMessage: CustomMessage = {
        _id: (Date.now() + 1).toString(),
        text: `${successCount}件のイベントをカレンダーに追加しました。`,
        createdAt: new Date(),
        user: AI_USER,
        type: 'text',
      };
      setMessages((prev) => GiftedChat.append(prev, [successMessage]));
    }

    // 確認待ち状態を解除
    setWaitingForEventConfirmation(false);
    setAnalyzedEvents([]);
  }, [onEventCreate, waitingForEventConfirmation]);

  // イベント追加のキャンセル処理
  const handleCancelEvents = useCallback(() => {
    // 既にキャンセル済みの場合はスキップ
    if (!waitingForEventConfirmation && analyzedEvents.length === 0) {
      console.log('⚠️ 既にキャンセル済みまたは確認待ちではありません');
      return;
    }

    console.log('❌ イベント追加をキャンセル');

    const cancelMessage: CustomMessage = {
      _id: (Date.now() + 1).toString(),
      text: 'イベントの追加をキャンセルしました。',
      createdAt: new Date(),
      user: AI_USER,
      type: 'text',
    };
    setMessages((prev) => GiftedChat.append(prev, [cancelMessage]));

    // 確認待ち状態を解除
    setWaitingForEventConfirmation(false);
    setAnalyzedEvents([]);
  }, [waitingForEventConfirmation, analyzedEvents.length]);

  // 画像解析を実行
  const handleImageAnalysis = useCallback(async (imageUri: string, userMessage?: string) => {
    try {
      console.log('🔍 画像解析開始:', { hasImage: !!imageUri, userMessage });

      // 1. 保存されたシフト解析用の名前を読み込む
      const savedName = await AsyncStorage.getItem(SHIFT_NAME_KEY);
      console.log('💾 保存された名前:', savedName);

      // 2. ユーザーメッセージから名前を抽出
      let extractedName: string | null = null;
      if (userMessage) {
        extractedName = extractNameFromMessage(userMessage);
      }

      // 3. 使用する名前を決定
      let finalName: string | null = null;
      let nameSource: 'extracted' | 'saved' | 'none' = 'none';

      if (extractedName) {
        // ユーザーが新しい名前を指定した場合
        finalName = extractedName;
        nameSource = 'extracted';

        // 新しい名前を保存（上書き）
        await AsyncStorage.setItem(SHIFT_NAME_KEY, extractedName);
        console.log('✅ 新しい名前を保存:', extractedName);
      } else if (savedName) {
        // 保存された名前を使用
        finalName = savedName;
        nameSource = 'saved';
        console.log('🔄 保存された名前を使用:', savedName);
      }

      // 4. 名前が不明な場合、AIが名前を尋ねる
      if (!finalName) {
        // 画像を一時保存
        setPendingImageUri(imageUri);
        setIsWaitingForName(true);

        // AIメッセージで名前を尋ねる
        const askNameMessage: CustomMessage = {
          _id: Date.now().toString(),
          text: 'シフト表からあなたの予定を抽出します。お名前を教えてください。\n\n例: 「本多です」「名前は田中です」',
          createdAt: new Date(),
          user: AI_USER,
          namePromptState: 'waiting',
          pendingImageUri: imageUri,
        };
        setMessages((prev) => GiftedChat.append(prev, [askNameMessage]));
        return; // 処理を中断
      }

      // 5. 解析開始メッセージ
      const nameInfo = nameSource === 'saved' ? `（保存された名前「${finalName}」を使用）` : '';
      const analyzingMessage: CustomMessage = {
        _id: Date.now().toString(),
        text: `画像を解析しています...${nameInfo}`,
        createdAt: new Date(),
        user: AI_USER,
        type: 'text',
      };
      setMessages((prev) => GiftedChat.append(prev, [analyzingMessage]));

      // 6. 名前を含むメッセージを生成
      const messageForAnalysis = `名前は${finalName}です`;

      // 7. 画像を解析
      const result = await hybridAIService.analyzeImage(
        imageUri,
        messageForAnalysis,
        selectedTimezone,
        locale
      );

      if (result.events.length === 0) {
        const notFoundMessage: CustomMessage = {
          _id: (Date.now() + 1).toString(),
          text: '予定が見つかりませんでした。',
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };
        setMessages((prev) => GiftedChat.append(prev, [notFoundMessage]));
      } else {
        // イベントを保存
        setAnalyzedEvents(result.events);
        setWaitingForEventConfirmation(true);

        // イベントリストを含む編集可能なメッセージを生成
        const eventsMessage: CustomMessage = {
          _id: (Date.now() + 1).toString(),
          text: `${result.events.length}件のイベントを見つけました:`,
          createdAt: new Date(),
          user: AI_USER,
          type: 'editable_events',
          events: result.events,
        };
        setMessages((prev) => GiftedChat.append(prev, [eventsMessage]));

        // 確認メッセージを追加
        const confirmMessage: CustomMessage = {
          _id: (Date.now() + 2).toString(),
          text: 'カレンダーに追加しますか？',
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };
        setMessages((prev) => GiftedChat.append(prev, [confirmMessage]));
      }
    } catch (error) {
      console.error('画像解析エラー:', error);
      const errorMessage: CustomMessage = {
        _id: (Date.now() + 1).toString(),
        text: '画像の解析中にエラーが発生しました。もう一度お試しください。',
        createdAt: new Date(),
        user: AI_USER,
        type: 'text',
      };
      setMessages((prev) => GiftedChat.append(prev, [errorMessage]));
      throw error;
    }
  }, [extractNameFromMessage, selectedTimezone, locale]);

  // 画像選択ボタンの処理
  const handleImagePick = useCallback(async () => {
    try {
      // カメラロールの権限をリクエスト
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired'),
          t('chat.imagePermissionMessage')
        );
        return;
      }

      // 画像を選択
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert(t('common.error'), t('chat.imagePickError'));
    }
  }, []);

  // 画像選択をクリア
  const handleClearImage = useCallback(() => {
    setSelectedImageUri(null);
  }, []);

  // renderActionsで画像選択ボタンを表示
  const renderActions = useCallback(
    (props: any) => (
      <TouchableOpacity
        style={styles.attachButton}
        onPress={handleImagePick}
        disabled={isLoading}
      >
        <PaperClipIcon size={24} color={isLoading ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
    ),
    [isLoading, handleImagePick]
  );

  // renderCustomViewでイベント編集UIを表示
  const renderCustomView = useCallback((props: any) => {
    const msg = props.currentMessage as CustomMessage;

    if (msg?.type === 'editable_events' && msg.events && msg.events.length > 0) {
      return (
        <View style={styles.eventsContainer}>
          {msg.events.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDetails}>
                {event.date} {event.startTime} - {event.endTime}
              </Text>
              {event.location && (
                <Text style={styles.eventLocation}>📍 {event.location}</Text>
              )}
            </View>
          ))}
          {/* 確認待ち状態の場合のみボタンを表示 */}
          {waitingForEventConfirmation && (
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.addButton]}
                onPress={() => handleConfirmEvents(msg.events!)}
              >
                <Text style={styles.confirmButtonText}>追加</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={handleCancelEvents}
              >
                <Text style={styles.confirmButtonText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    return null;
  }, [handleConfirmEvents, handleCancelEvents, waitingForEventConfirmation]);

  // メッセージ送信
  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (newMessages.length === 0) return;

      const userMessage = newMessages[0];
      const messageText = userMessage.text;

      // ユーザーメッセージを表示
      const customUserMessage: CustomMessage = {
        ...userMessage,
        type: 'text',
      };
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [customUserMessage])
      );

      // 名前待ち状態の処理
      if (isWaitingForName && pendingImageUri) {
        console.log('👤 名前待ち状態: ユーザーの返答から名前を抽出');

        // ユーザーメッセージから名前を抽出
        const extractedName = extractNameFromMessage(messageText);

        if (extractedName) {
          console.log('✅ 名前を抽出しました:', extractedName);

          // 名前待ち状態を解除
          setIsWaitingForName(false);
          const imageUri = pendingImageUri;
          setPendingImageUri(null);

          // 確認メッセージ
          const confirmNameMessage: CustomMessage = {
            _id: Date.now().toString(),
            text: `「${extractedName}」さんですね。画像を解析します。`,
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages((prev) => GiftedChat.append(prev, [confirmNameMessage]));

          // 画像解析を実行
          await handleImageAnalysis(imageUri, messageText);
        } else {
          console.log('❌ 名前を抽出できませんでした');
          const retryMessage: CustomMessage = {
            _id: Date.now().toString(),
            text: 'お名前が分かりませんでした。もう一度教えてください。\n\n例: 「本多です」「名前は田中です」',
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages((prev) => GiftedChat.append(prev, [retryMessage]));
        }
        return;
      }

      // イベント確認待ち状態の処理
      if (waitingForEventConfirmation && analyzedEvents.length > 0) {
        console.log('⏳ イベント確認待ち状態: ユーザーの返答を処理');

        // ユーザーの返答をチェック
        const isConfirm = messageText.includes('追加') ||
                          messageText.includes('はい') ||
                          messageText.includes('お願い') ||
                          messageText.includes('yes') ||
                          messageText.includes('OK');

        const isCancel = messageText.includes('キャンセル') ||
                         messageText.includes('やめ') ||
                         messageText.includes('いいえ') ||
                         messageText.includes('no');

        if (isConfirm) {
          await handleConfirmEvents(analyzedEvents);
        } else if (isCancel) {
          handleCancelEvents();
        } else {
          // どちらでもない場合、再度確認
          const retryMessage: CustomMessage = {
            _id: Date.now().toString(),
            text: 'カレンダーに追加する場合は「追加して」または「はい」と入力してください。\nキャンセルする場合は「キャンセル」と入力してください。',
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages((prev) => GiftedChat.append(prev, [retryMessage]));
        }
        return;
      }

      // 画像が選択されている場合、画像解析を実行
      if (selectedImageUri) {
        // 画像URIをクリア（送信後）
        const imageUri = selectedImageUri;
        setSelectedImageUri(null);

        // 画像解析を実行
        await handleImageAnalysis(imageUri, messageText);
        return;
      }

      // AI応答を取得
      setIsLoading(true);
      try {
        const response = await hybridAIService.processChatMessage(
          messageText,
          messages.slice(0, 5).map((m) => m.text).join('\n') // 最近の会話履歴
        );

        const aiMessage: CustomMessage = {
          _id: Date.now().toString(),
          text: response.message,
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };

        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, [aiMessage])
        );

        // intentに応じて処理を分岐
        if (response.intent === 'create_event') {
          // 予定作成
          if (response.events && response.events.length > 0 && onEventCreate) {
            response.events.forEach(event => {
              const calendarEvent = {
                title: event.title || event.notes || t('chat.defaultTitle'),
                date: event.date,
                endDate: event.endDate,
                startTime: event.startTime,
                endTime: event.endTime,
                isAllDay: event.isAllDay || false,
                notes: event.workplace ? `${t('chat.locationPrefix')}${event.workplace}` : (event.notes || ''),
                color: event.color || '#007AFF',
                recurrence: event.recurrence,
                reminders: event.reminders || [],
              };
              onEventCreate(calendarEvent);
            });

            setTimeout(() => {
              const confirmMessage: CustomMessage = {
                _id: (Date.now() + 2).toString(),
                text: t('chat.eventsAdded', { count: response.events?.length || 0 }),
                createdAt: new Date(),
                user: AI_USER,
                type: 'text',
              };
              setMessages((prev) => GiftedChat.append(prev, [confirmMessage]));
            }, 1000);
          }
        } else if (response.intent === 'delete_event' && response.keywords && onEventDelete) {
          // 予定削除（簡略版）
          const matchedEvents = searchEvents(response.keywords.date, response.keywords.title);

          if (matchedEvents.length === 0) {
            const notFoundMessage: CustomMessage = {
              _id: (Date.now() + 2).toString(),
              text: t('chat.noEventFound'),
              createdAt: new Date(),
              user: AI_USER,
              type: 'text',
            };
            setMessages((prev) => GiftedChat.append(prev, [notFoundMessage]));
          } else if (matchedEvents.length === 1) {
            // 1件のみ: 削除
            const event = matchedEvents[0];
            onEventDelete(event.id);
            const confirmMessage: CustomMessage = {
              _id: (Date.now() + 2).toString(),
              text: t('chat.eventDeleted'),
              createdAt: new Date(),
              user: AI_USER,
              type: 'text',
            };
            setMessages((prev) => GiftedChat.append(prev, [confirmMessage]));
          } else {
            // 複数件: 簡略メッセージ
            const multipleMessage: CustomMessage = {
              _id: (Date.now() + 2).toString(),
              text: `${matchedEvents.length}件の予定が見つかりました。より具体的に指定してください。`,
              createdAt: new Date(),
              user: AI_USER,
              type: 'text',
            };
            setMessages((prev) => GiftedChat.append(prev, [multipleMessage]));
          }
        } else if (response.intent === 'update_event' && response.keywords && onEventUpdate) {
          // 予定更新（簡略版）
          const matchedEvents = searchEvents(response.keywords.date, response.keywords.title);

          if (matchedEvents.length === 0) {
            const notFoundMessage: CustomMessage = {
              _id: (Date.now() + 2).toString(),
              text: t('chat.noEventFound'),
              createdAt: new Date(),
              user: AI_USER,
              type: 'text',
            };
            setMessages((prev) => GiftedChat.append(prev, [notFoundMessage]));
          } else {
            const updateMessage: CustomMessage = {
              _id: (Date.now() + 2).toString(),
              text: '予定の更新機能は現在実装中です。',
              createdAt: new Date(),
              user: AI_USER,
              type: 'text',
            };
            setMessages((prev) => GiftedChat.append(prev, [updateMessage]));
          }
        }
      } catch (error: any) {
        console.error('AI応答エラー:', error);
        console.error('AI応答エラー詳細:', error.message, error.stack);

        // エラーメッセージをより詳細に（デバッグ用に実際のエラーも表示）
        let errorText = 'すみません、エラーが発生しました。';
        let debugInfo = '';

        if (error.message?.includes('API key not configured') || error.message?.includes('Gemini API key')) {
          errorText = '⚠️ Gemini APIキーが設定されていません。';
          debugInfo = 'APIキー未設定';
        } else if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('NetworkError')) {
          errorText = '⚠️ ネットワークエラーが発生しました。';
          debugInfo = 'ネットワークエラー';
        } else if (error.message?.includes('500')) {
          errorText = '⚠️ サーバーエラーが発生しました。';
          debugInfo = '500エラー';
        } else if (error.message?.includes('403') || error.message?.includes('401')) {
          errorText = '⚠️ APIアクセスが拒否されました。';
          debugInfo = '認証エラー';
        } else if (error.message?.includes('404')) {
          errorText = '⚠️ APIエンドポイントが見つかりません。';
          debugInfo = '404エラー';
        } else if (error.message?.includes('JSON')) {
          errorText = '⚠️ AIの応答を解析できませんでした。';
          debugInfo = 'JSON解析エラー';
        } else {
          debugInfo = error.message || 'Unknown';
        }

        // デバッグ情報を追加（開発時のみ役立つ）
        const fullErrorText = `${errorText}\n\n[Debug] ${debugInfo}\n${error.message?.substring(0, 200) || ''}`;

        const errorMessage: CustomMessage = {
          _id: Date.now().toString(),
          text: fullErrorText,
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };
        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, [errorMessage])
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedTimezone,
      locale,
      selectedImageUri,
      isWaitingForName,
      pendingImageUri,
      waitingForEventConfirmation,
      analyzedEvents,
      extractNameFromMessage,
      handleImageAnalysis,
      handleConfirmEvents,
      handleCancelEvents,
      onEventCreate,
      onEventDelete,
      onEventUpdate,
      searchEvents,
    ]
  );

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* 画像プレビュー */}
        {selectedImageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.clearImageButton}
              onPress={handleClearImage}
            >
              <XCircleIcon size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* チャット */}
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={currentUser}
          placeholder={t('chat.inputPlaceholder') || 'メッセージを入力...'}
          alwaysShowSend
          renderLoading={() => <ActivityIndicator size="large" color="#007AFF" />}
          isLoadingEarlier={isLoading}
          messagesContainerStyle={styles.messagesContainer}
          textInputStyle={styles.textInput}
          locale={locale}
          renderActions={renderActions}
          renderCustomView={renderCustomView}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    backgroundColor: '#f8f8f8',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  attachButton: {
    marginLeft: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  clearImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  eventsContainer: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
  },
  eventItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: '#007AFF',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
