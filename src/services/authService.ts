import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

class AuthService {
  async signUp(email: string, password: string, name: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('サインアップエラー:', error.message);
      throw new Error('アカウント作成に失敗しました');
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('サインインエラー:', error.message);
      throw new Error('ログインに失敗しました');
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('サインアウトエラー:', error.message);
      throw new Error('ログアウトに失敗しました');
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // プロファイルテーブルから詳細情報を取得
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('プロファイル取得エラー:', error);
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
      };
    } catch (error: any) {
      console.error('ユーザー取得エラー:', error.message);
      return null;
    }
  }

  async updateProfile(name: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('プロファイル更新エラー:', error.message);
      throw new Error('プロファイルの更新に失敗しました');
    }
  }

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        throw error;
      }

      Alert.alert(
        'パスワードリセット',
        'パスワードリセット用のメールを送信しました。'
      );
    } catch (error: any) {
      console.error('パスワードリセットエラー:', error.message);
      throw new Error('パスワードリセットに失敗しました');
    }
  }

  // 認証状態の監視
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}

export const authService = new AuthService();