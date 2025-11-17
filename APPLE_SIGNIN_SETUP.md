# Apple Sign-In セットアップガイド

このドキュメントでは、Apple Sign-In機能を有効化するための完全な手順を説明します。

## 目次
1. [Apple Developer Console設定](#1-apple-developer-console設定)
2. [Xcode設定](#2-xcode設定)
3. [Supabase設定](#3-supabase設定)
4. [テスト手順](#4-テスト手順)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. Apple Developer Console設定

### 1.1 App IDの設定確認

1. [Apple Developer Console](https://developer.apple.com/)にアクセス
2. **Certificates, Identifiers & Profiles** を選択
3. 左メニューから **Identifiers** を選択
4. App ID `com.aicalendarapp.tapless` を検索してクリック

#### Sign in with Apple Capabilityの追加

5. **Capabilities** セクションを確認
6. **Sign in with Apple** を探す
   - ✅ チェックが入っていればOK（次のステップへ）
   - ❌ チェックが入っていない場合:
     - チェックボックスをクリック
     - **Save** をクリック
     - 確認ダイアログで **Confirm** をクリック

### 1.2 Services IDの作成

**重要**: ネイティブApple Sign-In（`expo-apple-authentication`）を使用する場合、Services IDは**不要**です。このステップはスキップできます。

もしWebベースのApple Sign-Inを使用する場合のみ、以下の手順を実行してください:

1. **Identifiers** ページで右上の **+** ボタンをクリック
2. **Services IDs** を選択して **Continue**
3. 以下を入力:
   - **Description**: `tapless Sign in with Apple`
   - **Identifier**: `com.aicalendarapp.tapless.service`
4. **Continue** → **Register**
5. 作成したServices IDをクリック
6. **Sign in with Apple** にチェックを入れる
7. **Configure** をクリック
8. 以下を設定:
   - **Primary App ID**: `com.aicalendarapp.tapless` を選択
   - **Website URLs**:
     - **Domains and Subdomains**: Supabase Dashboardに表示されているドメイン
     - **Return URLs**: Supabase Dashboardに表示されているCallback URL
9. **Next** → **Done** → **Continue** → **Save**

### 1.3 Key (.p8) の作成

**重要**: ネイティブApple Sign-In（`expo-apple-authentication`）を使用する場合、Keyは**不要**です。このステップはスキップできます。

もしWebベースのApple Sign-Inを使用する場合のみ、以下の手順を実行してください:

1. 左メニューから **Keys** を選択
2. 右上の **+** ボタンをクリック
3. 以下を入力:
   - **Key Name**: `tapless Sign in with Apple Key`
4. **Sign in with Apple** にチェックを入れる
5. **Configure** をクリック
6. **Primary App ID**: `com.aicalendarapp.tapless` を選択
7. **Save** → **Continue** → **Register**
8. **Download** をクリックして `.p8` ファイルをダウンロード
   - ⚠️ **重要**: このファイルは再ダウンロードできません。安全な場所に保管してください
9. **Key ID** をメモ（例: `A1B2C3D4E5`）

### 1.4 Provisioning Profileの更新

1. 左メニューから **Profiles** を選択
2. App ID `com.aicalendarapp.tapless` に関連するProfileを探す
   - **iOS App Development**
   - **App Store** または **Ad Hoc**
3. 各Profileをクリック
4. **Edit** をクリック
5. 変更がなくても **Generate** をクリック（最新の設定を反映）
6. **Download** をクリックしてダウンロード
7. ダウンロードしたファイルをダブルクリックしてXcodeに追加

---

## 2. Xcode設定

### 2.1 プロジェクトを開く

```bash
cd /Users/hondamanato/Chat_task_App
open ios/tapless.xcodeproj
```

または、Xcodeを起動して `ios/tapless.xcodeproj` を開く

### 2.2 Sign in with Apple Capabilityを追加

1. 左側のプロジェクトナビゲーターで **tapless** プロジェクトを選択
2. **TARGETS** → **tapless** を選択
3. 上部のタブから **Signing & Capabilities** を選択
4. **+ Capability** ボタンをクリック（左上）
5. 検索ボックスに「sign in」と入力
6. **Sign in with Apple** をダブルクリックして追加

#### 既に追加されている場合

- Capabilitiesリストに「Sign in with Apple」が表示されていればOK
- 下に表示される設定を確認:
  - **Team**: `LKD5YP2DRM` が選択されているか
  - **Bundle Identifier**: `com.aicalendarapp.tapless` が正しいか

### 2.3 Provisioning Profileの更新

1. 同じ **Signing & Capabilities** タブで
2. **Automatically manage signing** のチェックを確認:
   - ✅ チェック有り: 自動でProfileが更新される
   - ❌ チェック無し: 手動でProfileを選択
3. 手動の場合:
   - **Provisioning Profile** で、先ほどダウンロードした最新のProfileを選択

### 2.4 Entitlementsファイルの確認

1. 左側のプロジェクトナビゲーターで `tapless.entitlements` ファイルを探す
2. ファイルを開いて以下が含まれているか確認:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.developer.applesignin</key>
    <array>
      <string>Default</string>
    </array>
  </dict>
</plist>
```

3. 含まれていない場合、上記の内容を追加

### 2.5 ビルド設定の確認

1. **Build Settings** タブを選択
2. 検索ボックスに「deployment」と入力
3. **iOS Deployment Target** が `15.1` 以上であることを確認
   - Apple Sign-Inは iOS 13.0+ で動作しますが、現在の設定は15.1でOK

---

## 3. Supabase設定

### 3.1 Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクト `gfrwnonfqchtmgyddbht` を選択
3. 左メニューから **Authentication** を選択
4. **Providers** タブをクリック

### 3.2 Apple Providerの設定（ネイティブ実装）

**ネイティブApple Sign-In（現在の実装）を使用する場合:**

1. **Apple** providerを探してクリック
2. 以下のように設定:
   - **Enable Sign in with Apple**: **ON** に切り替え
   - **iOS Bundle ID**: `com.aicalendarapp.tapless` を入力
   - **Skip nonce check**: **OFF**（デフォルト）
3. **Save** をクリック

**これで完了です！** Services IDやKeyは不要です。

### 3.3 Apple Providerの設定（Webベース実装）※使用していません

**もしWebベースのApple Sign-Inを使用する場合:**

1. **Apple** providerを探してクリック
2. 以下を入力:
   - **Enable Sign in with Apple**: **ON**
   - **iOS Bundle ID**: `com.aicalendarapp.tapless`
   - **Services ID**: `com.aicalendarapp.tapless.service` (1.2で作成)
   - **Key ID**: Apple Developer Consoleでメモした値 (1.3でメモ)
   - **Team ID**: Apple Developer Consoleの右上に表示 (例: `LKD5YP2DRM`)
   - **Private Key (.p8)**: ダウンロードした.p8ファイルの内容をコピー&ペースト
     ```
     -----BEGIN PRIVATE KEY-----
     ...（長い文字列）...
     -----END PRIVATE KEY-----
     ```
3. **Save** をクリック

### 3.4 Authorized Redirect URLsの確認

1. 同じApple Provider設定画面で
2. **Authorized Redirect URLs** セクションを確認
3. 以下のURLが含まれているか確認:
   - `aicalendarapp://`
   - `com.aicalendarapp.tapless://`
4. 含まれていない場合、追加して **Save**

---

## 4. テスト手順

### 4.1 ローカルビルドでテスト

```bash
cd /Users/hondamanato/Chat_task_App
npx expo run:ios
```

1. アプリが起動したらログイン画面へ
2. 「Appleでログイン」ボタンをタップ
3. Apple Sign-In画面が表示されるか確認
4. Face ID/Touch IDで認証
5. ログイン成功を確認

### 4.2 TestFlightでテスト

#### ビルド番号の更新

1. `app.json` を開く
2. `ios.buildNumber` を `161` に更新
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
3. 「Appleでログイン」ボタンをタップ
4. Apple Sign-In画面が表示されるか確認
5. 認証してログイン成功を確認

---

## 5. トラブルシューティング

### エラー: 「このデバイスではApple Sign-Inが利用できません」

**原因:**
- `AppleAuthentication.isAvailableAsync()` が `false` を返している

**解決方法:**

1. **iOS 13以上か確認**
   - 設定 → 一般 → 情報 → iOSバージョン
   - iOS 13未満の場合、Apple Sign-Inは使用不可

2. **Apple Developer ConsoleでCapabilityが有効か確認**
   - 上記「1.1 App IDの設定確認」を実施

3. **Xcodeで Capability が追加されているか確認**
   - 上記「2.2 Sign in with Apple Capabilityを追加」を実施

4. **Provisioning Profileが最新か確認**
   - 上記「1.4 Provisioning Profileの更新」を実施
   - Xcodeで「2.3 Provisioning Profileの更新」を実施

5. **ビルドが最新の設定を反映しているか確認**
   - 設定変更後、必ず再ビルドしてTestFlightにアップロード
   - 古いビルドには新しい設定が反映されていません

### エラー: 「Supabaseエラー」「認証に失敗しました」

**原因:**
- Supabase Apple Provider設定が不完全
- APIキーやIDが間違っている

**解決方法:**

1. **Supabase設定を再確認**
   - 上記「3.2 Apple Providerの設定」を実施

2. **ネイティブ実装の場合（現在の実装）**
   - iOS Bundle IDが正しいか確認: `com.aicalendarapp.tapless`
   - Enable Sign in with AppleがONか確認

3. **Webベース実装の場合**
   - Services ID、Key ID、Team ID、Private Keyが正しいか確認
   - .p8ファイルの内容を正しくコピー&ペーストしたか確認

### エラー: 「ERR_REQUEST_CANCELED」

**原因:**
- ユーザーが認証をキャンセルした（正常な動作）

**解決方法:**
- これはエラーではなく、想定された動作です
- コードで適切にハンドリングされています（authService.ts:376-378）

### デバッグログの確認

アプリ実行中にXcodeのコンソールまたはMetro Bundlerのログで以下を確認:

```
[Apple Sign-In] 開始
[Apple Sign-In] 利用可能性チェック中...
[Apple Sign-In] 利用可能
[Apple Sign-In] Apple認証ダイアログを表示中...
[Apple Sign-In] 認証成功、credentialを取得
[Apple Sign-In] Supabaseにサインイン中...
[Apple Sign-In] Supabaseサインイン成功
[Apple Sign-In] 完了
```

エラーが発生した場合、詳細なログが出力されます:
```
[Apple Sign-In] エラー発生: ...
[Apple Sign-In] エラーコード: ...
[Apple Sign-In] エラーメッセージ: ...
```

---

## 6. 設定チェックリスト

すべての設定が完了したか確認:

### Apple Developer Console
- [ ] App IDに「Sign in with Apple」capabilityが追加されている
- [ ] Provisioning Profileを更新・ダウンロードした

### Xcode
- [ ] Sign in with Apple Capabilityが追加されている
- [ ] Provisioning Profileが最新
- [ ] tapless.entitlementsに設定が含まれている
- [ ] iOS Deployment Targetが13.0以上

### Supabase
- [ ] Apple Providerが有効化されている
- [ ] iOS Bundle IDが正しい: `com.aicalendarapp.tapless`

### アプリ
- [ ] 最新のコードでビルドされている
- [ ] TestFlightに最新ビルドがアップロードされている
- [ ] 実機でテストして動作確認完了

---

## 参考リンク

- [Apple Developer Documentation - Sign in with Apple](https://developer.apple.com/documentation/sign_in_with_apple)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase - Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
