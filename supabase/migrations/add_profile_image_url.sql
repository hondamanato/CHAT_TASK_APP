-- プロファイルテーブルにプロフィール画像URLカラムを追加

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- プロフィール画像用のStorageバケットを作成（既存の場合はスキップ）
-- Note: Supabase Storageバケットは通常、Supabase Dashboard または RPC で作成します
-- 以下のコメントは参考情報です

/*
Supabase Dashboardで以下の設定を行ってください:

1. Storage > Create bucket
   - Name: profile-images
   - Public: false (プライベート)

2. Policies を設定:
   - ユーザーは自分のプロフィール画像をアップロード可能
   - ユーザーは自分のプロフィール画像を削除可能
   - すべてのユーザーがプロフィール画像を閲覧可能

RLSポリシーの例:
```sql
-- プロフィール画像のアップロード（自分のIDのフォルダにのみ）
CREATE POLICY "Users can upload own profile image"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- プロフィール画像の削除（自分のIDのフォルダのみ）
CREATE POLICY "Users can delete own profile image"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- プロフィール画像の閲覧（すべてのユーザー）
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');
```
*/
