import React from 'react';
import { 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TouchableOpacity,
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubbleLeftRightIcon } from 'react-native-heroicons/outline';

interface DraggableChatButtonProps {
  onPress: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  style?: ViewStyle;
}

export const DraggableChatButton: React.FC<DraggableChatButtonProps> = ({ 
  onPress, 
  style 
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { bottom: insets.bottom }]}>
      <TouchableOpacity
        style={[styles.floatingButton, style]}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel="AIチャットを開く"
        accessibilityRole="button"
      >
        <ChatBubbleLeftRightIcon size={22} color="#ffffff" strokeWidth={2} />
        <Text style={styles.buttonText}>AI</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
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