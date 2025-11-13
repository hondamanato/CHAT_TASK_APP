# Gemini API 404エラー修正計画

## 調査結果

### 1. 現在のコード状況

#### ファイル: `supabase/functions/gemini-proxy/index.ts`
- **29行目**: 
  ```typescript
  const geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
  ```
- **APIバージョン**: `v1`
- **モデル名**: `gemini-1.5-flash`

#### ファイル: `src/services/aiEventExtractionService.ts`
- **113行目**:
  ```typescript
  `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  ```
- **APIバージョン**: `v1`
- **モデル名**: `gemini-1.5-flash`

### 2. 問題の原因

**Google Gemini 1.5シリーズは廃止されました**

- コミット `179260d` で `v1beta` → `v1` に変更されましたが、これは誤った修正でした
- 実際の問題は、`gemini-1.5-flash` モデル自体が2025年時点で廃止されていることです
- Google公式ドキュメントによると、現在利用可能なのは **Gemini 2.0** および **Gemini 2.5** シリーズのみです

### 3. Google Gemini API 仕様（2025年11月時点）

#### 利用可能なモデル
- `gemini-2.5-pro` - 高度な推論タスク用
- `gemini-2.5-flash` - 大規模タスクに最適な価格/性能比
- `gemini-2.5-flash-lite` - 超高速・低コスト
- `gemini-2.0-flash` - 前世代モデル

#### 正しいAPIエンドポイント形式
```
https://generativelanguage.googleapis.com/v1beta/models/{model-name}:generateContent
```

**重要**: 
- APIバージョンは **`v1beta`** を使用すべき（公式ドキュメントのすべての例で使用）
- `v1` ではなく `v1beta` が標準

### 4. 修正方法

以下の2つのファイルを修正する必要があります：

#### 修正箇所1: `supabase/functions/gemini-proxy/index.ts` (29行目)

**変更前:**
```typescript
const geminiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
```

**変更後:**
```typescript
const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
```

**変更内容:**
- `v1` → `v1beta`
- `gemini-1.5-flash` → `gemini-2.5-flash`

#### 修正箇所2: `src/services/aiEventExtractionService.ts` (113行目)

**変更前:**
```typescript
`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
```

**変更後:**
```typescript
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
```

**変更内容:**
- `v1` → `v1beta`
- `gemini-1.5-flash` → `gemini-2.5-flash`

### 5. 選択したモデル: `gemini-2.5-flash`

**理由:**
- `gemini-2.5-flash` は大規模タスクに最適な価格/性能比を提供
- 現在のコードでは `gemini-1.5-flash` を使用していたため、同等の性能を持つ最新モデルに移行
- `gemini-2.5-pro` よりコスト効率が良い

## 修正タスク

- [x] `supabase/functions/gemini-proxy/index.ts` の29行目を修正
  - APIバージョンを `v1` から `v1beta` に変更
  - モデル名を `gemini-1.5-flash` から `gemini-2.5-flash` に変更

- [x] `src/services/aiEventExtractionService.ts` の113行目を修正
  - APIバージョンを `v1` から `v1beta` に変更
  - モデル名を `gemini-1.5-flash` から `gemini-2.5-flash` に変更

- [x] Edge Function `gemini-proxy` を再デプロイ

- [ ] 修正内容をテスト
  - Gemini APIプロキシ関数の動作確認
  - AIイベント抽出機能の動作確認

- [ ] コミット
  - コミットメッセージ: `Fix: Gemini 1.5廃止に伴い2.5-flashに移行（v1beta使用）`

## 参考情報

- Google Gemini APIドキュメント: https://ai.google.dev/api
- 利用可能なモデル一覧: https://ai.google.dev/gemini-api/docs/models
- Stack Overflowの関連問題: https://stackoverflow.com/questions/79779187/
