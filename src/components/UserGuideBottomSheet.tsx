import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
  PlusCircleIcon,
  UsersIcon,
  BellIcon,
  MoonIcon,
  CogIcon,
  SparklesIcon,
  QrCodeIcon,
  LinkIcon,
} from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';

interface UserGuideBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  steps: GuideStep[];
}

interface GuideStep {
  title: string;
  description: string;
  tips?: string;
}

export const UserGuideBottomSheet: React.FC<UserGuideBottomSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const guideData: GuideSection[] = [
    {
      id: 'basic',
      title: '基本的な使い方',
      icon: <CalendarIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: '予定の作成',
          description: 'カレンダーの日付をタップして新しい予定を作成できます。タイトル、時間、場所、メモを入力して保存してください。',
          tips: '長押しで複数日にまたがる予定も作成可能です。'
        },
        {
          title: '予定の編集・削除',
          description: '既存の予定をタップすると詳細画面が開きます。編集ボタンで内容を変更、削除ボタンで予定を削除できます。',
        },
        {
          title: '月・週・日表示の切り替え',
          description: '画面上部のボタンで表示形式を変更できます。用途に応じて最適な表示を選択してください。',
        },
      ],
    },
    {
      id: 'calendar',
      title: 'カレンダー管理',
      icon: <PlusCircleIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: '新しいカレンダーの作成',
          description: 'サイドバーから「カレンダーを作成」をタップ。家族、仕事、プライベートなど用途別にカレンダーを分けて管理できます。',
          tips: 'カレンダーごとに色分けして視覚的に区別しやすくなります。'
        },
        {
          title: 'カレンダーの切り替え',
          description: 'サイドバーでカレンダー名をタップして表示するカレンダーを切り替えられます。複数のカレンダーを同時に表示することも可能です。',
        },
        {
          title: 'カレンダーの設定変更',
          description: 'カレンダー名の右にある「⋮」をタップして、名前変更、色変更、削除などの設定ができます。',
        },
      ],
    },
    {
      id: 'member',
      title: 'メンバー招待機能',
      icon: <UsersIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: 'メンバーの招待方法',
          description: 'カレンダー設定から「メンバーを招待」を選択。QRコードまたは招待リンクで他のユーザーを招待できます。',
        },
        {
          title: 'QRコードでの招待',
          description: '「QRコードで招待」をタップしてQRコードを表示。招待したい相手にこのコードを読み取ってもらいます。',
          tips: 'QRコードは有効期限があります。期限内に招待を完了してください。'
        },
        {
          title: '招待リンクのコピー',
          description: '「招待リンクをコピー」で招待URLをクリップボードにコピー。メールやメッセージアプリで共有できます。',
        },
      ],
    },
    {
      id: 'notifications',
      title: '通知設定',
      icon: <BellIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: 'プッシュ通知の設定',
          description: '設定画面の「プッシュ通知」をオンにすると、予定の開始時刻に通知を受け取れます。',
          tips: 'デバイスの設定でもアプリの通知許可が必要です。'
        },
        {
          title: '今日の予定通知',
          description: '設定画面の「今日の予定」から、毎日指定した時間に当日の予定一覧を通知できます。',
        },
        {
          title: '通知時間のカスタマイズ',
          description: '予定作成時に通知タイミング（5分前、15分前、1時間前など）を個別に設定できます。',
        },
      ],
    },
    {
      id: 'display',
      title: '表示設定',
      icon: <MoonIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: 'ダークモードの切り替え',
          description: '設定画面の「ダークモード」をオンにすると、アプリ全体が暗いテーマに変更されます。目に優しく、バッテリー節約にも効果的です。',
        },
        {
          title: '六曜の表示',
          description: '設定画面の「六曜」をオンにすると、カレンダーに大安、仏滅などの六曜が表示されます。',
        },
        {
          title: '週の始まりの設定',
          description: '設定画面で週の始まりを日曜日または月曜日から選択できます。お好みに合わせて設定してください。',
        },
      ],
    },
    {
      id: 'advanced',
      title: '高度な機能',
      icon: <CogIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: '祝日の表示設定',
          description: '設定画面の「祝日」から、Google Calendar APIを使用した正確な祝日情報を表示できます。',
        },
        {
          title: 'タイムゾーンの変更',
          description: '設定画面の「タイムゾーン」から現在のタイムゾーンを変更。海外在住や出張時に便利です。',
        },
        {
          title: 'プロフィール設定',
          description: 'サイドバーのプロフィール部分をタップして、名前やプロフィール画像を設定できます。',
        },
      ],
    },
    {
      id: 'tips',
      title: '便利なコツ',
      icon: <SparklesIcon size={24} color={colors.primaryText} />,
      steps: [
        {
          title: 'ジェスチャー操作',
          description: '左右にスワイプして月を移動、上下にスワイプして表示形式を変更できます。',
        },
        {
          title: '検索機能の活用',
          description: '予定が多い場合は検索機能を使って特定の予定を素早く見つけられます。',
        },
        {
          title: 'バックアップとデータ同期',
          description: 'アカウントでログインしていれば、データは自動的にクラウドに保存され、他のデバイスと同期されます。',
          tips: '複数のデバイスで同じアカウントを使用すると、データが自動同期されます。'
        },
      ],
    },
  ];

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>ユーザーガイド</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* コンテンツ */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              7daysの基本的な使い方から応用機能まで、
              ステップバイステップでご紹介します。
            </Text>
          </View>

          {/* ガイドセクション */}
          {guideData.map((section) => (
            <View key={section.id} style={[styles.guideSection, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderContent}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.secondaryBackground }]}>
                    {section.icon}
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                    {section.title}
                  </Text>
                  <View style={styles.chevronContainer}>
                    {expandedSections.has(section.id) ? (
                      <ChevronDownIcon size={20} color={colors.secondaryText} />
                    ) : (
                      <ChevronRightIcon size={20} color={colors.secondaryText} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {expandedSections.has(section.id) && (
                <View style={styles.stepsContainer}>
                  {section.steps.map((step, index) => (
                    <View key={index} style={[styles.stepItem, { borderTopColor: colors.border }]}>
                      <View style={styles.stepHeader}>
                        <View style={[styles.stepNumber, { backgroundColor: colors.buttonPrimary }]}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.stepTitle, { color: colors.primaryText }]}>
                          {step.title}
                        </Text>
                      </View>
                      <Text style={[styles.stepDescription, { color: colors.primaryText }]}>
                        {step.description}
                      </Text>
                      {step.tips && (
                        <View style={[styles.tipContainer, { backgroundColor: colors.secondaryBackground }]}>
                          <Text style={[styles.tipLabel, { color: colors.buttonPrimary }]}>💡 コツ</Text>
                          <Text style={[styles.tipText, { color: colors.secondaryText }]}>
                            {step.tips}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* フッター */}
          <View style={[styles.footer, { marginBottom: 40 }]}>
            <Text style={[styles.footerText, { color: colors.secondaryText }]}>
              その他のご質問がございましたら、
              サポートからお気軽にお問い合わせください。
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  guideSection: {
    marginTop: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sectionHeader: {
    paddingVertical: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsContainer: {
    paddingLeft: 16,
    paddingBottom: 16,
  },
  stepItem: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 36,
    marginBottom: 8,
  },
  tipContainer: {
    marginLeft: 36,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});