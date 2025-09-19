interface ChatInteraction {
  message: string;
  response: any;
  success: boolean;
  timestamp: Date;
  eventCreated?: {
    type: string;
    timeSlot: string;
    duration: number;
    dayOfWeek: string;
  };
}

interface StatisticalPattern {
  id: string;
  type: 'event_type' | 'time_preference' | 'language_pattern';
  pattern_data: any;
  frequency: number;
  confidence: number;
  last_updated: Date;
}

class PatternAnalysisService {

  // チャットインタラクションから統計的パターンを抽出
  async extractPatterns(interactions: ChatInteraction[]): Promise<StatisticalPattern[]> {
    const patterns: StatisticalPattern[] = [];

    // 1. 予定タイプ分析
    const eventTypePatterns = this.analyzeEventTypes(interactions);
    patterns.push(...eventTypePatterns);

    // 2. 時間帯傾向分析
    const timePatterns = this.analyzeTimePreferences(interactions);
    patterns.push(...timePatterns);

    // 3. 言語パターン分析
    const languagePatterns = this.analyzeLanguagePatterns(interactions);
    patterns.push(...languagePatterns);

    return patterns;
  }

  private analyzeEventTypes(interactions: ChatInteraction[]): StatisticalPattern[] {
    const eventTypeMap = new Map<string, {
      count: number;
      timeSlots: string[];
      durations: number[];
      keywords: Set<string>;
    }>();

    interactions.forEach(interaction => {
      if (interaction.success && interaction.eventCreated) {
        const type = this.categorizeEventType(interaction.message);
        const existing = eventTypeMap.get(type) || {
          count: 0,
          timeSlots: [],
          durations: [],
          keywords: new Set()
        };

        existing.count++;
        existing.timeSlots.push(interaction.eventCreated.timeSlot);
        existing.durations.push(interaction.eventCreated.duration);

        // キーワード抽出
        this.extractKeywords(interaction.message).forEach(keyword =>
          existing.keywords.add(keyword)
        );

        eventTypeMap.set(type, existing);
      }
    });

    return Array.from(eventTypeMap.entries()).map(([type, data]) => ({
      id: `event_type_${type}`,
      type: 'event_type' as const,
      pattern_data: {
        category: type,
        frequency: data.count,
        commonTimeSlots: this.getMostCommon(data.timeSlots),
        averageDuration: data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
        commonKeywords: Array.from(data.keywords).slice(0, 10)
      },
      frequency: data.count,
      confidence: Math.min(data.count / 10, 1), // 10回以上で信頼度最大
      last_updated: new Date()
    }));
  }

  private analyzeTimePreferences(interactions: ChatInteraction[]): StatisticalPattern[] {
    const hourDistribution = new Map<number, number>();
    const dayDistribution = new Map<string, number>();

    interactions.forEach(interaction => {
      if (interaction.success && interaction.eventCreated) {
        const hour = parseInt(interaction.eventCreated.timeSlot.split(':')[0]);
        const day = interaction.eventCreated.dayOfWeek;

        hourDistribution.set(hour, (hourDistribution.get(hour) || 0) + 1);
        dayDistribution.set(day, (dayDistribution.get(day) || 0) + 1);
      }
    });

    const totalEvents = interactions.filter(i => i.success && i.eventCreated).length;

    return [{
      id: 'time_preferences',
      type: 'time_preference' as const,
      pattern_data: {
        hourDistribution: Object.fromEntries(
          Array.from(hourDistribution.entries()).map(([hour, count]) => [
            `${hour.toString().padStart(2, '0')}:00`,
            count / totalEvents
          ])
        ),
        dayOfWeekDistribution: Object.fromEntries(
          Array.from(dayDistribution.entries()).map(([day, count]) => [
            day,
            count / totalEvents
          ])
        )
      },
      frequency: totalEvents,
      confidence: Math.min(totalEvents / 50, 1),
      last_updated: new Date()
    }];
  }

