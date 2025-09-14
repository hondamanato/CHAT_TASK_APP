import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useThemeColor';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUri?: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { colors } = useTheme();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)}
      style={[
        styles.container,
        message.isUser ? styles.userContainer : styles.aiContainer
      ]}
    >
      <View
        style={[
          styles.bubble,
          message.isUser
            ? [styles.userBubble, { backgroundColor: colors.buttonPrimary }]
            : [styles.aiBubble, { backgroundColor: colors.secondaryBackground }]
        ]}
      >
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
        <Text
          style={[
            styles.text,
            message.isUser
              ? [styles.userText, { color: colors.primaryBackground }]
              : [styles.aiText, { color: colors.primaryText }]
          ]}
        >
          {message.text}
        </Text>
      </View>
      <Text style={[styles.timestamp, { color: colors.secondaryText }]}>
        {formatTime(message.timestamp)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default ChatMessage;