-- タイムゾーンと繰り返し設定カラムを追加

-- timezone カラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS timezone TEXT;

-- recurrence_type カラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_type TEXT;

-- recurrence_settings カラムを追加（JSON形式で繰り返し設定を格納）
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_settings JSONB;

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_events_recurrence_type ON events(recurrence_type);

-- 更新されたテーブル構造の確認用コメント
/*
タイムゾーンと繰り返し設定追加後のeventsテーブル構造:
- timezone: TEXT (タイムゾーン名)
- recurrence_type: TEXT (繰り返しタイプ: none, daily, weekly, monthly, yearly, custom)
- recurrence_settings: JSONB (繰り返し設定の詳細: interval, unit, endCondition, weekdays, monthlyOption等)
*/