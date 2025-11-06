import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { UserIcon, SparklesIcon } from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';
import { useAuth } from '../contexts/AuthContext';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date | undefined;
  imageUri?: string;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { colors } = useTheme();
  const { profile } = useAuth();

  const formatTime = (date: Date | string | undefined) => {
    if (!date) {
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      // 無効な日付の場合は現在時刻を使用
      if (isNaN(dateObj.getTime())) {
        return new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      return dateObj.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      // エラーが発生した場合は現在時刻を使用
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderIcon = () => {
    if (message.isUser) {
      if (profile?.profile_image_url) {
        return (
          <Image
            source={{
              uri: `${profile.profile_image_url}?t=${new Date(profile.updated_at).getTime()}`
            }}
            style={styles.avatar}
          />
        );
      }
      return (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.buttonPrimary }]}>
          <UserIcon size={16} color={colors.primaryBackground} />
        </View>
      );
    } else {
      return (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accentColor }]}>
          <SparklesIcon size={16} color={colors.primaryBackground} />
        </View>
      );
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      style={[
        styles.container,
        message.isUser ? styles.userContainer : styles.aiContainer
      ]}
    >
      <View style={[
        styles.messageRow,
        message.isUser ? styles.userMessageRow : styles.aiMessageRow
      ]}>
        {!message.isUser && (
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
        )}

        <View style={styles.messageContent}>
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
          <Text style={[
            styles.timestamp,
            { color: colors.secondaryText },
            message.isUser ? styles.userTimestamp : styles.aiTimestamp
          ]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>

        {message.isUser && (
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
        )}
      </View>
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
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  iconContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
  },
  messageContent: {
    maxWidth: '80%',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
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
  userTimestamp: {
    textAlign: 'right',
  },
  aiTimestamp: {
    textAlign: 'left',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default ChatMessage;