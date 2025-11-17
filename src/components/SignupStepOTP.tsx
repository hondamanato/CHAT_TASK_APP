import React, { useState, useRef, useEffect } from 'react';
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

interface SignupStepOTPProps {
  email: string;
  onNext: () => void;
  onBack: () => void;
  onVerifyCode: (code: string) => Promise<boolean>;
  onResendCode: () => Promise<void>;
}

const CODE_LENGTH = 6;
const EXPIRY_TIME = 10 * 60; // 10分（秒）

export const SignupStepOTP: React.FC<SignupStepOTPProps> = ({
  email,
  onNext,
  onBack,
  onVerifyCode,
  onResendCode,
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(EXPIRY_TIME);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // カウントダウンタイマー
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 時間をフォーマット（mm:ss）
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // コード入力処理
  const handleCodeChange = (text: string, index: number) => {
    // 数字のみ許可
    if (text && !/^\d+$/.test(text)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    setError('');

    // 次の入力欄に自動フォーカス
    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // 6桁すべて入力されたら自動検証
    if (newCode.every((digit) => digit !== '') && newCode.join('').length === CODE_LENGTH) {
      handleVerify(newCode.join(''));
    }
  };

  // バックスペース処理
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 認証処理
  const handleVerify = async (fullCode: string) => {
    try {
      setIsVerifying(true);
      setError('');
      const success = await onVerifyCode(fullCode);

      if (success) {
        onNext();
      } else {
        setError(t('auth.invalidCode'));
        // コードをクリア
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      console.error('[OTP] 検証エラー:', err);
      setError(err.message || t('auth.verificationFailed'));
      // コードをクリア
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // 再送信処理
  const handleResend = async () => {
    try {
      setIsResending(true);
      setError('');
      await onResendCode();
      setTimeLeft(EXPIRY_TIME);
      // コードをクリア
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error('[OTP] 再送信エラー:', err);
      setError(err.message || t('auth.resendFailed'));
    } finally {
      setIsResending(false);
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
            <TouchableOpacity onPress={onBack} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Progress Dots */}
          <ProgressDots totalSteps={4} currentStep={2} />

          {/* Content */}
          <View style={styles.content}>
        <Text style={styles.title}>{t('auth.step2Title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.codeSentTo')}{'\n'}{email}
        </Text>

        {/* OTP入力フィールド */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.codeInput, error ? styles.codeInputError : null]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={index === 0}
              editable={!isVerifying}
            />
          ))}
        </View>

        {/* エラーメッセージ */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* タイマー表示 */}
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, timeLeft < 60 && styles.timerWarning]}>
            {t('auth.expiresIn')} {formatTime(timeLeft)}
          </Text>
        </View>

        {/* 認証ボタン */}
        {isVerifying ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#58CC02" />
          </View>
        ) : null}

        {/* 再送信 */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>{t('auth.didNotReceiveCode')}</Text>
          <TouchableOpacity onPress={handleResend} disabled={isResending}>
            <Text style={[styles.resendLink, isResending && styles.resendLinkDisabled]}>
              {isResending ? t('common.loading') : t('auth.resendCode')}
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: '#F7F7F7',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  codeInputError: {
    borderColor: '#FF4B4B',
  },
  errorText: {
    color: '#FF4B4B',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    color: '#666',
  },
  timerWarning: {
    color: '#FF4B4B',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resendLink: {
    fontSize: 14,
    color: '#58CC02',
    fontWeight: 'bold',
  },
  resendLinkDisabled: {
    color: '#999',
  },
});
