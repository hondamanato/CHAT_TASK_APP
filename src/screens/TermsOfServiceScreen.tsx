import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import { useSettings } from '../contexts/SettingsContext';

export const TermsOfServiceScreen: React.FC = () => {
  const router = useRouter();
  const { isDarkMode } = useSettings();

  const colors = {
    background: isDarkMode ? '#000000' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    secondaryText: isDarkMode ? '#8e8e93' : '#666666',
    border: isDarkMode ? '#38383a' : '#e5e5e7',
    headerBackground: isDarkMode ? '#1c1c1e' : '#f2f2f7',
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>利用規約</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 利用規約内容 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.lastUpdated, { color: colors.secondaryText }]}>
            最終更新日: 2024年12月
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第1条（適用）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            本利用規約（以下「本規約」）は、本アプリケーション（以下「本アプリ」）の利用に関して、本アプリの提供者（以下「当社」）と本アプリを利用するユーザー（以下「ユーザー」）との間の権利義務関係を定めることを目的とし、ユーザーと当社との間の本アプリの利用に関わる一切の関係に適用されるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第2条（利用登録）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 本アプリの利用を希望する者は、本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。{'\n\n'}
            2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。{'\n'}
            　・利用登録の申請に際して虚偽の事項を届け出た場合{'\n'}
            　・本規約に違反したことがある者からの申請である場合{'\n'}
            　・その他、当社が利用登録を相当でないと判断した場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第3条（ユーザーIDおよびパスワードの管理）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. ユーザーは、自己の責任において、本アプリのユーザーIDおよびパスワードを適切に管理するものとします。{'\n\n'}
            2. ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。{'\n\n'}
            3. ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第4条（利用料金および支払方法）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 本アプリの基本機能は無料で利用できます。{'\n\n'}
            2. 当社は、将来的に有料機能を追加する場合があります。有料機能を利用する場合の料金および支払方法については、別途定めるものとします。{'\n\n'}
            3. 有料機能の利用料金は、当社が別途指定する方法により支払うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第5条（禁止事項）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            ユーザーは、本アプリの利用にあたり、以下の行為をしてはなりません。{'\n\n'}
            1. 法令または公序良俗に違反する行為{'\n'}
            2. 犯罪行為に関連する行為{'\n'}
            3. 当社、本アプリの他のユーザー、または第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為{'\n'}
            4. 当社のサービスの運営を妨害するおそれのある行為{'\n'}
            5. 他のユーザーに関する個人情報等を収集または蓄積する行為{'\n'}
            6. 不正アクセスをし、またはこれを試みる行為{'\n'}
            7. 他のユーザーに成りすます行為{'\n'}
            8. 当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為{'\n'}
            9. その他、当社が不適切と判断する行為
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第6条（本サービスの提供の停止等）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本アプリの全部または一部の提供を停止または中断することができるものとします。{'\n'}
            　・本アプリにかかるコンピュータシステムの保守点検または更新を行う場合{'\n'}
            　・地震、落雷、火災、停電または天災などの不可抗力により、本アプリの提供が困難となった場合{'\n'}
            　・コンピュータまたは通信回線等が事故により停止した場合{'\n'}
            　・その他、当社が本アプリの提供が困難と判断した場合{'\n\n'}
            2. 当社は、本アプリの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第7条（利用制限および登録抹消）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本アプリの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。{'\n'}
            　・本規約のいずれかの条項に違反した場合{'\n'}
            　・登録事項に虚偽の事実があることが判明した場合{'\n'}
            　・その他、当社が本アプリの利用を適当でないと判断した場合{'\n\n'}
            2. 当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第8条（退会）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            ユーザーは、当社の定める退会手続により、本アプリから退会できるものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第9条（パターン学習機能）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 本アプリは、ユーザー体験向上のため、パターン学習機能を提供します。{'\n\n'}
            2. パターン学習機能では、以下の目的で匿名化されたデータを収集・活用します：{'\n'}
            　・ユーザーの予定作成パターンに基づく提案の改善{'\n'}
            　・AI応答精度の向上{'\n'}
            　・サービス全体の品質向上{'\n\n'}
            3. ユーザーは、アプリ設定からパターン学習機能のON/OFF、データ収集の許可/拒否を選択できます。{'\n\n'}
            4. 収集されるデータは完全に匿名化され、個人を特定することはできません。{'\n\n'}
            5. ユーザーは、いつでも学習データの削除を要求できます。{'\n\n'}
            6. パターン学習機能の詳細については、プライバシーポリシーをご確認ください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第10条（保証の否認および免責事項）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 当社は、本アプリに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。{'\n\n'}
            2. 当社は、本アプリに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第11条（サービス内容の変更等）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当社は、ユーザーに通知することなく、本アプリの内容を変更しまたは本アプリの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第12条（利用規約の変更）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本アプリの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第13条（個人情報の取扱い）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当社は、本アプリの利用によって取得する個人情報については、当社のプライバシーポリシーに従い適切に取り扱うものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第14条（通知または連絡）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第15条（権利義務の譲渡の禁止）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第16条（準拠法・裁判管轄）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            1. 本規約の解釈にあたっては、日本法を準拠法とします。{'\n\n'}
            2. 本アプリに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
          </Text>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={[styles.footer, { color: colors.secondaryText }]}>
            以上
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
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