import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError, Session, User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Config from 'react-native-config';
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
  signUp: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<{ error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ error?: AuthError }>;
  refreshProfile: () => Promise<void>;
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

    const initializeAuth = async () => {
      try {
        // Supabase設定の確認（react-native-configから取得）
        const supabaseUrl = Config.SUPABASE_URL;
        const supabaseKey = Config.SUPABASE_ANON_KEY;

        console.log('🔍 Supabase設定確認:', { supabaseUrl, hasKey: !!supabaseKey });

        if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co' || supabaseUrl.includes('$()/')) {
          console.warn('⚠️ Supabase環境変数が設定されていません。オフラインモードで動作します。');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // タイムアウトを削除し、Supabaseの標準セッション取得に任せる
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('セッション取得エラー:', error);
        } else {
          console.log('✅ セッション取得成功:', session ? 'ログイン済み' : '未ログイン');
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }

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

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('認証状態変更:', event, session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
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

  // プロフィール再読み込み
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};