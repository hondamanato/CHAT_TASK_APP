import * as FileSystem from 'expo-file-system';

interface ShiftEntry {
  date: string;
  startTime: string;
  endTime: string;
  workplace?: string;
  notes?: string;
  title?: string; // タイトルフィールドを追加
}

interface ShiftAnalysisResult {
  shifts: ShiftEntry[];
  confidence: number;
  rawText?: string;
}

interface ChatResponse {
  events: ShiftEntry[];
  message: string;
  confidence: number;
  action?: 'create' | 'update' | 'delete'; // 操作種別
  eventId?: string; // 編集・削除対象のイベントID
}

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key is not set. AI functionality will be disabled.');
      this.apiKey = 'disabled';
    }
  }

  async analyzeShiftImage(imageUri: string): Promise<ShiftAnalysisResult> {
    try {
      // 画像をBase64に変換
      const base64Image = await this.convertImageToBase64(imageUri);
      
      const prompt = `
この画像はシフト表です。以下の形式のJSONで情報を抽出してください：

{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "workplace": "勤務場所（あれば）",
      "notes": "その他メモ（あれば）"
    }
  ],
  "confidence": 0.95,
  "rawText": "読み取った元のテキスト"
}

重要な注意点：
- 日付は必ずYYYY-MM-DD形式で出力
- 時間は24時間表記（HH:MM）で出力
- 曖昧な情報は含めない
- confidenceは0-1の範囲で読み取り精度を表す
- 日本語のシフト表として解析
- 表形式データを正確に読み取る
- 手書き文字も可能な限り認識

JSONのみを返してください。説明文は不要です。
`;

      const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const textResponse = data.choices[0]?.message?.content;

      if (!textResponse) {
        throw new Error('No response from OpenAI');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result: ShiftAnalysisResult = JSON.parse(cleanedResponse);

      return result;
    } catch (error) {
      console.error('OpenAI画像解析エラー:', error);
      throw new Error('シフト表の解析に失敗しました');
    }
  }

  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Base64変換エラー:', error);
      throw new Error('画像の変換に失敗しました');
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
      "workplace": "場所（あれば）",
      "notes": "詳細（あれば）",
      "isAllDay": false
    }
  ],
  "message": "ユーザーへの自然な返答",
  "confidence": 0.95,
  "action": "create"
}

**重要なルール**：
1. 相対的な日時表現を具体的な日付に変換する
   - 「明日」→ ${tomorrowDate}
   - 「今日」→ ${currentDate}
   - 「来週火曜日」→ 具体的な日付を計算
   - 「今度の金曜」→ 次の金曜日の日付を計算
   - 「再来週」→ 14日後の日付を計算

2. 時刻の正確な解析
   - 「15時」「午後3時」→ "15:00"
   - 「9時」「朝9時」→ "09:00"
   - 「お昼」→ "12:00", 「夕方」→ "17:00"
   - 「夜」→ "19:00", 「朝」→ "09:00"
   - 終了時間が未指定の場合は開始時間+1時間

3. 予定が明確でない場合
   - eventsは空配列
   - messageで確認事項を返す
   - 丁寧に具体的な情報を質問

4. 自然な日本語で応答
   - 丁寧語で親しみやすく
   - 確認事項があれば具体的に質問
   - 予定を作成したら内容を確認

5. 操作の種類（action）
   - 新規作成: "create"
   - 編集: "update"（現在未対応）
   - 削除: "delete"（現在未対応）

例：
- 「明日の3時に会議」→ ${tomorrowDate} 15:00-16:00の会議
- 「来週病院」→ 具体的な曜日と時間を確認
- 「土曜日朝から買い物」→ 次の土曜日09:00-10:00の買い物

JSONのみを返してください。説明文は不要です。
`;

      const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.2
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const textResponse = data.choices[0]?.message?.content;

      if (!textResponse) {
        throw new Error('No response from OpenAI');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result: ChatResponse = JSON.parse(cleanedResponse);

      return result;
    } catch (error) {
      console.error('OpenAIチャット処理エラー:', error);
      
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
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// デフォルトインスタンスをエクスポート
export const openaiService = new OpenAIService();
export { OpenAIService, type ChatResponse, type ShiftAnalysisResult, type ShiftEntry };
