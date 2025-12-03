import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { PaperAirplaneIcon, PaperClipIcon, TrashIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { t } from '../i18n';
import { hybridAIService, EventEntry } from '../services/hybridAIService';
import { ChatMessage, Message } from './ChatMessage';
import { EditableEventListModal } from './EditableEventListModal';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { formatErrorMessage } from '../utils/environment';

// AsyncStorageキー: シフト解析用の名前
const SHIFT_NAME_KEY = '@shift_analysis_name';

interface ChatScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, eventData: any) => void;
  onEventDelete?: (id: string) => void;
  existingEvents?: Array<{id: string; title: string; start: string; end: string}>;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  isVisible,
  onClose,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  existingEvents = []
}) => {
  const { locale } = useLocalization();
  const { selectedTimezone } = useSettings();
  const { profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // ストリーミング用のstate
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');

  // 画像解析関連のstate
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analyzedEvents, setAnalyzedEvents] = useState<EventEntry[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [waitingForEventConfirmation, setWaitingForEventConfirmation] = useState(false);

  // 名前確認関連のstate
  const [pendingImageForNameConfirmation, setPendingImageForNameConfirmation] = useState<string | null>(null);
  const [isWaitingForName, setIsWaitingForName] = useState(false);

  // 会話履歴をAsyncStorageから読み込み
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const storedMessages = await AsyncStorage.getItem('@chat_history');
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          // timestampをDate型に復元
          const restoredMessages = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(restoredMessages);
        } else if (isVisible) {
          // 初回表示時の挨拶メッセージ
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            text: t('chat.welcome'),
            isUser: false,
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }

        // イベント状態を復元
        const storedEventState = await AsyncStorage.getItem('@event_state');
        if (storedEventState) {
          const eventState = JSON.parse(storedEventState);
          console.log('🔄 イベント状態を復元:', eventState);
          setShowEventModal(eventState.showEventModal || false);
          setAnalyzedEvents(eventState.analyzedEvents || []);
        }
      } catch (error) {
        console.error('会話履歴の読み込みエラー:', error);
      }
    };

    if (isVisible) {
      loadChatHistory();
    }
  }, [isVisible]);

  // 会話履歴をAsyncStorageに保存
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        await AsyncStorage.setItem('@chat_history', JSON.stringify(messages));
      } catch (error) {
        console.error('会話履歴の保存エラー:', error);
      }
    };

    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // イベント状態をAsyncStorageに保存
  useEffect(() => {
    const saveEventState = async () => {
      try {
        const eventState = {
          showEventModal,
          analyzedEvents
        };
        await AsyncStorage.setItem('@event_state', JSON.stringify(eventState));
        console.log('💾 イベント状態を保存:', eventState);
      } catch (error) {
        console.error('イベント状態の保存エラー:', error);
      }
    };

    saveEventState();
  }, [showEventModal, analyzedEvents]);

  // 会話履歴を削除
  const handleClearHistory = () => {
    Alert.alert(
      t('chat.clearHistory'),
      t('chat.clearHistoryConfirm'),
      [
        { text: t('chat.no'), style: 'cancel' },
        {
          text: t('chat.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@chat_history');
              setMessages([]);
              // 削除後に挨拶メッセージを表示
              const welcomeMessage: Message = {
                id: Date.now().toString(),
                text: t('chat.welcome'),
                isUser: false,
                timestamp: new Date(),
              };
              setMessages([welcomeMessage]);
            } catch (error) {
              console.error('会話履歴の削除エラー:', error);
            }
          }
        }
      ]
    );
  };

  // イベント検索ヘルパー関数
  const searchEvents = (dateKeyword?: string, titleKeyword?: string) => {
    return existingEvents.filter(event => {
      // 日付フィルタ: ローカルタイムゾーン（JST）で YYYY-MM-DD 形式に変換して比較
      const dateMatch = !dateKeyword || (() => {
        if (!event.start || typeof event.start !== 'object') return false;
        if (!(event.start as any instanceof Date)) return false;
        const eventDate = event.start as Date;
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`.startsWith(dateKeyword);
      })();

      // タイトルフィルタ（部分一致）
      const titleMatch = !titleKeyword || event.title.toLowerCase().includes(titleKeyword.toLowerCase());

      return dateMatch && titleMatch;
    });
  };

  const sendMessage = async () => {
    // 画像またはテキストのいずれかが必要
    if ((!inputText.trim() && !selectedImageUri) || isLoading) return;

    const messageText = inputText.trim() || '';
    const imageUri = selectedImageUri;

    // 🔍 デバッグ: 現在の状態を詳細にログ出力
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 sendMessage開始:', {
      messageText,
      hasImage: !!imageUri,
      showEventModal,
      analyzedEventsCount: analyzedEvents.length
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText || t('chat.imageAttached'),
      isUser: true,
      timestamp: new Date(),
      imageUri: imageUri || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    const currentImageUri = selectedImageUri;
    setSelectedImageUri(null);
    setIsLoading(true);

    // スクロールを最下部に
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // 名前待ち状態の処理
      if (isWaitingForName && pendingImageForNameConfirmation) {
        console.log('👤 名前待ち状態: ユーザーの返答から名前を抽出');

        // ユーザーメッセージから名前を抽出
        const extractedName = extractNameFromMessage(messageText);

        if (extractedName) {
          console.log('✅ 名前を抽出しました:', extractedName);

          // 名前待ち状態を解除
          setIsWaitingForName(false);
          const imageUri = pendingImageForNameConfirmation;
          setPendingImageForNameConfirmation(null);

          // 確認メッセージ
          const confirmMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `${extractedName}さんのシフトを検索しています...`,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, confirmMessage]);

          // 画像解析を実行
          try {
            await handleImageAnalysis(imageUri, `名前は${extractedName}です`);
          } catch (error) {
            console.error('画像解析でエラーが発生しました:', error);
          } finally {
            setIsLoading(false);
          }
        } else {
          console.log('❌ 名前が確認できませんでした');

          // 名前が取得できない場合、再度尋ねる
          const retryMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'お名前が確認できませんでした。もう一度お名前を教えてください。\n\n例: 「本多です」',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, retryMessage]);
          setIsLoading(false);
        }
        return;
      }

      // 画像が添付されている場合、画像解析を自動的に開始
      if (currentImageUri) {
        console.log('📸 画像が検出されました。画像解析を開始します。');

        // 画像解析を実行（エラー時も確実にローディング解除）
        try {
          await handleImageAnalysis(currentImageUri, messageText);
        } catch (error) {
          console.error('画像解析でエラーが発生しました:', error);
        } finally {
          setIsLoading(false);
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
          // 確認された場合、編集済みのanalyzedEventsをカレンダーに追加
          console.log('✅ イベント追加を確認: ', analyzedEvents.length, '件');

          if (onEventCreate) {
            let successCount = 0;
            analyzedEvents.forEach((event, index) => {
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
                console.log(`📝 イベント ${index + 1}/${analyzedEvents.length} 変換完了:`, eventData);
                onEventCreate(eventData);
                console.log(`✅ イベント ${index + 1}/${analyzedEvents.length} 登録成功`);
                successCount++;
              } catch (error) {
                console.error(`❌ イベント ${index + 1}/${analyzedEvents.length} 作成エラー:`, error);
              }
            });

            const successMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: `${successCount}件のイベントをカレンダーに追加しました。`,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, successMessage]);
          }

          // 確認待ち状態を解除
          setWaitingForEventConfirmation(false);
          setAnalyzedEvents([]);
          setIsLoading(false);
          return;
        } else if (isCancel) {
          // キャンセルされた場合
          console.log('❌ イベント追加をキャンセル');

          const cancelMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'イベントの追加をキャンセルしました。',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, cancelMessage]);

          // 確認待ち状態を解除
          setWaitingForEventConfirmation(false);
          setAnalyzedEvents([]);
          setIsLoading(false);
          return;
        } else {
          // どちらでもない場合、再度確認
          const retryMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'カレンダーに追加する場合は「追加して」または「はい」と入力してください。\nキャンセルする場合は「キャンセル」と入力してください。',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, retryMessage]);
          setIsLoading(false);
          return;
        }
      }

      // 会話履歴を構築（直近5往復=10メッセージ）
      const recentMessages = messages.slice(-10);
      const conversationHistory = recentMessages
        .map(msg => `${msg.isUser ? 'ユーザー' : 'AI'}: ${msg.text}`)
        .join('\n');

      // ストリーミング機能を試み、失敗したらバッチ処理にフォールバック
      let response: any = null;
      let useStreaming = true; // ストリーミングを試すかどうか

      if (useStreaming) {
        try {
          // ストリーミング用の一時メッセージを追加
          const streamingMsgId = (Date.now() + 1).toString();
          const streamingMessage: Message = {
            id: streamingMsgId,
            text: '',
            isUser: false,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, streamingMessage]);
          setStreamingMessageId(streamingMsgId);
          setStreamingText('');

          // ストリーミングでチャットメッセージを処理
          let fullResponse: any = null;
          
          await hybridAIService.streamChatMessage(
            messageText,
            // onChunk: テキストチャンクを受信
            (chunk: string) => {
              setStreamingText(prev => {
                const newText = prev + chunk;
                // メッセージを更新
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === streamingMsgId 
                      ? { ...msg, text: newText }
                      : msg
                  )
                );
                return newText;
              });
              
              // スクロールを最下部に
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
            },
            // onComplete: 完了時
            (res: any) => {
              fullResponse = res;
              setStreamingMessageId(null);
            setStreamingText('');
              
              // 最終的なメッセージを更新
              setMessages(prevMessages => 
                prevMessages.map(msg => 
                  msg.id === streamingMsgId 
                    ? { ...msg, text: res.message }
                    : msg
                )
              );
            },
            // onError: エラー時（フォールバックへ）
            (error: Error) => {
              console.warn('ストリーミングエラー（バッチ処理にフォールバック）:', error);
              setStreamingMessageId(null);
              setStreamingText('');
              
              // ストリーミングメッセージを削除
              setMessages(prevMessages => 
                prevMessages.filter(msg => msg.id !== streamingMsgId)
              );
              
              // バッチ処理にフォールバック（エラーはバッチ処理で処理される）
              useStreaming = false;
              throw error; // catchブロックでバッチ処理を実行
            },
            conversationHistory
          );

          response = fullResponse;
        } catch (error) {
          console.log('📦 バッチ処理にフォールバック');
          useStreaming = false;
        }
      }

      // バッチ処理（フォールバックまたは初期状態）
      if (!useStreaming || !response) {
        response = await hybridAIService.processChatMessage(
          messageText,
          conversationHistory
        );

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.message,
        isUser: false,
        timestamp: new Date(),
      };

        setMessages(prev => [...prev, aiMessage]);
      }

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
              color: event.color || '#007AFF', // AIが指定した色、またはデフォルトの青
              recurrence: event.recurrence, // 繰り返し設定
              reminders: event.reminders || [], // リマインダー（分単位の配列）
            };
            onEventCreate(calendarEvent);
          });

          setTimeout(() => {
            const confirmMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: t('chat.eventsAdded', { count: response.events?.length || 0 }),
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, confirmMessage]);
          }, 1000);
        }
      } else if (response.intent === 'delete_event' && response.keywords && onEventDelete) {
        // 予定削除
        const matchedEvents = searchEvents(response.keywords.date, response.keywords.title);

        if (matchedEvents.length === 0) {
          // 見つからない
          setTimeout(() => {
            const notFoundMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: t('chat.noEventFound'),
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, notFoundMessage]);
          }, 500);
        } else if (matchedEvents.length === 1) {
          // 1件のみ: 確認して削除
          const event = matchedEvents[0];
          Alert.alert(
            t('chat.confirmDelete'),
            t('event.deleteConfirm'),
            [
              { text: t('chat.no'), style: 'cancel' },
              {
                text: t('chat.yes'),
                style: 'destructive',
                onPress: () => {
                  onEventDelete(event.id);
                  setTimeout(() => {
                    const confirmMessage: Message = {
                      id: (Date.now() + 2).toString(),
                      text: t('chat.eventDeleted'),
                      isUser: false,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, confirmMessage]);
                  }, 500);
                }
              }
            ]
          );
        } else {
          // 複数件: 選択肢を提示
          // 日付と曜日をフォーマットする関数
          const formatEventDate = (dateInput: string | Date) => {
            const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            const weekday = weekdays[date.getDay()];
            return `${month}/${day} (${weekday})`;
          };

          const options: any[] = [];

          // 「すべて削除」オプションを先頭に追加
          options.push({
            text: `✕ すべて削除 (${matchedEvents.length}件)`,
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                t('chat.confirmDelete'),
                `${matchedEvents.length}件の予定をすべて削除しますか？`,
                [
                  { text: t('chat.no'), style: 'cancel' },
                  {
                    text: t('chat.yes'),
                    style: 'destructive',
                    onPress: () => {
                      // すべての予定を削除
                      matchedEvents.forEach(event => onEventDelete(event.id));
                      setTimeout(() => {
                        const confirmMessage: Message = {
                          id: (Date.now() + 2).toString(),
                          text: `${matchedEvents.length}件の予定を削除しました。`,
                          isUser: false,
                          timestamp: new Date(),
                        };
                        setMessages(prev => [...prev, confirmMessage]);
                      }, 500);
                    }
                  }
                ]
              );
            }
          });

          // 個別の予定オプション（日付と曜日表示）
          matchedEvents.forEach((event) => {
            options.push({
              text: `${formatEventDate(event.start)} ${event.title}`,
              onPress: () => {
                // 選択後に確認
                Alert.alert(
                  t('chat.confirmDelete'),
                  t('event.deleteConfirm'),
                  [
                    { text: t('chat.no'), style: 'cancel' },
                    {
                      text: t('chat.yes'),
                      style: 'destructive',
                      onPress: () => {
                        onEventDelete(event.id);
                        setTimeout(() => {
                          const confirmMessage: Message = {
                            id: (Date.now() + 2).toString(),
                            text: t('chat.eventDeleted'),
                            isUser: false,
                            timestamp: new Date(),
                          };
                          setMessages(prev => [...prev, confirmMessage]);
                        }, 500);
                      }
                    }
                  ]
                );
              }
            });
          });

          // キャンセルオプション
          options.push({ text: t('common.cancel'), style: 'cancel', onPress: () => {} });

          Alert.alert(
            t('chat.multipleEventsFound'),
            t('chat.whichToDelete'),
            options
          );
        }
      } else if (response.intent === 'update_event' && response.keywords && response.event && onEventUpdate) {
        // 予定編集
        const matchedEvents = searchEvents(response.keywords.date, response.keywords.title);

        if (matchedEvents.length === 0) {
          // 見つからない
          setTimeout(() => {
            const notFoundMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: t('chat.noEventFound'),
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, notFoundMessage]);
          }, 500);
        } else if (matchedEvents.length === 1) {
          // 1件のみ: 確認して更新
          const event = matchedEvents[0];
          Alert.alert(
            t('chat.confirmEdit'),
            t('event.deleteConfirm'),
            [
              { text: t('chat.no'), style: 'cancel' },
              {
                text: t('chat.yes'),
                onPress: () => {
                  const updateData = {
                    ...response.event,
                    title: response.event?.title || event.title,
                    color: (event as any).color || '#007AFF',
                  };
                  onEventUpdate(event.id, updateData);
                  setTimeout(() => {
                    const confirmMessage: Message = {
                      id: (Date.now() + 2).toString(),
                      text: t('chat.eventUpdated'),
                      isUser: false,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, confirmMessage]);
                  }, 500);
                }
              }
            ]
          );
        } else {
          // 複数件: 選択肢を提示
          const options = matchedEvents.map((event, index) => ({
            text: `${index + 1}. ${event.title}`,
            onPress: () => {
              Alert.alert(
                t('chat.confirmEdit'),
                t('event.deleteConfirm'),
                [
                  { text: t('chat.no'), style: 'cancel' },
                  {
                    text: t('chat.yes'),
                    onPress: () => {
                      if (!response.event) return;
                      const updateData = {
                        ...response.event,
                        title: response.event.title || event.title,
                        color: (event as any).color || '#007AFF',
                      };
                      onEventUpdate(event.id, updateData);
                      setTimeout(() => {
                        const confirmMessage: Message = {
                          id: (Date.now() + 2).toString(),
                          text: t('chat.eventUpdated'),
                          isUser: false,
                          timestamp: new Date(),
                        };
                        setMessages(prev => [...prev, confirmMessage]);
                      }, 500);
                    }
                  }
                ]
              );
            }
          }));
          options.push({ text: t('common.cancel'), onPress: () => {} } as any);

          Alert.alert(
            t('chat.multipleEventsFound'),
            t('chat.whichToEdit'),
            options as any
          );
        }
      } else if (response.intent === 'search_events' && response.keywords) {
        // 予定検索
        const { startDate, endDate, title: titleKeyword } = response.keywords;

        // 検索条件に基づいてイベントをフィルタ
        const searchResults = existingEvents.filter(event => {
          // 日付範囲でフィルタ
          let dateMatch = true;
          if (startDate && endDate) {
            const eventStart = new Date(event.start);
            const searchStart = new Date(startDate);
            const searchEnd = new Date(endDate);
            searchEnd.setHours(23, 59, 59, 999); // 終了日の最後まで含める

            dateMatch = eventStart >= searchStart && eventStart <= searchEnd;
          }

          // タイトルでフィルタ（オプション）
      const titleMatch = !titleKeyword || event.title.toLowerCase().includes(titleKeyword.toLowerCase());

      return dateMatch && titleMatch;
    });

        if (searchResults.length === 0) {
          // 予定が見つからない
          setTimeout(() => {
            const notFoundMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: t('chat.noEventsInPeriod'),
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, notFoundMessage]);
          }, 500);
        } else {
          // 予定を見つけた - リスト形式で表示
          const resultText = searchResults
            .map((event, index) => {
              const eventDate = new Date(event.start);
              const dateStr = eventDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
              const timeStr = (event as any).isAllDay
                ? '終日'
                : `${eventDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}〜`;
              return `${index + 1}. ${dateStr} ${timeStr} ${event.title}`;
            })
            .join('\n');

          setTimeout(() => {
            const resultMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: t('chat.searchResults', { count: searchResults.length }) + '\n\n' + resultText,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, resultMessage]);
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // ユーザーフレンドリーなエラーメッセージを生成
      let errorText = t('chat.error');
      let debugInfo = '';
      
      if (error.message?.includes('API key') || error.message?.includes('ANTHROPIC_API_KEY') || error.message?.includes('Gemini API key')) {
        errorText = t('chat.errors.apiKey');
        debugInfo = 'APIキーエラー';
      } else if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('NetworkError')) {
        errorText = t('chat.errors.network');
        debugInfo = 'ネットワークエラー';
      } else if (error.message?.includes('500')) {
        errorText = t('chat.errors.server');
        debugInfo = 'サーバーエラー';
      } else if (error.message?.includes('JSON')) {
        errorText = t('chat.errors.jsonParse');
        debugInfo = 'JSON解析エラー';
      } else if (error.message?.includes('画像')) {
        errorText = t('chat.errors.imageAnalysis');
        debugInfo = '画像解析エラー';
      } else {
        errorText = t('chat.errors.unknown') + '\n' + t('chat.errors.retry');
        debugInfo = error.message || 'Unknown';
      }
      
      // 開発環境では詳細情報を追加
      const fullErrorText = formatErrorMessage(errorText, debugInfo, error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fullErrorText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // メッセージから名前を抽出するヘルパー関数
  const extractNameFromMessage = (message: string): string | null => {
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
  };

  // 画像解析を実行
  const handleImageAnalysis = async (imageUri: string, userMessage?: string) => {
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
        setPendingImageForNameConfirmation(imageUri);
        setIsWaitingForName(true);

        // AIメッセージで名前を尋ねる
        const askNameMessage: Message = {
          id: Date.now().toString(),
          text: 'シフト表からあなたの予定を抽出します。お名前を教えてください。\n\n例: 「本多です」「名前は田中です」',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, askNameMessage]);
        return; // 処理を中断
      }

      // 5. 解析開始メッセージ
      const nameInfo = nameSource === 'saved' ? `（保存された名前「${finalName}」を使用）` : '';
      const progressMsgId = Date.now().toString();
      const analyzingMessage: Message = {
        id: progressMsgId,
        text: `画像を解析しています...${nameInfo}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, analyzingMessage]);

      // 6. 名前を含むメッセージを生成
      const messageForAnalysis = `名前は${finalName}です`;

      // 7. 画像を解析（進捗表示付き）
      const result = await hybridAIService.streamImageAnalysis(
        imageUri,
        // onProgress: 進捗状況を表示
        (progress: number, statusText: string) => {
          const progressEmoji = progress < 30 ? '📤' : progress < 70 ? '🤖' : progress < 90 ? '✨' : '✅';
          const progressText = `${progressEmoji} ${statusText} (${progress}%)${nameInfo}`;
          
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === progressMsgId 
                ? { ...msg, text: progressText }
                : msg
            )
          );
        },
        messageForAnalysis,
        selectedTimezone,
        locale
      );

      if (result.events.length === 0) {
        const notFoundMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: '予定が見つかりませんでした。',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, notFoundMessage]);
      } else {
        // イベントを保存
        setAnalyzedEvents(result.events);
        setWaitingForEventConfirmation(true);

        // イベントリストを含む編集可能なメッセージを生成
        const eventsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `${result.events.length}件のイベントを見つけました:`,
          isUser: false,
          timestamp: new Date(),
          type: 'editable_events',
          events: result.events,
          onEventsUpdate: (updatedEvents) => {
            setAnalyzedEvents(updatedEvents);
          },
        };
        setMessages(prev => [...prev, eventsMessage]);

        // 確認メッセージを追加
        const confirmMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: 'カレンダーに追加しますか？',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMessage]);
      }
    } catch (error: any) {
      console.error('画像解析エラー:', error);
      
      // ユーザーフレンドリーなエラーメッセージ
      let errorText = t('chat.errors.imageAnalysis');
      const debugInfo = error.message || 'Unknown';
      
      // 開発環境では詳細情報を追加
      const fullErrorText = formatErrorMessage(errorText, debugInfo, error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fullErrorText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      // エラーを再スローして、呼び出し元でキャッチさせる
      throw error;
    }
  };

  // 画像選択ボタンの処理
  const handleImagePick = async () => {
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
        // モーダルは表示せず、画像プレビューのみ表示
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert(t('common.error'), t('chat.imagePickError'));
    }
  };

  // モーダル確認処理: 編集済みイベントをカレンダーに追加
  const handleEventModalConfirm = async (editedEvents: EventEntry[]) => {
    console.log('📅 編集済みイベントをカレンダーに追加:', editedEvents.length, '件');
    setShowEventModal(false);

    if (onEventCreate) {
      let successCount = 0;
      editedEvents.forEach((event, index) => {
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
          console.log(`📝 イベント ${index + 1}/${editedEvents.length} 変換完了:`, eventData);
          onEventCreate(eventData);
          console.log(`✅ イベント ${index + 1}/${editedEvents.length} 登録成功`);
          successCount++;
        } catch (error) {
          console.error(`❌ イベント ${index + 1}/${editedEvents.length} 作成エラー:`, error);
        }
      });

      console.log('🎉 イベント登録完了:', successCount, '/', editedEvents.length, '件');
      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `${successCount}件のイベントをカレンダーに追加しました。`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);
    }

    // イベントデータをクリア
    setAnalyzedEvents([]);
    await AsyncStorage.removeItem('@event_state');
  };

  // モーダルキャンセル処理
  const handleEventModalCancel = async () => {
    console.log('❌ イベント追加をキャンセル');
    setShowEventModal(false);
    setAnalyzedEvents([]);
    await AsyncStorage.removeItem('@event_state');

    const cancelMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'イベントの追加をキャンセルしました。',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage message={item} />
  );

  if (!isVisible) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.title')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleClearHistory}
            accessibilityLabel={t('chat.clearHistory')}
            accessibilityRole="button"
          >
            <TrashIcon size={22} color="#666" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel={t('chat.close')}
            accessibilityRole="button"
          >
            <XMarkIcon size={24} color="#333" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* メッセージリスト */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('chat.thinking')}</Text>
          </View>
        )}

        {/* フッター */}
        <View style={styles.footer}>
        {/* 画像プレビュー */}
        {selectedImageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.imageRemoveButton}
              onPress={() => setSelectedImageUri(null)}
            >
              <XMarkIcon size={20} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          {/* 画像添付ボタン */}
          <TouchableOpacity
            style={styles.attachButton}
              onPressIn={handleImagePick}
            disabled={isLoading}
          >
            <PaperClipIcon size={24} color={isLoading ? '#ccc' : '#007AFF'} strokeWidth={2} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.inputPlaceholder')}
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: (inputText.trim() || selectedImageUri) ? '#007AFF' : '#ccc' }
            ]}
              onPressIn={sendMessage}
            disabled={(!inputText.trim() && !selectedImageUri) || isLoading}
          >
            <PaperAirplaneIcon
              size={20}
              color="#fff"
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>

      {/* イベント編集モーダル */}
      <EditableEventListModal
        visible={showEventModal}
        events={analyzedEvents}
        onConfirm={handleEventModalConfirm}
        onCancel={handleEventModalCancel}
      />
    </SafeAreaView>
  );
};

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;