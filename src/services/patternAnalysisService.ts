import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

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

interface AnonymousInteraction {
  interaction_hash: string;
  success: boolean;
  event_type?: string;
  time_slot?: string;
  day_of_week?: string;
  duration_minutes?: number;
  phrase_patterns?: string[];
}

interface PatternLearningSettings {
  enabled: boolean;
  allowDataCollection: boolean;
  shareAnonymousData: boolean;
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
  private userHash: string | null = null;
  private settings: PatternLearningSettings = {
    enabled: true,
    allowDataCollection: true,
    shareAnonymousData: false
  };

  constructor() {
    this.initializeUserHash();
    this.loadSettings();
  }

  // ユーザーの匿名ハッシュIDを初期化
  private async initializeUserHash() {
    try {
      let hash = await AsyncStorage.getItem('pattern_user_hash');
      if (!hash) {
        // 完全に匿名化されたハッシュIDを生成
        hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}_${Math.random()}_${Math.random()}`
        );
        await AsyncStorage.setItem('pattern_user_hash', hash);
      }
      this.userHash = hash;
    } catch (error) {
      console.log('ユーザーハッシュ初期化エラー:', error);
    }
  }

  // 設定の読み込み
  private async loadSettings() {
    try {
      const settingsJson = await AsyncStorage.getItem('pattern_learning_settings');
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.log('パターン学習設定読み込みエラー:', error);
    }
  }

  // 設定の保存
  async updateSettings(newSettings: Partial<PatternLearningSettings>) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem('pattern_learning_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.log('パターン学習設定保存エラー:', error);
    }
  }

  // 現在の設定を取得
  getSettings(): PatternLearningSettings {
    return { ...this.settings };
  }

  // 匿名化されたインタラクションをSupabaseに保存
  async saveAnonymousInteraction(interaction: ChatInteraction) {
    if (!this.settings.enabled || !this.settings.allowDataCollection || !this.userHash) {
      return;
    }

    try {
      const anonymousData: AnonymousInteraction = {
        interaction_hash: this.userHash,
        success: interaction.success,
        event_type: interaction.eventCreated?.type,
        time_slot: interaction.eventCreated?.timeSlot,
        day_of_week: interaction.eventCreated?.dayOfWeek,
        duration_minutes: interaction.eventCreated?.duration,
        phrase_patterns: this.extractPhrases(interaction.message)
      };

      const { error } = await supabase
        .from('anonymous_chat_interactions')
        .insert([anonymousData]);

      if (error) {
        console.log('匿名インタラクション保存エラー:', error);
      } else {
        console.log('📊 パターン学習データを保存しました');
      }
    } catch (error) {
      console.log('匿名インタラクション保存エラー:', error);
    }
  }

  // ユーザー固有のパターンを取得
  async getUserPatterns(): Promise<StatisticalPattern[]> {
    if (!this.settings.enabled || !this.userHash) {
      return [];
    }

    try {
      // 過去30日間のデータを取得
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('anonymous_chat_interactions')
        .select('*')
        .eq('interaction_hash', this.userHash)
        .eq('success', true)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.log('ユーザーパターン取得エラー:', error);
        return [];
      }

      // データをChatInteraction形式に変換して分析
      const interactions: ChatInteraction[] = data.map(item => ({
        message: '', // 実際のメッセージは保存していない
        response: {},
        success: item.success,
        timestamp: new Date(item.created_at),
        eventCreated: item.event_type ? {
          type: item.event_type,
          timeSlot: item.time_slot || '09:00',
          duration: item.duration_minutes || 60,
          dayOfWeek: item.day_of_week || 'monday'
        } : undefined
      }));

      return await this.extractPatterns(interactions);
    } catch (error) {
      console.log('ユーザーパターン取得エラー:', error);
      return [];
    }
  }

  // 全体の統計パターンを取得
  async getGlobalPatterns(): Promise<StatisticalPattern[]> {
    if (!this.settings.enabled) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('get_pattern_insights');

      if (error) {
        console.log('全体パターン取得エラー:', error);
        return [];
      }

      // RPC関数からの結果を StatisticalPattern 形式に変換
      const patterns: StatisticalPattern[] = [];

      if (data?.popular_event_types) {
        data.popular_event_types.forEach((eventType: any, index: number) => {
          patterns.push({
            id: `global_event_type_${eventType.type}`,
            type: 'event_type',
            pattern_data: {
              category: eventType.type,
              frequency: eventType.frequency,
              averageDuration: eventType.avg_duration,
              popularTime: eventType.popular_time
            },
            frequency: eventType.frequency,
            confidence: Math.min(eventType.frequency / 100, 1),
            last_updated: new Date()
          });
        });
      }

      if (data?.time_patterns) {
        const timeData = data.time_patterns.reduce((acc: any, item: any) => {
          acc[item.time_slot] = item.percentage / 100;
          return acc;
        }, {});

        patterns.push({
          id: 'global_time_preferences',
          type: 'time_preference',
          pattern_data: {
            hourDistribution: timeData
          },
          frequency: data.time_patterns.reduce((sum: number, item: any) => sum + item.frequency, 0),
          confidence: 0.8,
          last_updated: new Date()
        });
      }

      return patterns;
    } catch (error) {
      console.log('全体パターン取得エラー:', error);
      return [];
    }
  }

  // 学習データをリセット
  async resetLearningData() {
    try {
      if (this.userHash) {
        const { error } = await supabase
          .from('anonymous_chat_interactions')
          .delete()
          .eq('interaction_hash', this.userHash);

        if (error) {
          console.log('学習データリセットエラー:', error);
        } else {
          console.log('🗑️ 学習データをリセットしました');
        }
      }

      // 新しいハッシュIDを生成
      await AsyncStorage.removeItem('pattern_user_hash');
      await this.initializeUserHash();
    } catch (error) {
      console.log('学習データリセットエラー:', error);
    }
  }

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

  // ユーザー固有のパターンを使ってAIプロンプトを強化
  async generatePersonalizedPrompt(basePrompt: string): Promise<string> {
    if (!this.settings.enabled) {
      return basePrompt;
    }

    try {
      const userPatterns = await this.getUserPatterns();
      const globalPatterns = await this.getGlobalPatterns();

      // ユーザーパターンを優先し、フォールバックとして全体パターンを使用
      const patterns = userPatterns.length > 0 ? userPatterns : globalPatterns;

      return this.generateEnhancedPrompt(basePrompt, patterns, userPatterns.length > 0);
    } catch (error) {
      console.log('パーソナライズプロンプト生成エラー:', error);
      return basePrompt;
    }
  }

  // パターンをAIプロンプトに統合
  generateEnhancedPrompt(basePrompt: string, patterns: StatisticalPattern[], isPersonalized: boolean = false): string {
    const eventTypePatterns = patterns.filter(p => p.type === 'event_type');
    const timePatterns = patterns.filter(p => p.type === 'time_preference');
    const languagePatterns = patterns.filter(p => p.type === 'language_pattern');

    let enhancedPrompt = basePrompt;
    const patternSource = isPersonalized ? 'あなたの習慣' : '一般的な傾向';

    // 予定タイプ情報を追加
    if (eventTypePatterns.length > 0) {
      const commonTypes = eventTypePatterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 3)
        .map(p => {
          const data = p.pattern_data;
          return {
            type: data.category,
            time: data.popularTime || data.commonTimeSlots?.[0],
            duration: Math.round(data.averageDuration || 60)
          };
        });

      if (commonTypes.length > 0) {
        enhancedPrompt += `\n\n**${patternSource}に基づく予定設定**:`;
        commonTypes.forEach(({ type, time, duration }) => {
          if (time) {
            enhancedPrompt += `\n- ${type}: 通常${time}頃、約${duration}分間`;
          }
        });
      }
    }

    // 時間帯傾向を追加
    if (timePatterns.length > 0) {
      const timeData = timePatterns[0].pattern_data;
      if (timeData.hourDistribution) {
        const popularHours = Object.entries(timeData.hourDistribution)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 3)
          .map(([hour, percentage]) => `${hour}(${Math.round((percentage as number) * 100)}%)`);

        if (popularHours.length > 0) {
          enhancedPrompt += `\n\n**${patternSource}の活動時間帯**: ${popularHours.join(', ')}`;
        }
      }
    }

    // 言語パターン情報を追加
    if (languagePatterns.length > 0 && isPersonalized) {
      const effectivePhrases = languagePatterns[0].pattern_data.commonSuccessPatterns;
      if (effectivePhrases && effectivePhrases.length > 0) {
        enhancedPrompt += `\n\n**認識しやすい表現**: ${effectivePhrases.slice(0, 3).join(', ')}`;
      }
    }

    if (isPersonalized && (eventTypePatterns.length > 0 || timePatterns.length > 0)) {
      enhancedPrompt += `\n\n**重要**: 上記はあなたの過去の予定作成パターンです。曖昧な指示の場合は、これらの傾向を参考にして適切な時間や設定を提案してください。`;
    }

    return enhancedPrompt;
  }
}

export const patternAnalysisService = new PatternAnalysisService();