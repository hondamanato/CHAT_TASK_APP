/**
 * Gmail認証サービス
 * Google OAuth 2.0を使用してGmail APIへのアクセスを管理
 */

import { GmailAuthState } from '../types/gmail';

// ネイティブモジュールは使用時に動的インポート（ネイティブモジュール初期化の遅延）
let SecureStoreModule: typeof import('expo-secure-store') | null = null;
let AuthSessionModule: typeof import('expo-auth-session') | null = null;
let ConstantsModule: typeof import('expo-constants') | null = null;

const getSecureStore = async () => {
  if (!SecureStoreModule) {
    SecureStoreModule = await import('expo-secure-store');
  }
  return SecureStoreModule;
};

const getAuthSession = async () => {
  if (!AuthSessionModule) {
    AuthSessionModule = await import('expo-auth-session');
  }
  return AuthSessionModule;
};

const getConstants = async () => {
  if (!ConstantsModule) {
    ConstantsModule = await import('expo-constants');
  }
  return ConstantsModule.default;
};

// SecureStoreのキー
const SECURE_STORE_KEYS = {
  ACCESS_TOKEN: 'gmail_access_token',
  REFRESH_TOKEN: 'gmail_refresh_token',
  EXPIRES_AT: 'gmail_expires_at',
  EMAIL: 'gmail_email',
};

// Google OAuth設定
const GOOGLE_CLIENT_ID_IOS = '1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = ''; // TODO: Google Cloud Consoleで取得したAndroid Client IDを設定
const GOOGLE_CLIENT_ID_WEB = ''; // TODO: Google Cloud Consoleで取得したWeb Client IDを設定

// スコープ
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Discovery document
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Gmail認証サービスクラス
 */
class GmailAuthService {
  private authState: GmailAuthState = {
    isLinked: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    email: null,
  };

  /**
   * 保存されたトークンを復元
   */
  async restoreTokens(): Promise<GmailAuthState> {
    try {
      const SecureStore = await getSecureStore();
      // SecureStore操作を直列化してネイティブブリッジの競合を防止
      const accessToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      const expiresAtStr = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXPIRES_AT);
      const email = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EMAIL);

      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;
      const isLinked = !!(accessToken && refreshToken);

      this.authState = {
        isLinked,
        accessToken,
        refreshToken,
        expiresAt,
        email,
      };

      // トークンが期限切れの場合はリフレッシュ
      if (isLinked && expiresAt && Date.now() > expiresAt) {
        console.log('[GmailAuth] トークン期限切れ、リフレッシュ中...');
        await this.refreshAccessToken();
      }

