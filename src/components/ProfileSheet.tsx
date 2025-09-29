import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserIcon,
  PencilIcon,
  PhotoIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
} from 'react-native-heroicons/outline';
import { BaseBottomSheet } from './BaseBottomSheet';
import { authService } from '../services/authService';

interface ProfileSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('本多真翔');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // アニメーション値
  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);

  // プロフィール情報を読み込み
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const name = await AsyncStorage.getItem('profile_name');
      const imageUri = await AsyncStorage.getItem('profile_image_uri');
      
      if (name) {
        setProfileName(name);
      }
      if (imageUri) {
        setProfileImageUri(imageUri);
      }
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    }
  };

  const saveProfileData = async () => {
    try {
      await AsyncStorage.setItem('profile_name', profileName);
      if (profileImageUri) {
        await AsyncStorage.setItem('profile_image_uri', profileImageUri);
      }
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('カメラ権限が必要です', 'プロフィール画像を撮影するにはカメラへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      '画像を選択',
      '写真を選択する方法を選んでください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '写真ライブラリ', onPress: pickImage },
        { text: 'カメラで撮影', onPress: takePicture },
      ]
    );
  };

  const startEditingName = () => {
    setTempName(profileName);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setTempName('');
    setIsEditingName(false);
  };

  const saveProfileName = () => {
    if (tempName.trim()) {
      setProfileName(tempName.trim());
      setIsEditingName(false);
      setTempName('');
    }
  };

  // 閉じる時に保存
  const handleClose = () => {
    if (isEditingName) {
      cancelEditingName();
    }
    saveProfileData();
    onClose();
  };

  // オプションボタンの処理
  const handleOptionsPress = (position: { x: number; y: number; width: number; height: number }) => {
    setMenuPosition(position);
    setShowOptionsMenu(true);

    // アニメーション開始
    menuScale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    menuOpacity.value = withTiming(1, {
      duration: 200,
    });
  };

  // メニューを閉じる処理
  const closeMenu = () => {
    menuScale.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    });
    menuOpacity.value = withTiming(0, {
      duration: 200,
    });

    setTimeout(() => {
      setShowOptionsMenu(false);
    }, 200);
  };

  // ログアウト処理
  const handleLogout = () => {
    closeMenu();
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('ログアウト処理を開始...');
              await authService.signOut();
              console.log('✅ ログアウトが完了しました');

              // ログアウト成功後、即座にモーダルを閉じる
              onClose();
            } catch (error) {
              console.error('❌ ログアウトエラー:', error);
              Alert.alert(
                'エラー',
                'ログアウトに失敗しました。ネットワーク接続を確認してもう一度お試しください。',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  // アカウント削除処理
  const handleDeleteAccount = () => {
    closeMenu();

    // 第1段階：詳細な説明とともに警告
    Alert.alert(
      '⚠️ アカウント削除の確認',
      'アカウントを削除すると以下のデータがすべて失われます：\n\n• プロフィール情報\n• カレンダーイベント\n• チャット履歴\n• 設定情報\n• 利用規約同意履歴\n\nこの操作は取り消すことができません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除について理解しました',
          style: 'destructive',
          onPress: () => {
            // 第2段階：最終確認
            Alert.alert(
              '🔥 最終確認',
              '本当にアカウントを削除しますか？\n\nすべてのデータが完全に削除され、復元することはできません。',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '完全に削除する',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      console.log('アカウント削除処理を開始...');
                      await authService.deleteAccount();
                      console.log('✅ アカウント削除が完了しました');

                      // アカウント削除成功後、即座にモーダルを閉じる
                      onClose();

                      // 削除完了の通知
                      setTimeout(() => {
                        Alert.alert(
                          '削除完了',
                          'アカウントとすべてのデータが削除されました。ご利用ありがとうございました。',
                          [{ text: 'OK' }]
                        );
                      }, 500);

                    } catch (error) {
                      console.error('❌ アカウント削除エラー:', error);
                      Alert.alert(
                        'エラー',
                        'アカウント削除に失敗しました。ネットワーク接続を確認してもう一度お試しください。',
                        [{ text: 'OK' }]
                      );
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <BaseBottomSheet
      isVisible={isVisible}
      onClose={handleClose}
      height={0.9}
      title="プロフィール"
      showHandle={true}
      showCloseButton={true}
      showOptionsButton={true}
      onOptionsPress={handleOptionsPress}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* プロフィール画像セクション */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={showImagePicker}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <UserIcon size={40} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.editImageButton}>
              <PhotoIcon size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>タップして画像を変更</Text>
        </View>

        {/* 名前セクション */}
        <View style={styles.nameSection}>
          <Text style={styles.sectionTitle}>名前</Text>
          
          {isEditingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="名前を入力してください"
                maxLength={20}
                autoFocus
              />
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={cancelEditingName}
                >
                  <XMarkIcon size={16} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={saveProfileName}
                >
                  <CheckIcon size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameContainer} onPress={startEditingName}>
              <Text style={styles.nameText}>{profileName}</Text>
              <PencilIcon size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>


      </ScrollView>

      {/* オプションメニューモーダル */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.optionsOverlayTransparent}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.optionsMenuContainer,
              {
                position: 'absolute',
                top: menuPosition.y + menuPosition.height + 8,
                right: Dimensions.get('window').width - menuPosition.x - menuPosition.width + 16,
                transformOrigin: 'top right',
              },
              useAnimatedStyle(() => ({
                transform: [{ scale: menuScale.value }],
                opacity: menuOpacity.value,
              })),
            ]}
          >
            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleLogout}
            >
              <ArrowRightOnRectangleIcon size={20} color="#374151" />
              <Text style={styles.optionsMenuText}>ログアウト</Text>
            </TouchableOpacity>

            <View style={styles.optionsMenuDivider} />

            <TouchableOpacity
              style={styles.optionsMenuItem}
              onPress={handleDeleteAccount}
            >
              <TrashIcon size={20} color="#EF4444" />
              <Text style={[styles.optionsMenuText, { color: '#EF4444' }]}>
                退会してアカウント削除
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </BaseBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  editImageButton: {
    position: 'absolute',
    bottom: -5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  nameSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  nameText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
  },
  editButtonsContainer: {
    flexDirection: 'row',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsOverlayTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  optionsMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionsMenuText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  optionsMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
});