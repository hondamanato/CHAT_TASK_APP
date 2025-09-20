-- イベントテーブルに不足しているカラムを追加

-- color カラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#007AFF';

-- location カラムを追加（JSON形式で名前とアドレスを格納）
ALTER TABLE events ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{"name": ""}';

-- notes カラムを追加（description と重複するが、notesとして追加）
-- 既存の description を notes として使用するため、既存カラムを活用

-- reminders カラムを追加（分単位の配列）
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminders INTEGER[] DEFAULT '{}';

-- notification_id カラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS notification_id TEXT;

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);

-- 更新されたテーブル構造の確認用コメント
/*
更新後のeventsテーブル構造:
- id: UUID (PK)
- title: TEXT
- description: TEXT (notes として使用)
- start_date: TIMESTAMPTZ
- end_date: TIMESTAMPTZ
- is_all_day: BOOLEAN
- user_id: UUID (FK)
- calendar_id: UUID (FK, nullable)
- color: TEXT (新規追加)
- location: JSONB (新規追加)
- reminders: INTEGER[] (新規追加)
- notification_id: TEXT (新規追加)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
*/