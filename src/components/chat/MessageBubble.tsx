import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { CustomMessage } from '../../types/giftedChat';
import { EventListView } from './EventListView';

interface MessageBubbleProps {
  message: CustomMessage;
  isUser: boolean;
  waitingForEventConfirmation: boolean;
  onConfirmEvents?: () => void;
  onCancelEvents?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isUser,
  waitingForEventConfirmation,
  onConfirmEvents,
  onCancelEvents,
}) => {
  const renderContent = () => {
    // type === 'editable_events' の場合
    if (message.type === 'editable_events' && message.events && message.events.length > 0) {
      return (
        <View>
          <Text style={[styles.text, { color: isUser ? '#fff' : '#000' }]}>
            {message.text}
          </Text>
          <EventListView
            events={message.events}
            showConfirmButtons={waitingForEventConfirmation}
            onConfirm={onConfirmEvents!}
            onCancel={onCancelEvents!}
          />
        </View>
      );
    }

    // 通常テキスト
    return <Text style={[styles.text, { color: isUser ? '#fff' : '#000' }]}>{message.text}</Text>;
  };

  return (
    <View style={[styles.container, isUser ? styles.userMessage : styles.aiMessage]}>
      {!isUser && (
        <Image source={require('@/assets/images/mascot-chat.png')} style={styles.avatar} />
      )}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? '#007AFF' : '#E5E5EA',
            maxWidth: '80%',
          },
        ]}
      >
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
