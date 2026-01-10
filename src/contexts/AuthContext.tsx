import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, Session, User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState, useRef } from 'react';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';

interface Profile {
  id: string;
  email: string;
  name: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isSignupInProgress: boolean;
  showMultiStepSignup: boolean;
  showVerificationScreen: boolean;
  pendingEmail: string;
  setShowVerificationScreen: (show: boolean) => void;
  setPendingEmail: (email: string) => void;
  setShowMultiStepSignup: (show: boolean) => void;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>;
  signUpWithOTP: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>;
  verifyOTP: (email: string, token: string) => Promise<{ error?: AuthError }>;
  resendOTP: (email: string) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signInWithApple: () => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
  refreshProfile: () => Promise<void>;
  updateProfileImageUrl: (imageUrl: string) => void;
  // 新規登録フロー用
  sendSignupOTP: (email: string) => Promise<{ error?: AuthError }>;
  verifySignupOTP: (email: string, token: string) => Promise<{ error?: AuthError }>;
  resendSignupOTP: (email: string) => Promise<{ error?: AuthError }>;
  completeSignup: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>;
  setIsSignupInProgress: (inProgress: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSignupInProgress, setIsSignupInProgress] = useState(false);
  const [showMultiStepSignup, setShowMultiStepSignup] = useState(false);
  const isSignupInProgressRef = useRef(false);

