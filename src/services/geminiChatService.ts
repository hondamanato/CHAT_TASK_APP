import { ChatEvent, ChatResponse } from '@/src/types';

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

      const prompt = `
あなたはAIカレンダーアシスタントです。ユーザーの自然な言葉から予定の作成・編集・削除の意図を理解し、適切なアクションを実行してください。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}${existingEventsInfo}

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
    "type": "create|edit|delete",
    "eventId": "対象予定のID（編集・削除時のみ）",
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
   - 「削除」「キャンセル」「取り消し」などのキーワードが含まれる → type: "delete"
   - 上記以外で新しい予定の情報が含まれる → type: "create"

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

**最終確認**：
- 複数日予定の場合、eventsには必ず1つの要素のみ含める
- 「X日からY日まで」は絶対に1つの予定として作成する
- 同じタイトルの予定を複数作らない

JSONのみを返してください。
`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
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
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result: ChatResponse = JSON.parse(cleanedResponse);

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
