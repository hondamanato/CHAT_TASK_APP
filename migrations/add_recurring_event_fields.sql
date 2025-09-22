-- 繰り返し予定関連フィールドを追加するマイグレーション

-- parent_event_idフィールドを追加（親イベントのID）
ALTER TABLE events
ADD COLUMN parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- recurrence_series_idフィールドを追加（同じ繰り返しシリーズのID）
ALTER TABLE events
ADD COLUMN recurrence_series_id UUID;

-- is_recurringフィールドを追加（繰り返し予定かどうか）
ALTER TABLE events
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX idx_events_parent_event_id ON events(parent_event_id);
CREATE INDEX idx_events_recurrence_series_id ON events(recurrence_series_id);
CREATE INDEX idx_events_is_recurring ON events(is_recurring);

-- コメントを追加
COMMENT ON COLUMN events.parent_event_id IS '親イベントのID（繰り返し予定の場合）';
COMMENT ON COLUMN events.recurrence_series_id IS '繰り返しシリーズのID（同じシリーズの識別用）';
COMMENT ON COLUMN events.is_recurring IS '繰り返し予定かどうか';