  // プロフィール取得
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);

      // AsyncStorageにも名前を保存（一貫性のため）
      if (data?.name) {
        try {
          await AsyncStorage.setItem('profile_name', data.name);
          console.log('✅ プロフィール名をAsyncStorageに同期しました:', data.name);
        } catch (storageError) {
          console.warn('⚠️ AsyncStorageへの同期エラー:', storageError);
        }
      }
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
      setProfile(null);
    }
  };

  // 認証状態の初期化と監視
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Supabase設定の確認（expo-constantsから取得）
        const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
        const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey;

        console.log('🔍 Supabase設定確認:', { supabaseUrl, hasKey: !!supabaseKey });

        if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co' || supabaseUrl.includes('$()/')) {
          console.warn('⚠️ Supabase環境変数が設定されていません。オフラインモードで動作します。');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // タイムアウト設定: 5秒以内にセッション取得が完了しない場合はスキップ
        timeoutId = setTimeout(() => {
          console.warn('⚠️ セッション取得がタイムアウトしました。スキップして続行します。');
          if (mounted) {
            setLoading(false);
          }
        }, 5000); // 5秒

        // セッション取得（タイムアウトに関係なく確実に完了を待つ）
        const { data: { session }, error } = await supabase.auth.getSession();

        // タイムアウトをクリア（セッション取得が完了したため）
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (error) {
          console.error('セッション取得エラー:', error);
        } else {
          console.log('✅ セッション取得成功:', session ? 'ログイン済み' : '未ログイン');
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            // プロフィール取得も非同期で実行（ブロックしない）
            fetchProfile(session.user.id).catch(err => {
              console.error('プロフィール取得失敗:', err);
            });
          }
        }

        if (!mounted) return;

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('認証初期化エラー:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 認証状態の変更を監視（ログイン/ログアウト時のみ）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('認証状態変更:', event, session);

        // INITIAL_SESSIONイベントは無視（initializeAuthで処理済み）
        if (event === 'INITIAL_SESSION') {
          return;
        }

        // 新規登録フロー中は自動ログインを無効化
        if (isSignupInProgressRef.current) {
          console.log('新規登録フロー中のため、セッション更新をスキップ');
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  // サインアップ
  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) throw error;

      // AsyncStorageに名前を保存
      try {
        await AsyncStorage.setItem('profile_name', name);
        console.log('✅ プロフィール名をAsyncStorageに保存しました:', name);
      } catch (storageError) {
        console.warn('⚠️ AsyncStorageへの保存エラー:', storageError);
      }

      return { error: undefined };
    } catch (error) {
      console.error('サインアップエラー:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // OTP方式でサインアップ
  const signUpWithOTP = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
          emailRedirectTo: undefined, // リダイレクトを無効化
          shouldCreateSession: false, // OTP検証完了までセッション作成を無効化
        },
      });

      if (error) throw error;

      // AsyncStorageに名前を一時保存（OTP検証後に正式保存）
      try {
        await AsyncStorage.setItem('temp_profile_name', name);
        console.log('[OTP] 一時プロフィール名を保存:', name);
      } catch (storageError) {
        console.warn('[OTP] AsyncStorage保存エラー:', storageError);
      }

      return { error: undefined };
    } catch (error) {
      console.error('[OTP] サインアップエラー:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // OTP検証
  const verifyOTP = async (email: string, token: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) throw error;

      // 一時保存した名前を正式保存
      try {
        const tempName = await AsyncStorage.getItem('temp_profile_name');
        if (tempName) {
          await AsyncStorage.setItem('profile_name', tempName);
          await AsyncStorage.removeItem('temp_profile_name');
          console.log('[OTP] プロフィール名を正式保存:', tempName);
        }
      } catch (storageError) {
        console.warn('[OTP] AsyncStorage処理エラー:', storageError);
      }

      return { error: undefined };
    } catch (error) {
      console.error('[OTP] 検証エラー:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // OTP再送信
  const resendOTP = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      return { error: undefined };
    } catch (error) {
      console.error('[OTP] 再送信エラー:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: undefined };
    } catch (error) {
      console.error('サインインエラー:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // サインアウト
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // 即座に状態をクリア
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: undefined };
    } catch (error) {
      console.error('サインアウトエラー:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセット
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      return { error: undefined };
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
      return { error: error as AuthError };
    }
  };

  // Apple Sign-In
  const signInWithApple = async () => {
    try {
      setLoading(true);
      console.log('[AuthContext] Apple Sign-In開始');
      const { authService } = await import('../services/authService');
      const result = await authService.signInWithApple();

      if (result.error) {
        console.error('[AuthContext] Apple Sign-Inエラー:', result.error);
        throw result.error;
      }

      console.log('[AuthContext] Apple Sign-In成功');
      return { error: undefined };
    } catch (error: any) {
      console.error('[AuthContext] Apple Sign-Inエラー:', error);
      console.error('[AuthContext] エラー詳細:', error.message);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };


  // プロフィール再読み込み
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // プロフィール画像URLのみを更新（DB往復なし）
  const updateProfileImageUrl = (imageUrl: string) => {
    if (profile) {
      setProfile({ ...profile, profile_image_url: imageUrl });
    }
  };

  // 新規登録フロー: OTP送信
  const sendSignupOTP = async (email: string) => {
    try {
      // OTP送信開始時に新規登録フロー中フラグを設定
      // Note: この関数は後で定義されるラッパー関数を使うが、
      // ここでは直接refとstateを更新する
      isSignupInProgressRef.current = true;
      setIsSignupInProgress(true);
      console.log('[AuthContext] OTP送信開始:', email);
      const { authService } = await import('../services/authService');
      await authService.sendOTPForSignup(email);
      console.log('[AuthContext] OTP送信成功');
      return { error: undefined };
    } catch (error: any) {
      console.error('[AuthContext] OTP送信エラー:', error);
      isSignupInProgressRef.current = false;
      setIsSignupInProgress(false);

      // レート制限エラーの場合、より詳細な情報を含める
      const isRateLimitError =
        error.message?.includes('rate limit') ||
        error.message?.includes('too many') ||
        error.code === 'too_many_requests';

      // エラーの詳細を含めて返す
      return {
        error: {
          message: isRateLimitError
            ? 'メール送信の回数が上限に達しました。数分後に再度お試しください。'
            : (error.message || 'OTP送信に失敗しました'),
          code: error.code || (isRateLimitError ? 'rate_limit_exceeded' : undefined),
          status: error.status,
          name: error.name,
        } as AuthError
      };
    }
  };

  // 新規登録フロー: OTP検証
  const verifySignupOTP = async (email: string, token: string) => {
    try {
      const { authService } = await import('../services/authService');
      await authService.verifySignupOTP(email, token);
      return { error: undefined };
    } catch (error) {
      console.error('OTP検証エラー:', error);
      return { error: error as AuthError };
    }
  };

  // 新規登録フロー: OTP再送信
  const resendSignupOTP = async (email: string) => {
    try {
      const { authService } = await import('../services/authService');
      await authService.resendSignupOTP(email);
      return { error: undefined };
    } catch (error: any) {
      console.error('OTP再送信エラー:', error);

      // レート制限エラーの場合、より詳細な情報を含める
      const isRateLimitError =
        error.message?.includes('rate limit') ||
        error.message?.includes('too many') ||
        error.code === 'too_many_requests';

      return {
        error: {
          message: isRateLimitError
            ? 'メール送信の回数が上限に達しました。数分後に再度お試しください。'
            : (error.message || 'OTP再送信に失敗しました'),
          code: error.code || (isRateLimitError ? 'rate_limit_exceeded' : undefined),
          status: error.status,
          name: error.name,
        } as AuthError
      };
    }
  };

  // 新規登録完了
  const completeSignup = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const { authService } = await import('../services/authService');
      await authService.completeSignup(email, password, name);

      // セッションを再取得して確実に認証状態を確立
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[Signup] セッション確立成功:', session.user.id);
        setSession(session);
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        console.warn('[Signup] セッション取得に失敗しました');
      }

      return { error: undefined };
    } catch (error) {
      console.error('サインアップ完了エラー:', error);
      setIsSignupInProgress(false); // エラー時にフラグをリセット
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // setIsSignupInProgressのラッパー関数（refも更新）
  const setIsSignupInProgressWrapper = (inProgress: boolean) => {
    setIsSignupInProgress(inProgress);
    isSignupInProgressRef.current = inProgress;
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isSignupInProgress,
    showMultiStepSignup,
    showVerificationScreen,
    pendingEmail,
    setShowVerificationScreen,
    setPendingEmail,
    setShowMultiStepSignup,
    signUp,
    signUpWithOTP,
    verifyOTP,
    resendOTP,
    signIn,
    signInWithApple,
    signOut,
    resetPassword,
    refreshProfile,
    updateProfileImageUrl,
    sendSignupOTP,
    verifySignupOTP,
    resendSignupOTP,
    completeSignup,
    setIsSignupInProgress: setIsSignupInProgressWrapper,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};