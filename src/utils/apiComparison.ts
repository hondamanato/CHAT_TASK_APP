// APIと固定データの比較
export const compareApproaches = {
  // Calendarific API
  calendarific: {
    pros: [
      '祝日 + 行事 + 記念日 + 宗教的イベント',
      '230ヶ国以上対応',
      '詳細な説明付き',
      '自動更新',
      '高品質データ'
    ],
    cons: [
      '月額$9.99〜$49.99',
      'リクエスト制限',
      'ネットワーク依存',
      'APIキー管理',
      'エラーハンドリング複雑'
    ],
    cost: '$9.99〜$49.99/月',
    complexity: '高'
  },

  // 現在の実装（固定データ）
  fixedData: {
    pros: [
      '無料',
      'リクエスト制限なし',
      'ネットワーク依存なし',
      '即座にレスポンス',
      'カスタマイズ自由',
      'オフライン対応'
    ],
    cons: [
      '手動更新必要',
      'データ範囲限定的',
      '説明文なし',
      '国数制限'
    ],
    cost: '0円/月',
    complexity: '低'
  },

  // 推奨事項
  recommendation: {
    current: '固定データを継続',
    future: 'ユーザー数増加時にCalendarific API検討',
    threshold: '月間10,000ユーザー以上'
  }
};
