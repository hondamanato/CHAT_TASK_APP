import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { ChatBubbleLeftRightIcon } from 'react-native-heroicons/outline';

interface ChatFloatingButtonProps {
  onPress: (event: any) => void;
  style?: ViewStyle;
}

export const ChatFloatingButton: React.FC<ChatFloatingButtonProps> = ({ 
  onPress, 
  style 
}) => {
  return (
    <TouchableOpacity
      style={[styles.floatingButton, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel="AIチャットを開く"
      accessibilityRole="button"
    >
      <ChatBubbleLeftRightIcon size={28} color="#ffffff" strokeWidth={2} />
      <Text style={styles.buttonText}>AI</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 110, // タブバーとの距離を調整
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8, // Android用の影
    shadowColor: '#000', // iOS用の影
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
    textAlign: 'center',
  },
});

export default ChatFloatingButton;