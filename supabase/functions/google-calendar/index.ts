// supabase/functions/google-calendar/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Google Calendar Edge Function 開始');
    
    const { countryCode, year } = await req.json()
    console.log(`リクエスト: countryCode=${countryCode}, year=${year}`);
    
    // Google Calendar APIキーを環境変数から取得（フォールバック付き）
    let apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY')
    console.log('環境変数からAPIキー取得:', apiKey ? '成功' : '失敗');
    
    // 環境変数が設定されていない場合は、直接指定（開発用）
    if (!apiKey) {
      apiKey = 'AIzaSyDRnQehL2pRc3BduK5n7B1nxnEU0EHNWis' // 実際のGoogle Calendar APIキーを設定
      console.warn('環境変数からAPIキーを取得できませんでした。直接指定されたキーを使用します。')
    }
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_CALENDAR_API_KEY_HERE') {
      throw new Error('Google Calendar APIキーが設定されていません。Supabaseダッシュボードで環境変数を設定するか、コード内のAPIキーを更新してください。')
    }

    // 国別の公開祝日カレンダーID
    const calendarIds: { [key: string]: string } = {
      'JP': 'ja.japanese#holiday@group.v.calendar.google.com',
      'US': 'en.usa#holiday@group.v.calendar.google.com',
      'GB': 'en.uk#holiday@group.v.calendar.google.com',
      'FR': 'fr.french#holiday@group.v.calendar.google.com',
      'DE': 'de.german#holiday@group.v.calendar.google.com',
      'IT': 'it.italian#holiday@group.v.calendar.google.com',
      'ES': 'es.spanish#holiday@group.v.calendar.google.com',
      'CA': 'en.canadian#holiday@group.v.calendar.google.com',
      'AU': 'en.australian#holiday@group.v.calendar.google.com',
      'KR': 'ko.south_korean#holiday@group.v.calendar.google.com',
      'CN': 'zh.chinese#holiday@group.v.calendar.google.com',
      'BR': 'pt.brazilian#holiday@group.v.calendar.google.com'
    }

    const calendarId = calendarIds[countryCode] || calendarIds['JP']
    console.log(`カレンダーID: ${calendarId}`);
    
    const startDate = new Date(year, 0, 1).toISOString()
    const endDate = new Date(year, 11, 31).toISOString()
    console.log(`期間: ${startDate} から ${endDate}`);
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${startDate}&timeMax=${endDate}&singleEvents=true&orderBy=startTime`
    console.log('Google Calendar API URL:', url);
    
    const response = await fetch(url)
    console.log('Google Calendar API レスポンス:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Calendar API エラー詳細:', errorText);
      throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`Google Calendar API データ: ${data.items?.length || 0} 件の祝日`);
    
    // 祝日データを変換
    const holidays = data.items?.map((item: any) => ({
      date: item.start.date,
      localName: item.summary,
      name: item.summary,
      countryCode: countryCode,
      fixed: false,
      global: false,
      counties: null,
      launchYear: null,
      types: ['public']
    })) || []

    console.log(`変換後の祝日データ: ${holidays.length} 件`);

    return new Response(
      JSON.stringify({ holidays }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Edge Function エラー:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
