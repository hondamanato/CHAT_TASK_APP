import { useTheme } from '@/hooks/useThemeColor';
import { aiService } from '@/src/services/aiService';
import { geminiChatService } from '@/src/services/geminiChatService';
import { patternAnalysisService } from '@/src/services/patternAnalysisService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { CameraIcon, PaperAirplaneIcon, TrashIcon, XMarkIcon } from 'react-native-heroicons/outline';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import type { EventCreateData } from '../screens/EventCreateScreen';
import { ChatMessage, type Message } from './ChatMessage';

// ヘルパー関数
const calculateDuration = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
};

const getDayOfWeek = (dateString: string): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const date = new Date(dateString);
  return days[date.getDay()];
};

interface ChatScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, event: any) => void;
  onEventDelete?: (id: string) => void;
  onDeleteRecurringSeries?: (seriesId: string) => void;
  onDeleteRecurringFuture?: (eventId: string) => void;
  existingEvents?: any[]; // 既存の予定リスト
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  isVisible,
  onClose,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onDeleteRecurringSeries,
  onDeleteRecurringFuture,
  existingEvents = []
}) => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const keyboardHeight = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  // カメラ・画像選択機能
  const handleCameraPress = () => {
    Alert.alert(
      '画像を選択',
      '画像の取得方法を選択してください',
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: 'カメラで撮影',
          onPress: handleTakePhoto
        },
        {
          text: 'ギャラリーから選択',
          onPress: handlePickImage
        }
      ],
      { cancelable: true }
    );
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラの権限が必要です', 'カメラを使用するために権限を許可してください。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      handleImageSelected(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      handleImageSelected(result.assets[0].uri);
    }
  };

  const handleImageSelected = async (imageUri: string) => {
    // 画像メッセージとして送信
    const imageMessage: Message = {
      id: Date.now().toString(),
      text: 'シフト表を解析中...',
      isUser: true,
      timestamp: new Date(),
      imageUri: imageUri
    };
    
    setMessages(prev => [...prev, imageMessage]);
    setIsLoading(true);
    
    try {
      // 画像を解析してシフト情報を抽出
      const analysisResult = await aiService.analyzeShiftImage(imageUri);
      
      if (analysisResult.shifts && analysisResult.shifts.length > 0) {
        // 抽出されたシフト情報を予定として作成
        let createdCount = 0;
        
        analysisResult.shifts.forEach((shift) => {
          if (shift.date && shift.startTime && shift.endTime && onEventCreate) {
            const eventCreateData: EventCreateData = {
              title: shift.workplace ? `勤務 - ${shift.workplace}` : '勤務',
              date: shift.date,
              startTime: shift.startTime,
              endTime: shift.endTime,
              location: { name: shift.workplace || '' },
              notes: shift.notes || '',
              color: '#4CAF50', // 緑色でシフトを表示
              reminders: [],
              isAllDay: false,
            };
            
            console.log('🔍 シフトから作成される予定:', eventCreateData);
            onEventCreate(eventCreateData);
            createdCount++;
          }
        });
        
        // 解析結果メッセージ
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `シフト表を解析しました！\n${createdCount}件の予定をカレンダーに追加しました。\n\n精度: ${Math.round(analysisResult.confidence * 100)}%`,
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, responseMessage]);
      } else {
        // 解析できなかった場合
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'シフト表の読み取りに失敗しました。画像が不鮮明か、対応していない形式の可能性があります。',
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('画像解析エラー:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'シフト表の解析中にエラーが発生しました。もう一度お試しください。',
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 初期化時にチャット履歴を読み込み
  useEffect(() => {
    const initializeChatHistory = async () => {
      if (isVisible) {
        const hasHistory = await loadChatHistory();
        if (!hasHistory) {
          // 履歴がない場合のみ挨拶メッセージを表示
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            text: 'こんにちは！予定の追加、編集、削除をお手伝いします。「明日の3時に会議」「明日の会議を2時に変更」「明日の会議を削除」のように話しかけてください。',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      }
    };

    initializeChatHistory();
  }, [isVisible]);

  // メッセージが更新されるたびに自動保存
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // 既存の予定をGeminiChatServiceに設定
  useEffect(() => {
    if (existingEvents.length > 0) {
      const formattedEvents = existingEvents.map(event => ({
        id: event.id,
        title: event.title,
        date: event.start.toISOString().split('T')[0],
        startTime: event.start.toTimeString().split(' ')[0].substring(0, 5),
        endTime: event.end.toTimeString().split(' ')[0].substring(0, 5),
        description: event.notes || '',
        isAllDay: event.isAllDay || false
      }));
      geminiChatService.setExistingEvents(formattedEvents);
    }
  }, [existingEvents]);

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

  const handleBackgroundPress = () => {
    Keyboard.dismiss();
  };

  // チャット履歴を保存
  const saveChatHistory = async (messages: Message[]) => {
    try {
      await AsyncStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
      console.log('チャット履歴保存エラー:', error);
    }
  };

  // チャット履歴を読み込み
  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('chatHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // timestampを文字列からDateオブジェクトに復元
        const restoredHistory = parsedHistory.map((message: any) => {
          let timestamp: Date | undefined;

          try {
            // timestampが存在し、有効な値の場合のみ変換を試行
            if (message.timestamp) {
              const dateObj = new Date(message.timestamp);
              // 有効な日付かチェック
              if (!isNaN(dateObj.getTime())) {
                timestamp = dateObj;
              } else {
                // 無効な日付の場合は現在時刻を使用
                timestamp = new Date();
              }
            } else {
              // timestampが存在しない場合は現在時刻を使用
              timestamp = new Date();
            }
          } catch (error) {
            // エラーが発生した場合は現在時刻を使用
            console.log('timestamp変換エラー:', error);
            timestamp = new Date();
          }

          return {
            ...message,
            timestamp
          };
        });
        setMessages(restoredHistory);
        return true;
      }
      return false;
    } catch (error) {
      console.log('チャット履歴読み込みエラー:', error);
      return false;
    }
  };

  // 会話文脈を抽出（直近の会話から）
  const extractConversationContext = (messages: Message[], maxMessages: number = 8): string => {
    if (messages.length === 0) return '';

    // 直近のメッセージを取得（ウェルカムメッセージを除く）
    const recentMessages = messages
      .filter(msg => !msg.text.includes('こんにちは！予定の追加、編集、削除をお手伝いします'))
      .slice(-maxMessages);

    if (recentMessages.length === 0) return '';

    // 会話を文字列として整形
    const contextLines = recentMessages.map(msg => {
      const speaker = msg.isUser ? 'ユーザー' : 'アシスタント';
      return `${speaker}: ${msg.text}`;
    });

    return contextLines.join('\n');
  };

  // チャット履歴をクリア
  const clearChatHistory = () => {
    Alert.alert(
      'チャット履歴削除',
      'すべてのチャット履歴を削除しますか？この操作は取り消せません。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('chatHistory');
              const welcomeMessage: Message = {
                id: Date.now().toString(),
                text: 'こんにちは！予定の追加、編集、削除をお手伝いします。「明日の3時に会議」「明日の会議を2時に変更」「明日の会議を削除」のように話しかけてください。',
                isUser: false,
                timestamp: new Date(),
              };
              setMessages([welcomeMessage]);
            } catch (error) {
              console.log('チャット履歴削除エラー:', error);
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // 入力値を一時保存してからクリア
    const messageText = inputText.trim();
    setInputText('');
    textInputRef.current?.clear();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // スクロールを最下部に
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // 会話の文脈を抽出
      const context = extractConversationContext(messages);
      const response = await geminiChatService.processChatMessage(messageText, context);
      
      console.log('🤖 AIレスポンス:', {
        message: response.message,
        events: response.events,
        action: response.action,
        suggestedEvents: response.suggestedEvents
      });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // 統計パターン分析のためのインタラクションデータ収集と保存
      const isSuccessful = response.action && response.events && response.events.length > 0;
      if (isSuccessful && response.action?.type === 'create') {
        try {
          // 匿名化されたインタラクションデータを作成
          const eventCreated = response.events[0];
          const interaction = {
            message: messageText,
            response: response,
            success: true,
            timestamp: new Date(),
            eventCreated: {
              type: patternAnalysisService['categorizeEventType'](messageText),
              timeSlot: eventCreated.startTime || '09:00',
              duration: eventCreated.startTime && eventCreated.endTime
                ? calculateDuration(eventCreated.startTime, eventCreated.endTime)
                : 60,
              dayOfWeek: getDayOfWeek(eventCreated.date || new Date().toISOString().split('T')[0])
            }
          };

          // パターン分析サービスに保存（バックグラウンドで実行）
          console.log('📊 パターン学習データを保存中:', interaction.eventCreated);
          patternAnalysisService.saveAnonymousInteraction(interaction).catch(error => {
            console.log('📊 パターン学習データ保存エラー:', error);
          });
        } catch (error) {
          console.log('📊 パターン分析データ収集エラー:', error);
        }
      }

      // アクションに応じて処理を分岐
      if (response.action) {
        // デバッグログ追加
        console.log('🤖 AIからの詳細レスポンス:', {
          action: response.action,
          events: response.events,
          eventsCount: response.events?.length || 0,
          message: response.message,
          confidence: response.confidence
        });

        switch (response.action?.type) {
          case 'create':
            // 新規作成（編集・削除以外の場合のみ）
            if (response.events && response.events.length > 0 && onEventCreate) {
              console.log(`🔍 作成予定件数: ${response.events.length}件`);
              
              // 複数日予定の場合は1件のみであるべき
              if (response.events.length > 1) {
                console.warn('⚠️ 複数日予定が複数の予定として作成されています！', response.events);
              }
              
              // 複数日予定が複数の予定として作成されている場合の修正
              if (response.events.length > 1) {
                const firstEvent = response.events[0];
                const hasMultiDayPattern = response.events.every(e => e.title === firstEvent.title);
                
                if (hasMultiDayPattern) {
                  console.log('🔧 複数の同名予定を1つの複数日予定に統合します');
                  const sortedEvents = response.events.sort((a, b) => a.date.localeCompare(b.date));
                  const consolidatedEvent = {
                    ...firstEvent,
                    date: sortedEvents[0].date,
                    endDate: sortedEvents[sortedEvents.length - 1].date,
                    isMultiDay: true,
                    isAllDay: true
                  };
                  
                  // 統合された1つの予定のみ作成
                  const eventCreateData: EventCreateData = {
                    title: consolidatedEvent.title,
                    date: consolidatedEvent.date || new Date().toISOString().split('T')[0],
                    endDate: consolidatedEvent.endDate,
                    startTime: '09:00',
                    endTime: '10:00',
                    location: { name: '' },
                    notes: consolidatedEvent.description || '',
                    color: '#007AFF',
                    reminders: [],
                    isAllDay: true,
                  };
                  
                  console.log('🔍 統合された予定データ:', eventCreateData);
                  onEventCreate(eventCreateData);
                  return;
                }
              }

              const createEvents = async () => {
                let successCount = 0;
                let errorMessages = [];

                for (const event of response.events) {
                  // 編集・削除の場合は新規作成しない
                  if (event.id) {
                    console.log('⚠️ 編集・削除の予定が新規作成として処理されました。スキップします。', event);
                    continue;
                  }

                  try {
                    // AIレスポンスをEventCreateData形式に変換
                    const isMultiDay = event.endDate && event.endDate !== event.date;

                    const eventCreateData: EventCreateData = {
                      title: event.title,
                      date: event.date || new Date().toISOString().split('T')[0],
                      endDate: isMultiDay ? event.endDate : undefined,
                      startTime: event.startTime || '09:00',
                      endTime: event.endTime || '10:00',
                      location: { name: '' },
                      notes: event.description || '',
                      color: '#007AFF',
                      reminders: [],
                      isAllDay: isMultiDay ? true : (event.isAllDay || false),
                      recurrence: event.recurrence || { type: 'none', endCondition: 'never' },
                    };

                    console.log('🔍 AIチャットで作成される予定データ:', {
                      originalEvent: event,
                      eventCreateData: eventCreateData,
                      isMultiDay: isMultiDay,
                      hasEndDate: !!event.endDate
                    });

                    await onEventCreate(eventCreateData);
                    successCount++;
                  } catch (error) {
                    console.error('予定作成エラー:', error);
                    errorMessages.push(`「${event.title}」の作成に失敗しました`);
                  }
                }

                // 結果メッセージを表示
                setTimeout(() => {
                  let messageText = '';
                  if (successCount > 0) {
                    messageText = `${successCount}件の予定をカレンダーに追加しました！`;
                  }
                  if (errorMessages.length > 0) {
                    if (messageText) messageText += '\n';
                    messageText += errorMessages.join('\n');
                  }
                  if (!messageText) {
                    messageText = '予定の作成に失敗しました。';
                  }

                  const confirmMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    text: messageText,
                    isUser: false,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, confirmMessage]);
                }, 1000);
              };

              createEvents();
            }
            break;

          case 'edit':
            // 編集
            if (response.action.eventId && response.events && response.events.length > 0 && onEventUpdate) {
              const event = response.events[0];
              // 複数日予定かどうかを判定
              const isMultiDay = event.endDate && event.endDate !== event.date;
              
              const eventCreateData: EventCreateData = {
                title: event.title,
                date: event.date || new Date().toISOString().split('T')[0],
                endDate: isMultiDay ? event.endDate : undefined,
                startTime: event.startTime || '09:00',
                endTime: event.endTime || '10:00',
                location: { name: '' },
                notes: event.description || '',
                color: '#007AFF',
                reminders: [],
                isAllDay: isMultiDay ? true : (event.isAllDay || false),
              };
              onEventUpdate(response.action.eventId, eventCreateData);

              setTimeout(() => {
                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定を編集しました！',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, confirmMessage]);
              }, 1000);
            } else if (response.suggestedEvents && response.suggestedEvents.length > 0) {
              // 複数候補がある場合
              setTimeout(() => {
                const suggestionMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: `どの予定を編集しますか？\n${response.suggestedEvents?.map((event, index) => 
                    `${index + 1}. ${event.title} (${event.date} ${event.startTime}-${event.endTime})`
                  ).join('\n') || ''}`,
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, suggestionMessage]);
              }, 1000);
            } else {
              // 編集対象が見つからない場合
              setTimeout(() => {
                const errorMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '編集する予定が見つかりませんでした。予定のタイトルや日時を詳しく教えてください。',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              }, 1000);
            }
            break;

          case 'delete':
            // 削除
            if (response.action.eventId && onEventDelete) {
              try {
                await onEventDelete(response.action.eventId);

                // 削除成功のメッセージを表示
                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定を削除しました！',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, confirmMessage]);
              } catch (error) {
                console.error('削除エラー:', error);
                const errorMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定の削除に失敗しました。',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              }
            } else if (response.suggestedEvents && response.suggestedEvents.length > 0) {
              // 複数候補がある場合
              setTimeout(() => {
                const suggestionMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: `どの予定を削除しますか？\n${response.suggestedEvents?.map((event, index) =>
                    `${index + 1}. ${event.title} (${event.date} ${event.startTime}-${event.endTime})`
                  ).join('\n') || ''}`,
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, suggestionMessage]);
              }, 1000);
            }
            break;

          case 'delete_single':
            // 繰り返し予定の単一削除
            if (response.action.eventId && onEventDelete) {
              try {
                await onEventDelete(response.action.eventId);

                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: 'この予定のみを削除しました！',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, confirmMessage]);
              } catch (error) {
                console.error('削除エラー:', error);
                const errorMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定の削除に失敗しました。',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              }
            }
            break;

          case 'delete_series':
            // 繰り返し予定のシリーズ全削除
            if (response.action.eventId && onDeleteRecurringSeries) {
              try {
                await onDeleteRecurringSeries(response.action.eventId);

                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '繰り返し予定をすべて削除しました！',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, confirmMessage]);
              } catch (error) {
                console.error('削除エラー:', error);
                const errorMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定の削除に失敗しました。',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              }
            }
            break;

          case 'delete_future':
            // 繰り返し予定の指定日以降削除
            if (response.action.eventId && onDeleteRecurringFuture) {
              try {
                await onDeleteRecurringFuture(response.action.eventId);

                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: 'これ以降の繰り返し予定を削除しました！',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, confirmMessage]);
              } catch (error) {
                console.error('削除エラー:', error);
                const errorMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定の削除に失敗しました。',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              }
            }
            break;

          case 'bulk_delete':
            // 複数予定削除
            if (response.action.eventIds && response.action.eventIds.length > 0 && onEventDelete) {
              console.log('🔍 複数予定削除開始:', {
                eventIds: response.action.eventIds,
                deleteAll: response.action.deleteAll,
                deleteCondition: response.action.deleteCondition
              });

              // 順次削除を実行
              const deleteEvents = async () => {
                let successCount = 0;
                let errorCount = 0;

                for (const eventId of response.action.eventIds!) {
                  try {
                    await onEventDelete(eventId);
                    successCount++;
                    // 削除間隔を少し空ける（UIの応答性のため）
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (error) {
                    console.error('予定削除エラー:', error);
                    errorCount++;
                  }
                }

                // 結果メッセージを表示
                setTimeout(() => {
                  let messageText = '';
                  if (successCount > 0) {
                    messageText = `${successCount}件の予定を削除しました！`;
                  }
                  if (errorCount > 0) {
                    if (messageText) messageText += '\n';
                    messageText += `${errorCount}件の予定の削除に失敗しました。`;
                  }
                  if (!messageText) {
                    messageText = '予定の削除に失敗しました。';
                  }

                  const confirmMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    text: messageText,
                    isUser: false,
                    timestamp: new Date(),
                  };
                  setMessages(prev => [...prev, confirmMessage]);
                }, 1000);
              };

              deleteEvents();
            } else {
              // 削除対象が見つからない場合
              setTimeout(() => {
                const errorMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '削除する予定が見つかりませんでした。',
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
              }, 1000);
            }
            break;
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'すみません、エラーが発生しました。もう一度お試しください。',
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

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage message={item} />
  );

  if (!isVisible) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
      {/* ヘッダー */}
      <TouchableWithoutFeedback onPress={handleBackgroundPress}>
        <View style={[styles.header, { backgroundColor: colors.primaryBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearChatHistory}
            accessibilityLabel="チャット履歴をクリア"
            accessibilityRole="button"
          >
            <TrashIcon size={20} color={colors.secondaryText} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>AIチャット</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="チャットを閉じる"
            accessibilityRole="button"
          >
            <XMarkIcon size={24} color={colors.primaryText} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {/* メッセージリスト - スクロール可能領域 */}
      <View style={styles.messagesArea}>
        <FlatList
          ref={flatListRef}
          data={isLoading ? [...messages, {
            id: 'typing-indicator',
            text: '考え中...',
            isUser: false,
            timestamp: new Date()
          }] : messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        />
      </View>

      {/* フッター */}
      <Animated.View style={[styles.footer, { backgroundColor: colors.primaryBackground }, animatedFooterStyle]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleCameraPress}
            disabled={isLoading}
          >
            <CameraIcon
              size={20}
              color={colors.buttonPrimary}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <TextInput
            ref={textInputRef}
            style={[styles.textInput, { color: colors.primaryText, backgroundColor: colors.secondaryBackground }]}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            placeholder="メッセージを入力..."
            placeholderTextColor={colors.disabledText}
            multiline
            maxLength={500}
            editable={!isLoading}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? colors.buttonPrimary : colors.disabledText }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
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
  closeButton: {
    padding: 4,
  },
  clearButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 0,
  },
  messagesContainer: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messagesArea: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
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
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});

export default ChatScreen;