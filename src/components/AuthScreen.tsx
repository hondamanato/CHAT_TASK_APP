import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { AuthForm } from './AuthForm';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AuthForm onAuthSuccess={onAuthSuccess} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
});