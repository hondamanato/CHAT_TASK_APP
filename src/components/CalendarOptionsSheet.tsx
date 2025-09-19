import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  PencilIcon,
  UserGroupIcon,
  TrashIcon,
  ChevronRightIcon,
  UserIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  ClockIcon,
  ChevronLeftIcon,
  QrCodeIcon,
  LinkIcon,
  ClipboardIcon,
  ShareIcon,
} from 'react-native-heroicons/outline';
import { BlurView } from 'expo-blur';
import { BaseBottomSheet } from './BaseBottomSheet';
import { useCalendarContext } from '../contexts/CalendarContext';
import { useTheme } from '@/hooks/useThemeColor';
import { MemberManagementSheet } from './MemberManagementSheet';
import { useAuth } from '../contexts/AuthContext';
import { invitationService } from '../services/invitationService';
import { InviteModal } from './InviteModal';
import { ScrollView, ActivityIndicator, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

interface CalendarOptionsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  calendarId: string | null;
}

interface Member {
  id: string;
  calendar_id: string;
  user_id: string;
  role: string;
  can_invite: boolean;
  joined_at: string;
  profiles: {
    id: string;
    email: string;
    name: string;
  };
}

interface PendingInvitation {
  id: string;
  invitee_email: string;
  created_at: string;
  expires_at: string;
}

