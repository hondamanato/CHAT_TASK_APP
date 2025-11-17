import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "zod";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zodスキーマ定義
const recurrenceSchema = z.object({
  type: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom']),
  interval: z.number().optional(),
  unit: z.enum(['day', 'week', 'month', 'year']).optional(),
  endCondition: z.enum(['never', 'date', 'count']),
  endDate: z.string().optional(),
  endCount: z.number().optional(),
  weekdays: z.array(z.number()).optional(),
  monthlyOption: z.enum(['same-date', 'same-weekday']).optional(),
});

const eventSchema = z.object({
  date: z.string().describe('イベントの日付 (YYYY-MM-DD形式)'),
  endDate: z.string().optional().describe('複数日イベントの終了日（オプション）'),
  startTime: z.string().describe('開始時刻 (HH:mm形式)'),
  endTime: z.string().describe('終了時刻 (HH:mm形式)'),
  title: z.string().describe('イベントのタイトル'),
  description: z.string().optional().describe('イベントの詳細'),
  isAllDay: z.boolean().optional().describe('終日イベントかどうか'),
  notes: z.string().optional().describe('メモ'),
  workplace: z.string().optional().describe('勤務場所'),
  color: z.string().optional().describe('イベントの色（カラーコード）'),
  recurrence: recurrenceSchema.optional().describe('繰り返し設定'),
  reminders: z.array(z.number()).optional().describe('リマインダー（分単位の配列）'),
});

const keywordsSchema = z.object({
  date: z.string().optional().describe('検索対象の日付 (YYYY-MM-DD)'),
  startDate: z.string().optional().describe('検索期間の開始日 (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('検索期間の終了日 (YYYY-MM-DD)'),
  title: z.string().optional().describe('検索対象のタイトルキーワード'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { messages, existingEvents } = await req.json();

    // 現在の日時を取得
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

    // 既存イベントのコンテキスト
    const existingEventsContext = existingEvents && existingEvents.length > 0
      ? `\n\n既存のイベントリスト:\n${JSON.stringify(existingEvents, null, 2)}`
      : '';

    // システムプロンプト
    const systemPrompt = `あなたはAIカレンダーアシスタントです。

**現在の日時（日本時間）**: ${currentDate} ${currentTime}
**明日の日付**: ${tomorrowDate}
${existingEventsContext}

以下のツールを使用して、ユーザーのリクエストを処理してください:

1. **createEvent**: カレンダーにイベントを作成
2. **deleteEvent**: イベントを削除（日付とタイトルで検索）
3. **updateEvent**: イベントを更新（日付とタイトルで検索して更新）
4. **searchEvents**: イベントを検索（期間とタイトルで検索）
5. **analyzeImage**: 画像からイベントを抽出（シフト表、チケットなど）

**重要なルール**:
- 相対的な日時表現を具体的な日付に変換（「明日」→${tomorrowDate}、「今日」→${currentDate}）
- 複数日にわたる予定は1つのイベントとして生成（endDateを使用）
- 時刻の正確な解析（「15時」→"15:00"、「9時」→"09:00"）
- 終了時間が未指定の場合は開始時間+1時間
- 繰り返し予定は recurrence フィールドを使用
- 色指定は適切なカラーコードに変換
- リマインダーは分単位の配列で設定

**会話履歴の扱い**:
- 前の会話から人名や固有名詞を勝手に使わない
- タイトルは現在のメッセージのみから抽出

自然な日本語で丁寧に応答してください。`;

    // ツール定義
    const tools = {
      createEvent: tool({
        description: 'カレンダーにイベントを作成します。単一または複数のイベントを作成できます。',
        parameters: z.object({
          events: z.array(eventSchema).describe('作成するイベントのリスト'),
          message: z.string().describe('ユーザーへの確認メッセージ'),
        }),
        execute: async ({ events, message }) => {
          console.log('✅ createEvent called:', { eventsCount: events.length, message });
          return {
            success: true,
            events,
            message,
          };
        },
      }),

      deleteEvent: tool({
        description: 'イベントを削除します。日付とタイトルのキーワードで検索します。',
        parameters: z.object({
          keywords: keywordsSchema.describe('削除するイベントの検索条件'),
          message: z.string().describe('ユーザーへの確認メッセージ'),
        }),
        execute: async ({ keywords, message }) => {
          console.log('✅ deleteEvent called:', { keywords, message });
          return {
            success: true,
            keywords,
            message,
          };
        },
      }),

      updateEvent: tool({
        description: 'イベントを更新します。日付とタイトルで検索して、新しい情報で更新します。',
        parameters: z.object({
          keywords: keywordsSchema.describe('更新するイベントの検索条件'),
          event: eventSchema.describe('更新後のイベントデータ'),
          message: z.string().describe('ユーザーへの確認メッセージ'),
        }),
        execute: async ({ keywords, event, message }) => {
          console.log('✅ updateEvent called:', { keywords, event, message });
          return {
            success: true,
            keywords,
            event,
            message,
          };
        },
      }),

      searchEvents: tool({
        description: 'イベントを検索します。期間とタイトルのキーワードで検索できます。',
        parameters: z.object({
          keywords: keywordsSchema.describe('検索条件（startDate, endDate, title）'),
          message: z.string().describe('ユーザーへのメッセージ'),
        }),
        execute: async ({ keywords, message }) => {
          console.log('✅ searchEvents called:', { keywords, message });
          return {
            success: true,
            keywords,
            message,
          };
        },
      }),

      analyzeImage: tool({
        description: '画像からイベントを抽出します（シフト表、チケット、イベント表など）。',
        parameters: z.object({
          imageBase64: z.string().describe('Base64エンコードされた画像データ'),
          userMessage: z.string().optional().describe('ユーザーのメッセージ（名前など）'),
          message: z.string().describe('ユーザーへのメッセージ'),
        }),
        execute: async ({ imageBase64, userMessage, message }) => {
          console.log('✅ analyzeImage called:', { hasImage: !!imageBase64, userMessage, message });
          
          try {
            // 既存のanalyze-shift-claude Edge Functionを呼び出し
            const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-shift-claude`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
              },
              body: JSON.stringify({
                imageBase64,
                userMessage,
                timezone: 'Asia/Tokyo',
                locale: 'ja',
              }),
            });

            if (!response.ok) {
              throw new Error(`Image analysis failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Image analysis completed:', { totalFound: result.totalFound });

            return {
              success: true,
              events: result.events,
              totalFound: result.totalFound,
              message,
            };
          } catch (error) {
            console.error('❌ Image analysis error:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              message: '画像の解析中にエラーが発生しました。',
            };
          }
        },
      }),
    };

    // Gemini APIでストリーミング生成
    const result = streamText({
      model: google('gemini-2.5-flash', {
        apiKey: GEMINI_API_KEY,
      }),
      messages,
      system: systemPrompt,
      tools,
      maxSteps: 5, // 最大5ステップまでツール呼び出しを許可
      temperature: 0.2,
    });

    // ストリーミングレスポンスを返す
    return result.toDataStreamResponse({
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

