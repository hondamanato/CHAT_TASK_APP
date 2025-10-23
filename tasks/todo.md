# シフト確認方式変更: ボトムシート → チャット内確認 (2025-10-22)

## 概要
シフト抽出後の確認方式を、ボトムシート表示からチャット内での確認に変更しました。

## 問題
- ボトムシート（ShiftConfirmationSheet）で確認していたが、よりシンプルにチャット内で完結させたい
- 信頼度などの詳細情報は不要で、年月日と時間帯のみ表示したい

## 変更内容

### `/Users/hondamanato/Chat_task_App/src/components/ChatScreen.tsx`

**1. Import削除（28行目）**:
```typescript
// 削除
import { ShiftConfirmationSheet, type ShiftData } from './ShiftConfirmationSheet';
```

**2. State変更（52-55行目）**:
```typescript
// 変更前
const [showShiftConfirmation, setShowShiftConfirmation] = useState(false);
const [analyzedShifts, setAnalyzedShifts] = useState<ShiftData[]>([]);

// 変更後
const [analyzedShifts, setAnalyzedShifts] = useState<ShiftEntry[]>([]);
const [waitingForShiftConfirmation, setWaitingForShiftConfirmation] = useState(false);
```

**3. シフト解析完了時の処理変更（545-565行目）**:
```typescript
// シフトをチャットメッセージとして表示
setAnalyzedShifts(result.shifts);
setWaitingForShiftConfirmation(true);

// シフトリストをフォーマット
const shiftList = result.shifts.map((shift, index) => {
  const date = new Date(shift.date);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${index + 1}. ${shift.date} (${weekday}) ${shift.startTime}-${shift.endTime}`;
}).join('\n');

const shiftsMessage: Message = {
  id: (Date.now() + 1).toString(),
  text: `シフトを${result.shifts.length}件見つけました:\n\n${shiftList}\n\nカレンダーに追加しますか？`,
  isUser: false,
  timestamp: new Date(),
};
setMessages(prev => [...prev, shiftsMessage]);
```

**4. 確認待ち状態の処理追加（224-290行目）**:
```typescript
// シフト確認待ち状態の場合、カレンダー登録を実行
if (waitingForShiftConfirmation && analyzedShifts.length > 0) {
  // 肯定的な返答パターン
  const affirmativePatterns = [
    /はい/, /うん/, /ok/i, /おk/, /追加/, /お願い/, /登録/,
    /いいよ/, /大丈夫/, /yes/i,
  ];

  const isAffirmative = affirmativePatterns.some(pattern => pattern.test(messageText));

  if (isAffirmative) {
    // カレンダーに登録
    analyzedShifts.forEach(shift => {
      const eventData = shiftAnalysisService.convertShiftToEventData(shift);
      onEventCreate(eventData);
    });
    // 成功メッセージ表示
  } else {
    // キャンセルメッセージ表示
  }
}
```

**5. 不要な関数とJSXを削除**:
- `handleShiftConfirm`関数を削除（706-733行目）
- `<ShiftConfirmationSheet>`コンポーネント使用箇所を削除（800-806行目）

## 表示フォーマット

```
シフトを3件見つけました:

1. 2025-10-01 (水) 11:00-18:00
2. 2025-10-02 (木) 11:00-16:00
3. 2025-10-06 (月) 11:00-18:00

