import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface ChatScreenProps {
  onClose: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onClose }) => {
  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={15} style={styles.blurBackground} />
      <View style={styles.content}>
        {/* チャット内容は後で実装 */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default ChatScreen;