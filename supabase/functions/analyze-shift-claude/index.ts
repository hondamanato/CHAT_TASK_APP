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
        'ja': `あなたは画像（シフト表、タイムテーブル、チケット等）からカレンダー用イベントを抽出する専門家です。

**出力形式**（JSON必須、説明文やコードブロック禁止）：
{
  "doc_type": "shift|timetable|ticket|flyer|delivery|medical|other",
  "confidence": 0.0-1.0,
  "events": [
    { "title": "string", "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "location": "string|null", "note": "string|null" }
  ]
}

${userMessage ? `**ユーザー指示**: "${userMessage}"

**ステップ1: 表の構造を理解する**
まず画像の表がどのような構造かを判断してください：
- タイプA（横型）: 名前が横方向（列ヘッダー）に並び、日付が縦方向（行）に並ぶ
  例: | 日付 | 本多 | 田中 | 佐藤 |
      | 1日  | 9-17 | 休  | 10-18 |
      | 2日  | 休  | 9-17 | 9-17 |

- タイプB（縦型）: 名前が縦方向（行ヘッダー）に並び、日付が横方向（列）に並ぶ
  例: | 名前 | 1日  | 2日  | 3日  |
      | 本多 | 9-17 | 休  | 10-18 |
      | 田中 | 休  | 9-17 | 9-17 |

**ステップ2: 名前フィルタリング**
ユーザーメッセージに名前が含まれる場合（例: 「名前は本多」「本多の予定」「本多真翔です」）:
1. 敬称（さん、くん等）を除外して名前を抽出
2. 部分一致OK（「本多」で「本多真翔」にマッチ）
3. タイプAの場合: その名前に一致する**列**のみを縦方向に追跡して抽出
4. タイプBの場合: その名前に一致する**行**のみを横方向に追跡して抽出

**重要な禁止事項**:
- 一致しない名前の列/行は絶対に読み取らない
- 他人のデータを混在させない
- 名前の指定がない場合のみ、全員の予定を抽出

` : ''}**厳格ルール**:
1. **無視するセル**: 空欄/「休」「×」「—」「ｰ」「/」「OFF」
2. **時刻正規化**:
   - 「9-17」「9:00-17:00」「9時〜17時」→ "09:00"-"17:00"
   - 必ずHH:mm形式（ゼロ埋め2桁）
   - startTime < endTime を厳守
   - 深夜勤務（例: 22:00-02:00）は翌日扱いしない、そのまま出力
3. **日付補完**:
   - 年月の記載がない場合: anchorYear=${currentYear}, anchorMonth=${currentMonth}
   - 表のヘッダーから日付を読み取る
   - 曜日のみでは日付を推測しない
4. **信頼度判定**:
   - 表の構造が明確 → confidence: 0.9以上
   - 文字がぼやけている → confidence: 0.6-0.8
   - 判読困難 → confidence: 0.5未満（出力しない）
5. **その他**:
   - タイムゾーン: ${userTimezone}（変換不要）
   - 複数日のイベントは個別に分けて出力
   - 推測が必要な曖昧なデータは除外

**最終チェック**: 有効なJSONのみ出力。余計なテキスト禁止。

**Few-shot例**:
例1) タイプA（横型）のシフト表で「本多」を抽出する場合:
表構造: 名前が列ヘッダー、日付が行
    | 日付 | 本多真翔 | 田中太郎 | 佐藤花子 |
    | 10/1 | 18:00-23:00 | 休 | 09:00-17:00 |
    | 10/2 | 14:00-18:00 | 13:00-18:00 | 休 |
    | 10/3 | 休 | 18:00-22:00 | 10:00-18:00 |

解析手順:
1. 表の構造判定 → タイプA（横型）
2. 名前「本多」に一致する列を特定 → 2列目「本多真翔」
3. その列のみを縦方向に追跡
4. 他の列（田中太郎、佐藤花子）は完全に無視

出力:
{
  "doc_type": "shift",
  "confidence": 0.95,
  "events": [
    { "title": "Shift", "date": "${currentYear}-10-01", "startTime": "18:00", "endTime": "23:00", "location": null, "note": null },
    { "title": "Shift", "date": "${currentYear}-10-02", "startTime": "14:00", "endTime": "18:00", "location": null, "note": null }
  ]
}

注意: 10/3は「休」のため除外。田中・佐藤の列は読み取らない。

例2) タイプB（縦型）のシフト表で「本多」を抽出する場合:
表構造: 名前が行ヘッダー、日付が列
    | 名前 | 10/1 | 10/2 | 10/3 |
    | 本多真翔 | 18:00-23:00 | 14:00-18:00 | 休 |
    | 田中太郎 | 休 | 13:00-18:00 | 18:00-22:00 |

解析手順:
1. 表の構造判定 → タイプB（縦型）
2. 名前「本多」に一致する行を特定 → 2行目「本多真翔」
3. その行のみを横方向に追跡
4. 他の行（田中太郎）は完全に無視

出力:
{
  "doc_type": "shift",
  "confidence": 0.95,
  "events": [
    { "title": "Shift", "date": "${currentYear}-10-01", "startTime": "18:00", "endTime": "23:00", "location": null, "note": null },
    { "title": "Shift", "date": "${currentYear}-10-02", "startTime": "14:00", "endTime": "18:00", "location": null, "note": null }
  ]
}

注意: 10/3は「休」のため除外。田中の行は読み取らない。`,

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

    // Claude 3.5 Sonnet APIリクエスト
    const claudeRequest = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
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
