import Config from 'react-native-config';
import { AIEventExtractionResponse, AIExtractedEvent, AIServiceConfig } from '../types/aiEvent';

// 環境変数から設定を取得
const getAPIConfig = (): { provider: 'openai' | 'gemini'; apiKey: string } => {
  const openaiKey = Config.OPENAI_API_KEY;
  const geminiKey = Config.GEMINI_API_KEY;

  // Gemini APIを優先（OpenAI APIにクォータ制限がある場合のため）
  if (geminiKey && geminiKey !== '') {
    return { provider: 'gemini', apiKey: geminiKey };
  }
  
  if (openaiKey && openaiKey !== '') {
    return { provider: 'openai', apiKey: openaiKey };
  }
  
  // 一時的にAI APIキーエラーを回避
  console.warn('AI APIキーが設定されていません。AI機能を無効化します。');
  return { provider: 'gemini', apiKey: 'disabled' };
};

// OpenAI APIを使用した予定抽出
const extractEventsWithOpenAI = async (
  text: string, 
  apiKey: string,
  config: AIServiceConfig = {}
): Promise<AIExtractedEvent[]> => {
  const prompt = `
以下のテキストから予定・イベントを抽出し、JSON配列として返してください。
各イベントには以下のプロパティを含めてください：
- title: イベントのタイトル（必須）
- date: 日付（YYYY-MM-DD形式、必須）
- startTime: 開始時間（HH:MM形式、省略可能）
- endTime: 終了時間（HH:MM形式、省略可能）
- endDate: 終了日（複数日イベントの場合、YYYY-MM-DD形式、省略可能）
- location: 場所（省略可能）
- description: 説明・詳細（省略可能）
- isAllDay: 終日イベントかどうか（boolean、省略可能）
- confidence: 抽出の信頼度（0-1、省略可能）

テキストから予定が見つからない場合は空の配列[]を返してください。
JSONのみを返し、他の説明は不要です。

テキスト：
${text}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API エラー: ${errorData.error?.message || '不明なエラー'}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('AIからの応答が空です');
  }

  try {
    // JSONの解析を試行
    const events = JSON.parse(content);
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('JSON解析エラー:', error);
    console.error('AIからの応答:', content);
    throw new Error('AIからの応答を解析できませんでした');
  }
};

// Gemini APIを使用した予定抽出
const extractEventsWithGemini = async (
  text: string,
  apiKey: string,
  config: AIServiceConfig = {}
): Promise<AIExtractedEvent[]> => {
  const prompt = `
以下のテキストから予定・イベントを抽出し、JSON配列として返してください。
各イベントには以下のプロパティを含めてください：
- title: イベントのタイトル（必須）
- date: 日付（YYYY-MM-DD形式、必須）
- startTime: 開始時間（HH:MM形式、省略可能）
- endTime: 終了時間（HH:MM形式、省略可能）
- endDate: 終了日（複数日イベントの場合、YYYY-MM-DD形式、省略可能）
- location: 場所（省略可能）
- description: 説明・詳細（省略可能）
- isAllDay: 終日イベントかどうか（boolean、省略可能）
- confidence: 抽出の信頼度（0-1、省略可能）

テキストから予定が見つからない場合は空の配列[]を返してください。
JSONのみを返し、他の説明は不要です。

テキスト：
${text}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature || 0.1,
          maxOutputTokens: config.maxTokens || 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API エラー: ${errorData.error?.message || '不明なエラー'}`);
  }

  const data = await response.json();
  const content = data.candidates[0]?.content?.parts[0]?.text;

  if (!content) {
    throw new Error('AIからの応答が空です');
  }

  try {
    // JSONの解析を試行
    const events = JSON.parse(content);
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('JSON解析エラー:', error);
    console.error('AIからの応答:', content);
    throw new Error('AIからの応答を解析できませんでした');
  }
};

// 抽出された予定データのバリデーション
const validateExtractedEvent = (event: any): AIExtractedEvent | null => {
  try {
    // 必須フィールドの確認
    if (!event.title || typeof event.title !== 'string' || event.title.trim() === '') {
      return null;
    }

    if (!event.date || typeof event.date !== 'string') {
      return null;
    }

    // 日付の形式確認（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(event.date)) {
      return null;
    }

    // 時間の形式確認（HH:MM）
    const timeRegex = /^\d{2}:\d{2}$/;
    if (event.startTime && (typeof event.startTime !== 'string' || !timeRegex.test(event.startTime))) {
      event.startTime = undefined;
    }
    if (event.endTime && (typeof event.endTime !== 'string' || !timeRegex.test(event.endTime))) {
      event.endTime = undefined;
    }

    // 終了日の形式確認
    if (event.endDate && (typeof event.endDate !== 'string' || !dateRegex.test(event.endDate))) {
      event.endDate = undefined;
    }

    return {
      title: event.title.trim(),
      date: event.date,
      startTime: event.startTime || undefined,
      endTime: event.endTime || undefined,
      endDate: event.endDate || undefined,
      location: event.location || undefined,
      description: event.description || undefined,
      isAllDay: Boolean(event.isAllDay),
      confidence: typeof event.confidence === 'number' ? Math.max(0, Math.min(1, event.confidence)) : undefined,
    };
  } catch (error) {
    console.error('イベントバリデーションエラー:', error);
    return null;
  }
};

// メイン関数：テキストから予定を抽出
export const extractEventsFromText = async (
  text: string,
  config: AIServiceConfig = {}
): Promise<AIEventExtractionResponse> => {
  try {
    // 入力テキストの検証
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return {
        events: [],
        summary: 'テキストが入力されていません',
      };
    }

    // API設定を取得
    const apiConfig = getAPIConfig();
    
    let extractedEvents: AIExtractedEvent[] = [];

    // 設定されたプロバイダーに基づいて予定を抽出
    if (apiConfig.provider === 'openai') {
      extractedEvents = await extractEventsWithOpenAI(text, apiConfig.apiKey, config);
    } else if (apiConfig.provider === 'gemini') {
      extractedEvents = await extractEventsWithGemini(text, apiConfig.apiKey, config);
    }

    // 抽出されたイベントをバリデーション
    const validatedEvents = extractedEvents
      .map(validateExtractedEvent)
      .filter((event): event is AIExtractedEvent => event !== null);

    return {
      events: validatedEvents,
      summary: validatedEvents.length > 0 
        ? `${validatedEvents.length}件の予定を抽出しました`
        : 'テキストから予定を見つけることができませんでした',
    };

  } catch (error) {
    console.error('予定抽出エラー:', error);
    return {
      events: [],
      error: error instanceof Error ? error.message : '予定の抽出中にエラーが発生しました',
    };
  }
};