-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their calendars" ON calendars;
DROP POLICY IF EXISTS "Users can view calendar members" ON calendar_members;
DROP POLICY IF EXISTS "Calendar members can invite others" ON calendar_members;

-- カレンダーのSELECTポリシーを簡略化（オーナーのみ）
CREATE POLICY "Users can view their own calendars" ON calendars
  FOR SELECT USING (owner_id = auth.uid());

-- カレンダーメンバーのSELECTポリシーを簡略化
CREATE POLICY "Users can view calendar members of their calendars" ON calendar_members
  FOR SELECT USING (
    calendar_id IN (
      SELECT id FROM calendars WHERE owner_id = auth.uid()
    )
  );

-- カレンダーメンバーのINSERTポリシーを簡略化（オーナーのみが招待可能）
CREATE POLICY "Calendar owners can invite members" ON calendar_members
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT id FROM calendars WHERE owner_id = auth.uid()
    )
  );