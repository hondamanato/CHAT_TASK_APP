import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';
import { LocalStorageCleanupService } from './localStorageCleanupService';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
}

class AuthService {
  // OTP方式でサインアップ（メール認証コード）
  async signUpWithOTP(email: string, password: string, name: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: undefined, // リダイレクトを無効化
        },
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('[OTP] サインアップエラー:', error.message);
      throw new Error('アカウント作成に失敗しました');
    }
  }

  // OTP検証
  async verifyOTP(email: string, token: string) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('[OTP] 検証エラー:', error.message);
      throw new Error('認証コードの検証に失敗しました');
    }
  }

  // OTP再送信
  async resendOTP(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('[OTP] 再送信エラー:', error.message);
      throw new Error('認証コードの再送信に失敗しました');
    }
  }

  // 従来のサインアップ（パスワード認証のみ、OTPなし）
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
        profileImageUrl: profile.profile_image_url,
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

  async uploadProfileImage(userId: string, imageUri: string): Promise<string> {
    try {
      // URIからファイル名を生成（タイムスタンプを追加してキャッシュ問題を回避）
      const fileExt = imageUri.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // ファイルを直接ArrayBufferとして取得（最適化）
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      // Supabase Storageにアップロード
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true, // 既存の画像を上書き
        });

      if (error) {
        throw error;
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('プロフィール画像アップロードエラー:', error.message);
      throw new Error('プロフィール画像のアップロードに失敗しました');
    }
  }

  async updateProfileImage(userId: string, imageUrl: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_url: imageUrl })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('プロフィール画像URL更新エラー:', error.message);
      throw new Error('プロフィール画像の更新に失敗しました');
    }
  }

  async deleteProfileImage(userId: string): Promise<void> {
    try {
      // Storageから画像を削除
      const { error: storageError } = await supabase.storage
        .from('profile-images')
        .remove([`${userId}`]);

      if (storageError) {
        console.warn('プロフィール画像削除エラー:', storageError);
      }

      // DBのURLをnullに更新
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('id', userId);

      if (dbError) {
        throw dbError;
      }
    } catch (error: any) {
      console.error('プロフィール画像削除エラー:', error.message);
      throw new Error('プロフィール画像の削除に失敗しました');
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
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();

      if (getUserError || !user) {
        throw new Error('ユーザーが見つかりません');
      }

      console.log(`🗑️ アカウント削除開始: ユーザーID ${user.id}`);

      // 1. 現在のセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('認証セッションが見つかりません');
      }

      // 2. Edge Functionを呼び出してアカウントとデータを完全削除
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabase.supabaseKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || errorData?.details || response.statusText;
        console.error('❌ Edge Function エラー:', errorMessage);
        throw new Error(`アカウント削除に失敗しました: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('✅ Edge Function レスポンス:', result);

      // 3. ローカルストレージの完全クリーンアップ
      await LocalStorageCleanupService.cleanupAllData();

      // 4. ローカルのセッションをクリア（既にサーバー側で削除済み）
      await supabase.auth.signOut({ scope: 'local' });

      console.log('✅ アカウント削除処理が完了しました');

    } catch (error: any) {
      console.error('❌ アカウント削除エラー:', error.message);
      throw new Error(error.message || 'アカウント削除に失敗しました');
    }
  }

  // Apple Sign-In (ネイティブ)
  async signInWithApple() {
    try {
      console.log('[Apple Sign-In] 開始');
      console.log('[Apple Sign-In] 環境情報:', {
        platform: Platform.OS,
        version: Platform.Version,
      });

      // iOSでのみ動作
      if (Platform.OS !== 'ios') {
        console.error('[Apple Sign-In] プラットフォームエラー: iOS以外では使用できません');
        throw new Error('Apple Sign-InはiOSでのみ利用可能です');
      }

      // Apple認証が利用可能かチェック
      console.log('[Apple Sign-In] 利用可能性チェック中...');
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log('[Apple Sign-In] isAvailableAsync結果:', isAvailable);

      if (!isAvailable) {
        console.error('[Apple Sign-In] 利用不可: デバイスまたは設定に問題があります');
        console.error('[Apple Sign-In] チェック項目:');
        console.error('  1. iOS 13以上か確認してください');
        console.error('  2. Apple Developer ConsoleでSign in with Apple capabilityが有効か確認してください');
        console.error('  3. XcodeでSign in with Apple capabilityが追加されているか確認してください');
        console.error('  4. Provisioning Profileが最新か確認してください');
        console.error('  5. 詳細は APPLE_SIGNIN_SETUP.md を参照してください');
        throw new Error('このデバイスではApple Sign-Inが利用できません');
      }
      console.log('[Apple Sign-In] 利用可能');

      // Apple Sign-Inを実行
      console.log('[Apple Sign-In] Apple認証ダイアログを表示中...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Apple Sign-In] 認証成功、credentialを取得');
      console.log('[Apple Sign-In] User:', credential.user);
      console.log('[Apple Sign-In] Email:', credential.email);
      console.log('[Apple Sign-In] identityToken exists:', !!credential.identityToken);

      if (!credential.identityToken) {
        throw new Error('Apple認証からidentity tokenを取得できませんでした');
      }

      // Supabase AuthにID tokenを渡してサインイン
      console.log('[Apple Sign-In] Supabaseにサインイン中...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        console.error('[Apple Sign-In] Supabaseエラー:', error);
        console.error('[Apple Sign-In] エラー詳細:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[Apple Sign-In] Supabaseサインイン成功');
      console.log('[Apple Sign-In] User ID:', data.user?.id);

      // ユーザー名が取得できた場合、プロフィールを更新
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = `${credential.fullName.familyName || ''} ${credential.fullName.givenName || ''}`.trim();
        if (fullName && data.user) {
          console.log('[Apple Sign-In] プロフィール更新中:', fullName);
          await this.updateProfile(fullName);
        }
      }

      console.log('[Apple Sign-In] 完了');
      return { data, error: null };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[Apple Sign-In] ユーザーがキャンセルしました');
        throw new Error('認証がキャンセルされました');
      }
      console.error('[Apple Sign-In] エラー発生:', error);
      console.error('[Apple Sign-In] エラーコード:', error.code);
      console.error('[Apple Sign-In] エラーメッセージ:', error.message);
      console.error('[Apple Sign-In] エラー詳細:', JSON.stringify(error, null, 2));
      throw error; // 元のエラーをそのまま投げる
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

  // 新規登録フロー用: メールでOTP送信（パスワードレス認証）
  async sendOTPForSignup(email: string) {
    try {
      console.log('[OTP送信] 開始:', email);

      // 仮のランダムパスワードを生成（後でユーザーが設定したパスワードに更新）
      const tempPassword = Crypto.randomUUID();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: undefined, // リダイレクトを無効化
          data: {
            temp_signup: true, // 仮登録フラグ
          },
        },
      });

      if (error) {
        console.error('[OTP送信] Supabaseエラー:', {
          message: error.message,
          code: error.code,
          status: error.status,
        });

        // 既存ユーザーのエラーを検出（可能な場合）
        if (error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('user already exists') ||
            error.code === 'user_already_exists') {
          const existingUserError = new Error('このメールアドレスは既に登録されています');
          (existingUserError as any).code = 'EXISTING_USER';
          throw existingUserError;
        }

        throw error;
      }

      // 既存ユーザーの検出（identitiesが空配列の場合）
      if (data?.user?.identities?.length === 0) {
        console.log('[OTP送信] 既存ユーザー検出:', email);
        const existingUserError = new Error('このメールアドレスは既に登録されています');
        (existingUserError as any).code = 'EXISTING_USER';
        throw existingUserError;
      }

      console.log('[OTP送信] 成功:', {
        userId: data?.user?.id,
        email: data?.user?.email,
      });

      return data;
    } catch (error: any) {
      console.error('[OTP送信] キャッチエラー:', error);
      throw error;
    }
  }

  // 新規登録フロー用: OTP検証（サインアップ用）
  async verifySignupOTP(email: string, token: string) {
    try {
      console.log('[Signup] OTP検証開始:', email);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        console.error('[Signup] OTP検証エラー:', error);
        throw error;
      }

      // セッションが作成されたか確認
      if (data.session) {
        console.log('[Signup] OTP検証成功、セッション作成:', {
          userId: data.session.user.id,
          email: data.session.user.email,
        });
      } else {
        console.warn('[Signup] OTP検証成功だがセッションなし');
      }

      return data;
    } catch (error: any) {
      console.error('[Signup] OTP検証エラー:', error.message);
      throw new Error('認証コードの検証に失敗しました');
    }
  }

  // OTP再送信（サインアップ用）
  async resendSignupOTP(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('[Signup] OTP再送信エラー:', error.message);
      throw new Error('認証コードの再送信に失敗しました');
    }
  }

  // 新規登録完了処理（パスワード設定 + プロフィール保存）
  async completeSignup(email: string, password: string, name: string) {
    try {
      // 1. 既に作成されたユーザーの情報を更新（仮パスワードをユーザーが入力したパスワードに更新）
      const { data: authData, error: updateError } = await supabase.auth.updateUser({
        password: password, // ユーザーが入力したパスワードを設定
        data: {
          name,
          temp_signup: false, // 仮登録フラグを解除
        },
      });

      if (updateError) {
        throw updateError;
      }

      if (!authData.user) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      // 2. プロフィールテーブルにnameを保存
      // (Supabaseのトリガーでプロフィールは自動作成されるが、nameは手動で更新)
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', authData.user.id);

      if (profileUpdateError) {
        console.error('[Signup] プロフィール更新エラー:', profileUpdateError);
        // エラーは無視（後で修正可能なため）
      }

      console.log('[Signup] アカウント作成成功');
      return authData;
    } catch (error: any) {
      console.error('[Signup] アカウント作成エラー:', error.message);
      throw new Error('アカウントの作成に失敗しました');
    }
  }
}

export const authService = new AuthService();