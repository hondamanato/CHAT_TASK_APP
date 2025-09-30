import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Tapless</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});