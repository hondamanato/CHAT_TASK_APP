import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestBody = await req.json()
    const { contentType, prompt, imageBase64 } = requestBody

    // Gemini API のストリーミングURL
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent'

    // リクエストボディを構築
    const geminiRequestBody: any = {
      contents: [
        {
          parts: []
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      }
    }

    // contentTypeに応じて処理を分岐
    if (contentType === 'image' && imageBase64) {
      // 画像解析の場合
      geminiRequestBody.contents[0].parts.push(
        {
          text: prompt || '画像を解析してイベント情報を抽出してください'
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        }
      )
    } else {
      // テキストチャットの場合
      geminiRequestBody.contents[0].parts.push({
        text: prompt
      })
    }

    // Gemini APIにストリーミングリクエストを送信
    const response = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gemini API Error:', response.status, errorData)
      return new Response(
        JSON.stringify({
          error: `Gemini API error: ${response.status}`,
          details: errorData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Server-Sent Events (SSE) 形式でストリーミングレスポンスを返す
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response body')
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // 最終的なメッセージを送信
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            // チャンクをデコード
            buffer += decoder.decode(value, { stream: true })
            
            // 改行で分割して各メッセージを処理
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // 最後の不完全な行は保持

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6) // "data: " を削除
                
                if (jsonStr.trim()) {
                  try {
                    const data = JSON.parse(jsonStr)
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                    
                    if (text) {
                      // テキストチャンクをSSE形式で送信
                      const sseMessage = `data: ${JSON.stringify({ text })}\n\n`
                      controller.enqueue(new TextEncoder().encode(sseMessage))
                    }
                  } catch (parseError) {
                    console.error('JSON parse error:', parseError)
                    // パースエラーは無視して続行
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          const errorMessage = `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
          controller.enqueue(new TextEncoder().encode(errorMessage))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })

  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

