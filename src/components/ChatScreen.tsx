import { hybridAIService } from '@/src/services/hybridAIService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Keyboard,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { PaperAirplaneIcon, PaperClipIcon, TrashIcon, XMarkIcon } from 'react-native-heroicons/outline';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { t } from '../i18n';
import { shiftAnalysisService, type ShiftEntry } from '../services/shiftAnalysisService';
import { ChatMessage, type Message } from './ChatMessage';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const keyboardHeight = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // シフト表解析関連のstate
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analyzedShifts, setAnalyzedShifts] = useState<ShiftEntry[]>([]);
  const [waitingForShiftConfirmation, setWaitingForShiftConfirmation] = useState(false);

  // 名前待ち状態管理
  const [pendingShiftImageUri, setPendingShiftImageUri] = useState<string | null>(null);
  const [waitingForName, setWaitingForName] = useState(false);

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

        // シフト状態を復元
        const storedShiftState = await AsyncStorage.getItem('@shift_state');
        if (storedShiftState) {
          const shiftState = JSON.parse(storedShiftState);
          console.log('🔄 シフト状態を復元:', shiftState);
          setWaitingForShiftConfirmation(shiftState.waitingForShiftConfirmation || false);
          setAnalyzedShifts(shiftState.analyzedShifts || []);
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

  // シフト状態をAsyncStorageに保存
  useEffect(() => {
    const saveShiftState = async () => {
      try {
        const shiftState = {
          waitingForShiftConfirmation,
          analyzedShifts
        };
        await AsyncStorage.setItem('@shift_state', JSON.stringify(shiftState));
        console.log('💾 シフト状態を保存:', shiftState);
      } catch (error) {
        console.error('シフト状態の保存エラー:', error);
      }
    };

    saveShiftState();
  }, [waitingForShiftConfirmation, analyzedShifts]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration: Platform.OS === 'ios' ? 250 : 200,
        easing: Easing.out(Easing.cubic)
      });
    });
    
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.value = withTiming(0, {
        duration: Platform.OS === 'ios' ? 250 : 200,
        easing: Easing.out(Easing.cubic)
      });
    });
    
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const animatedFooterStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: keyboardHeight.value > 0 
        ? -keyboardHeight.value + 34  // キーボード表示時：34px分を引いて隙間をなくす
        : 0                           // キーボード非表示時：元の位置
    }]
  }));

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
      waitingForShiftConfirmation,
      analyzedShiftsCount: analyzedShifts.length,
      waitingForName,
      hasPendingImage: !!pendingShiftImageUri
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
      // 画像が添付されている場合、シフト解析を自動的に開始
      if (currentImageUri) {
        console.log('📸 画像が検出されました。シフト解析を開始します。');
        const userName = messageText ? extractUserNameFromText(messageText) : null;

        // 名前が抽出できなかった場合、チャットで名前を聞く
        if (!userName) {
          console.log('⚠️ 名前が抽出できませんでした。チャットで名前を聞きます。');
          setPendingShiftImageUri(currentImageUri);
          setWaitingForName(true);
          setIsLoading(false);

          const askNameMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'お名前を教えてください。\n例: 「本多真翔です」「名前は本多真翔」',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, askNameMessage]);
          return;
        }

        // シフト解析を実行（エラー時も確実にローディング解除）
        try {
          await handleShiftAnalysis(currentImageUri, messageText, userName);
        } catch (error) {
          console.error('シフト解析でエラーが発生しました:', error);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 名前待ち状態の場合、名前を抽出してシフト解析
      if (waitingForName && pendingShiftImageUri) {
        console.log('📝 名前待ち状態: 名前を抽出します');
        const userName = extractUserNameFromText(messageText);

        if (!userName) {
          setIsLoading(false);
          const retryMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'お名前が確認できませんでした。\nもう一度お名前を教えてください。\n例: 「本多真翔です」',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, retryMessage]);
          return;
        }

        // 名前が抽出できたらシフト解析を実行
        console.log('✅ 名前抽出成功:', userName);
        setWaitingForName(false);
        const imageUri = pendingShiftImageUri;
        setPendingShiftImageUri(null);

        try {
          await handleShiftAnalysis(imageUri, messageText, userName);
        } catch (error) {
          console.error('シフト解析でエラーが発生しました:', error);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // シフト確認待ち状態の場合、カレンダー登録を実行
      console.log('🔍 シフト確認待ち判定:', {
        waitingForShiftConfirmation,
        analyzedShiftsLength: analyzedShifts.length,
        condition: waitingForShiftConfirmation && analyzedShifts.length > 0
      });

      if (waitingForShiftConfirmation && analyzedShifts.length > 0) {
        console.log('✅ シフト確認待ち状態: ユーザーの返信を確認');
        console.log('📋 保存されているシフト:', analyzedShifts);

        // 肯定的な返答パターン
        const affirmativePatterns = [
          /はい/,
          /うん/,
          /ok/i,
          /おk/,
          /追加/,
          /お願い/,
          /登録/,
          /いいよ/,
          /大丈夫/,
          /yes/i,
        ];

        const isAffirmative = affirmativePatterns.some(pattern => pattern.test(messageText));
        console.log('🔍 肯定的な返答パターンマッチ:', isAffirmative, 'メッセージ:', messageText);

        if (isAffirmative) {
          console.log('✅ 肯定的な返答: カレンダーに登録します');
          setWaitingForShiftConfirmation(false);

          // カレンダーに登録
          if (onEventCreate) {
            console.log('📅 onEventCreateが存在します。シフトを登録開始:', analyzedShifts.length, '件');
            let successCount = 0;
            analyzedShifts.forEach((shift, index) => {
              try {
                const eventData = shiftAnalysisService.convertShiftToEventData(shift);
                console.log(`📝 シフト ${index + 1}/${analyzedShifts.length} 変換完了:`, eventData);
                onEventCreate(eventData);
                console.log(`✅ シフト ${index + 1}/${analyzedShifts.length} 登録成功`);
                successCount++;
              } catch (error) {
                console.error(`❌ シフト ${index + 1}/${analyzedShifts.length} 作成エラー:`, error);
              }
            });

            console.log('🎉 シフト登録完了:', successCount, '/', analyzedShifts.length, '件');
            const successMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: `${successCount}件のシフトをカレンダーに追加しました。`,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, successMessage]);
          } else {
            console.error('❌ onEventCreateが未定義です！シフトを登録できません');
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: 'エラー: カレンダーに追加できませんでした。',
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
          }

          // シフトデータをクリア
          console.log('🧹 シフト状態をクリア');
          setAnalyzedShifts([]);
          await AsyncStorage.removeItem('@shift_state');
          setIsLoading(false);
          return;
        } else {
          // 否定的な返答
          console.log('❌ 否定的な返答: キャンセルします');
          setWaitingForShiftConfirmation(false);
          setAnalyzedShifts([]);
          await AsyncStorage.removeItem('@shift_state');

          const cancelMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'わかりました。キャンセルしました。',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, cancelMessage]);
          setIsLoading(false);
          return;
        }
      } else {
        console.log('❌ シフト確認待ち状態ではありません。通常のAI処理に進みます。');
      }

      // 会話履歴を構築（直近5往復=10メッセージ）
      const recentMessages = messages.slice(-10);
      const conversationHistory = recentMessages
        .map(msg => `${msg.isUser ? 'ユーザー' : 'AI'}: ${msg.text}`)
        .join('\n');

      const response = await hybridAIService.processChatMessage(
        messageText,
        conversationHistory // 会話履歴をコンテキストとして渡す
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

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
          const options = matchedEvents.map((event, index) => ({
            text: `${index + 1}. ${event.title}`,
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
          }));
          options.push({ text: t('common.cancel'), onPress: () => {} } as any);

          Alert.alert(
            t('chat.multipleEventsFound'),
            t('chat.whichToDelete'),
            options as any
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
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: t('chat.error'),
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

  // テキストからシフト解析を実行
  const handleShiftAnalysis = async (imageUri: string, messageText: string, userName: string) => {
    try {
      console.log('🔍 シフト解析開始:', { hasImage: !!imageUri, userName, messageText });

      // 解析開始メッセージ
      const analyzingMessage: Message = {
        id: Date.now().toString(),
        text: t('chat.analyzingShift'),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, analyzingMessage]);

      // シフト表を解析
      const result = await shiftAnalysisService.analyzeShiftTable(
        imageUri,
        userName
      );

      if (result.shifts.length === 0) {
        const notFoundMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: t('chat.noShiftsFound', { name: userName }),
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, notFoundMessage]);
      } else {
        // シフトを保存
        setAnalyzedShifts(result.shifts);
        setWaitingForShiftConfirmation(true);

        // シフトリストをフォーマット
        const shiftList = result.shifts.map((shift, index) => {
          const date = new Date(shift.date);
          const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
          const weekday = weekdays[date.getDay()];
          return `${index + 1}. ${shift.date} (${weekday}) ${shift.startTime}-${shift.endTime}`;
        }).join('\n');

        const shiftsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `シフトを${result.shifts.length}件見つけました:\n\n${shiftList}\n\nカレンダーに追加しますか？`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, shiftsMessage]);
      }
    } catch (error) {
      console.error('シフト解析エラー:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: t('chat.shiftAnalysisError'),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      // エラーを再スローして、呼び出し元でキャッチさせる
      throw error;
    }
  };

  // テキストから名前を抽出
  const extractUserNameFromText = (text: string): string | null => {
    console.log('🔍 名前抽出を試行:', text);

    // パターン: "名前は○○" "名前:○○" "名前 ○○" "○○です"
    const patterns = [
      /名前[はわ:：\s]+([^\s、。！？]+)/,
      /name\s*[:：]?\s*([^\s,\.!?]+)/i,
      /([^\s、。！？]+)です$/,  // "本多真翔です"のパターン
      /私は([^\s、。！？]+)/,
      /([^\s、。！？]+)と申します/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        console.log('✅ 名前抽出成功:', extractedName, 'パターン:', pattern);
        return extractedName;
      }
    }

    console.log('❌ 名前抽出失敗: パターンにマッチしませんでした');
    return null;
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
      <Animated.View style={[styles.footer, animatedFooterStyle]}>
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
              onPress={handleImagePick}
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
              onPress={sendMessage}
              disabled={(!inputText.trim() && !selectedImageUri) || isLoading}
            >
              <PaperAirplaneIcon
                size={20}
                color="#fff"
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

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
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
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