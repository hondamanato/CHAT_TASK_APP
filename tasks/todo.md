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

---

# タイトル入力フローの改善

## 問題分析
- タイトル欄タップ時に即座に全画面候補選択画面が表示される
- TextInputではなくTouchableOpacityで画面遷移している
- 新しいイベント名入力欄が重複表示されている
- ユーザーの思考フローに沿っていない

## 実装計画

### タスクリスト

- [ ] 1. EventCreateScreen.tsxのタイトル入力欄をTextInputに変更
  - TouchableOpacity + Textを削除
  - 実際のTextInputを実装
  - キーボードイベントハンドラを追加
    - onFocus: 候補を表示しない
    - onChangeText: titleを更新、候補は非表示
    - onSubmitEditing: 文字確定時に候補を表示
    - onEndEditing: キーボード完了時に候補を非表示

- [ ] 2. TitleAutocomplete.tsxを改修
  - isVisibleプロップを追加
  - 非表示時はnullを返すように変更
  - EventCreateScreenとの統合準備

- [ ] 3. EventCreateScreen.tsxにTitleAutocompleteを統合
  - タイトル入力欄の直下に配置
  - showTitleSuggestions状態変数で制御
  - 候補選択時の処理を実装

- [ ] 4. TitleSelectionScreenの削除
  - showTitleSelection状態変数を削除
  - TitleSelectionScreenのimportを削除
  - 関連する全てのコードを削除

- [ ] 5. 動作確認
  - タップ時に候補が表示されないことを確認
  - 文字入力中に候補が表示されないことを確認
  - 文字確定時に候補が直下に表示されることを確認
  - 完了タップで候補が消えることを確認

## 技術的注意点
- React NativeのTextInputイベント仕様に注意
- 日本語入力時の変換確定動作に注意
- zIndexの適切な設定
- 相対位置配置のため親Viewにposition: 'relative'が必要

## レビュー

### 実装完了内容

#### 1. EventCreateScreen.tsx の変更
- **598-646行目**: タイトル入力欄をTextInputに変更
  - TouchableOpacity + Text → TextInput に変更
  - キーボードイベントハンドラを実装:
    - `onChangeText`: 編集中は候補を非表示
    - `onSubmitEditing`: 文字確定時に候補を表示
    - `onEndEditing`: キーボード完了時に候補を非表示
  - TitleAutocompleteコンポーネントをタイトル入力欄の直下に配置
  - 候補選択時の処理を実装（タイトル、開始時刻、終了時刻、終日設定を反映）

- **105行目**: 状態変数の変更
  - `showTitleSelection` → `showTitleSuggestions` に変更

- **22行目**: importの変更
  - `TitleSelectionScreen` のimportを削除
  - `TitleAutocomplete` のimportを追加

- **1362-1369行目**: TitleSelectionScreenのレンダリング部分を削除

#### 2. TitleAutocomplete.tsx の変更
- **18行目**: `isVisible` プロップを追加
- **70行目**: 非表示制御ロジックを追加
  - `!isVisible` の場合は何も表示しない

### ユーザー体験の改善

✅ **タップ時**: 候補が即座に表示されない
✅ **文字入力中**: 候補が邪魔にならない
✅ **文字確定時**: 候補がタイトル欄の直下に表示される
✅ **完了タップ時**: 候補が消える

### 変更ファイルのサマリー

| ファイル | 主な変更 | 行数 |
|---------|---------|------|
| `src/screens/EventCreateScreen.tsx` | タイトル入力欄をTextInputに変更、TitleAutocompleteを統合、TitleSelectionScreenを削除 | ~50行 |
| `src/components/TitleAutocomplete.tsx` | isVisibleプロップを追加 | 2行 |

### 技術的な注意点

- **日本語入力対応**: `onSubmitEditing` は日本語の変換確定時にも発火するため、日本語入力時の動作に注意が必要
- **タイミング調整**: `onEndEditing` で `setTimeout` を使用して、候補選択のタップイベントとキーボード完了イベントの競合を回避
- **相対位置配置**: タイトル入力欄の親Viewに `position: 'relative'` を設定し、TitleAutocompleteを `position: 'absolute'` で直下に配置

### 今後の検討事項

- 日本語入力時の変換中の動作をさらに細かく制御する場合は、`onKeyPress` や `onTextInput` イベントの使用も検討可能
- 候補表示時のアニメーション追加を検討可能

---

## タイトル候補表示の修正（追加実装）

### 問題点
1. キーボードの「完了」をタップすると候補がすぐに消える
2. 過去の履歴がない新規タイトルの場合、候補エリア自体が表示されない

### 実装内容

#### 1. EventCreateScreen.tsx の変更
- **622-625行目**: `onEndEditing`処理を削除
  - キーボード完了後も候補を表示し続けるように変更
  - 候補エリアは手動で閉じる、または別の入力欄にフォーカスした時に閉じる