カレンダーに追加しますか？
```

- 年月日と時間帯のみ表示
- 信頼度、勤務地、名前などは非表示
- シンプルで読みやすい形式

## ユーザー操作フロー

1. 画像を送信
2. 名前を入力（例: 「本多真翔です」）
3. AIがシフトを抽出してチャットに表示
4. 「はい」「追加」などと返信
5. カレンダーに登録完了

## メリット

- UI/UXがシンプルになる
- チャットの流れが自然
- ボトムシートの開閉が不要
- すべてチャット内で完結

---

# シフト抽出精度向上: 名前フィルタリング厳格化 (2025-10-22)

## 概要
Edge Function (analyze-shift-gpt4o) のプロンプトを改善し、指定された名前のシフトのみを正確に抽出できるようにしました。

## 問題
- 「本多」のシフトを抽出する際、他の従業員（吉村、伊都志、秀平、米津など）のシフトも誤って抽出されていた

## 解決策
表の構造を制限せず、名前フィルタリングを厳格化するアプローチを採用

## 変更内容

### `/Users/hondamanato/Chat_task_App/supabase/functions/analyze-shift-gpt4o/index.ts`

**プロンプトの改善（84-142行目）**:

1. **4ステップ解析プロセスを追加**:
   - Step 1: シフト表内のすべての従業員名をリストアップ
   - Step 2: ユーザー名に最も一致する名前を特定
   - Step 3: その名前のシフト情報のみを抽出
   - Step 4: 他の従業員のシフトが混入していないか再確認

2. **名前マッチングの優先順位を明示**:
   - 完全一致 > 姓一致 > 名一致 > 表記ゆれ対応
   - 優先順位に従って最も適切な名前を選択

3. **厳格な除外ルールを追加**:
   - 具体例を記載（「本多」を探す場合、「吉村」「伊都志」などは絶対に含めない）
   - ⚠️マークで視覚的に強調

4. **信頼度スコアの基準を再定義**:
   - 0.9-1.0: 名前が完全一致し、日時が明確
   - 0.7-0.9: 名前が姓/名一致し、日時が明確
   - 0.5-0.7: 名前の表記ゆれがあるが、日時は明確
   - 0.5未満: 除外

5. **matchedNameの厳格化**:
   - 「必ず${userName}に一致すること」を明示
   - 最後にも再度注意喚起

## デプロイ
```bash
supabase functions deploy analyze-shift-gpt4o
```
✅ デプロイ完了

## 期待される結果
- 様々な形式のシフト表に対応しつつ、指定した名前のシフトのみを正確に抽出
- 他の従業員のシフトが混入しない

## テスト方法
1. TestFlightで新しいビルドをテスト
2. 複数の従業員が記載されたシフト表の画像を送信
3. 「本多真翔です」と名前を入力
4. 「本多」列/行のシフトのみが抽出されることを確認

---

# 14言語のロケールファイルにチャット関連キーを追加 (2025-10-22)

## 概要
ja.jsonとen.jsonに追加された19個のシフト解析関連キーを、残りの14言語のロケールファイルのchatセクションに追加します。

## ソース
- `/Users/hondamanato/Chat_task_App/src/locales/ja.json` (lines 251-270)
- `/Users/hondamanato/Chat_task_App/src/locales/en.json` (lines 247-266)

## 追加するキー（19個）
1. attachImage
2. analyzingShift
3. enterYourName
4. shiftNameDescription
5. namePlaceholder
6. nameHistory
7. analyzeShift
8. shiftsFound
9. noShiftsFound
10. shiftAnalysisError
11. confirmShifts
12. confirmShiftsSubtitle
13. addToCalendar
14. selectedShifts
15. shiftsAdded
16. confidenceHigh
17. confidenceMedium
18. confidenceLow
19. imagePermissionMessage
20. imagePickError

## 作業計画

### 各言語のロケールファイルのchatセクションに追加

- [ ] 1. ar.json - アラビア語に翻訳（20キー）
- [ ] 2. de.json - ドイツ語に翻訳（20キー）
- [ ] 3. es.json - スペイン語に翻訳（20キー）
- [ ] 4. fr.json - フランス語に翻訳（20キー）
- [ ] 5. hi.json - ヒンディー語に翻訳（20キー）
- [ ] 6. id.json - インドネシア語に翻訳（20キー）
- [ ] 7. it.json - イタリア語に翻訳（20キー）
- [ ] 8. ko.json - 韓国語に翻訳（20キー）
- [ ] 9. pt.json - ポルトガル語に翻訳（20キー）
- [ ] 10. ru.json - ロシア語に翻訳（20キー）
- [ ] 11. th.json - タイ語に翻訳（20キー）
- [ ] 12. vi.json - ベトナム語に翻訳（20キー）
- [ ] 13. zh-CN.json - 簡体字中国語に翻訳（20キー）
- [ ] 14. zh-TW.json - 繁体字中国語に翻訳（20キー）

### 検証
- [ ] すべてのファイルが正しいJSON形式か確認
- [ ] 各ファイルに20キーすべてが含まれているか確認

## 実装の詳細
- 各ロケールファイルのchatセクション内で、"enterMessage"キーの後に新しいキーを追加
- ja.jsonとen.jsonの内容を参考に各言語に適切に翻訳
- 有効なJSON構文を維持（カンマ、引用符など）
- {{count}}や{{name}}などのプレースホルダーは保持

## 期待される成果
- 20キー × 14言語 = 280個の翻訳エントリーを追加
- 全16ファイル(ja.json、en.json含む)で統一されたchat構造を維持
- シフト解析機能の多言語対応が完了

## レビュー
（作業完了後に記載）

---

# AIチャット画像解析機能の修正 (2025-10-22)

## 概要
画像解析によるシフト予定作成機能で、名前抽出が失敗していた問題を修正しました。
ユーザー名が指定されない場合は、全員分のシフトを抽出するのではなく、名前入力を促すように変更しました。

## 問題点
1. ❌ 名前抽出ロジックが「名前は本多真翔」や「本多真翔です」などのパターンに対応していなかった
2. ❌ Edge Functionが空のuserNameを受け付けてしまっていた
3. ❌ 名前が空の場合、全員分のシフトを抽出する設計だったが、ユーザーは名前入力を促す動作を期待していた

## 修正内容

### 1. ChatScreen.tsx (src/components/ChatScreen.tsx)
#### 修正箇所1: 名前抽出ロジックの強化 (519-542行)
- 追加パターン:
  - `/([^\s、。！？]+)です$/` - "本多真翔です"に対応
  - `/私は([^\s、。！？]+)/` - "私は本多真翔"に対応
  - `/([^\s、。！？]+)と申します/` - "本多真翔と申します"に対応
- デバッグログを追加して抽出過程を可視化

#### 修正箇所2: 画像送信時の処理変更 (156-172行)
- 名前が抽出できない場合、名前入力モーダル(`ShiftNameInputModal`)を自動表示
- 名前が抽出できた場合のみシフト解析を実行

#### 修正箇所3: handleShiftAnalysis関数の修正 (468-519行)
- `userName`パラメータを`string | null`から`string`に変更（必須化）
- 空文字列を許可するロジックを削除
- 全員分抽出に関するメッセージを削除

### 2. analyze-shift-table/index.ts (supabase/functions/analyze-shift-table/index.ts)
#### 修正箇所1: バリデーション強化 (47-68行)
- `userName`が空文字列の場合もエラーを返すように修正
- エラーメッセージを明確化（日本語メッセージ追加）

#### 修正箇所2: GPTプロンプトの改善 (132-146行)
- ユーザー名が必須であることを明記
- 他の人のシフトを含めない指示を強調

## 動作フロー（修正後）

```
[パターン1: 名前を含むメッセージ + 画像]
画像添付 + "バイトシフト予定を作成して。本多真翔です"
  ↓
