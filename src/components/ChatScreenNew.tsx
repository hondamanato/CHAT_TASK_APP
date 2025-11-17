import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
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
import { aiChatService, type ToolResult, type StreamingMessage } from '../services/aiChatService';
import { ChatMessage, Message } from './ChatMessage';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

// AsyncStorageキー
const CHAT_HISTORY_KEY = '@chat_history_v2';

interface ChatScreenProps {
  isVisible: boolean;
  onClose: () => void;
  onEventCreate?: (event: any) => void;
  onEventUpdate?: (id: string, eventData: any) => void;
  onEventDelete?: (id: string) => void;
  existingEvents?: Array<{id: string; title: string; start: string; end: string}>;
}

export const ChatScreenNew: React.FC<ChatScreenProps> = ({
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
  const [streamingText, setStreamingText] = useState('');
  const keyboardHeight = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  // 画像関連
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // 会話履歴をロード
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const storedMessages = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          const restoredMessages = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(restoredMessages);
        } else if (isVisible) {
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            text: t('chat.welcome'),
            isUser: false,
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('会話履歴の読み込みエラー:', error);
      }
    };

    if (isVisible) {
      loadChatHistory();
    }
  }, [isVisible]);

  // 会話履歴を保存
  useEffect(() => {
    const saveChatHistory = async () => {
      try {
        await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error('会話履歴の保存エラー:', error);
      }
    };

    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // キーボード処理
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
        ? -keyboardHeight.value + 34
        : 0
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
              await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
              setMessages([]);
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

  // 画像をBase64に変換
  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 2400 } }],
        {
          compress: 0.95,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return base64;
    } catch (error) {
      console.error('画像変換エラー:', error);
      throw new Error('画像の変換に失敗しました');
    }
  };

  // メッセージ送信
  const sendMessage = async () => {
    if ((!inputText.trim() && !selectedImageUri) || isLoading) return;

    const messageText = inputText.trim();
    const imageUri = selectedImageUri;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText || (imageUri ? t('chat.imageAttached') : ''),
      isUser: true,
      timestamp: new Date(),
      imageUri: imageUri || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedImageUri(null);
    setIsLoading(true);
    setStreamingText('');

    // AIメッセージのプレースホルダー
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMessage]);

    // スクロール
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // 会話履歴を構築
      const conversationMessages = messages
        .slice(-10)
        .map(msg => ({
          role: msg.isUser ? 'user' as const : 'assistant' as const,
          content: msg.text,
        }));

      // 新しいユーザーメッセージを追加
      let userContent = messageText;
      
      // 画像がある場合はBase64に変換
      if (imageUri) {
        const base64Image = await convertImageToBase64(imageUri);
        // 画像解析を明示的に依頼するメッセージを追加
        userContent = `${messageText || '画像を解析してください'}\n[IMAGE_BASE64:${base64Image}]`;
      }

      conversationMessages.push({
        role: 'user',
        content: userContent,
      });

      // ストリーミングでメッセージを受信
      await aiChatService.sendMessage(
        conversationMessages,
        existingEvents,
        (streamMessage: StreamingMessage) => {
          if (streamMessage.type === 'text') {
            // テキストをリアルタイム更新
            setStreamingText(streamMessage.content || '');
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && !lastMessage.isUser) {
                lastMessage.text = streamMessage.content || '';
              }
              return newMessages;
            });

            // スクロール
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          }
          else if (streamMessage.type === 'tool-result') {
            // ツール実行結果を処理
            handleToolResult(streamMessage.toolResult!);
          }
          else if (streamMessage.type === 'finish') {
            setIsLoading(false);
            setStreamingText('');
          }
        }
      );

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: t('chat.error'),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => {
        // 空のAIメッセージを削除してエラーメッセージを追加
        const filtered = prev.filter(m => m.text !== '');
        return [...filtered, errorMessage];
      });
      setIsLoading(false);
      setStreamingText('');
    }
  };

  // ツール実行結果を処理
  const handleToolResult = (toolResult: ToolResult) => {
    console.log('🔧 Handling tool result:', toolResult);

    switch (toolResult.toolName) {
      case 'createEvent':
        if (toolResult.result.success && toolResult.result.events && onEventCreate) {
          toolResult.result.events.forEach(event => {
            const calendarEvent = {
              title: event.title,
              date: event.date,
              endDate: event.endDate,
              startTime: event.startTime,
              endTime: event.endTime,
              isAllDay: event.isAllDay || false,
              notes: event.notes || event.description || '',
              color: event.color || '#007AFF',
              recurrence: event.recurrence,
              reminders: event.reminders || [],
            };
            onEventCreate(calendarEvent);
          });
        }
        break;

      case 'deleteEvent':
        if (toolResult.result.success && toolResult.result.keywords && onEventDelete) {
          const matchedEvents = searchEvents(
            toolResult.result.keywords.date,
            toolResult.result.keywords.title
          );
          
          if (matchedEvents.length === 1) {
            onEventDelete(matchedEvents[0].id);
          } else if (matchedEvents.length > 1) {
            // 複数件の場合は選択肢を表示
            showMultipleEventSelection(matchedEvents, 'delete');
          }
        }
        break;

      case 'updateEvent':
        if (toolResult.result.success && toolResult.result.keywords && toolResult.result.event && onEventUpdate) {
          const matchedEvents = searchEvents(
            toolResult.result.keywords.date,
            toolResult.result.keywords.title
          );
          
          if (matchedEvents.length === 1) {
            onEventUpdate(matchedEvents[0].id, toolResult.result.event);
          } else if (matchedEvents.length > 1) {
            showMultipleEventSelection(matchedEvents, 'update', toolResult.result.event);
          }
        }
        break;

      case 'searchEvents':
        // 検索結果はAIのメッセージに含まれる
        break;

      case 'analyzeImage':
        if (toolResult.result.success && toolResult.result.events && onEventCreate) {
          // 画像解析結果のイベントを作成
          toolResult.result.events.forEach((event: any) => {
            const calendarEvent = {
              title: event.title,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              isAllDay: false,
              notes: event.description || '',
              color: '#007AFF',
              reminders: [],
            };
            onEventCreate(calendarEvent);
          });
        }
        break;
    }
  };

  // イベント検索
  const searchEvents = (dateKeyword?: string, titleKeyword?: string) => {
    return existingEvents.filter(event => {
      const dateMatch = !dateKeyword || (() => {
        if (!event.start || typeof event.start !== 'object') return false;
        const eventDate = event.start as Date;
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`.startsWith(dateKeyword);
      })();

      const titleMatch = !titleKeyword || event.title.toLowerCase().includes(titleKeyword.toLowerCase());

      return dateMatch && titleMatch;
    });
  };

  // 複数イベント選択
  const showMultipleEventSelection = (events: any[], action: 'delete' | 'update', updateData?: any) => {
    const options = events.map((event, index) => ({
      text: `${index + 1}. ${event.title}`,
      onPress: () => {
        if (action === 'delete' && onEventDelete) {
          onEventDelete(event.id);
        } else if (action === 'update' && onEventUpdate && updateData) {
          onEventUpdate(event.id, updateData);
        }
      }
    }));

    options.push({ text: t('common.cancel'), onPress: () => {} });

    Alert.alert(
      t('chat.multipleEventsFound'),
      action === 'delete' ? t('chat.whichToDelete') : t('chat.whichToEdit'),
      options as any
    );
  };

  // 画像選択
  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired'),
          t('chat.imagePermissionMessage')
        );
        return;
      }

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

export default ChatScreenNew;

