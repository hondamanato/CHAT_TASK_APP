# Geminiチャット機能が反応しない問題の調査報告 (2025-11-13)

## 問題の概要

**症状:**
- 画像解析（Claude Sonnet 4.5）は正常に動作する
- テキストチャット（Gemini 1.5 Flash）で「すみません、うまく理解できませんでした」と返される
- Geminiが全く反応しない

## 調査結果

### 1. アーキテクチャの違い

#### チャット機能（Gemini）
- **フロー**: ChatScreen → geminiChatService → Supabase Edge Function (gemini-proxy) → Gemini API
- **エンドポイント**: `https://gfrwnonfqchtmgyddbht.supabase.co/functions/v1/gemini-proxy`
- **認証**: Supabase ANON_KEY
- **API**: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`

#### 画像解析機能（Claude）
- **フロー**: ChatScreen → hybridAIService → Supabase Edge Function (analyze-shift-claude) → Anthropic API
- **エンドポイント**: `https://gfrwnonfqchtmgyddbht.supabase.co/functions/v1/analyze-shift-claude`
- **認証**: Supabase ANON_KEY
- **API**: Anthropic Claude 3.5 Sonnet

### 2. 最近の修正履歴

#### コミット 179260d (2025-11-11)
- **修正内容**: Gemini APIバージョンを `v1beta` → `v1` に変更
- **理由**: gemini-1.5-flashモデルがv1beta APIで404エラー
- **影響**: Edge Function v28としてデプロイ済み

#### コミット 92fda5a (2025-11-11)
- **修正内容**: モデル名を `gemini-2.5-flash` → `gemini-1.5-flash` に修正
- **理由**: 存在しないモデルによる403エラー
- **追加修正**: エラーハンドリングの改善

### 3. 環境変数の状態

#### ローカル環境 (.env)
```env
GEMINI_API_KEY=  # 空欄
```

#### Supabase Secrets（Edge Function側）
```bash
GEMINI_API_KEY: 817005ef7566a86dbe002e453485d996e89840cf3d5d149b3c4584ac2dbc4bfb (設定済み)
```

### 4. Edge Functionの状態

```bash
ID: ffd7af7f-1673-42a6-92b4-6e0f19d3472c
NAME: gemini-proxy
STATUS: ACTIVE
VERSION: 28
UPDATED_AT: 2025-11-12 08:23:28 UTC
```

### 5. エラーハンドリング

#### geminiChatService.ts (325-355行目)
```typescript
catch (error: any) {
  console.error('Geminiチャット処理エラー:', error);
  
  let errorMessage = 'すみません、うまく理解できませんでした。';
  
  if (error.message?.includes('API key not configured')) {
    errorMessage = '⚠️ Gemini APIキーが設定されていません。管理者に連絡してください。';
  } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
    errorMessage = '⚠️ ネットワークエラーが発生しました。';
  } else if (error.message?.includes('500')) {
    errorMessage = '⚠️ サーバーエラーが発生しました。';
  } else if (error.message?.includes('JSON')) {
    errorMessage = '⚠️ AIの応答を解析できませんでした。';
  } else {
    errorMessage += `\n詳細: ${error.message || 'Unknown error'}`;
  }
  
  return {
    intent: 'chat',
    events: [],
    message: errorMessage,
    confidence: 0.0
  };
}
```

## 考えられる原因（優先度順）

### 1. Gemini APIキーの問題【最も可能性が高い】

#### 症状
- 画像解析（Claude）は動作するが、チャット（Gemini）は動作しない
- エラーメッセージが汎用的（「すみません、うまく理解できませんでした」）

#### 原因候補
1. **Supabase SecretsのGEMINI_API_KEYが無効**
   - キーの有効期限切れ
   - キーの制限設定（IPアドレス、リファラー制限など）
   - キーが削除されている
   - キーのフォーマット問題（改行、スペースなど）

2. **Gemini APIの制限に達している**
   - 無料枠の上限を超えた
   - レート制限に達している
   - プロジェクトの制限設定

