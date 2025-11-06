import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventEntry {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  description?: string;
  matchedName?: string;
  confidence: number;
  rawText?: string;
}

interface ClaudeEvent {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  note?: string | null;
}

interface AnalysisResponse {
  events: EventEntry[];
  totalFound: number;
  processingTime: number;
}

serve(async (req) => {
  // CORS preflight対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now();

  try {
    // 環境変数からAnthropic APIキーを取得
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // リクエストボディを取得
    const { imageBase64, userMessage, timezone, locale } = await req.json()

    // パラメータバリデーション
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: imageBase64' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // デフォルト値設定
    const userTimezone = timezone || 'Asia/Tokyo';
    const userLocale = locale || 'ja';

    console.log(`🤖 Claude Sonnet 4.5で画像を解析 (${userLocale}, ${userTimezone})${userMessage ? ` - メッセージ: ${userMessage}` : ''}`);

    // 現在日付を取得（ユーザーのタイムゾーンで）
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 多言語プロンプト生成関数
    const generatePrompt = (locale: string, userMessage?: string) => {
      const prompts: { [key: string]: string } = {
        'ja': `以下の画像からイベントを抽出してJSONで出力してください。

${userMessage ? `ユーザー指示: "${userMessage}"

【最重要】名前フィルタリング:
メッセージに名前が含まれる場合（例:「名前は本多」「本多です」）、その人のデータ「のみ」を抽出。
- 本多の列/行だけを見る
- 田中、佐藤など他の人の列/行は完全に無視
- 結果: イベント数は通常2-5件程度（その人だけ）

名前が含まれない場合のみ全員を抽出。

` : ''}出力形式（JSON必須）:
{
  "doc_type": "shift|timetable|ticket|other",
  "confidence": 0.0-1.0,
  "events": [{ "title": "string", "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "location": "string|null", "note": "string|null" }]
}

ルール:
- 空欄/「休」「×」「OFF」は無視
- 時刻: 「9-17」→「09:00」-「17:00」(HH:mm形式)
- 日付: 年月なし→anchorYear=${currentYear}, anchorMonth=${currentMonth}
- confidence: 明確=0.9以上、不明瞭=0.5未満は出力しない
- タイムゾーン: ${userTimezone}

JSONのみ出力`,

        'en': `You are an assistant that extracts calendar events from images (tables, tickets, flyers, etc.).
Output ONLY the following JSON (no explanations or code blocks):
{
  "doc_type": "shift|timetable|ticket|flyer|delivery|medical|other",
  "confidence": 0.0-1.0,
  "events": [
    { "title": "string", "date": "YYYY-MM-DD", "startTime": "HH:mm|null", "endTime": "HH:mm|null", "location": "string|null", "note": "string|null" }
  ]
}

${userMessage ? `User message: "${userMessage}"

Name extraction rules:
- If a name is specified in the user message (e.g., "name is Honda", "Honda's schedule", "Honda-san"), extract ONLY that person's events.
- If no name is specified, extract all events.
- Exclude honorifics and auxiliary words like "san", "desu" from the name.

` : ''}Strict rules:
- Ignore empty cells, "off", "×", "—", "ｰ", "/".
- Normalize time formats like 9-17 / 9:00-17:00 to HH:mm, ensuring start < end.
- If year or month is missing, use anchorYear=${currentYear}, anchorMonth=${currentMonth} to complete YYYY-MM-DD (don't rely on day of week alone).
- Exclude ambiguous cells requiring speculation.
- Assume timezone ${userTimezone}, keep times as-is (no conversion).
- If multiple days exist in image, return multiple event elements.
- Final output must be valid JSON only. No extra text or comments.`
      };

      // デフォルトは英語
      return prompts[locale] || prompts['en'];
    };

    const prompt = generatePrompt(userLocale, userMessage);

    // システムプロンプト（名前フィルタリング用）
    const systemPrompt = userMessage
      ? "あなたは名前フィルタリングを厳格に守るシフト表解析AIです。ユーザーが名前を指定した場合、その人のデータ「のみ」を抽出し、他の人のデータは絶対に含めません。これは最優先ルールです。名前が指定されていない場合のみ全員のデータを抽出します。"
      : "あなたはシフト表やイベント表から正確にデータを抽出するAIです。";

    // Claude 3.5 Sonnet APIリクエスト
    const claudeRequest = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      temperature: 0
    };

    const claudeResponse = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(claudeRequest)
      }
    );

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.text();
      console.error('❌ Claude API エラー:', claudeResponse.status, errorData);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text;

    if (!content) {
      throw new Error('No response from Claude API');
    }

    // JSONをパース（マークダウンコードブロックを除去）
    let jsonContent = content.trim();

    // ```json ... ``` または ``` ... ``` 形式の場合は中身を抽出
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
      console.log('📝 マークダウンコードブロックを除去しました');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ JSONパースエラー。元のコンテンツ:', content.substring(0, 500));
      throw new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    const documentConfidence = parsedResult.confidence || 0;
    const claudeEvents: ClaudeEvent[] = parsedResult.events || [];

    console.log(`📊 解析結果: ドキュメント信頼度=${documentConfidence}, イベント数=${claudeEvents.length}`);

    // ClaudeEventをEventEntryに変換
    const events: EventEntry[] = claudeEvents.map(event => ({
      date: event.date,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      title: event.title,
      location: event.location || undefined,
      description: event.note || undefined,
      confidence: documentConfidence,
      rawText: undefined
    }));

    // ドキュメント全体の信頼度が0.5未満の場合は空配列を返す
    const filteredEvents = documentConfidence >= 0.5 ? events : [];

    if (documentConfidence < 0.5) {
      console.log(`⚠️ ドキュメント信頼度が低いため、イベントを除外しました (${documentConfidence})`);
    }

    const processingTime = (Date.now() - startTime) / 1000;

    const response: AnalysisResponse = {
      events: filteredEvents,
      totalFound: filteredEvents.length,
      processingTime
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Edge Function エラー:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        events: [],
        totalFound: 0,
        processingTime: (Date.now() - startTime) / 1000
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
