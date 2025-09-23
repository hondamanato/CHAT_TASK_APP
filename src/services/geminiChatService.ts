import { ChatEvent, ChatResponse } from '@/src/types';
import { patternAnalysisService } from './patternAnalysisService';

interface EventSearchResult {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  isAllDay?: boolean;
}

class GeminiChatService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private existingEvents: EventSearchResult[] = [];

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  // 既存の予定を設定（EventContextから呼び出される）
  setExistingEvents(events: EventSearchResult[]) {
    this.existingEvents = events;
  }

  async processChatMessage(message: string, context?: string): Promise<ChatResponse> {
    try {
      // 日本時間で現在の日時を取得
      const now = new Date();
      const currentDate = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').join('-');

      const currentTime = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // 明日の日付も計算して提供
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').join('-');

      // 既存の予定情報を文字列化（より詳細に）
      const existingEventsInfo = this.existingEvents.length > 0
        ? `\n**既存の予定一覧**:\n${this.existingEvents.map(event =>
            `- ID: ${event.id}, タイトル: "${event.title}", 日時: ${event.date} ${event.startTime}-${event.endTime}${event.description ? `, 詳細: "${event.description}"` : ''}`
          ).join('\n')}\n\n**重要**: 編集・削除の場合は、必ず上記の既存予定から該当するものを特定し、そのIDを使用してください。`
        : '\n**注意**: 現在既存の予定はありません。';

      // パターン学習によるプロンプト強化
      const basePrompt = `
あなたはAIカレンダーアシスタントです。ユーザーの自然な言葉から予定の作成・編集・削除の意図を理解し、適切なアクションを実行してください。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}${existingEventsInfo}

${context ? `**前回までの会話履歴**:
${context}

**重要**: 前回の会話の内容を考慮して、「それ」「その予定」「今話した予定」などの代名詞や参照表現を理解し、適切な予定を特定してください。また、「時間を変更」「明日に移動」のような相対的な指示も文脈から理解してください。
` : ''}

**現在のユーザーメッセージ**: "${message}"

**文脈理解の特別ルール**:
- 「それ」「その予定」「今話した予定」などの代名詞は前回の会話で言及された予定を指します
- 「時間を変更」「明日に変更」などの相対的な指示も文脈から適切な予定を特定してください
- 会話の流れを考慮して、適切な既存予定のIDを特定してください

以下の形式で返してください：

{
  "events": [
    {
      "id": "既存予定のID（編集・削除時のみ）",
      "date": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD（複数日予定の場合のみ）",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "予定のタイトル",
      "description": "詳細（あれば）",
      "isAllDay": false,
      "isMultiDay": false,
      "recurrence": {
        "type": "none|daily|weekly|monthly|yearly|custom",
        "interval": 1,
        "unit": "day|week|month|year",
        "endCondition": "never|date|count",
        "endDate": "YYYY-MM-DD（終了日指定時のみ）",
        "endCount": 10
      }
    }
  ],
  "message": "ユーザーへの自然な返答",
  "confidence": 0.95,
  "action": {
    "type": "create|edit|delete|delete_single|delete_series|delete_future",
    "eventId": "対象予定のID（編集・削除時のみ）",
    "deleteScope": "single|series|future（繰り返し予定の削除範囲）",
    "searchQuery": "予定検索用のクエリ（曖昧な場合のみ）"
  },
  "suggestedEvents": [
    {
      "id": "候補予定のID",
      "title": "候補予定のタイトル",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ]
}

**重要なルール**：

1. **アクション判定（最重要）**：
   - 「変更」「修正」「更新」「時間を変える」などのキーワードが含まれる → type: "edit"
   - 「削除」「キャンセル」「取り消し」などのキーワードが含まれる → type: "delete" または "bulk_delete"
   - 上記以外で新しい予定の情報が含まれる → type: "create"

   **削除タイプの判定**：
   - 「すべて削除」「全部削除」「今カレンダーに表示されてる予定を削除」→ type: "bulk_delete", deleteAll: true
   - 「今月の予定をすべて削除」「来週の予定を削除」→ type: "bulk_delete", deleteCondition: { type: "date_range" }
   - 「会議の予定をすべて削除」「バイトの予定を削除」→ type: "bulk_delete", deleteCondition: { type: "title_match" }
   - 「繰り返し予定をすべて削除」→ type: "bulk_delete", deleteCondition: { type: "recurring" }

   **繰り返し予定の削除範囲判定**：
   - 「今日の会議だけ削除」「この予定のみ削除」→ type: "delete_single", deleteScope: "single"
   - 「会議の繰り返しをすべて削除」「シリーズ全体を削除」→ type: "delete_series", deleteScope: "series"
   - 「来週以降の会議を削除」「これ以降の予定を削除」→ type: "delete_future", deleteScope: "future"
   - 特定の1つの予定の削除（非繰り返し） → type: "delete"

2. **編集時の既存予定検索**：
   - 「明日のバイトを18から20に変更」→ 明日の「バイト」予定を検索
   - 「会議を2時に変更」→ 「会議」を含む予定を検索
   - タイトル、日時、場所で既存予定を特定
   - 複数候補がある場合はsuggestedEventsに候補を列挙
   - 特定できない場合はsearchQueryで検索用キーワードを提供

3. **編集時の注意事項**：
   - 編集時は必ず既存予定のIDを特定する
   - 編集時は新規作成（type: "create"）にしてはいけない
   - 既存予定が見つからない場合は、suggestedEventsで候補を提示

4. **日時の解析**：
   - 「明日」→ ${tomorrowDate}
   - 「来週火曜日」→ 具体的な日付を計算
   - 「15時」「午後3時」→ "15:00"
   - 「18から20に変更」→ 18:00-20:00
   - **複数日予定の認識**：
     - 「20日から30日まで」→ 開始日: 20日, 終了日: 30日
     - 「来週月曜から金曜まで」→ 具体的な日付範囲を計算
     - 「3日間の旅行」→ 開始日から3日間の範囲

5. **自然な応答**：
   - 編集・削除時は対象予定を確認
   - 複数候補がある場合は選択肢を提示
   - 丁寧語で親しみやすく

**具体的な検索例**：
- 「明日のバイトを18から20に変更」→ 既存予定から「バイト」を含む明日の予定を検索し、そのIDで編集
- 「会議を2時に変更」→ 既存予定から「会議」を含む予定を検索し、そのIDで編集
- 「明日の予定を削除」→ 既存予定から明日の予定を検索し、そのIDで削除

**複数日予定の例**：
- 「20日から30日まで帰省」→ 1つの複数日予定として作成（isMultiDay: true, isAllDay: true, endDate: 30日）
- 「来週月曜から金曜まで出張」→ 1つの複数日予定として作成（isMultiDay: true, isAllDay: true）
- 「3日間の旅行」→ 開始日から3日間の1つの予定として作成（isMultiDay: true, isAllDay: true）

**最重要ルール - 複数日予定について**: 
1. **「X日からY日まで」「X日からY日」のような期間表現は、絶対に1つの予定として作成する**
2. **eventsに複数の要素を入れることは絶対に禁止**
3. **複数日予定は必ずisMultiDay: true, isAllDay: true, endDateを設定**
4. **「10日から17日まで帰省」→ 1つの要素のみ、8個の予定ではない**

**絶対にしてはいけないこと**:
- 複数日予定を日付ごとに分割して複数の予定にする
- eventsに [{"date":"10日"},{"date":"11日"}...] のように複数要素を入れる
- 同じタイトルの予定を複数作成する

**必ず守ること**:
- 複数日予定は必ず1つのevents要素のみ
- endDateで期間を指定
- isMultiDay: true, isAllDay: trueを設定

**レスポンス例**：
- 編集成功時: action.type="edit", action.eventId="既存予定のID", events=[編集後の予定データ]
- 複数候補時: action.type="edit", suggestedEvents=[候補予定リスト]
- 新規作成時: action.type="create", events=[新規予定データ]（IDは含まない）
- 複数日予定作成時: events=[{date: "開始日", endDate: "終了日", isMultiDay: true, isAllDay: true}]
- **全削除時**: action.type="bulk_delete", deleteAll=true, eventIds=[すべての予定ID]
- **条件削除時**: action.type="bulk_delete", deleteCondition={type: "条件", ...}, eventIds=[該当予定ID]

**複数日予定の正しいレスポンス例**：

❌ 間違った例（複数の予定として作成 - これは絶対にしない）：
{
  "events": [
    {"date": "2025-09-09", "title": "帰省"},
    {"date": "2025-09-10", "title": "帰省"},
    {"date": "2025-09-11", "title": "帰省"},
    ...
  ]
}

✅ 正しい例（1つの複数日予定として作成）：
「9日から15日まで帰省」の場合：
{
  "events": [
    {
      "date": "2025-09-09",
      "endDate": "2025-09-15", 
      "startTime": "00:00",
      "endTime": "23:59",
      "title": "帰省",
      "isAllDay": true,
      "isMultiDay": true
    }
  ],
  "message": "9月9日から15日まで帰省の予定を作成しました！",
  "action": {"type": "create"}
}

例：
- 「明日の3時に会議」→ type: "create"（新規作成）
- 「明日の会議を2時に変更」→ type: "edit"（既存予定を検索して編集）
- 「明日のバイトを18から20に変更」→ type: "edit"（既存のバイト予定を検索して編集）
- 「明日の会議を削除」→ type: "delete"（既存予定を検索して削除）
- 「今カレンダーに表示されてる予定をすべて削除」→ type: "bulk_delete", deleteAll: true
- 「今月の予定をすべて削除」→ type: "bulk_delete", deleteCondition: { type: "date_range" }
- 「会議の予定をすべて削除」→ type: "bulk_delete", deleteCondition: { type: "title_match", titlePattern: "会議" }

**最終確認**：
- 複数日予定の場合、eventsには必ず1つの要素のみ含める
- 「X日からY日まで」は絶対に1つの予定として作成する
- 同じタイトルの予定を複数作らない

**繰り返し予定削除の重要な判定**：
- 「だけ削除」「のみ削除」「今回だけ」→ delete_single
- 「全部削除」「完全に削除」「シリーズ削除」→ delete_series
- 「これ以降」「今後の」「来週から」→ delete_future

**統計的パターン情報（参考）**：
一般的な傾向として以下のパターンが使用されています：
- 一般的な予定タイプ: 会議, ランチ, 勉強, 運動, 買い物
- 人気の時間帯: 09:00, 12:00, 15:00が一般的
- よく使われる表現: 「明日の○時」「来週の○曜日」「○時から」「○分間」

**繰り返し予定の認識と設定**：
1. **繰り返しキーワードの検出**：
   - 「毎日」→ type: "daily", interval: 1
   - 「毎週」→ type: "weekly", interval: 1
   - 「毎月」→ type: "monthly", interval: 1
   - 「毎年」→ type: "yearly", interval: 1
   - 「2日おき」「3日ごと」→ type: "custom", interval: 2または3, unit: "day"
   - 「隔週」「2週間おき」→ type: "custom", interval: 2, unit: "week"

2. **終了条件の設定**：
   - 「10回」「5回まで」→ endCondition: "count", endCount: 指定回数
   - 「12月まで」「来年3月まで」→ endCondition: "date", endDate: 指定日
   - 終了条件の指定がない場合 → endCondition: "never"

**繰り返し予定の例**：
- 「毎日9時からランニング」→ type: "daily", interval: 1, endCondition: "never"
- 「毎週火曜日に会議」→ type: "weekly", interval: 1, endCondition: "never"
- 「2週間おきに歯科検診」→ type: "custom", interval: 2, unit: "week", endCondition: "never"
- 「毎月1日に家賃支払い、12月まで」→ type: "monthly", interval: 1, endCondition: "date", endDate: "2025-12-31"
- 「毎日朝食を10回記録」→ type: "daily", interval: 1, endCondition: "count", endCount: 10

`;

      // パターン学習でプロンプトを強化
      const enhancedPrompt = await patternAnalysisService.generatePersonalizedPrompt(basePrompt + `

ユーザーメッセージ: "${message}"
${context ? `前の会話: ${context}` : ''}

以下の形式で返してください：

{
  "events": [
    {
      "id": "既存予定のID（編集・削除時のみ）",
      "date": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD（複数日予定の場合のみ）",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "予定のタイトル",
      "description": "詳細（あれば）",
      "isAllDay": false,
      "isMultiDay": false
    }
  ],
  "message": "ユーザーへの自然な返答",
  "confidence": 0.95,
  "action": {
    "type": "create|edit|delete|delete_single|delete_series|delete_future",
    "eventId": "対象予定のID（編集・削除時のみ）",
    "deleteScope": "single|series|future（繰り返し予定の削除範囲）",
    "searchQuery": "予定検索用のクエリ（曖昧な場合のみ）"
  },
  "suggestedEvents": [
    {
      "id": "候補予定のID",
      "title": "候補予定のタイトル",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ]
}

**重要なルール**：

1. **アクション判定（最重要）**：
   - 「変更」「修正」「更新」「時間を変える」などのキーワードが含まれる → type: "edit"
   - 「削除」「キャンセル」「取り消し」などのキーワードが含まれる → type: "delete" または "bulk_delete"
   - 上記以外で新しい予定の情報が含まれる → type: "create"

   **削除タイプの判定**：
   - 「すべて削除」「全部削除」「今カレンダーに表示されてる予定を削除」→ type: "bulk_delete", deleteAll: true
   - 「今月の予定をすべて削除」「来週の予定を削除」→ type: "bulk_delete", deleteCondition: { type: "date_range" }
   - 「会議の予定をすべて削除」「バイトの予定を削除」→ type: "bulk_delete", deleteCondition: { type: "title_match" }
   - 「繰り返し予定をすべて削除」→ type: "bulk_delete", deleteCondition: { type: "recurring" }

   **繰り返し予定の削除範囲判定**：
   - 「今日の会議だけ削除」「この予定のみ削除」→ type: "delete_single", deleteScope: "single"
   - 「会議の繰り返しをすべて削除」「シリーズ全体を削除」→ type: "delete_series", deleteScope: "series"
   - 「来週以降の会議を削除」「これ以降の予定を削除」→ type: "delete_future", deleteScope: "future"
   - 特定の1つの予定の削除（非繰り返し） → type: "delete"

2. **編集時の既存予定検索**：
   - 「明日のバイトを18から20に変更」→ 明日の「バイト」予定を検索
   - 「会議を2時に変更」→ 「会議」を含む予定を検索
   - タイトル、日時、場所で既存予定を特定
   - 複数候補がある場合はsuggestedEventsに候補を列挙
   - 特定できない場合はsearchQueryで検索用キーワードを提供

3. **編集時の注意事項**：
   - 編集時は必ず既存予定のIDを特定する
   - 編集時は新規作成（type: "create"）にしてはいけない
   - 既存予定が見つからない場合は、suggestedEventsで候補を提示

4. **日時の解析**：
   - 「明日」→ ${tomorrowDate}
   - 「来週火曜日」→ 具体的な日付を計算
   - 「15時」「午後3時」→ "15:00"
   - 「18から20に変更」→ 18:00-20:00
   - **複数日予定の認識**：
     - 「20日から30日まで」→ 開始日: 20日, 終了日: 30日
     - 「来週月曜から金曜まで」→ 具体的な日付範囲を計算
     - 「3日間の旅行」→ 開始日から3日間の範囲

5. **自然な応答**：
   - 編集・削除時は対象予定を確認
   - 複数候補がある場合は選択肢を提示
   - 丁寧語で親しみやすく

**具体的な検索例**：
- 「明日のバイトを18から20に変更」→ 既存予定から「バイト」を含む明日の予定を検索し、そのIDで編集
- 「会議を2時に変更」→ 既存予定から「会議」を含む予定を検索し、そのIDで編集
- 「明日の予定を削除」→ 既存予定から明日の予定を検索し、そのIDで削除

**複数日予定の例**：
- 「20日から30日まで帰省」→ 1つの複数日予定として作成（isMultiDay: true, isAllDay: true, endDate: 30日）
- 「来週月曜から金曜まで出張」→ 1つの複数日予定として作成（isMultiDay: true, isAllDay: true）
- 「3日間の旅行」→ 開始日から3日間の1つの予定として作成（isMultiDay: true, isAllDay: true）

**最重要ルール - 複数日予定について**:
1. **「X日からY日まで」「X日からY日」のような期間表現は、絶対に1つの予定として作成する**
2. **eventsに複数の要素を入れることは絶対に禁止**
3. **複数日予定は必ずisMultiDay: true, isAllDay: true, endDateを設定**
4. **「10日から17日まで帰省」→ 1つの要素のみ、8個の予定ではない**

**絶対にしてはいけないこと**:
- 複数日予定を日付ごとに分割して複数の予定にする
- eventsに [{"date":"10日"},{"date":"11日"}...] のように複数要素を入れる
- 同じタイトルの予定を複数作成する

**必ず守ること**:
- 複数日予定は必ず1つのevents要素のみ
- endDateで期間を指定
- isMultiDay: true, isAllDay: trueを設定

**レスポンス例**：
- 編集成功時: action.type="edit", action.eventId="既存予定のID", events=[編集後の予定データ]
- 複数候補時: action.type="edit", suggestedEvents=[候補予定リスト]
- 新規作成時: action.type="create", events=[新規予定データ]（IDは含まない）
- 複数日予定作成時: events=[{date: "開始日", endDate: "終了日", isMultiDay: true, isAllDay: true}]
- **全削除時**: action.type="bulk_delete", deleteAll=true, eventIds=[すべての予定ID]
- **条件削除時**: action.type="bulk_delete", deleteCondition={type: "条件", ...}, eventIds=[該当予定ID]

**複数日予定の正しいレスポンス例**：

❌ 間違った例（複数の予定として作成 - これは絶対にしない）：
{
  "events": [
    {"date": "2025-09-09", "title": "帰省"},
    {"date": "2025-09-10", "title": "帰省"},
    {"date": "2025-09-11", "title": "帰省"},
    ...
  ]
}

✅ 正しい例（1つの複数日予定として作成）：
「9日から15日まで帰省」の場合：
{
  "events": [
    {
      "date": "2025-09-09",
      "endDate": "2025-09-15",
      "startTime": "00:00",
      "endTime": "23:59",
      "title": "帰省",
      "isAllDay": true,
      "isMultiDay": true
    }
  ],
  "message": "9月9日から15日まで帰省の予定を作成しました！",
  "action": {"type": "create"}
}

例：
- 「明日の3時に会議」→ type: "create"（新規作成）
- 「明日の会議を2時に変更」→ type: "edit"（既存予定を検索して編集）
- 「明日のバイトを18から20に変更」→ type: "edit"（既存のバイト予定を検索して編集）
- 「明日の会議を削除」→ type: "delete"（既存予定を検索して削除）
- 「今カレンダーに表示されてる予定をすべて削除」→ type: "bulk_delete", deleteAll: true
- 「今月の予定をすべて削除」→ type: "bulk_delete", deleteCondition: { type: "date_range" }
- 「会議の予定をすべて削除」→ type: "bulk_delete", deleteCondition: { type: "title_match", titlePattern: "会議" }

**最終確認**：
- 複数日予定の場合、eventsには必ず1つの要素のみ含める
- 「X日からY日まで」は絶対に1つの予定として作成する
- 同じタイトルの予定を複数作らない

**繰り返し予定削除の重要な判定**：
- 「だけ削除」「のみ削除」「今回だけ」→ delete_single
- 「全部削除」「完全に削除」「シリーズ削除」→ delete_series
- 「これ以降」「今後の」「来週から」→ delete_future

**重要**: 必ず完全なJSONオブジェクトを返してください。途中で切れることのないよう、すべてのフィールドを含めてください。

JSONのみを返してください。`);

      console.log('🧠 パターン学習でプロンプトを強化しました');

      const requestBody = {
        contents: [
          {
            parts: [{ text: enhancedPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1, // より低い温度で安定性を向上
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048, // トークン数を増やして完全なレスポンスを確保
          stopSequences: [], // 停止シーケンスを明示的に設定
        },
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('🔍 Gemini API生レスポンス:', JSON.stringify(data, null, 2));
      
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        console.error('❌ Gemini APIからテキストレスポンスがありません:', data);
        throw new Error('No response from Gemini');
      }
      
      // レスポンスが空文字列の場合
      if (textResponse.trim().length === 0) {
        console.error('❌ Gemini APIから空のレスポンスが返されました');
        throw new Error('Empty response from Gemini');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log('🔍 Gemini生レスポンス:', textResponse);
      console.log('🔍 クリーニング後:', cleanedResponse);
      
      let result: ChatResponse;
      
      try {
        // JSONパースを試行
        result = JSON.parse(cleanedResponse);
        console.log('✅ JSONパース成功:', result);
      } catch (parseError) {
        console.error('❌ JSONパースエラー:', parseError);
        console.error('❌ パース対象テキスト:', cleanedResponse);
        
        // JSONの修復を試行
        try {
          const fixedJson = this.fixIncompleteJson(cleanedResponse);
          console.log('🔧 修復されたJSON:', fixedJson);
          result = JSON.parse(fixedJson);
          console.log('✅ 修復後JSONパース成功:', result);
        } catch (fixError) {
          console.error('❌ JSON修復も失敗:', fixError);
          
          // フォールバック応答を返す
          return {
            events: [],
            message: 'すみません、AIの応答を処理できませんでした。もう一度お試しください。',
            confidence: 0.0
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Geminiチャット処理エラー:', error);
      
      // フォールバック応答
      return {
        events: [],
        message: 'すみません、うまく理解できませんでした。もう少し詳しく教えていただけますか？',
        confidence: 0.0
      };
    }
  }

  // 不完全なJSONを修復するメソッド
  private fixIncompleteJson(jsonString: string): string {
    console.log('🔧 JSON修復開始:', jsonString);
    
    let fixed = jsonString.trim();
    
    // 1. 開始が{でない場合は追加
    if (!fixed.startsWith('{')) {
      const jsonStart = fixed.indexOf('{');
      if (jsonStart !== -1) {
        fixed = fixed.substring(jsonStart);
      } else {
        fixed = '{' + fixed;
      }
    }
    
    // 2. 終了が}でない場合は追加
    if (!fixed.endsWith('}')) {
      // 最後のカンマを削除してから}を追加
      fixed = fixed.replace(/,\s*$/, '') + '}';
    }
    
    // 3. 不完全な文字列リテラルを修復
    fixed = fixed.replace(/:\s*"[^"]*$/, ': ""');
    fixed = fixed.replace(/,\s*"[^"]*$/, ', ""');
    
    // 4. 不完全な配列を修復
    fixed = fixed.replace(/\[\s*$/, '[]');
    fixed = fixed.replace(/\[\s*,\s*$/, '[]');
    
    // 5. 不完全なオブジェクトを修復
    fixed = fixed.replace(/{\s*$/, '{}');
    fixed = fixed.replace(/{\s*,\s*$/, '{}');
    
    console.log('🔧 JSON修復完了:', fixed);
    return fixed;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'こんにちは' }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// デフォルトインスタンスをエクスポート
export const geminiChatService = new GeminiChatService();
export { GeminiChatService, type ChatEvent, type ChatResponse };
