import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// トークンキャッシュ
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * WeatherKit API用のJWTトークンを生成
 */
async function generateWeatherKitToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // キャッシュされたトークンが有効な場合はそれを返す
  if (cachedToken && tokenExpiry > now + 60) {
    return cachedToken;
  }

  const keyId = Deno.env.get('WEATHERKIT_KEY_ID');
  const teamId = Deno.env.get('WEATHERKIT_TEAM_ID');
  const privateKeyPem = Deno.env.get('WEATHERKIT_PRIVATE_KEY');
  const serviceId = 'com.aicalendarapp.tapless';

  if (!keyId || !teamId || !privateKeyPem) {
    throw new Error('WeatherKit credentials not configured');
  }

  // 秘密鍵をインポート
  const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');

  // JWTを生成（有効期限: 1時間）
  const exp = now + 3600;

  const jwt = await new jose.SignJWT({
    sub: serviceId,
  })
    .setProtectedHeader({
      alg: 'ES256',
      kid: keyId,
      id: `${teamId}.${serviceId}`,
    })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);

  // キャッシュを更新
  cachedToken = jwt;
  tokenExpiry = exp;

  console.log('[WeatherKit] JWTトークン生成成功');
  return jwt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, long, timezone } = await req.json();

    if (lat === undefined || long === undefined) {
      return new Response(
        JSON.stringify({ error: 'lat and long are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // JWTトークンを生成
    const token = await generateWeatherKitToken();

    // WeatherKit REST API エンドポイント
    const language = 'ja';
    const dataSets = 'forecastDaily';
    const tz = timezone || 'Asia/Tokyo';
    const url = `https://weatherkit.apple.com/api/v1/weather/${language}/${lat}/${long}?dataSets=${dataSets}&timezone=${encodeURIComponent(tz)}`;

    console.log('[WeatherKit] API呼び出し:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WeatherKit] APIエラー:', response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `WeatherKit API error: ${response.status}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

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
    )
  }
})
