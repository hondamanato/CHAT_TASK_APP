import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { hybridAIService } from '../../services/hybridAIService';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { t } from '../../i18n';
import {
  CustomMessage,
  AI_USER,
  createCurrentUser,
} from '../../types/giftedChat';
import { EventEntry } from '../../services/hybridAIService';
import { MessageBubble } from './MessageBubble';
import { LoadingFooter } from './LoadingFooter';
import { ChatInputBar } from './ChatInputBar';

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
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  // キーボードイベントリスナー
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

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
              // ウェルカムメッセージを表示
              showWelcomeMessage();
            }
          } catch (parseError) {
            console.error('チャット履歴のパースエラー:', parseError);
            await AsyncStorage.removeItem('@chat_history_v2');
            showWelcomeMessage();
          }
        } else {
          // 旧形式の移行
          const oldMessages = await AsyncStorage.getItem('@chat_history');
          if (oldMessages) {
            console.log('旧形式のチャット履歴を検出。新形式に移行します。');
            // 旧形式は削除のみ
            await AsyncStorage.removeItem('@chat_history');
          }
          showWelcomeMessage();
        }
      } catch (error) {
        console.error('チャット履歴の読み込みエラー:', error);
        showWelcomeMessage();
      }
    };

    const showWelcomeMessage = () => {
      const welcomeMsg: CustomMessage = {
        _id: Date.now().toString(),
        text: t('chat.welcome') || 'こんにちは！予定の管理をお手伝いします。',
        createdAt: new Date(),
        user: AI_USER,
        type: 'text',
      };
      setMessages([welcomeMsg]);
    };

    loadChatHistory();
  }, []);

  // メッセージ変更時にAsyncStorageに保存
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        if (messages.length > 0) {
          await AsyncStorage.setItem('@chat_history_v2', JSON.stringify(messages));
        }
      } catch (error) {
        console.error('チャット履歴の保存エラー:', error);
      }
    };

    saveChatHistory();
  }, [messages]);

  // メッセージから名前を抽出
  const extractNameFromMessage = (message: string): string | null => {
    // パターン1: 「名前は○○です」「名前は○○だよ」などの明示的な回答
    const explicitNameMatch = message.match(/名前は(.+?)(?:です|だよ|!|。|$)/);
    if (explicitNameMatch && explicitNameMatch[1].trim().length > 0) {
      return explicitNameMatch[1].trim();
    }

    // パターン2: 短いメッセージで「○○です」「○○だよ」のようなシンプルな回答
    const simpleNameMatch = message.match(/^(.+?)(?:です|だよ|!|。)$/);
    if (simpleNameMatch && simpleNameMatch[1].trim().length < 20) {
      return simpleNameMatch[1].trim();
    }

    // パターン3: 短くてスペースがないメッセージ全体を名前とみなす
    if (message.trim().length < 10 && !message.includes(' ') && !message.includes('　')) {
      return message.trim();
    }

    return null;
  };

  // イベント検索
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
  const handleConfirmEvents = useCallback(async () => {
    // 既に処理済みの場合はスキップ
    if (!waitingForEventConfirmation) {
      console.log('⚠️ 既に処理済みまたは確認待ちではありません');
      return;
    }

    const events = analyzedEvents;
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
      setMessages((prev) => [successMessage, ...prev]);
    }

    // 確認待ち状態を解除
    setWaitingForEventConfirmation(false);
    setAnalyzedEvents([]);
  }, [onEventCreate, waitingForEventConfirmation, analyzedEvents]);

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
    setMessages((prev) => [cancelMessage, ...prev]);

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
        console.log('📝 抽出された名前:', extractedName);
      }

      // 3. 最終的に使用する名前を決定
      const nameToUse = extractedName || savedName || undefined;
      console.log('🎯 使用する名前:', nameToUse);

      // 4. 名前を保存（次回以降のため）
      if (extractedName) {
        await AsyncStorage.setItem(SHIFT_NAME_KEY, extractedName);
        console.log('💾 名前を保存しました:', extractedName);
      }

      setIsLoading(true);

      // 5. 画像解析実行
      const result = await hybridAIService.analyzeImage(
        imageUri,
        nameToUse ? `名前: ${nameToUse}` : undefined,
        selectedTimezone,
        locale
      );

      console.log(`🎉 画像解析完了: ${result.totalFound}件のイベントを検出`);

      // 6. 結果を表示
      if (result.events.length > 0) {
        const aiMessage: CustomMessage = {
          _id: Date.now().toString(),
          text: `${result.totalFound}件の予定を見つけました。カレンダーに追加しますか？`,
          createdAt: new Date(),
          user: AI_USER,
          type: 'editable_events',
          events: result.events,
        };

        setMessages(prev => [aiMessage, ...prev]);
        setAnalyzedEvents(result.events);
        setWaitingForEventConfirmation(true);
      } else {
        const aiMessage: CustomMessage = {
          _id: Date.now().toString(),
          text: '予定が見つかりませんでした。画像を確認してもう一度お試しください。',
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };
        setMessages(prev => [aiMessage, ...prev]);
      }

      // 7. 画像選択をクリア
      setSelectedImageUri(null);
      setPendingImageUri(null);
      setIsWaitingForName(false);
    } catch (error: any) {
      console.error('❌ 画像解析エラー:', error);
      const errorMessage: CustomMessage = {
        _id: Date.now().toString(),
        text: `エラーが発生しました: ${error.message || '不明なエラー'}`,
        createdAt: new Date(),
        user: AI_USER,
        type: 'text',
      };
      setMessages(prev => [errorMessage, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimezone, locale]);

  // メッセージ送信処理
  const handleSend = useCallback(async () => {
    const messageText = inputText.trim();

    if (messageText === '' && !selectedImageUri) return;

    const userMessage: CustomMessage = {
      _id: Date.now(),
      text: messageText,
      createdAt: new Date(),
      user: currentUser,
    };

    // メッセージを追加（invertedなので先頭に追加）
    setMessages(prevMessages => [userMessage, ...prevMessages]);
    setInputText('');

    try {
      setIsLoading(true);

      // 名前待ち状態の処理
      if (isWaitingForName && pendingImageUri) {
        console.log('📝 名前待ち状態: ユーザーメッセージから名前を抽出');
        const extractedName = extractNameFromMessage(messageText);

        if (extractedName) {
          console.log('✅ 名前抽出成功:', extractedName);
          await handleImageAnalysis(pendingImageUri, extractedName);
          return;
        } else {
          console.log('⚠️ 名前抽出失敗');
          const aiMessage: CustomMessage = {
            _id: (Date.now() + 1).toString(),
            text: 'お名前が確認できませんでした。もう一度教えていただけますか？',
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages(prev => [aiMessage, ...prev]);
          return;
        }
      }

      // イベント確認待ち状態の処理
      if (waitingForEventConfirmation) {
        const lowerText = messageText.toLowerCase();
        if (lowerText.includes('追加') || lowerText.includes('はい') || lowerText.includes('yes')) {
          await handleConfirmEvents();
          return;
        } else if (lowerText.includes('キャンセル') || lowerText.includes('いいえ') || lowerText.includes('no')) {
          handleCancelEvents();
          return;
        }
      }

      // 画像が選択されている場合
      if (selectedImageUri) {
        console.log('🖼️ 画像が選択されています');
        const extractedName = extractNameFromMessage(messageText);

        if (!extractedName) {
          console.log('📝 名前が抽出できませんでした。名前入力を求めます');
          setIsWaitingForName(true);
          setPendingImageUri(selectedImageUri);
          setSelectedImageUri(null);

          const aiMessage: CustomMessage = {
            _id: (Date.now() + 1).toString(),
            text: 'シフト表から予定を抽出します。お名前を教えていただけますか？',
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages(prev => [aiMessage, ...prev]);
          return;
        } else {
          console.log('✅ 名前が抽出されました:', extractedName);
          await handleImageAnalysis(selectedImageUri, extractedName);
          return;
        }
      }

      // 通常のチャット処理
      console.log('💬 通常のチャット処理');
      const aiResponse = await hybridAIService.processChatMessage(
        messageText,
        messages.map(m => ({
          role: m.user._id === 'ai' ? 'model' : 'user',
          text: m.text,
        }))
      );

      console.log('🤖 AI応答:', aiResponse);

      // intentに応じた処理
      if (aiResponse.intent === 'create_event' && aiResponse.events && aiResponse.events.length > 0) {
        console.log('📅 イベント作成intent検出');

        const aiMessage: CustomMessage = {
          _id: (Date.now() + 1).toString(),
          text: aiResponse.message,
          createdAt: new Date(),
          user: AI_USER,
          type: 'editable_events',
          events: aiResponse.events,
        };

        setMessages(prev => [aiMessage, ...prev]);
        setAnalyzedEvents(aiResponse.events);
        setWaitingForEventConfirmation(true);
      } else if (aiResponse.intent === 'delete_event' && aiResponse.keywords) {
        console.log('🗑️ イベント削除intent検出');

        const events = searchEvents(
          aiResponse.keywords.date,
          aiResponse.keywords.title
        );

        if (events.length > 0 && onEventDelete) {
          events.forEach(event => {
            onEventDelete(event.id);
          });

          const aiMessage: CustomMessage = {
            _id: (Date.now() + 1).toString(),
            text: `${events.length}件のイベントを削除しました。`,
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages(prev => [aiMessage, ...prev]);
        } else {
          const aiMessage: CustomMessage = {
            _id: (Date.now() + 1).toString(),
            text: '該当するイベントが見つかりませんでした。',
            createdAt: new Date(),
            user: AI_USER,
            type: 'text',
          };
          setMessages(prev => [aiMessage, ...prev]);
        }
      } else if (aiResponse.intent === 'update_event') {
        console.log('✏️ イベント更新intent検出（未実装）');

        const aiMessage: CustomMessage = {
          _id: (Date.now() + 1).toString(),
          text: 'イベントの更新機能は現在実装中です。',
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };
        setMessages(prev => [aiMessage, ...prev]);
      } else {
        // 通常の応答
        const aiMessage: CustomMessage = {
          _id: (Date.now() + 1).toString(),
          text: aiResponse.message,
          createdAt: new Date(),
          user: AI_USER,
          type: 'text',
        };
        setMessages(prev => [aiMessage, ...prev]);
      }
    } catch (error: any) {
      console.error('❌ メッセージ処理エラー:', error);
      const errorMessage: CustomMessage = {
        _id: (Date.now() + 1).toString(),
        text: `エラーが発生しました: ${error.message || '不明なエラー'}`,
        createdAt: new Date(),
        user: AI_USER,
        type: 'text',
      };
      setMessages(prev => [errorMessage, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputText,
    selectedImageUri,
    currentUser,
    isWaitingForName,
    pendingImageUri,
    waitingForEventConfirmation,
    messages,
    handleConfirmEvents,
    handleCancelEvents,
    handleImageAnalysis,
    searchEvents,
    onEventDelete,
  ]);

  // 画像選択
  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  // 画像クリア
  const handleClearImage = () => {
    setSelectedImageUri(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <XMarkIcon size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* メッセージリスト */}
        <FlatList
          ref={flatListRef}
          inverted
          data={messages}
          keyExtractor={(item) => item._id.toString()}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isUser={item.user._id !== 'ai'}
              waitingForEventConfirmation={waitingForEventConfirmation}
              onConfirmEvents={handleConfirmEvents}
              onCancelEvents={handleCancelEvents}
            />
          )}
          ListFooterComponent={<LoadingFooter isLoading={isLoading} />}
          contentContainerStyle={{ paddingTop: 10 }}
        />

        {/* 入力バー */}
        <ChatInputBar
          inputText={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onImagePick={handleImagePick}
          selectedImageUri={selectedImageUri}
          onClearImage={handleClearImage}
          isLoading={isLoading}
          keyboardHeight={keyboardHeight}
          insetsBottom={insets.bottom}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
});
