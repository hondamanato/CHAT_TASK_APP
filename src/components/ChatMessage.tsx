import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
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
          message.isUser ? styles.userBubble : styles.aiBubble
        ]}
      >
        <Text 
          style={[
            styles.text,
            message.isUser ? styles.userText : styles.aiText
          ]}
        >
          {message.text}
        </Text>
      </View>
      <Text style={styles.timestamp}>
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
});

export default ChatMessage;