3. **APIキーの権限不足**
   - gemini-1.5-flashモデルへのアクセス権限がない
   - Gemini APIが有効化されていない

### 2. Edge Functionのデプロイ問題

#### 症状
- 最新のコード変更がデプロイされていない可能性

#### 原因候補
1. コミット 179260d または 92fda5a の変更が反映されていない
2. Edge Functionのキャッシュ問題
3. デプロイが失敗している

### 3. Gemini APIエンドポイントの問題

#### 症状
- APIバージョンやモデル名が正しくない

#### 原因候補
1. `v1` エンドポイントでも `gemini-1.5-flash` が利用できない
2. 正しいモデル名は `gemini-1.5-flash-latest` または別のバリアント
3. Gemini API側の仕様変更

### 4. リクエストフォーマットの問題

#### 症状
- Gemini APIがリクエストを拒否している

#### 原因候補
1. `generationConfig` のパラメータが不正
2. `contents` のフォーマットが不正
3. APIバージョン（v1）とリクエスト形式の不整合

### 5. CORS設定の問題

#### 症状
- ブラウザやアプリからのリクエストがブロックされている

#### 原因候補
1. gemini-proxy Edge FunctionのCORS設定が不足
2. Gemini API側のCORS制限
3. Supabase Edge FunctionのCORS設定問題

## 推奨される修正アクション（優先度順）

### 【最優先】アクション 1: Gemini APIキーの検証と再設定

#### 手順

1. **新しいGemini APIキーを取得**
   ```bash
   # https://aistudio.google.com/app/apikey にアクセス
   # Googleアカウントでログイン
   # 「Create API Key」をクリック
   # プロジェクトを選択（または新規作成）
   # APIキーをコピー
   ```

2. **APIキーを直接テスト**
   ```bash
   # curlでGemini APIを直接テスト
   curl -X POST \
     'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=YOUR_NEW_API_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "contents": [{
         "parts": [{"text": "こんにちは"}]
       }],
       "generationConfig": {
         "temperature": 0.2,
         "topK": 32,
         "topP": 1,
         "maxOutputTokens": 1024
       }
     }'
   ```

3. **Supabase Secretsを更新**
   ```bash
   # Gemini APIキーを設定
   supabase secrets set GEMINI_API_KEY=your-new-gemini-api-key
   
   # 設定を確認
   supabase secrets list
   ```

4. **Edge Functionを再デプロイ**
   ```bash
   # Edge Functionをデプロイ
   supabase functions deploy gemini-proxy
   
   # デプロイ状況を確認
   supabase functions list
   ```

5. **アプリでテスト**
   - アプリを起動
   - チャット画面を開く
   - メッセージを送信（例: 「明日の14時にミーティング」）
   - 正常に応答があるか確認

### アクション 2: Edge Functionログの確認

#### 手順

1. **Supabaseダッシュボードでログを確認**
   ```
   https://supabase.com/dashboard/project/gfrwnonfqchtmgyddbht/functions/gemini-proxy/logs
   ```

2. **確認すべきログ内容**
   - エラーメッセージ: `Gemini API key not configured`
   - エラーメッセージ: `Gemini API error: 403`
   - エラーメッセージ: `Gemini API error: 404`
   - エラーメッセージ: `Gemini API error: 500`
   - リクエストの詳細
   - レスポンスの詳細

3. **ログからの情報収集**
   - エラーコード（403, 404, 500など）
   - エラーメッセージ（API key invalid, Model not foundなど）
   - リクエストボディ
   - レスポンスボディ

### アクション 3: デバッグログの追加（コード変更）

#### geminiChatService.ts に詳細ログを追加

**ファイル:** `src/services/geminiChatService.ts` (293-314行目)

**変更前:**
```typescript
const response = await fetch(this.edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this.supabaseKey}`,
    'apikey': this.supabaseKey,
  },
  body: JSON.stringify(requestBody),
});

if (!response.ok) {
  const errorData = await response.json();
  throw new Error(`Gemini Edge Function error: ${response.status} - ${errorData.error || 'Unknown error'}`);
}