      return this.authState;
    } catch (error) {
      console.error('[GmailAuth] トークン復元エラー:', error);
      return this.authState;
    }
  }

  /**
   * Google OAuth認証を開始
   */
  async signIn(): Promise<GmailAuthState> {
    try {
      // ネイティブモジュールを動的ロード
      const AuthSession = await getAuthSession();

      // iOS Google OAuth用のリダイレクトスキーム（reversed client ID）
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'com.googleusercontent.apps.1053839498685-appa6er0hnst2pfnvovflmh0i5usd6t3',
        path: 'oauth2redirect',
      });

      console.log('[GmailAuth] Redirect URI:', redirectUri);

      // クライアントIDを取得
      const clientId = await this.getClientId();
      if (!clientId) {
        throw new Error('Google Client IDが設定されていません');
      }

      // 認証リクエストを作成（PKCEはexpo-auth-sessionが自動生成）
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: SCOPES,
        redirectUri,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      // 認証プロンプトを表示
      let result;
      try {
        result = await request.promptAsync(discovery);
      } catch (promptError) {
        console.error('[GmailAuth] 認証プロンプトエラー:', promptError);
        throw new Error('認証画面を開けませんでした。アプリを再起動してください。');
      }

      if (result.type === 'success' && result.params.code) {
        // 認証コードをトークンに交換
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          discovery
        );

        // トークンを保存
        await this.saveTokens(tokenResult);

        // ユーザー情報を取得
        await this.fetchUserInfo(tokenResult.accessToken);

        return this.authState;
      } else if (result.type === 'cancel') {
        console.log('[GmailAuth] ユーザーがキャンセルしました');
        throw new Error('認証がキャンセルされました');
      } else {
        console.error('[GmailAuth] 認証エラー:', result);
        throw new Error('認証に失敗しました');
      }
    } catch (error) {
      console.error('[GmailAuth] サインインエラー:', error);
      throw error;
    }
  }

  /**
   * ユーザー情報を取得
   */
  private async fetchUserInfo(accessToken: string): Promise<void> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      const userInfo = await response.json();
      this.authState.email = userInfo.email;

      const SecureStore = await getSecureStore();
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.EMAIL, userInfo.email);
    } catch (error) {
      console.error('[GmailAuth] ユーザー情報取得エラー:', error);
    }
  }

  /**
   * トークンを保存
   */
  private async saveTokens(tokenResult: { accessToken: string; refreshToken?: string | null; expiresIn?: number | null }): Promise<void> {
    const expiresAt = tokenResult.expiresIn
      ? Date.now() + tokenResult.expiresIn * 1000
      : null;

    const SecureStore = await getSecureStore();
    // SecureStore操作を直列化してネイティブブリッジの競合を防止
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, tokenResult.accessToken);
    if (tokenResult.refreshToken) {
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, tokenResult.refreshToken);
    }
    if (expiresAt) {
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.EXPIRES_AT, expiresAt.toString());
    }

    this.authState = {
      ...this.authState,
      isLinked: true,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken || this.authState.refreshToken,
      expiresAt,
    };

    console.log('[GmailAuth] トークン保存完了');
  }

  /**
   * アクセストークンをリフレッシュ
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      if (!this.authState.refreshToken) {
        console.error('[GmailAuth] リフレッシュトークンがありません');
        return null;
      }

      const clientId = await this.getClientId();
      if (!clientId) {
        throw new Error('Google Client IDが設定されていません');
      }

      // ネイティブモジュールを動的ロード
      const AuthSession = await getAuthSession();

      const tokenResult = await AuthSession.refreshAsync(
        {
          clientId,
          refreshToken: this.authState.refreshToken,
        },
        discovery
      );

      await this.saveTokens(tokenResult);

      return tokenResult.accessToken;
    } catch (error) {
      console.error('[GmailAuth] トークンリフレッシュエラー:', error);
      // リフレッシュに失敗した場合はサインアウト
      await this.signOut();
      return null;
    }
  }

  /**
   * 有効なアクセストークンを取得
   */
  async getValidAccessToken(): Promise<string | null> {
    // トークンが期限切れかチェック
    if (this.authState.expiresAt && Date.now() > this.authState.expiresAt - 60000) {
      // 1分前にリフレッシュ
      return await this.refreshAccessToken();
    }

    return this.authState.accessToken;
  }

  /**
   * サインアウト
   */
  async signOut(): Promise<void> {
    try {
      const SecureStore = await getSecureStore();
      // SecureStore操作を直列化してネイティブブリッジの競合を防止
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXPIRES_AT);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EMAIL);

      // Google側でトークンを無効化（オプション）
      if (this.authState.accessToken) {
        try {
          // ネイティブモジュールを動的ロード
          const AuthSession = await getAuthSession();
          await AuthSession.revokeAsync(
            { token: this.authState.accessToken },
            discovery
          );
        } catch (revokeError) {
          console.warn('[GmailAuth] トークン無効化エラー:', revokeError);
        }
      }

      this.authState = {
        isLinked: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        email: null,
      };

      console.log('[GmailAuth] サインアウト完了');
    } catch (error) {
      console.error('[GmailAuth] サインアウトエラー:', error);
      throw error;
    }
  }

  /**
   * 現在の認証状態を取得
   */
  getAuthState(): GmailAuthState {
    return this.authState;
  }

  /**
   * プラットフォームに応じたクライアントIDを取得
   */
  private async getClientId(): Promise<string> {
    const Constants = await getConstants();
    const { platform } = Constants;

    if (platform?.ios) {
      return GOOGLE_CLIENT_ID_IOS;
    } else if (platform?.android) {
      return GOOGLE_CLIENT_ID_ANDROID;
    } else {
      return GOOGLE_CLIENT_ID_WEB;
    }
  }
}

// シングルトンインスタンス
export const gmailAuthService = new GmailAuthService();
