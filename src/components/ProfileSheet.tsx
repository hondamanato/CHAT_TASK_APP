import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  TextInput,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  XMarkIcon,
  UserIcon,
  PencilIcon,
} from 'react-native-heroicons/outline';

interface ProfileSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const screenHeight = Dimensions.get('window').height;
const SHEET_HEIGHT = screenHeight * 0.9;
const CLOSE_THRESHOLD = 120;
const CLOSE_VELOCITY = 800;

export const ProfileSheet: React.FC<ProfileSheetProps> = ({
  isVisible,
  onClose,
}) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('本多真翔');
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (isVisible) {
      translateY.value = SHEET_HEIGHT;
      const timer = setTimeout(() => {
        translateY.value = withTiming(0, { duration: 300 });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (
        event.translationY > CLOSE_THRESHOLD ||
        event.velocityY > CLOSE_VELOCITY
      ) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const selectProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setProfileImageUri(imageUri);
        await AsyncStorage.setItem('profileImageUri', imageUri);
      }
    } catch (error) {
      console.error('プロフィール画像の選択エラー:', error);
    }
  };

  const saveProfileName = async (name: string) => {
    try {
      await AsyncStorage.setItem('profileName', name);
    } catch (error) {
      console.error('名前の保存エラー:', error);
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    setIsEditingName(false);
    await saveProfileName(profileName);
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const savedImageUri = await AsyncStorage.getItem('profileImageUri');
        const savedName = await AsyncStorage.getItem('profileName');
        
        if (savedImageUri) {
          setProfileImageUri(savedImageUri);
        }
        if (savedName) {
          setProfileName(savedName);
        }
      } catch (error) {
        console.error('プロフィールデータの読み込みエラー:', error);
      }
    };

    loadProfileData();
  }, []);

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, animatedStyle]}>
            {/* ハンドル */}
            <View style={styles.handle} />
            
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>プロフィール</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <XMarkIcon size={20} color="#666" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            
            {/* コンテンツ */}
            <View style={styles.content}>
              {/* プロフィール画像エリア */}
              <View style={styles.profileImageSection}>
                <View style={styles.profileImageContainer}>
                  {profileImageUri ? (
                    <Image 
                      source={{ uri: profileImageUri }} 
                      style={styles.profileImage}
                    />
                  ) : (
                    <UserIcon size={40} color="#007AFF" strokeWidth={2} />
                  )}
                </View>
                <TouchableOpacity style={styles.editImageButton} onPress={selectProfileImage}>
                  <PencilIcon size={16} color="#007AFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
              
              {/* プロフィール情報 */}
              <View style={styles.profileInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>名前</Text>
                  <View style={styles.infoRow}>
                    {isEditingName ? (
                      <TextInput
                        value={profileName}
                        onChangeText={setProfileName}
                        onBlur={handleNameSave}
                        onSubmitEditing={handleNameSave}
                        autoFocus
                        style={styles.nameInput}
                        returnKeyType="done"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{profileName}</Text>
                    )}
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={isEditingName ? handleNameSave : handleNameEdit}
                    >
                      <PencilIcon size={16} color="#007AFF" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>ステータス</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>カレンダーユーザー</Text>
                    <TouchableOpacity style={styles.editButton}>
                      <PencilIcon size={16} color="#007AFF" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>アプリ使用開始日</Text>
                  <Text style={styles.infoValue}>2025年9月</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileInfo: {
    gap: 24,
  },
  infoItem: {
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  nameInput: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    paddingVertical: 0,
    marginRight: 8,
  },
});