import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { t } from '../i18n';

interface VerificationCodeScreenProps {
  email: string;
  onVerifySuccess: () => void;
  onResendCode: () => Promise<void>;
  onVerifyCode: (code: string) => Promise<boolean>;
  onBack: () => void;
}

const CODE_LENGTH = 6;
const EXPIRY_TIME = 10 * 60; // 10分（秒）

export const VerificationCodeScreen: React.FC<VerificationCodeScreenProps> = ({
  email,
  onVerifySuccess,
  onResendCode,
  onVerifyCode,
  onBack,
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(EXPIRY_TIME);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
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

  // コード検証
  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== CODE_LENGTH) {
      Alert.alert(t('common.error'), t('auth.enterFullCode'));
      return;
    }

    setIsVerifying(true);
    try {
      const success = await onVerifyCode(codeToVerify);
      if (success) {
        Alert.alert(t('common.success'), t('auth.verificationSuccess'));
        onVerifySuccess();
      } else {
        Alert.alert(t('common.error'), t('auth.invalidCode'));
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.verificationFailed'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // コード再送信
  const handleResend = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      await onResendCode();
      setTimeLeft(EXPIRY_TIME);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert(t('common.success'), t('auth.codeSent'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.resendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        {/* ヘッダー */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.verificationCode')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.codeSentTo')}
            {'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        {/* コード入力欄 */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : null,
              ]}
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

        {/* タイマー */}
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, timeLeft <= 60 && styles.timerExpiring]}>
            {t('auth.expiresIn')} {formatTime(timeLeft)}
          </Text>
        </View>

        {/* 検証ボタン */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (isVerifying || code.some((d) => !d)) && styles.verifyButtonDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={isVerifying || code.some((d) => !d)}
        >
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyButtonText}>{t('auth.verify')}</Text>
          )}
        </TouchableOpacity>

        {/* 再送信ボタン */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>{t('auth.didNotReceiveCode')}</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending || timeLeft <= 0}
          >
            {isResending ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text
                style={[
                  styles.resendButton,
                  (timeLeft <= 0 || isResending) && styles.resendButtonDisabled,
                ]}
              >
                {t('auth.resendCode')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  email: {
    fontWeight: '600',
    color: '#374151',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timer: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  timerExpiring: {
    color: '#EF4444',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#9CA3AF',
  },
});
