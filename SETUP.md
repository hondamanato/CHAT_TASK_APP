# セットアップガイド

このガイドでは、AI Calendar Appの開発環境をセットアップする手順を説明します。

## 📋 事前準備

### 必要なツール
- Node.js 18以上
- npm または yarn
- Git
- iOS Simulator（iOS開発の場合）
- Android Studio & Emulator（Android開発の場合）

### アカウント作成
1. **Supabase アカウント** - https://supabase.com
2. **Google Cloud アカウント** - https://cloud.google.com （Gemini API用）

## 🚀 セットアップ手順

### 1. プロジェクトのクローン
```bash
git clone <repository-url>
cd ai-calendar-app
npm install
```

### 2. Supabaseプロジェクトの設定

#### 2.1 プロジェクト作成
1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. 「New Project」を選択
4. プロジェクト情報を入力：
   - **Name**: `ai-calendar-app`
   - **Database Password**: 強力なパスワードを設定
   - **Region**: `Northeast Asia (Tokyo)` 推奨

#### 2.2 データベーススキーマの作成
1. Supabaseダッシュボードで「SQL Editor」を開く
2. 本プロジェクトの `supabase-schema.sql` ファイルの内容をコピー
3. SQL Editorに貼り付けて実行

#### 2.3 APIキーの取得
1. 「Settings」→「API」を開く
2. 以下をメモ：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJhbGci...`

### 3. Gemini API の設定

#### 3.1 Google Cloud プロジェクト作成
1. https://console.cloud.google.com にアクセス
2. 新しいプロジェクトを作成
3. 「APIs & Services」→「Enabled APIs」で Gemini API を有効化

#### 3.2 APIキーの作成
1. 「APIs & Services」→「Credentials」
2. 「Create Credentials」→「API Key」
3. 作成されたAPIキーをメモ
4. 必要に応じてAPIキーを制限（推奨）

### 4. 環境変数の設定

#### 4.1 .envファイルの作成
```bash
cp .env.example .env
```

#### 4.2 .envファイルの編集
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# AI Service Configuration
GEMINI_API_KEY=your-gemini-api-key

# Other Configuration
APP_NAME=AI Calendar App
```

**⚠️ 重要**: `.env`ファイルは絶対にGitにコミットしないでください

### 5. Supabaseクライアント設定の更新

`src/services/supabase.ts` ファイルを開き、環境変数を使用するように変更：

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 6. 開発サーバーの起動

```bash
npx expo start
```

アプリの起動方法：
- **iOS Simulator**: `i`キーを押下
- **Android Emulator**: `a`キーを押下  
- **実機**: Expo Goアプリで表示されるQRコードをスキャン

## 🔧 よくある問題と解決法

### Metro bundler のキャッシュクリア
```bash
npx expo start --clear
```

### ライブラリの互換性エラー
```bash
npx expo install --fix
```

### iOS Simulatorが起動しない
```bash
# Xcode Command Line Toolsのインストール
xcode-select --install
```

### Android Emulatorが起動しない
1. Android Studio で AVD Manager を開く
2. 新しいデバイスを作成
3. API Level 30以上を選択

## 📱 デバイステスト

### iOS実機テスト
1. Apple Developer アカウント（年間$99）が必要
2. Xcode でプロビジョニングプロファイルを設定

### Android実機テスト  
1. デバイスで開発者オプションを有効化
2. USBデバッグを許可
3. `adb devices` でデバイスが認識されることを確認

## 🚀 本番環境へのデプロイ

### EAS Build でのビルド
```bash
# EAS CLI インストール
npm install -g @expo/eas-cli

# EAS プロジェクト設定
eas build:configure

# ビルド実行
eas build --platform all
```

### App Store / Google Play への申請
1. **Apple App Store**: Apple Developer Program への参加が必要
2. **Google Play Store**: Google Play Developer アカウントが必要

## 🔐 セキュリティ設定

### Supabase Row Level Security (RLS)
- データベーススキーマ実行時に自動で設定されます
- 各テーブルで適切なポリシーが適用されます

### API キーの管理
- 本番環境では環境変数を使用
- APIキーに適切な制限を設定
- 定期的なキーローテーションを実施

## 📞 サポート

問題が発生した場合：

1. **GitHub Issues**: バグレポート・機能要望
2. **ログの確認**: `npx expo logs` でデバッグ情報を確認
3. **Expo ドキュメント**: https://docs.expo.dev/

---

**🎉 セットアップ完了！**

これでAI Calendar Appの開発を始める準備が整いました。