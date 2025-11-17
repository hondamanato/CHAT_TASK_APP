# Google Sign-In セットアップガイド

このドキュメントでは、Google Sign-In機能を有効化するための完全な手順を説明します。

## 重要な前提条件

- ✅ **コード実装は既に完了済み**です（`authService.ts`, `AuthContext.tsx`, `AuthForm.tsx`）
- ✅ **必要なライブラリは既にインストール済み**です（`expo-auth-session`, `expo-web-browser`）
- ⚠️ **必要なのは設定作業のみ**です

## 目次
1. [Google Cloud Console設定](#1-google-cloud-console設定)
2. [Supabase設定](#2-supabase設定)
3. [環境変数の設定（オプション）](#3-環境変数の設定オプション)
4. [テスト手順](#4-テスト手順)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. Google Cloud Console設定

### 1.1 プロジェクトの作成または選択

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 既存のプロジェクトを使用するか、新しいプロジェクトを作成
   - プロジェクト名の例: `tapless` または `AI Calendar App`
3. プロジェクトを選択

### 1.2 OAuth同意画面の設定

**重要**: これを最初に設定しないと、OAuth Client IDを作成できません。

1. 左メニューから **APIとサービス** → **OAuth同意画面** を選択
2. **User Type** を選択:
   - **Internal**: 組織内のユーザーのみ（Google Workspaceが必要）
   - **External**: すべてのGoogleアカウントユーザー（推奨）
3. **作成** をクリック

#### アプリ情報の入力

4. 以下を入力:
   - **アプリ名**: `tapless` または `AI Calendar App`
   - **ユーザーサポートメール**: 開発者のメールアドレス
   - **デベロッパーの連絡先情報**: 開発者のメールアドレス
5. **保存して次へ** をクリック

#### スコープの設定

6. **スコープを追加または削除** をクリック
7. 以下のスコープを選択（デフォルトで十分）:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
8. **更新** → **保存して次へ**

#### テストユーザーの追加（Externalの場合）

9. テスト段階では、特定のGoogleアカウントのみアクセス可能
10. **テストユーザーを追加** をクリック
11. テスト用のGoogleアカウントのメールアドレスを追加
12. **保存して次へ** → **ダッシュボードに戻る**

### 1.3 OAuth 2.0 Client IDの作成

Google Sign-Inには**3種類のClient ID**が必要です:
- **Web Client ID**: Supabase認証で使用（最重要）
- **iOS Client ID**: iOSアプリ用
- **Android Client ID**: Androidアプリ用

#### 1.3.1 Web Client IDの作成

1. 左メニューから **APIとサービス** → **認証情報** を選択
2. 上部の **+ 認証情報を作成** → **OAuth クライアント ID** をクリック
3. **アプリケーションの種類**: **ウェブアプリケーション** を選択
4. 以下を入力:
   - **名前**: `tapless Web Client` または `Web OAuth Client`
   - **承認済みのJavaScript生成元**: 空でOK
   - **承認済みのリダイレクトURI**:
     ```
     https://gfrwnonfqchtmgyddbht.supabase.co/auth/v1/callback
     ```
     （Supabase DashboardのAuthenticationページで確認してください）

5. **作成** をクリック
6. 表示された **クライアントID** と **クライアントシークレット** をメモ
   ```
   クライアントID: xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   クライアントシークレット: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### 1.3.2 iOS Client IDの作成

1. 再度 **+ 認証情報を作成** → **OAuth クライアント ID** をクリック
2. **アプリケーションの種類**: **iOS** を選択
3. 以下を入力:
   - **名前**: `tapless iOS Client`
   - **バンドルID**: `com.aicalendarapp.tapless`
4. **作成** をクリック
5. 表示された **クライアントID** をメモ
   ```
   クライアントID: xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

#### 1.3.3 Android Client IDの作成

1. 再度 **+ 認証情報を作成** → **OAuth クライアント ID** をクリック
2. **アプリケーションの種類**: **Android** を選択
3. 以下を入力:
   - **名前**: `tapless Android Client`
   - **パッケージ名**: `com.aicalendarapp.tapless`
   - **SHA-1証明書フィンガープリント**:
     ```bash
     # デバッグ用のSHA-1（開発中）
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
     または
     ```bash
     # プロジェクトのデバッグキーストア
     keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
     出力された`SHA1`の値（例: `AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD`）をコピー

4. **作成** をクリック
5. 表示された **クライアントID** をメモ

#### 1.3.4 作成したClient IDの確認

**認証情報** ページで、以下の3つのClient IDが表示されていることを確認:
- ✅ `tapless Web Client` (ウェブアプリケーション)
- ✅ `tapless iOS Client` (iOS)
- ✅ `tapless Android Client` (Android)

---

## 2. Supabase設定

### 2.1 Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクト `gfrwnonfqchtmgyddbht` を選択
3. 左メニューから **Authentication** を選択
4. **Providers** タブをクリック

### 2.2 Google Providerの有効化

1. **Google** providerを探してクリック
2. **Enable Sign in with Google** を **ON** に切り替え

### 2.3 Client IDとClient Secretの設定

3. 以下を入力:
   - **Client ID (for OAuth)**: Google Cloud Consoleでメモした**Web Client ID**を貼り付け
     ```
     xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     ```
   - **Client Secret (for OAuth)**: Google Cloud Consoleでメモした**クライアントシークレット**を貼り付け
     ```
     GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```

### 2.4 Authorized Client IDsの設定（iOS/Android）

4. **Authorized Client IDs** セクションに、iOS/Android Client IDを追加:
   ```
   xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com (iOS)
   xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com (Android)
   ```
   - 1行に1つのClient IDを入力
   - Web Client IDは**含めない**（OAuth用なので別）

5. **Save** をクリック

### 2.5 Redirect URLsの確認

6. **Redirect URLs** セクションを確認
7. 以下のURLが含まれているか確認:
   ```
   aicalendarapp://
   com.aicalendarapp.tapless://
   ```
8. 含まれていない場合、追加して **Save**

### 2.6 設定の最終確認

Supabase Google Provider設定画面で以下が完了していることを確認:
- ✅ Enable Sign in with Google: **ON**
- ✅ Client ID (for OAuth): 入力済み（Web Client ID）
- ✅ Client Secret (for OAuth): 入力済み
- ✅ Authorized Client IDs: iOS/Android Client IDが入力済み
- ✅ Redirect URLs: `aicalendarapp://`, `com.aicalendarapp.tapless://` が設定済み

---

## 3. 環境変数の設定（オプション）

**注意**: 現在の実装ではSupabase経由でOAuth認証を行うため、環境変数の設定は**不要**です。
ただし、将来的に直接Google SDKを使用する場合に備えて、設定しておくことができます。

### 3.1 .envファイルの作成

1. プロジェクトルートに `.env` ファイルを作成（`.env.example`を参考）
2. 以下を追加:
   ```env
   # Google OAuth Client IDs
   EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_IOS=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_ANDROID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID_WEB=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```
3. 保存

---

## 4. テスト手順

### 4.1 ローカルビルドでテスト

#### iOS

```bash
cd /Users/hondamanato/Chat_task_App
npx expo run:ios
```

1. アプリが起動したらログイン画面へ
2. 「Googleでログイン」ボタンをタップ
3. ブラウザが開き、Google Sign-In画面が表示される
4. Googleアカウントを選択
5. アプリへの権限を確認して「許可」をタップ
6. アプリに戻り、ログイン成功を確認

#### Android

```bash
npx expo run:android
```

同様の手順でテスト

### 4.2 開発段階での注意点

**OAuth同意画面が「テスト」モードの場合:**
- テストユーザーとして追加されたGoogleアカウントのみログイン可能
- 他のアカウントでは「このアプリは確認されていません」エラーが表示される

**解決方法:**
- Google Cloud Consoleで **OAuth同意画面** → **公開ステータス** → **本番環境に公開** をクリック
- または、テストユーザーを追加する

### 4.3 TestFlightでテスト

#### ビルド番号の更新

1. `app.json` を開く
2. `ios.buildNumber` を現在の値+1に更新（例: `197` → `198`）
3. 保存

#### ビルド & アップロード

```bash
# EAS Buildを使用する場合
npx eas build --platform ios --profile production

# または、Xcodeから直接アーカイブ
# Product → Archive → Distribute App → TestFlight
```

#### TestFlightでテスト

1. TestFlightアプリで新しいビルドをインストール
2. アプリを起動
3. 「Googleでログイン」ボタンをタップ
4. Google Sign-In画面が表示されるか確認
5. 認証してログイン成功を確認

---

## 5. トラブルシューティング

### エラー: 「Google Sign-Inに失敗しました」（TestFlightでのテスト時）

**このエラーが出た場合、まずログを確認してください！**

#### 5.1 ログの確認方法

TestFlightアプリからログを確認する手順：

1. **Macとデバイスを接続**（USBケーブル）
2. **Xcodeを開く** → メニューから **Window** → **Devices and Simulators**
3. デバイスを選択 → **Open Console** をクリック
4. アプリを起動してGoogle Sign-Inボタンをタップ
5. コンソールで以下のログを探す：
   ```
   [AuthForm] Google Sign-Inボタンがタップされました
   [AuthService] Google Sign-In開始
   [AuthService] Redirect URL: aicalendarapp://
   [AuthService] OAuth URL取得: https://...
   [AuthService] ブラウザセッション結果: ...
   ```

#### 5.2 ログから原因を特定

ログに表示されるメッセージから原因を特定できます：

**ケース1: `[AuthService] OAuth開始エラー:`が表示される**
- **原因**: Supabaseの設定が不完全または誤っている
- **対処**: SupabaseのGoogle Provider設定を確認
  - Client ID (for OAuth)が正しく設定されているか
  - Client Secretが正しく設定されているか
  - "Enable Sign in with Google"がONになっているか

**ケース2: `[AuthService] ブラウザセッション結果: cancel`が表示される**
- **原因**: ユーザーが認証をキャンセルした
- **対処**: もう一度試してみてください

**ケース3: `[AuthService] セッション取得エラー:`が表示される**
- **原因**: OAuth認証は成功したが、セッション作成に失敗
- **対処**: 
  - SupabaseのRedirect URLsに `aicalendarapp://` が設定されているか確認
  - iOS/Android Client IDsが「Authorized Client IDs」に追加されているか確認

**ケース4: ブラウザが開かない、またはすぐに閉じる**
- **原因**: URL Schemeの設定が不正、またはGoogle Cloud Consoleの設定ミス
- **対処**:
  - `app.json`の`scheme: "aicalendarapp"`が正しいか確認
  - iOS Bundle IDが`com.aicalendarapp.tapless`と一致しているか確認
  - Google Cloud ConsoleのiOS Client IDのBundle IDが正しいか確認

#### 5.3 よくある原因と解決方法

### エラー: 「認証に失敗しました」

**原因:**
- Supabase Google Provider設定が不完全
- Client ID/Secretが間違っている
- Google Cloud ConsoleでOAuth同意画面が未設定

**解決方法:**

1. **Supabase設定を再確認**
   - Web Client IDとClient Secretが正しいか確認
   - iOS/Android Client IDsが「Authorized Client IDs」に追加されているか確認
   - Redirect URLsに `aicalendarapp://` が設定されているか確認

2. **Google Cloud Console設定を再確認**
   - OAuth同意画面が設定されているか確認
   - Redirect URIが正しいか確認（SupabaseのCallback URL）
   - テストユーザーが追加されているか、または本番環境に公開済みか確認

### エラー: 「このアプリは確認されていません」

**原因:**
- OAuth同意画面が「テスト」モードで、ログインしようとしているアカウントがテストユーザーに含まれていない

**解決方法:**

**方法1: テストユーザーを追加**
1. Google Cloud Console → **OAuth同意画面**
2. **テストユーザー** セクションで **+ ADD USERS**
3. テスト用のGoogleアカウントを追加

**方法2: 本番環境に公開**
1. Google Cloud Console → **OAuth同意画面**
2. **公開ステータス** → **本番環境に公開**
3. 注意: 本番環境に公開すると、すべてのGoogleアカウントでログイン可能になります

### エラー: 「redirect_uri_mismatch」

**原因:**
- Google Cloud ConsoleのRedirect URIとSupabaseのCallback URLが一致していない

**解決方法:**

1. Supabase Dashboardで正しいCallback URLを確認:
   ```
   https://gfrwnonfqchtmgyddbht.supabase.co/auth/v1/callback
   ```

2. Google Cloud Console → **認証情報** → **Web Client** を編集
3. **承認済みのリダイレクトURI** にSupabaseのCallback URLを追加
4. **保存**

### エラー: 「invalid_client」

**原因:**
- Client IDまたはClient Secretが間違っている
- Web Client IDではなく、iOS/Android Client IDを使用している

**解決方法:**

1. Supabase設定で**Web Client ID**を使用しているか確認
   - Web Client IDは `.apps.googleusercontent.com` で終わる
   - Google Cloud Consoleで「ウェブアプリケーション」タイプのものを使用

2. Client Secretが正しいか確認
   - Google Cloud Consoleで再確認

### エラー: ブラウザが開かない、または開いてもすぐ閉じる

**原因:**
- URL Schemeの設定が不完全
- Redirect URLsの設定が間違っている

**解決方法:**

1. **app.jsonの確認**
   ```json
   {
     "expo": {
       "scheme": "aicalendarapp"
     }
   }
   ```

2. **Supabase Redirect URLsの確認**
   - `aicalendarapp://` が含まれているか確認

3. **再ビルド**
   - 設定変更後、必ず再ビルドする

### デバッグログの確認

アプリ実行中にMetro Bundlerのログで以下を確認:

```
[Google Sign-In] 開始
[Google Sign-In] OAuth URLを生成中...
[Google Sign-In] ブラウザを開きます: https://accounts.google.com/...
[Google Sign-In] ブラウザセッション完了
[Google Sign-In] Supabaseセッションを設定中...
[Google Sign-In] 完了
```

エラーが発生した場合、詳細なログが出力されます:
```
[Google Sign-In] エラー発生: ...
[Google Sign-In] エラーメッセージ: ...
```

---

## 6. 設定チェックリスト

Google Sign-Inが動作しない場合、以下のチェックリストで設定を確認してください。

### ✅ Google Cloud Console

#### OAuth同意画面
- [ ] OAuth同意画面が作成されている
- [ ] アプリ名が設定されている（例: `tapless`）
- [ ] ユーザーサポートメールが設定されている
- [ ] スコープ（`.../auth/userinfo.email`, `.../auth/userinfo.profile`）が設定されている
- [ ] **重要**: テストユーザーが追加されている、**または**本番環境に公開されている

#### Client IDs
- [ ] **Web Client ID**が作成されている
  - アプリケーションの種類: **ウェブアプリケーション**
  - 承認済みのリダイレクトURI: `https://gfrwnonfqchtmgyddbht.supabase.co/auth/v1/callback`
  - Client IDを控えている（`xxxx.apps.googleusercontent.com`）
  - Client Secretを控えている（`GOCSPX-xxxx`）

- [ ] **iOS Client ID**が作成されている
  - アプリケーションの種類: **iOS**
  - Bundle ID: `com.aicalendarapp.tapless`
  - Client IDを控えている

- [ ] **Android Client ID**が作成されている（将来のため）
  - アプリケーションの種類: **Android**
  - Package Name: `com.aicalendarapp.tapless`
  - Client IDを控えている

### ✅ Supabase Dashboard

1. **Authentication** → **Providers** → **Google** を開く

- [ ] **Enable Sign in with Google**: ONになっている
- [ ] **Client ID (for OAuth)**: **Web Client ID**が入力されている
  - 形式: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
  - ⚠️ Web Client IDであることを確認（iOS/Android Client IDではない）
- [ ] **Client Secret (for OAuth)**: Web Client IDのClient Secretが入力されている
  - 形式: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- [ ] **Authorized Client IDs**: iOS Client IDとAndroid Client IDが追加されている
  - 1行に1つずつ入力
  - Web Client IDは含めない
- [ ] **Redirect URLs**: 以下のURLが設定されている
  - `aicalendarapp://`
  - `com.aicalendarapp.tapless://`（オプション）
- [ ] **Save**ボタンをクリック済み

### ✅ アプリコード（app.json）

- [ ] `scheme: "aicalendarapp"`が設定されている
- [ ] iOS Bundle ID: `com.aicalendarapp.tapless`
- [ ] Android Package: `com.aicalendarapp.tapless`

### ✅ ビルドとデプロイ

- [ ] 最新のコード（ログ改善版）でビルドされている
- [ ] `app.json`の`buildNumber`を更新済み（現在: `199`）
- [ ] TestFlightに最新ビルドがアップロード済み
- [ ] TestFlightアプリで最新ビルドをインストール済み

### ✅ テスト実行

- [ ] TestFlightアプリでGoogle Sign-Inボタンをタップ
- [ ] ブラウザが開いてGoogle Sign-In画面が表示される
- [ ] Googleアカウントを選択できる
- [ ] 権限確認画面で「許可」をタップ
- [ ] アプリに戻ってログイン成功

### 🐛 エラーが出た場合

1. **Macとデバイスを接続**してXcodeのコンソールでログを確認
2. 上記の「5.1 ログの確認方法」を参照
3. ログメッセージから原因を特定
4. 該当する設定を修正

---

## 7. 実装の詳細（参考情報）

### コード実装状況

Googleサインインは以下のファイルで既に実装済みです:

#### authService.ts (Line 433-480)
```typescript
async signInWithGoogle() {
  const redirectUrl = makeRedirectUri({ scheme: 'aicalendarapp' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: false,
    },
  });

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    // ... セッション処理
  }
}
```

#### AuthContext.tsx (Line 402-420)
- `signInWithGoogle()` メソッドが実装済み
- エラーハンドリングとユーザーフィードバックが完備

#### AuthForm.tsx (Line 448-456)
- 「Googleでログイン」ボタンが実装済み
- Google ロゴ付きのUIコンポーネント

### 使用しているライブラリ

- `expo-auth-session` (v7.0.8): OAuth認証フロー
- `expo-web-browser` (v14.2.0): ブラウザセッション管理
- `@supabase/supabase-js` (v2.55.0): Supabase認証

---

## 8. 参考リンク

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Identity - OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase - Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
