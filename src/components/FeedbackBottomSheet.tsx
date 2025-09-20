import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  StarIcon,
  HeartIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';
import { StarIcon as StarIconSolid } from 'react-native-heroicons/solid';
import { useTheme } from '@/hooks/useThemeColor';

interface FeedbackBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

type FeedbackType = 'general' | 'feature' | 'bug' | 'compliment';

export const FeedbackBottomSheet: React.FC<FeedbackBottomSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<FeedbackType>('general');
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    {
      id: 'general' as FeedbackType,
      title: '一般的なご意見',
      description: 'アプリ全般についてのご意見',
      icon: <HeartIcon size={24} color={colors.primaryText} />,
      color: '#FF6B6B',
    },
    {
      id: 'feature' as FeedbackType,
      title: '新機能のご提案',
      description: '追加してほしい機能について',
      icon: <LightBulbIcon size={24} color={colors.primaryText} />,
      color: '#4ECDC4',
    },
    {
      id: 'bug' as FeedbackType,
      title: 'バグ・不具合の報告',
      description: '問題の詳細をお聞かせください',
      icon: <ExclamationTriangleIcon size={24} color={colors.primaryText} />,
      color: '#FFE66D',
    },
    {
      id: 'compliment' as FeedbackType,
      title: 'お褒めの言葉',
      description: '良かった点をお聞かせください',
      icon: <StarIcon size={24} color={colors.primaryText} />,
      color: '#FF8E53',
    },
  ];

  const handleRatingPress = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('エラー', 'フィードバック内容を入力してください。');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedTypeInfo = feedbackTypes.find(type => type.id === selectedType);
      const subject = `【7days】フィードバック: ${selectedTypeInfo?.title}`;
      const body = `アプリ名: 7days\nフィードバックタイプ: ${selectedTypeInfo?.title}\n評価: ${rating > 0 ? `${rating}/5 星` : '未評価'}\n\n内容:\n${feedbackText}\n\n---\nアプリバージョン: 1.0.0\nプラットフォーム: ${Platform.OS}`;

      const email = '31foresight@gmail.com';
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      await Linking.openURL(url);

      Alert.alert(
        '送信完了',
        'フィードバックをお送りいただき、ありがとうございます。メールアプリが開きますので、送信を完了してください。',
        [
          {
            text: 'OK',
            onPress: () => {
              setFeedbackText('');
              setRating(0);
              setSelectedType('general');
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('エラー', 'メールアプリを開けませんでした。後でもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={[styles.ratingLabel, { color: colors.primaryText }]}>
          アプリの評価をお聞かせください
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRatingPress(star)}
              style={styles.starButton}
            >
              {star <= rating ? (
                <StarIconSolid size={32} color="#FFD700" />
              ) : (
                <StarIcon size={32} color={colors.secondaryText} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={[styles.ratingText, { color: colors.secondaryText }]}>
            {rating}/5 星
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.primaryBackground }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>フィードバック</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        {/* コンテンツ */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              アプリをより良くするために、あなたのご意見をお聞かせください。
              どんな小さなことでも大歓迎です！
            </Text>
          </View>

          {/* フィードバックタイプ選択 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              フィードバックの種類
            </Text>
            <View style={styles.typeGrid}>
              {feedbackTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeItem,
                    {
                      borderColor: selectedType === type.id ? type.color : colors.border,
                      backgroundColor: selectedType === type.id ? `${type.color}10` : colors.primaryBackground,
                    }
                  ]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: `${type.color}20` }]}>
                    {type.icon}
                  </View>
                  <Text style={[styles.typeTitle, { color: colors.primaryText }]}>
                    {type.title}
                  </Text>
                  <Text style={[styles.typeDescription, { color: colors.secondaryText }]}>
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 評価 */}
          <View style={styles.section}>
            {renderStars()}
          </View>

          {/* フィードバック内容 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
              詳細なご意見・ご要望
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.secondaryBackground,
                  color: colors.primaryText,
                }
              ]}
              placeholder="こちらにご意見・ご要望をお書きください..."
              placeholderTextColor={colors.secondaryText}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* 送信ボタン */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: feedbackText.trim() ? colors.buttonPrimary : colors.border,
                  opacity: isSubmitting ? 0.6 : 1,
                }
              ]}
              onPress={handleSubmit}
              disabled={!feedbackText.trim() || isSubmitting}
            >
              <PaperAirplaneIcon
                size={20}
                color={feedbackText.trim() ? '#FFFFFF' : colors.secondaryText}
              />
              <Text style={[
                styles.submitButtonText,
                { color: feedbackText.trim() ? '#FFFFFF' : colors.secondaryText }
              ]}>
                {isSubmitting ? '送信中...' : 'フィードバックを送信'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 注意事項 */}
          <View style={[styles.notice, { backgroundColor: colors.secondaryBackground }]}>
            <Text style={[styles.noticeText, { color: colors.secondaryText }]}>
              • フィードバックは匿名で送信されます{'\n'}
              • 返信が必要な場合は、メールサポートをご利用ください{'\n'}
              • いただいたご意見は今後のアップデートで参考にさせていただきます
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeItem: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  starsContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notice: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
});