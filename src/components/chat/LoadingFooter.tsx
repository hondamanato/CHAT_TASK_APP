import React from 'react';
import { View, Image, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingFooterProps {
  isLoading: boolean;
}

export const LoadingFooter: React.FC<LoadingFooterProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/mascot-chat.png')}
        style={styles.mascot}
      />
      <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
      <Text style={styles.text}>入力中...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mascot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
  },
});