名前抽出成功: "本多真翔"
  ↓
シフト解析実行
  ↓
確認画面表示

[パターン2: 名前なし + 画像]
画像添付 + "バイトシフト予定を作成して"
  ↓
名前抽出失敗
  ↓
名前入力モーダル表示
  ↓
ユーザーが名前入力
  ↓
シフト解析実行
  ↓
確認画面表示

[パターン3: 画像のみ]
画像添付のみ
  ↓
名前抽出失敗
  ↓
名前入力モーダル表示
  ↓
ユーザーが名前入力
  ↓
シフト解析実行
  ↓
確認画面表示
```

## 変更ファイル
- `src/components/ChatScreen.tsx` (約35行の修正)
- `supabase/functions/analyze-shift-table/index.ts` (約25行の修正)

## テスト項目
- [ ] 「名前は本多真翔」というメッセージで名前抽出成功
- [ ] 「本多真翔です」というメッセージで名前抽出成功
- [ ] 名前なしで画像送信時、名前入力モーダルが表示される
- [ ] 名前入力後、正常にシフト解析が実行される
- [ ] Edge Functionが空のuserNameを拒否する

## 注意事項
- Edge Functionの変更をデプロイする必要があります
- `supabase functions deploy analyze-shift-table` でデプロイしてください

---

# UIフリーズ問題の修正 (2025-10-22)

## 概要
画像送信時にUIがフリーズする問題を修正しました。テキスト入力欄がタップできず、×ボタンしか押せない状態になっていました。

## 問題点
1. ❌ 画像処理時に`isLoading`状態が解除されない
2. ❌ `handleShiftAnalysis`でエラーが発生した場合、UIが永久にフリーズ
3. ❌ `sendMessage`関数内で`return`しているため、`finally`ブロックに到達しない

## 修正内容

### ChatScreen.tsx (170-178行)
画像処理部分をtry-catch-finallyで囲み、確実に`isLoading`を解除:

```typescript
// シフト解析を実行（エラー時も確実にローディング解除）
try {
  await handleShiftAnalysis(currentImageUri, messageText, userName);
} catch (error) {
  console.error('シフト解析でエラーが発生しました:', error);
} finally {
  setIsLoading(false);  // ← 確実に実行される
}
```

### ChatScreen.tsx (514-526行)
`handleShiftAnalysis`内の`finally`ブロックを削除し、エラーを再スローするように変更:

```typescript
} catch (error) {
  console.error('シフト解析エラー:', error);
  const errorMessage: Message = { ... };
  setMessages(prev => [...prev, errorMessage]);
  throw error;  // ← 呼び出し元でキャッチさせる
}
```

## 修正後の動作
1. 画像送信時、エラーが発生しても確実に`isLoading`が解除される
2. UIがフリーズせず、再度操作が可能
3. エラーメッセージがチャットに表示される

## 変更ファイル
- `src/components/ChatScreen.tsx` (約15行の修正)

---

# シフト表解析をGPT-4o Vision APIに切り替え (2025-10-22)

## 概要
Google Cloud Vision API + Edge Functionの構成から、GPT-4o Vision APIのみを使用するシンプルな構成に変更しました。

## 変更理由
1. ❌ Edge Functionでエラーが発生していた
2. ❌ デバッグが困難（ログが見えない）
3. ❌ Google Cloud Vision APIの設定が複雑
4. ✅ GPT-4oは画像解析（Vision）機能を持っている
5. ✅ OCR + 意味理解を一度に実行可能
6. ✅ すでにOpenAI APIキーがある

## 新しい構成

### Before (旧構成)
```
ChatScreen → shiftAnalysisService → supabaseEdgeService
  → Edge Function (analyze-shift-table)
    → Google Cloud Vision API (OCR)
    → GPT-4o mini (意味理解)
  → 結果を返す
