import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { preprocessImageForOCR } from './imagePreprocessor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShiftEntry {
  date: string;
  startTime: string;
  endTime: string;
  workplace?: string;
  matchedName: string;
  confidence: number;
  rawText?: string;
}

interface AnalysisResponse {
  shifts: ShiftEntry[];
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
    const { imageBase64, userName } = await req.json()

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

    if (!userName || userName.trim() === '') {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: userName',
          message: 'ユーザー名を指定してください。'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`📸 GPT-4o Visionでシフト表を解析: ${userName}`);

    // OpenCVで画像を前処理（OCR精度向上のため）
    console.log('🔧 画像前処理を開始...');
    const preprocessed = await preprocessImageForOCR(imageBase64);
    console.log(`✅ 画像前処理完了 (${preprocessed.processingTime}ms)`);

    // 前処理された画像を使用
    const processedImageBase64 = preprocessed.base64;

    // 現在日付を取得
    const currentDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').join('-');

    const currentYear = new Date().getFullYear();

    // GPT-4o Vision用プロンプト
    const prompt = `
あなたはシフト表解析の専門家です。
この画像はシフト表です。以下の手順に従って、ユーザー「${userName}」さんのシフト情報のみを厳格に抽出してください。

【解析手順】
Step 1: シフト表内のすべての従業員名をリストアップする
Step 2: ユーザー名「${userName}」に最も一致する名前を特定する
Step 3: その特定された名前のシフト情報のみを抽出する
Step 4: 他の従業員のシフトが混入していないか再確認する

【名前マッチングのルール（優先順位順）】
1. **完全一致**: 「${userName}」と完全に一致する名前
2. **姓一致**: 「${userName}」が姓として一致（例: 「山田」→「山田太郎」）
3. **名一致**: 「${userName}」が名として一致（例: 「太郎」→「山田太郎」）
4. **表記ゆれ対応**: 漢字 ↔ ひらがな ↔ カタカナ ↔ ローマ字

【厳格な除外ルール】
⚠️ **絶対に守ること**: 指定された名前「${userName}」以外の名前に関連するシフトは一切含めないこと
- 例: 「本多」を探す場合
  - ✅ OK: 「本多」列/行のシフト
  - ❌ NG: 「吉村」「伊都志」「秀平」「米津」などのシフトは絶対に含めない
  - ❌ NG: 似た文字が含まれていても、名前が一致しなければ除外

【信頼度スコア（0-1）の付与基準】
- 0.9-1.0: 名前が完全一致し、日時が明確
- 0.7-0.9: 名前が姓/名一致し、日時が明確
- 0.5-0.7: 名前の表記ゆれがあるが、日時は明確
- 0.5未満: 名前の一致が曖昧、または日時が不明確（これらは除外）

【日付・時刻形式】
- 日付: YYYY-MM-DD形式（年省略時は${currentYear}年を使用、現在日: ${currentDate}）
- 時刻: 24時間表記 HH:MM（「午前」「午後」は変換）

【対応する表形式】
- 縦軸が日付、横軸が担当者
- 縦軸が担当者、横軸が日付
- リスト形式
- その他の混在形式

【出力形式】
以下のJSON形式で返してください。説明文や追加テキストは不要です。

{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "workplace": "勤務場所（あれば）",
      "matchedName": "画像内で見つかった名前表記（必ず${userName}に一致すること）",
      "confidence": 0.95,
      "rawText": "元のテキスト行（OCRで読み取った該当箇所）"
    }
  ]
}

⚠️ 重要: matchedNameは必ず「${userName}」に一致する名前のみを含めること。他の名前のシフトは絶対に含めないこと。
`;

    // GPT-4o Vision APIリクエスト
    const gptRequest = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはシフト表解析の専門家です。画像から正確にシフト情報を抽出します。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${processedImageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    console.log('📤 GPT-4o Vision APIにリクエスト送信...');

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

    console.log('📥 GPT-4o Vision APIからレスポンス受信');

    // JSONをパース
    const parsedResult = JSON.parse(content);
    const shifts = parsedResult.shifts || [];

    // 信頼度0.5未満のシフトを除外
    const filteredShifts = shifts.filter((shift: ShiftEntry) => shift.confidence >= 0.5);

    const processingTime = (Date.now() - startTime) / 1000;

    console.log(`✅ 解析完了: ${filteredShifts.length}件のシフトを検出 (${processingTime.toFixed(2)}s)`);

    const response: AnalysisResponse = {
      shifts: filteredShifts,
      totalFound: filteredShifts.length,
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
        shifts: [],
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
