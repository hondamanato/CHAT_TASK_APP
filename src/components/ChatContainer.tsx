import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChatScreen } from './ChatScreen';

interface ChatContainerProps {
  isVisible: boolean;
  buttonPosition: { x: number; y: number };
  onClose: () => void;
  duration?: number;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  isVisible,
  buttonPosition,
  onClose,
  duration = 300,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const buttonSize = 60;
  
  // チャットコンテナの高さ（画面の70%）
  const chatHeight = screenHeight * 0.7;
  
  // ボタンの位置に基づいてチャットの表示位置を計算
  const getChatPosition = () => {
    const buttonCenterX = buttonPosition.x + buttonSize / 2;
    const buttonCenterY = buttonPosition.y + buttonSize / 2;
    
    // チャットをボタンの下に表示
    let chatTop = buttonPosition.y + buttonSize + 10;
    let chatLeft = Math.max(20, Math.min(buttonPosition.x, screenWidth - 320));
    
    // 画面下部に収まらない場合はボタンの上に表示
    if (chatTop + chatHeight > screenHeight - 50) {
      chatTop = buttonPosition.y - chatHeight - 10;
    }
    
    // 画面上部に収まらない場合は調整
    if (chatTop < 100) {
      chatTop = 100;
    }
    
    return { top: chatTop, left: chatLeft, width: 300 };
  };
  
  const chatPosition = getChatPosition();

  useEffect(() => {
    if (isVisible) {
      // 開くアニメーション
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 閉じるアニメーション
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: duration * 0.6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, opacityAnim, duration]);

  if (!isVisible && (slideAnim as any)._value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {/* 背景オーバーレイ */}
      <BlurView intensity={10} style={styles.backgroundOverlay} />
      
      {/* チャットコンテナ */}
      <Animated.View
        style={[
          styles.chatContainer,
          {
            top: chatPosition.top,
            left: chatPosition.left,
            width: chatPosition.width,
            height: chatHeight,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <ChatScreen 
          isVisible={isVisible}
          onClose={onClose}
          isPartialView={true}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatContainer: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
});

export default ChatContainer;