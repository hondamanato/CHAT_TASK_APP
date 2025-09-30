import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { AuthForm } from '../components/AuthForm';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Tapless</Text>
        <Text style={styles.tagline}>
          AIで賢く、シンプルなスケジュール管理
        </Text>
      </View>
      
      <View style={styles.formContainer}>
        <AuthForm onAuthSuccess={onAuthSuccess} />
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 Tapless App. All rights reserved.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});