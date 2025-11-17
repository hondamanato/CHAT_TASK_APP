import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../i18n';
import { ProgressDots } from './ProgressDots';

interface SignupStepNameProps {
  onComplete: (name: string) => void;
  onBack: () => void;
  initialName?: string;
  isLoading?: boolean;
}

export const SignupStepName: React.FC<SignupStepNameProps> = ({
  onComplete,
  onBack,
  initialName = '',
  isLoading = false,
}) => {
  const [name, setName] = useState(initialName);

  const handleComplete = () => {
    if (name.trim()) {
      onComplete(name.trim());
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.closeButton} disabled={isLoading}>
              <Ionicons name="close" size={28} color={isLoading ? '#999' : '#333'} />
            </TouchableOpacity>
          </View>

          {/* Progress Dots */}
          <ProgressDots totalSteps={4} currentStep={4} />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{t('auth.step5Title')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('auth.name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[
                styles.completeButton,
                (!name.trim() || isLoading) && styles.completeButtonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>{t('auth.createAccountButton')}</Text>
              )}
            </TouchableOpacity>

            {/* 利用規約注釈 */}
            <Text style={styles.termsNote}>{t('auth.termsNote')}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  completeButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
