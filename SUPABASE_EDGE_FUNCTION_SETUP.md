# Supabase Edge Function設定ガイド

## 1. Supabaseプロジェクトの準備

### A. プロジェクト作成（既存の場合はスキップ）
1. [Supabase](https://supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名: `ai-calendar-app`

### B. 環境変数の設定
1. Supabaseダッシュボードで「設定」→「API」を選択
2. 以下の情報をコピー：
   - Project URL
   - anon public key

## 2. Edge Functionのデプロイ

### A. Supabase CLIのインストール
```bash
npm install -g supabase
```

### B. プロジェクトのリンク
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### C. Edge Functionのデプロイ
```bash
supabase functions deploy google-calendar
```

## 3. 環境変数の設定

### A. Supabaseダッシュボードで設定
1. 「設定」→「Edge Functions」を選択
2. 「環境変数」タブをクリック
3. 以下の環境変数を追加：
   ```
   GOOGLE_CALENDAR_API_KEY=your_google_calendar_api_key_here
   ```

### B. ローカル環境変数の更新
```bash
# .envファイルに追加
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. 動作確認

### A. Edge Functionのテスト
```bash
curl -X POST https://your-project.supabase.co/functions/v1/google-calendar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_anon_key" \
  -d '{"countryCode": "JP", "year": 2024}'
```

### B. アプリでの確認
1. アプリを起動
2. 祝日が表示されることを確認
3. コンソールログで「Supabase Edge Function レスポンス」を確認

## 5. フォールバック機能

この実装では以下の順序でフォールバックします：

1. **Supabase Edge Function**（推奨）
2. **直接Google Calendar API**（バックアップ）
3. **Nager.Date API**（最終フォールバック）

## 6. 利点

### A. セキュリティ
- Google APIキーがクライアントに露出しない
- リファラー制限の設定が不要
- 中央集権的なAPIキー管理

### B. プラットフォーム対応
- Webアプリとモバイルアプリで同じエンドポイント
- CORS対応済み
- 統一されたエラーハンドリング

### C. 保守性
- APIキーの更新が容易
- ログとモニタリングが可能
- スケーラブルなアーキテクチャ