  private analyzeLanguagePatterns(interactions: ChatInteraction[]): StatisticalPattern[] {
    const phraseSuccessMap = new Map<string, { success: number; total: number }>();

    interactions.forEach(interaction => {
      const phrases = this.extractPhrases(interaction.message);
      phrases.forEach(phrase => {
        const existing = phraseSuccessMap.get(phrase) || { success: 0, total: 0 };
        existing.total++;
        if (interaction.success) existing.success++;
        phraseSuccessMap.set(phrase, existing);
      });
    });

    const effectivePhrases = Array.from(phraseSuccessMap.entries())
      .filter(([phrase, stats]) => stats.total >= 3) // 最低3回使用
      .map(([phrase, stats]) => ({
        phrase,
        successRate: stats.success / stats.total,
        frequency: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate);

    return [{
      id: 'language_patterns',
      type: 'language_pattern' as const,
      pattern_data: {
        effectivePhrases: effectivePhrases.slice(0, 20),
        commonSuccessPatterns: effectivePhrases
          .filter(p => p.successRate > 0.8)
          .map(p => p.phrase)
      },
      frequency: interactions.length,
      confidence: Math.min(interactions.length / 100, 1),
      last_updated: new Date()
    }];
  }

  // ヘルパーメソッド
  private categorizeEventType(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('会議') || lowerMessage.includes('ミーティング')) return '会議';
    if (lowerMessage.includes('ランチ') || lowerMessage.includes('昼食')) return 'ランチ';
    if (lowerMessage.includes('買い物') || lowerMessage.includes('ショッピング')) return '買い物';
    if (lowerMessage.includes('病院') || lowerMessage.includes('医者')) return '病院';
    if (lowerMessage.includes('勉強') || lowerMessage.includes('学習')) return '勉強';
    if (lowerMessage.includes('運動') || lowerMessage.includes('ジム')) return '運動';
    if (lowerMessage.includes('仕事') || lowerMessage.includes('作業')) return '仕事';

    return 'その他';
  }

  private extractKeywords(message: string): string[] {
    // 簡単なキーワード抽出（実際にはより高度な自然言語処理を使用）
    return message
      .split(/[\s、。！？]/)
      .filter(word => word.length > 1 && word.length < 10)
      .slice(0, 5);
  }

  private extractPhrases(message: string): string[] {
    // よく使われるフレーズパターンを抽出
    const patterns = [
      /明日の?\d*時/g,
      /来週の?\w曜日/g,
      /今度の?\w曜日/g,
      /\d+時から/g,
      /\d+分間/g
    ];

    const phrases: string[] = [];
    patterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) phrases.push(...matches);
    });

    return phrases;
  }

  private getMostCommon<T>(items: T[]): T[] {
    const frequency = new Map<T, number>();
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item]) => item);
  }

  // パターンをAIプロンプトに統合
  generateEnhancedPrompt(basePrompt: string, patterns: StatisticalPattern[]): string {
    const eventTypePatterns = patterns.filter(p => p.type === 'event_type');
    const timePatterns = patterns.filter(p => p.type === 'time_preference');
    const languagePatterns = patterns.filter(p => p.type === 'language_pattern');

    let enhancedPrompt = basePrompt;

    // 一般的な予定タイプ情報を追加
    if (eventTypePatterns.length > 0) {
      const commonTypes = eventTypePatterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .map(p => p.pattern_data.category);

      enhancedPrompt += `\n\n**一般的な予定タイプ**: ${commonTypes.join(', ')}を参考にしてください。`;
    }

    // 一般的な時間帯傾向を追加
    if (timePatterns.length > 0) {
      const timeData = timePatterns[0].pattern_data;
      const popularHours = Object.entries(timeData.hourDistribution)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([hour]) => hour);

      enhancedPrompt += `\n**人気の時間帯**: ${popularHours.join(', ')}が一般的です。`;
    }

    return enhancedPrompt;
  }
}

export const patternAnalysisService = new PatternAnalysisService();