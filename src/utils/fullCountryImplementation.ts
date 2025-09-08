// 全200ヶ国の実装 - 管理が複雑
export const allCountryEvents = {
  // 主要国（現在の12ヶ国）
  // 'JP': [], 'US': [], 'GB': [], 'FR': [], 'DE': [], 'IT': [],
  // 'ES': [], 'CA': [], 'AU': [], 'KR': [], 'CN': [], 'BR': [],
  
  // その他の国（188ヶ国）
  'AF': [ // アフガニスタン
    { name: 'Nowruz', localName: 'ノウルーズ', date: '03-21', type: 'cultural' },
    { name: 'Eid al-Fitr', localName: 'イード・アル・フィトル', date: '04-21', type: 'religious' }
  ],
  'AL': [ // アルバニア
    { name: 'Independence Day', localName: '独立記念日', date: '11-28', type: 'national' },
    { name: 'Flag Day', localName: '国旗の日', date: '11-28', type: 'national' }
  ],
  'DZ': [ // アルジェリア
    { name: 'Independence Day', localName: '独立記念日', date: '07-05', type: 'national' },
    { name: 'Revolution Day', localName: '革命記念日', date: '11-01', type: 'national' }
  ],
  // ... 残り185ヶ国
};

// 管理の複雑さ
const managementComplexity = {
  countries: 200,
  totalEvents: 1000,
  maintenanceEffort: '非常に高',
  accuracy: '低（一部の国）',
  culturalCoverage: '全世界',
  dataQuality: '不均一'
};