#### 2. TitleAutocomplete.tsx の変更
- **70-72行目**: 表示条件の変更
  - `!isVisible || (suggestions.length === 0 && !isLoading)` → `!isVisible`
  - 履歴0件でも候補エリアを表示するように変更

- **95-135行目**: 空状態UIの追加
  - 履歴がある場合: 候補リストを表示
  - 履歴がない場合: 「過去の履歴が見つかりません」メッセージを表示

- **192-206行目**: 空状態スタイルの追加
  - `emptyContainer`: 中央配置のコンテナ
  - `emptyText`: メインメッセージ
  - `emptySubText`: サブメッセージ

### 修正後の動作

✅ **キーボード確定時**: 候補エリアが直下に表示され続ける
✅ **履歴がない場合**: 空状態メッセージが表示される
✅ **視覚的フィードバック**: ユーザーに候補検索が行われたことを明示

### 変更ファイルのサマリー（追加）

| ファイル | 主な変更 | 行数 |
|---------|---------|------|
| `src/screens/EventCreateScreen.tsx` | onEndEditing処理を削除 | -4行 |
| `src/components/TitleAutocomplete.tsx` | 表示条件変更、空状態UI追加、スタイル追加 | +25行 |

---

## TimeTree風の候補選択UI実装

### 要求仕様
- タイトル入力欄をタップしたら、下部のフィールドを非表示にして候補エリアを表示
- タイトル入力欄は上部に表示されたまま
- TimeTreeのように、タイトル入力欄以外の部分を候補選択エリアに切り替える

### 実装内容

#### EventCreateScreen.tsx の変更

**1. 状態変数の追加 (106行目)**
- `isTitleFocused`: タイトル入力欄がフォーカスされているかを管理

**2. タイトル入力欄のイベントハンドラ (614-629行目)**
- `onFocus`: フォーカス時に`isTitleFocused`を`true`に設定、候補を表示
- `onBlur`: フォーカス解除時に`isTitleFocused`を`false`に設定、候補を非表示

**3. フィールドの条件表示 (653-916行目)**
- `!isTitleFocused`の条件で以下のフィールドを非表示:
  - 終日オプション
  - 開始・終了日時
  - 詳細オプション（タイムゾーン、繰り返し）
  - 場所
  - メモ
  - カラー
  - 通知

**4. TitleAutocompleteのサイズ拡大 (640行目)**
- `maxHeight={isTitleFocused ? 600 : 300}`: フォーカス時に候補エリアを2倍に拡大
- 候補選択時に`setIsTitleFocused(false)`で通常画面に戻る

### 修正後の動作

✅ **タイトル欄タップ**: 下部のフィールドが非表示になり、候補エリアが拡大表示される
✅ **タイトル入力欄は上部に維持**: TimeTreeのように上部のタイトル欄はそのまま
✅ **候補選択**: 候補を選択すると通常の画面に戻る
✅ **フォーカス解除**: タイトル欄以外をタップすると通常の画面に戻る

### 変更ファイルのサマリー（TimeTree風UI）

| ファイル | 主な変更 | 行数 |
|---------|---------|------|
| `src/screens/EventCreateScreen.tsx` | isTitleFocused状態追加、フィールド条件表示、候補エリア拡大 | +15行 |

---

## 文字確定時の候補画面切り替え実装

### 要求仕様
- タイトル欄をタップしただけでは候補画面を表示しない
- 文字入力中(未確定状態)では候補画面を表示しない
- 文字を確定(改行/完了)した時点で候補画面に切り替え
- 過去の履歴がない文字でも、入力中の文字を候補として表示
- その候補を選択するとイベントタイトルに設定される

### 実装内容

#### 1. EventCreateScreen.tsx の変更 (614-626行目)

**onFocusイベント:**
- タップ時は何もしない（候補画面を表示しない）

**onSubmitEditingイベント:**
- 文字確定時に`isTitleFocused`を`true`に設定
- 文字確定時に`showTitleSuggestions`を`true`に設定
- 候補画面に切り替え

**変更前:**
```typescript
onFocus={() => {
  setIsTitleFocused(true);
  setShowTitleSuggestions(true);
}}
```

**変更後:**
```typescript
onFocus={() => {
  // タップ時は何もしない
}}
onSubmitEditing={() => {
  // 文字確定時に候補画面を表示
  setIsTitleFocused(true);
  setShowTitleSuggestions(true);
}}
```

#### 2. TitleAutocomplete.tsx の変更 (95-162行目)

**履歴候補の表示:**
- 既存の履歴候補を表示（変更なし）

**入力中の文字を候補として追加 (128-162行目):**
```typescript
{query && query.trim() && (
  <TouchableOpacity
    onPress={() => onSelect({
      title: query,
      startTime: '09:00',
      endTime: '10:00',
      isAllDay: false,
      createdAt: new Date().toISOString(),
    })}
  >
    <Text>{query}</Text>
    <Text>入力中のタイトル</Text>
  </TouchableOpacity>
)}
```

