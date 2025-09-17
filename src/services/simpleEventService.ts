// 現在の簡潔な実装例
export class SimpleEventService {
  // 固定データ（変更不要）
  private static readonly countryEvents = {
    JP: [
      { name: 'Christmas', localName: 'クリスマス', date: '12-25', color: '#4ecdc4', type: 'religious' },
      { name: 'Obon', localName: 'お盆', date: '08-15', color: '#4ecdc4', type: 'cultural' },
      { name: 'Valentine\'s Day', localName: 'バレンタインデー', date: '02-14', color: '#ff6b9d', type: 'cultural' }
    ],
    US: [
      { name: 'Christmas', localName: 'クリスマス', date: '12-25', color: '#4ecdc4', type: 'religious' },
      { name: 'Thanksgiving', localName: '感謝祭', date: '11-28', color: '#ff8c42', type: 'cultural' },
      { name: 'Halloween', localName: 'ハロウィン', date: '10-31', color: '#ff6b35', type: 'cultural' }
    ]
  };

  // シンプルな取得関数
  getEvents(country: string, year: number) {
    const events = SimpleEventService.countryEvents[country as keyof typeof SimpleEventService.countryEvents] || [];

    return events.map((event: any) => ({
      ...event,
      date: `${year}-${event.date}`
    }));
  }

  // エラーハンドリング不要
  // レート制限なし
  // キャッシュ不要
  // ネットワーク依存なし
}
