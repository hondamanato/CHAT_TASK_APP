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
}

class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
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
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('画像の変換に失敗しました');
    }
  }

  async processChatMessage(message: string, context?: string): Promise<ChatResponse> {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const prompt = `
あなたは日本語の自然言語を解析して予定を作成するAIアシスタントです。

ユーザーのメッセージから予定情報を抽出し、以下のJSON形式で返してください：

{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "予定のタイトル",
      "workplace": "場所（あれば）",
      "notes": "メモ（あれば）"
    }
  ],
  "message": "ユーザーへの返答メッセージ",
  "confidence": 0.95
}

重要なルール：
1. 日付の正確な解析
   - 「明日」→ ${tomorrowDate}
   - 「来週火曜日」→ 具体的な日付を計算
   - 「今度の金曜」→ 次の金曜日の日付を計算

2. 時刻の正確な解析
   - 「15時」「午後3時」→ "15:00"
   - 「9時」「朝9時」→ "09:00"
   - 終了時間が未指定の場合は開始時間+1時間
   
3. 時間の推測
   - 終了時間が不明な場合は開始時間+1時間
   - 「午後」「夜」「朝」を24時間表記に変換
   - 「お昼」→ 12:00, 「夕方」→ 17:00
   
4. 予定が明確でない場合
   - eventsは空配列
   - messageで確認事項を返す
   
5. 自然な日本語で応答
   - 丁寧語で親しみやすく
   - 確認事項があれば具体的に質問

例：
- 「明日の3時に会議」→ 翌日15:00-16:00の会議予定
- 「来週病院」→ 具体的な日時を確認する質問
- 「土曜日朝から買い物」→ 次の土曜日09:00-10:00の買い物予定

ユーザーメッセージ: "${message}"
${context ? `コンテキスト: ${context}` : ''}

JSONのみを返してください。
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
export { OpenAIService, type ShiftEntry, type ShiftAnalysisResult, type ChatResponse };