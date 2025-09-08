-- ユーザープロファイルテーブル
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- カレンダーテーブル
CREATE TABLE calendars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- カレンダーメンバーテーブル
CREATE TABLE calendar_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member')),
  can_invite BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_id, user_id)
);

-- イベントテーブル
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 招待テーブル
CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- プロファイルのポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- カレンダーのポリシー
CREATE POLICY "Users can view their calendars" ON calendars
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT calendar_id FROM calendar_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create calendars" ON calendars
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Calendar owners can update their calendars" ON calendars
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Calendar owners can delete their calendars" ON calendars
  FOR DELETE USING (owner_id = auth.uid());

-- カレンダーメンバーのポリシー
CREATE POLICY "Users can view calendar members" ON calendar_members
  FOR SELECT USING (
    calendar_id IN (
      SELECT id FROM calendars 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT calendar_id FROM calendar_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Calendar members can invite others" ON calendar_members
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT id FROM calendars 
      WHERE owner_id = auth.uid()
    ) OR
    calendar_id IN (
      SELECT calendar_id FROM calendar_members 
      WHERE user_id = auth.uid() AND can_invite = TRUE
    )
  );

-- イベントのポリシー
CREATE POLICY "Users can view events in their calendars" ON events
  FOR SELECT USING (
    user_id = auth.uid() OR
    calendar_id IN (
      SELECT id FROM calendars 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT calendar_id FROM calendar_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (user_id = auth.uid());

-- 招待のポリシー
CREATE POLICY "Users can view invitations they sent or received" ON invitations
  FOR SELECT USING (
    inviter_id = auth.uid() OR 
    invitee_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Calendar members can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT id FROM calendars 
      WHERE owner_id = auth.uid()
    ) OR
    calendar_id IN (
      SELECT calendar_id FROM calendar_members 
      WHERE user_id = auth.uid() AND can_invite = TRUE
    )
  );

-- トリガー関数: updated_atを自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 新規ユーザー登録時にプロファイル自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();