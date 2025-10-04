import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { XMarkIcon, PaperAirplaneIcon } from 'react-native-heroicons/outline';
import { ChatMessage, type Message } from './ChatMessage';
import { hybridAIService } from '@/src/services/hybridAIService';

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

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      // 初回表示時の挨拶メッセージ
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: 'こんにちは!予定の追加や管理をお手伝いします。「明日の3時に会議」のように話しかけてください。',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isVisible]);

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

  // イベント検索ヘルパー関数
  const searchEvents = (dateKeyword?: string, titleKeyword?: string) => {
    return existingEvents.filter(event => {
      // 日付フィルタ: ローカルタイムゾーン（JST）で YYYY-MM-DD 形式に変換して比較
      const dateMatch = !dateKeyword || (event.start && event.start instanceof Date && (() => {
        const year = event.start.getFullYear();
        const month = String(event.start.getMonth() + 1).padStart(2, '0');
        const day = String(event.start.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`.startsWith(dateKeyword);
      })());

      // タイトルフィルタ（部分一致）
      const titleMatch = !titleKeyword || event.title.toLowerCase().includes(titleKeyword.toLowerCase());

      return dateMatch && titleMatch;
    });
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
      const response = await hybridAIService.processChatMessage(inputText.trim());
      
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
              title: event.title || event.notes || '予定',
              date: event.date,
              endDate: event.endDate,
              startTime: event.startTime,
              endTime: event.endTime,
              isAllDay: event.isAllDay || false,
              notes: event.workplace ? `場所: ${event.workplace}` : (event.notes || ''),
              color: '#007AFF',
            };
            onEventCreate(calendarEvent);
          });

          setTimeout(() => {
            const confirmMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: `${response.events?.length || 0}件の予定をカレンダーに追加しました！`,
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
              text: '該当する予定は見つかりませんでした。',
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, notFoundMessage]);
          }, 500);
        } else if (matchedEvents.length === 1) {
          // 1件のみ: 確認して削除
          const event = matchedEvents[0];
          Alert.alert(
            '予定を削除',
            `「${event.title}」を削除しますか？`,
            [
              { text: 'いいえ', style: 'cancel' },
              {
                text: 'はい',
                style: 'destructive',
                onPress: () => {
                  onEventDelete(event.id);
                  setTimeout(() => {
                    const confirmMessage: Message = {
                      id: (Date.now() + 2).toString(),
                      text: '予定を削除しました。',
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
                '予定を削除',
                `「${event.title}」を削除しますか？`,
                [
                  { text: 'いいえ', style: 'cancel' },
                  {
                    text: 'はい',
                    style: 'destructive',
                    onPress: () => {
                      onEventDelete(event.id);
                      setTimeout(() => {
                        const confirmMessage: Message = {
                          id: (Date.now() + 2).toString(),
                          text: '予定を削除しました。',
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
          options.push({ text: 'キャンセル', onPress: () => {}, style: 'cancel' as any });

          Alert.alert(
            '該当する予定が複数あります',
            'どれを削除しますか？',
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
              text: '該当する予定は見つかりませんでした。',
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, notFoundMessage]);
          }, 500);
        } else if (matchedEvents.length === 1) {
          // 1件のみ: 確認して更新
          const event = matchedEvents[0];
          Alert.alert(
            '予定を編集',
            `「${event.title}」を編集しますか？`,
            [
              { text: 'いいえ', style: 'cancel' },
              {
                text: 'はい',
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
                      text: '予定を編集しました。',
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
                '予定を編集',
                `「${event.title}」を編集しますか？`,
                [
                  { text: 'いいえ', style: 'cancel' },
                  {
                    text: 'はい',
                    onPress: () => {
                      const updateData = {
                        ...response.event,
                        title: response.event.title || event.title,
                        color: event.color || '#007AFF',
                      };
                      onEventUpdate(event.id, updateData);
                      setTimeout(() => {
                        const confirmMessage: Message = {
                          id: (Date.now() + 2).toString(),
                          text: '予定を編集しました。',
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
          options.push({ text: 'キャンセル', onPress: () => {}, style: 'cancel' as any });

          Alert.alert(
            '該当する予定が複数あります',
            'どれを編集しますか？',
            options as any
          );
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
});

export default ChatScreen;