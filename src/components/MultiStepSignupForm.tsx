import React, { useState, useEffect } from 'react';
import { View, Alert, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SignupStepEmail } from './SignupStepEmail';
import { SignupStepOTP } from './SignupStepOTP';
import { SignupStepPassword } from './SignupStepPassword';
import { SignupStepName } from './SignupStepName';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MultiStepSignupFormProps {
  onSignupComplete: () => void;
  onCancel: () => void;
  onSendOTP: (email: string) => Promise<void>;
  onVerifyOTP: (email: string, code: string) => Promise<boolean>;
  onResendOTP: (email: string) => Promise<void>;
  onCompleteSignup: (email: string, password: string, name: string) => Promise<void>;
}

type Step = 1 | 2 | 3 | 4;

interface SignupData {
  email: string;
  password: string;
  name: string;
  otpVerified: boolean;
}

export const MultiStepSignupForm: React.FC<MultiStepSignupFormProps> = ({
  onSignupComplete,
  onCancel,
  onSendOTP,
  onVerifyOTP,
  onResendOTP,
  onCompleteSignup,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [previousStep, setPreviousStep] = useState<Step>(1);
  const [signupData, setSignupData] = useState<SignupData>({
    email: '',
    password: '',
    name: '',
    otpVerified: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // アニメーション用のshared value
  const translateX = useSharedValue(0);

  // ステップ変更時のアニメーション
  useEffect(() => {
    if (currentStep !== previousStep) {
      // 次へ進む場合は右から、戻る場合は左から
      const isGoingForward = currentStep > previousStep;

      // 開始位置を設定
      translateX.value = isGoingForward ? SCREEN_WIDTH : -SCREEN_WIDTH;

      // アニメーション実行
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [currentStep]);

  // アニメーションスタイル
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // ステップ1: メールアドレス入力完了
  const handleEmailNext = (email: string) => {
    console.log('[MultiStepSignupForm] handleEmailNext開始:', email);

    // 即座にステップ2へ遷移
    setSignupData({ ...signupData, email });
    setPreviousStep(currentStep);
    setCurrentStep(2);
    console.log('[MultiStepSignupForm] ステップ2へ遷移完了');

    // バックグラウンドでOTP送信
    onSendOTP(email).then((result) => {
      if (result?.error) {
        // エラーの詳細を表示
        console.error('[MultiStepSignupForm] OTP送信エラー:', result.error);
        Alert.alert(
          'OTP送信エラー',
          `認証コードの送信に失敗しました。\n\n${result.error.message}\n\nOTP入力画面で「再送信」ボタンをタップしてください。`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('[MultiStepSignupForm] OTP送信成功');
      }
    }).catch((error: any) => {
      console.error('[MultiStepSignupForm] バックグラウンドOTP送信エラー:', error);
      Alert.alert('エラー', 'OTPの送信に失敗しました。再送信ボタンをタップしてください。');
    });
  };

  // ステップ2: OTP認証完了
  const handleOTPNext = () => {
    setSignupData({ ...signupData, otpVerified: true });
    setPreviousStep(currentStep);
    setCurrentStep(3);
  };

  const handleVerifyOTP = async (code: string): Promise<boolean> => {
    return await onVerifyOTP(signupData.email, code);
  };

  const handleResendOTP = async (): Promise<void> => {
    return await onResendOTP(signupData.email);
  };

  // ステップ3: パスワード入力完了
  const handlePasswordNext = (password: string) => {
    setSignupData({ ...signupData, password });
    setPreviousStep(currentStep);
    setCurrentStep(4);
  };

  // ステップ4: 名前入力完了（最終ステップ）
  const handleNameComplete = async (name: string) => {
    try {
      setIsLoading(true);
      await onCompleteSignup(
        signupData.email,
        signupData.password,
        name
      );
      onSignupComplete();
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'アカウント作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 戻る処理
  const handleBack = () => {
    if (currentStep === 1) {
      onCancel();
    } else {
      setPreviousStep(currentStep);
      if (currentStep === 2) {
        // OTP画面から戻る場合は、メール入力画面に戻る
        setCurrentStep(1);
      } else if (currentStep === 3) {
        // パスワード画面から戻る場合は、OTP画面に戻る
        setCurrentStep(2);
      } else if (currentStep === 4) {
        // 名前入力画面から戻る場合は、パスワード画面に戻る
        setCurrentStep(3);
      }
    }
  };

  // 現在のステップに応じてコンポーネントをレンダリング
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {currentStep === 1 && (
          <SignupStepEmail
            onNext={handleEmailNext}
            onBack={handleBack}
            initialEmail={signupData.email}
          />
        )}
        {currentStep === 2 && (
          <SignupStepOTP
            email={signupData.email}
            onNext={handleOTPNext}
            onBack={handleBack}
            onVerifyCode={handleVerifyOTP}
            onResendCode={handleResendOTP}
          />
        )}
        {currentStep === 3 && (
          <SignupStepPassword
            onNext={handlePasswordNext}
            onBack={handleBack}
            initialPassword={signupData.password}
          />
        )}
        {currentStep === 4 && (
          <SignupStepName
            onComplete={handleNameComplete}
            onBack={handleBack}
            initialName={signupData.name}
            isLoading={isLoading}
          />
        )}
      </Animated.View>
    </View>
  );
};
