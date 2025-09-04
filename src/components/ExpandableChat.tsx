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
} from 'react-native';
import { 
  MessageCircleIcon, 
  XMarkIcon, 
  PaperAirplaneIcon 
} from 'react-native-heroicons/outline';
import { BlurView } from 'expo-blur';

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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
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

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
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
            <Text style={styles.headerTitle}>AI チャット</Text>
            <TouchableOpacity onPress={toggleChat} style={styles.closeButton}>
              <XMarkIcon size={20} color="#666" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.placeholderText}>
              チャット機能を実装予定です
            </Text>
          </View>

          {/* Footer */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.footer}
          >
            <View style={styles.inputContainer}>
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
                  { backgroundColor: message.trim() ? '#007AFF' : '#f0f0f0' }
                ]}
                onPress={handleSendMessage}
                disabled={!message.trim()}
              >
                <PaperAirplaneIcon
                  size={16}
                  color={message.trim() ? '#fff' : '#999'}
                  strokeWidth={2}
                />
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
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
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