import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { useTheme } from '@/hooks/useThemeColor';

interface PrivacyBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PrivacyBottomSheet: React.FC<PrivacyBottomSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors } = useTheme();

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
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>プライバシーポリシー</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* プライバシーポリシー内容 */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.lastUpdated, { color: colors.secondaryText }]}>
              最終更新日: 2024年12月
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.introText, { color: colors.primaryText }]}>
              本プライバシーポリシー（以下「本ポリシー」）は、本アプリケーション（以下「本アプリ」）における個人情報の取扱いについて定めたものです。ユーザーの皆様に安心してご利用いただけるよう、個人情報の保護に努めております。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>1. 収集する情報</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              本アプリでは、以下の情報を収集する場合があります：{'\n\n'}
              ・アカウント作成時に提供いただく情報（メールアドレス、ユーザー名等）{'\n'}
              ・カレンダーデータ（予定、タスク、メモ等）{'\n'}
              ・アプリの利用状況に関する情報{'\n'}
              ・デバイス情報（OS、端末識別子等）{'\n'}
              ・位置情報（ユーザーが許可した場合のみ）
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>2. 情報の利用目的</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              収集した個人情報は、以下の目的で利用いたします：{'\n\n'}
              ・本アプリのサービス提供および機能改善{'\n'}
              ・ユーザーサポートの提供{'\n'}
              ・セキュリティの維持および不正利用の防止{'\n'}
              ・新機能やサービスの開発{'\n'}
              ・統計データの作成（匿名化されたデータ）{'\n'}
              ・法的義務の履行
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>3. 情報の共有</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              当社は、以下の場合を除き、個人情報を第三者に提供することはありません：{'\n\n'}
              ・ユーザーの明示的な同意がある場合{'\n'}
              ・法令に基づく開示が必要な場合{'\n'}
              ・ユーザーや第三者の生命、身体、財産等の保護のために必要な場合{'\n'}
              ・サービス提供に必要な業務委託先への提供（適切な契約に基づく）{'\n'}
              ・企業の合併、買収等による事業承継の場合
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>4. データの保存</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              ・個人情報は、利用目的の達成に必要な期間中保存されます{'\n'}
              ・アカウント削除後、30日以内にデータを削除いたします{'\n'}
              ・法的義務により保存が必要な情報は、法定期間中保存されます{'\n'}
              ・データは適切なセキュリティ対策の下で保存されます
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>5. セキュリティ</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              当社は、個人情報の保護のため、以下のセキュリティ対策を実施しています：{'\n\n'}
              ・データの暗号化（保存時および転送時）{'\n'}
              ・アクセス制御および認証システム{'\n'}
              ・定期的なセキュリティ監査{'\n'}
              ・従業員への個人情報保護教育{'\n'}
              ・不正アクセス監視システム
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>6. ユーザーの権利</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              ユーザーは、自身の個人情報について以下の権利を有します：{'\n\n'}
              ・個人情報の開示請求{'\n'}
              ・個人情報の訂正・削除請求{'\n'}
              ・個人情報の利用停止請求{'\n'}
              ・データポータビリティの権利{'\n'}
              ・同意の撤回{'\n\n'}
              これらの権利を行使される場合は、アプリ内のお問い合わせ機能またはサポートまでご連絡ください。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>7. Cookie等の利用</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              本アプリでは、以下の技術を使用する場合があります：{'\n\n'}
              ・認証トークン（ログイン状態の維持）{'\n'}
              ・ローカルストレージ（設定情報の保存）{'\n'}
              ・分析ツール（匿名化された利用状況の分析）{'\n\n'}
              これらの技術により収集される情報は、サービス改善のために利用されます。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>8. 第三者サービス</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              本アプリでは、以下の第三者サービスを利用しています：{'\n\n'}
              ・認証サービス（Supabase Auth）{'\n'}
              ・データベースサービス（Supabase Database）{'\n'}
              ・クラウドストレージサービス{'\n'}
              ・分析サービス{'\n\n'}
              これらのサービスには、それぞれ独自のプライバシーポリシーが適用されます。詳細は各サービスのプライバシーポリシーをご確認ください。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>9. 位置情報</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              位置情報の利用について：{'\n\n'}
              ・位置情報は、ユーザーが明示的に許可した場合のみ収集されます{'\n'}
              ・位置情報は、位置ベースのリマインダー機能等に利用されます{'\n'}
              ・位置情報の利用許可は、デバイス設定からいつでも変更可能です{'\n'}
              ・精密な位置情報は収集せず、必要最小限の範囲での利用に留めます
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>10. 未成年者の個人情報</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              ・13歳未満のお子様の個人情報は、保護者の同意なしに収集いたしません{'\n'}
              ・13歳未満のお子様が個人情報を提供していることが判明した場合、速やかに削除いたします{'\n'}
              ・保護者の方は、お子様の個人情報について確認・削除を求めることができます
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>11. 国際的なデータ転送</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              ・個人情報は、適切な保護措置を講じた上で、日本国外のサーバーに保存される場合があります{'\n'}
              ・データ転送先の国または地域の法令に基づく適切な保護措置を確保します{'\n'}
              ・EUのGDPR等、適用される国際的なプライバシー法規を遵守します
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>12. プライバシーポリシーの変更</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              ・本ポリシーは、法令の変更やサービスの改善等により変更される場合があります{'\n'}
              ・重要な変更がある場合は、アプリ内通知またはメールでお知らせいたします{'\n'}
              ・変更後も継続してアプリを利用された場合、変更に同意されたものとみなします{'\n'}
              ・最新版は常にアプリ内で確認できます
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>13. お問い合わせ</Text>
            <Text style={[styles.sectionText, { color: colors.primaryText }]}>
              個人情報の取扱いに関するお問い合わせ、苦情、開示等の請求については、以下の方法でご連絡ください：{'\n\n'}
              ・アプリ内のお問い合わせ機能{'\n'}
              ・設定画面からのサポート連絡{'\n\n'}
              お問い合わせいただいた内容については、遅滞なく対応させていただきます。
            </Text>
          </View>

          <View style={[styles.section, { marginBottom: 40 }]}>
            <Text style={[styles.footer, { color: colors.secondaryText }]}>
              以上
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
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
  },
  footer: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});