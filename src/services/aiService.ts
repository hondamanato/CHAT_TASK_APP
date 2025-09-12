import * as FileSystem from 'expo-file-system';

interface ShiftEntry {
  date: string;
  startTime: string;
  endTime: string;
  workplace?: string;
  notes?: string;
}

interface ShiftAnalysisResult {
  shifts: ShiftEntry[];
  confidence: number;
  rawText?: string;
}

class AIService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
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

注意点：
- 日付は必ずYYYY-MM-DD形式で
- 時間は24時間表記（HH:MM）で
- 曖昧な情報は含めない
- confidenceは0-1の範囲で読み取り精度を表す
- 日本語のシフト表を想定
`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
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
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;

      if (!textResponse) {
        throw new Error('No response from AI');
      }

      // JSONレスポンスをパース
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result: ShiftAnalysisResult = JSON.parse(cleanedResponse);

      return result;
    } catch (error) {
      console.error('AI分析エラー:', error);
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

  async processNaturalLanguage(text: string): Promise<ShiftEntry[]> {
    try {
      const prompt = `
以下のテキストから予定情報を抽出してJSONで返してください：

テキスト: "${text}"

形式：
{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "workplace": "場所",
      "notes": "メモ"
    }
  ]
}

現在の日付を基準に相対的な日付（明日、来週など）は具体的な日付に変換してください。
今日は${new Date().toISOString().split('T')[0]}です。
`;

      const requestBody = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
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
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates[0]?.content?.parts[0]?.text;
      
      const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanedResponse);

      return result.shifts || [];
    } catch (error) {
      console.error('自然言語処理エラー:', error);
      throw new Error('テキストの解析に失敗しました');
    }
  }
}

// デフォルトインスタンスをエクスポート
export const aiService = new AIService();
export { AIService, type ShiftEntry, type ShiftAnalysisResult };