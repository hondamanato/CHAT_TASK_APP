import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { TrashIcon, ArrowUturnLeftIcon } from 'react-native-heroicons/outline';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface SwipeableMessageProps {
  message: Message;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  message,
  onDelete,
  onReply,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // スワイプジェスチャー
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        // 左スワイプのみ許可
        translateX.value = Math.max(event.translationX, -100);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -60) {
        // 60px以上左にスワイプしたら削除アクション
        runOnJS(handleDelete)();
      } else if (event.translationX < -30) {
        // 30px以上左にスワイプしたら返信アクション
        runOnJS(handleReply)();
        translateX.value = withSpring(0);
      } else {
        // 元の位置に戻す
        translateX.value = withSpring(0);
      }
    });

  const handleDelete = () => {
    Alert.alert(
      'メッセージ削除',
      'このメッセージを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: () => {
            translateX.value = withSpring(0);
          },
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            // 削除アニメーション
            opacity.value = withSpring(0, undefined, () => {
              runOnJS(() => onDelete?.(message.id))();
            });
          },
        },
      ]
    );
  };

  const handleReply = () => {
    onReply?.(message.id);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // メッセージのアニメーションスタイル
  const messageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  // アクションアイコンのスタイル
  const actionStyle = useAnimatedStyle(() => ({
    opacity: Math.min(-translateX.value / 30, 1),
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.messageContainer, messageStyle]}>
          <View
            style={[
              styles.messageWrapper,
              message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.aiMessageText,
              ]}>
                {message.text}
              </Text>
              <Text style={[
                styles.timestamp,
                message.isUser ? styles.userTimestamp : styles.aiTimestamp,
              ]}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
      
      {/* スワイプアクションアイコン */}
      <Animated.View style={[styles.actionContainer, actionStyle]}>
        <View style={styles.replyAction}>
          <ArrowUturnLeftIcon size={20} color="#007AFF" />
        </View>
        <View style={styles.deleteAction}>
          <TrashIcon size={20} color="#FF3B30" />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  messageContainer: {
    position: 'relative',
  },
  messageWrapper: {
    marginBottom: 0,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  userMessage: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderBottomRightRadius: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  aiMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#ffffff',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#666',
    textAlign: 'left',
  },
  actionContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
  },
  replyAction: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteAction: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SwipeableMessage;