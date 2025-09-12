import { geminiChatService } from '@/src/services/geminiChatService';
import { aiService } from '@/src/services/aiService';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Keyboard,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Alert
} from 'react-native';
import { PaperAirplaneIcon, XMarkIcon, CameraIcon } from 'react-native-heroicons/outline';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { ChatMessage, type Message } from './ChatMessage';
import type { EventCreateData } from '../screens/EventCreateScreen';

interface ChatScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, event: any) => void;
  onEventDelete?: (id: string) => void;
  existingEvents?: any[]; // 既存の予定リスト
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

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      // 初回表示時の挨拶メッセージ
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: 'こんにちは！予定の追加、編集、削除をお手伝いします。「明日の3時に会議」「明日の会議を2時に変更」「明日の会議を削除」のように話しかけてください。',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isVisible]);

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

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // スクロールを最下部に
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await geminiChatService.processChatMessage(inputText.trim());
      
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

        switch (response.action.type) {
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

              response.events.forEach((event, index) => {
                // 編集・削除の場合は新規作成しない
                if (event.id) {
                  console.log('⚠️ 編集・削除の予定が新規作成として処理されました。スキップします。', event);
                  return;
                }
                
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
                };
                
                console.log('🔍 AIチャットで作成される予定データ:', {
                  originalEvent: event,
                  eventCreateData: eventCreateData,
                  isMultiDay: isMultiDay,
                  hasEndDate: !!event.endDate
                });
                
                onEventCreate(eventCreateData);
              });

              setTimeout(() => {
                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: `${response.events.length}件の予定をカレンダーに追加しました！`,
                  isUser: false,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, confirmMessage]);
              }, 1000);
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
              onEventDelete(response.action.eventId);

              setTimeout(() => {
                const confirmMessage: Message = {
                  id: (Date.now() + 2).toString(),
                  text: '予定を削除しました！',
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
    <TouchableWithoutFeedback onPress={handleBackgroundPress}>
      <SafeAreaView style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AIチャット</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="チャットを閉じる"
            accessibilityRole="button"
          >
            <XMarkIcon size={24} color="#333" strokeWidth={2} />
          </TouchableOpacity>
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
            <Text style={styles.loadingText}>考え中...</Text>
          </View>
        )}

        {/* フッター */}
        <Animated.View style={[styles.footer, animatedFooterStyle]}>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleCameraPress}
              disabled={isLoading}
            >
              <CameraIcon
                size={20}
                color="#007AFF"
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="メッセージを入力..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: inputText.trim() ? '#007AFF' : '#ccc' }
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
    </TouchableWithoutFeedback>
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