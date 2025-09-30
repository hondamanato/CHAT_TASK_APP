import { supabase } from './supabase';
import { Alert } from 'react-native';
import { LocalStorageCleanupService } from './localStorageCleanupService';

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
      // ログアウト時にローカルストレージもクリーンアップ
      await LocalStorageCleanupService.cleanupAllData();

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      console.log('ログアウト処理が完了しました');
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

  async deleteAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // 1. カレンダーの所有者権限を削除（CASCADE で関連データも削除される）
      const { error: calendarsError } = await supabase
        .from('calendars')
        .delete()
        .eq('owner_id', user.id);

      if (calendarsError) {
        console.warn('カレンダー削除エラー:', calendarsError);
      }

      // 2. イベントデータを削除
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('user_id', user.id);

      if (eventsError) {
        console.warn('イベント削除エラー:', eventsError);
      }

      // 3. カレンダーメンバーシップを削除
      const { error: membersError } = await supabase
        .from('calendar_members')
        .delete()
        .eq('user_id', user.id);

      if (membersError) {
        console.warn('カレンダーメンバー削除エラー:', membersError);
      }

      // 4. 招待データを削除
      const { error: invitationsError } = await supabase
        .from('invitations')
        .delete()
        .eq('inviter_id', user.id);

      if (invitationsError) {
        console.warn('招待データ削除エラー:', invitationsError);
      }

      // 5. プロフィールデータを削除（これにより auth.users からも CASCADE で削除される場合がある）
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.warn('プロフィール削除エラー:', profileError);
      }

      // 6. ローカルストレージの完全クリーンアップ
      await LocalStorageCleanupService.cleanupAllData();

      // 7. ユーザー認証情報を削除（サインアウト）
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }

      console.log('アカウント削除処理が完了しました');

      // 注意: Supabaseでは管理者権限なしにユーザーを完全削除することはできません
      // 実際のプロダクションでは、Edge Functionまたは管理者APIを使用して
      // ユーザーアカウントを完全に削除する必要があります

    } catch (error: any) {
      console.error('アカウント削除エラー:', error.message);
      throw new Error('アカウント削除に失敗しました');
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