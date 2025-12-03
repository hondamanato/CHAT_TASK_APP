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
import { Ionicons } from '@expo/vector-icons';
import { CheckIcon } from 'react-native-heroicons/outline';
import { t } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../data/termsData';
import { TermsService } from '../services/termsService';
import { FullTextModal } from './FullTextModal';
import { VerificationCodeScreen } from './VerificationCodeScreen';
import { MultiStepSignupForm } from './MultiStepSignupForm';

interface AuthFormProps {
  onAuthSuccess: () => void;
  onMultiStepSignupChange?: (showing: boolean) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess, onMultiStepSignupChange }) => {
  const {
    signUp,
    signUpWithOTP,
    verifyOTP,
    resendOTP,
    signIn,
    signInWithApple,
    resetPassword,
    loading,
    showVerificationScreen,
    pendingEmail,
    setShowVerificationScreen,
    setPendingEmail,
    sendSignupOTP,
    verifySignupOTP,
    resendSignupOTP,
    completeSignup,
    setIsSignupInProgress,
    showMultiStepSignup,
    setShowMultiStepSignup,
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
        // OTP方式でサインアップ
        result = await signUpWithOTP(email, password, name);
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

        // 認証コード画面に遷移
        setPendingEmail(email);
        setShowVerificationScreen(true);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.authFailed'));
    }
  };

  // OTP検証成功時のハンドラー
  const handleVerifySuccess = () => {
    setShowVerificationScreen(false);
    Alert.alert(t('common.success'), t('auth.signupSuccess'));
    onAuthSuccess();
  };

  // OTP検証ハンドラー
  const handleVerifyCode = async (code: string): Promise<boolean> => {
    try {
      const result = await verifyOTP(pendingEmail, code);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return true;
    } catch (error: any) {
      console.error('[OTP] 検証エラー:', error);
      throw error;
    }
  };

  // OTP再送信ハンドラー
  const handleResendCode = async () => {
    try {
      const result = await resendOTP(pendingEmail);
      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error: any) {
      console.error('[OTP] 再送信エラー:', error);
      throw error;
    }
  };

  // 認証コード画面から戻るハンドラー
  const handleBackFromVerification = () => {
    setShowVerificationScreen(false);
    setPendingEmail('');
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

  const handleAppleSignIn = async () => {
    try {
      console.log('[AuthForm] Apple Sign-Inボタンがタップされました');
      const result = await signInWithApple();

      if (result.error) {
        console.error('[AuthForm] Apple Sign-Inエラー:', result.error);
        const errorMessage = result.error.message || 'Apple Sign-Inに失敗しました';
        console.error('[AuthForm] エラーメッセージ:', errorMessage);
        Alert.alert(t('common.error'), errorMessage);
        return;
      }

      console.log('[AuthForm] Apple Sign-In成功');

      // 新規登録時は利用規約同意を記録
      if (!isLogin) {
        await TermsService.recordAgreement();
      }

      Alert.alert(t('common.success'), t('auth.loginSuccess'));
      onAuthSuccess();
    } catch (error: any) {
      console.error('[AuthForm] Apple Sign-In例外:', error);
      const errorMessage = error.message || 'Apple Sign-Inに失敗しました';
      console.error('[AuthForm] 例外メッセージ:', errorMessage);
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  // 新規登録用のハンドラー
  const handleSendOTP = async (email: string) => {
    console.log('[AuthForm] handleSendOTP呼び出し:', email);
    const result = await sendSignupOTP(email);
    console.log('[AuthForm] sendSignupOTP結果:', result);
    if (result.error) {
      console.error('[AuthForm] OTPエラー:', result.error);
      throw new Error(result.error.message || 'OTPの送信に失敗しました');
    }
    console.log('[AuthForm] OTP送信完了');
  };

  const handleVerifySignupOTP = async (email: string, code: string): Promise<boolean> => {
    const result = await verifySignupOTP(email, code);
    if (result.error) {
      return false;
    }
    return true;
  };

  const handleResendSignupOTP = async (email: string) => {
    const result = await resendSignupOTP(email);
    if (result.error) {
      throw new Error(result.error.message || '再送信に失敗しました');
    }
  };

  const handleCompleteSignup = async (email: string, password: string, name: string) => {
    const result = await completeSignup(email, password, name);
    if (result.error) {
      throw new Error(result.error.message || 'アカウント作成に失敗しました');
    }
    // 利用規約同意を記録
    await TermsService.recordAgreement();
  };

  const handleSignupComplete = () => {
    console.log('[AuthForm] 新規登録完了');
    setShowMultiStepSignup(false);
    onMultiStepSignupChange?.(false);
    setIsSignupInProgress(false); // 新規登録完了
    Alert.alert(t('common.success'), t('auth.signupSuccess'));
    onAuthSuccess();
  };

  const handleCancelSignup = () => {
    console.log('[AuthForm] 新規登録キャンセル');
    setShowMultiStepSignup(false);
    onMultiStepSignupChange?.(false);
    setIsSignupInProgress(false); // 新規登録キャンセル
  };

  // 多段階新規登録画面を表示
  if (showMultiStepSignup) {
    return (
      <MultiStepSignupForm
        onSignupComplete={handleSignupComplete}
        onCancel={handleCancelSignup}
        onSendOTP={handleSendOTP}
        onVerifyOTP={handleVerifySignupOTP}
        onResendOTP={handleResendSignupOTP}
        onCompleteSignup={handleCompleteSignup}
      />
    );
  }

  // 認証コード画面を表示
  if (showVerificationScreen) {
    return (
      <VerificationCodeScreen
        email={pendingEmail}
        onVerifySuccess={handleVerifySuccess}
        onResendCode={handleResendCode}
        onVerifyCode={handleVerifyCode}
        onBack={handleBackFromVerification}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* タイトル */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLogin ? t('auth.signIn') : t('auth.signUp')}
          </Text>
        </View>

        {/* 入力フィールド */}
        <View style={styles.inputContainer}>
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder={t('auth.name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
          />

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

        {/* Sign In / Sign Up Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading
              ? t('common.loading')
              : isLogin
              ? t('auth.signIn')
              : t('auth.signUp')
            }
          </Text>
        </TouchableOpacity>

        {/* Forgot Password */}
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

        {/* Social Login */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.socialContainer}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleAppleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={24} color="#000" />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Switch between Login/Signup */}
        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
          </Text>
          <TouchableOpacity onPress={() => {
            if (isLogin) {
              // ログイン画面から新規登録画面への切り替え
              console.log('[AuthForm] 新規登録フロー開始');
              setShowMultiStepSignup(true);
              onMultiStepSignupChange?.(true);
              setIsSignupInProgress(true); // 新規登録フロー開始
              console.log('[AuthForm] showMultiStepSignup=true, isSignupInProgress=true に設定');
            } else {
              // 新規登録画面からログイン画面への切り替え
              setIsLogin(true);
            }
          }}>
            <Text style={styles.switchLink}>
              {isLogin ? t('auth.signUp') : t('auth.signIn')}
            </Text>
          </TouchableOpacity>
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
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    color: '#666',
    fontSize: 14,
  },
  switchLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  agreementContainer: {
    marginTop: 16,
    marginBottom: 16,
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
    fontSize: 13,
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