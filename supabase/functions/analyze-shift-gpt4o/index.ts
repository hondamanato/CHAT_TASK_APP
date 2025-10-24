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
    // 環境変数からOpenAI APIキーを取得
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
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

    console.log(`📸 GPT-4o Visionで画像を解析 (${userLocale}, ${userTimezone})${userMessage ? ` - メッセージ: ${userMessage}` : ''}`);

    // 現在日付を取得（ユーザーのタイムゾーンで）
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 多言語プロンプト生成関数
    const generatePrompt = (locale: string, userMessage?: string) => {
      const prompts: { [key: string]: string } = {
        'ja': `あなたは画像（表やチケット、フライヤー等）からカレンダー用イベントを抽出するアシスタントです。
出力は必ず次のJSONのみ（説明文やコードブロックは禁止）：
{
  "doc_type": "shift|timetable|ticket|flyer|delivery|medical|other",
  "confidence": 0.0-1.0,
  "events": [
    { "title": "string", "date": "YYYY-MM-DD", "start": "HH:mm|null", "end": "HH:mm|null", "location": "string|null", "note": "string|null" }
  ]
}

${userMessage ? `ユーザーメッセージ: "${userMessage}"

名前抽出ルール:
- ユーザーメッセージから名前が明示されている場合（例: 「名前は本多」「本多の予定」「本多です」「本多さん」）、その人の予定のみ抽出。
- 名前の指定がない場合は、すべてのイベントを抽出。
- 「です」「さん」などの敬称・助動詞は名前から除外。

` : ''}厳格ルール：
- 空欄/「休」「×」「—」「ｰ」「/」は無視（出力しない）。
- 9-17 / 9:00-17:00 / 9時〜17時 などの揺れは HH:mm に正規化し、start < end を満たすこと。
- 年や月が欠ける場合は anchorYear=${currentYear}, anchorMonth=${currentMonth} を用いて YYYY-MM-DD に補完（曜日だけでは補わない）。
- 推測が必要な曖昧セルは除外（出力しない）。
- タイムゾーンは ${userTimezone} 前提で時刻をそのまま扱う（変換しない）。
- 画像内に複数日がある場合はイベントを複数要素で返す。
- 最終出力は有効なJSONのみ。余計な文字やコメントは禁止。`,

        'en': `You are an assistant that extracts calendar events from images (tables, tickets, flyers, etc.).
Output ONLY the following JSON (no explanations or code blocks):
{
  "doc_type": "shift|timetable|ticket|flyer|delivery|medical|other",
  "confidence": 0.0-1.0,
  "events": [
    { "title": "string", "date": "YYYY-MM-DD", "start": "HH:mm|null", "end": "HH:mm|null", "location": "string|null", "note": "string|null" }
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

    // GPT-4o Vision APIリクエスト
    const gptRequest = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'スケジュール情報をjson形式で抽出します。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: 'json_object' }
    };

    const gptResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(gptRequest)
      }
    );

    if (!gptResponse.ok) {
      const errorData = await gptResponse.text();
      console.error('❌ GPT-4o Vision API エラー:', gptResponse.status, errorData);
      throw new Error(`GPT-4o Vision API error: ${gptResponse.status}`);
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from GPT-4o Vision API');
    }

    // JSONをパース
    const parsedResult = JSON.parse(content);
    const documentConfidence = parsedResult.confidence || 0;
    const events = parsedResult.events || [];

    console.log(`📊 解析結果: ドキュメント信頼度=${documentConfidence}, イベント数=${events.length}`);

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
