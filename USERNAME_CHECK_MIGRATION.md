# ユーザーネームチェック機能のマイグレーション手順

## 問題
新規登録時のユーザーネーム入力画面で、どんなユーザーネームを入力しても「既に使用されています」と表示される問題がありました。

## 原因
- `profiles`テーブルのRLSポリシーにより、未認証ユーザーは`profiles`テーブルを読み取れない
- ユーザーネームの重複チェックには`profiles`テーブルへの読み取りアクセスが必要

## 解決策
セキュアなRPC関数`check_username_available`を作成し、他のプロフィール情報を公開せずにユーザーネームの存在チェックのみを行えるようにしました。

## マイグレーション適用方法

### オプション1: Supabase CLIを使用（推奨）

```bash
# Supabaseにログイン（まだの場合）
npx supabase login

# プロジェクトにリンク（まだの場合）
npx supabase link --project-ref YOUR_PROJECT_REF

# マイグレーションを適用
npx supabase db push
```

### オプション2: Supabase Dashboardから手動適用

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択
4. 以下のSQLを実行:

```sql
-- Allow anonymous users to check username availability
-- This migration creates a secure RPC function for checking username availability
-- without exposing other profile data

-- Create a function to check if a username is available
-- This function bypasses RLS and only returns a boolean
CREATE OR REPLACE FUNCTION check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if username doesn't exist, false if it does
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = username_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon, authenticated;

-- Add a comment for documentation
COMMENT ON FUNCTION check_username_available(TEXT) IS 
'Securely checks if a username is available without exposing other profile data. Returns true if available, false if taken. Can be called by anonymous users during signup.';
```

5. 「Run」ボタンをクリック

## 確認方法

マイグレーション適用後、アプリを再起動して以下をテスト:

1. 新規登録フローを開始
2. メールアドレスを入力してOTP画面へ
3. OTPを入力して認証
4. パスワードを設定
5. ユーザーネーム入力画面で適当な英数字を入力
6. ✅ 未使用のユーザーネームなら「利用可能」と表示される
7. ✅ 既に使用されているユーザーネームなら「既に使用されています」と表示される

## 技術的な詳細

### 変更されたファイル:

1. **`supabase/migrations/allow_username_check.sql`** (新規作成)
   - `check_username_available` RPC関数を定義
   - 匿名ユーザーと認証済みユーザーに実行権限を付与

2. **`src/services/authService.ts`**
   - `checkUsernameAvailability`メソッドを修正
   - 従来の`.select()`クエリから`.rpc()`呼び出しに変更
   - より詳細なログ出力を追加

### セキュリティ上の利点:

- ✅ ユーザーネームの存在チェックのみを許可
- ✅ 他のプロフィール情報（名前、メールなど）は公開されない
- ✅ SECURITY DEFINER により、関数はRLSをバイパスして安全にチェックを実行
- ✅ 匿名ユーザーでもアクセス可能（新規登録時に必要）

## トラブルシューティング

### マイグレーション適用後もエラーが出る場合:

1. Supabaseプロジェクトが正しく設定されているか確認
2. `.env`ファイルに正しいSupabase URLとAPIキーが設定されているか確認
3. アプリを完全に再起動（キャッシュクリア）
4. Supabase Dashboardの「SQL Editor」で以下を実行して関数が作成されているか確認:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'check_username_available';
```

結果が返ってこない場合は、マイグレーションが正しく適用されていません。

