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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserIcon,
  PencilIcon,
  PhotoIcon,
  CheckIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { BaseBottomSheet } from './BaseBottomSheet';

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

  return (
    <BaseBottomSheet
      isVisible={isVisible}
      onClose={handleClose}
      height={0.9}
      title="プロフィール"
      showHandle={true}
      showCloseButton={true}
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

        {/* プロフィール統計（今後の機能用） */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>統計</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>今月の予定</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>今週の予定</Text>
            </View>
          </View>
        </View>

        {/* 設定項目（今後の機能用） */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>その他</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>データのエクスポート</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>アカウント設定</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    bottom: 0,
    right: 0,
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
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingText: {
    fontSize: 15,
    color: '#374151',
  },
});