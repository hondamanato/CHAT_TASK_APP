interface ChatEvent {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  isAllDay?: boolean;
}

interface ChatResponse {
  events: ChatEvent[];
  message: string;
  confidence: number;
}

class GeminiChatService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }
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
あなたはAIカレンダーアシスタントです。ユーザーの自然な言葉から予定情報を抽出し、JSONで返してください。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}

ユーザーメッセージ: "${message}"
${context ? `前の会話: ${context}` : ''}

以下の形式で返してください：

{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM", 
      "title": "予定のタイトル",
      "description": "詳細（あれば）",
      "isAllDay": false
    }
  ],
  "message": "ユーザーへの自然な返答",
  "confidence": 0.95
}

**重要なルール**：
1. 相対的な日時表現を具体的な日付に変換する
   - 「明日」→ ${tomorrowDate}
   - 「来週火曜日」→ 具体的な日付を計算
   - 「今度の金曜」→ 次の金曜日の日付を計算

2. 時刻の正確な解析
   - 「15時」「午後3時」→ "15:00"
   - 「9時」「朝9時」→ "09:00"
   - 終了時間が未指定の場合は開始時間+1時間
   
2. 時間の推測
   - 終了時間が不明な場合は開始時間+1時間
   - 「午後」「夜」「朝」を24時間表記に変換
   - 「お昼」→ 12:00, 「夕方」→ 17:00
   
3. 予定が明確でない場合
   - eventsは空配列
   - messageで確認事項を返す
   
4. 自然な日本語で応答
   - 丁寧語で親しみやすく
   - 確認事項があれば具体的に質問

例：
- 「明日の3時に会議」→ 翌日15:00-16:00の会議予定
- 「来週病院」→ 具体的な日時を確認する質問
- 「土曜日朝から買い物」→ 次の土曜日09:00-10:00の買い物予定

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