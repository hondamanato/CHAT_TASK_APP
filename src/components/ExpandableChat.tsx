import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { 
  MessageCircleIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  PhotoIcon 
} from 'react-native-heroicons/outline';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { openaiService } from '../services/openaiService';
import { useEventContext } from '../contexts/EventContext';

interface ExpandableChatProps {
  position?: 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const ExpandableChat: React.FC<ExpandableChatProps> = ({
  position = 'bottom-right',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai'; content: string; timestamp: Date }>>([]);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { addEvent } = useEventContext();
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // コンポーネントマウント時にAPI接続をテスト
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const isConnected = await openaiService.testConnection();
        setApiConnectionStatus(isConnected ? 'connected' : 'error');
      } catch (error) {
        console.error('API接続テストエラー:', error);
        setApiConnectionStatus('error');
      }
    };

    testConnection();
  }, []);
  
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { width: Math.min(300, screenWidth - 32), height: Math.min(400, screenHeight - 100) };
      case 'md':
        return { width: Math.min(350, screenWidth - 32), height: Math.min(500, screenHeight - 100) };
      case 'lg':
        return { width: Math.min(400, screenWidth - 32), height: Math.min(600, screenHeight - 100) };
      case 'xl':
        return { width: Math.min(450, screenWidth - 32), height: Math.min(700, screenHeight - 100) };
      case 'full':
        return { width: screenWidth - 32, height: screenHeight - 100 };
      default:
        return { width: Math.min(350, screenWidth - 32), height: Math.min(500, screenHeight - 100) };
    }
  };

  const getPositionStyle = () => {
    const sizeStyle = getSizeStyle();
    return position === 'bottom-right' 
      ? { bottom: 80, right: 16 }
      : { bottom: 80, left: 16 };
  };

  const getTogglePositionStyle = () => {
    return position === 'bottom-right'
      ? { bottom: 16, right: 16 }
      : { bottom: 16, left: 16 };
  };

  const toggleChat = () => {
    if (isOpen) {
      // Close animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsOpen(false);
      });
    } else {
      // Open animation
      setIsOpen(true);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const convertShiftToEventCreateData = (shift: any) => {
    return {
      title: shift.title || 'スケジュール',
      date: shift.date,
      startTime: shift.startTime || '09:00',
      endTime: shift.endTime || '10:00',
      endDate: shift.date,
      location: { name: shift.workplace || '' },
      notes: shift.notes || '',
      color: '#007AFF',
      reminders: [],
      isAllDay: false,
      calendarId: null,
    };
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = message.trim();
    setMessage('');
    setIsProcessing(true);

    // ユーザーメッセージをチャット履歴に追加
    setChatHistory(prev => [...prev, { 
      type: 'user', 
      content: userMessage, 
      timestamp: new Date() 
    }]);

    try {
      // OpenAI APIを使用して予定を抽出
      const response = await openaiService.processChatMessage(userMessage);
      
      let aiResponseContent = response.message || '予定を処理しました。';

      // 抽出された予定をカレンダーに追加
      if (response.events && response.events.length > 0) {
        let successCount = 0;
        
        for (const event of response.events) {
          try {
            const eventData = convertShiftToEventCreateData(event);
            addEvent(eventData);
            successCount++;
          } catch (error) {
            console.error('イベント追加エラー:', error);
          }
        }

        if (successCount > 0) {
          aiResponseContent = `${successCount}件の予定をカレンダーに追加しました！`;
          
          if (successCount < response.events.length) {
            aiResponseContent += ` (${response.events.length - successCount}件は追加できませんでした)`;
          }
        }
      }

      // AI応答をチャット履歴に追加
      setChatHistory(prev => [...prev, { 
        type: 'ai', 
        content: aiResponseContent, 
        timestamp: new Date() 
      }]);

    } catch (error) {
      console.error('予定抽出エラー:', error);
      
      // エラーメッセージをチャット履歴に追加
      setChatHistory(prev => [...prev, { 
        type: 'ai', 
        content: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`, 
        timestamp: new Date() 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImagePick = async () => {
    if (isProcessing) return;

    try {
      // カメラロールの権限をリクエスト
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        setChatHistory(prev => [...prev, { 
          type: 'ai', 
          content: '画像にアクセスする権限が必要です。設定から権限を有効にしてください。', 
          timestamp: new Date() 
        }]);
        return;
      }

      // 画像を選択
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setIsProcessing(true);

        // 画像処理中メッセージを追加
        setChatHistory(prev => [...prev, { 
          type: 'ai', 
          content: '画像を分析しています...', 
          timestamp: new Date() 
        }]);

        try {
          // OpenAI Vision APIで画像を解析
          const response = await openaiService.analyzeShiftImage(imageUri);
          
          let aiResponseContent = `画像を解析しました！`;
          let successCount = 0;

          // 抽出された予定をカレンダーに追加
          if (response.shifts && response.shifts.length > 0) {
            for (const shift of response.shifts) {
              try {
                const eventData = convertShiftToEventCreateData(shift);
                addEvent(eventData);
                successCount++;
              } catch (error) {
                console.error('イベント追加エラー:', error);
              }
            }

            if (successCount > 0) {
              aiResponseContent = `画像から${successCount}件の予定をカレンダーに追加しました！`;
              
              if (successCount < response.shifts.length) {
                aiResponseContent += ` (${response.shifts.length - successCount}件は追加できませんでした)`;
              }
            } else {
              aiResponseContent = '画像からスケジュールを読み取りましたが、カレンダーに追加できませんでした。';
            }
          } else {
            aiResponseContent = '画像からスケジュールを見つけることができませんでした。';
          }

          // 最終的なAI応答をチャット履歴に追加（分析中メッセージを更新）
          setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              type: 'ai',
              content: aiResponseContent,
              timestamp: new Date()
            };
            return updated;
          });

        } catch (error) {
          console.error('画像解析エラー:', error);
          
          // エラーメッセージを追加（分析中メッセージを更新）
          setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              type: 'ai',
              content: `画像解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
              timestamp: new Date()
            };
            return updated;
          });
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      setChatHistory(prev => [...prev, { 
        type: 'ai', 
        content: '画像の選択中にエラーが発生しました。', 
        timestamp: new Date() 
      }]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Chat Window */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatContainer,
            getPositionStyle(),
            getSizeStyle(),
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <BlurView intensity={20} style={styles.blurBackground} />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>AI チャット</Text>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: 
                  apiConnectionStatus === 'connected' ? '#4CAF50' : 
                  apiConnectionStatus === 'error' ? '#FF5722' : '#FFC107' 
                }
              ]} />
            </View>
            <TouchableOpacity onPress={toggleChat} style={styles.closeButton}>
              <XMarkIcon size={20} color="#666" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {chatHistory.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeTitle}>AI チャット</Text>
                {apiConnectionStatus === 'error' ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      ⚠️ OpenAI APIに接続できません
                    </Text>
                    <Text style={styles.errorDetailText}>
                      APIキーを確認するか、しばらく待ってから再試行してください。
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.welcomeText}>
                    予定をテキストや画像で入力すると、自動的にカレンダーに追加されます。
                    {'\n\n'}
                    テキスト例: 「明日午後2時から会議」
                    {'\n'}
                    画像: シフト表やスケジュール表の写真
                  </Text>
                )}
              </View>
            ) : (
              chatHistory.map((chat, index) => (
                <View key={index} style={[
                  styles.messageContainer,
                  chat.type === 'user' ? styles.userMessage : styles.aiMessage
                ]}>
                  <Text style={[
                    styles.messageText,
                    chat.type === 'user' ? styles.userMessageText : styles.aiMessageText
                  ]}>
                    {chat.content}
                  </Text>
                  <Text style={styles.messageTime}>
                    {chat.timestamp.toLocaleTimeString('ja-JP', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              ))
            )}
            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.processingText}>予定を抽出中...</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.footer}
          >
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handleImagePick}
                disabled={isProcessing || apiConnectionStatus === 'error'}
              >
                <PhotoIcon
                  size={20}
                  color={isProcessing ? '#999' : '#007AFF'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={message}
                onChangeText={setMessage}
                placeholder="メッセージを入力..."
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: message.trim() && !isProcessing ? '#007AFF' : '#f0f0f0' }
                ]}
                onPress={handleSendMessage}
                disabled={!message.trim() || isProcessing || apiConnectionStatus === 'error'}
              >
                {isProcessing ? (
                  <ActivityIndicator size={16} color="#999" />
                ) : (
                  <PaperAirplaneIcon
                    size={16}
                    color={message.trim() ? '#fff' : '#999'}
                    strokeWidth={2}
                  />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Toggle Button */}
      <TouchableOpacity
        style={[styles.toggleButton, getTogglePositionStyle()]}
        onPress={toggleChat}
        activeOpacity={0.8}
      >
        <MessageCircleIcon size={24} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  chatContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    padding: 16,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  welcomeText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 4,
  },
  processingText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetailText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  imageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});

export { ExpandableChat };
export default ExpandableChat;