import Constants from 'expo-constants';
import type { ChatResponse, ChatEvent } from './geminiChatService';
import type { ImageAnalysisResult } from './hybridAIService';

/**
 * Gemini ストリーミングサービス
 * Server-Sent Events (SSE) でリアルタイムにAI応答を受信
 */
class GeminiStreamService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private edgeFunctionUrl: string;
  private abortController: AbortController | null = null;

  constructor() {
    this.supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
    this.supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL and ANON KEY are required');
    }

    this.edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/gemini-chat-stream`;
  }

  /**
   * チャットメッセージをストリーミングで処理
   * 
   * @param message ユーザーメッセージ
   * @param onChunk テキストチャンクを受信したときのコールバック
   * @param onComplete 完了時のコールバック
   * @param onError エラー時のコールバック
   * @param context 会話コンテキスト
   * @param existingEvents 既存イベント
   */
  async streamChatMessage(
    message: string,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    context?: string,
    existingEvents?: ChatEvent[]
  ): Promise<void> {
    // 既存のストリームをキャンセル
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      // プロンプトを構築（geminiChatServiceと同じロジック）
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

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').join('-');

      const existingEventsContext = existingEvents && existingEvents.length > 0
        ? `\n\n**既存のイベントリスト（画像解析で抽出済み）**:\n${JSON.stringify(existingEvents, null, 2)}`
        : '';

      const prompt = `
あなたはAIカレンダーアシスタントです。ユーザーの自然な言葉から、操作の意図(intent)と必要な情報を抽出してJSONで返してください。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}

ユーザーメッセージ: "${message}"
${context ? `前の会話: ${context}` : ''}${existingEventsContext}

以下の形式で返してください：

{
  "intent": "create_event" | "delete_event" | "update_event" | "search_events" | "confirm_events" | "cancel" | "edit_existing_events" | "chat",
  "keywords": {
    "date": "YYYY-MM-DD",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
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

JSONのみを返してください。
`;

      console.log('📤 Starting chat stream...');

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
        body: JSON.stringify({
          contentType: 'text',
          prompt: prompt
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // ストリーミングレスポンスを処理
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Stream completed');
          onComplete(fullText);
          break;
        }

        // チャンクをデコード
        buffer += decoder.decode(value, { stream: true });

        // 改行で分割してSSEメッセージを処理
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            if (dataStr === '[DONE]') {
              console.log('✅ Stream finished');
              onComplete(fullText);
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.text) {
                fullText += data.text;
                onChunk(data.text);
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
              // パースエラーは無視して続行
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⚠️ Stream cancelled');
        return;
      }

      console.error('❌ Stream error:', error);
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * 画像解析をストリーミングで処理
   * 
   * @param imageBase64 Base64エンコードされた画像
   * @param onChunk テキストチャンクを受信したときのコールバック
   * @param onComplete 完了時のコールバック
   * @param onError エラー時のコールバック
   * @param userMessage ユーザーメッセージ
   * @param timezone タイムゾーン
   * @param locale ロケール
   */
  async streamImageAnalysis(
    imageBase64: string,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    userMessage?: string,
    timezone?: string,
    locale?: string
  ): Promise<void> {
    // 既存のストリームをキャンセル
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    try {
      const prompt = `
あなたは画像解析の専門家です。提供された画像から予定情報を抽出してください。

${userMessage ? `ユーザーからの指示: ${userMessage}` : ''}
タイムゾーン: ${timezone || 'Asia/Tokyo'}
言語: ${locale || 'ja'}

以下のJSON形式で結果を返してください：

{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "予定のタイトル",
      "location": "場所（あれば）",
      "description": "詳細（あれば）",
      "confidence": 0.95
    }
  ],
  "totalFound": 1,
  "processingTime": 1500
}

JSONのみを返してください。
`;

      console.log('📤 Starting image analysis stream...');

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
        },
        body: JSON.stringify({
          contentType: 'image',
          prompt: prompt,
          imageBase64: imageBase64
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // ストリーミングレスポンスを処理
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Image analysis stream completed');
          onComplete(fullText);
          break;
        }

        // チャンクをデコード
        buffer += decoder.decode(value, { stream: true });

        // 改行で分割してSSEメッセージを処理
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            if (dataStr === '[DONE]') {
              console.log('✅ Image analysis stream finished');
              onComplete(fullText);
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.text) {
                fullText += data.text;
                onChunk(data.text);
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
              // パースエラーは無視して続行
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⚠️ Image analysis stream cancelled');
        return;
      }

      console.error('❌ Image analysis stream error:', error);
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * 現在のストリームをキャンセル
   */
  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 接続テスト
   */
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
          contentType: 'text',
          prompt: 'test'
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const geminiStreamService = new GeminiStreamService();
export { GeminiStreamService };