const data = await response.json();
```

**変更後:**
```typescript
console.log('🔍 [Gemini] Edge Function URL:', this.edgeFunctionUrl);
console.log('🔍 [Gemini] リクエストボディ:', JSON.stringify(requestBody).substring(0, 200) + '...');

const response = await fetch(this.edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this.supabaseKey}`,
    'apikey': this.supabaseKey,
  },
  body: JSON.stringify(requestBody),
});

console.log('🔍 [Gemini] レスポンスステータス:', response.status);
console.log('🔍 [Gemini] レスポンスヘッダー:', JSON.stringify(Object.fromEntries(response.headers.entries())));

if (!response.ok) {
  const errorData = await response.json();
  console.error('❌ [Gemini] Edge Function エラー詳細:', errorData);
  throw new Error(`Gemini Edge Function error: ${response.status} - ${JSON.stringify(errorData)}`);
}

const data = await response.json();
console.log('✅ [Gemini] レスポンス受信:', data?.candidates?.length || 0, 'candidates');
```

### アクション 4: Edge Functionの最新バージョンを確認

#### 手順

1. **ローカルのコードを確認**
   ```bash
   cat supabase/functions/gemini-proxy/index.ts
   
   # 29行目を確認
   # const geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
   ```

2. **正しいバージョンか確認**
   - APIバージョン: `v1` （`v1beta` ではない）
   - モデル名: `gemini-1.5-flash` （`gemini-2.5-flash` ではない）

3. **変更がある場合は再デプロイ**
   ```bash
   supabase functions deploy gemini-proxy
   ```

### アクション 5: Gemini APIの利用状況を確認

#### 手順

1. **Google Cloud Consoleで確認**
   ```
   https://console.cloud.google.com/apis/dashboard
   ```

2. **確認すべき項目**
   - Gemini APIが有効化されているか
   - プロジェクトの請求設定
   - API利用量（無料枠の残り）
   - レート制限の状況
   - APIキーの制限設定

3. **APIキーの制限設定を確認**
   - IPアドレス制限
   - リファラー制限
   - APIの制限（Gemini APIが許可されているか）

## 期待される結果

### 修正後の動作

- ✅ チャットでメッセージを送信すると、Geminiが正常に応答する
- ✅ エラー発生時は具体的なエラーメッセージが表示される
- ✅ コンソールログで詳細なデバッグ情報が確認できる
- ✅ 画像解析とチャットの両方が正常に動作する

### デバッグ情報の例

**成功時:**
```
🔍 [Gemini] Edge Function URL: https://...
🔍 [Gemini] リクエストボディ: {"contents":[{"parts":[{"text":"...
🔍 [Gemini] レスポンスステータス: 200
🔍 [Gemini] レスポンスヘッダー: {"content-type":"application/json",...
✅ [Gemini] レスポンス受信: 1 candidates
```

**エラー時:**
```
🔍 [Gemini] Edge Function URL: https://...
🔍 [Gemini] リクエストボディ: {"contents":[{"parts":[{"text":"...
🔍 [Gemini] レスポンスステータス: 500
🔍 [Gemini] レスポンスヘッダー: {"content-type":"application/json",...
❌ [Gemini] Edge Function エラー詳細: {"error":"Gemini API key not configured"}
```

## 次のステップ

1. **最優先**: Gemini APIキーの検証と再設定
2. Edge Functionログの確認
3. デバッグログの追加（コード変更）
4. アプリでテスト
5. 問題が解決しない場合、Gemini APIの代替案を検討（Claude、GPT-4など）

## 注意事項

- **既存機能への影響なし**: デバッグログ追加のみで、既存の動作は変わりません
- **APIキーの扱い**: APIキーは絶対にコードにハードコードしないでください
- **セキュリティ**: デバッグログにAPIキーが含まれないように注意してください
- **コミット前**: デバッグログを追加したら、必ずgit diffで確認してからコミットしてください

---

**調査実施日**: 2025-11-13
**調査者**: Claude Code
**最終更新**: 2025-11-13
