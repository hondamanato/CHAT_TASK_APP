import React, { useState, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChartBarIcon,
  TrashIcon,
  InformationCircleIcon,
  AcademicCapIcon
} from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';
import { patternAnalysisService } from '@/src/services/patternAnalysisService';

interface PatternLearningSettingsProps {
  onClose: () => void;
}

export const PatternLearningSettings: React.FC<PatternLearningSettingsProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState({
    enabled: true,
    allowDataCollection: true,
    shareAnonymousData: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // 設定の初期化
  useEffect(() => {
    const loadSettings = async () => {
      const currentSettings = patternAnalysisService.getSettings();
      setSettings(currentSettings);
    };
    loadSettings();
  }, []);

  // 設定を更新
  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    try {
      setIsLoading(true);
      const newSettings = { ...settings, [key]: value };

      // enabledがfalseの場合、他の設定も無効化
      if (key === 'enabled' && !value) {
        newSettings.allowDataCollection = false;
        newSettings.shareAnonymousData = false;
      }

      setSettings(newSettings);
      await patternAnalysisService.updateSettings(newSettings);
      console.log('📝 パターン学習設定を更新しました:', newSettings);
    } catch (error) {
      console.log('パターン学習設定更新エラー:', error);
      Alert.alert('エラー', '設定の更新に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 学習データをリセット
  const resetLearningData = () => {
    Alert.alert(
      '学習データのリセット',
      'すべての学習データを削除しますか？この操作は取り消せません。\n\n削除されるデータ：\n• 予定作成パターン\n• 時間帯の傾向\n• よく使う表現',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await patternAnalysisService.resetLearningData();
              Alert.alert('完了', '学習データをリセットしました。新しいパターンの学習を開始します。');
            } catch (error) {
              console.log('学習データリセットエラー:', error);
              Alert.alert('エラー', '学習データのリセットに失敗しました。');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // プライバシー情報を表示
  const showPrivacyInfo = () => {
    Alert.alert(
      'プライバシーについて',
      'パターン学習は以下のように動作します：\n\n✅ 完全匿名化\n• 個人情報は一切保存されません\n• ランダムなIDで識別\n• 予定の内容は保存されません\n\n✅ 保存されるデータ\n• 予定のカテゴリ（会議、ランチなど）\n• 時間帯（9時、12時など）\n• 曜日の傾向\n• よく使う表現パターン\n\n✅ 利用目的\n• あなた専用の提案精度向上\n• AIの学習データとして活用\n\nいつでも設定を変更・削除できます。',
      [{ text: '了解', style: 'default' }]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: 16,
      color: colors.tint,
      fontWeight: '500',
    },
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    sectionHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.tabIconDefault,
      lineHeight: 20,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingIcon: {
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.tabIconDefault,
      lineHeight: 18,
    },
    switchContainer: {
      marginLeft: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
    },
    actionButtonIcon: {
      marginRight: 12,
    },
    actionButtonContent: {
      flex: 1,
    },
    actionButtonTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    actionButtonDescription: {
      fontSize: 13,
      color: colors.tabIconDefault,
    },
    resetButton: {
      backgroundColor: '#ff3b30',
    },
    resetButtonTitle: {
      color: '#ffffff',
    },
    resetButtonDescription: {
      color: '#ffcccc',
    },
    infoButton: {
      backgroundColor: colors.tint + '10',
    },
    infoButtonTitle: {
      color: colors.tint,
    },
    infoButtonDescription: {
      color: colors.tint + 'aa',
    },
    disabledSetting: {
      opacity: 0.5,
    },
    footer: {
      padding: 16,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerText: {
      fontSize: 12,
      color: colors.tabIconDefault,
      textAlign: 'center',
      lineHeight: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <AcademicCapIcon
          size={24}
          color={colors.tint}
          style={styles.headerIcon}
        />
        <Text style={styles.headerTitle}>パターン学習</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>完了</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* メイン設定 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>学習機能</Text>
            <Text style={styles.sectionDescription}>
              使えば使うほど賢くなるAIアシスタント機能です
            </Text>
          </View>

          <View style={styles.settingItem}>
            <ChartBarIcon
              size={20}
              color={settings.enabled ? colors.tint : colors.tabIconDefault}
              style={styles.settingIcon}
            />
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>パターン学習を有効化</Text>
              <Text style={styles.settingDescription}>
                あなたの予定作成パターンを学習し、より適切な提案を行います
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.enabled}
                onValueChange={(value) => updateSetting('enabled', value)}
                disabled={isLoading}
                trackColor={{ false: colors.tabIconDefault, true: colors.tint }}
                thumbColor={colors.background}
              />
            </View>
          </View>

          <View style={[
            styles.settingItem,
            !settings.enabled && styles.disabledSetting
          ]}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>データ収集を許可</Text>
              <Text style={styles.settingDescription}>
                匿名化されたパターンデータを収集し、学習精度を向上させます
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.allowDataCollection && settings.enabled}
                onValueChange={(value) => updateSetting('allowDataCollection', value)}
                disabled={isLoading || !settings.enabled}
                trackColor={{ false: colors.tabIconDefault, true: colors.tint }}
                thumbColor={colors.background}
              />
            </View>
          </View>

          <View style={[
            styles.settingItem,
            styles.settingItemLast,
            !settings.enabled && styles.disabledSetting
          ]}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>匿名データの共有（オプション）</Text>
              <Text style={styles.settingDescription}>
                完全匿名化されたデータをサービス改善に役立てます（オプション）
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.shareAnonymousData && settings.enabled}
                onValueChange={(value) => updateSetting('shareAnonymousData', value)}
                disabled={isLoading || !settings.enabled}
                trackColor={{ false: colors.tabIconDefault, true: colors.tint }}
                thumbColor={colors.background}
              />
            </View>
          </View>
        </View>

        {/* アクションボタン */}
        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={showPrivacyInfo}
        >
          <InformationCircleIcon
            size={20}
            color={colors.tint}
            style={styles.actionButtonIcon}
          />
          <View style={styles.actionButtonContent}>
            <Text style={[styles.actionButtonTitle, styles.infoButtonTitle]}>
              プライバシーについて
            </Text>
            <Text style={[styles.actionButtonDescription, styles.infoButtonDescription]}>
              データの収集と利用方法について詳しく見る
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={resetLearningData}
          disabled={isLoading || !settings.enabled}
        >
          <TrashIcon
            size={20}
            color="#ffffff"
            style={styles.actionButtonIcon}
          />
          <View style={styles.actionButtonContent}>
            <Text style={[styles.actionButtonTitle, styles.resetButtonTitle]}>
              学習データをリセット
            </Text>
            <Text style={[styles.actionButtonDescription, styles.resetButtonDescription]}>
              すべての学習パターンを削除し、最初からやり直します
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* フッター */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          学習データはデバイス内と暗号化されたクラウドストレージに安全に保存されます。{'\n'}
          個人情報は一切収集されません。
        </Text>
      </View>
    </SafeAreaView>
  );
};