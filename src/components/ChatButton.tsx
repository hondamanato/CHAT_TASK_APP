import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ChatBubbleLeftRightIcon } from 'react-native-heroicons/outline';

interface ChatButtonProps {
  onPress: () => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="AIチャットを開く"
      accessibilityRole="button"
    >
      <ChatBubbleLeftRightIcon size={24} color="#ffffff" strokeWidth={2} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ChatButton;