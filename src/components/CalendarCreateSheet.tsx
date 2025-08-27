import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  PanResponder,
} from 'react-native';
import {
  HomeIcon,
  HeartIcon,
  UsersIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BeakerIcon,
  SparklesIcon,
  ChevronRightIcon,
} from 'react-native-heroicons/outline';

interface CalendarType {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const calendarTypes: CalendarType[] = [
  { id: 'family', name: '家族', icon: <HomeIcon size={24} color="#FF6B6B" />, color: '#FF6B6B' },
  { id: 'private', name: 'プライベート', icon: <UserGroupIcon size={24} color="#4ECDC4" />, color: '#4ECDC4' },
  { id: 'couple', name: 'カップル', icon: <HeartIcon size={24} color="#FF69B4" />, color: '#FF69B4' },
  { id: 'work', name: '仕事', icon: <BriefcaseIcon size={24} color="#5E8BFF" />, color: '#5E8BFF' },
  { id: 'parttime', name: 'バイト', icon: <CurrencyDollarIcon size={24} color="#FFA500" />, color: '#FFA500' },
  { id: 'friends', name: '友達', icon: <UsersIcon size={24} color="#9B59B6" />, color: '#9B59B6' },
  { id: 'lessons', name: '習い事', icon: <AcademicCapIcon size={24} color="#3498DB" />, color: '#3498DB' },
  { id: 'club', name: '部活', icon: <BeakerIcon size={24} color="#2ECC71" />, color: '#2ECC71' },
  { id: 'hobby', name: '趣味', icon: <SparklesIcon size={24} color="#F39C12" />, color: '#F39C12' },
];

interface CalendarCreateSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectType: (type: CalendarType) => void;
}

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.9; // 画面の90%
const CLOSE_THRESHOLD = 100;

export const CalendarCreateSheet: React.FC<CalendarCreateSheetProps> = ({
  isVisible,
  onClose,
  onSelectType,
}) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (isVisible) {
      // 初期位置を画面下に設定
      translateY.setValue(SHEET_HEIGHT);
      // すぐに上にスライドアップ
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // 下にスライドダウン
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > CLOSE_THRESHOLD || gestureState.vy > 0.5) {
        // アニメーション完了後に閉じる
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          onClose();
        });
      } else {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* オーバーレイ */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* ボトムシート */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* ハンドル */}
          <View style={styles.handle} />

          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>カレンダーを作成</Text>
            <Text style={styles.subtitle}>カテゴリを選択してください</Text>
          </View>

          {/* カレンダータイプリスト */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {calendarTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.typeItem}
                onPress={() => onSelectType(type)}
                activeOpacity={0.7}
              >
                <View style={styles.typeItemContent}>
                  <View style={styles.iconContainer}>
                    {type.icon}
                  </View>
                  <Text style={styles.typeName}>{type.name}</Text>
                  <ChevronRightIcon size={20} color="#C7C7CC" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
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
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  contentContainer: {
    paddingBottom: 40, // 下部に余白を追加
  },
  typeItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  typeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
});