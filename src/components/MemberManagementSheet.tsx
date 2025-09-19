import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BaseBottomSheet } from './BaseBottomSheet';
import {
  UserIcon,
  UserGroupIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  ClockIcon,
} from 'react-native-heroicons/outline';
import { invitationService } from '../services/invitationService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { InviteModal } from './InviteModal';

interface MemberManagementSheetProps {
  isVisible: boolean;
  onClose: () => void;
  calendarId: string;
  calendarName: string;
  isOwner: boolean;
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

export const MemberManagementSheet: React.FC<MemberManagementSheetProps> = ({
  isVisible,
  onClose,
  calendarId,
  calendarName,
  isOwner,
}) => {
  console.log('MemberManagementSheet props:', { isVisible, calendarId, calendarName, isOwner });

  const { user } = useAuth();
  const { isDarkMode } = useSettings();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canInvite, setCanInvite] = useState(false);

  useEffect(() => {
    if (isVisible && calendarId) {
      fetchMembersAndInvitations();
      checkInvitePermission();
    }
  }, [isVisible, calendarId]);

  const fetchMembersAndInvitations = async () => {
    setLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        invitationService.getCalendarMembers(calendarId),
        invitationService.getPendingInvitations(calendarId),
      ]);

      setMembers(membersData);
      setPendingInvitations(invitationsData);
    } catch (error) {
      console.error('データ取得エラー:', error);
      Alert.alert('エラー', 'メンバー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const checkInvitePermission = async () => {
    const hasPermission = await invitationService.checkUserCanInvite(calendarId);
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
            const success = await invitationService.removeMember(
              calendarId,
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
    const newPermission = !member.can_invite;
    const success = await invitationService.updateMemberRole(
      calendarId,
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    inviteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#007AFF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    inviteButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDarkMode ? '#8e8e93' : '#666666',
      marginBottom: 12,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#38383a' : '#e5e5e7',
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
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    memberEmail: {
      fontSize: 14,
      color: isDarkMode ? '#8e8e93' : '#666666',
    },
    memberActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
    },
    ownerBadge: {
      backgroundColor: '#007AFF',
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
    pendingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    pendingInfo: {
      flex: 1,
      marginLeft: 12,
    },
    pendingEmail: {
      fontSize: 16,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    pendingDate: {
      fontSize: 14,
      color: isDarkMode ? '#8e8e93' : '#666666',
      marginTop: 2,
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
      color: isDarkMode ? '#8e8e93' : '#666666',
      marginTop: 12,
    },
  });

  return (
    <>
      <BaseBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        height={0.7}
        title="メンバー管理"
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {members.length + 1}人のメンバー
            </Text>
            {canInvite && (
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setShowInviteModal(true)}
              >
                <UserPlusIcon size={16} color="#ffffff" />
                <Text style={styles.inviteButtonText}>招待</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <ScrollView>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>メンバー</Text>

                <View style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <UserIcon size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.memberName}>オーナー</Text>
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>オーナー</Text>
                      </View>
                    </View>
                    <Text style={styles.memberEmail}>カレンダーの作成者</Text>
                  </View>
                </View>

                {members.map((member) => (
                  <View key={member.id} style={styles.memberItem}>
                    <View style={styles.memberAvatar}>
                      <UserIcon size={24} color={isDarkMode ? '#ffffff' : '#000000'} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.profiles.name || member.profiles.email}
                      </Text>
                      <Text style={styles.memberEmail}>
                        {member.profiles.email}
                      </Text>
                    </View>
                    {isOwner && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleToggleInvitePermission(member)}
                        >
                          {member.can_invite ? (
                            <ShieldCheckIcon
                              size={20}
                              color="#34c759"
                            />
                          ) : (
                            <ShieldExclamationIcon
                              size={20}
                              color={isDarkMode ? '#8e8e93' : '#666666'}
                            />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleRemoveMember(member)}
                        >
                          <TrashIcon size={20} color="#ff3b30" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {pendingInvitations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>招待中</Text>
                  {pendingInvitations.map((invitation) => (
                    <View key={invitation.id} style={styles.pendingItem}>
                      <ClockIcon
                        size={24}
                        color={isDarkMode ? '#8e8e93' : '#666666'}
                      />
                      <View style={styles.pendingInfo}>
                        <Text style={styles.pendingEmail}>
                          {invitation.invitee_email}
                        </Text>
                        <Text style={styles.pendingDate}>
                          {formatDate(invitation.created_at)}に招待
                        </Text>
                      </View>
                      {canInvite && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleCancelInvitation(invitation)}
                        >
                          <TrashIcon size={20} color="#ff3b30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {members.length === 0 && pendingInvitations.length === 0 && (
                <View style={styles.emptyContainer}>
                  <UserGroupIcon
                    size={48}
                    color={isDarkMode ? '#8e8e93' : '#666666'}
                  />
                  <Text style={styles.emptyText}>
                    まだメンバーがいません
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </BaseBottomSheet>

      <InviteModal
        isVisible={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          fetchMembersAndInvitations();
        }}
        calendarId={calendarId}
        calendarName={calendarName}
      />
    </>
  );
};