export const CalendarOptionsSheet: React.FC<CalendarOptionsSheetProps> = ({
  isVisible,
  onClose,
  calendarId,
}) => {
  const { calendars, deleteCalendar, updateCalendar } = useCalendarContext();
  const { colors } = useTheme();
  const { user } = useAuth();

  const selectedCalendar = calendars.find(cal => cal.id === calendarId);
  const isOwner = selectedCalendar?.owner_id === user?.id;

  // 名前変更用の state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [currentView, setCurrentView] = useState<'options' | 'memberManagement' | 'qrcode'>('options');

  // メンバー管理用のステート
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<'link' | 'qrcode' | 'email'>('link');

  // QRコード用のステート
  const [qrInviteLink, setQrInviteLink] = useState('');
  const [qrIsLoading, setQrIsLoading] = useState(false);

  // キーボードイベントリスナー
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // メンバー管理画面に切り替えた時にデータを取得
  useEffect(() => {
    if (currentView === 'memberManagement' && selectedCalendar) {
      fetchMembersAndInvitations();
      checkInvitePermission();
    }
  }, [currentView, selectedCalendar]);

  // モーダルが閉じられた時にoptionsビューに戻る
  useEffect(() => {
    if (!isVisible) {
      setCurrentView('options');
    }
  }, [isVisible]);

  // 名前変更処理
  const handleStartRename = () => {
    console.log('handleStartRename called, selectedCalendar:', selectedCalendar);
    if (selectedCalendar) {
      Alert.prompt(
        'カレンダー名',
        '',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: '保存',
            onPress: (text) => {
              if (text && text.trim()) {
                updateCalendar(selectedCalendar.id, { name: text.trim() });
              }
            },
          },
        ],
        'plain-text',
        selectedCalendar.name
      );
    } else {
      console.log('No selected calendar found');
    }
  };

  const handleSaveName = () => {
    if (selectedCalendar && newCalendarName.trim()) {
      updateCalendar(selectedCalendar.id, { name: newCalendarName.trim() });
      setShowRenameModal(false);
    }
  };

  const handleCancelRename = () => {
    setShowRenameModal(false);
    setNewCalendarName('');
  };

  // メンバー管理機能
  const fetchMembersAndInvitations = async () => {
    if (!selectedCalendar) return;

    setMemberLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        invitationService.getCalendarMembers(selectedCalendar.id),
        invitationService.getPendingInvitations(selectedCalendar.id),
      ]);

      setMembers(membersData);
      setPendingInvitations(invitationsData);
    } catch (error) {
      console.error('データ取得エラー:', error);
      Alert.alert('エラー', 'メンバー情報の取得に失敗しました');
    } finally {
      setMemberLoading(false);
    }
  };

  const checkInvitePermission = async () => {
    if (!selectedCalendar) return;
    const hasPermission = await invitationService.checkUserCanInvite(selectedCalendar.id);
    setCanInvite(hasPermission);
  };

  const handleRemoveMember = (member: Member) => {
    if (member.user_id === user?.id) {
      Alert.alert('エラー', '自分自身を削除することはできません');
      return;
    }

    Alert.alert(
      'メンバーを削除',
      `${member.profiles.name || member.profiles.email}をカレンダーから削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!selectedCalendar) return;
            const success = await invitationService.removeMember(
              selectedCalendar.id,
              member.user_id
            );
            if (success) {
              fetchMembersAndInvitations();
            } else {
              Alert.alert('エラー', 'メンバーの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleToggleInvitePermission = async (member: Member) => {
    if (!selectedCalendar) return;
    const newPermission = !member.can_invite;
    const success = await invitationService.updateMemberRole(
      selectedCalendar.id,
      member.user_id,
      newPermission
    );

    if (success) {
      fetchMembersAndInvitations();
      Alert.alert(
        '権限を更新',
        `${member.profiles.name}の招待権限を${newPermission ? '付与' : '削除'}しました`
      );
    } else {
      Alert.alert('エラー', '権限の更新に失敗しました');
    }
  };

  const handleCancelInvitation = (invitation: PendingInvitation) => {
    Alert.alert(
      '招待をキャンセル',
      `${invitation.invitee_email}への招待をキャンセルしますか？`,
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'キャンセル',
          style: 'destructive',
          onPress: async () => {
            const success = await invitationService.cancelInvitation(invitation.id);
            if (success) {
              fetchMembersAndInvitations();
            } else {
              Alert.alert('エラー', '招待のキャンセルに失敗しました');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleQRCodeInvite = async () => {
    if (!selectedCalendar) return;

    setCurrentView('qrcode');
    setQrIsLoading(true);

    try {
      const invitation = await invitationService.createInvitation(
        selectedCalendar.id,
        'pending@invitation.link'
      );
      const link = invitationService.getInviteDeepLink(invitation.token);
      setQrInviteLink(link);
    } catch (error) {
      console.error('QRコード招待リンク生成エラー:', error);
      Alert.alert('エラー', 'QRコードの生成に失敗しました');
    } finally {
      setQrIsLoading(false);
    }
  };

  const handleShareQRCode = async () => {
    if (!qrInviteLink || !selectedCalendar) return;

    const message = invitationService.formatInviteMessage(selectedCalendar.name, qrInviteLink);

    try {
      await Share.share({
        message,
        title: `${selectedCalendar.name}への招待`,
      });
    } catch (error) {
      console.error('QRコード共有エラー:', error);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!selectedCalendar) return;

    try {
      const invitation = await invitationService.createInvitation(
        selectedCalendar.id,
        'pending@invitation.link'
      );
      const link = invitationService.getInviteDeepLink(invitation.token);

      await Clipboard.setStringAsync(link);
      Alert.alert('コピー完了', '招待リンクをクリップボードにコピーしました');
    } catch (error) {
      console.error('招待リンク生成エラー:', error);
      Alert.alert('エラー', '招待リンクの生成に失敗しました');
    }
  };

  const handleDeleteCalendar = () => {
    if (!selectedCalendar) return;

    Alert.alert(
      'カレンダーを削除',
      `「${selectedCalendar.name}」を削除しますか？この操作は取り消せません。`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteCalendar(selectedCalendar.id);
            onClose();
          },
        },
      ]
    );
  };


  const optionItems = [
    {
      icon: <PencilIcon size={20} color={colors.primaryText} />,
      title: '名前を変更',
      showChevron: false,
      onPress: () => {
        console.log('名前を変更がタップされました');
        handleStartRename();
      },
    },
    {
      icon: <UserGroupIcon size={20} color={colors.primaryText} />,
      title: 'メンバーを招待',
      showChevron: true,
      onPress: () => {
        console.log('メンバー管理がタップされました');
        console.log('selectedCalendar:', selectedCalendar);
        console.log('isOwner:', isOwner);
        setCurrentView('memberManagement');
        console.log('currentView set to memberManagement');
      },
    },
  ];

  return (
    <>
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.5}
        showCloseButton={false}
        showHandle={true}
      >
        <View style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
          {/* カスタムヘッダー */}
          <View style={[styles.customHeader, { borderBottomColor: colors.border }]}>
            {(currentView === 'memberManagement' || currentView === 'qrcode') ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCurrentView(currentView === 'qrcode' ? 'memberManagement' : 'options')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeftIcon size={20} color={colors.primaryText} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerLeft} />
            )}
            <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
              {currentView === 'memberManagement' ? 'メンバーを招待' :
               currentView === 'qrcode' ? 'QRコードで招待' :
               (selectedCalendar?.name || 'カレンダーオプション')}
            </Text>
            {currentView === 'options' ? (
              <TouchableOpacity
                style={styles.trashButton}
                onPress={handleDeleteCalendar}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <TrashIcon size={20} color="#FF4444" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerLeft} />
            )}
          </View>

          {/* コンテンツエリア */}
          {currentView === 'options' ? (
            <View style={styles.optionsContainer}>
              {optionItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border },
                    index === optionItems.length - 1 && styles.lastItem,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionIcon}>
                      {item.icon}
                    </View>
                    <Text style={[styles.optionTitle, { color: colors.primaryText }]}>
                      {item.title}
                    </Text>
                    {item.showChevron && (
                      <ChevronRightIcon size={16} color={colors.secondaryText} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : currentView === 'memberManagement' ? (
            /* メンバー管理コンテンツ */
            <ScrollView style={styles.memberContainer}>
              {memberLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.buttonPrimary} />
                </View>
              ) : (
                <>

                  {/* 招待方法セクション */}
                  <View style={styles.section}>

                    <TouchableOpacity
                      style={[styles.optionItem, { borderBottomColor: colors.border }]}
                      onPress={handleQRCodeInvite}
                    >
                      <View style={styles.optionContentHorizontal}>
                        <View style={[styles.optionIcon, { backgroundColor: colors.background }]}>
                          <QrCodeIcon size={22} color="#007AFF" />
                        </View>
                        <Text style={[styles.optionTextCentered, { color: colors.text }]}>
                          QRコードで招待
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.optionItem, { borderBottomColor: colors.border }]}
                      onPress={handleCopyInviteLink}
                    >
                      <View style={styles.optionContentHorizontal}>
                        <View style={[styles.optionIcon, { backgroundColor: colors.background }]}>
                          <LinkIcon size={22} color="#007AFF" />
                        </View>
                        <Text style={[styles.optionTextCentered, { color: colors.text }]}>
                          招待リンクをコピー
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          ) : currentView === 'qrcode' ? (
            /* QRコード表示ビュー */
            <ScrollView style={styles.memberContainer}>
              {qrIsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={[styles.emptyText, { color: colors.secondaryText, marginTop: 16 }]}>
                    QRコードを生成中...
                  </Text>
                </View>
              ) : qrInviteLink ? (
                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrInviteLink}
                      size={200}
                      color="#000000"
                      backgroundColor="#ffffff"
                    />
                  </View>
                  <Text style={[styles.qrInstruction, { color: colors.secondaryText }]}>
                    このQRコードをスキャンしてカレンダーに参加できます
                  </Text>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: '#007AFF' }]}
                    onPress={handleShareQRCode}
                  >
                    <ShareIcon size={20} color="#ffffff" />
                    <Text style={styles.shareButtonText}>QRコードを共有</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                    QRコードの生成に失敗しました
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </BaseBottomSheet>

    {/* カレンダー名変更モーダル */}
    {console.log('Rendering modal, showRenameModal:', showRenameModal)}
    <Modal
      visible={showRenameModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelRename}
    >
      <TouchableWithoutFeedback onPress={handleCancelRename}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={[
              styles.alertContainer,
              {
                backgroundColor: colors.primaryBackground,
                borderColor: colors.border,
                marginBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 0,
              }
            ]}>
              {/* タイトル */}
              <Text style={[styles.alertTitle, { color: colors.primaryText }]}>
                カレンダー名
              </Text>

              {/* テキスト入力 */}
              <TextInput
                style={[
                  styles.alertInput,
                  {
                    color: colors.primaryText,
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                  }
                ]}
                value={newCalendarName}
                onChangeText={setNewCalendarName}
                placeholder="カレンダー名を入力"
                placeholderTextColor={colors.secondaryText}
                autoFocus
                selectTextOnFocus
                onSubmitEditing={handleSaveName}
              />

              {/* ボタン */}
              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.cancelButton]}
                  onPress={handleCancelRename}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.primaryText }]}>
                    キャンセル
                  </Text>
                </TouchableOpacity>

                <View style={[styles.buttonSeparator, { backgroundColor: colors.border }]} />

                <TouchableOpacity
                  style={[styles.alertButton, styles.saveButton]}
                  onPress={handleSaveName}
                >
                  <Text style={styles.saveButtonText}>
                    保存
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>

    {/* メンバー管理シート */}
    {console.log('MemberManagementSheet render check:', { selectedCalendar: !!selectedCalendar, showMemberManagement })}
    {/* 招待モーダル */}
    {selectedCalendar && (
      <InviteModal
        isVisible={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          fetchMembersAndInvitations();
        }}
        calendarId={selectedCalendar.id}
        calendarName={selectedCalendar.name}
        initialTab={inviteModalTab}
      />
    )}
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContentCentered: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  optionContentHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    paddingLeft: 0,
  },
  optionIcon: {
    marginRight: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  optionTextCentered: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
    marginLeft: 12,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    width: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  trashButton: {
    padding: 4,
    borderRadius: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // モーダル関連のスタイル
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    paddingTop: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  alertInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    // キャンセルボタン用のスタイル
  },
  saveButton: {
    // 保存ボタン用のスタイル
  },
  buttonSeparator: {
    width: 0.5,
    backgroundColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  // メンバー管理用のスタイル
  memberContainer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e7',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  ownerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  backButton: {
    padding: 4,
    borderRadius: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButton: {
    padding: 4,
    borderRadius: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // QRコード用スタイル
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrInstruction: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    minWidth: 180,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});