import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { XMarkIcon, ShareIcon, ClipboardIcon, UserPlusIcon, QrCodeIcon, LinkIcon } from 'react-native-heroicons/outline';
import { CheckIcon } from 'react-native-heroicons/solid';
import * as Clipboard from 'expo-clipboard';
import { invitationService } from '../services/invitationService';
import { useSettings } from '../contexts/SettingsContext';

interface InviteModalProps {
  isVisible: boolean;
  onClose: () => void;
  calendarId: string;
  calendarName: string;
  initialTab?: TabType;
}

type TabType = 'link' | 'qrcode' | 'email';

export const InviteModal: React.FC<InviteModalProps> = ({
  isVisible,
  onClose,
  calendarId,
  calendarName,
  initialTab = 'link',
}) => {
  const { isDarkMode } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [canInvite, setCanInvite] = useState(false);

  useEffect(() => {
    if (isVisible && calendarId) {
      checkInvitePermission();
      generateInviteLink();
      setActiveTab(initialTab);
    }
  }, [isVisible, calendarId, initialTab]);

  const checkInvitePermission = async () => {
    const hasPermission = await invitationService.checkUserCanInvite(calendarId);
    setCanInvite(hasPermission);
  };

  const generateInviteLink = async () => {
    if (!calendarId) return;

    setIsLoading(true);
    try {
      const invitation = await invitationService.createInvitation(
        calendarId,
        'pending@invitation.link'
      );
      const link = invitationService.getInviteDeepLink(invitation.token);
      setInviteLink(link);
      setInviteToken(invitation.token);
    } catch (error) {
      console.error('招待リンク生成エラー:', error);
      Alert.alert('エラー', '招待リンクの生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    await Clipboard.setStringAsync(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteLink) return;

    const message = invitationService.formatInviteMessage(calendarName, inviteLink);

    try {
      await Share.share({
        message,
        title: `${calendarName}への招待`,
      });
    } catch (error) {
      console.error('共有エラー:', error);
    }
  };

  const handleEmailInvite = async () => {
    if (!email || !calendarId) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('エラー', '正しいメールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const invitation = await invitationService.createInvitation(calendarId, email);
      const link = invitationService.getInviteDeepLink(invitation.token);

      Alert.alert(
        '招待送信完了',
        `${email}への招待リンクが生成されました。\n\nリンクをコピーして共有してください。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'リンクをコピー',
            onPress: async () => {
              await Clipboard.setStringAsync(link);
            }
          },
        ]
      );

      setEmail('');
    } catch (error) {
      console.error('招待送信エラー:', error);
      Alert.alert('エラー', '招待の送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isDarkMode ? '#1c1c1e' : '#ffffff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    closeButton: {
      padding: 8,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: '#007AFF',
    },
    tabText: {
      fontSize: 14,
      color: isDarkMode ? '#8e8e93' : '#666666',
    },
    activeTabText: {
      color: '#007AFF',
      fontWeight: '600',
    },
    content: {
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#ffffff' : '#000000',
      marginBottom: 12,
    },
    linkContainer: {
      backgroundColor: isDarkMode ? '#2c2c2e' : '#f2f2f7',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    linkText: {
      fontSize: 14,
      color: isDarkMode ? '#ffffff' : '#000000',
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#007AFF',
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    secondaryButton: {
      backgroundColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButtonText: {
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    qrContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    qrWrapper: {
      padding: 20,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      marginBottom: 20,
    },
    qrInstruction: {
      textAlign: 'center',
      fontSize: 14,
      color: isDarkMode ? '#8e8e93' : '#666666',
      marginTop: 12,
    },
    input: {
      backgroundColor: isDarkMode ? '#2c2c2e' : '#f2f2f7',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDarkMode ? '#ffffff' : '#000000',
      marginBottom: 16,
    },
    permissionWarning: {
      backgroundColor: isDarkMode ? '#3a2a2a' : '#fff3cd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
    },
    warningText: {
      fontSize: 14,
      color: isDarkMode ? '#ff9500' : '#856404',
      textAlign: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    copiedBadge: {
      position: 'absolute',
      top: -30,
      backgroundColor: '#34c759',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    copiedText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  if (!canInvite) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>メンバーを招待</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XMarkIcon size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <View style={styles.permissionWarning}>
              <Text style={styles.warningText}>
                招待権限がありません。カレンダーのオーナーまたは招待権限を持つメンバーのみが招待できます。
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>メンバーを招待</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'link' && styles.activeTab]}
            onPress={() => setActiveTab('link')}
          >
            <Text style={[styles.tabText, activeTab === 'link' && styles.activeTabText]}>
              リンク共有
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'qrcode' && styles.activeTab]}
            onPress={() => setActiveTab('qrcode')}
          >
            <Text style={[styles.tabText, activeTab === 'qrcode' && styles.activeTabText]}>
              QRコード
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'email' && styles.activeTab]}
            onPress={() => setActiveTab('email')}
          >
            <Text style={[styles.tabText, activeTab === 'email' && styles.activeTabText]}>
              メール招待
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'link' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>招待リンクを共有</Text>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              ) : (
                <>
                  <View style={styles.linkContainer}>
                    <Text style={styles.linkText} numberOfLines={2}>
                      {inviteLink}
                    </Text>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={handleCopyLink}
                      >
                        {isCopied && (
                          <View style={styles.copiedBadge}>
                            <CheckIcon size={12} color="#ffffff" />
                            <Text style={styles.copiedText}>コピー済み</Text>
                          </View>
                        )}
                        <ClipboardIcon size={20} color={isDarkMode ? '#ffffff' : '#000000'} />
                        <Text style={styles.secondaryButtonText}>コピー</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.button} onPress={handleShare}>
                        <ShareIcon size={20} color="#ffffff" />
                        <Text style={styles.buttonText}>共有</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.qrInstruction}>
                    このリンクは7日間有効です。リンクをタップするとカレンダーに参加できます。
                  </Text>
                </>
              )}
            </View>
          )}

          {activeTab === 'qrcode' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QRコードで招待</Text>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              ) : inviteLink ? (
                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={inviteLink}
                      size={200}
                      color="#000000"
                      backgroundColor="#ffffff"
                    />
                  </View>
                  <Text style={styles.qrInstruction}>
                    このQRコードをスキャンしてカレンダーに参加できます
                  </Text>
                  <TouchableOpacity
                    style={[styles.button, { marginTop: 16, width: 200 }]}
                    onPress={handleShare}
                  >
                    <ShareIcon size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>QRコードを共有</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {activeTab === 'email' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>メールアドレスで招待</Text>
              <TextInput
                style={styles.input}
                placeholder="メールアドレスを入力"
                placeholderTextColor={isDarkMode ? '#8e8e93' : '#666666'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.button, !email && { opacity: 0.5 }]}
                onPress={handleEmailInvite}
                disabled={!email || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <UserPlusIcon size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>招待を送信</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};