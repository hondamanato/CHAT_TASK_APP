import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数から認証情報を取得
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ユーザー認証トークンを取得
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '認証が必要です' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // ユーザークライアント（認証確認用）
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // 現在のユーザーを取得（認証確認）
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'ユーザー認証に失敗しました' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const userId = user.id

    // 管理者クライアント（削除用）
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`アカウント削除開始: ユーザーID ${userId}`)

    // 1. カレンダーデータを削除
    const { error: calendarsError } = await supabaseAdmin
      .from('calendars')
      .delete()
      .eq('owner_id', userId)

    if (calendarsError) {
      console.warn('カレンダー削除エラー:', calendarsError)
    }

    // 2. イベントデータを削除
    const { error: eventsError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('user_id', userId)

    if (eventsError) {
      console.warn('イベント削除エラー:', eventsError)
    }

    // 3. カレンダーメンバーシップを削除
    const { error: membersError } = await supabaseAdmin
      .from('calendar_members')
      .delete()
      .eq('user_id', userId)

    if (membersError) {
      console.warn('カレンダーメンバー削除エラー:', membersError)
    }

    // 4. 招待データを削除
    const { error: invitationsError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('inviter_id', userId)

    if (invitationsError) {
      console.warn('招待データ削除エラー:', invitationsError)
    }

    // 5. プロフィールデータを削除
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.warn('プロフィール削除エラー:', profileError)
    }

    // 6. Supabase Authからユーザーを完全削除（管理者権限）
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('ユーザー削除エラー:', deleteUserError)
      return new Response(
        JSON.stringify({
          error: 'ユーザーアカウントの削除に失敗しました',
          details: deleteUserError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`✅ アカウント削除完了: ユーザーID ${userId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'アカウントとすべてのデータが正常に削除されました'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('アカウント削除処理エラー:', error)
    return new Response(
      JSON.stringify({
        error: 'アカウント削除中にエラーが発生しました',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
