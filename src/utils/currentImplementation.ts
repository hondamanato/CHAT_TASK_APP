// 現在の実装（12ヶ国）- 管理しやすい
export const currentCountryEvents = {
  'JP': [
    { name: 'Christmas', localName: 'クリスマス', date: '12-25', type: 'religious' },
    { name: 'Obon', localName: 'お盆', date: '08-15', type: 'cultural' },
    { name: 'Valentine\'s Day', localName: 'バレンタインデー', date: '02-14', type: 'cultural' },
    { name: 'White Day', localName: 'ホワイトデー', date: '03-14', type: 'cultural' },
    { name: 'Tanabata', localName: '七夕', date: '07-07', type: 'cultural' }
  ],
  'US': [
    { name: 'Christmas', localName: 'クリスマス', date: '12-25', type: 'religious' },
    { name: 'Thanksgiving', localName: '感謝祭', date: '11-28', type: 'cultural' },
    { name: 'Halloween', localName: 'ハロウィン', date: '10-31', type: 'cultural' },
    { name: 'Independence Day', localName: '独立記念日', date: '07-04', type: 'national' },
    { name: 'Valentine\'s Day', localName: 'バレンタインデー', date: '02-14', type: 'cultural' }
  ],
  // ... 他の10ヶ国
};

// 管理の容易さ
const managementComplexity = {
  countries: 12,
  totalEvents: 60,
  maintenanceEffort: '低',
  accuracy: '高',
  culturalCoverage: '主要国のみ'
};
