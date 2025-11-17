# Vercel AI SDK統合 - デプロイガイド

## デプロイ前の確認事項

### 1. 環境変数の確認

以下の環境変数が設定されているか確認してください:

```bash
# .env ファイル
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 2. 依存関係のインストール

```bash
# プロジェクトルートで実行
npm install

# 必要なパッケージが追加されているか確認
npm list ai zod
```

## Edge Functionのデプロイ

### ステップ1: Supabase CLIのインストール

```bash
# Homebrewを使用（macOS）
brew install supabase/tap/supabase

# または、npmを使用
npm install -g supabase
```

### ステップ2: Supabaseにログイン

```bash
supabase login
```

### ステップ3: プロジェクトをリンク

```bash
# プロジェクトIDを確認してリンク
supabase link --project-ref your-project-id
```

### ステップ4: Edge Functionをデプロイ

```bash
# ai-chat Edge Functionをデプロイ
supabase functions deploy ai-chat

# 成功メッセージを確認
# ✓ Deployed Function ai-chat successfully
```

### ステップ5: 環境変数を設定

```bash
# Gemini APIキーを設定
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# 設定を確認
supabase secrets list
```

## テスト手順

### 1. Edge Functionの動作確認

```bash
# ログを確認
supabase functions logs ai-chat --tail

# 別のターミナルで、アプリを起動してチャット機能をテスト
npm start
```

### 2. 基本的なチャット機能のテスト

アプリを起動して以下を試してください:

1. **シンプルなイベント作成**
   - 「明日の3時に会議」と入力
   - イベントが作成されることを確認

2. **複雑なイベント作成**
   - 「毎週月曜日10時に定例会議、赤色で、1時間前に通知」
   - 繰り返し設定、色、リマインダーが正しく設定されることを確認

3. **イベント検索**
   - 「明日の予定を教えて」
   - 検索結果が表示されることを確認

4. **画像解析**
   - シフト表の画像を添付
   - 画像から正しくイベントが抽出されることを確認

### 3. ストリーミングの確認

- メッセージ送信時にリアルタイムで応答が表示されることを確認
- ローディング中にテキストが徐々に表示されることを確認

### 4. エラーハンドリングの確認

1. **ネットワークエラー**
   - 機内モードにしてメッセージを送信
   - エラーメッセージが表示されることを確認

2. **無効な入力**
   - 空のメッセージを送信
   - 適切に処理されることを確認

## トラブルシューティング

### Edge Functionがデプロイできない

```bash
# エラーログを確認
supabase functions logs ai-chat

# 再デプロイを試す
supabase functions deploy ai-chat --no-verify-jwt
```

### 「Gemini API key not configured」エラー

```bash
# 環境変数が設定されているか確認
supabase secrets list

# 再設定
supabase secrets set GEMINI_API_KEY=your_key
```

### ストリーミングが動作しない

1. CORSヘッダーを確認:
   - `supabase/functions/ai-chat/index.ts`のcorsHeadersを確認

2. ネットワーク接続を確認:
   - ブラウザの開発者ツールでネットワークタブを確認

3. Edge Functionのログを確認:
   ```bash
   supabase functions logs ai-chat --tail
   ```

### Tool Callingが動作しない

1. システムプロンプトを確認:
   - `supabase/functions/ai-chat/index.ts`のsystemPromptを確認

2. Zodスキーマを確認:
   - スキーマ定義が正しいか確認

3. Geminiモデルのバージョンを確認:
   - `gemini-2.5-flash`が使用されているか確認

## パフォーマンスモニタリング

### 1. レスポンス時間の確認

```bash
# Edge Functionのログでレスポンス時間を確認
supabase functions logs ai-chat | grep "processing time"
```

### 2. エラー率の確認

```bash
# エラーログをフィルタ
supabase functions logs ai-chat | grep "ERROR"
```

### 3. コスト監視

Supabaseのダッシュボードで以下を確認:
- Edge Functionの実行回数
- データ転送量

Gemini APIのダッシュボードで以下を確認:
- APIリクエスト数
- トークン使用量

## ロールバック手順

問題が発生した場合の対処:

### 1. 旧バージョンに戻す

```bash
# バックアップファイルを復元
cp src/components/ChatScreen.tsx.backup src/components/ChatScreen.tsx

# 旧サービスを使用
# src/services/hybridAIService.ts のaiChatServiceインポートをコメントアウト
```

### 2. Edge Functionを削除

```bash
# ai-chat Edge Functionを削除
supabase functions delete ai-chat
```

### 3. 依存関係を元に戻す

```bash
# package.jsonからaiとzodを削除
npm uninstall ai zod
npm install
```

## 本番環境へのデプロイ

### 1. テスト環境で十分にテスト

- 各機能が正常に動作することを確認
- エッジケースをテスト
- パフォーマンスを確認

### 2. 段階的なロールアウト

- 一部のユーザーに先行公開
- フィードバックを収集
- 問題がなければ全ユーザーに展開

### 3. モニタリング

- エラー率を監視
- レスポンス時間を監視
- ユーザーフィードバックを確認

## サポート

問題が発生した場合:

1. **ログを確認**
   ```bash
   supabase functions logs ai-chat --tail
   ```

2. **ドキュメントを参照**
   - `VERCEL_AI_SDK_INTEGRATION.md`
   - [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)

3. **コミュニティに質問**
   - Supabase Discord
   - Vercel Discord

## まとめ

✅ Edge Functionをデプロイ
✅ 環境変数を設定
✅ 基本機能をテスト
✅ ストリーミングを確認
✅ エラーハンドリングを確認
✅ パフォーマンスを監視

これでVercel AI SDKの統合が完了しました！

