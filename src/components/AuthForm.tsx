import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Config from 'react-native-config';
import { CheckIcon } from 'react-native-heroicons/outline';
import { t } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../data/termsData';
import { TermsService } from '../services/termsService';
import { FullTextModal } from './FullTextModal';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const { signUp, signIn, resetPassword, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // 利用規約・プライバシーポリシー関連の状態
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    // サインアップ時は利用規約とプライバシーポリシー同意をチェック
    if (!isLogin) {
      if (!agreedToTerms || !agreedToPrivacy) {
        Alert.alert(
          t('common.error'),
          t('auth.mustAgreeToTerms')
        );
        return;
      }
    }

    // Supabase設定の確認（react-native-configから取得）
    const supabaseUrl = Config.SUPABASE_URL;
    const supabaseKey = Config.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
      Alert.alert(
        t('common.error'),
        t('auth.supabaseNotConfigured')
      );
      return;
    }

    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (result.error) {
        Alert.alert(t('common.error'), result.error.message || t('auth.authFailed'));
        return;
      }

      if (isLogin) {
        Alert.alert(t('common.success'), t('auth.loginSuccess'));
        onAuthSuccess();
      } else {
        // サインアップ成功時に利用規約同意を記録
        await TermsService.recordAgreement();
        Alert.alert(
          t('common.success'),
          t('auth.signupSuccess')
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.authFailed'));
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.enterEmail'));
      return;
    }

    try {
      const result = await resetPassword(email);
      if (result.error) {
        Alert.alert(t('common.error'), result.error.message);
      } else {
        Alert.alert(
          t('auth.resetPassword'),
          t('auth.passwordResetSent')
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? t('auth.login.title') : t('auth.signup.title')}
          </Text>

          <Text style={styles.subtitle}>
            {t('auth.subtitle')}
          </Text>

          <View style={styles.inputContainer}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.fields.name.label')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.fields.name.placeholder')}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.fields.email.label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.fields.email.placeholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.fields.password.label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.fields.password.placeholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 利用規約・プライバシーポリシー同意チェックボックス（サインアップ時のみ） */}
            {!isLogin && (
              <View style={styles.agreementContainer}>
                {/* 利用規約チェックボックス */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                    {agreedToTerms && <CheckIcon size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxText}>
                    <Text
                      style={styles.linkText}
                      onPress={() => setShowTermsModal(true)}
                    >
                      {t('auth.terms.link')}
                    </Text>
                    {t('auth.terms.agree')}
                  </Text>
                </TouchableOpacity>

                {/* プライバシーポリシーチェックボックス */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
                >
                  <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
                    {agreedToPrivacy && <CheckIcon size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxText}>
                    <Text
                      style={styles.linkText}
                      onPress={() => setShowPrivacyModal(true)}
                    >
                      {t('auth.privacy.link')}
                    </Text>
                    {t('auth.privacy.agree')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading
                ? t('auth.processing')
                : isLogin
                ? t('auth.login.button')
                : t('auth.signup.button')
              }
            </Text>
          </TouchableOpacity>

          {isLogin && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>
                {t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin
                ? t('auth.accountQuestion.needAccount')
                : t('auth.accountQuestion.haveAccount')
              }
            </Text>
            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchButton}
            >
              <Text style={styles.switchButtonText}>
                {isLogin ? t('auth.signup.title') : t('auth.login.title')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 利用規約モーダル */}
      <FullTextModal
        isVisible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title={t('auth.terms.link')}
        content={TERMS_OF_SERVICE}
      />

      {/* プライバシーポリシーモーダル */}
      <FullTextModal
        isVisible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title={t('auth.privacy.link')}
        content={PRIVACY_POLICY}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
  switchButton: {
    marginLeft: 4,
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  agreementContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});