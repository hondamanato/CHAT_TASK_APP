import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { XMarkIcon, ChevronDownIcon, ChevronRightIcon } from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';

interface FAQBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const FAQBottomSheet: React.FC<FAQBottomSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const faqData: FAQItem[] = [
    {
      id: '1',
      category: '基本機能',
      question: 'カレンダーアプリの主な機能は何ですか？',
      answer: 'このカレンダーアプリでは、予定の作成・編集・削除、複数のカレンダー管理、メンバー招待、通知設定、ダークモード、六曜表示、祝日表示などの機能をご利用いただけます。'
    },
    {
      id: '2',
      category: '基本機能',
      question: '複数のカレンダーを作成できますか？',
      answer: 'はい、可能です。サイドバーの「カレンダーを作成」から新しいカレンダーを作成でき、家族、仕事、プライベートなど用途に応じて複数のカレンダーを管理できます。'
    },
    {
      id: '3',
      category: 'メンバー機能',
      question: '他のユーザーをカレンダーに招待するにはどうすればよいですか？',
      answer: 'カレンダーを選択後、オプションメニューから「メンバーを招待」を選択してください。QRコードまたは招待リンクを使って他のユーザーを招待できます。'
    },
    {
      id: '4',
      category: 'メンバー機能',
      question: 'QRコードでの招待方法を教えてください。',
      answer: 'メンバー招待画面で「QRコードで招待」を選択すると、QRコードが表示されます。招待したい相手にこのQRコードを読み取ってもらうことで、カレンダーに参加できます。'
    },
    {
      id: '5',
      category: '通知設定',
      question: '通知が来ない場合はどうすればよいですか？',
      answer: 'まず設定画面で「プッシュ通知」がオンになっているか確認してください。また、デバイスの設定でアプリの通知許可がオンになっているかもご確認ください。'
    },
    {
      id: '6',
      category: '通知設定',
      question: '今日の予定通知を設定するにはどうすればよいですか？',
      answer: '設定画面の「今日の予定」から通知時間や表示内容をカスタマイズできます。毎日指定した時間に当日の予定をお知らせします。'
    },
    {
      id: '7',
      category: '表示設定',
      question: 'ダークモードに変更するにはどうすればよいですか？',
      answer: '設定画面の「表示設定」セクションにある「ダークモード」のスイッチをオンにすることで、アプリ全体がダークテーマに変更されます。'
    },
    {
      id: '8',
      category: '表示設定',
      question: '六曜（大安、仏滅など）を表示できますか？',
      answer: 'はい、可能です。設定画面の「六曜」のスイッチをオンにすることで、カレンダーに六曜が表示されます。'
    },
    {
      id: '9',
      category: '祝日・タイムゾーン',
      question: '祝日の表示設定を変更するにはどうすればよいですか？',
      answer: '設定画面の「祝日」から祝日の表示設定を変更できます。Google Calendar APIを使用して正確な祝日情報を取得しています。'
    },
    {
      id: '10',
      category: '祝日・タイムゾーン',
      question: 'タイムゾーンを変更できますか？',
      answer: '設定画面の「タイムゾーン」から現在のタイムゾーンを変更できます。海外にいる場合や異なるタイムゾーンで作業する場合に便利です。'
    },
    {
      id: '11',
      category: 'トラブルシューティング',
      question: 'アプリが正常に動作しない場合はどうすればよいですか？',
      answer: 'まずアプリを完全に終了して再起動してみてください。それでも問題が解決しない場合は、サポートまでお問い合わせください。'
    },
    {
      id: '12',
      category: 'トラブルシューティング',
      question: 'データが同期されない場合はどうすればよいですか？',
      answer: 'インターネット接続を確認し、アプリを再起動してください。問題が続く場合は、一度ログアウトしてから再度ログインしてみてください。'
    },
    {
      id: '13',
      category: 'アカウント・データ',
      question: 'アカウントを削除するにはどうすればよいですか？',
      answer: 'アカウントの削除については、サポートまでお問い合わせください。削除処理を安全に行うため、本人確認が必要となります。'
    },
    {
      id: '14',
      category: 'アカウント・データ',
      question: 'データのバックアップは取れますか？',
      answer: 'クラウドサービスを使用してデータを自動的にバックアップしています。アカウントでログインしている限り、データは安全に保管されます。'
    }
  ];

  const categories = Array.from(new Set(faqData.map(item => item.category)));

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
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>よくある質問</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* コンテンツ */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              よくお寄せいただく質問とその回答をまとめました。
              解決しない場合は、サポートまでお気軽にお問い合わせください。
            </Text>
          </View>

          {/* カテゴリ別FAQ */}
          {categories.map((category) => (
            <View key={category} style={styles.categorySection}>
              <Text style={[styles.categoryTitle, { color: colors.primaryText }]}>
                {category}
              </Text>

              {faqData
                .filter(item => item.category === category)
                .map((item) => (
                  <View key={item.id} style={[styles.faqItem, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.questionContainer}
                      onPress={() => toggleExpanded(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.questionContent}>
                        <Text style={[styles.questionText, { color: colors.primaryText }]}>
                          {item.question}
                        </Text>
                        <View style={styles.iconContainer}>
                          {expandedItems.has(item.id) ? (
                            <ChevronDownIcon size={20} color={colors.secondaryText} />
                          ) : (
                            <ChevronRightIcon size={20} color={colors.secondaryText} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {expandedItems.has(item.id) && (
                      <View style={[styles.answerContainer, { backgroundColor: colors.secondaryBackground }]}>
                        <Text style={[styles.answerText, { color: colors.primaryText }]}>
                          {item.answer}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
            </View>
          ))}

          {/* フッター */}
          <View style={[styles.footer, { marginBottom: 40 }]}>
            <Text style={[styles.footerText, { color: colors.secondaryText }]}>
              その他のご質問がございましたら、サポートまでお問い合わせください。
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
  categorySection: {
    marginTop: 32,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingBottom: 8,
  },
  faqItem: {
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  questionContainer: {
    paddingVertical: 16,
  },
  questionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
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