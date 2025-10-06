import Config from 'react-native-config';

interface ChatEvent {
  date: string;
  endDate?: string; // 複数日イベントの終了日（オプション）
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  isAllDay?: boolean;
  notes?: string;      // メモ
  workplace?: string;  // 勤務場所
  color?: string;      // イベントの色
}

interface ChatKeywords {
  date?: string;      // 検索対象の日付 (YYYY-MM-DD)
  title?: string;     // 検索対象のタイトルキーワード
}

interface ChatResponse {
  intent: 'create_event' | 'delete_event' | 'update_event' | 'chat';
  keywords?: ChatKeywords;  // delete_event/update_event時の検索キーワード
  event?: ChatEvent;        // create_event時のイベントデータ
  events?: ChatEvent[];     // 後方互換性のため（create_event時）
  message: string;
  confidence: number;
}

class GeminiChatService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private edgeFunctionUrl: string;

  constructor() {
    this.supabaseUrl = Config.SUPABASE_URL || '';
    this.supabaseKey = Config.SUPABASE_ANON_KEY || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL and ANON KEY are required');
    }

    // Supabase Edge Function URL
    this.edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/gemini-proxy`;
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

      const prompt = `
あなたはAIカレンダーアシスタントです。ユーザーの自然な言葉から、操作の意図(intent)と必要な情報を抽出してJSONで返してください。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}

ユーザーメッセージ: "${message}"
${context ? `前の会話: ${context}` : ''}

以下の形式で返してください：

{
  "intent": "create_event" | "delete_event" | "update_event" | "chat",
  "keywords": {
    "date": "YYYY-MM-DD",
    "title": "キーワード"
  },
  "event": {
    "date": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "title": "予定のタイトル",
    "description": "詳細（あれば）",
    "isAllDay": false
  },
  "message": "ユーザーへの自然な返答",
  "confidence": 0.95
}

**重要なルール**：

1. **intentの判定**：
   - 予定を作成: intent: "create_event"、eventフィールドに予定データ
   - 予定を削除: intent: "delete_event"、keywordsフィールドに検索条件
   - 予定を編集: intent: "update_event"、keywordsとeventフィールド両方
   - 通常の会話: intent: "chat"、messageのみ

2. **delete_eventの場合**：
   - keywordsに日付とタイトルのキーワードを抽出
   - 例: 「明日の会議を削除」 → { intent: "delete_event", keywords: { date: "${tomorrowDate}", title: "会議" } }
   - 例: 「10月3日の予定を削除」 → { intent: "delete_event", keywords: { date: "2025-10-03" } }

3. **create_eventの場合**：
   - 相対的な日時表現を具体的な日付に変換
     - 「明日」 → ${tomorrowDate}
     - 「今日」 → ${currentDate}
     - 「来週火曜日」 → 具体的な日付を計算

   - **複数日にわたる予定は1つのイベントとして生成**
     - 「明日から3日間旅行」 → date: 明日, endDate: 明日+2日後, isAllDay: true
     - 複数日イベントはendDateフィールドに終了日を設定

   - 時刻の正確な解析
     - 「15時」「午後3時」 → "15:00"
     - 「9時」「朝9時」 → "09:00"
     - 終了時間が未指定の場合は開始時間+1時間

4. **自然な日本語で応答**：
   - 丁寧語で親しみやすく
   - 予定が明確でない場合は確認事項を質問

例：
- 「明日の3時に会議」 → { intent: "create_event", event: { date: "${tomorrowDate}", startTime: "15:00", endTime: "16:00", title: "会議", isAllDay: false }, message: "..." }
- 「明日の会議を削除」 → { intent: "delete_event", keywords: { date: "${tomorrowDate}", title: "会議" }, message: "..." }
- 「来週病院」 → { intent: "chat", message: "来週の何曜日ですか？" }

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

      // Supabase Edge Function経由でGemini APIを呼び出し
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
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from Gemini');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result: ChatResponse = JSON.parse(cleanedResponse);

      // 後方互換性: create_eventの場合はeventsフィールドも設定
      if (result.intent === 'create_event' && result.event) {
        result.events = [result.event];
      }

      return result;
    } catch (error) {
      console.error('Geminiチャット処理エラー:', error);

      // フォールバック応答
      return {
        intent: 'chat',
        events: [],
        message: 'すみません、うまく理解できませんでした。もう少し詳しく教えていただけますか？',
        confidence: 0.0
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
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
