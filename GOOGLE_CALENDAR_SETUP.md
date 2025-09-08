# Google Calendar API設定ガイド

## 1. Google Cloud Consoleでの設定

### A. プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名: `ai-calendar-app`

### B. Calendar API有効化
1. 「APIとサービス」→「ライブラリ」を選択
2. 「Google Calendar API」を検索して有効化

### C. APIキー作成
1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「APIキー」を選択
3. 作成されたAPIキーをコピー

### D. APIキーの制限設定
1. 作成したAPIキーをクリック
2. 「アプリケーションの制限」で「HTTPリファラー」を選択
3. 許可するリファラーを追加（開発時は `*` でも可）

## 2. 環境変数の設定

### A. .envファイルの作成
```bash
# ai-calendar-app/.env
EXPO_PUBLIC_GOOGLE_CALENDAR_API_KEY=your_actual_api_key_here
```

### B. 既存の設定
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
APP_NAME=AI Calendar
```

## 3. 対応国一覧

Google Calendar APIで利用可能な国別祝日カレンダー：

- JP: 日本
- US: アメリカ合衆国
- GB: イギリス
- FR: フランス
- DE: ドイツ
- IT: イタリア
- ES: スペイン
- CA: カナダ
- AU: オーストラリア
- KR: 韓国
- CN: 中国
- BR: ブラジル

## 4. フォールバック機能

Google Calendar APIが失敗した場合、自動的にNager.Date APIにフォールバックします。

## 5. トラブルシューティング

### A. APIキーエラー
- APIキーが正しく設定されているか確認
- Google Cloud ConsoleでCalendar APIが有効化されているか確認

### B. リクエスト制限エラー
- Google Cloud ConsoleでAPIキーの制限を確認
- リファラー設定を確認

### C. ネットワークエラー
- インターネット接続を確認
- ファイアウォール設定を確認
