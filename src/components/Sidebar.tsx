import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
  Platform,
  Image,
  Modal,
} from 'react-native';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  CalendarIcon,
  PlusCircleIcon,
  CheckIcon,
  CogIcon,
  UserIcon,
  EllipsisVerticalIcon,
  HomeIcon,
  HeartIcon,
  UsersIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BeakerIcon,
  SparklesIcon,
} from 'react-native-heroicons/outline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarCreateSheet } from './CalendarCreateSheet';
import { SettingsSheet } from './SettingsSheet';
import { ProfileSheet } from './ProfileSheet';
import { CalendarOptionsSheet } from './CalendarOptionsSheet';
import { SupportBottomSheet } from './SupportBottomSheet';
import { PatternLearningSettings } from './PatternLearningSettings';
import { useCalendarContext } from '../contexts/CalendarContext';
import { useTheme } from '@/hooks/useThemeColor';
import { useAuth } from '../contexts/AuthContext';

// カレンダー名に基づいてアイコンを返すヘルパー関数
const getCalendarIcon = (name: string, color: string = '#666') => {
  const iconSize = 20;

  // 名前に基づいてアイコンを決定
  const nameMap = {
    '家族': <HomeIcon size={iconSize} color="#FF6B6B" />,
    'プライベート': <UserGroupIcon size={iconSize} color="#4ECDC4" />,
    'カップル': <HeartIcon size={iconSize} color="#FF69B4" />,
    '仕事': <BriefcaseIcon size={iconSize} color="#5E8BFF" />,
    'バイト': <CurrencyDollarIcon size={iconSize} color="#FFA500" />,
    '友達': <UsersIcon size={iconSize} color="#9B59B6" />,
    '習い事': <AcademicCapIcon size={iconSize} color="#3498DB" />,
    '部活': <BeakerIcon size={iconSize} color="#2ECC71" />,
    '趣味': <SparklesIcon size={iconSize} color="#F39C12" />,
    '家': <HomeIcon size={iconSize} color="#FF6B6B" />,
  };

  return nameMap[name as keyof typeof nameMap] || <CalendarIcon size={iconSize} color={color} />;
};

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  const { calendars, selectedCalendarId, selectCalendar } = useCalendarContext();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const slideAnimation = useRef(new Animated.Value(-300)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  const [showCalendarCreate, setShowCalendarCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showPatternLearning, setShowPatternLearning] = useState(false);
  const [selectedCalendarForOptions, setSelectedCalendarForOptions] = useState<string | null>(null);
    
  const SIDEBAR_WIDTH = 280;

  useEffect(() => {
    if (isVisible) {
      // サイドバーを開く
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // サイドバーを閉じる
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  // スワイプジェスチャーの設定
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        // 左方向のスワイプのみ処理
        const newValue = Math.max(-SIDEBAR_WIDTH, gestureState.dx);
        slideAnimation.setValue(newValue);
        overlayAnimation.setValue(1 + (gestureState.dx / SIDEBAR_WIDTH));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -50) {
        // 50px以上左にスワイプしたら閉じる
        onClose();
      } else {
        // 元の位置に戻す
        Animated.parallel([
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(overlayAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  // AuthContextから自動的に取得されるため削除

  return (
    <View style={styles.container} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* オーバーレイ */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <Animated.View
          style={[
            styles.overlayBackground,
            {
              opacity: overlayAnimation,
            },
          ]}
        />
      </TouchableOpacity>

      {/* サイドバー */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            width: SIDEBAR_WIDTH,
            transform: [{ translateX: slideAnimation }],
            backgroundColor: colors.primaryBackground,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* ヘッダー */}
        <View style={[styles.header, { backgroundColor: colors.primaryBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>メニュー</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <XMarkIcon size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* メニューアイテム */}
        <View style={styles.content}>
          {/* プロフィールセクション */}
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.primaryBackground }]}
            onPress={() => {
              setShowProfile(true);
              onClose(); // サイドバーを閉じる
            }}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.profileIconContainer}>
                {profile?.profile_image_url ? (
                  <Image
                    source={{ uri: profile.profile_image_url }}
                    style={styles.profileImage}
                  />
                ) : (
                  <UserIcon size={24} color={colors.buttonPrimary} />
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.primaryText }]}>{profile?.name || ''}</Text>
                <Text style={[styles.profileEmail, { color: colors.secondaryText }]}>カレンダーユーザー</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* カレンダーリスト */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>カレンダー</Text>
            
            {/* 自分用カレンダー */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { backgroundColor: colors.primaryBackground },
                selectedCalendarId === null && [styles.selectedMenuItem, { backgroundColor: colors.secondaryBackground }]
              ]}
              onPress={() => {
                selectCalendar(null);
                onClose();
              }}
            >
              <View style={styles.menuItemContent}>
                <CalendarIcon size={20} color={colors.primaryText} />
                <Text style={[styles.menuItemText, { color: colors.primaryText }]}>自分用カレンダー</Text>
                {selectedCalendarId === null && <CheckIcon size={16} color={colors.buttonPrimary} />}
              </View>
            </TouchableOpacity>
            
            {/* 作成済みカレンダーリスト */}
            {calendars.map((calendar) => (
              <TouchableOpacity
                key={calendar.id}
                style={[
                  styles.menuItem,
                  { backgroundColor: colors.primaryBackground },
                  selectedCalendarId === calendar.id && [styles.selectedMenuItem, { backgroundColor: colors.secondaryBackground }]
                ]}
                onPress={() => {
                  selectCalendar(calendar.id);
                  onClose();
                }}
              >
                <View style={styles.menuItemContent}>
                  <View style={[styles.calendarIconContainer, { backgroundColor: calendar.color ? calendar.color + '20' : '#f0f0f0' }]}>
                    {getCalendarIcon(calendar.name)}
                  </View>
                  <Text style={[styles.calendarNameText, { color: colors.primaryText }]}>{calendar.name}</Text>
                  <View style={styles.iconsContainer}>
                    {selectedCalendarId === calendar.id && <CheckIcon size={16} color={colors.buttonPrimary} />}
                    <TouchableOpacity
                      style={styles.ellipsisButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        setSelectedCalendarForOptions(calendar.id);
                        setShowCalendarOptions(true);
                      }}
                    >
                      <EllipsisVerticalIcon size={16} color={colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* カレンダーを作成 */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.primaryBackground }]}
              onPress={() => {
                setShowCalendarCreate(true);
                onClose(); // サイドバーを閉じる
              }}
            >
              <View style={styles.menuItemContent}>
                <PlusCircleIcon size={20} color={colors.buttonPrimary} />
                <Text style={[styles.menuItemText, styles.addCalendarText, { color: colors.buttonPrimary }]}>
                  カレンダーを作成
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.primaryBackground }]}
            onPress={() => {
              setShowSettings(true);
              onClose(); // サイドバーを閉じる
            }}
          >
            <View style={styles.menuItemContent}>
              <CogIcon size={20} color={colors.primaryText} />
              <Text style={[styles.menuItemText, { color: colors.primaryText }]}>設定</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.primaryBackground }]}
            onPress={() => {
              setShowPatternLearning(true);
              onClose(); // サイドバーを閉じる
            }}
          >
            <View style={styles.menuItemContent}>
              <AcademicCapIcon size={20} color={colors.primaryText} />
              <Text style={[styles.menuItemText, { color: colors.primaryText }]}>パターン学習</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.primaryBackground }]}
            onPress={() => {
              setShowSupport(true);
              onClose(); // サイドバーを閉じる
            }}
          >
            <View style={styles.menuItemContent}>
              <ChatBubbleLeftRightIcon size={20} color={colors.primaryText} />
              <Text style={[styles.menuItemText, { color: colors.primaryText }]}>サポート</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </Animated.View>

      {/* カレンダー作成ボトムシート */}
      <CalendarCreateSheet
        isVisible={showCalendarCreate}
        onClose={() => setShowCalendarCreate(false)}
      />

      {/* 設定ボトムシート */}
      <SettingsSheet
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* プロフィールボトムシート */}
      <ProfileSheet
        isVisible={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* カレンダーオプションボトムシート */}
      <CalendarOptionsSheet
        isVisible={showCalendarOptions}
        onClose={() => {
          setShowCalendarOptions(false);
          setSelectedCalendarForOptions(null);
        }}
        calendarId={selectedCalendarForOptions}
      />

      {/* サポートボトムシート */}
      <SupportBottomSheet
        isVisible={showSupport}
        onClose={() => setShowSupport(false)}
      />

      {/* パターン学習設定モーダル */}
      {showPatternLearning && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showPatternLearning}
          onRequestClose={() => setShowPatternLearning(false)}
        >
          <PatternLearningSettings
            onClose={() => setShowPatternLearning(false)}
          />
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' 
      ? { boxShadow: '2px 0 8px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: {
            width: 2,
            height: 0,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }
    ),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  addCalendarText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedMenuItem: {
    backgroundColor: '#f0f8ff',
  },
  calendarIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profileEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  calendarNameText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ellipsisButton: {
    padding: 4,
    borderRadius: 4,
  },
});