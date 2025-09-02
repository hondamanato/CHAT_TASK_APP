// パフォーマンステスト用のデータ
export const createLargeEventDataset = () => {
  const countries = ['JP', 'US', 'GB', 'FR', 'DE', 'IT', 'ES', 'CA', 'AU', 'KR', 'CN'];
  const events = [];
  
  // 200ヶ国 × 10行事 = 2,000行事のシミュレーション
  for (let i = 0; i < 200; i++) {
    const countryCode = `C${i.toString().padStart(3, '0')}`;
    for (let j = 0; j < 10; j++) {
      events.push({
        name: `Event${j}`,
        localName: `イベント${j}`,
        date: `${(j % 12 + 1).toString().padStart(2, '0')}-${(j % 28 + 1).toString().padStart(2, '0')}`,
        color: '#ff6b6b',
        type: 'cultural',
        countryCode
      });
    }
  }
  
  return events;
};

// パフォーマンステスト
export const performanceTest = () => {
  console.time('固定データ処理');
  
  const events = createLargeEventDataset();
  const year = 2025;
  const eventsByDate: { [date: string]: any[] } = {};
  
  // 年別処理
  events.forEach(event => {
    const dateKey = `${year}-${event.date}`;
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });
  
  console.timeEnd('固定データ処理');
  console.log(`処理した行事数: ${events.length}`);
  console.log(`生成された日付キー数: ${Object.keys(eventsByDate).length}`);
  
  return eventsByDate;
};