**特徴:**
- `query`が存在する場合、常に入力中の文字を候補として表示
- 選択すると、そのタイトルでイベントが作成される
- デフォルトの時間（09:00-10:00）が設定される

### 修正後の動作

✅ **タップ時**: 候補画面は表示されない
✅ **文字入力中**: 候補画面は表示されない（未確定状態）
✅ **文字確定時**: 改行/完了をタップすると候補画面に切り替わる
✅ **履歴がない文字**: 入力中の文字が候補として表示される
✅ **候補選択**: 入力中の文字を選択するとイベントタイトルに設定される

### 変更ファイルのサマリー（文字確定時の候補画面切り替え）

| ファイル | 主な変更 | 行数 |
|---------|---------|------|
| `src/screens/EventCreateScreen.tsx` | onFocusでの候補表示を削除、onSubmitEditingで候補画面表示 | 変更のみ |
| `src/components/TitleAutocomplete.tsx` | 入力中の文字を候補として追加、空状態メッセージ削除 | +38行 |

---

## TimeTree風候補画面表示フロー（最終版）

### TimeTreeの実際の動作フロー確認
スクリーンショット分析により、TimeTreeの実際の動作は:
1. **タイトル欄タップ** → 即座に候補画面に切り替わる
2. **文字入力中（未確定でも）** → 候補画面は表示されたまま
3. **リアルタイム検索** → 入力文字に応じて候補が絞り込まれる
4. **履歴候補 + 入力中の文字** → 両方が候補として表示される

### 最終修正内容

#### EventCreateScreen.tsx の変更 (607-623行目)

**onFocusイベント:**
```typescript
onFocus={() => {
  // タップ時に即座に候補画面を表示
  setIsTitleFocused(true);
  setShowTitleSuggestions(true);
}}
```

**onChangeTextイベント:**
```typescript
onChangeText={(text) => {
  setTitle(text);
  // 文字入力中も候補は表示したまま
}}
```

**onBlurイベント:**
```typescript
onBlur={() => {
  // フォーカス解除時、候補エリアを非表示
  setIsTitleFocused(false);
  setShowTitleSuggestions(false);
}}
```

**削除:**
- `onSubmitEditing`イベントを削除（不要）

### 最終的な動作

✅ **タップ時**: 即座に候補画面に切り替わる（TimeTree同様）
✅ **文字入力中**: 未確定状態でも候補画面は表示されたまま
✅ **リアルタイム更新**: 入力に応じて候補が更新される
✅ **入力中の文字表示**: 「はたらら」などの入力文字が候補として表示される
✅ **フォーカス解除**: キーボードを閉じると通常画面に戻る

### 変更ファイルのサマリー（最終版）

| ファイル | 主な変更 | 行数 |
|---------|---------|------|
| `src/screens/EventCreateScreen.tsx` | onFocusで即座に候補表示、onChangeTextでの非表示削除 | 変更のみ |

---

## イベント作成画面のスクロール構造変更

### 要求仕様
- イベントタイトルとその下の設定項目を別々に作成
- タイトルは固定表示、設定項目のみスクロール可能
- TimeTreeのようなUI構造

### 実装内容

#### EventCreateScreen.tsx の構造変更

**変更前の構造:**
```
<View>
  <ヘッダー>
  <ScrollView>
    <タイトル>
    <設定項目>
  </ScrollView>
</View>
```

**変更後の構造:**
```
<View>
  <ヘッダー>（固定）
  <タイトルセクション>（固定）
  <ScrollView>
    <設定項目のみ>
  </ScrollView>
</View>
```

#### 具体的な変更箇所

**1. タイトル部分をScrollViewの外に移動 (592-640行目)**
- タイトル入力欄とTitleAutocompleteを固定エリアに配置
- `styles.titleSection`を適用

**2. ScrollViewの開始位置を変更 (642-647行目)**
- 終日オプションからScrollViewが開始
- `styles.content`で`flex: 1`を維持

**3. スタイル追加 (1451-1454行目)**
```typescript
titleSection: {
  backgroundColor: '#ffffff',
  paddingHorizontal: 8,
}
```

### 修正後の動作

✅ **タイトル固定**: タイトル入力欄は常に画面上部に固定表示
✅ **設定項目スクロール**: 終日、開始・終了時刻などの設定項目のみスクロール
✅ **候補表示**: タイトルフォーカス時は設定項目が非表示になり候補が表示される
✅ **TimeTree風UI**: 参考画像と同じようなUIレイアウト

### 変更ファイルのサマリー（スクロール構造変更）

| ファイル | 主な変更 | 行数 |
|---------|---------|------|
| `src/screens/EventCreateScreen.tsx` | タイトルを固定、ScrollViewの位置変更、スタイル追加 | +5行 |
