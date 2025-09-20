import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  BugAntIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
} from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';
import { TermsBottomSheet } from './TermsBottomSheet';
import { PrivacyBottomSheet } from './PrivacyBottomSheet';
import { FAQBottomSheet } from './FAQBottomSheet';
import { FeedbackBottomSheet } from './FeedbackBottomSheet';
import { UserGuideBottomSheet } from './UserGuideBottomSheet';

interface SupportBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SupportBottomSheet: React.FC<SupportBottomSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [showTermsSheet, setShowTermsSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [showFAQSheet, setShowFAQSheet] = useState(false);
  const [showFeedbackSheet, setShowFeedbackSheet] = useState(false);
  const [showUserGuideSheet, setShowUserGuideSheet] = useState(false);

  const handleEmailSupport = () => {
    const email = '31foresight@gmail.com';
    const subject = '【7days】サポート・お問い合わせ';
    const body = 'アプリ名: 7days\n\nお困りの内容をお書きください。';

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('エラー', 'メールアプリを開けませんでした。');
    });
  };

  const handleFeedback = () => {
    setShowFeedbackSheet(true);
  };

  const handleBugReport = () => {
    const email = '31foresight@gmail.com';
    const subject = '【7days】バグ報告・不具合報告';
    const body = 'アプリ名: 7days\n\n不具合の詳細をお書きください：\n- 何をしていた時に発生したか\n- どのような症状か\n- 再現手順（あれば）\n\n';

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('エラー', 'メールアプリを開けませんでした。');
    });
  };

  const supportItems = [
    {
      icon: <QuestionMarkCircleIcon size={24} color={colors.primaryText} />,
      title: 'よくある質問',
      description: '一般的な質問と回答',
      onPress: () => setShowFAQSheet(true),
    },
    {
      icon: <EnvelopeIcon size={24} color={colors.primaryText} />,
      title: 'メールサポート',
      description: '直接お問い合わせください',
      onPress: handleEmailSupport,
    },
    {
      icon: <ChatBubbleLeftRightIcon size={24} color={colors.primaryText} />,
      title: 'フィードバック',
      description: 'ご意見・ご要望をお聞かせください',
      onPress: () => setShowFeedbackSheet(true),
    },
    {
      icon: <BugAntIcon size={24} color={colors.primaryText} />,
      title: 'バグ報告',
      description: '不具合を報告する',
      onPress: handleBugReport,
    },
    {
      icon: <DocumentTextIcon size={24} color={colors.primaryText} />,
      title: 'ユーザーガイド',
      description: 'アプリの使い方',
      onPress: () => setShowUserGuideSheet(true),
    },
    {
      icon: <InformationCircleIcon size={24} color={colors.primaryText} />,
      title: '利用規約',
      description: 'サービス利用規約を確認',
      onPress: () => setShowTermsSheet(true),
    },
    {
      icon: <ShieldCheckIcon size={24} color={colors.primaryText} />,
      title: 'プライバシーポリシー',
      description: '個人情報の取り扱いについて',
      onPress: () => setShowPrivacySheet(true),
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
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>サポート</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* コンテンツ */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              お困りのことがございましたら、お気軽にお問い合わせください
            </Text>
          </View>

          {/* サポートアイテム */}
          <View style={styles.section}>
            {supportItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.supportItem,
                  { borderBottomColor: colors.border },
                  index === supportItems.length - 1 && styles.lastItem
                ]}
                onPress={item.onPress}
              >
                <View style={styles.supportItemContent}>
                  <View style={styles.supportItemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.secondaryBackground }]}>
                      {item.icon}
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={[styles.supportItemTitle, { color: colors.primaryText }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.supportItemDescription, { color: colors.secondaryText }]}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 連絡先情報 */}
          <View style={styles.section}>
            <View style={[styles.contactInfo, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={[styles.contactTitle, { color: colors.primaryText }]}>
                サポート営業時間
              </Text>
              <Text style={[styles.contactText, { color: colors.secondaryText }]}>
                平日 9:00 - 18:00{'\n'}
                土日祝日は休業させていただいております
              </Text>
            </View>
          </View>

          {/* アプリ情報 */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <View style={[styles.appInfo, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={[styles.appInfoTitle, { color: colors.primaryText }]}>
                アプリ情報
              </Text>
              <View style={styles.appInfoRow}>
                <Text style={[styles.appInfoLabel, { color: colors.secondaryText }]}>バージョン:</Text>
                <Text style={[styles.appInfoValue, { color: colors.primaryText }]}>1.0.0</Text>
              </View>
              <View style={styles.appInfoRow}>
                <Text style={[styles.appInfoLabel, { color: colors.secondaryText }]}>ビルド:</Text>
                <Text style={[styles.appInfoValue, { color: colors.primaryText }]}>2024.12.001</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 利用規約ボトムシート */}
      <TermsBottomSheet
        isVisible={showTermsSheet}
        onClose={() => setShowTermsSheet(false)}
      />

      {/* プライバシーポリシーボトムシート */}
      <PrivacyBottomSheet
        isVisible={showPrivacySheet}
        onClose={() => setShowPrivacySheet(false)}
      />

      {/* FAQボトムシート */}
      <FAQBottomSheet
        isVisible={showFAQSheet}
        onClose={() => setShowFAQSheet(false)}
      />

      {/* フィードバックボトムシート */}
      <FeedbackBottomSheet
        isVisible={showFeedbackSheet}
        onClose={() => setShowFeedbackSheet(false)}
      />

      {/* ユーザーガイドボトムシート */}
      <UserGuideBottomSheet
        isVisible={showUserGuideSheet}
        onClose={() => setShowUserGuideSheet(false)}
      />
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
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  supportItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  supportItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  supportItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  supportItemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactInfo: {
    padding: 16,
    borderRadius: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
  },
  appInfo: {
    padding: 16,
    borderRadius: 12,
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appInfoLabel: {
    fontSize: 14,
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});