```

### After (新構成)
```
ChatScreen → shiftAnalysisService
  → GPT-4o Vision API (OCR + 意味理解)
  → 結果を返す
```

## 修正内容

### shiftAnalysisService.ts (完全書き換え)
**変更点:**
1. Supabase Edge Function呼び出しを削除
2. GPT-4o Vision APIを直接呼び出す実装に変更
3. `Config.OPENAI_API_KEY`を使用
4. 画像をBase64エンコードしてAPIに送信
5. プロンプトで以下を指示:
   - 名前フィルタリング（表記ゆれ対応）
   - 日時抽出（YYYY-MM-DD、HH:MM形式）
   - 信頼度スコア付与（0-1）
   - JSON形式で返却

**使用モデル:**
- `gpt-4o` (Vision対応)
- 高精度なOCRと意味理解
- コスト: 約0.4-0.7円/回

**主な実装:**
```typescript
const requestBody = {
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` }}
    ]
  }],
  max_tokens: 2000,
  temperature: 0.1,
  response_format: { type: 'json_object' }
};
```

## メリット
1. ✅ **デプロイ不要** - Edge Functionをデプロイする必要がない
2. ✅ **デバッグ簡単** - クライアント側でログ確認可能
3. ✅ **高精度** - GPT-4oのVision機能は非常に高精度
4. ✅ **シンプル** - APIキー1つで動作（OPENAI_API_KEY）
5. ✅ **コスト明確** - OpenAIの料金のみ（約56円/100回）

## 使用しなくなったファイル（削除不要）
- `supabase/functions/analyze-shift-table/index.ts` - Edge Function
- Google Cloud Vision APIの設定

## 必要な環境変数
- `.env`に`OPENAI_API_KEY`が設定されていること（すでに設定済み）

## テスト項目
- [ ] シフト表画像を送信して解析が実行される
- [ ] 「本多真翔」の名前が正しく抽出される
- [ ] シフト情報がJSON形式で返却される
- [ ] 確認画面が表示される
- [ ] カレンダーに予定が追加される

## 変更ファイル
- `src/services/shiftAnalysisService.ts` (230行、完全書き換え)

---

# Supabase Edge Function経由に変更 (2025-10-22)

## 概要
セキュリティ向上のため、OpenAI APIキーをクライアントから分離し、Supabase Edge Function経由で呼び出す構成に変更しました。

## 変更理由
1. 🔐 **セキュリティ** - APIキーがクライアントアプリに露出しない
2. 📊 **使用量制御** - サーバー側でRate Limitingが可能
3. 👁️ **モニタリング** - 異常な使用を検知・制御できる
4. ✅ **本番環境で安全** - アプリ公開時も安心

## アーキテクチャの変化

### Before (直接呼び出し)
```
ChatScreen
  ↓
shiftAnalysisService
  ↓
OpenAI GPT-4o Vision API (直接)
  ↑ (.envのAPIキーを使用)
```

### After (Edge Function経由)
```
ChatScreen
  ↓
shiftAnalysisService
  ↓
supabaseEdgeService
  ↓
Supabase Edge Function (analyze-shift-gpt4o)
  ↓
OpenAI GPT-4o Vision API
  ↑ (Supabase環境変数のAPIキーを使用)
```

## 作成・変更ファイル

### 1. 新規作成
**`supabase/functions/analyze-shift-gpt4o/index.ts`** (231行)
- GPT-4o Vision APIを呼び出すEdge Function
- 環境変数からOPENAI_API_KEYを取得
- パラメータバリデーション
- エラーハンドリング
- CORS対応

### 2. 完全書き換え
**`src/services/shiftAnalysisService.ts`** (104行)
- 直接API呼び出しを削除
- supabaseEdgeService経由に変更
- コード量が半分以下に削減（230行→104行）

### 3. ドキュメント作成
**`SHIFT_ANALYSIS_SETUP.md`** (180行)
- デプロイ手順
- 環境変数設定方法
- トラブルシューティング
- コスト管理情報

## デプロイ手順（重要）

### 1. Supabaseにログイン
```bash
supabase login
```

### 2. プロジェクトにリンク
```bash
supabase link --project-ref gfrwnonfqchtmgyddbht
```

### 3. 環境変数を設定
```bash
supabase secrets set OPENAI_API_KEY="sk-proj-..."
```

### 4. Edge Functionをデプロイ
```bash
supabase functions deploy analyze-shift-gpt4o
```

### 5. 動作確認
アプリでシフト表画像解析をテスト

## セキュリティの改善点

| 項目 | Before | After |
|------|--------|-------|
| APIキーの場所 | クライアント(.env) | サーバー(Supabase) |
| 露出リスク | ❌ 高い（デコンパイル可能） | ✅ なし |
| 使用量制御 | ❌ 不可能 | ✅ 可能 |
| モニタリング | ❌ 困難 | ✅ 簡単（ログ確認可能） |
| Rate Limiting | ❌ なし | ✅ 実装可能 |

## コスト（変更なし）
- 1回あたり: 約$0.003-0.005 (0.4-0.7円)
- 100回/月: 約$0.40 (56円)
- 1,000回/月: 約$4.00 (560円)

## テスト項目
- [ ] Edge Functionが正常にデプロイされる
- [ ] 環境変数が正しく設定される
- [ ] シフト表画像解析が動作する
- [ ] エラー時にログが確認できる

## 次のステップ
1. `SHIFT_ANALYSIS_SETUP.md`の手順に従ってデプロイ
2. アプリで動作確認
3. ログでエラーがないか確認

---

# 「はい」と返信してもシフトがカレンダーに追加されない問題の修正 (2025-10-23)

## 概要
AIチャットでシフト解析後、「カレンダーに追加しますか？」に「はい」と返信しても、実際には追加されず、Gemini AIが「承知いたしました！...」と返信するだけで処理が完了しない問題を修正しました。

## 問題点
1. ❌ 「はい」と返信した際、シフト確認待ち状態の判定が**FALSE**になり、処理が実行されない
2. ❌ `waitingForShiftConfirmation`と`analyzedShifts`がAsyncStorageに保存されていないため、画面を閉じると失われる
3. ❌ デバッグログが不足しており、どこで問題が発生しているか確認できない
4. ❌ Gemini AIが「はい」を処理してしまい、実際のカレンダー登録処理に到達しない

## 修正内容（第2弾）

### src/components/ChatScreen.tsx の修正

**1. デバッグログの大幅強化 (200-210行, 299-324行)**

sendMessage関数の開始時に詳細な状態をログ出力:
```typescript
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📨 sendMessage開始:', {
  messageText,
  hasImage: !!imageUri,
  waitingForShiftConfirmation,
  analyzedShiftsCount: analyzedShifts.length,
  waitingForName,
  hasPendingImage: !!pendingShiftImageUri
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
```

シフト確認待ち判定の詳細ログ:
```typescript
console.log('🔍 シフト確認待ち判定:', {
  waitingForShiftConfirmation,
  analyzedShiftsLength: analyzedShifts.length,
  condition: waitingForShiftConfirmation && analyzedShifts.length > 0
});
```

**2. シフト状態の永続化 (85-92行, 118-134行)**

AsyncStorageにシフト状態を保存:
```typescript
// 保存
useEffect(() => {
  const saveShiftState = async () => {
    const shiftState = {
      waitingForShiftConfirmation,
      analyzedShifts
    };
    await AsyncStorage.setItem('@shift_state', JSON.stringify(shiftState));
    console.log('💾 シフト状態を保存:', shiftState);
  };
  saveShiftState();
}, [waitingForShiftConfirmation, analyzedShifts]);

// 復元
const storedShiftState = await AsyncStorage.getItem('@shift_state');
if (storedShiftState) {
  const shiftState = JSON.parse(storedShiftState);
  console.log('🔄 シフト状態を復元:', shiftState);
  setWaitingForShiftConfirmation(shiftState.waitingForShiftConfirmation || false);
  setAnalyzedShifts(shiftState.analyzedShifts || []);
}
```

**3. 状態クリアの確実化 (393-396行, 403行)**

シフト登録完了後、AsyncStorageからも削除:
```typescript
console.log('🧹 シフト状態をクリア');
setAnalyzedShifts([]);
await AsyncStorage.removeItem('@shift_state');
```

**4. else句の追加 (415-417行)**

シフト確認待ち状態でない場合の明示的なログ:
```typescript
} else {
  console.log('❌ シフト確認待ち状態ではありません。通常のAI処理に進みます。');
}
```

## 修正内容（第1弾: キャッシュ再読み込み）

### app/(tabs)/index.tsx の `handleEventCreateFromChat` 関数を修正 (254-311行)

**変更前の問題点:**
```typescript
// シフト予定（単発予定）の場合は現在月のみ再読み込み
console.log('🔄 単発予定: 現在月を再読み込み');
await loadMonthlyEvents(currentMonth.getFullYear(), currentMonth.getMonth(), true);
```
- 現在表示中の月のみを再読み込みしていた
- シフトの日付が10月25日で、現在10月1日を見ている場合、キャッシュが正しく更新されない可能性があった

**変更後の改善:**
```typescript
// シフト予定（単発予定）の場合は該当する月を特定して再読み込み
console.log('🔄 単発予定: 該当する月を特定して再読み込み');

// イベントの日付から年月を抽出
const eventDate = new Date(eventData.date);
const eventYear = eventDate.getFullYear();
const eventMonth = eventDate.getMonth();

console.log(`📅 予定の年月: ${eventYear}年${eventMonth + 1}月 (日付: ${eventData.date})`);

// 該当する月のキャッシュを再読み込み
await loadMonthlyEvents(eventYear, eventMonth, true);
console.log(`✅ ${eventYear}年${eventMonth + 1}月のキャッシュを再読み込み完了`);

// 現在表示中の月も再読み込み（該当月と異なる場合）
const currentYear = currentMonth.getFullYear();
const currentMonthIndex = currentMonth.getMonth();

if (eventYear !== currentYear || eventMonth !== currentMonthIndex) {
  console.log(`🔄 現在表示中の月(${currentYear}年${currentMonthIndex + 1}月)も再読み込み`);
  await loadMonthlyEvents(currentYear, currentMonthIndex, true);
}
```

**改善点:**
1. ✅ イベントの日付から正確に年月を抽出
2. ✅ 該当する月のキャッシュを強制再読み込み
3. ✅ 現在表示中の月も必要に応じて再読み込み
4. ✅ 詳細なデバッグログで動作を追跡可能

## 期待される結果（第2弾）
- ✅ 「はい」と返信すれば確実にシフトがカレンダーに追加される
- ✅ 画面を閉じてもシフト状態が保持される
- ✅ デバッグログで正確な原因を特定可能
- ✅ Gemini AIが誤って応答しても、正しくシフト登録処理が実行される

## 期待される結果（第1弾）
- ✅ シフトがどの月にあっても、正しくカレンダーに表示される
- ✅ 10月1日〜10月31日のすべての日付でシフトが表示される
- ✅ ログでどの月が再読み込みされたか確認できる

## レビュー

### 修正の全体像
この問題は2段階で修正しました:

**第1弾: キャッシュ再読み込みの問題**
- **根本原因:** 現在月のみを再読み込みしていたため、シフトの日付が含まれる月のキャッシュが更新されていなかった
- **解決策:** イベントの日付から該当する月を特定し、その月のキャッシュを強制再読み込み

**第2弾: シフト確認待ち状態の問題 (本修正)**
- **根本原因:** `waitingForShiftConfirmation`と`analyzedShifts`がAsyncStorageに保存されていないため、何らかの理由で状態が失われていた
- **解決策:** シフト状態をAsyncStorageに永続化し、画面を開いた際に復元
- **追加改善:** デバッグログを大幅に強化し、問題の特定を容易に

### テスト手順
1. AIチャットでシフト表画像を送信
2. 「本多真翔です」と名前を入力
3. シフトが抽出されたら「はい」と返信
4. コンソールログで以下を確認:
   ```
   📨 sendMessage開始: { messageText: 'はい', ... waitingForShiftConfirmation: true, analyzedShiftsCount: 10 }
   🔍 シフト確認待ち判定: { waitingForShiftConfirmation: true, analyzedShiftsLength: 10, condition: true }
   ✅ シフト確認待ち状態: ユーザーの返信を確認
   📋 保存されているシフト: [...]
   🔍 肯定的な返答パターンマッチ: true メッセージ: はい
   ✅ 肯定的な返答: カレンダーに登録します
   📅 onEventCreateが存在します。シフトを登録開始: 10 件
   📝 シフト 1/10 変換完了: ...
   ✅ シフト 1/10 登録成功
   ...
   🎉 シフト登録完了: 10 / 10 件
   🧹 シフト状態をクリア
   ```
5. カレンダーでオレンジ色の「勤務」予定が10件表示されることを確認

### 変更ファイル
- `src/components/ChatScreen.tsx` (約60行の修正・追加)
- `app/(tabs)/index.tsx` (第1弾: 約25行の修正)

### 影響範囲
- シフト確認機能全体に影響
- 画面の開閉によって状態が失われなくなる
- デバッグが容易になる
- 他のAI機能には影響なし

---

# OpenCV画像前処理機能の追加（スケルトン実装）(2025-10-23)

## 概要
シフト表画像のOCR精度を向上させるため、OpenCV.jsによる画像前処理機能の基盤を実装しました。

## 実装内容

### 1. 新規ファイル作成

#### `supabase/functions/analyze-shift-gpt4o/imagePreprocessor.ts`
OpenCV前処理モジュール（スケルトン実装）:
- `preprocessImageForOCR()` - 画像前処理のメイン関数
- `evaluateImageQuality()` - 画像品質評価関数（将来用）
- 詳細なコメントで本格実装時の処理内容を記載

**計画されている処理パイプライン:**
1. グレースケール変換
2. CLAHE（コントラスト制限付き適応ヒストグラム均等化）
3. ガウシアンぼかし（ノイズ除去）
4. 二値化（Otsu's method）
5. モルフォロジー変換
6. シャープ化
7. 傾き補正（オプション）

#### `supabase/functions/analyze-shift-gpt4o/deno.json`
Deno設定ファイル:
- タスク定義
- インポートマップ
- コンパイラオプション

### 2. 修正ファイル

#### `supabase/functions/analyze-shift-gpt4o/index.ts`
- `imagePreprocessor.ts`をインポート
- 画像前処理を呼び出すコード追加（76-82行）
- 前処理された画像をGPT-4oに送信（168行）

#### `SHIFT_ANALYSIS_SETUP.md`
- 使用技術にOpenCVを追加
- 画像前処理セクションを追加（93-121行）
  - OpenCV前処理の効果説明
  - 期待される効果
  - 現在の実装状況と将来の実装手順

## 現在の状態

### ✅ 完了
- OpenCV前処理の基盤コード作成
- Edge Functionへの統合
- ドキュメント更新

### ⚠️ 保留（将来実装）
- OpenCV.js WASMのDeno環境への統合
- 実際の画像処理ロジックの実装
- 傾き補正の実装

### 💡 現在の動作
- `imagePreprocessor.ts`は呼び出されるが、実際の処理はスキップ
- 画像は未処理のままGPT-4oに送信される
- フォールバック機能として正常に動作

## 期待される効果（本格実装後）
- ✅ OCR精度が30-50%向上
- ✅ 低品質・斜め・ノイズのある画像に対応
- ✅ 罫線・背景ノイズを自動除去
- ✅ 処理時間: +500ms程度

## 次のステップ

**Phase 1: OpenCV.js WASMの統合（優先度: 中）**
1. Deno環境でOpenCV.js WASMを読み込む方法を調査
2. CDN経由またはnpmパッケージとして統合
3. Base64 ⇔ Mat変換の実装

**Phase 2: 画像処理ロジックの実装（優先度: 中）**
1. `imagePreprocessor.ts`のTODOコメントを実装
2. 各処理ステップをテスト
3. パラメータチューニング

**Phase 3: デプロイとテスト（優先度: 高）**
1. ローカルでテスト（`supabase functions serve`）
2. 本番環境にデプロイ
3. 実機でシフト表画像を送信して精度を確認

## 変更ファイル
- `supabase/functions/analyze-shift-gpt4o/imagePreprocessor.ts`（新規作成、170行）
- `supabase/functions/analyze-shift-gpt4o/index.ts`（修正、3箇所）
- `supabase/functions/analyze-shift-gpt4o/deno.json`（新規作成、12行）
- `SHIFT_ANALYSIS_SETUP.md`（修正、セクション追加）

## 注意事項
- 現時点では前処理は実行されません（スケルトン実装）
- デプロイしても既存機能には影響なし
- OpenCV.js WASM統合後に本格的な効果が発揮される

---

# 名前入力をチャット形式に変更 (2025-10-22)

## 概要
名前入力モーダルを廃止し、AIがチャットで名前を聞く方式に変更しました。

## 変更理由
1. ❌ モーダルを閉じた後に`selectedImageUri`が`null`になる問題
2. ✅ より自然な会話フロー
3. ✅ コードがシンプルになる

## 新しいフロー

### Before（モーダル方式）
```
画像送信（名前なし）
  ↓
名前入力モーダル表示
  ↓
名前入力
  ↓
シフト解析開始
```

### After（チャット方式）
```
画像送信（名前なし）
  ↓
AI: 「お名前を教えてください」
  ↓
ユーザー: 「本多真翔です」
  ↓
シフト解析開始
```

## 修正内容

### 1. 状態管理の追加 (ChatScreen.tsx:60-61)
```typescript
const [pendingShiftImageUri, setPendingShiftImageUri] = useState<string | null>(null);
const [waitingForName, setWaitingForName] = useState(false);
```

### 2. sendMessage関数の修正 (ChatScreen.tsx:165-224)
- 画像送信時、名前がない場合:
  - 画像URIを`pendingShiftImageUri`に保存
  - `waitingForName = true`に設定
  - AIメッセージ「お名前を教えてください」を表示

- 名前待ち状態で通常メッセージ受信時:
  - 名前を抽出
  - 抽出成功 → シフト解析実行
  - 抽出失敗 → 再度「お名前を教えてください」

### 3. 削除したコード
- `ShiftNameInputModal` import (29行目)
- `showNameInputModal` state (55行目)
- `handleNameSubmit` 関数 (586-631行目、削除)
- `<ShiftNameInputModal>` コンポーネント (816-823行目、削除)

## 使用例

### ケース1: 画像+名前を同時に送信
```
ユーザー: [画像] + 「シフト予定を作成して。本多真翔です」
  ↓
AI: 「シフト表を解析しています...」
  ↓
AI: 「○件のシフトが見つかりました」
```

### ケース2: 画像のみ送信
```
ユーザー: [画像] + 「シフト予定を作成して」
  ↓
AI: 「お名前を教えてください。例: 「本多真翔です」「名前は本多真翔」」
  ↓
ユーザー: 「本多真翔です」
  ↓
AI: 「シフト表を解析しています...」
  ↓
AI: 「○件のシフトが見つかりました」
```

### ケース3: 名前の再入力
```
ユーザー: 「シフト」（名前が抽出できない）
  ↓
AI: 「お名前が確認できませんでした。もう一度お名前を教えてください。例: 「本多真翔です」」
  ↓
ユーザー: 「本多真翔」
  ↓
AI: 「シフト表を解析しています...」
```

## 変更ファイル
- `src/components/ChatScreen.tsx` (約60行の修正・削除)

## メリット
- ✅ モーダル不要、すべてチャット内で完結
- ✅ より自然な会話フロー
- ✅ 画像URIの保持が確実
- ✅ コードがシンプルになる
