import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CheckIcon } from 'react-native-heroicons/outline';
import { TermsService } from '../services/termsService';
import { FullTextModal } from '../components/FullTextModal';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../data/termsData';

interface TermsAgreementScreenProps {
  onAgreementComplete: () => void;
}

export const TermsAgreementScreen: React.FC<TermsAgreementScreenProps> = ({
  onAgreementComplete,
}) => {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleAgreement = async () => {
    if (!agreedToTerms) {
      Alert.alert('エラー', '利用規約とプライバシーポリシーに同意してください。');
      return;
    }

    setLoading(true);

    try {
      const success = await TermsService.recordAgreement();
      if (success) {
        onAgreementComplete();
      } else {
        Alert.alert('エラー', '同意の記録に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('同意処理エラー:', error);
      Alert.alert('エラー', '同意の記録に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const termsPreview = `
第1条（適用）
本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。

第2条（利用登録）
登録希望者が当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。

第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
• 法令または公序良俗に違反する行為
• 犯罪行為に関連する行為
• 本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為
• 当社、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
`;

  const privacyPreview = `
1. 収集する情報
当社は、本サービスの提供のため、以下の情報を収集します：
• アカウント情報（メールアドレス、パスワード）
• カレンダーデータ
• 使用状況に関する情報

2. 情報の利用目的
収集した情報は以下の目的で利用します：
• 本サービスの提供・運営のため
• ユーザーからのお問い合わせに回答するため
• サービスの改善・開発のため

3. 情報の第三者提供
当社は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>利用規約とプライバシーポリシー</Text>
        <Text style={styles.subtitle}>
          Taplessをご利用いただくために、以下の内容をご確認ください
        </Text>
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={true}>
        {/* 利用規約セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>利用規約</Text>
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>{termsPreview}</Text>
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={() => setShowTermsModal(true)}
            >
              <Text style={styles.readMoreText}>全文を読む</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* プライバシーポリシーセクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プライバシーポリシー</Text>
          <View style={styles.previewContainer}>
            <Text style={styles.previewText}>{privacyPreview}</Text>
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={() => setShowPrivacyModal(true)}
            >
              <Text style={styles.readMoreText}>全文を読む</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 同意チェックボックス */}
        <View style={styles.agreementContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <CheckIcon size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>
              利用規約とプライバシーポリシーに同意します
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 同意ボタン */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.agreeButton,
            (!agreedToTerms || loading) && styles.agreeButtonDisabled,
          ]}
          onPress={handleAgreement}
          disabled={!agreedToTerms || loading}
        >
          <Text style={styles.agreeButtonText}>
            {loading ? '処理中...' : '同意して続ける'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 利用規約全文モーダル */}
      <FullTextModal
        isVisible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="利用規約"
        content={TERMS_OF_SERVICE}
      />

      {/* プライバシーポリシー全文モーダル */}
      <FullTextModal
        isVisible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="プライバシーポリシー"
        content={PRIVACY_POLICY}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  readMoreText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  agreementContainer: {
    marginVertical: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  agreeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  agreeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});