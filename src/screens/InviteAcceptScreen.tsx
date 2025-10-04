import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircleIcon, XCircleIcon, CalendarIcon } from 'react-native-heroicons/solid';
import { invitationService } from '../services/invitationService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../services/supabase';

interface InvitationDetails {
  id: string;
  calendar_id: string;
  inviter_id: string;
  invitee_email: string;
  calendar?: {
    name: string;
    owner_id: string;
  };
  inviter?: {
    name: string;
    email: string;
  };
}

export default function InviteAcceptScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user } = useAuth();
  const { isDarkMode } = useSettings();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateAndFetchInvitation();
    } else {
      setError('招待トークンが見つかりません');
      setLoading(false);
    }
  }, [token]);

  const validateAndFetchInvitation = async () => {
    try {
      setLoading(true);

      const invitationData = await invitationService.validateInvitation(token!);

      if (!invitationData) {
        setError('招待リンクが無効または期限切れです');
        return;
      }

      const { data: calendarData } = await supabase
        .from('calendars')
        .select('name, owner_id')
        .eq('id', invitationData.calendar_id)
        .single();

      const { data: inviterData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', invitationData.inviter_id)
        .single();

      setInvitation({
        ...invitationData,
        calendar: calendarData,
        inviter: inviterData,
      });
    } catch (err) {
      console.error('招待情報取得エラー:', err);
      setError('招待情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      Alert.alert(
        'ログインが必要です',
        'カレンダーに参加するにはログインが必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ログイン画面へ',
            onPress: () => router.push('/auth'),
          },
        ]
      );
      return;
    }

    setAccepting(true);
    try {
      const accepted = await invitationService.acceptInvitation(token!);

      if (accepted) {
        setSuccess(true);
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else {
        throw new Error('招待の受諾に失敗しました');
      }
    } catch (err: any) {
      console.error('招待受諾エラー:', err);
      Alert.alert(
        'エラー',
        err.message || '招待の受諾中にエラーが発生しました'
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      '招待を辞退',
      '本当に招待を辞退しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '辞退する',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#000000' : '#ffffff',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: isDarkMode ? '#1c1c1e' : '#f2f2f7',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#ffffff' : '#000000',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#8e8e93' : '#666666',
      marginBottom: 24,
      textAlign: 'center',
    },
    detailsContainer: {
      width: '100%',
      backgroundColor: isDarkMode ? '#2c2c2e' : '#ffffff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    detailRow: {
      marginBottom: 12,
    },
    detailLabel: {
      fontSize: 12,
      color: isDarkMode ? '#8e8e93' : '#666666',
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 16,
      color: isDarkMode ? '#ffffff' : '#000000',
      fontWeight: '500',
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    button: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    acceptButton: {
      backgroundColor: '#34c759',
    },
    declineButton: {
      backgroundColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    acceptButtonText: {
      color: '#ffffff',
    },
    declineButtonText: {
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: isDarkMode ? '#8e8e93' : '#666666',
    },
    errorContainer: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    errorIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#ff3b30',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    errorText: {
      fontSize: 18,
      color: isDarkMode ? '#ffffff' : '#000000',
      marginBottom: 24,
      textAlign: 'center',
    },
    backButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#38383a' : '#e5e5e7',
    },
    backButtonText: {
      fontSize: 16,
      color: isDarkMode ? '#ffffff' : '#000000',
    },
    successContainer: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    successIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#34c759',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? '#ffffff' : '#000000',
      marginBottom: 8,
      textAlign: 'center',
    },
    successSubtext: {
      fontSize: 16,
      color: isDarkMode ? '#8e8e93' : '#666666',
      textAlign: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>招待情報を確認中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <XCircleIcon size={40} color="#ffffff" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.backButtonText}>ホームに戻る</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <CheckCircleIcon size={40} color="#ffffff" />
            </View>
            <Text style={styles.successText}>参加完了！</Text>
            <Text style={styles.successSubtext}>
              カレンダーへの参加が完了しました
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <CalendarIcon size={40} color="#ffffff" />
          </View>

          <Text style={styles.title}>カレンダーへの招待</Text>
          <Text style={styles.subtitle}>
            {invitation?.inviter?.name || invitation?.inviter?.email}さんからの招待
          </Text>

          {invitation?.calendar && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>カレンダー名</Text>
                <Text style={styles.detailValue}>
                  {invitation.calendar.name}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>招待者</Text>
                <Text style={styles.detailValue}>
                  {invitation.inviter?.name || invitation.inviter?.email}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAcceptInvitation}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CheckCircleIcon size={20} color="#ffffff" />
                  <Text style={[styles.buttonText, styles.acceptButtonText]}>
                    参加する
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              disabled={accepting}
            >
              <Text style={[styles.buttonText, styles.declineButtonText]}>
                辞退する
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}