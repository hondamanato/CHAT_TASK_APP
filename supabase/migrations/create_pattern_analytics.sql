-- 統計的パターン分析用テーブル

-- 匿名化されたチャットインタラクション（統計目的のみ）
CREATE TABLE anonymous_chat_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 完全に匿名化されたデータ
  interaction_hash TEXT NOT NULL, -- ハッシュ化されたID
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 統計分析用の抽出データ（個人情報なし）
  event_type TEXT, -- "会議", "ランチ", "買い物" など
  time_slot TEXT, -- "09:00", "12:00" など
  day_of_week TEXT, -- "monday", "tuesday" など
  duration_minutes INTEGER,
  phrase_patterns TEXT[], -- 成功したフレーズパターン

  -- インデックス用
  date_bucket DATE GENERATED ALWAYS AS (DATE_TRUNC('day', created_at)::DATE) STORED
);

-- 抽出された統計パターン
CREATE TABLE statistical_patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('event_type', 'time_preference', 'language_pattern')),

  -- パターンデータ（JSON形式）
  pattern_data JSONB NOT NULL,

  -- 統計情報
  frequency INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),

  -- メタデータ
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パターン使用ログ（どのパターンがAI改善に効果的か追跡）
CREATE TABLE pattern_effectiveness (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_id TEXT REFERENCES statistical_patterns(id),

  -- 効果測定
  usage_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,

  -- 時期による効果の変化を追跡
  measurement_period DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_anonymous_interactions_type ON anonymous_chat_interactions(event_type);
CREATE INDEX idx_anonymous_interactions_time ON anonymous_chat_interactions(time_slot);
CREATE INDEX idx_anonymous_interactions_date ON anonymous_chat_interactions(date_bucket);
CREATE INDEX idx_statistical_patterns_type ON statistical_patterns(pattern_type);
CREATE INDEX idx_pattern_effectiveness_pattern ON pattern_effectiveness(pattern_id);

-- RLS（Row Level Security）設定
ALTER TABLE anonymous_chat_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_effectiveness ENABLE ROW LEVEL SECURITY;

-- 読み取り専用ポリシー（統計データは誰でも参照可能）
CREATE POLICY "Statistical patterns are readable by all authenticated users"
ON statistical_patterns FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anonymous interactions are readable for analytics"
ON anonymous_chat_interactions FOR SELECT
TO authenticated
USING (true);

-- 管理者のみ書き込み可能
CREATE POLICY "Only service role can insert patterns"
ON statistical_patterns FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can update patterns"
ON statistical_patterns FOR UPDATE
TO service_role
USING (true);

-- 分析用ビュー
CREATE VIEW popular_event_types AS
SELECT
  event_type,
  COUNT(*) as frequency,
  AVG(duration_minutes) as avg_duration,
  MODE() WITHIN GROUP (ORDER BY time_slot) as popular_time
FROM anonymous_chat_interactions
WHERE success = true AND event_type IS NOT NULL
GROUP BY event_type
HAVING COUNT(*) >= 5  -- 最低5回以上の使用
ORDER BY frequency DESC;

CREATE VIEW time_usage_patterns AS
SELECT
  time_slot,
  day_of_week,
  event_type,
  COUNT(*) as frequency,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM anonymous_chat_interactions
WHERE success = true
GROUP BY time_slot, day_of_week, event_type
ORDER BY frequency DESC;

-- 集約用関数
CREATE OR REPLACE FUNCTION get_pattern_insights()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'popular_event_types', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', event_type,
          'frequency', frequency,
          'avg_duration', avg_duration,
          'popular_time', popular_time
        )
      )
      FROM popular_event_types
      LIMIT 10
    ),
    'time_patterns', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'time_slot', time_slot,
          'frequency', frequency,
          'percentage', percentage
        )
      )
      FROM time_usage_patterns
      WHERE day_of_week IS NOT NULL
      LIMIT 20
    ),
    'last_updated', NOW()
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;