import React, { useRef } from 'react';
import { 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TouchableOpacity,
  View 
} from 'react-native';
import { ChatBubbleLeftRightIcon, XMarkIcon } from 'react-native-heroicons/outline';

interface DraggableChatButtonProps {
  onPress: (position: { x: number; y: number }) => void;
  onClose?: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  isOpen?: boolean;
  style?: ViewStyle;
}

export const DraggableChatButton: React.FC<DraggableChatButtonProps> = ({ 
  onPress,
  onClose,
  isOpen = false,
  style 
}) => {
  const buttonRef = useRef<View>(null);

  const handlePress = () => {
    if (isOpen && onClose) {
      onClose();
    } else {
      buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
        // ボタンの中心座標を計算
        const centerX = pageX + width / 2;
        const centerY = pageY + height / 2;
        onPress({ x: centerX, y: centerY });
      });
    }
  };

  return (
    <View ref={buttonRef} style={styles.container}>
      <TouchableOpacity
        style={[styles.floatingButton, style]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel={isOpen ? "AIチャットを閉じる" : "AIチャットを開く"}
        accessibilityRole="button"
      >
        {isOpen ? (
          <XMarkIcon size={22} color="#ffffff" strokeWidth={2} />
        ) : (
          <>
            <ChatBubbleLeftRightIcon size={22} color="#ffffff" strokeWidth={2} />
            <Text style={styles.buttonText}>AI</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    zIndex: 1001,
  },
  floatingButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
    textAlign: 'center',
  },
});

export default DraggableChatButton;